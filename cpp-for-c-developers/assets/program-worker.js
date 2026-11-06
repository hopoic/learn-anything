// Module worker: runs one compiled WASI program. The page terminates this worker on timeout or "Stop".
import { WASI, File, OpenFile, ConsoleStdout, PreopenDirectory, WASIProcExit } from "./vendor/browser_wasi_shim.js";

const OUTPUT_LIMIT = 200 * 1024; // bytes forwarded to the page per run

self.onmessage = async (ev) => {
  const { wasm, stdin } = ev.data;
  let sent = 0, truncated = false;
  const forward = (stream) => (bytes) => {
    if (truncated) return;
    if (sent + bytes.byteLength > OUTPUT_LIMIT) { truncated = true; self.postMessage({ type: "truncated" }); return; }
    sent += bytes.byteLength;
    self.postMessage({ type: stream, bytes: bytes.slice() });
  };
  const fds = [
    new OpenFile(new File(new TextEncoder().encode(stdin || ""))), // fd 0: stdin
    new ConsoleStdout(forward("stdout")),                            // fd 1
    new ConsoleStdout(forward("stderr")),                            // fd 2
    new PreopenDirectory("/", new Map())                             // in-memory scratch filesystem
  ];
  const wasi = new WASI(["main"], ["HOME=/"], fds, { debug: false });
  try {
    const module = await WebAssembly.compile(wasm);
    const instance = await WebAssembly.instantiate(module, { wasi_snapshot_preview1: wasi.wasiImport });
    const code = wasi.start(instance);
    self.postMessage({ type: "exit", code });
  } catch (e) {
    if (e instanceof WASIProcExit) self.postMessage({ type: "exit", code: e.code });
    else self.postMessage({ type: "trap", message: e && e.message ? e.message : String(e) });
  }
};
