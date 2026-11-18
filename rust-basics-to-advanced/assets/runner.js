/* Rust runner: compiles and runs code with one of three online engines.
 *   playground – the official Rust Playground (play.rust-lang.org). Also offers Miri.
 *   godbolt    – Compiler Explorer execution API (newest stable rustc it lists).
 *   wandbox    – wandbox.org (newest Rust it lists).
 * "auto" tries playground → godbolt → wandbox.
 * There is no in-browser rustc: every engine needs network access.
 */
(function () {
  "use strict";
  const TIMEOUT_MS = 45000;
  const ENGINE_LABEL = { playground: "Rust Playground", godbolt: "Compiler Explorer", wandbox: "Wandbox" };
  const PG = "https://play.rust-lang.org";
  const stripAnsi = (s) => String(s || "").replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");

  async function http(url, body, signal, method) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    const onAbort = () => ctl.abort();
    if (signal) signal.addEventListener("abort", onAbort);
    try {
      const init = { method: method || (body ? "POST" : "GET"), headers: { "Accept": "application/json" }, signal: ctl.signal };
      if (body) { init.headers["Content-Type"] = "application/json"; init.body = JSON.stringify(body); }
      const r = await fetch(url, init);
      const text = await r.text();
      if (!r.ok) { const err = new Error("HTTP " + r.status + ": " + text.slice(0, 200)); err.status = r.status; throw err; }
      return JSON.parse(text);
    } finally { clearTimeout(t); if (signal) signal.removeEventListener("abort", onAbort); }
  }

  /* Split cargo's stderr into compiler messages and the program's own stderr. */
  function splitCargo(stderr) {
    const s = stripAnsi(stderr);
    const m = /^\s*Running `[^`]*`\s*$/m.exec(s);
    const head = m ? s.slice(0, m.index) : s;
    const tail = m ? s.slice(m.index + m[0].length).replace(/^\n/, "") : "";
    const compile = head.split("\n")
      .filter((l) => !/^\s*(Compiling|Finished|Preparing|Checking|Updating|Locking|Adding|Downloaded|Downloading)\b/.test(l))
      .join("\n").trim();
    return { ran: !!m, compile, runtime: tail };
  }
  function exitOf(detail, success) {
    if (success) return { code: 0, sig: "" };
    const d = String(detail || "");
    const c = /status:?\s*(-?\d+)/i.exec(d), s = /signal:?\s*(\d+)/i.exec(d);
    if (c) return { code: Number(c[1]), sig: "" };
    if (s) return { code: null, sig: "signal " + s[1] + (s[1] === "9" ? " (시간·메모리 한도 초과일 수 있음)" : s[1] === "11" ? " (SIGSEGV)" : "") };
    return { code: null, sig: d };
  }

  /* ---------------- Rust Playground ---------------- */
  async function runPlayground(job, signal) {
    try {
      const res = await http(PG + "/execute", {
        channel: "stable", mode: job.mode, edition: job.edition, crateType: "bin",
        tests: false, backtrace: false, code: job.code
      }, signal);
      const sp = splitCargo(res.stderr);
      const ex = exitOf(res.exitDetail, res.success);
      return {
        engine: "playground", compiled: sp.ran, compile: sp.compile,
        stdout: res.stdout || "", stderr: sp.runtime, exitCode: sp.ran ? ex.code : 1, signal: sp.ran ? ex.sig : ""
      };
    } catch (e) {
      if (signal && signal.aborted) throw e;
      if (e.status && e.status !== 404) throw e;
      // Older/alternative endpoint used by mdBook; reports less detail.
      const res = await http(PG + "/evaluate.json", {
        version: "stable", optimize: job.mode === "release" ? "3" : "0", code: job.code, edition: job.edition, tests: false
      }, signal);
      const failed = res.error != null && res.error !== "";
      return {
        engine: "playground", compiled: !failed, compile: failed ? splitCargo(res.error).compile || stripAnsi(res.error) : "",
        stdout: failed ? "" : (res.result || ""), stderr: "", exitCode: failed ? 1 : 0, signal: "", lite: true
      };
    }
  }

  async function runMiri(job, signal) {
    const res = await http(PG + "/miri", { code: job.code, edition: job.edition, tests: false }, signal);
    const sp = splitCargo(res.stderr);
    const ex = exitOf(res.exitDetail, res.success);
    return {
      engine: "playground", label: "Rust Playground · Miri", compiled: sp.ran || res.success, compile: sp.compile,
      stdout: res.stdout || "", stderr: sp.ran ? sp.runtime : (res.success ? "" : sp.compile), exitCode: ex.code, signal: ex.sig
    };
  }

  /* ---------------- Compiler Explorer ---------------- */
  let gbIds = null;
  async function godboltCompilers(signal) {
    if (gbIds) return gbIds;
    let ids = [];
    try {
      const list = await http("https://godbolt.org/api/compilers/rust?fields=id,name,semver,supportsExecute", null, signal);
      ids = list
        .filter((c) => /^r\d{3,5}$/.test(c.id) && c.supportsExecute !== false)
        .map((c) => ({ id: c.id, v: String(c.semver || "").split(".").map(Number) }))
        .sort((a, b) => (b.v[0] - a.v[0]) || (b.v[1] - a.v[1]) || ((b.v[2] || 0) - (a.v[2] || 0)))
        .map((c) => c.id);
    } catch (e) { if (signal && signal.aborted) throw e; }
    gbIds = ids.slice(0, 3).concat(["r1960", "r1940", "r1900"].filter((x) => ids.indexOf(x) < 0));
    return gbIds;
  }
  const joinLines = (arr) => (arr || []).map((l) => l.text).join("\n");
  async function runGodbolt(job, signal) {
    let lastErr;
    for (const id of await godboltCompilers(signal)) {
      try {
        const res = await http("https://godbolt.org/api/compiler/" + id + "/compile", {
          source: job.code,
          lang: "rust",
          options: {
            userArguments: "--edition " + job.edition + " -C opt-level=" + (job.mode === "release" ? "3 -C debug-assertions=off" : "0"),
            executeParameters: { args: [], stdin: "" },
            compilerOptions: { executorRequest: true },
            filters: { execute: true },
            tools: [], libraries: []
          },
          allowStoreCodeDebug: false
        }, signal);
        const build = res.buildResult || {};
        const compileText = stripAnsi([joinLines(build.stdout), joinLines(build.stderr)].filter(Boolean).join("\n"));
        const ran = res.didExecute !== false && (build.code === undefined || build.code === 0);
        return {
          engine: "godbolt", compiled: ran, compile: compileText.replace(/<source>/g, "src/main.rs").trim(),
          stdout: ran ? joinLines(res.stdout) + (res.stdout && res.stdout.length ? "\n" : "") : "",
          stderr: ran ? stripAnsi(joinLines(res.stderr)) : "",
          exitCode: ran ? res.code : (build.code === undefined ? 1 : build.code),
          signal: res.timedOut ? "시간 초과" : "", version: id
        };
      } catch (e) {
        lastErr = e;
        if (e.status !== 404) throw e;   // only try another compiler id on "not found"
      }
    }
    throw lastErr || new Error("no rustc found");
  }

  /* ---------------- Wandbox ---------------- */
  let wbRust = null;
  async function wandboxCompiler(signal) {
    if (wbRust) return wbRust;
    const list = await http("https://wandbox.org/api/list.json", null, signal);
    const rust = list.filter((c) => c.language === "Rust")
      .map((c) => ({ name: c.name, v: (String(c.version || c.name).match(/\d+/g) || [0, 0]).map(Number) }))
      .sort((a, b) => (b.v[0] - a.v[0]) || (b.v[1] - a.v[1]) || ((b.v[2] || 0) - (a.v[2] || 0)));
    if (!rust.length) throw new Error("Wandbox에 Rust 컴파일러가 없습니다");
    const head = rust.find((c) => !/head|nightly/i.test(c.name)) || rust[0];
    wbRust = { name: head.name, ed2024: head.v[0] > 1 || head.v[1] >= 85 };
    return wbRust;
  }
  async function runWandbox(job, signal) {
    const c = await wandboxCompiler(signal);
    const edition = job.edition === "2024" && !c.ed2024 ? "2021" : job.edition;
    const opts = ["--edition=" + edition].concat(job.mode === "release" ? ["-O"] : []);
    const res = await http("https://wandbox.org/api/compile.json", {
      compiler: c.name, code: job.code, stdin: "", "compiler-option-raw": opts.join("\n"), save: false
    }, signal);
    const compiled = res.program_output !== undefined || res.program_error !== undefined || String(res.status) === "0";
    return {
      engine: "wandbox", compiled,
      compile: stripAnsi(res.compiler_message || "").replace(/prog\.rs/g, "src/main.rs").trim() +
        (edition !== job.edition ? "\n[안내] Wandbox의 Rust가 오래되어 edition " + edition + "로 컴파일했습니다." : ""),
      stdout: res.program_output || "", stderr: stripAnsi(res.program_error || ""),
      exitCode: res.status !== undefined ? Number(res.status) : null, signal: res.signal || "", version: c.name
    };
  }

  /* ---------------- public API ---------------- */
  const ORDER = { auto: ["playground", "godbolt", "wandbox"], playground: ["playground"], godbolt: ["godbolt"], wandbox: ["wandbox"] };
  const IMPL = { playground: runPlayground, godbolt: runGodbolt, wandbox: runWandbox };

  /**
   * job: { code, edition: "2024", mode: "debug" | "release", engine: "auto", miri: false }
   * hooks: { phase(name), note(text) }
   */
  async function run(job, signal, hooks) {
    hooks = Object.assign({ phase() {}, note() {} }, hooks || {});
    const order = job.miri ? ["miri"] : (ORDER[job.engine] || ORDER.auto);
    const errors = [];
    for (const name of order) {
      if (signal && signal.aborted) break;
      const t0 = performance.now();
      try {
        hooks.phase(name === "miri" ? "miri" : "remote:" + name);
        const r = name === "miri" ? await runMiri(job, signal) : await IMPL[name](job, signal);
        r.ms = Math.round(performance.now() - t0);
        r.label = r.label || ENGINE_LABEL[r.engine] + (r.version ? " (" + r.version + ")" : "") + (r.lite ? " · 간이 API" : "");
        if (errors.length) r.fallbackNote = errors.join("\n");
        return r;
      } catch (e) {
        if (signal && signal.aborted) break;
        const label = name === "miri" ? "Miri" : ENGINE_LABEL[name];
        const why = e && e.name === "AbortError" ? "응답 시간 초과"
          : e instanceof TypeError ? "연결 실패(네트워크 차단 또는 서비스 응답 없음)"
          : (e && e.message ? e.message.split("\n")[0] : String(e));
        const msg = label + " 실패: " + why;
        errors.push(msg);
        hooks.note(msg + (order.indexOf(name) < order.length - 1 ? " → 다음 엔진으로 전환" : ""));
      }
    }
    return {
      engine: null, label: "실행 실패", compile: "", compiled: false, stdout: "", stderr: "", exitCode: null,
      signal: signal && signal.aborted ? "사용자가 중지함" : "", error: errors.join("\n") || "중지됨"
    };
  }

  window.RustRunner = { run, ENGINE_LABEL, splitCargo, exitOf };
})();
