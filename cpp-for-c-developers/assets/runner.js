/* C++ runner: compiles and runs code with one of three engines.
 *   wandbox  – real GCC on wandbox.org (full C++, exceptions, threads). Needs network.
 *   godbolt  – Compiler Explorer execution API (full C++). Needs network.
 *   local    – Clang/LLD compiled to WebAssembly, runs entirely in this browser tab.
 *              ~23 MB one-time download (cached); no exceptions, no threads.
 * "auto" tries wandbox → godbolt → local.
 */
(function () {
  "use strict";
  const ONLINE_TIMEOUT_MS = 25000;
  const LOCAL_RUN_TIMEOUT_MS = 10000;
  const GODBOLT_COMPILERS = ["g142", "g151", "g132"];
  const ENGINE_LABEL = { wandbox: "Wandbox · GCC", godbolt: "Compiler Explorer · GCC", local: "브라우저 내장 · Clang(WASM)" };

  const baseUrl = (document.currentScript && document.currentScript.src) || location.href;
  const workerUrl = (name) => new URL(name, baseUrl).href;

  const listeners = new Set();
  const state = { localStatus: "idle", localProgress: 0 };
  function emitStatus() { listeners.forEach((fn) => { try { fn(state); } catch (e) {} }); }

  function flags(std, opt, gnu) {
    return ["-std=" + (gnu ? "gnu++" : "c++") + std.replace(/^c\+\+/, ""), "-O" + opt, "-Wall", "-Wextra", "-pthread"];
  }

  async function fetchJson(url, body, signal) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ONLINE_TIMEOUT_MS);
    if (signal) signal.addEventListener("abort", () => ctl.abort());
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(body), signal: ctl.signal });
      const text = await r.text();
      if (!r.ok) { const err = new Error("HTTP " + r.status + ": " + text.slice(0, 200)); err.status = r.status; throw err; }
      return JSON.parse(text);
    } finally { clearTimeout(t); }
  }

  /* ---------------- Wandbox ---------------- */
  async function runWandbox(job, signal) {
    const res = await fetchJson("https://wandbox.org/api/compile.json", {
      compiler: "gcc-head",
      code: job.code,
      stdin: job.stdin || "",
      "compiler-option-raw": flags(job.std, job.opt).join("\n"),
      save: false
    }, signal);
    const compiled = res.program_output !== undefined || res.program_error !== undefined || String(res.status) === "0";
    return {
      engine: "wandbox",
      compile: (res.compiler_message || "").replace(/prog\.cc/g, "main.cpp"),
      compiled,
      stdout: res.program_output || "",
      stderr: res.program_error || "",
      exitCode: res.status !== undefined ? Number(res.status) : null,
      signal: res.signal || ""
    };
  }

  /* ---------------- Compiler Explorer ---------------- */
  const joinLines = (arr) => (arr || []).map((l) => l.text).join("\n");
  async function runGodbolt(job, signal) {
    let lastErr;
    for (const id of GODBOLT_COMPILERS) {
      try {
        const res = await fetchJson("https://godbolt.org/api/compiler/" + id + "/compile", {
          source: job.code,
          lang: "c++",
          options: {
            userArguments: flags(job.std, job.opt).join(" "),
            executeParameters: { args: [], stdin: job.stdin || "" },
            compilerOptions: { executorRequest: true },
            filters: { execute: true },
            tools: [], libraries: []
          },
          allowStoreCodeDebug: false
        }, signal);
        const build = res.buildResult || {};
        const compileText = [joinLines(build.stdout), joinLines(build.stderr)].filter(Boolean).join("\n");
        const ran = res.didExecute !== false && (build.code === undefined || build.code === 0);
        return {
          engine: "godbolt",
          compile: compileText.replace(/<source>/g, "main.cpp"),
          compiled: ran,
          stdout: ran ? joinLines(res.stdout) + (res.stdout && res.stdout.length ? "\n" : "") : "",
          stderr: ran ? joinLines(res.stderr) : "",
          exitCode: ran ? res.code : build.code,
          signal: res.timedOut ? "timed out" : ""
        };
      } catch (e) {
        lastErr = e;
        if (e.status !== 404) throw e; // only try the next compiler id on "not found"
      }
    }
    throw lastErr;
  }

  /* ---------------- Local (WASM) ---------------- */
  let compilerWorker = null, reqId = 0;
  const pending = new Map();
  function getCompiler() {
    if (compilerWorker) return compilerWorker;
    compilerWorker = new Worker(workerUrl("compiler-worker.js"), { type: "module" });
    compilerWorker.onmessage = (ev) => {
      const m = ev.data, p = pending.get(m.id);
      if (m.type === "progress") {
        state.localStatus = "downloading"; state.localProgress = m.total ? m.done / m.total : 0; emitStatus();
        if (p && p.onProgress) p.onProgress(state.localProgress);
        return;
      }
      if (!p) return;
      pending.delete(m.id);
      if (m.fatal) { state.localStatus = "error"; } else { state.localStatus = "ready"; }
      emitStatus();
      p.resolve(m);
    };
    compilerWorker.onerror = (e) => {
      state.localStatus = "error"; emitStatus();
      pending.forEach((p) => p.resolve({ ok: false, fatal: true, diag: "compiler worker error: " + (e.message || "module workers unsupported?") }));
      pending.clear(); compilerWorker = null;
    };
    return compilerWorker;
  }
  function compileLocal(job, onProgress) {
    return new Promise((resolve) => {
      const id = ++reqId;
      pending.set(id, { resolve, onProgress });
      if (state.localStatus === "idle" || state.localStatus === "error") { state.localStatus = "loading"; emitStatus(); }
      getCompiler().postMessage({ id, code: job.code, std: job.std, opt: job.opt });
    });
  }

  async function runLocal(job, signal, hooks) {
    const std = job.std === "c++23" ? "c++23" : job.std;
    const opt = String(job.opt) === "0" ? "0" : "1";
    hooks.phase("compile");
    const c = await compileLocal({ code: job.code, std, opt }, hooks.progress);
    if (c.fatal) { const e = new Error(c.diag); e.fatal = true; throw e; }
    let compile = (c.diag || "").trim();
    if (/exceptions disabled|cannot use '(throw|try)'/.test(compile)) {
      compile += "\n\n[안내] 브라우저 내장 엔진은 C++ 예외(throw/try)를 지원하지 않습니다. 실행 엔진을 '자동' 또는 온라인 엔진으로 바꿔 주세요.";
    }
    if (!c.ok) return { engine: "local", compile, compiled: false, stdout: "", stderr: "", exitCode: 1, signal: "" };
    hooks.phase("run");
    return await new Promise((resolve) => {
      const w = new Worker(workerUrl("program-worker.js"), { type: "module" });
      const dec = { stdout: new TextDecoder(), stderr: new TextDecoder() };
      const out = { stdout: "", stderr: "" };
      let finished = false;
      const finish = (extra) => {
        if (finished) return; finished = true; clearTimeout(timer); w.terminate();
        const r = Object.assign({ engine: "local", compile, compiled: true, stdout: out.stdout, stderr: out.stderr, exitCode: null, signal: "" }, extra);
        if (/thread constructor failed|Resource temporarily unavailable/.test(r.stderr))
          r.stderr += "\n[안내] 브라우저 내장 엔진은 스레드를 지원하지 않습니다. 실행 엔진을 '자동' 또는 온라인 엔진으로 바꿔 주세요.";
        resolve(r);
      };
      const timer = setTimeout(() => finish({ signal: "시간 초과(" + LOCAL_RUN_TIMEOUT_MS / 1000 + "초)로 중단" }), LOCAL_RUN_TIMEOUT_MS);
      if (signal) signal.addEventListener("abort", () => finish({ signal: "사용자가 중지함" }));
      w.onmessage = (ev) => {
        const m = ev.data;
        if (m.type === "stdout" || m.type === "stderr") { out[m.type] += dec[m.type].decode(m.bytes, { stream: true }); hooks.stream(m.type, out[m.type]); }
        else if (m.type === "truncated") out.stderr += "\n[출력이 너무 길어 잘렸습니다]";
        else if (m.type === "exit") finish({ exitCode: m.code });
        else if (m.type === "trap") finish({ exitCode: 134, signal: "런타임 트랩: " + m.message });
      };
      w.onerror = (e) => finish({ signal: "실행기 오류: " + (e.message || "") });
      w.postMessage({ wasm: c.wasm, stdin: job.stdin || "" });
    });
  }

  /* ---------------- public API ---------------- */
  const ORDER = { auto: ["wandbox", "godbolt", "local"], wandbox: ["wandbox"], godbolt: ["godbolt"], local: ["local"] };
  const IMPL = { wandbox: runWandbox, godbolt: runGodbolt, local: runLocal };

  /**
   * job: { code, stdin, std: "c++20", opt: "2", engine: "auto" }
   * hooks: { phase(name), progress(0..1), stream(kind, text), note(text) }
   */
  async function run(job, signal, hooks) {
    hooks = Object.assign({ phase() {}, progress() {}, stream() {}, note() {} }, hooks || {});
    const order = ORDER[job.engine] || ORDER.auto;
    const errors = [];
    for (const name of order) {
      if (signal && signal.aborted) break;
      const t0 = performance.now();
      try {
        if (name !== "local") hooks.phase("remote:" + name);
        const r = await IMPL[name](job, signal, hooks);
        r.ms = Math.round(performance.now() - t0);
        r.label = ENGINE_LABEL[name];
        if (errors.length) r.fallbackNote = errors.join("\n");
        return r;
      } catch (e) {
        if (signal && signal.aborted) break;
        const msg = ENGINE_LABEL[name] + " 실패: " + (e && e.name === "AbortError" ? "응답 시간 초과" : (e && e.message ? e.message.split("\n")[0] : e));
        errors.push(msg);
        hooks.note(msg + (order.indexOf(name) < order.length - 1 ? " → 다음 엔진으로 전환" : ""));
      }
    }
    return { engine: null, label: "실행 실패", compile: "", compiled: false, stdout: "", stderr: "", exitCode: null,
             signal: signal && signal.aborted ? "사용자가 중지함" : "", error: errors.join("\n") || "중지됨" };
  }

  window.CppRunner = {
    run,
    ENGINE_LABEL,
    state,
    onStatus(fn) { listeners.add(fn); fn(state); return () => listeners.delete(fn); },
    preloadLocal() { return compileLocal({ code: "int main(){}", std: "c++20", opt: "0" }); }
  };
})();
