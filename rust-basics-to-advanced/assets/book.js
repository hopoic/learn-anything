(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const PFX = "rsb:";
  const store = {
    get(k, d) { try { const v = localStorage.getItem(PFX + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) {} }
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- theme ---------- */
  const root = document.documentElement;
  const applyTheme = t => { if (t) root.setAttribute("data-theme", t); else root.removeAttribute("data-theme"); };
  let theme = store.get("theme", null); applyTheme(theme);
  const themeLabel = { null: "시스템", light: "라이트", dark: "다크" };
  const themeBtn = $("#themeBtn");
  const showTheme = () => { themeBtn.textContent = "테마: " + themeLabel[theme] + " (눌러서 전환)"; };
  showTheme();
  themeBtn.addEventListener("click", () => {
    theme = theme === null ? "light" : theme === "light" ? "dark" : null;
    applyTheme(theme); store.set("theme", theme); showTheme();
  });

  /* ---------- TOC: collapse on mobile, highlight active ---------- */
  const tocd = $("#tocd");
  const narrow = () => window.matchMedia("(max-width: 960px)").matches;
  if (narrow()) tocd.open = false;
  const links = $$("#tocl a");
  const byId = {}; links.forEach(a => byId[a.getAttribute("href").slice(1)] = a);
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { links.forEach(l => l.classList.remove("active")); const a = byId[e.target.id]; if (a) a.classList.add("active"); } });
    }, { rootMargin: "-20% 0px -70% 0px" });
    $$("section.chapter").forEach(s => io.observe(s));
  }
  links.forEach(a => a.addEventListener("click", () => { if (narrow()) tocd.open = false; }));

  /* ---------- progress ---------- */
  let done = store.get("done", {});
  const TOTAL = $$(".done-btn").length;
  function renderDone() {
    $$(".done-btn").forEach(b => { const on = !!done[b.dataset.done]; b.setAttribute("aria-pressed", on); b.textContent = on ? "완료함 ✓" : "이 장을 마쳤어요"; });
    $$(".toc .chk").forEach(c => c.textContent = done[c.dataset.c] ? "✓" : "");
    $("#meter").textContent = Object.values(done).filter(Boolean).length + " / " + TOTAL + " 완료";
  }
  $$(".done-btn").forEach(b => b.addEventListener("click", () => { done[b.dataset.done] = !done[b.dataset.done]; store.set("done", done); renderDone(); }));
  renderDone();

  /* ---------- syntax highlight: Rust ---------- */
  const RKW = "as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|safe|self|Self|static|struct|super|trait|true|type|union|unsafe|use|where|while|yield";
  const RTY = "i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char|str";
  const RTOK = new RegExp(
    "(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)" +                                    // 1 comment
    "|(#!?\\[[^\\]\\n]*(?:\\][^\\]\\n]*)*?\\])" +                                  // 2 attribute
    "|(b?r(#*)\"[\\s\\S]*?\"\\4|b?\"(?:\\\\[\\s\\S]|[^\"\\\\])*\"|b?'(?:\\\\(?:x[0-9a-fA-F]{2}|u\\{[0-9a-fA-F]+\\}|.)|[^'\\\\\\n])')" + // 3 string/char
    "|('[A-Za-z_]\\w*)" +                                                          // 5 lifetime / label
    "|\\b(" + RKW + ")\\b" +                                                       // 6 keyword
    "|\\b([a-z_]\\w*!)" +                                                          // 7 macro call
    "|\\b(" + RTY + "|[A-Z][A-Za-z0-9_]*)\\b" +                                    // 8 type
    "|\\b(\\d[\\d_]*(?:\\.\\d[\\d_]*)?(?:[eE][+-]?\\d+)?(?:_?(?:" + RTY + "))?|0x[\\da-fA-F_]+|0b[01_]+)\\b", "g"); // 9 number
  const CKW = "alignas|auto|bool|break|case|catch|char|class|const|constexpr|continue|default|delete|do|double|else|enum|extern|false|float|for|if|inline|int|long|namespace|new|noexcept|nullptr|operator|private|public|return|short|signed|sizeof|static|struct|switch|template|this|throw|true|try|typedef|typename|union|unsigned|using|virtual|void|volatile|while|NULL";
  const CTOK = new RegExp("(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)|(^[ \\t]*#[^\\n]*)|(\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])+')|\\b(" + CKW + ")\\b|\\b(std)(?=::)|\\b(\\d[\\d'.]*(?:[xX][\\da-fA-F']+)?[uUlLfF]*)\\b", "gm");
  const SHTOK = /(#[^\n]*)|("(?:\\.|[^"\\])*"|'[^'\n]*')|^(\$|\[[\w.-]+\])/gm;
  function hl(src, lang) {
    let re, cls;
    if (lang === "rust") { re = RTOK; cls = m => m[1] ? "tk-c" : m[2] ? "tk-p" : m[3] ? "tk-s" : m[5] ? "tk-l" : m[6] ? "tk-k" : m[7] ? "tk-m" : m[8] ? "tk-t" : "tk-n"; }
    else if (lang === "c" || lang === "cpp") { re = CTOK; cls = m => m[1] ? "tk-c" : m[2] ? "tk-p" : m[3] ? "tk-s" : m[4] ? "tk-k" : m[5] ? "tk-t" : "tk-n"; }
    else if (lang === "toml" || lang === "sh") { re = SHTOK; cls = m => m[1] ? "tk-c" : m[2] ? "tk-s" : "tk-k"; }
    else return esc(src);
    let out = "", last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(src))) {
      if (m[0] === "") { re.lastIndex++; continue; }
      if (lang === "sh" && m[1] && m.index > 0 && !/\s/.test(src[m.index - 1])) continue;   // '#' inside a word
      out += esc(src.slice(last, m.index)) + '<span class="' + cls(m) + '">' + esc(m[0]) + "</span>";
      last = re.lastIndex;
    }
    return out + esc(src.slice(last));
  }
  const highlight = src => hl(src, "rust");
  $$("pre code[data-lang]").forEach(el => { el.innerHTML = hl(el.textContent, el.dataset.lang); });

  /* ---------- copy ---------- */
  const codeOf = box => box._ed ? box._ed.value : (box._cur !== undefined ? box._cur : box.querySelector("code").textContent);
  $$(".cp").forEach(btn => btn.addEventListener("click", () => {
    const box = btn.closest(".code"), text = codeOf(box);
    const ok = () => { btn.textContent = "복사됨"; setTimeout(() => btn.textContent = "복사", 1400); };
    const fallback = () => { const c = box.querySelector("code"); if (!c) return; const r = document.createRange(); r.selectNodeContents(c); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = "선택됨 · Ctrl+C"; };
    try { navigator.clipboard.writeText(text).then(ok, fallback); } catch (e) { fallback(); }
  }));

  /* ---------- engine settings ---------- */
  const engineSel = $("#engineSel"), edSel = $("#edSel"), modeSel = $("#modeSel"), engineStatus = $("#engineStatus");
  engineSel.value = store.get("engine", "auto");
  edSel.value = store.get("edition", "2024");
  modeSel.value = store.get("mode", "debug");
  engineSel.addEventListener("change", () => { store.set("engine", engineSel.value); renderEngineStatus(); });
  edSel.addEventListener("change", () => store.set("edition", edSel.value));
  modeSel.addEventListener("change", () => store.set("mode", modeSel.value));
  let lastEngine = "";
  function renderEngineStatus() {
    engineStatus.textContent = (lastEngine ? "마지막 실행: " + lastEngine + ". " : "") +
      (navigator.onLine === false ? "오프라인 상태입니다. 실행하려면 인터넷 연결이 필요합니다." : "모든 엔진은 온라인 서비스입니다.");
  }
  renderEngineStatus();
  window.addEventListener("online", renderEngineStatus);
  window.addEventListener("offline", renderEngineStatus);

  /* ---------- runnable code blocks ---------- */
  function setCode(box, code) {
    box._cur = code;
    const c = box.querySelector("pre code");
    if (c) c.innerHTML = highlight(code);
  }
  function startEdit(box, focus = true) {
    if (box._ed) return;
    const pre = box.querySelector("pre");
    const ta = document.createElement("textarea");
    ta.className = "ed"; ta.spellcheck = false; ta.value = codeOf(box);
    ta.setAttribute("aria-label", "코드 편집기");
    ta.setAttribute("autocapitalize", "off"); ta.setAttribute("autocomplete", "off");
    ta.rows = Math.min(40, Math.max(6, ta.value.split("\n").length + 1));
    ta.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); runBlock(box, false); return; }
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        ta.setRangeText("    ", ta.selectionStart, ta.selectionEnd, "end");
      }
    });
    pre.hidden = true; pre.after(ta); box._ed = ta; box.classList.add("editing");
    box.querySelector(".eb").textContent = "편집 끝";
    if (!box.querySelector(".resetb")) {
      const r = document.createElement("button"); r.type = "button"; r.className = "resetb"; r.textContent = "원래대로";
      r.addEventListener("click", () => { if (box._ed) box._ed.value = box._orig; setCode(box, box._orig); if (box.closest("#playground")) store.set("playground", null); });
      box.querySelector(".acts").prepend(r);
    }
    if (focus) ta.focus();
  }
  function endEdit(box) {
    if (!box._ed) return;
    setCode(box, box._ed.value);
    box._ed.remove(); box._ed = null;
    box.querySelector("pre").hidden = false; box.classList.remove("editing");
    box.querySelector(".eb").textContent = "편집";
  }
  function ensureOut(box) {
    if (box._out) return box._out;
    const o = document.createElement("div");
    o.className = "runout";
    o.innerHTML = '<div class="rhead"><span class="chip"><i class="dot"></i><span class="st">대기</span></span><span class="acts"><button type="button" class="stopb" hidden>■ 중지</button><button type="button" class="clrb">출력 지우기</button></span></div>' +
      '<pre class="o-note"></pre><pre class="o-comp"></pre><pre class="o-out"></pre><pre class="o-err"></pre>';
    $(".clrb", o).addEventListener("click", () => { ["o-note", "o-comp", "o-out", "o-err"].forEach(c => $("." + c, o).textContent = ""); setSt(o, "", "대기"); });
    $(".stopb", o).addEventListener("click", () => { if (box._ctl) box._ctl.abort(); });
    box.append(o); box._out = o;
    return o;
  }
  function setSt(o, dot, text) { $(".dot", o).className = "dot " + dot; $(".st", o).textContent = text; }
  async function runBlock(box, miri) {
    if (box._busy || !window.RustRunner) return;
    const o = ensureOut(box);
    const btns = $$(".rb, .mb", box);
    box._busy = true; btns.forEach(b => b.disabled = true);
    const ctl = new AbortController(); box._ctl = ctl;
    $(".stopb", o).hidden = false;
    ["o-note", "o-comp", "o-out", "o-err"].forEach(c => $("." + c, o).textContent = "");
    const notes = [];
    const mode = box.dataset.mode === "release" ? "release" : modeSel.value;
    setSt(o, "busy", "준비 중…");
    const res = await RustRunner.run({ code: codeOf(box), edition: edSel.value, mode, engine: engineSel.value, miri: !!miri }, ctl.signal, {
      phase(p) {
        if (p === "miri") setSt(o, "busy", "Miri로 해석 실행 중 · Rust Playground … (수십 초 걸릴 수 있음)");
        else setSt(o, "busy", "컴파일·실행 중 · " + RustRunner.ENGINE_LABEL[p.slice(7)] + " …");
      },
      note(t) { notes.push(t); $(".o-note", o).textContent = notes.join("\n"); }
    });
    $(".stopb", o).hidden = true;
    box._busy = false; btns.forEach(b => b.disabled = false); box._ctl = null;
    $(".o-note", o).textContent = res.fallbackNote ? res.fallbackNote.split("\n").map(s => "· " + s).join("\n") + "\n→ " + res.label + "(으)로 실행했습니다." : "";
    $(".o-comp", o).textContent = (res.compile || "").trim();
    $(".o-out", o).textContent = res.stdout;
    let err = res.stderr || "";
    if (res.signal) err += (err ? "\n" : "") + "[" + res.signal + "]";
    if (res.error) err += (err ? "\n" : "") + res.error + "\n네트워크 연결을 확인하거나, 실행 엔진을 다른 것으로 바꿔 다시 시도해 보세요.";
    $(".o-err", o).textContent = err;
    if (!res.engine) { setSt(o, "bad", res.signal || "실행하지 못함"); return; }
    lastEngine = res.label; renderEngineStatus();
    const meta = " · " + (res.ms / 1000).toFixed(1) + "s · " + res.label + (mode === "release" && !miri ? " · release" : "");
    const exp = box.dataset.expect;
    if (!res.compiled) setSt(o, exp === "error" ? "warn" : "bad", (exp === "error" ? "컴파일 오류 (의도한 예제: 메시지를 읽어 보세요)" : "컴파일 오류") + meta);
    else if (res.signal) setSt(o, "bad", "중단됨" + meta);
    else if (res.exitCode === 101 && exp === "panic") setSt(o, "warn", "panic으로 종료 (의도한 동작) · exit 101" + meta);
    else if (miri && res.exitCode !== 0 && /Undefined Behavior/i.test(err)) setSt(o, "bad", "Miri가 정의되지 않은 동작을 발견함" + meta);
    else setSt(o, res.exitCode === 0 ? "ok" : "bad", "exit " + res.exitCode + meta);
  }
  $$(".code.run").forEach(box => {
    box._orig = box.querySelector("code").textContent; box._cur = box._orig;
    box.querySelector(".rb").addEventListener("click", () => runBlock(box, false));
    const mb = box.querySelector(".mb");
    if (mb) mb.addEventListener("click", () => runBlock(box, true));
    box.querySelector(".eb").addEventListener("click", () => box._ed ? endEdit(box) : startEdit(box));
    if (box.closest("#playground")) {
      const saved = store.get("playground", null);
      if (saved) setCode(box, saved);
      startEdit(box, false);
      box._ed.addEventListener("input", () => store.set("playground", box._ed.value));
    }
  });

  /* ---------- generic classifier bench ---------- */
  function classifier(listId, scoreId, opts, items, key) {
    const list = $("#" + listId), score = $("#" + scoreId);
    if (!list) return;
    let ans = store.get(key, {});
    function render() {
      list.innerHTML = items.map((it, i) => {
        const pick = ans[i];
        let fb = "";
        if (pick !== undefined) {
          const good = pick === it.a, mid = it.mid && it.mid[pick];
          fb = '<div class="fb ' + (good ? "good" : mid ? "mid" : "bad") + '">' + (good ? "정답. " : mid ? "절반. " + esc(mid) + " " : "아닙니다. 정답은 <b>" + esc(opts[it.a]) + "</b>. ") + it.why + "</div>";
        }
        return '<div class="item"><div class="q">' + it.q + '</div><div class="seg" role="group">' +
          opts.map((o, j) => '<button type="button" data-i="' + i + '" data-j="' + j + '" aria-pressed="' + (pick === j) + '">' + esc(o) + "</button>").join("") + "</div>" + fb + "</div>";
      }).join("");
      const n = Object.keys(ans).length, ok = items.filter((it, i) => ans[i] === it.a).length;
      score.className = "status " + (n < items.length ? "y" : ok === items.length ? "g" : ok >= items.length * 0.6 ? "y" : "r");
      score.textContent = n < items.length ? "진행: " + n + " / " + items.length + " · 정답 " + ok : "결과: " + ok + " / " + items.length + (ok === items.length ? " — 완벽합니다." : " — 틀린 항목의 설명을 읽고 다시 골라 보세요.");
    }
    list.addEventListener("click", e => { const b = e.target.closest("button[data-i]"); if (!b) return; ans[b.dataset.i] = +b.dataset.j; store.set(key, ans); render(); });
    const reset = document.getElementById(listId + "Reset");
    if (reset) reset.addEventListener("click", () => { ans = {}; store.set(key, ans); render(); });
    render();
  }
  const cc = s => '<code class="snip">' + highlight(s) + "</code>";

  /* 1-A: what does safe Rust guarantee? */
  classifier("guardList", "guardScore", ["컴파일 타임에 막음", "런타임 panic", "막지 않음"], [
    { q: "해제한 메모리를 다시 읽기 (use-after-free)", a: 0, why: "소유권과 라이프타임 규칙 덕분에 해제된 값을 가리키는 참조는 컴파일되지 않습니다(3·4·10장)." },
    { q: "이중 해제 (double free)", a: 0, why: "값의 소유자는 하나이고 이동된 이름은 drop되지 않으므로, 같은 메모리를 두 번 해제하는 코드가 만들어지지 않습니다(3장)." },
    { q: "배열·벡터 범위를 벗어난 인덱스 " + cc("v[i]"), a: 1, why: "인덱스 값은 보통 런타임에야 알 수 있으므로 경계 검사 후 panic합니다. C처럼 옆 메모리를 읽는 일은 없습니다. 실패를 다루고 싶으면 v.get(i)로 Option을 받습니다(7장)." },
    { q: "널 포인터 역참조", a: 0, why: "safe Rust에는 널 참조가 없습니다. 없을 수 있는 값은 Option이고, 꺼내기 전에 반드시 확인해야 컴파일됩니다(5장)." },
    { q: "두 스레드가 락 없이 같은 변수를 동시에 쓰기 (데이터 경쟁)", a: 0, why: "공유 XOR 변경 규칙과 Send/Sync 트레잇이 데이터 경쟁을 컴파일 오류로 만듭니다(12장)." },
    { q: "정수 오버플로 (debug 빌드)", a: 1, mid: { 2: "release 빌드에서는 기본적으로 감싸기만 하고 멈추지 않으니 절반은 맞습니다." }, why: "debug 빌드는 오버플로를 검사해 panic합니다. release 빌드는 기본적으로 2의 보수로 감쌉니다. 어느 쪽이든 C와 달리 UB는 아닙니다(2장)." },
    { q: cc("RefCell") + "로 이미 빌려준 값을 다시 " + cc("borrow_mut()"), a: 1, why: "RefCell은 빌림 규칙 검사를 런타임으로 옮긴 타입이라, 위반하면 panic합니다(11장)." },
    { q: "두 스레드가 서로의 락을 기다리는 교착 상태", a: 2, why: "교착은 메모리 안전 문제가 아니라 논리 문제라서 컴파일러가 막지 않습니다. 락 순서 규칙 같은 설계로 막아야 합니다(12장)." },
    { q: cc("Rc") + " 순환 참조로 인한 메모리 누수", a: 2, why: "누수는 safe Rust에서도 가능하며 \"안전한\" 동작으로 분류됩니다. std::mem::forget도 safe 함수입니다. Weak로 순환을 끊어야 합니다(11장)." },
    { q: "미터 값을 피트를 기대하는 함수에 넘김 (둘 다 f64)", a: 2, mid: { 0: "f64 그대로라면 막지 못합니다. 하지만 newtype으로 바꾸면 컴파일 타임에 막을 수 있습니다(15장)." }, why: "타입이 같으면 컴파일러는 의미를 모릅니다. 15장의 newtype(struct Meters(f64))으로 감싸면 이 실수도 컴파일 오류가 됩니다." }
  ], "guard");

  /* 4-A: borrow checker */
  classifier("borrowList", "borrowScore", ["컴파일됨", "컴파일 오류"], [
    { q: cc('let mut v = vec![1, 2, 3];\nlet first = &v[0];\nv.push(4);\nprintln!("{first}");'), a: 1, why: "E0502. first가 v를 공유로 빌린 채 아래에서 쓰이는데, 그 사이에 push가 가변으로 빌립니다. push가 재할당하면 first는 해제된 메모리를 가리킵니다." },
    { q: cc('let mut v = vec![1, 2, 3];\nlet first = v[0];\nv.push(4);\nprintln!("{first}");'), a: 0, why: "v[0]은 i32이고 i32는 Copy라서 값이 복사됩니다. first는 v를 빌리지 않으므로 push와 충돌하지 않습니다." },
    { q: cc('let mut s = String::from("a");\nlet r1 = &s; let r2 = &s;\nprintln!("{r1}{r2}");\nlet r3 = &mut s;\nr3.push(\'b\');'), a: 0, why: "NLL: r1, r2의 빌림은 마지막 사용(println!)에서 끝납니다. 그 뒤의 가변 빌림은 겹치지 않습니다." },
    { q: cc("let mut s = String::new();\nlet a = &mut s;\nlet b = &mut s;\na.push('x');\nb.push('y');"), a: 1, why: "E0499. 가변 참조 a가 아직 쓰일 예정인데 두 번째 가변 참조 b를 만들었습니다. 같은 값에 대한 &mut는 한 번에 하나뿐입니다." },
    { q: cc('let s = String::from("hi");\nlet r = &s;\nlet t = s;\nprintln!("{r}");'), a: 1, why: "E0505. r이 s를 빌리고 있는 동안 s를 t로 이동하려 했습니다. 이동하면 r이 매달리게 됩니다." },
    { q: cc("fn first(v: &[i32]) -> &i32 {\n    &v[0]\n}"), a: 0, why: "입력 참조가 하나뿐이라 생략 규칙 2에 따라 반환 참조가 v의 라이프타임을 받습니다(10장)." },
    { q: cc('let r;\n{\n    let x = 5;\n    r = &x;\n}\nprintln!("{r}");'), a: 1, why: "E0597. x는 안쪽 블록이 끝날 때 사라지는데 r은 그 뒤에도 쓰입니다. 참조는 원래 값보다 오래 살 수 없습니다." },
    { q: cc('let mut v = vec![1, 2, 3];\nfor x in v.iter_mut() { *x *= 2; }\nprintln!("{v:?}");'), a: 0, why: "iter_mut()는 원소마다 겹치지 않는 &mut를 하나씩 줍니다. 루프가 끝나면 빌림도 끝나므로 출력도 문제없습니다." },
    { q: cc("let mut v = vec![1, 2, 3];\nfor x in &v {\n    if *x == 2 { v.push(9); }\n}"), a: 1, why: "E0502. 순회하는 동안 v는 공유로 빌려져 있습니다. 순회 중 삽입은 반복자 무효화 버그라서 막힙니다. 추가할 것을 따로 모았다가 루프 뒤에 extend하세요." }
  ], "borrow");

  /* 6-A: error-handling policy */
  classifier("errList", "errScore", ["panic! / assert!", "Option", "Result + 오류 열거형", "anyhow 등 범용 오류"], [
    { q: "라이브러리의 설정 파서가 숫자가 아닌 값을 만났다. 호출자는 어떤 키가 왜 틀렸는지 알아야 한다.", a: 2, mid: { 3: "애플리케이션이라면 괜찮지만, 라이브러리가 범용 오류를 반환하면 호출자가 종류별로 match할 수 없습니다." }, why: "예상 가능한 실패이고, 호출자가 종류에 따라 대응해야 하므로 오류 열거형이 맞습니다." },
    { q: "HashMap에서 키로 값을 찾는다. 없을 수도 있다.", a: 1, why: "없음은 실패가 아니라 정상적인 결과입니다. 이유를 전달할 필요가 없으니 Option이 가장 가볍습니다. 표준 HashMap::get도 Option을 반환합니다." },
    { q: "내부 함수에서 계산한 인덱스가 항상 길이보다 작아야 하는데, 아니다.", a: 0, why: "불변식이 깨진 프로그래머 버그입니다. 복구가 아니라 수정 대상이므로 assert!나 debug_assert!로 즉시 드러냅니다." },
    { q: "CLI 도구의 main: 파일 읽기·파싱·네트워크 오류를 문맥과 함께 사용자에게 보여 주고 종료한다.", a: 3, mid: { 2: "동작은 하지만, 최상위 애플리케이션에서 모든 하위 오류를 열거형으로 감싸는 비용이 큽니다." }, why: "애플리케이션 최상위에서는 오류를 종류별로 다르게 처리하기보다 문맥을 붙여 보여 주는 것이 목적입니다. anyhow::Result + .context()가 관용적입니다." },
    { q: "문자열에서 첫 번째 공백의 위치를 찾는다.", a: 1, why: "공백이 없을 수 있을 뿐 오류가 아닙니다. str::find도 Option<usize>를 반환합니다." },
    { q: "모터 드라이버 크레이트: 통신 타임아웃, CRC 오류, 과전류를 호출자가 구분해 다르게 대응해야 한다.", a: 2, why: "타임아웃은 재시도, CRC는 재전송 요청, 과전류는 비상 정지처럼 대응이 다르므로 변형을 나눈 오류 열거형이 필요합니다." },
    { q: "프로그램 시작 시, 소스에 박아 넣은 보정 테이블이 정렬되어 있지 않다는 것을 발견했다.", a: 0, why: "입력이 아니라 코드 자체의 결함입니다. 실행할 이유가 없으니 시작 시점 assert!로 멈추는 것이 맞습니다. 가능하면 const 평가로 컴파일 타임에 검사하세요." }
  ], "err");

  /* 8-A: dispatch */
  classifier("dispList", "dispScore", ["정적 디스패치", "동적 디스패치", "컴파일 오류"], [
    { q: cc("fn report<S: Sensor>(s: &S) { s.name(); }"), a: 0, why: "제네릭은 사용된 타입마다 단형화되어 직접 호출이 됩니다." },
    { q: cc("fn report(s: &dyn Sensor) { s.name(); }"), a: 1, why: "&dyn Sensor는 (데이터 포인터, vtable 포인터) 팻 포인터이고, 호출은 vtable을 통한 간접 호출입니다." },
    { q: cc("fn report(s: &impl Sensor) { s.name(); }"), a: 0, why: "인자 위치의 impl Trait는 제네릭의 문법 설탕입니다. 단형화됩니다." },
    { q: cc("let v: Vec<Box<dyn Sensor>> = load_all();\nv[0].name();"), a: 1, why: "서로 다른 타입을 한 벡터에 담기 위해 트레잇 객체를 썼으므로 동적 디스패치입니다." },
    { q: cc("fn make() -> impl Sensor { Thermistor { raw: 0 } }\nmake().name();"), a: 0, why: "반환 위치의 impl Trait는 \"구체 타입을 숨긴 것\"일 뿐 타입은 컴파일 타임에 하나로 정해집니다. 정적 디스패치입니다." },
    { q: cc("trait Codec { fn encode<T: Debug>(&self, v: &T); }\nlet c: &dyn Codec = &json;"), a: 2, why: "E0038. 제네릭 메서드는 타입마다 다른 기계어가 필요해 vtable에 담을 수 없으므로 Codec은 dyn 호환이 아닙니다. 제네릭 대신 &dyn Debug를 받게 바꾸거나, 메서드에 where Self: Sized를 붙여 dyn에서 제외합니다." },
    { q: cc("trait Shape { fn clone_me(&self) -> Self; }\nfn draw(s: Box<dyn Shape>) {}"), a: 2, why: "E0038. Self를 값으로 반환하면 크기를 알아야 하는데 dyn Shape는 크기를 모릅니다. Box<dyn Shape>를 반환하는 메서드로 바꾸는 것이 보통의 해법입니다." },
    { q: cc("let mut m = Motor { id: 1, rpm: 0.0 };\nm.command(0.5);   // Motor: Actuator"), a: 0, why: "구체 타입의 값에 대고 메서드를 부르면 컴파일러가 어떤 구현인지 알기 때문에 직접 호출합니다. dyn은 트레잇 객체를 통할 때만 생깁니다." }
  ], "disp");

  /* 10-A: lifetimes */
  classifier("lifeList", "lifeScore", ["생략 규칙으로 충분", "'a 명시 필요", "어떻게 적어도 불가능"], [
    { q: cc("fn first_word(s: &str) -> &str"), a: 0, why: "입력 참조가 하나뿐이므로 규칙 2: 출력이 s의 라이프타임을 받습니다." },
    { q: cc("fn longest(a: &str, b: &str) -> &str"), a: 1, why: "입력 참조가 둘이고 self가 없어 규칙 2·3이 적용되지 않습니다. fn longest<'a>(a: &'a str, b: &'a str) -> &'a str." },
    { q: cc("fn name(&self) -> &str"), a: 0, why: "규칙 3: &self가 있으면 출력은 self의 라이프타임을 받습니다." },
    { q: cc("fn pick(&self, key: &str) -> &str   // returns data from self"), a: 0, mid: { 1: "key를 반환하려는 경우라면 맞습니다. 그때는 규칙 3이 self에 묶어 버리므로 명시해야 합니다." }, why: "규칙 3에 따라 출력은 self에 묶입니다. self의 데이터를 돌려준다면 생략으로 충분합니다. 반대로 key를 돌려주려면 명시가 필요합니다." },
    { q: cc('fn make() -> &str {\n    let s = String::from("x");\n    &s\n}'), a: 2, why: "반환하려는 참조가 함수 안에서 사라지는 지역 값을 가리킵니다. 어떤 라이프타임 표기로도 해결되지 않으니 String을 반환해야 합니다." },
    { q: cc("fn split(s: &str, sep: char) -> (&str, &str)"), a: 0, why: "char는 참조가 아니라 값입니다. 입력 참조는 s 하나뿐이므로 규칙 2가 적용됩니다." },
    { q: cc("struct View { data: &[u8] }"), a: 1, why: "구조체 필드의 참조에는 생략 규칙이 없습니다. struct View<'a> { data: &'a [u8] }처럼 항상 명시합니다." },
    { q: cc("fn get(map: &HashMap<String, String>, key: &str)\n    -> Option<&String>"), a: 1, why: "입력 참조가 둘(map, key)이라 출력의 출처가 모호합니다. fn get<'a>(map: &'a HashMap<..>, key: &str) -> Option<&'a String>." }
  ], "life");

  /* 12-A: Send / Sync */
  classifier("sendList", "sendScore", ["Send + Sync", "Send만", "Sync만", "둘 다 아님"], [
    { q: cc("i32") + ", " + cc("String") + ", " + cc("Vec<u8>"), a: 0, why: "소유 데이터만 가진 평범한 타입은 자동으로 Send와 Sync를 구현합니다." },
    { q: cc("Rc<i32>"), a: 3, why: "참조 카운트를 원자적이지 않게 바꾸므로, 다른 스레드로 보내거나(Send) 공유하면(Sync) 카운트가 깨질 수 있습니다." },
    { q: cc("Arc<i32>"), a: 0, why: "원자적 카운트를 쓰므로 T가 Send + Sync이면 Arc<T>도 둘 다입니다." },
    { q: cc("Cell<u32>"), a: 1, why: "통째로 다른 스레드로 옮기는 것은 안전하지만(Send), &Cell을 여러 스레드가 가지면 set이 동시에 일어나 데이터 경쟁이 됩니다(!Sync)." },
    { q: cc("RefCell<Vec<u8>>"), a: 1, why: "Cell과 같은 이유입니다. 빌림 플래그가 원자적이지 않아 공유할 수 없습니다. 스레드 간에는 Mutex나 RwLock을 씁니다." },
    { q: cc("Mutex<Vec<u8>>"), a: 0, why: "락이 접근을 직렬화하므로 T: Send이기만 하면 Mutex<T>는 Send이자 Sync입니다. 그래서 Arc<Mutex<T>>가 표준 조합입니다." },
    { q: cc("Arc<RefCell<i32>>"), a: 3, why: "함정입니다. Arc<T>가 Send나 Sync가 되려면 T가 Send + Sync여야 하는데 RefCell은 Sync가 아닙니다. Arc로 감싸도 공유가 안전해지지는 않습니다." },
    { q: cc("MutexGuard<'_, i32>"), a: 2, why: "락은 잡은 스레드에서 풀어야 하는 OS가 많아서 가드는 다른 스레드로 보낼 수 없습니다(!Send). &가드로 읽기만 하는 공유는 T: Sync면 안전합니다." },
    { q: cc("*const u8"), a: 3, why: "원시 포인터는 아무것도 보장하지 않으므로 기본적으로 Send도 Sync도 아닙니다. 원시 포인터를 품은 타입은 unsafe impl Send로 근거를 대고 직접 선언해야 합니다." },
    { q: cc("&i32"), a: 0, why: "&T는 T: Sync일 때 Send입니다(정의). &T 자체를 공유하는 것도 T: Sync면 안전하므로 Sync입니다." }
  ], "send");

  /* ---------- generic stepper ---------- */
  function stepper(prefix, src, steps, render) {
    const srcEl = $("#" + prefix + "Src"); if (!srcEl) return;
    srcEl.innerHTML = src.map((l, i) => '<div data-l="' + (i + 1) + '"><span class="ln">' + (i + 1) + "</span>" + highlight(l) + "</div>").join("");
    let si = 0;
    const draw = () => {
      const st = steps[si];
      const lines = [].concat(st.line);
      $$("div", srcEl).forEach(d => d.classList.toggle("hl", lines.indexOf(+d.dataset.l) >= 0));
      render(st, si);
      $("#" + prefix + "Ex").textContent = st.ex;
      $("#" + prefix + "Step").textContent = "단계 " + (si + 1) + " / " + steps.length;
      $("#" + prefix + "Prev").disabled = si === 0;
      $("#" + prefix + "Next").disabled = si === steps.length - 1;
    };
    $("#" + prefix + "Next").addEventListener("click", () => { if (si < steps.length - 1) { si++; draw(); } });
    $("#" + prefix + "Prev").addEventListener("click", () => { if (si > 0) { si--; draw(); } });
    $("#" + prefix + "Reset").addEventListener("click", () => { si = 0; draw(); });
    draw();
  }

  /* 3-A: ownership */
  const ST_LABEL = { own: "소유", copy: "값(Copy)", moved: "이동됨 · 사용 불가", dropped: "해제됨" };
  stepper("own", [
    "fn main() {",
    "    let a = String::from(\"map\");",
    "    let b = a;",
    "    let c = b.clone();",
    "    takes(c);",
    "    let n = 42;",
    "    let m = n;",
    "    println!(\"{b} {n} {m}\");",
    "}",
    "fn takes(s: String) { println!(\"got {s}\"); }"
  ], [
    { line: 2, vars: [["a", "own", "#1 \"map\""]], heap: [["#1", "map", 1]], out: "", ex: "String::from이 힙에 버퍼 #1을 할당하고, 변수 a가 그 소유자가 됩니다. 스택의 a는 (포인터, 길이, 용량) 24바이트입니다." },
    { line: 3, vars: [["a", "moved", ""], ["b", "own", "#1 \"map\""]], heap: [["#1", "map", 1]], out: "", ex: "대입은 이동입니다. 헤더 24바이트만 복사되고 소유권은 b로 넘어갑니다. 이제 a를 쓰면 컴파일 오류(E0382)입니다. 힙은 그대로이고 할당·복사 비용은 0입니다." },
    { line: 4, vars: [["a", "moved", ""], ["b", "own", "#1 \"map\""], ["c", "own", "#2 \"map\""]], heap: [["#1", "map", 1], ["#2", "map", 1]], out: "", ex: "clone()은 명시적인 깊은 복사입니다. 새 힙 버퍼 #2가 생기고 c가 소유합니다. 비싼 복사는 항상 코드에 드러납니다." },
    { line: [5, 10], vars: [["a", "moved", ""], ["b", "own", "#1 \"map\""], ["c", "moved", ""], ["takes::s", "own", "#2 \"map\""]], heap: [["#1", "map", 1], ["#2", "map", 1]], out: "", ex: "값으로 넘기면 함수 매개변수로 소유권이 이동합니다. c는 더 이상 쓸 수 없고, 버퍼 #2의 주인은 takes 안의 s입니다." },
    { line: 10, vars: [["a", "moved", ""], ["b", "own", "#1 \"map\""], ["c", "moved", ""], ["takes::s", "dropped", ""]], heap: [["#1", "map", 1], ["#2", "map", 0]], out: "got map", ex: "takes가 끝나는 닫는 중괄호에서 s가 스코프를 벗어나 drop됩니다. 버퍼 #2가 해제됩니다. 호출자가 free를 신경 쓸 필요가 없습니다." },
    { line: 6, vars: [["a", "moved", ""], ["b", "own", "#1 \"map\""], ["c", "moved", ""], ["n", "copy", "42 (스택)"]], heap: [["#1", "map", 1], ["#2", "map", 0]], out: "got map", ex: "i32는 힙 자원이 없는 Copy 타입입니다. 스택에만 존재합니다." },
    { line: 7, vars: [["a", "moved", ""], ["b", "own", "#1 \"map\""], ["c", "moved", ""], ["n", "copy", "42 (스택)"], ["m", "copy", "42 (스택)"]], heap: [["#1", "map", 1], ["#2", "map", 0]], out: "got map", ex: "Copy 타입의 대입은 이동이 아니라 비트 복사입니다. n은 여전히 유효합니다." },
    { line: 8, vars: [["a", "moved", ""], ["b", "own", "#1 \"map\""], ["c", "moved", ""], ["n", "copy", "42 (스택)"], ["m", "copy", "42 (스택)"]], heap: [["#1", "map", 1], ["#2", "map", 0]], out: "got map\nmap 42 42", ex: "b, n, m 모두 유효하므로 출력됩니다. 여기서 a나 c를 쓰려 하면 컴파일러가 거부합니다." },
    { line: 9, vars: [["a", "moved", ""], ["b", "dropped", ""], ["c", "moved", ""], ["n", "dropped", ""], ["m", "dropped", ""]], heap: [["#1", "map", 0], ["#2", "map", 0]], out: "got map\nmap 42 42", ex: "main이 끝나면 살아 있는 변수가 선언의 역순(m, n, b)으로 drop됩니다. 버퍼 #1은 b의 drop에서 정확히 한 번 해제됩니다. 이동된 a와 c에는 drop이 호출되지 않으므로 이중 해제가 불가능합니다." }
  ], st => {
    $("#ownVars").innerHTML = st.vars.map(v => '<div class="vrow ' + v[1] + '"><b>' + esc(v[0]) + '</b><span class="vst">' + ST_LABEL[v[1]] + "</span><span class=\"vh\">" + esc(v[2]) + "</span></div>").join("") +
      '<div class="heapline">' + st.heap.map(h => '<span class="hb' + (h[2] ? "" : " freed") + '">' + h[0] + ' "' + esc(h[1]) + '"' + (h[2] ? "" : " · 해제") + "</span>").join("") + "</div>";
    $("#ownOut").textContent = st.out || "(출력 없음)";
  });

  /* 9-A: lazy iterator pipeline */
  const IT_STAGES = ["source 1..=6", "map x*x", "filter even", "take(2)", "collect"];
  stepper("it", [
    "let r: Vec<u32> = (1..=6)",
    "    .map(|x| x * x)",
    "    .filter(|x| x % 2 == 0)",
    "    .take(2)",
    "    .collect();"
  ], [
    { line: [1, 2, 3, 4], act: -1, vals: ["", "", "", "0/2", ""], out: [], ex: "1~4줄은 어댑터 구조체를 겹겹이 만들 뿐, 아직 아무 원소도 계산하지 않았습니다. Take<Filter<Map<RangeInclusive>>>라는 타입의 값 하나가 생겼을 뿐입니다." },
    { line: [5, 1], act: 0, vals: ["1", "", "", "0/2", "next()?"], out: [], ex: "collect가 take.next()를 부르면, take → filter → map → source 순으로 next()가 안쪽으로 전달됩니다. source가 첫 원소 1을 내놓습니다." },
    { line: 2, act: 1, vals: ["1", "1", "", "0/2", "next()?"], out: [], ex: "map이 클로저를 적용합니다: 1 → 1." },
    { line: 3, act: 2, vals: ["1", "1", "✗ 홀수", "0/2", "next()?"], out: [], ex: "filter가 1을 거부합니다. 버린 원소를 위로 올리지 않고, 곧바로 다시 map.next()를 불러 다음 원소를 당깁니다." },
    { line: [1, 2, 3], act: 2, vals: ["2", "4", "✓ 통과", "0/2", "next()?"], out: [], ex: "source가 2를 내고, map이 4로 바꾸고, filter가 통과시킵니다." },
    { line: [4, 5], act: 4, vals: ["2", "4", "✓ 통과", "1/2", "push 4"], out: [4], ex: "take가 개수를 세고 4를 위로 돌려주면, collect가 Vec에 push합니다. 원소 하나가 체인 전체를 끝까지 통과했습니다. 중간 배열은 한 번도 만들어지지 않았습니다." },
    { line: [1, 2, 3], act: 2, vals: ["3", "9", "✗ 홀수", "1/2", "next()?"], out: [4], ex: "collect가 다시 next()를 부릅니다. 3 → 9 → 거부." },
    { line: [1, 2, 3, 4, 5], act: 4, vals: ["4", "16", "✓ 통과", "2/2", "push 16"], out: [4, 16], ex: "4 → 16 → 통과 → take 2/2 → push. 이제 take는 할당량을 채웠습니다." },
    { line: [4, 5], act: 3, vals: ["(손대지 않음)", "", "", "2/2 → None", "끝"], out: [4, 16], ex: "collect가 한 번 더 next()를 부르면 take는 안쪽에 묻지도 않고 바로 None을 돌려줍니다. 그래서 5와 6은 아예 생성되지 않습니다. 무한 반복자 (1..)에도 take를 붙일 수 있는 이유입니다." }
  ], st => {
    $("#itPipe").innerHTML = IT_STAGES.map((s, i) => '<div class="stage' + (i === st.act ? " on" : "") + '"><small>' + esc(s) + "</small><b>" + esc(st.vals[i] || "·") + "</b></div>").join('<span class="arr">→</span>');
    $("#itOut").textContent = "r = [" + st.out.join(", ") + "]";
  });

  /* 11-A: Rc / Weak */
  stepper("rc", [
    "let a = Rc::new(Node::new(\"A\"));",
    "let b = Rc::clone(&a);",
    "let w = Rc::downgrade(&a);",
    "drop(a);",
    "if let Some(c) = w.upgrade() { use_it(&c); }",
    "drop(b);",
    "let gone = w.upgrade().is_none();",
    "drop(w);"
  ], [
    { line: 1, p: { a: "live" }, s: 1, w: 0, obj: true, alloc: true, ex: "Rc::new는 힙에 (strong 카운트, weak 카운트, Node) 블록 하나를 할당합니다. strong_count = 1." },
    { line: 2, p: { a: "live", b: "live" }, s: 2, w: 0, obj: true, alloc: true, ex: "Rc::clone은 Node를 복사하지 않고 strong 카운트만 1 올립니다(비원자적 증가, 그래서 Rc는 !Send)." },
    { line: 3, p: { a: "live", b: "live", w: "weak" }, s: 2, w: 1, obj: true, alloc: true, ex: "Weak는 소유하지 않는 관찰자입니다. strong은 그대로, weak_count만 1 올라갑니다." },
    { line: 4, p: { a: "gone", b: "live", w: "weak" }, s: 1, w: 1, obj: true, alloc: true, ex: "a를 drop하면 strong이 1로 줄어듭니다. 다른 소유자 b가 있으므로 Node는 살아 있습니다." },
    { line: 5, p: { a: "gone", b: "live", w: "weak", c: "live" }, s: 2, w: 1, obj: true, alloc: true, ex: "upgrade()는 Node가 살아 있으면 새 Rc를 만들어 Some으로 줍니다. c가 사는 동안 strong = 2라서, 쓰는 도중 Node가 사라질 수 없습니다." },
    { line: 6, p: { a: "gone", b: "gone", w: "weak" }, s: 0, w: 1, obj: false, alloc: true, ex: "if let 블록이 끝나 c가 사라졌고 b도 drop했습니다. strong이 0이 되는 순간 Node의 Drop이 실행됩니다. 하지만 Weak가 남아 있어 카운트가 든 힙 블록은 아직 해제되지 않습니다." },
    { line: 7, p: { a: "gone", b: "gone", w: "weak" }, s: 0, w: 1, obj: false, alloc: true, ex: "이제 upgrade()는 None을 돌려줍니다. 매달린 포인터를 역참조하는 대신, 대상이 사라졌다는 사실을 안전하게 알 수 있습니다." },
    { line: 8, p: { a: "gone", b: "gone", w: "gone" }, s: 0, w: 0, obj: false, alloc: false, ex: "마지막 Weak까지 사라지면 힙 블록 자체가 해제됩니다. 부모-자식 순환에서 한쪽을 Weak로 두면 이렇게 깔끔하게 정리됩니다." }
  ], st => {
    $("#rcGrid").innerHTML = ["a", "b", "c", "w"].map(n => {
      const s = st.p[n] || "gone", kind = n === "w" ? "Weak<Node>" : "Rc<Node>";
      return '<div class="ptr ' + (s === "live" ? "live" : s === "weak" ? "weak" : "gone") + '">' + n + "<small>" + kind + " · " + (s === "gone" ? "없음" : s === "weak" ? "관찰 중" : "소유 중") + "</small></div>";
    }).join("");
    const cb = $("#rcCb");
    cb.className = "cb" + (st.alloc ? "" : " dead");
    cb.innerHTML = "<div><b>" + st.s + "</b>strong_count</div><div><b>" + st.w + "</b>weak_count</div><div><b>" + (st.obj ? "●" : "×") + "</b>" + (st.obj ? "Node(\"A\") 생존" : st.alloc ? "Node drop됨 · 블록 유지" : "블록 해제됨") + "</div>";
  });

  /* 13-A: executor */
  stepper("ex", [
    "spawn(task_a);   // step1; yield; step2",
    "spawn(task_b);   // read socket",
    "while let Ok(task) = queue.recv() {",
    "    match task.poll(&mut cx) {",
    "        Poll::Pending => {}   // keep",
    "        Poll::Ready(()) => {} // drop",
    "    }",
    "}"
  ], [
    { line: [1, 2], q: ["A", "B"], t: { A: "생성됨 · 아직 한 줄도 실행 안 함", B: "생성됨 · 아직 한 줄도 실행 안 함" }, ex: "spawn은 future를 상자에 넣어 실행 큐에 넣을 뿐입니다. async 블록은 poll되기 전에는 아무것도 실행하지 않습니다." },
    { line: [3, 4], q: ["B", "A"], t: { A: "step1 실행 → yield_now가 자기 waker를 깨움", B: "대기열" }, act: "A", ex: "executor가 A를 꺼내 poll합니다. step1을 실행하고 yield_now().await에 도달합니다. yield_now는 waker.wake_by_ref()로 A를 큐 뒤에 다시 넣고 Pending을 돌려줍니다." },
    { line: 5, q: ["B", "A"], t: { A: "Pending · 큐에서 차례 대기", B: "대기열" }, ex: "Pending이므로 executor는 A의 future를 보관해 두고 다음 작업으로 넘어갑니다. 스레드를 막지 않습니다." },
    { line: [4, 5], q: ["A"], t: { A: "Pending · 큐에서 차례 대기", B: "Pending · 소켓에 waker 등록" }, act: "B", ex: "B를 poll합니다. 소켓에 아직 데이터가 없어 read future는 waker를 I/O 드라이버(epoll 등)에 맡기고 Pending을 돌려줍니다. 이제 B는 큐에 없습니다. 누군가 깨워 줄 때까지 다시 poll되지 않습니다(바쁜 대기 없음)." },
    { line: [4, 6], q: [], t: { A: "Ready · 완료", B: "Pending · 소켓에 waker 등록" }, act: "A", ex: "A를 다시 poll하면 상태 기계가 yield 지점 다음부터 이어서 step2를 실행하고 Ready를 돌려줍니다. A는 drop됩니다." },
    { line: 3, q: [], t: { A: "완료", B: "Pending · 소켓에 waker 등록" }, ex: "큐가 비었습니다. recv()에서 스레드가 잠듭니다. CPU를 전혀 쓰지 않습니다." },
    { line: 3, q: ["B"], t: { A: "완료", B: "깨어남 → 큐에 들어감" }, ex: "패킷이 도착하면 I/O 드라이버가 등록된 waker.wake()를 부르고, Wake 구현이 B를 큐에 넣습니다. recv()가 깨어납니다." },
    { line: [4, 6], q: [], t: { A: "완료", B: "Ready · 완료" }, act: "B", ex: "B를 poll하면 이번에는 read가 Ready가 되고, B 전체가 Ready로 끝납니다." },
    { line: 8, q: [], t: { A: "완료", B: "완료" }, ex: "모든 작업이 끝나 큐의 송신자(작업들이 들고 있던 Sender)가 모두 사라지면 recv()가 Err를 돌려주고 루프가 끝납니다. 스레드 하나로 두 작업을 번갈아 실행했습니다." }
  ], st => {
    $("#exQueue").innerHTML = st.q.length ? st.q.map(x => '<span class="qitem">' + x + "</span>").join("") : '<span class="tokc">(비어 있음)</span>';
    $("#exTasks").innerHTML = ["A", "B"].map(n => '<div class="vrow' + (st.act === n ? " own" : /완료/.test(st.t[n]) ? " dropped" : "") + '"><b>task_' + n.toLowerCase() + '</b><span class="vh">' + esc(st.t[n]) + "</span></div>").join("");
  });

  /* 7-A: UTF-8 inspector */
  (function () {
    const inp = $("#u8In"); if (!inp) return;
    const grid = $("#u8Grid"), cut = $("#u8Cut"), cutV = $("#u8CutV"), res = $("#u8Res");
    const enc = new TextEncoder();
    function render() {
      const s = inp.value;
      const chars = Array.from(s);
      let off = 0;
      const cells = [], bounds = new Set([0]);
      const spans = [];
      chars.forEach(ch => {
        const b = enc.encode(ch);
        spans.push({ ch, start: off, end: off + b.length });
        cells.push('<div class="u8cell"><b>' + esc(ch === " " ? "␠" : ch) + '</b><span class="kv">' + Array.from(b).map(x => x.toString(16).toUpperCase().padStart(2, "0")).join(" ") + '</span><small>[' + off + ".." + (off + b.length) + ")</small></div>");
        off += b.length; bounds.add(off);
      });
      grid.innerHTML = cells.join("") || '<span class="tokc">(빈 문자열)</span>';
      cut.max = off;
      if (+cut.value > off) cut.value = off;
      const n = +cut.value;
      cutV.textContent = "n = " + n;
      const head = "s.len() = " + off + " 바이트, s.chars().count() = " + chars.length + "개 문자. ";
      if (bounds.has(n)) {
        const prefix = chars.slice(0, spans.filter(x => x.end <= n).length).join("");
        res.className = "status g";
        res.textContent = head + "&s[.." + n + "] = " + JSON.stringify(prefix) + " — 문자 경계이므로 OK.";
      } else {
        const sp = spans.find(x => x.start < n && n < x.end);
        res.className = "status r";
        res.textContent = head + "&s[.." + n + "] → panic: byte index " + n + " is not a char boundary; it is inside '" + sp.ch + "' (bytes " + sp.start + ".." + sp.end + ")";
      }
    }
    inp.addEventListener("input", render);
    cut.addEventListener("input", render);
    render();
  })();

  /* 14-A: struct layout calculator */
  (function () {
    const box = $("#b-layout"); if (!box) return;
    const TYPES = [["u8", 1, 1], ["bool", 1, 1], ["u16", 2, 2], ["u32", 4, 4], ["f32", 4, 4], ["u64", 8, 8], ["f64", 8, 8], ["[f32; 3]", 12, 4], ["&T", 8, 8]];
    const T = {}; TYPES.forEach(t => T[t[0]] = { size: t[1], align: t[2] });
    const PRESETS = {
      "IMU 패킷(14장 예제)": [["flags", "u8"], ["accel", "[f32; 3]"], ["seq", "u16"], ["ts_us", "u64"]],
      "나쁜 순서": [["a", "u8"], ["b", "u64"], ["c", "u8"], ["d", "u32"], ["e", "u8"]],
      "좋은 순서": [["b", "u64"], ["d", "u32"], ["a", "u8"], ["c", "u8"], ["e", "u8"]]
    };
    const COLORS = ["--accent", "--signal", "--ok", "--bad", "--muted", "--accent", "--signal", "--ok"];
    let fields = store.get("layout", null) || PRESETS["IMU 패킷(14장 예제)"].slice();
    let repr = "c";
    $("#lyAdd").innerHTML = TYPES.map(t => '<button type="button" data-t="' + esc(t[0]) + '">+ ' + esc(t[0]) + "</button>").join("");
    $("#lyPre").innerHTML = Object.keys(PRESETS).map(k => '<button type="button" data-p="' + esc(k) + '">' + esc(k) + "</button>").join("");
    function layout(list) {
      let off = 0, maxA = 1;
      const placed = list.map(f => {
        const t = T[f[1]];
        const pad = (t.align - off % t.align) % t.align;
        off += pad;
        const p = { name: f[0], type: f[1], off, size: t.size, align: t.align, pad };
        off += t.size; maxA = Math.max(maxA, t.align);
        return p;
      });
      const tail = (maxA - off % maxA) % maxA;
      return { placed, size: off + tail, align: maxA, tail };
    }
    function render() {
      store.set("layout", fields);
      $$("#lyRepr button", box).forEach(b => b.setAttribute("aria-pressed", b.dataset.r === repr));
      const order = repr === "c" ? fields : fields.map((f, i) => [f, i]).sort((x, y) => T[y[0][1]].align - T[x[0][1]].align || x[1] - y[1]).map(x => x[0]);
      const L = layout(order);
      const colorOf = name => "var(" + COLORS[fields.findIndex(f => f[0] === name) % COLORS.length] + ")";
      $("#lyCode").innerHTML = highlight((repr === "c" ? "#[repr(C)]\n" : "// repr(Rust): the compiler may reorder fields\n") + "struct S {\n" +
        fields.map(f => "    " + f[0] + ": " + f[1] + ",").join("\n") + "\n}") ;
      const bytes = [];
      L.placed.forEach(p => {
        for (let i = 0; i < p.pad; i++) bytes.push('<i class="pad" title="padding"></i>');
        for (let i = 0; i < p.size; i++) bytes.push('<i style="background:' + colorOf(p.name) + '" title="' + esc(p.name) + '">' + (i === 0 ? esc(p.name[0]) : "") + "</i>");
      });
      for (let i = 0; i < L.tail; i++) bytes.push('<i class="pad" title="tail padding"></i>');
      $("#lyBytes").innerHTML = bytes.join("") || '<span class="tokc">필드를 추가하세요</span>';
      $("#lyLegend").innerHTML = fields.map((f, i) => '<span><i style="background:' + colorOf(f[0]) + '"></i>' + esc(f[0]) + ": " + esc(f[1]) + ' <button type="button" class="lyx" data-x="' + i + '" aria-label="' + esc(f[0]) + ' 삭제">×</button></span>').join("") + '<span><i class="pad"></i>패딩</span>';
      const data = L.placed.reduce((s, p) => s + p.size, 0);
      const padding = L.size - data;
      const res = $("#lyRes");
      if (!fields.length) { res.className = "status y"; res.textContent = "필드가 없으면 크기 0인 구조체(ZST)입니다."; return; }
      res.className = "status " + (padding === 0 ? "g" : padding * 4 > L.size ? "r" : "y");
      res.textContent = "size_of = " + L.size + " 바이트, align_of = " + L.align + ", 데이터 " + data + " + 패딩 " + padding + " 바이트 (효율 " + Math.round(data / L.size * 100) + "%). 오프셋: " +
        L.placed.map(p => p.name + "@" + p.off).join(", ") + (repr === "rust" ? ". 재배치는 정렬이 큰 필드부터 놓는 단순 모델이며, 실제 rustc 배치는 보장되지 않습니다(14장 예제의 실제 출력과 비교해 보세요)." : ".");
    }
    box.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.t && fields.length < 10) {
        const used = new Set(fields.map(f => f[0]));
        const name = "abcdefghij".split("").find(c => !used.has(c));
        fields.push([name, b.dataset.t]);
      } else if (b.dataset.p) fields = PRESETS[b.dataset.p].map(f => f.slice());
      else if (b.dataset.r) repr = b.dataset.r;
      else if (b.dataset.x !== undefined) fields.splice(+b.dataset.x, 1);
      else if (b.id === "lyClear") fields = [];
      else return;
      render();
    });
    render();
  })();

  /* 15-A: typestate simulator */
  (function () {
    const box = $("#b-ts"); if (!box) return;
    const METHODS = ["into_output()", "into_input()", "set_high()", "is_high()"];
    const RULES = {
      Unconfigured: { "into_output()": "Output", "into_input()": "Input" },
      Output: { "set_high()": "Output", "into_input()": "Input" },
      Input: { "is_high()": "Input" }
    };
    let state = "Unconfigured", log = [];
    $("#tsBtns").innerHTML = METHODS.map(m => '<button type="button" class="btn" data-m="' + m + '">p.' + m + "</button>").join("");
    function render() {
      $("#tsState").innerHTML = "<span>p의 타입</span><b>Pin&lt;" + state + "&gt;</b><span>호출 가능한 메서드: " + Object.keys(RULES[state]).map(m => "<code>" + m + "</code>").join(" ") + "</span>";
      $("#tsCode").innerHTML = highlight("let p = Pin::take(5);   // Pin<Unconfigured>\n") + log.map(l => l.ok ? highlight(l.code) : '<span class="tserr">' + esc(l.code) + "</span>").join("\n");
      const last = log[log.length - 1];
      const r = $("#tsRes");
      if (!last) { r.className = "status y"; r.textContent = "버튼을 눌러 메서드를 호출해 보세요."; return; }
      r.className = "status " + (last.ok ? "g" : "r");
      r.textContent = last.msg;
    }
    box.addEventListener("click", e => {
      const b = e.target.closest("button[data-m]");
      if (b) {
        const m = b.dataset.m, next = RULES[state][m];
        if (next) {
          const consumes = m.startsWith("into_");
          log.push({ ok: true, code: consumes ? "let p = p." + m + ";   // Pin<" + next + ">" : "p." + m + ";", msg: consumes ? "컴파일됨. " + m + "는 self를 소비하고 Pin<" + next + ">를 돌려줍니다. 이전 Pin<" + state + "> 값은 이동되어 더는 쓸 수 없습니다." : "컴파일됨. Pin<" + state + ">에는 " + m + "가 있습니다. &self/&mut self로 빌려 쓰므로 p는 그대로입니다." });
          state = next;
        } else {
          log.push({ ok: false, code: "p." + m + ";   // error[E0599]", msg: "error[E0599]: no method named `" + m.replace("()", "") + "` found for struct `Pin<" + state + ">`. 이 상태의 impl 블록에는 그 메서드가 없습니다. 잘못된 하드웨어 조작이 실행 전에 막혔습니다." });
        }
        if (log.length > 12) log.shift();
        render();
      }
    });
    $("#tsReset").addEventListener("click", () => { state = "Unconfigured"; log = []; render(); });
    render();
  })();

  /* ---------- quizzes ---------- */
  const Q = {
    ch1: [
      { q: "safe Rust가 컴파일 타임에 막아 주는 것은?", o: ["모든 논리 오류", "해제한 메모리 사용과 데이터 경쟁", "교착 상태", "메모리 누수"], a: 1, w: "소유권·빌림 규칙과 Send/Sync가 메모리 오류와 데이터 경쟁을 막습니다. 교착·누수·논리 오류는 막지 않습니다." },
      { q: "println!이 C의 printf와 다른 핵심 차이는?", o: ["더 빠르다", "매크로라서 포맷 문자열과 인자를 컴파일 타임에 검사한다", "stderr로 출력한다", "UTF-8을 지원하지 않는다"], a: 1, w: "!는 매크로 호출입니다. 인자 개수와 타입(Display/Debug 구현 여부)이 맞지 않으면 컴파일 오류가 납니다." }
    ],
    ch2: [
      { q: "let x: u8 = 250; let y = x + 10; 을 debug 빌드로 실행하면?", o: ["y = 4", "y = 260", "panic: attempt to add with overflow", "정의되지 않은 동작"], a: 2, w: "debug 빌드는 오버플로를 검사해 panic합니다. release 빌드는 기본적으로 감싸서 4가 됩니다. 어느 쪽도 UB는 아닙니다." },
      { q: "Rust에서 if가 식(expression)이라는 것의 의미는?", o: ["if 안에 식만 쓸 수 있다", "let v = if c { 1 } else { 2 }; 처럼 값을 낼 수 있다", "조건에 정수를 쓸 수 있다", "else가 필수다"], a: 1, w: "블록의 마지막 식(세미콜론 없음)이 블록의 값이 됩니다. 그래서 삼항 연산자가 따로 없습니다." }
    ],
    ch3: [
      { q: "let s2 = s1; (s1: String) 이후 s1을 쓰면?", o: ["s1과 s2가 같은 버퍼를 공유한다", "컴파일 오류 E0382: 이동된 값의 사용", "s1은 빈 문자열이 된다", "런타임 panic"], a: 1, w: "String은 Copy가 아니므로 대입은 이동입니다. 컴파일러가 s1을 무효화하고, 이중 해제가 원천적으로 불가능해집니다." },
      { q: "같은 스코프에서 a, b, c 순으로 선언된 변수의 drop 순서는?", o: ["a, b, c", "c, b, a", "정해지지 않음", "Drop을 구현한 것만 drop됨"], a: 1, w: "선언의 역순입니다. 단, 구조체 필드는 선언 순서대로 drop된다는 점을 함께 기억하세요." }
    ],
    ch4: [
      { q: "빌림 규칙을 가장 잘 요약한 것은?", o: ["참조는 하나만 만들 수 있다", "여러 공유 참조 또는 하나의 가변 참조, 그리고 참조는 원래 값보다 오래 살 수 없다", "가변 참조는 함수에 넘길 수 없다", "참조는 항상 스코프 끝까지 유효하다"], a: 1, w: "공유 XOR 변경 + 수명 제약. 빌림은 스코프 끝이 아니라 마지막 사용까지만 유효합니다(NLL)." },
      { q: "버퍼를 읽기만 하는 함수의 매개변수로 가장 좋은 것은?", o: ["Vec<u8>", "&Vec<u8>", "&[u8]", "&mut [u8]"], a: 2, w: "&[u8]는 배열·벡터·부분 범위를 모두 받을 수 있고 비용은 같습니다. 소유권도 가져가지 않습니다." }
    ],
    ch5: [
      { q: "열거형에 새 변형을 추가했을 때 Rust가 해 주는 일은?", o: ["아무것도 없다", "그 변형을 처리하지 않은 모든 match를 컴파일 오류로 알려 준다(와일드카드가 없다면)", "자동으로 기본 처리 코드를 생성한다", "런타임 경고를 낸다"], a: 1, w: "match는 완전해야 컴파일됩니다. 그래서 _ 와일드카드를 남발하지 않는 것이 좋습니다." },
      { q: "size_of::<Option<&u64>>()가 8인 이유는?", o: ["Option은 크기가 없다", "참조는 절대 널이 아니므로 0 비트 패턴을 None으로 쓸 수 있다(niche)", "컴파일러가 Option을 제거한다", "u64가 8바이트라서"], a: 1, w: "niche 최적화 덕분에 Option<&T>는 C의 nullable 포인터와 비용이 같으면서 확인을 강제합니다." }
    ],
    ch6: [
      { q: "let v = parse(s)?; 에서 parse가 Err(e)를 반환하면?", o: ["panic한다", "v가 기본값이 된다", "현재 함수가 Err(From::from(e))를 반환한다", "e가 무시된다"], a: 2, w: "?는 Err면 즉시 반환하면서 From으로 오류 타입을 변환합니다. 그래서 하위 오류에 From을 구현하면 자동 변환됩니다." },
      { q: "panic!이 적합한 상황은?", o: ["사용자가 잘못된 설정 파일을 줬다", "네트워크 연결이 끊겼다", "내부 불변식이 깨졌다(프로그래머 버그)", "파일이 없다"], a: 2, w: "예상 가능한 실패는 Result로 호출자에게 돌려주고, panic은 계약 위반·버그에 씁니다." }
    ],
    ch7: [
      { q: "let s = \"로봇\"; 에서 s.len()은?", o: ["2", "4", "6", "8"], a: 2, w: "len()은 바이트 수입니다. 한글 음절은 UTF-8에서 3바이트씩이라 6입니다. 문자 수는 s.chars().count() = 2." },
      { q: "로그 토픽별 출현 횟수를 셀 때 \"있으면 +1, 없으면 1로 삽입\"을 한 번의 조회로 하는 방법은?", o: ["contains_key 후 insert", "*map.entry(k).or_insert(0) += 1", "map[k] += 1", "map.get_mut(k).unwrap()"], a: 1, w: "entry API는 해시 조회를 한 번만 하고, 빌림 문제 없이 삽입과 갱신을 함께 처리합니다." }
    ],
    ch8: [
      { q: "제네릭 fn f<T: Trait>(x: T)와 fn f(x: &dyn Trait)의 차이로 옳은 것은?", o: ["둘 다 vtable을 쓴다", "제네릭은 타입마다 단형화되어 직접 호출, dyn은 vtable을 통한 간접 호출", "dyn이 항상 더 빠르다", "제네릭은 런타임에 타입을 검사한다"], a: 1, w: "제네릭은 코드 크기를, dyn은 간접 호출과 인라인 불가를 대가로 냅니다. 기본은 제네릭, 이질적 컬렉션에는 dyn." },
      { q: "외부 크레이트의 Vec<u8>에 표준 Display를 구현할 수 없는 이유는?", o: ["Vec이 제네릭이라서", "고아 규칙: 트레잇이나 타입 중 하나는 내 크레이트 것이어야 한다", "Display는 derive만 가능해서", "Vec은 이미 Display를 구현해서"], a: 1, w: "newtype(struct Hex(Vec<u8>))으로 감싸면 내 타입이 되어 구현할 수 있습니다." }
    ],
    ch9: [
      { q: "(1..).map(|x| x * 2).take(3).collect::<Vec<_>>() 의 동작은?", o: ["무한 루프", "[2, 4, 6] — 반복자는 게으르게 필요한 만큼만 당긴다", "컴파일 오류", "메모리 부족"], a: 1, w: "어댑터는 아무것도 미리 계산하지 않고, collect가 next()를 부를 때 원소 하나씩 체인을 통과합니다. take가 끝나면 더 당기지 않습니다." },
      { q: "클로저가 캡처한 String을 본문에서 소비(이동)한다면 구현하는 트레잇은?", o: ["Fn", "FnMut", "FnOnce만", "Copy"], a: 2, w: "소유한 값을 소비하면 두 번 부를 수 없으므로 FnOnce만 구현합니다." }
    ],
    ch10: [
      { q: "fn longest<'a>(a: &'a str, b: &'a str) -> &'a str 의 'a가 하는 일은?", o: ["a와 b의 수명을 늘린다", "결과가 두 입력이 모두 유효한 구간 안에서만 유효하다는 관계를 선언한다", "결과를 'static으로 만든다", "런타임에 수명을 검사한다"], a: 1, w: "라이프타임은 관계를 적는 순수한 컴파일 타임 정보입니다. 수명을 바꾸지 않고 기계어에도 흔적이 없습니다." },
      { q: "T: 'static 경계를 만족하는 것은?", o: ["&'a String (일반 지역 참조)", "String", "지역 변수를 빌린 구조체", "만족하는 소유 타입은 없다"], a: 1, w: "T: 'static은 'static이 아닌 참조를 품지 않는다는 뜻입니다. 소유 타입은 모두 만족합니다. 영원히 산다는 뜻이 아닙니다." }
    ],
    ch11: [
      { q: "Rc<RefCell<T>>에서 borrow()로 얻은 Ref가 살아 있는 동안 borrow_mut()를 부르면?", o: ["컴파일 오류", "런타임 panic(BorrowMutError)", "조용히 덮어쓴다", "교착 상태"], a: 1, w: "RefCell은 빌림 규칙을 런타임에 검사합니다. 실패를 다루려면 try_borrow_mut를 씁니다." },
      { q: "부모 ↔ 자식이 서로를 Rc로 가리키면 생기는 문제와 해법은?", o: ["컴파일 오류 / 없음", "순환으로 카운트가 0이 되지 않아 누수 / 한쪽을 Weak로", "이중 해제 / Box로", "데이터 경쟁 / Arc로"], a: 1, w: "누수는 safe Rust에서도 가능합니다. 보통 자식 → 부모 방향을 Weak로 둡니다." }
    ],
    ch12: [
      { q: "thread::spawn에 Rc를 캡처한 클로저를 넘기면?", o: ["정상 동작", "컴파일 오류: Rc는 Send가 아니다", "런타임 panic", "카운트가 원자적으로 바뀐다"], a: 1, w: "spawn은 F: Send + 'static을 요구합니다. 스레드 간 공유에는 Arc를 씁니다." },
      { q: "지역 Vec을 여러 스레드가 나눠 읽고 각자 결과 칸에 쓰는 가장 간단한 방법은?", o: ["Arc<Mutex<Vec>>로 감싼다", "static mut 배열", "thread::scope로 빌려주고, iter_mut로 겹치지 않는 &mut를 나눠 준다", "Rc<RefCell>"], a: 2, w: "scoped thread는 블록 끝에서 join을 보장하므로 지역 데이터를 그냥 빌려줄 수 있습니다. 락이 필요 없습니다." }
    ],
    ch13: [
      { q: "async fn read_imu() -> f32 를 호출만 하고 .await하지 않으면?", o: ["즉시 실행된다", "아무것도 실행되지 않는다 — future는 poll될 때만 진행한다", "별도 스레드에서 실행된다", "컴파일 오류"], a: 1, w: "async fn은 상태 기계 값을 만들 뿐입니다. executor가 poll하거나 .await해야 진행합니다(컴파일러는 unused future 경고를 냅니다)." },
      { q: "future가 Poll::Pending을 돌려주기 전에 반드시 해야 하는 일은?", o: ["스레드를 sleep한다", "기다리는 일이 생기면 깨울 수 있도록 cx.waker()를 어딘가에 맡긴다", "panic한다", "결과를 반환한다"], a: 1, w: "waker를 맡기지 않으면 아무도 다시 poll하지 않아 작업이 영원히 멈춥니다. 이것이 바쁜 대기 없이 동작하는 비결입니다." }
    ],
    ch14: [
      { q: "unsafe 블록이 하는 일로 옳은 것은?", o: ["빌림 검사기를 끈다", "원시 포인터 역참조 등 다섯 가지 추가 능력을 허용하고, 안전성 증명 책임을 프로그래머에게 넘긴다", "타입 검사를 끈다", "자동으로 UB를 막아 준다"], a: 1, w: "빌림·타입 검사는 그대로입니다. 약속을 어기면 UB이고, 그 영향은 safe 코드까지 번집니다." },
      { q: "C 구조체와 메모리를 공유하려면 Rust 구조체에 붙여야 하는 것은?", o: ["#[derive(Copy)]", "#[repr(C)]", "#[inline]", "#[repr(transparent)]만 있으면 된다"], a: 1, w: "기본 repr(Rust)는 필드 재배치가 가능해 레이아웃이 보장되지 않습니다. repr(C)는 선언 순서와 C 정렬 규칙을 보장합니다." }
    ],
    ch15: [
      { q: "타입 상태 패턴에서 into_output(self) -> Pin<Output>이 self를 값으로 받는 이유는?", o: ["성능 때문에", "이전 상태의 값을 이동시켜 더는 쓸 수 없게 하려고", "Copy를 구현하려고", "라이프타임을 피하려고"], a: 1, w: "소비형 전이 덕분에 '입력 모드 핀'을 가진 채 출력처럼 쓰는 코드가 컴파일되지 않습니다." },
      { q: "struct Meters(f64); 같은 newtype의 런타임 비용은?", o: ["포인터 하나", "vtable 하나", "없음 — f64와 같은 메모리 표현", "힙 할당 1회"], a: 2, w: "newtype은 타입 검사에서만 다른 타입이고, 기계어 수준에서는 f64 그대로입니다." }
    ],
    ch16: [
      { q: "#[cfg(test)] mod tests 안의 단위 테스트가 볼 수 있는 것은?", o: ["공개 API만", "같은 모듈의 비공개 항목까지", "다른 크레이트의 비공개 항목", "아무것도 못 본다"], a: 1, w: "단위 테스트는 자식 모듈이라 use super::*로 비공개 항목도 테스트할 수 있습니다. 공개 API만 보는 것은 tests/의 통합 테스트입니다." },
      { q: "성능 개선의 첫 단계로 가장 적절한 것은?", o: ["모든 함수에 #[inline]", "unsafe로 경계 검사 제거", "release 빌드로 재현 가능한 벤치마크를 만들고 프로파일러로 뜨거운 곳을 찾는다", "모든 Vec을 배열로 바꾼다"], a: 2, w: "측정 없이 최적화하면 대부분 엉뚱한 곳을 고칩니다. debug 빌드로 재는 것도 흔한 실수입니다." }
    ],
    ch17: [
      { q: "minibus에서 Bus::publish가 send 대신 try_send를 쓰는 이유는?", o: ["더 빠른 API라서", "느린 노드의 큐가 가득 차도 파서·수신 루프가 막히지 않게 하려고(best-effort, 버린 수 계수)", "try_send만 Arc를 받을 수 있어서", "채널을 닫으려고"], a: 1, w: "센서 스트림에서는 오래된 메시지를 기다리느라 새 메시지를 놓치는 것이 더 위험합니다. 그래서 큐가 차면 버리고 dropped로 집계합니다." },
      { q: "프로그램 끝에서 drop(bus) 후 노드 스레드들이 스스로 끝나는 원리는?", o: ["스레드를 강제로 죽인다", "bus가 가진 모든 Sender가 drop되어 수신 루프(for msg in rx)가 끝난다", "타임아웃", "전역 플래그"], a: 1, w: "채널은 모든 송신자가 사라지면 수신 반복이 끝납니다. 소유권과 Drop만으로 종료 프로토콜이 완성됩니다." }
    ]
  };
  /* end Q */
  let qs = store.get("quiz", {});
  $$(".quiz").forEach(box => {
    const ch = box.dataset.quiz, items = Q[ch] || [];
    items.forEach((it, qi) => {
      const key = ch + "_" + qi, div = document.createElement("div");
      div.className = "qq";
      div.innerHTML = "<p>" + (qi + 1) + ". " + esc(it.q) + "</p>" + it.o.map((o, oi) => '<button type="button" class="opt" data-oi="' + oi + '">' + esc(o) + "</button>").join("") + '<div class="fb" hidden></div>';
      box.appendChild(div);
      const show = pick => {
        $$(".opt", div).forEach((b, oi) => { b.classList.toggle("right", oi === it.a); b.classList.toggle("wrong", oi === pick && pick !== it.a); });
        const fb = $(".fb", div); fb.hidden = false; fb.className = "fb " + (pick === it.a ? "good" : "bad");
        fb.textContent = (pick === it.a ? "정답. " : "오답. ") + it.w;
      };
      div.addEventListener("click", e => { const b = e.target.closest(".opt"); if (!b) return; const pick = +b.dataset.oi; qs[key] = pick; store.set("quiz", qs); show(pick); });
      if (qs[key] !== undefined) show(qs[key]);
    });
  });
})();
