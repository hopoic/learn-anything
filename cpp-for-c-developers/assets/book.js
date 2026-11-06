(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const PFX = "cpb:";
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

  /* ---------- C/C++ syntax highlight ---------- */
  const KW = "alignas|alignof|auto|bool|break|case|catch|char|char8_t|class|concept|const|consteval|constexpr|constinit|const_cast|continue|co_await|co_return|co_yield|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|false|final|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|noexcept|nullptr|operator|override|private|protected|public|register|reinterpret_cast|requires|restrict|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|true|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|while|NULL";
  const TOK = new RegExp(
    "(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)" +                // 1 comment
    "|(^[ \\t]*#[^\\n]*)" +                                   // 2 preprocessor line
    "|(\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])+')" + // 3 string / char
    "|\\b(" + KW + ")\\b" +                                    // 4 keyword
    "|\\b(std)(?=::)" +                                        // 5 std
    "|\\b(\\d[\\d'.]*(?:[xX][\\da-fA-F']+)?[uUlLfF]*)\\b", "gm"); // 6 number
  function highlight(src) {
    let out = "", last = 0, m;
    TOK.lastIndex = 0;
    while ((m = TOK.exec(src))) {
      if (m[0] === "") { TOK.lastIndex++; continue; }
      out += esc(src.slice(last, m.index));
      const cls = m[1] ? "tk-c" : m[2] ? "tk-p" : m[3] ? "tk-s" : m[4] ? "tk-k" : m[5] ? "tk-t" : "tk-n";
      out += '<span class="' + cls + '">' + esc(m[0]) + "</span>";
      last = TOK.lastIndex;
    }
    return out + esc(src.slice(last));
  }
  $$("pre code").forEach(el => { const l = el.dataset.lang; if (l === "cpp" || l === "c") el.innerHTML = highlight(el.textContent); });

  /* ---------- copy ---------- */
  const codeOf = box => box._ed ? box._ed.value : (box._cur !== undefined ? box._cur : box.querySelector("code").textContent);
  $$(".cp").forEach(btn => btn.addEventListener("click", () => {
    const box = btn.closest(".code"), text = codeOf(box);
    const ok = () => { btn.textContent = "복사됨"; setTimeout(() => btn.textContent = "복사", 1400); };
    const fallback = () => { const c = box.querySelector("code"); if (!c) return; const r = document.createRange(); r.selectNodeContents(c); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = "선택됨 · Ctrl+C"; };
    try { navigator.clipboard.writeText(text).then(ok, fallback); } catch (e) { fallback(); }
  }));

  /* ---------- tabs ---------- */
  $$("[data-tabs]").forEach(t => {
    const tabs = $$("[role=tab]", t), panels = $$(".panel", t);
    tabs.forEach((b, i) => b.addEventListener("click", () => {
      tabs.forEach((x, j) => x.setAttribute("aria-selected", i === j));
      panels.forEach((p, j) => p.hidden = i !== j);
    }));
  });

  /* ---------- engine settings ---------- */
  const engineSel = $("#engineSel"), stdSel = $("#stdSel"), optSel = $("#optSel"), engineStatus = $("#engineStatus");
  engineSel.value = store.get("engine", "auto");
  stdSel.value = store.get("std", "c++20");
  optSel.value = store.get("opt", "2");
  engineSel.addEventListener("change", () => { store.set("engine", engineSel.value); renderEngineStatus(); });
  stdSel.addEventListener("change", () => store.set("std", stdSel.value));
  optSel.addEventListener("change", () => store.set("opt", optSel.value));
  let lastEngine = "";
  function renderEngineStatus() {
    const st = window.CppRunner ? CppRunner.state : { localStatus: "idle" };
    const dl = st.localProgress == null ? Math.round((st.localBytes || 0) / 1048576) + " MB" : Math.round(st.localProgress * 100) + "%";
    const local = { idle: "아직 받지 않음", loading: "불러오는 중…", downloading: "내려받는 중 " + dl, ready: "준비됨", error: "불러오기 실패" }[st.localStatus];
    engineStatus.innerHTML = (lastEngine ? "마지막 실행: " + esc(lastEngine) + "<br>" : "") + "내장 컴파일러: " + local +
      (st.localStatus === "idle" ? ' · <a href="#" id="preload">미리 받기(~23MB)</a>' : "");
    const p = $("#preload", engineStatus);
    if (p) p.addEventListener("click", e => { e.preventDefault(); CppRunner.preloadLocal(); });
  }
  if (window.CppRunner) CppRunner.onStatus(renderEngineStatus); else renderEngineStatus();

  /* ---------- runnable code blocks ---------- */
  const stdRank = s => ({ "c++17": 17, "c++20": 20, "c++23": 23 }[s] || 20);
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
    ta.rows = Math.min(40, Math.max(6, ta.value.split("\n").length + 1));
    ta.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); runBlock(box); return; }
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const s = ta.selectionStart, en = ta.selectionEnd;
        ta.setRangeText("    ", s, en, "end");
      }
    });
    pre.hidden = true; pre.after(ta); box._ed = ta; box.classList.add("editing");
    box.querySelector(".eb").textContent = "편집 끝";
    if (!box.querySelector(".resetb")) {
      const r = document.createElement("button"); r.type = "button"; r.className = "resetb"; r.textContent = "원래대로";
      r.addEventListener("click", () => { if (box._ed) box._ed.value = box._orig; setCode(box, box._orig); });
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
    const hasStdin = box.dataset.stdin !== undefined;
    o.innerHTML = '<div class="rhead"><span class="chip"><i class="dot"></i><span class="st">대기</span></span><span class="acts"><button type="button" class="stopb" hidden>■ 중지</button><button type="button" class="clrb">출력 지우기</button></span></div>' +
      '<div class="prog" hidden><i></i></div>' +
      '<details class="stdin"' + (hasStdin ? " open" : "") + '><summary>stdin (표준 입력)</summary><textarea spellcheck="false" aria-label="표준 입력"></textarea></details>' +
      '<pre class="o-note"></pre><pre class="o-comp"></pre><pre class="o-out"></pre><pre class="o-err"></pre>';
    $("textarea", o).value = box.dataset.stdin || "";
    $(".clrb", o).addEventListener("click", () => { ["o-note", "o-comp", "o-out", "o-err"].forEach(c => $("." + c, o).textContent = ""); setSt(o, "", "대기"); });
    $(".stopb", o).addEventListener("click", () => { if (box._ctl) box._ctl.abort(); });
    box.append(o); box._out = o;
    return o;
  }
  function setSt(o, dot, text) { $(".dot", o).className = "dot " + dot; $(".st", o).textContent = text; }
  async function runBlock(box) {
    if (box._busy) return;
    if (!window.CppRunner) return;
    const o = ensureOut(box);
    const rb = box.querySelector(".rb");
    box._busy = true; rb.disabled = true;
    const ctl = new AbortController(); box._ctl = ctl;
    $(".stopb", o).hidden = false;
    ["o-note", "o-comp", "o-out", "o-err"].forEach(c => $("." + c, o).textContent = "");
    const prog = $(".prog", o), bar = $(".prog i", o);
    const notes = [];
    const blockStd = box.dataset.std, globalStd = stdSel.value;
    const std = blockStd && stdRank(blockStd) > stdRank(globalStd) ? blockStd : globalStd;
    setSt(o, "busy", "준비 중…");
    const res = await CppRunner.run({ code: codeOf(box), stdin: $(".stdin textarea", o).value, std, opt: optSel.value, engine: engineSel.value }, ctl.signal, {
      phase(p) {
        if (p.startsWith("remote:")) setSt(o, "busy", "컴파일·실행 중 · " + CppRunner.ENGINE_LABEL[p.slice(7)] + " …");
        else if (p === "compile") setSt(o, "busy", "컴파일 중 · 브라우저 내장 Clang …");
        else if (p === "run") { setSt(o, "busy", "실행 중 …"); prog.hidden = true; }
      },
      progress(f, bytes) {
        prog.hidden = false;
        const label = f == null ? Math.round(bytes / 1048576) + " MB" : Math.round(f * 100) + "%";
        bar.style.width = (f == null ? Math.min(95, bytes / 1048576) : f * 100) + "%";
        setSt(o, "busy", "내장 컴파일러 준비 중 " + label + " (최초 1회)");
      },
      stream(kind, text) { $(kind === "stdout" ? ".o-out" : ".o-err", o).textContent = text; },
      note(t) { notes.push(t); $(".o-note", o).textContent = notes.join("\n"); }
    });
    prog.hidden = true;
    $(".stopb", o).hidden = true;
    box._busy = false; rb.disabled = false; box._ctl = null;
    $(".o-note", o).textContent = res.fallbackNote ? res.fallbackNote.split("\n").map(s => "· " + s).join("\n") + "\n→ " + res.label + "(으)로 실행했습니다." : "";
    $(".o-comp", o).textContent = (res.compile || "").trim();
    $(".o-out", o).textContent = res.stdout;
    let err = res.stderr || "";
    if (res.signal) err += (err ? "\n" : "") + "[" + res.signal + "]";
    if (res.error) err += (err ? "\n" : "") + res.error + "\n네트워크 연결을 확인하거나, 실행 엔진을 '브라우저 내장'으로 바꿔 보세요.";
    $(".o-err", o).textContent = err;
    if (!res.engine) { setSt(o, "bad", res.signal || "실행하지 못함"); return; }
    lastEngine = res.label; renderEngineStatus();
    const meta = " · " + (res.ms / 1000).toFixed(1) + "s · " + res.label;
    if (!res.compiled) setSt(o, "bad", "컴파일 오류" + meta);
    else if (res.signal) setSt(o, "bad", "중단됨" + meta);
    else setSt(o, res.exitCode === 0 ? "ok" : "bad", "exit " + res.exitCode + meta);
  }
  $$(".code.run").forEach(box => {
    box._orig = box.querySelector("code").textContent; box._cur = box._orig;
    box.querySelector(".rb").addEventListener("click", () => runBlock(box));
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
  const cc = s => "<code>" + esc(s) + "</code>";

  /* 1-A: C vs C++ compatibility */
  classifier("compatList", "compatScore", ["C·C++ 둘 다 OK", "C에서만 OK", "C++에서만 OK", "둘 다 되지만 결과가 다름"], [
    { q: cc("int *p = malloc(sizeof *p);"), a: 1, why: "C++은 void*에서 다른 포인터로의 암묵 변환을 허용하지 않습니다. C++에서는 static_cast가 필요하고, 애초에 new나 컨테이너를 씁니다." },
    { q: cc("struct Point { int x, y; };  Point p;"), a: 2, why: "C++에서 struct 이름은 그 자체로 타입 이름입니다. C에서는 struct Point p; 또는 typedef가 필요합니다." },
    { q: cc("int class = 3, new = 4;"), a: 1, why: "class, new, delete, template, this 등은 C++ 키워드입니다. C 헤더를 C++에서 include할 때 자주 터지는 문제입니다." },
    { q: cc("printf(\"%zu\\n\", sizeof('a'));"), a: 3, why: "문자 리터럴의 타입이 C에서는 int(보통 4), C++에서는 char(1)입니다. 오버로딩이 char와 int를 구분해야 하기 때문입니다." },
    { q: cc("char tag[3] = \"abc\";"), a: 1, why: "C는 널 종료 문자를 버리고 3바이트를 채우도록 허용하지만, C++은 배열이 너무 작다며 거부합니다." },
    { q: cc("const int N = 8;  int table[N];   /* file scope */"), a: 2, why: "C++에서 상수 식으로 초기화된 const int는 상수 표현식입니다. C에서는 파일 범위에서 가변 크기 배열이 되어 오류입니다(C는 #define이나 enum을 씀)." },
    { q: cc("enum Color { RED, GREEN };  enum Color c = 1;"), a: 1, why: "C++은 정수에서 열거형으로의 암묵 변환을 막습니다. 더 나아가 C++11의 enum class는 반대 방향 변환도 막습니다(11장)." },
    { q: cc("for (int i = 0; i < 3; i++) { /* ... */ }"), a: 0, why: "C99부터 C에서도 for 초기식에 선언이 가능합니다. 공통 부분이 생각보다 큽니다." }
  ], "compat");

  /* 5-A: copy, move or elide? */
  classifier("moveList", "moveScore", ["복사", "이동", "생략(복사·이동 없음)"], [
    { q: cc("std::string t = s;   // s is a named std::string"), a: 0, why: "이름이 있는 변수는 lvalue입니다. 이후에도 s를 쓸 수 있어야 하므로 복사됩니다." },
    { q: cc("std::string t = std::move(s);"), a: 1, why: "std::move는 아무것도 옮기지 않고 s를 rvalue로 캐스팅할 뿐입니다. 그 결과 이동 생성자가 선택됩니다. 이후 s는 '유효하지만 지정되지 않은' 상태입니다." },
    { q: cc("std::string t = make_name();   // returns std::string by value"), a: 2, why: "C++17부터 prvalue로 초기화하면 복사·이동이 생략되도록 보장됩니다. 객체가 처음부터 t 자리에 만들어집니다." },
    { q: cc("v.push_back(s);"), a: 0, why: "push_back(const T&) 오버로드가 선택되어 벡터 안에 복사본이 만들어집니다." },
    { q: cc("v.push_back(std::move(s));"), a: 1, why: "push_back(T&&) 오버로드가 선택되어 s의 버퍼를 넘겨받습니다." },
    { q: cc("v.emplace_back(32, 'x');"), a: 2, why: "emplace_back은 인자를 받아 벡터 메모리 안에서 바로 생성합니다. 임시 객체가 없습니다." },
    { q: cc("const std::string c = \"cfg\";  std::string t = std::move(c);"), a: 0, why: "함정입니다. const 객체를 move하면 const std::string&&가 되는데, 이동 생성자는 비 const rvalue만 받으므로 복사 생성자가 선택됩니다. 오류도 경고도 없이 조용히 복사됩니다." },
    { q: cc("std::string f() { std::string r = \"x\"; return r; }"), a: 2, mid: { 1: "NRVO가 적용되지 않는 경우에는 이동이 맞습니다." }, why: "이름 있는 지역 객체를 반환하면 대부분의 컴파일러가 NRVO로 생략합니다. 생략이 안 되는 경우에도 복사가 아니라 이동이 쓰이도록 언어가 보장합니다. 그러니 return std::move(r);는 쓰지 마세요. 오히려 생략을 막습니다." }
  ], "move");

  /* 9-A: pick a container */
  classifier("contList", "contScore", ["vector", "array", "deque", "map", "unordered_map", "set"], [
    { q: "센서 채널 8개의 최신값. 개수는 하드웨어로 고정, 힙 할당은 피하고 싶다.", a: 1, why: "크기가 컴파일 타임에 정해져 있으면 std::array<T, 8>. C 배열과 같은 메모리 배치지만 크기를 잃지 않고, 복사·비교·범위 for가 됩니다." },
    { q: "로그 레코드를 계속 뒤에 추가하고, 나중에 처음부터 순서대로 처리한다.", a: 0, why: "기본 선택은 언제나 vector입니다. 연속 메모리라 캐시 효율이 가장 좋고, 뒤에 추가는 분할 상환 O(1)입니다." },
    { q: "세션 ID(문자열)로 세션 객체를 빠르게 찾는다. 순서는 상관없다.", a: 4, why: "평균 O(1) 조회가 필요하고 순서가 필요 없으면 unordered_map입니다." },
    { q: "단어 빈도를 세어 알파벳 순으로 출력한다.", a: 3, mid: { 4: "세는 것은 되지만 출력 전에 따로 정렬해야 합니다." }, why: "키 순서가 유지되는 map(레드-블랙 트리)이면 순회가 곧 정렬된 출력입니다." },
    { q: "중복 없는 태그 집합을 늘 정렬된 상태로 유지한다.", a: 5, why: "값 자체가 키인 정렬 집합은 set입니다." },
    { q: "작업 큐: 앞에서 꺼내고 뒤에 넣는다. 가끔 급한 작업은 앞에 넣는다.", a: 2, why: "양 끝 삽입·삭제가 O(1)인 deque가 맞습니다. vector의 앞 삽입은 O(n)입니다." },
    { q: "정수 10만 개를 한 번 읽어 정렬한 뒤, 이후에는 조회만 반복한다.", a: 0, mid: { 5: "동작은 하지만 노드 기반이라 메모리를 3~4배 쓰고 캐시 효율이 나쁩니다." }, why: "한 번 정렬한 vector에 std::binary_search/lower_bound를 쓰면 같은 O(log n)이면서 훨씬 빠르고 작습니다." }
  ], "cont");

  /* 10-A: error handling policy */
  classifier("errList", "errScore", ["예외", "std::optional", "std::expected / 에러 코드", "assert (버그)"], [
    { q: "설정 파일에서 선택 항목 \"timeout\"을 찾는다. 없으면 기본값을 쓴다.", a: 1, why: "값이 '없을 수 있음'은 오류가 아니라 정상적인 결과입니다. 이유를 전달할 필요가 없으면 optional이 가장 가볍습니다." },
    { q: "생성자에서 필요한 장치 파일을 열지 못했다. 이 객체는 장치 없이 존재할 수 없다.", a: 0, mid: { 2: "팩토리 함수로 바꾸면 expected도 가능합니다." }, why: "생성자는 반환값이 없으므로 실패를 알리는 표준 방법은 예외입니다. 반쯤 만들어진 '좀비 객체'를 남기지 않는다는 것이 핵심입니다." },
    { q: "사용자가 입력한 명령을 파싱한다. 실패가 흔하고, 호출자는 실패 이유를 보여줘야 한다.", a: 2, why: "실패가 예상 가능한 흐름의 일부이고 이유가 필요하면 expected<T, E>가 잘 맞습니다. 12장 프로젝트가 이 방식입니다." },
    { q: "내부 함수에서 인덱스가 범위를 벗어났다. 호출자가 계약을 어긴 프로그래머 버그다.", a: 3, why: "복구할 상황이 아니라 고쳐야 할 버그입니다. assert(또는 C++26 contracts)로 즉시 드러내는 편이 낫습니다." },
    { q: "-fno-exceptions로 빌드하는 펌웨어의 실시간 제어 루프에서 센서 읽기가 실패할 수 있다.", a: 2, why: "예외를 쓸 수 없는 환경이면 expected나 에러 코드가 표준적인 선택입니다. 브라우저 내장 엔진도 같은 제약을 가집니다." }
  ], "err");

  /* ---------- generic stepper ---------- */
  function stepper(prefix, src, steps, render) {
    const srcEl = $("#" + prefix + "Src"); if (!srcEl) return;
    srcEl.innerHTML = src.map((l, i) => '<div data-l="' + (i + 1) + '"><span class="ln">' + (i + 1) + "</span>" + highlight(l) + "</div>").join("");
    let si = 0;
    const draw = () => {
      const st = steps[si];
      $$("div", srcEl).forEach(d => d.classList.toggle("hl", +d.dataset.l === st.line));
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

  /* 4-A: object lifetime */
  const lifeStepsOut = ["+global", "+x", "+y", "+f.a", "-f.a", "-y", "+z", "-z", "-x", "-global"];
  stepper("life", [
    "struct Tracer {",
    "    std::string name;",
    "    Tracer(std::string n) : name(n) { std::cout << \"+\" << name << \"\\n\"; }",
    "    ~Tracer() { std::cout << \"-\" << name << \"\\n\"; }",
    "};",
    "Tracer g(\"global\");",
    "void f() { Tracer a(\"f.a\"); }",
    "int main() {",
    "    Tracer x(\"x\");",
    "    {",
    "        Tracer y(\"y\");",
    "        f();",
    "    }",
    "    Tracer z(\"z\");",
    "}"
  ], [
    { line: 6, live: ["global"], out: "+global", ex: "전역 객체는 main보다 먼저 생성됩니다. C에는 없는 단계입니다. 정적 저장 기간 객체의 생성자가 런타임 초기화 코드로 실행됩니다." },
    { line: 9, live: ["global", "x"], out: "+x", ex: "x가 선언되는 순간 생성자가 호출됩니다. C의 지역 변수처럼 스택에 자리를 잡지만, 그 자리에 '초기화 코드'가 붙습니다." },
    { line: 11, live: ["global", "x", "y"], out: "+y", ex: "중괄호 블록도 스코프입니다. y는 이 블록 안에서만 삽니다." },
    { line: 7, live: ["global", "x", "y", "f.a"], out: "+f.a", ex: "f()가 호출되면 f의 지역 객체 a가 생성됩니다." },
    { line: 7, live: ["global", "x", "y"], out: "-f.a", ex: "f가 반환하는 지점에서 a의 소멸자가 자동으로 불립니다. return이 여러 개여도, 예외로 빠져나가도 똑같습니다. 이것이 RAII의 토대입니다." },
    { line: 13, live: ["global", "x"], out: "-y", ex: "블록의 닫는 중괄호에서 y가 소멸합니다. goto cleanup 같은 정리 코드가 필요 없습니다." },
    { line: 14, live: ["global", "x", "z"], out: "+z", ex: "z가 생성됩니다. 이제 살아 있는 지역 객체는 x, z입니다." },
    { line: 15, live: ["global", "x"], out: "-z", ex: "main이 끝나면 지역 객체가 생성의 역순으로 소멸합니다. z가 먼저입니다." },
    { line: 15, live: ["global"], out: "-x", ex: "그다음 x. 스택처럼 '나중에 만든 것이 먼저 정리'됩니다(LIFO). 뒤에 만든 객체가 앞의 객체에 의존할 수 있기 때문입니다." },
    { line: 15, live: [], out: "-global", ex: "main 반환 후 전역 객체가 소멸합니다(exit 처리 과정). 최종 출력은 아래 실행 예제로 직접 확인해 보세요." }
  ], (st, si) => {
    $("#lifeObjs").innerHTML = st.live.map((n, i) => '<div class="obj' + (n === "global" ? " g" : "") + (i === st.live.length - 1 && st.out[0] === "+" ? " new" : "") + '">Tracer ' + esc(n) + "</div>").join("") || '<div class="tokc">(없음)</div>';
    // console output = all outputs up to this step
    $("#lifeOut").textContent = lifeStepsOut.slice(0, si + 1).join("\n");
  });

  /* 6-A: shared_ptr / weak_ptr */
  stepper("sp", [
    "auto a = std::make_shared<Node>(\"A\");",
    "auto b = a;",
    "std::weak_ptr<Node> w = a;",
    "a.reset();",
    "if (auto c = w.lock()) { use(*c); }",
    "b = nullptr;",
    "bool gone = w.expired();",
    "w.reset();"
  ], [
    { line: 1, p: { a: "live" }, use: 1, weak: 0, obj: true, cb: true, ex: "make_shared는 객체와 제어 블록(참조 카운트)을 한 번의 할당으로 만듭니다. use_count = 1." },
    { line: 2, p: { a: "live", b: "live" }, use: 2, weak: 0, obj: true, cb: true, ex: "shared_ptr를 복사하면 같은 객체를 공유하고 use_count가 원자적으로 증가합니다. 포인터를 복사한다고 객체가 복사되지는 않습니다." },
    { line: 3, p: { a: "live", b: "live", w: "weak" }, use: 2, weak: 1, obj: true, cb: true, ex: "weak_ptr는 객체 수명에 관여하지 않는 관찰자입니다. use_count는 그대로, weak_count만 증가합니다." },
    { line: 4, p: { a: "gone", b: "live", w: "weak" }, use: 1, weak: 1, obj: true, cb: true, ex: "a.reset()은 a의 소유를 내려놓습니다. 다른 소유자 b가 있으므로 객체는 살아 있습니다." },
    { line: 5, p: { a: "gone", b: "live", w: "weak", c: "live" }, use: 2, weak: 1, obj: true, cb: true, ex: "lock()은 객체가 살아 있으면 임시 shared_ptr를 만들어 줍니다. c가 사는 동안 use_count = 2라서, 사용 중에 객체가 사라질 수 없습니다." },
    { line: 6, p: { a: "gone", b: "gone", w: "weak" }, use: 0, weak: 1, obj: false, cb: true, ex: "블록이 끝나 c가 사라졌고, b도 놓았습니다. use_count가 0이 되는 순간 Node의 소멸자가 실행됩니다. 하지만 weak_ptr가 남아 있어 제어 블록은 아직 남습니다." },
    { line: 7, p: { a: "gone", b: "gone", w: "weak" }, use: 0, weak: 1, obj: false, cb: true, ex: "w.expired()는 true. 매달린 포인터(dangling pointer)를 역참조하는 대신, 객체가 사라졌다는 사실을 안전하게 확인할 수 있습니다." },
    { line: 8, p: { a: "gone", b: "gone", w: "gone" }, use: 0, weak: 0, obj: false, cb: false, ex: "마지막 weak_ptr까지 사라지면 제어 블록이 해제됩니다. (make_shared로 한 번에 할당했다면 메모리도 이때 반환됩니다.)" }
  ], st => {
    const names = ["a", "b", "c", "w"];
    $("#spGrid").innerHTML = names.map(n => {
      const s = st.p[n] || "gone";
      const kind = n === "w" ? "weak_ptr" : "shared_ptr";
      return '<div class="ptr ' + (s === "live" ? "live" : s === "weak" ? "weak" : "gone") + '">' + n + "<small>" + kind + " · " + (s === "gone" ? "비어 있음" : s === "weak" ? "관찰 중" : "소유 중") + "</small></div>";
    }).join("");
    const cb = $("#spCb");
    cb.className = "cb" + (st.cb ? "" : " dead");
    cb.innerHTML = "<div><b>" + st.use + "</b>use_count</div><div><b>" + st.weak + "</b>weak_count</div><div><b>" + (st.obj ? "●" : "×") + "</b>" + (st.obj ? "Node(\"A\") 생존" : "Node 소멸") + "</div>";
  });

  /* 7-A: virtual dispatch */
  (function () {
    const box = $("#dispBench"); if (!box) return;
    const sel = { dyn: "Dog", via: "ptr", fn: "speak" };
    const segs = $$(".seg[data-k]", box);
    function render() {
      segs.forEach(s => $$("button", s).forEach(b => b.setAttribute("aria-pressed", b.dataset.v === sel[s.dataset.k])));
      const make = sel.dyn === "Dog" ? "Dog obj;" : "Animal obj;";
      const bind = { val: "Animal x = obj;      // copy into an Animal", ptr: "Animal* x = &obj;", ref: "Animal& x = obj;" }[sel.via];
      const call = (sel.via === "ptr" ? "x->" : "x.") + sel.fn + "();";
      $("#dispCode").innerHTML = highlight(make + "\n" + bind + "\n" + call);
      const sliced = sel.via === "val" && sel.dyn === "Dog";
      const dynamicType = sel.via === "val" ? "Animal" : sel.dyn;
      let who, why;
      if (sel.fn === "speak") {
        who = dynamicType + "::speak()";
        why = sliced ? "값으로 복사하는 순간 Dog 부분이 잘려 나가고(slicing) 순수한 Animal 객체만 남습니다. 그래서 가상 함수여도 Animal 버전이 불립니다."
          : sel.dyn === "Dog" ? "speak는 virtual입니다. 포인터/참조를 통한 호출은 객체의 vptr이 가리키는 vtable을 따라가므로, 정적 타입이 Animal이어도 실제 타입 Dog의 함수가 불립니다."
          : "실제 객체가 Animal이므로 Animal::speak()입니다.";
      } else {
        who = "Animal::name()";
        why = "name은 virtual이 아닙니다. 비가상 함수는 컴파일 타임에 정적 타입(Animal)으로 결정됩니다. Dog::name()이 있어도 가려질 뿐 재정의되지 않습니다." + (sliced ? " 게다가 이 경우는 slicing까지 일어났습니다." : "");
      }
      $("#dispRes").innerHTML = "호출되는 함수: <b>" + esc(who) + "</b>";
      $("#dispEx").textContent = why;
      $("#vtA").querySelectorAll("div[data-f]").forEach(d => d.classList.toggle("on", sel.fn === "speak" && dynamicType === "Animal" && d.dataset.f === "speak"));
      $("#vtD").querySelectorAll("div[data-f]").forEach(d => d.classList.toggle("on", sel.fn === "speak" && dynamicType === "Dog" && d.dataset.f === "speak"));
    }
    box.addEventListener("click", e => { const b = e.target.closest(".seg[data-k] button"); if (!b) return; sel[b.closest(".seg").dataset.k] = b.dataset.v; render(); });
    render();
  })();

  /* ---------- quizzes ---------- */
  const Q = {
    ch1: [
      { q: "C++ 소스에서 C 라이브러리 함수를 쓰려고 C 헤더를 include했더니 링크 오류(undefined reference)가 났다. 가장 흔한 원인은?", o: ["C++ 컴파일러가 C 함수를 지원하지 않아서", "C++ 이름 맹글링 때문에 심벌 이름이 달라져서 — extern \"C\"가 필요", "헤더 파일 확장자가 .h라서", "링커 순서가 반대라서"], a: 1, w: "C++은 오버로딩을 위해 함수 이름에 타입 정보를 섞어 심벌을 만듭니다. C로 컴파일된 라이브러리 심벌과 맞추려면 extern \"C\" 블록으로 선언을 감싸야 합니다." },
      { q: "C++의 '제로 오버헤드 원칙'에 가장 가까운 설명은?", o: ["C++ 프로그램은 C보다 항상 빠르다", "쓰지 않는 기능에는 비용을 내지 않고, 쓰는 기능은 손으로 짠 코드보다 낫게 만들 수 없다", "모든 추상화는 런타임 비용이 0이다", "C++은 가비지 컬렉터가 없어서 빠르다"], a: 1, w: "Stroustrup의 정의입니다. 예를 들어 가상 함수를 쓰지 않는 클래스에는 vtable 포인터가 생기지 않습니다." }
    ],
    ch2: [
      { q: "void bump(int& n) { n++; } 를 bump(5)로 호출하면?", o: ["5가 6이 된다", "컴파일 오류: 비const lvalue 참조는 임시값에 바인딩할 수 없다", "런타임 오류", "경고만 나고 아무 일도 없다"], a: 1, w: "int&는 수정 가능한 '이름 있는 객체'에만 붙습니다. 읽기만 한다면 const int&를 쓰면 임시값도 받을 수 있습니다." },
      { q: "C의 #define BUF_SIZE 256 을 C++에서 바꾸는 가장 좋은 방법은?", o: ["#define을 그대로 둔다", "constexpr std::size_t BUF_SIZE = 256;", "int BUF_SIZE = 256; (전역 변수)", "enum { BUF_SIZE = 256 }; 만 가능"], a: 1, w: "constexpr 상수는 타입이 있고, 스코프를 따르며, 디버거에 보이고, 컴파일 타임 상수로 쓸 수 있습니다." }
    ],
    ch3: [
      { q: "멤버 함수 뒤에 붙는 const (int size() const;)의 의미는?", o: ["반환값이 const다", "이 함수는 객체 상태를 바꾸지 않는다 — this가 const T*가 된다", "함수가 인라인된다", "함수를 오버라이드할 수 없다"], a: 1, w: "const 객체나 const 참조로는 const 멤버 함수만 호출할 수 있습니다. 읽기 전용 함수에는 습관처럼 붙이세요." },
      { q: "생성자에서 멤버를 초기화하는 올바른 방법은?", o: ["생성자 본문에서 대입한다", "멤버 초기화 리스트를 쓴다 (const·참조 멤버는 이 방법만 가능)", "memset으로 0을 채운다", "init() 함수를 따로 호출한다"], a: 1, w: "본문에서의 대입은 '기본 생성 후 대입'이고, 초기화 리스트는 '처음부터 그 값으로 생성'입니다. 멤버는 선언 순서대로 초기화된다는 점도 기억하세요." }
    ],
    ch4: [
      { q: "함수 중간에 return이 5개 있고, 열어 둔 파일과 잠근 뮤텍스가 있다. C++다운 정리 방법은?", o: ["각 return 앞에 fclose/unlock을 넣는다", "goto cleanup 패턴", "파일과 락을 소멸자에서 정리하는 객체(RAII)로 감싼다", "atexit()에 등록한다"], a: 2, w: "스코프를 벗어나는 모든 경로(return, break, 예외)에서 소멸자가 실행됩니다. 정리 코드를 한 곳에만 쓰면 됩니다." },
      { q: "같은 스코프에서 A, B, C 순서로 생성된 지역 객체의 소멸 순서는?", o: ["A, B, C", "C, B, A", "정의되지 않음", "컴파일러마다 다름"], a: 1, w: "생성의 역순(LIFO)이 보장됩니다. 뒤에 만든 객체가 앞의 객체를 참조할 수 있기 때문입니다." }
    ],
    ch5: [
      { q: "클래스가 FILE*을 직접 소유하고 소멸자에서 fclose한다. 복사 생성자를 정의하지 않으면?", o: ["컴파일러가 파일을 복제해 준다", "포인터만 복사되어 두 객체가 같은 FILE*을 fclose — 이중 해제", "복사가 자동으로 금지된다", "아무 문제 없다"], a: 1, w: "그래서 Rule of 3/5가 있습니다. 소유 자원이 있으면 복사를 금지(= delete)하거나 올바르게 정의하고, 이동을 정의하세요. 더 좋은 길은 Rule of 0입니다." },
      { q: "std::move(x)가 실제로 하는 일은?", o: ["x의 메모리를 다른 곳으로 옮긴다", "x를 rvalue 참조로 캐스팅할 뿐이다", "x를 0으로 초기화한다", "x를 해제한다"], a: 1, w: "옮기는 일은 그 결과를 받은 이동 생성자/대입 연산자가 합니다. std::move 자체는 static_cast<T&&>입니다." }
    ],
    ch6: [
      { q: "팩토리 함수가 새로 만든 객체의 소유권을 호출자에게 넘길 때 가장 적합한 반환 타입은?", o: ["T*", "std::unique_ptr<T>", "std::shared_ptr<T>", "T&"], a: 1, w: "단독 소유권 이전은 unique_ptr의 일입니다. 필요하면 호출자가 shared_ptr로 바꿀 수 있지만, 반대는 불가능합니다." },
      { q: "부모와 자식이 서로를 shared_ptr로 가리키면?", o: ["정상적으로 해제된다", "순환 참조로 use_count가 0이 되지 않아 메모리 누수", "컴파일 오류", "런타임 예외"], a: 1, w: "한쪽(보통 자식 → 부모)을 weak_ptr로 바꿔 순환을 끊습니다." }
    ],
    ch7: [
      { q: "Base* p = new Derived; delete p; 가 안전하려면?", o: ["Derived에 소멸자를 정의한다", "Base의 소멸자가 virtual이어야 한다", "delete 대신 free를 쓴다", "아무 조건 없이 안전하다"], a: 1, w: "가상 소멸자가 없으면 Base의 소멸자만 불려 Derived 부분이 정리되지 않습니다(정의되지 않은 동작). 다형적으로 쓸 기반 클래스는 virtual ~Base() = default;" },
      { q: "override 키워드를 붙이는 가장 큰 이유는?", o: ["실행 속도가 빨라진다", "시그니처가 어긋나 재정의가 아닌 새 함수가 되면 컴파일러가 오류로 알려준다", "가상 함수를 비가상으로 만든다", "필수 문법이다"], a: 1, w: "const 하나 빠뜨려도 조용히 다른 함수가 됩니다. override는 그 실수를 컴파일 오류로 바꿉니다." }
    ],
    ch8: [
      { q: "템플릿 함수 정의를 .cpp에 두고 .h에는 선언만 두면?", o: ["정상 동작", "다른 번역 단위에서 쓰면 링크 오류 — 템플릿 정의는 보통 헤더에 둔다", "컴파일 속도만 느려진다", "inline이 금지된다"], a: 1, w: "템플릿은 쓰이는 곳에서 구체 타입으로 인스턴스화되므로 그 시점에 정의가 보여야 합니다." },
      { q: "C++20 컨셉트(concept)의 주된 이점은?", o: ["런타임 다형성 제공", "템플릿 인자에 대한 요구사항을 명시해 오류 메시지를 짧고 정확하게 만든다", "템플릿을 더 빠르게 실행", "가상 함수를 대체"], a: 1, w: "requires std::integral<T> 같은 제약은 문서이자 검사입니다. 수백 줄짜리 템플릿 오류가 한 줄로 줄어듭니다." }
    ],
    ch9: [
      { q: "for (auto it = v.begin(); it != v.end(); ++it) if (*it < 0) v.erase(it); 의 문제는?", o: ["문제없다", "erase 후 it가 무효화되어 정의되지 않은 동작", "erase가 O(1)이라서 느리다", "auto를 쓸 수 없다"], a: 1, w: "erase는 다음 원소를 가리키는 반복자를 반환합니다. C++20부터는 std::erase_if(v, pred)가 가장 간단합니다." },
      { q: "람다 [&]의 위험은?", o: ["복사 비용이 크다", "람다가 지역 변수보다 오래 살면(저장, 스레드 등) 매달린 참조가 된다", "const 변수를 캡처할 수 없다", "람다가 인라인되지 않는다"], a: 1, w: "즉시 쓰고 버리는 람다에는 [&]가 편하지만, 보관하거나 다른 스레드에 넘기는 람다는 필요한 것만 값으로 캡처하세요." }
    ],
    ch10: [
      { q: "예외가 던져져 함수 밖으로 전파될 때, 그 사이 스코프의 지역 객체는?", o: ["그대로 누수된다", "스택 되감기(stack unwinding) 중에 소멸자가 실행된다", "catch 블록에서 수동으로 정리해야 한다", "프로그램이 종료된다"], a: 1, w: "그래서 RAII와 예외는 한 쌍입니다. 정리 코드를 소멸자에 두면 예외 경로에서도 자원이 새지 않습니다." },
      { q: "std::expected<int, std::string> r = parse(s); 에서 실패 이유를 꺼내는 방법은?", o: ["*r", "r.value()", "r.error()", "r.reason()"], a: 2, w: "성공이면 *r 또는 r.value(), 실패면 r.error()입니다. if (r) 로 먼저 확인합니다." }
    ],
    ch11: [
      { q: "std::string_view를 반환하는 함수에서 위험한 것은?", o: ["문자열 리터럴의 view 반환", "지역 std::string의 view 반환", "매개변수로 받은 string_view의 일부 반환", "전역 상수 문자열의 view 반환"], a: 1, w: "string_view는 소유하지 않는 '창문'입니다. 함수가 끝나면 지역 string이 사라져 view가 매달립니다." },
      { q: "C의 enum 대신 enum class를 쓰면 얻는 것은?", o: ["더 작은 메모리", "이름이 바깥 스코프로 새지 않고, int로의 암묵 변환이 막힌다", "런타임 검사", "자동 문자열 변환"], a: 1, w: "Color::Red처럼 이름이 한정되고, 실수로 정수와 섞이지 않습니다. 기저 타입(: uint8_t)도 지정할 수 있습니다." }
    ],
    ch12: [
      { q: "미니 KV 저장소에서 명령 처리기를 std::map<std::string, std::unique_ptr<Command>>로 둔 이유는?", o: ["map이 vector보다 빠르기 때문", "명령 이름으로 찾고, 다형적 객체를 소유하며 자동 해제되게 하려고", "shared_ptr를 쓸 수 없어서", "가상 함수를 피하려고"], a: 1, w: "이름 → 처리기 조회, 다형성(virtual run), 소유(unique_ptr)가 한 줄에 담깁니다. C라면 함수 포인터 테이블과 수동 free가 필요한 부분입니다." },
      { q: "이 프로젝트가 예외 대신 std::expected로 오류를 전달하는 장점은?", o: ["코드가 더 짧아서", "실패가 흔한 파싱 경로를 값으로 다루고, -fno-exceptions 환경(브라우저 내장 엔진 포함)에서도 동작해서", "expected가 예외보다 항상 빨라서", "C++17에서도 쓸 수 있어서"], a: 1, w: "사용자 입력 오류는 '예외적'이지 않습니다. 결과 타입에 실패가 드러나 호출자가 무시하기 어렵습니다." }
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
