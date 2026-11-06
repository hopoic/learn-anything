// Module worker: compiles C++ to a WASI binary with Clang/LLD built for WebAssembly (YoWASP).
// The toolchain is large (~100 MB unpacked, ~23 MB over the wire), so it is loaded lazily and cached by the browser.
const CLANG_VERSION = "22.0.0-git20542-10";
const SOURCES = [
  `https://cdn.jsdelivr.net/npm/@yowasp/clang@${CLANG_VERSION}/gen/bundle.js`,   // ~23 MB transferred (brotli), cached
  `https://unpkg.com/@yowasp/clang@${CLANG_VERSION}/gen/bundle.js`,              // CDN fallback
  new URL("./vendor/yowasp-clang/bundle.js", import.meta.url).href                // optional self-hosted copy (see README)
];

let clangPromise = null;

async function loadClang() {
  const errors = [];
  for (const src of SOURCES) {
    try {
      const mod = await import(src);
      if (typeof mod.runClang === "function") return { runClang: mod.runClang, Exit: mod.Exit, src };
    } catch (e) {
      errors.push(src + " → " + (e && e.message ? e.message : e));
    }
  }
  throw new Error("Could not load the in-browser Clang toolchain:\n" + errors.join("\n"));
}

function post(msg, transfer) { self.postMessage(msg, transfer || []); }

self.onmessage = async (ev) => {
  const { id, code, std, opt } = ev.data;
  const dec = new TextDecoder();
  let diag = "";
  try {
    if (!clangPromise) clangPromise = loadClang();
    const { runClang, Exit } = await clangPromise;
    const args = ["clang++", "-std=" + (std || "c++20"), "-O" + (opt ?? "1"), "-fno-exceptions",
                  "-Wall", "-Wextra", "main.cpp", "-o", "main.wasm"];
    const files = await runClang(args, { "main.cpp": code }, {
      decodeASCII: false,
      stdout: (bytes) => { if (bytes) diag += dec.decode(bytes, { stream: true }); },
      stderr: (bytes) => { if (bytes) diag += dec.decode(bytes, { stream: true }); },
      fetchProgress: ({ doneLength, totalLength }) => post({ id, type: "progress", done: doneLength, total: totalLength })
    }).catch((e) => {
      // runClang throws an Exit error on non-zero status; diagnostics were already collected.
      if ((Exit && e instanceof Exit) || (e && typeof e.code === "number")) return null;
      throw e;
    });
    const wasm = files && files["main.wasm"];
    if (!wasm) { post({ id, type: "result", ok: false, diag: diag || "compilation failed" }); return; }
    const buf = wasm instanceof Uint8Array ? wasm : new TextEncoder().encode(wasm);
    post({ id, type: "result", ok: true, diag, wasm: buf.buffer }, [buf.buffer]);
  } catch (e) {
    clangPromise = null; // allow retry
    post({ id, type: "result", ok: false, fatal: true, diag: diag + "\n" + (e && e.message ? e.message : String(e)) });
  }
};
