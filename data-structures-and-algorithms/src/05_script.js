(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("dsa:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("dsa:" + k, JSON.stringify(v)); } catch (e) {} }
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = n => Math.round(n).toLocaleString("en-US");

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

  /* ---------- TOC ---------- */
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
  const TOTAL = 12;
  let done = store.get("done", {});
  function renderDone() {
    $$(".done-btn").forEach(b => { const on = !!done[b.dataset.done]; b.setAttribute("aria-pressed", on); b.textContent = on ? "완료함 ✓" : "이 장을 마쳤어요"; });
    $$(".toc .chk").forEach(c => c.textContent = done[c.dataset.c] ? "✓" : "");
    $("#meter").textContent = Object.values(done).filter(Boolean).length + " / " + TOTAL + " 완료";
  }
  $$(".done-btn").forEach(b => b.addEventListener("click", () => { done[b.dataset.done] = !done[b.dataset.done]; store.set("done", done); renderDone(); }));
  renderDone();

  /* ---------- syntax highlight (C, C++, Rust, Python) ---------- */
  const LANGS = {
    cpp: { kw: "alignas|auto|bool|break|case|catch|char|class|const|constexpr|continue|default|delete|do|double|else|enum|explicit|false|float|for|if|inline|int|long|namespace|new|noexcept|nullptr|operator|private|public|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|throw|true|try|typename|unsigned|using|void|volatile|while", slash: true, pre: true },
    c: { kw: "auto|bool|break|case|char|const|continue|default|do|double|else|enum|extern|false|float|for|if|inline|int|long|return|short|signed|sizeof|static|struct|switch|true|typedef|union|unsigned|void|volatile|while|NULL|_Atomic", slash: true, pre: true },
    rs: { kw: "as|break|const|continue|crate|else|enum|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while|Some|None|Ok|Err", slash: true },
    py: { kw: "and|as|assert|break|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield", hash: true }
  };
  function langRe(L) {
    const com = L.slash ? "//[^\\n]*|/\\*[\\s\\S]*?\\*/" : "#[^\\n]*";
    const str = L.hash
      ? '"""[\\s\\S]*?"""|"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\''
      : '"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])\'';
    const pre = L.pre ? "^[ \\t]*#[ \\t]*\\w+" : "(?!)";
    return new RegExp("(" + com + ")|(" + str + ")|(" + pre + ")|\\b(" + L.kw + ")\\b", "gm");
  }
  $$("pre code[data-lang]").forEach(el => {
    const L = LANGS[el.dataset.lang]; if (!L) return;
    const re = langRe(L), src = el.textContent;
    let out = "", last = 0, m;
    while ((m = re.exec(src))) {
      if (m[0] === "") { re.lastIndex++; continue; }
      out += esc(src.slice(last, m.index));
      const cls = m[1] ? "tk-c" : m[2] ? "tk-s" : m[3] ? "tk-p" : "tk-k";
      out += '<span class="' + cls + '">' + esc(m[0]) + "</span>";
      last = re.lastIndex;
    }
    el.innerHTML = out + esc(src.slice(last));
  });
  $$(".cp").forEach(btn => btn.addEventListener("click", () => {
    const code = btn.closest(".code").querySelector("code");
    const ok = () => { btn.textContent = "복사됨"; setTimeout(() => btn.textContent = "복사", 1400); };
    const fallback = () => { const r = document.createRange(); r.selectNodeContents(code); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = "선택됨 · 길게 눌러 복사"; };
    try { navigator.clipboard.writeText(code.textContent).then(ok, fallback); } catch (e) { fallback(); }
  }));

  /* ---------- tabs ---------- */
  $$("[data-tabs]").forEach(t => {
    const tabs = $$("[role=tab]", t), panels = $$(".panel", t);
    tabs.forEach((b, i) => b.addEventListener("click", () => {
      tabs.forEach((x, j) => x.setAttribute("aria-selected", i === j));
      panels.forEach((p, j) => p.hidden = i !== j);
    }));
  });

  /* ---------- shared: horizontal bars ---------- */
  function bars(el, rows) {
    el.innerHTML = rows.map(r => '<div class="hb"><span class="lab">' + esc(r.label) + '</span><span class="track"><span class="fill" style="display:block;width:' +
      Math.max(0.5, Math.min(100, r.pct)).toFixed(1) + "%;background:" + r.color + '"></span></span><span class="val">' + esc(r.val) + "</span></div>").join("");
  }

  /* ---------- 1-A growth ---------- */
  (function () {
    const fns = [
      ["O(1)", n => 1], ["O(log n)", n => Math.log2(n)], ["O(n)", n => n], ["O(n log n)", n => n * Math.log2(n)],
      ["O(n²)", n => n * n], ["O(n³)", n => n * n * n], ["O(2ⁿ)", n => Math.pow(2, n)]
    ];
    const sup = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", ".": "·" };
    function human(t) {
      if (!isFinite(t) || t > 4.35e17) return "≫ 우주 나이";
      if (t < 1e-6) return "< 1 µs";
      if (t < 1e-3) return (t * 1e6).toFixed(0) + " µs";
      if (t < 1) return (t * 1e3).toFixed(t < 1e-2 ? 1 : 0) + " ms";
      if (t < 60) return t.toFixed(1) + " 초";
      if (t < 3600) return (t / 60).toFixed(1) + " 분";
      if (t < 86400) return (t / 3600).toFixed(1) + " 시간";
      if (t < 3.15e7) return (t / 86400).toFixed(1) + " 일";
      const y = t / 3.15e7;
      return (y < 1e6 ? fmt(y) : y.toExponential(1)) + " 년";
    }
    function draw() {
      const v = +$("#gN").value, n = Math.round(Math.pow(10, v)), ops = +$("#gOps").value;
      $("#oN").textContent = Number.isInteger(v) ? "10" + String(v).split("").map(c => sup[c]).join("") + " = " + fmt(n) : fmt(n);
      $("#oOps").textContent = "";
      let fastest1s = null;
      const rows = fns.map(([name, f]) => {
        const t = f(n) / ops;
        if (t <= 1) fastest1s = name;
        const pct = isFinite(t) ? (Math.log10(Math.max(t, 1e-9)) + 9) / 27 * 100 : 100;
        const color = t <= 1 ? "var(--accent)" : t <= 60 ? "var(--signal)" : "var(--bad)";
        return { label: name, pct, color, val: human(t) };
      });
      bars($("#gBars"), rows);
      const st = $("#gStatus");
      st.className = "status " + (fastest1s === "O(2ⁿ)" || fastest1s === "O(n³)" || fastest1s === "O(n²)" ? "g" : "y");
      st.textContent = "n = " + fmt(n) + "에서 1초 안에 끝나는 가장 비싼 차수: " + (fastest1s || "없음") + ". " +
        (n >= 1e5 ? "이 크기에서는 O(n²)부터 사실상 불가능합니다. 정렬·트리·힙으로 O(n log n) 이하를 만드는 것이 설계의 출발점입니다." :
         n <= 30 ? "입력이 이렇게 작으면 지수 시간 전수 탐색도 선택지입니다. 백트래킹(10장)이 여기서 쓰입니다." :
         "중간 크기에서는 O(n²)도 버틸 수 있습니다. 작은 배열에서 삽입 정렬이 이기는 이유입니다(7장).");
    }
    $("#gN").addEventListener("input", draw); $("#gOps").addEventListener("input", draw);
    draw();
  })();

  /* ---------- 2-A vector growth ---------- */
  (function () {
    let size, cap, moves, re, lastMsg, moved, fresh;
    const grow = { x2: c => c ? c * 2 : 4, "x1.5": c => c ? Math.max(c + 1, Math.floor(c * 1.5)) : 4, p4: c => c + 4 };
    function reset() { size = 0; cap = 0; moves = 0; re = 0; moved = 0; fresh = -1; lastMsg = "빈 벡터입니다. push를 눌러 보세요."; render(); }
    function push(k, quiet) {
      for (let i = 0; i < k; i++) {
        moved = 0;
        if (size === cap) {
          const nc = grow[$("#vPol").value](cap);
          moves += size; moved = size; re++;
          lastMsg = "재할당! capacity " + cap + " → " + nc + ", 기존 원소 " + size + "개를 새 버퍼로 이동했습니다.";
          cap = nc;
        } else lastMsg = "빈 칸에 바로 넣었습니다. 이동 0회.";
        fresh = size; size++;
      }
      if (!quiet) render();
    }
    function render() {
      const show = Math.min(cap, 64);
      let h = "";
      for (let i = 0; i < show; i++) {
        const cls = i === fresh ? "new" : i < moved ? "hl" : i < size ? "" : "empty";
        h += '<div class="cell ' + cls + '">' + (i < size ? i : "·") + "</div>";
      }
      if (cap > 64) h += '<div class="cell empty" style="min-width:auto;padding:0 10px">… 총 ' + fmt(cap) + "칸</div>";
      $("#vCells").innerHTML = h;
      $("#vSize").textContent = fmt(size); $("#vCap").textContent = fmt(cap); $("#vMoves").textContent = fmt(moves);
      $("#vAvg").textContent = size ? (moves / size).toFixed(2) : "0"; $("#vRe").textContent = fmt(re);
      $("#vMsg").textContent = lastMsg;
    }
    $("#vPush").addEventListener("click", () => push(1));
    $("#vPush10").addEventListener("click", () => push(10));
    $("#vPush1k").addEventListener("click", () => {
      push(Math.max(0, 1000 - size), true); fresh = -1; moved = 0;
      const pol = $("#vPol").value;
      lastMsg = "1,000개 완료. push당 평균 이동 " + (moves / size).toFixed(2) + "회. " +
        (pol === "p4" ? "고정 증가는 재할당이 " + re + "번이나 일어나고 이동이 n²에 비례해 늘어납니다. 10만 개면 약 12억 회입니다." :
         "등비 증가라 재할당은 " + re + "번뿐이고 push당 이동은 상수입니다. " + (pol === "x2" ? "2배 성장은 이동이 적은 대신 최대 절반의 공간이 비어 있을 수 있습니다." : "1.5배는 이동이 조금 늘지만 남는 공간이 적습니다."));
      render();
    });
    $("#vReset").addEventListener("click", reset);
    $("#vPol").addEventListener("input", reset);
    reset();
  })();

  /* ---------- 4-A hash table ---------- */
  (function () {
    const M = 16;
    let keys = [], slots, chains, lastPath = [], lastEnd = -1, lastBad = false;
    const mode = () => $("#hMode").value, fn = () => $("#hFn").value;
    const h = k => fn() === "mod" ? ((k % M) + M) % M : (Math.imul(k, 2654435761 | 0) >>> 0) >>> 28;
    function rebuild() {
      slots = Array.from({ length: M }, () => ({ s: "E", k: null }));
      chains = Array.from({ length: M }, () => []);
      const old = keys; keys = [];
      old.forEach(k => insert(k, true));
      lastPath = []; lastEnd = -1;
    }
    function probeFind(k) {
      const path = []; let i = h(k);
      for (let c = 0; c < M; c++) {
        path.push(i);
        const s = slots[i];
        if (s.s === "E") return { found: false, path };
        if (s.s === "F" && s.k === k) return { found: true, idx: i, path };
        i = (i + 1) % M;
      }
      return { found: false, path };
    }
    function insert(k, quiet) {
      if (keys.includes(k)) { if (!quiet) msg("y", "키 " + k + "는 이미 있습니다. 값만 갱신하는 경우입니다."); return; }
      if (mode() === "ch") {
        const b = h(k); chains[b].push(k); keys.push(k);
        lastPath = [b]; lastEnd = b; lastBad = false;
        if (!quiet) msg(chains[b].length > 2 ? "y" : "g", "h(" + k + ") = " + b + " → " + b + "번 체인 끝에 추가. 체인 길이 " + chains[b].length + (chains[b].length > 2 ? ". 찾을 때 이 리스트를 모두 훑어야 합니다." : "."));
        return;
      }
      let i = h(k), tomb = -1; const path = [];
      for (let c = 0; c < M; c++) {
        path.push(i);
        const s = slots[i];
        if (s.s === "D" && tomb < 0) tomb = i;
        if (s.s === "E") { const t = tomb >= 0 ? tomb : i; slots[t] = { s: "F", k }; keys.push(k); lastPath = path; lastEnd = t; lastBad = false;
          if (!quiet) msg(path.length > 3 ? "y" : "g", "h(" + k + ") = " + h(k) + ". " + (path.length === 1 ? "빈 칸에 바로 저장." : path.length + "칸을 탐사한 뒤 " + t + "번 칸에 저장" + (tomb >= 0 ? "(툼스톤 재사용)" : "") + ". 클러스터가 길수록 탐사가 길어집니다."));
          return; }
        i = (i + 1) % M;
      }
      if (tomb >= 0) { slots[tomb] = { s: "F", k }; keys.push(k); lastPath = path; lastEnd = tomb; lastBad = false; if (!quiet) msg("y", "빈 칸이 없어 툼스톤 " + tomb + "번 칸을 재사용했습니다."); return; }
      lastPath = path; lastEnd = -1; lastBad = true;
      if (!quiet) msg("r", "테이블이 가득 찼습니다. 실제 구현은 이보다 훨씬 전에(α≈0.7) 재해시합니다.");
    }
    function find(k) {
      if (mode() === "ch") {
        const b = h(k), idx = chains[b].indexOf(k);
        lastPath = [b]; lastEnd = idx >= 0 ? b : -1; lastBad = idx < 0;
        msg(idx >= 0 ? "g" : "y", "h(" + k + ") = " + b + "번 체인에서 " + (idx >= 0 ? (idx + 1) + "번째 비교 만에 찾음." : chains[b].length + "개를 모두 비교했지만 없음."));
        return;
      }
      const r = probeFind(k);
      lastPath = r.path; lastEnd = r.found ? r.idx : -1; lastBad = !r.found;
      msg(r.found ? "g" : "y", (r.found ? "찾음: " : "없음: ") + r.path.length + "칸 탐사 (" + r.path.join(" → ") + ")" + (r.found ? "." : ". 빈 칸(E)을 만나야 '없다'고 확정할 수 있습니다."));
    }
    function del(k) {
      if (!keys.includes(k)) { msg("y", "키 " + k + "는 없습니다."); return; }
      keys = keys.filter(x => x !== k);
      if (mode() === "ch") { const b = h(k); chains[b] = chains[b].filter(x => x !== k); lastPath = [b]; lastEnd = -1; msg("g", "체이닝은 리스트에서 빼면 끝입니다."); return; }
      const r = probeFind(k); slots[r.idx] = { s: "D", k }; lastPath = r.path; lastEnd = r.idx; lastBad = false;
      msg("y", r.idx + "번 칸을 툼스톤(D)으로 표시했습니다. 비워 버리면 그 뒤로 밀려 저장된 키를 못 찾게 됩니다.");
    }
    function msg(c, t) { const el = $("#hMsg"); el.className = "status " + c; el.textContent = t; }
    function stats() {
      const n = keys.length;
      $("#hN").textContent = n; $("#hA").textContent = (n / M).toFixed(2);
      let tot = 0, longest = 0;
      if (mode() === "ch") {
        keys.forEach(k => { tot += chains[h(k)].indexOf(k) + 1; });
        longest = Math.max(0, ...chains.map(c => c.length));
      } else {
        keys.forEach(k => { tot += probeFind(k).path.length; });
        let run = 0;
        for (let i = 0; i < 2 * M; i++) { if (slots[i % M].s !== "E") { run++; longest = Math.max(longest, Math.min(run, M)); } else run = 0; }
      }
      $("#hP").textContent = n ? (tot / n).toFixed(2) : "0"; $("#hL").textContent = longest;
    }
    function render() {
      let html;
      if (mode() === "ch") {
        html = '<div style="display:flex;flex-wrap:wrap;gap:3px;margin:10px 0">' + chains.map((c, b) => {
          const on = lastPath.includes(b);
          return '<div style="display:flex;flex-direction:column;gap:3px"><div class="cell ' + (on ? (lastBad ? "bad" : "hl") : "empty") + '"><small>' + b + "</small></div>" +
            c.map((k, j) => '<div class="cell ' + (on && j === c.length - 1 && lastEnd === b ? "new" : "") + '">' + k + "</div>").join("") + "</div>";
        }).join("") + "</div>";
      } else {
        html = '<div class="cells">' + slots.map((s, i) => {
          let cls = s.s === "E" ? "empty" : s.s === "D" ? "tomb" : "";
          if (lastPath.includes(i)) cls = "hl";
          if (i === lastEnd) cls = s.s === "D" ? "tomb hl" : "new";
          if (lastBad && i === lastPath[lastPath.length - 1]) cls = "bad";
          return '<div class="cell ' + cls + '"><small>' + i + "</small>" + (s.s === "E" ? "·" : s.k) + "</div>";
        }).join("") + "</div>";
      }
      $("#hView").innerHTML = html; stats();
    }
    const keyIn = () => { const v = parseInt($("#hKey").value, 10); return isNaN(v) ? null : v; };
    $("#hIns").addEventListener("click", () => { const k = keyIn(); if (k !== null) { insert(k); render(); } });
    $("#hFind").addEventListener("click", () => { const k = keyIn(); if (k !== null) { find(k); render(); } });
    $("#hDel").addEventListener("click", () => { const k = keyIn(); if (k !== null) { del(k); render(); } });
    $("#hRand").addEventListener("click", () => { for (let i = 0; i < 4; i++) { let k; do { k = Math.floor(Math.random() * 1000); } while (keys.includes(k)); insert(k); } render(); });
    $("#hBad").addEventListener("click", () => {
      for (let i = 0; i < 4; i++) { let k; do { k = 16 * (1 + Math.floor(Math.random() * 60)); } while (keys.includes(k)); insert(k); }
      render();
      if (fn() === "mod") msg("r", "16의 배수는 k mod 16이 모두 0입니다. 한 버킷에 몰려 탐색이 O(n)이 됩니다. 해시 함수를 '비트 섞기'로 바꿔 보세요.");
      else msg("g", "곱셈 해시가 상위 비트를 섞어 16의 배수도 여러 버킷으로 퍼졌습니다.");
    });
    $("#hReset").addEventListener("click", () => { keys = []; rebuild(); msg("g", "비웠습니다."); render(); });
    ["hMode", "hFn"].forEach(id => $("#" + id).addEventListener("input", () => { rebuild(); msg("g", "같은 키들을 새 설정으로 다시 넣었습니다."); render(); }));
    [23, 7, 42, 39, 55].forEach(k => keys.push(k));
    rebuild(); msg("g", "키 5개가 들어 있습니다. 키를 넣고, 찾고, 지워 보세요."); render();
  })();

  /* ---------- 6-A heap stepper ---------- */
  (function () {
    const MAX = 15;
    let frames = [], fi = 0;
    const cur = () => frames[fi].a;
    function frame(a, hl, note, done) { frames.push({ a: a.slice(), hl: hl || [], note, done: !!done }); }
    function start(a, note) { frames = []; fi = 0; frame(a, [], note, true); render(); }
    function rand(a) { let v; do { v = 1 + Math.floor(Math.random() * 99); } while (a.includes(v)); return v; }
    function push() {
      const a = cur().slice();
      if (a.length >= MAX) { $("#hpMsg").textContent = "이 벤치는 15개(높이 4)까지만 보여 줍니다. pop으로 줄여 보세요."; return; }
      const v = rand(a); frames = []; fi = 0;
      a.push(v); let i = a.length - 1;
      frame(a, [i], "push(" + v + "): 모양 규칙을 지키려고 먼저 맨 끝(인덱스 " + i + ")에 넣습니다.");
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (a[i] < a[p]) {
          frame(a, [i, p], "부모 a[" + p + "]=" + a[p] + " > " + a[i] + " → 교환해야 합니다.");
          [a[i], a[p]] = [a[p], a[i]]; i = p;
          frame(a, [i], "교환 후 " + v + "는 인덱스 " + i + ". 다시 부모와 비교합니다.");
        } else { frame(a, [i, p], "부모 a[" + p + "]=" + a[p] + " ≤ " + a[i] + " → 힙 규칙 만족. sift-up 끝.", true); return finish(); }
      }
      frame(a, [0], v + "가 루트까지 올라왔습니다. 새 최솟값입니다.", true); finish();
    }
    function pop() {
      const a = cur().slice();
      if (!a.length) { $("#hpMsg").textContent = "힙이 비었습니다."; return; }
      frames = []; fi = 0;
      const top = a[0];
      frame(a, [0], "pop(): 최솟값은 항상 루트 a[0] = " + top + "입니다.");
      const last = a.pop();
      if (!a.length) { frame(a, [], top + "를 꺼냈고 힙이 비었습니다.", true); return finish(); }
      a[0] = last;
      frame(a, [0], "마지막 원소 " + last + "를 루트로 옮겼습니다(모양 규칙 유지). 이제 내려 보냅니다.");
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && a[l] < a[m]) m = l;
        if (r < a.length && a[r] < a[m]) m = r;
        if (m === i) { frame(a, [i], (l < a.length ? "자식들이 모두 " + a[i] + " 이상" : "자식이 없음") + " → sift-down 끝. 꺼낸 값: " + top + ".", true); return finish(); }
        frame(a, [i, m], "더 작은 자식 a[" + m + "]=" + a[m] + " < " + a[i] + " → 교환.");
        [a[i], a[m]] = [a[m], a[i]]; i = m;
      }
    }
    function finish() { fi = 0; render(); }
    function render() {
      const f = frames[fi], a = f.a, svg = $("#hpSvg");
      let s = "";
      const pos = i => { const d = Math.floor(Math.log2(i + 1)), k = i - (Math.pow(2, d) - 1), w = 560 / Math.pow(2, d); return [w * (k + 0.5), 28 + d * 54]; };
      for (let i = 1; i < a.length; i++) { const [x1, y1] = pos((i - 1) >> 1), [x2, y2] = pos(i); s += '<line class="sv-ln" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>'; }
      a.forEach((v, i) => {
        const [x, y] = pos(i), on = f.hl.includes(i);
        s += '<circle class="' + (on ? "sv-core" : "sv-r2") + '" cx="' + x + '" cy="' + y + '" r="17"/><text class="' + (on ? "sv-core-t" : "sv-t") + '" x="' + x + '" y="' + (y + 5) + '" text-anchor="middle">' + v + "</text>";
        s += '<text class="sv-m" x="' + (x + 20) + '" y="' + (y - 12) + '">' + i + "</text>";
      });
      svg.innerHTML = s;
      $("#hpCells").innerHTML = a.map((v, i) => '<div class="cell ' + (f.hl.includes(i) ? "hl" : "") + '"><small>' + i + "</small>" + v + "</div>").join("") || '<div class="cell empty">빈 힙</div>';
      $("#hpMsg").textContent = f.note;
      $("#hpStep").textContent = "단계 " + (fi + 1) + " / " + frames.length + (frames.length > 1 && fi < frames.length - 1 ? " · '다음 단계'로 진행" : "");
      $("#hpPrev").disabled = fi === 0; $("#hpNext").disabled = fi === frames.length - 1;
      const busy = fi < frames.length - 1;
      $("#hpPush").disabled = busy; $("#hpPop").disabled = busy;
    }
    function fresh() {
      const a = []; while (a.length < 10) a.push(rand(a));
      for (let i = (a.length >> 1) - 1; i >= 0; i--) { let j = i; for (;;) { const l = 2 * j + 1, r = l + 1; let m = j; if (l < a.length && a[l] < a[m]) m = l; if (r < a.length && a[r] < a[m]) m = r; if (m === j) break; [a[j], a[m]] = [a[m], a[j]]; j = m; } }
      start(a, "무작위 값 10개를 Floyd 방식(O(n))으로 힙으로 만들었습니다. 부모 ≤ 자식이지만 배열 전체는 정렬되어 있지 않다는 점을 확인하세요.");
    }
    $("#hpPush").addEventListener("click", push);
    $("#hpPop").addEventListener("click", pop);
    $("#hpReset").addEventListener("click", fresh);
    $("#hpNext").addEventListener("click", () => { if (fi < frames.length - 1) { fi++; render(); } });
    $("#hpPrev").addEventListener("click", () => { if (fi > 0) { fi--; render(); } });
    fresh();
  })();

  /* ---------- 7-A sorting arena ---------- */
  (function () {
    function mkInput(n, pat) {
      let seed = 12345; const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296;
      let a = Array.from({ length: n }, (_, i) => i);
      if (pat === "rand" || pat === "nearly") for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      if (pat === "nearly") { a.sort((x, y) => x - y); const k = Math.max(1, Math.floor(n * 0.02)); for (let t = 0; t < k; t++) { const i = Math.floor(rnd() * n), j = Math.floor(rnd() * n); [a[i], a[j]] = [a[j], a[i]]; } }
      if (pat === "rev") a.reverse();
      if (pat === "few") a = a.map(() => Math.floor(rnd() * 4));
      return a;
    }
    const algs = [
      ["삽입 정렬", a => { const c = { cmp: 0 }; const lt = (x, y) => (c.cmp++, x < y);
        for (let i = 1; i < a.length; i++) { const x = a[i]; let j = i; while (j > 0 && lt(x, a[j - 1])) { a[j] = a[j - 1]; j--; } a[j] = x; } return c; }],
      ["병합 정렬", a => { const c = { cmp: 0 }; const t = a.slice();
        (function ms(lo, hi) { if (hi - lo < 2) return; const mid = (lo + hi) >> 1; ms(lo, mid); ms(mid, hi);
          let i = lo, j = mid, k = lo; while (i < mid && j < hi) { c.cmp++; t[k++] = a[j] < a[i] ? a[j++] : a[i++]; }
          while (i < mid) t[k++] = a[i++]; while (j < hi) t[k++] = a[j++]; for (k = lo; k < hi; k++) a[k] = t[k]; })(0, a.length); return c; }],
      ["퀵 (첫 원소 피벗)", a => { const c = { cmp: 0 };
        (function qs(lo, hi) { while (lo < hi) { const p = a[lo]; let i = lo;
          for (let j = lo + 1; j <= hi; j++) { c.cmp++; if (a[j] < p) { i++; [a[i], a[j]] = [a[j], a[i]]; } }
          [a[lo], a[i]] = [a[i], a[lo]];
          if (i - lo < hi - i) { qs(lo, i - 1); lo = i + 1; } else { qs(i + 1, hi); hi = i - 1; } } })(0, a.length - 1); return c; }],
      ["퀵 (3-중앙값)", a => { const c = { cmp: 0 }; const lt = (x, y) => (c.cmp++, x < y);
        function ins(lo, hi) { for (let i = lo + 1; i <= hi; i++) { const x = a[i]; let j = i; while (j > lo && lt(x, a[j - 1])) { a[j] = a[j - 1]; j--; } a[j] = x; } }
        (function qs(lo, hi) { while (hi - lo > 16) { const mid = lo + ((hi - lo) >> 1);
          if (lt(a[mid], a[lo])) [a[mid], a[lo]] = [a[lo], a[mid]]; if (lt(a[hi], a[lo])) [a[hi], a[lo]] = [a[lo], a[hi]]; if (lt(a[hi], a[mid])) [a[hi], a[mid]] = [a[mid], a[hi]];
          const p = a[mid]; let i = lo, j = hi;
          while (i <= j) { while (lt(a[i], p)) i++; while (lt(p, a[j])) j--; if (i <= j) { [a[i], a[j]] = [a[j], a[i]]; i++; j--; } }
          if (j - lo < hi - i) { qs(lo, j); lo = i; } else { qs(i, hi); hi = j; } } ins(lo, hi); })(0, a.length - 1); return c; }],
      ["힙 정렬", a => { const c = { cmp: 0 }; const n = a.length; const lt = (x, y) => (c.cmp++, x < y);
        const down = (i, n) => { for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < n && lt(a[m], a[l])) m = l; if (r < n && lt(a[m], a[r])) m = r; if (m === i) return; [a[i], a[m]] = [a[m], a[i]]; i = m; } };
        for (let i = (n >> 1) - 1; i >= 0; i--) down(i, n);
        for (let e = n - 1; e > 0; e--) { [a[0], a[e]] = [a[e], a[0]]; down(0, e); } return c; }]
    ];
    const notes = {
      rand: "무작위 입력에서는 n log n 계열이 비슷하고, 삽입 정렬만 n²/4 근처로 떨어집니다.",
      sorted: "이미 정렬된 입력: 삽입 정렬은 n−1번 비교로 끝나지만, 첫 원소를 피벗으로 쓰는 퀵 정렬은 매번 한쪽이 비어 n²/2로 무너집니다. 3-중앙값 피벗이 이 함정을 피합니다.",
      rev: "역순 입력: 삽입 정렬의 최악(n²/2)이자 첫 원소 피벗 퀵 정렬의 최악입니다.",
      nearly: "거의 정렬된 입력: 삽입 정렬이 n log n 알고리즘들과 겨룰 만해집니다. 실제 데이터에 흔한 패턴이라 Timsort 계열이 이미 정렬된 구간(run)을 찾아 활용합니다.",
      few: "중복이 많은 입력: 단순 Lomuto 분할은 피벗과 같은 값을 모두 한쪽으로 보내 n²에 가까워집니다. Hoare 분할(3-중앙값)은 같은 값을 양쪽으로 나눠 잘 버팁니다."
    };
    function run() {
      const n = Math.pow(2, +$("#sN").value), pat = $("#sPat").value;
      $("#oSN").textContent = fmt(n);
      const base = mkInput(n, pat), ref = base.slice().sort((x, y) => x - y);
      const res = algs.map(([name, f]) => { const a = base.slice(); const c = f(a); const ok = a.every((v, i) => v === ref[i]); return { name, cmp: c.cmp, ok }; });
      const top = Math.log10(n * n);
      const nlogn = n * Math.log2(n);
      bars($("#sBars"), res.map(r => ({ label: r.name, pct: Math.log10(r.cmp + 1) / top * 100, val: fmt(r.cmp) + (r.ok ? "" : " ✗"),
        color: r.cmp <= 1.6 * nlogn ? "var(--accent)" : r.cmp <= n * n / 8 ? "var(--signal)" : "var(--bad)" })));
      $("#sRef").textContent = "참고: n log₂ n = " + fmt(nlogn) + " · n²/2 = " + fmt(n * n / 2) + " · 막대 색: 파랑 ≈ n log n, 빨강 ≈ n²";
      const st = $("#sMsg"); st.className = "status " + (pat === "rand" ? "g" : "y"); st.textContent = notes[pat];
    }
    ["sN", "sPat"].forEach(id => $("#" + id).addEventListener("input", run));
    run();
  })();

  /* ---------- shared: grid map ---------- */
  function GridMap(el, W, H, onToggle) {
    el.style.gridTemplateColumns = "repeat(" + W + ", minmax(0, 1fr))";
    const cells = [];
    for (let i = 0; i < W * H; i++) {
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("aria-label", "칸 " + (i % W) + "," + Math.floor(i / W) + " 벽 토글");
      b.addEventListener("click", () => onToggle(i));
      el.appendChild(b); cells.push(b);
    }
    return { paint(cls, labels) { for (let i = 0; i < cells.length; i++) { const c = cls[i] || ""; if (cells[i].className !== c) cells[i].className = c; const t = labels ? labels[i] || "" : ""; if (cells[i].textContent !== t) cells[i].textContent = t; } } };
  }

  /* ---------- 8-A BFS / DFS ---------- */
  (function () {
    const W = 21, H = 13, S = 6 * W + 2, T = 6 * W + 18;
    const defWalls = () => { const w = new Uint8Array(W * H); for (let y = 0; y < 10; y++) w[y * W + 7] = 1; for (let y = 3; y < H; y++) w[y * W + 13] = 1; for (let x = 8; x < 12; x++) w[9 * W + x] = 1; return w; };
    let walls = defWalls(), alg = "bfs", st, timer = null;
    const nb = i => { const x = i % W, y = (i / W) | 0, out = []; if (x + 1 < W) out.push(i + 1); if (y + 1 < H) out.push(i + W); if (x > 0) out.push(i - 1); if (y > 0) out.push(i - W); return out.filter(j => !walls[j]); };
    function shortest() { const d = new Int32Array(W * H).fill(-1), q = [S]; d[S] = 0; for (let h = 0; h < q.length; h++) { const u = q[h]; for (const v of nb(u)) if (d[v] < 0) { d[v] = d[u] + 1; q.push(v); } } return d[T]; }
    function reset() {
      stop();
      st = { seen: new Uint8Array(W * H), exp: new Uint8Array(W * H), par: new Int32Array(W * H).fill(-1), list: [S], head: 0, done: false, found: false, path: [], nexp: 0 };
      st.seen[S] = 1;
      $("#gMsg").textContent = alg === "bfs" ? "BFS: 큐에서 꺼낸 칸의 이웃을 큐 뒤에 넣습니다. 물결처럼 한 겹씩 퍼집니다." : "DFS: 스택에서 꺼낸 칸의 이웃을 스택 위에 쌓습니다. 한 방향으로 끝까지 파고듭니다.";
      render();
    }
    function step() {
      if (st.done) return;
      let u;
      if (alg === "bfs") { if (st.head >= st.list.length) return fin(false); u = st.list[st.head++]; }
      else { do { if (!st.list.length) return fin(false); u = st.list.pop(); } while (st.exp[u]); }
      st.exp[u] = 1; st.nexp++;
      if (u === T) return fin(true);
      const ns = nb(u);
      if (alg === "bfs") { for (const v of ns) if (!st.seen[v]) { st.seen[v] = 1; st.par[v] = u; st.list.push(v); } }
      else { for (let k = ns.length - 1; k >= 0; k--) { const v = ns[k]; if (!st.exp[v]) { st.par[v] = u; st.seen[v] = 1; st.list.push(v); } } }
      render();
    }
    function fin(found) {
      st.done = true; st.found = found; stop();
      if (found) { for (let v = T; v !== -1; v = st.par[v]) st.path.push(v); }
      const L = found ? st.path.length - 1 : -1, best = shortest();
      $("#gMsg").textContent = !found ? "도착점에 닿을 수 없습니다. 벽을 지워 길을 열어 보세요." :
        alg === "bfs" ? "BFS가 찾은 경로 길이 " + L + ". 간선 수 기준 최단 경로가 보장됩니다. 칸 " + st.nexp + "개를 확장했습니다." :
        "DFS가 찾은 경로 길이 " + L + " (최단은 " + best + "). DFS는 처음 닿은 길을 돌려줄 뿐 최단을 보장하지 않습니다.";
      render();
    }
    function render() {
      const cls = new Array(W * H);
      for (let i = 0; i < W * H; i++) cls[i] = walls[i] ? "w" : st.exp[i] ? "v" : st.seen[i] ? "f" : "";
      st.path.forEach(i => cls[i] = "p");
      cls[S] = "s"; cls[T] = "t";
      const lab = []; lab[S] = "S"; lab[T] = "G";
      map.paint(cls, lab);
      const fr = alg === "bfs" ? st.list.length - st.head : st.list.filter(i => !st.exp[i]).length;
      $("#gVis").textContent = st.nexp; $("#gFr").textContent = fr; $("#gLen").textContent = st.found ? st.path.length - 1 : "-";
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } $("#gRun").textContent = "자동 실행"; }
    const map = GridMap($("#gMap"), W, H, i => { if (i === S || i === T) return; walls[i] ^= 1; reset(); });
    $("#gStep").addEventListener("click", () => { stop(); step(); });
    $("#gRun").addEventListener("click", () => {
      if (timer) return stop();
      if (st.done) reset();
      if (reduceMotion) { while (!st.done) step(); return; }
      $("#gRun").textContent = "일시 정지";
      timer = setInterval(() => { step(); if (st.done) stop(); }, 35);
    });
    $("#gClear").addEventListener("click", reset);
    $("#gWalls").addEventListener("click", () => { walls = defWalls(); reset(); });
    $$("#gridBench [data-alg]").forEach(b => b.addEventListener("click", () => {
      alg = b.dataset.alg; $$("#gridBench [data-alg]").forEach(x => x.setAttribute("aria-pressed", x === b)); reset();
    }));
    reset();
  })();

  /* ---------- 10-A LCS table ---------- */
  (function () {
    let A, B, dp, k, path;
    const clean = s => s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    function load() {
      A = clean($("#dpA").value) || "ROBOT"; B = clean($("#dpB").value) || "ORBIT";
      $("#dpA").value = A; $("#dpB").value = B;
      dp = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(null));
      for (let i = 0; i <= A.length; i++) dp[i][0] = 0;
      for (let j = 0; j <= B.length; j++) dp[0][j] = 0;
      k = 0; path = null;
      render(null, "0행과 0열은 빈 문자열과의 LCS라서 0입니다(기저). 이제 한 칸씩 채워 봅니다.");
    }
    const total = () => A.length * B.length;
    function fillOne() {
      if (k >= total()) return backtrack();
      const i = 1 + Math.floor(k / B.length), j = 1 + (k % B.length); k++;
      let note, src;
      if (A[i - 1] === B[j - 1]) { dp[i][j] = dp[i - 1][j - 1] + 1; src = [[i - 1, j - 1]]; note = "a[" + i + "]=" + A[i - 1] + ", b[" + j + "]=" + B[j - 1] + " 같음 → 왼쪽 위 대각선 " + dp[i - 1][j - 1] + " + 1 = " + dp[i][j]; }
      else { dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]); src = [[i - 1, j], [i, j - 1]]; note = A[i - 1] + " ≠ " + B[j - 1] + " → max(위 " + dp[i - 1][j] + ", 왼쪽 " + dp[i][j - 1] + ") = " + dp[i][j]; }
      render({ i, j, src }, note + (k === total() ? ". 표 완성! 한 번 더 누르면 역추적합니다." : ""));
    }
    function backtrack() {
      path = []; let i = A.length, j = B.length, s = "";
      while (i > 0 && j > 0) {
        if (A[i - 1] === B[j - 1]) { path.push(i + "," + j); s = A[i - 1] + s; i--; j--; }
        else if (dp[i - 1][j] >= dp[i][j - 1]) i--; else j--;
      }
      render(null, "오른쪽 아래에서 거꾸로: 글자가 같으면 대각선(그 글자를 답에 포함), 다르면 값이 큰 쪽으로. LCS = \"" + s + "\" (길이 " + dp[A.length][B.length] + ")" + (s ? "" : " — 공통 글자가 없습니다."));
    }
    function render(cur, note) {
      let h = "<tr><th></th><th>∅</th>" + B.split("").map(c => "<th>" + esc(c) + "</th>").join("") + "</tr>";
      for (let i = 0; i <= A.length; i++) {
        h += "<tr><th>" + (i ? esc(A[i - 1]) : "∅") + "</th>";
        for (let j = 0; j <= B.length; j++) {
          let cls = dp[i][j] === null ? "emp" : "";
          if (cur && cur.src.some(([a, b]) => a === i && b === j)) cls = "src";
          if (cur && cur.i === i && cur.j === j) cls = "cur";
          if (path && path.includes(i + "," + j)) cls = "path";
          h += '<td class="' + cls + '">' + (dp[i][j] === null ? "·" : dp[i][j]) + "</td>";
        }
        h += "</tr>";
      }
      $("#dpT").innerHTML = h; $("#dpMsg").textContent = note;
    }
    $("#dpLoad").addEventListener("click", load);
    $("#dpStep").addEventListener("click", fillOne);
    $("#dpRow").addEventListener("click", () => { if (k >= total()) return backtrack(); const end = Math.min(total(), (Math.floor(k / B.length) + 1) * B.length); while (k < end - 1) { k++; const i = 1 + Math.floor((k - 1) / B.length), j = 1 + ((k - 1) % B.length); dp[i][j] = A[i - 1] === B[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]); } fillOne(); });
    $("#dpAll").addEventListener("click", () => { while (k < total()) { k++; const i = 1 + Math.floor((k - 1) / B.length), j = 1 + ((k - 1) % B.length); dp[i][j] = A[i - 1] === B[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]); } backtrack(); });
    load();
  })();

  /* ---------- 12-A A* lab ---------- */
  (function () {
    const W = 24, H = 14, S = 11 * W + 2, T = 2 * W + 21, SQ2 = Math.SQRT2;
    const defWalls = () => { const w = new Uint8Array(W * H); for (let y = 0; y < 10; y++) w[y * W + 8] = 1; for (let y = 4; y < H; y++) w[y * W + 16] = 1; for (let x = 16; x < 21; x++) w[4 * W + x] = 1; return w; };
    let walls = defWalls(), sel = "astar";
    const free = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !walls[y * W + x];
    const oct = (dx, dy) => { dx = Math.abs(dx); dy = Math.abs(dy); return dx + dy + (SQ2 - 2) * Math.min(dx, dy); };
    const D = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    function search(kind) {
      const n = W * H, g = new Float64Array(n).fill(Infinity), par = new Int32Array(n).fill(-1), closed = new Uint8Array(n);
      const tx = T % W, ty = (T / W) | 0, hh = i => oct(tx - i % W, ty - ((i / W) | 0));
      const key = (gi, i) => kind === "dij" ? gi : kind === "astar" ? gi + hh(i) : kind === "wa" ? gi + 2 * hh(i) : hh(i);
      const heap = []; // binary min-heap of [f, tie, id]
      const less = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
      const push = it => { heap.push(it); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (!less(heap[i], heap[p])) break; [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; } };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && less(heap[l], heap[m])) m = l; if (r < heap.length && less(heap[r], heap[m])) m = r; if (m === i) break; [heap[i], heap[m]] = [heap[m], heap[i]]; i = m; } } return top; };
      g[S] = 0; push([key(0, S), 0, S]);
      let exp = 0;
      while (heap.length) {
        const u = pop()[2];
        if (closed[u]) continue;
        closed[u] = 1; exp++;
        if (u === T) break;
        const ux = u % W, uy = (u / W) | 0;
        for (const [dx, dy] of D) {
          const vx = ux + dx, vy = uy + dy;
          if (!free(vx, vy)) continue;
          const diag = dx && dy;
          if (diag && !(free(ux + dx, uy) && free(ux, uy + dy))) continue;
          const v = vy * W + vx, ng = g[u] + (diag ? SQ2 : 1);
          if (ng < g[v]) { g[v] = ng; par[v] = u; push([key(ng, v), hh(v), v]); }
        }
      }
      const path = [];
      if (isFinite(g[T])) for (let v = T; v !== -1; v = par[v]) path.push(v);
      return { exp, cost: g[T], path, closed };
    }
    const names = { dij: "다익스트라", astar: "A*", wa: "Weighted A*", greedy: "탐욕" };
    function run() {
      const r = {}; Object.keys(names).forEach(k => r[k] = search(k));
      const R = r[sel], cls = new Array(W * H);
      for (let i = 0; i < W * H; i++) cls[i] = walls[i] ? "w" : R.closed[i] ? "v" : "";
      R.path.forEach(i => cls[i] = "p"); cls[S] = "s"; cls[T] = "t";
      const lab = []; lab[S] = "S"; lab[T] = "G";
      map.paint(cls, lab);
      const maxE = Math.max(...Object.values(r).map(x => x.exp));
      bars($("#aBars"), Object.keys(names).map(k => ({ label: names[k], pct: r[k].exp / maxE * 100, color: k === sel ? "var(--accent)" : "var(--muted)",
        val: isFinite(r[k].cost) ? r[k].exp + " · " + r[k].cost.toFixed(1) : "경로 없음" })));
      const st = $("#aMsg");
      if (!isFinite(r.dij.cost)) { st.className = "status r"; st.textContent = "도착점에 닿을 수 없습니다. 이때는 모든 알고리즘이 도달 가능한 칸을 전부 확장한 뒤에야 실패를 압니다."; return; }
      const opt = r.dij.cost, saved = Math.round((1 - R.exp / r.dij.exp) * 100), extra = (R.cost / opt - 1) * 100;
      st.className = "status " + (extra > 0.01 ? "y" : "g");
      st.textContent = "막대 = 확장한 칸 수 · 경로 비용. " + (sel === "dij" ? "다익스트라는 목표 방향을 모른 채 사방으로 퍼집니다. 최적 비용 " + opt.toFixed(2) + "." :
        names[sel] + "는 다익스트라보다 " + saved + "% 적게 확장했고, 비용은 " + (extra > 0.01 ? "최적보다 " + extra.toFixed(1) + "% 깁니다(최적성을 포기한 대가)." : "최적과 같습니다."));
    }
    const map = GridMap($("#aMap"), W, H, i => { if (i === S || i === T) return; walls[i] ^= 1; run(); });
    $$("#astarBench [data-a]").forEach(b => b.addEventListener("click", () => { sel = b.dataset.a; $$("#astarBench [data-a]").forEach(x => x.setAttribute("aria-pressed", x === b)); run(); }));
    $("#aWalls").addEventListener("click", () => { walls = defWalls(); run(); });
    $("#aEmpty").addEventListener("click", () => { walls = new Uint8Array(W * H); run(); });
    run();
  })();

  /* ---------- quizzes ---------- */
  const Q = {
    ch1: [
      { q: "n = 10⁶개 입력을 1초 안에 처리해야 하고, 기본 연산은 초당 약 10⁸번이다. 현실적으로 허용되는 가장 비싼 복잡도는?", o: ["O(n²)", "O(n log n)", "O(n³)", "O(2ⁿ)"], a: 1, w: "n log n ≈ 2×10⁷번이라 0.2초 정도입니다. n²은 10¹²번이라 약 3시간입니다." },
      { q: "std::vector와 std::list 순회는 둘 다 O(n)인데 vector가 수십 배 빠를 수 있는 주된 이유는?", o: ["list의 순회는 사실 O(n log n)이라서", "vector는 연속 메모리라 캐시 라인과 프리페치, SIMD를 활용하기 때문", "컴파일러가 list 코드를 최적화하지 않아서", "vector는 원소를 압축해 저장해서"], a: 1, w: "빅오가 같아도 메모리 배치가 상수를 결정합니다. list는 노드마다 포인터를 따라가며 캐시 미스를 냅니다." }
    ],
    ch2: [
      { q: "동적 배열이 꽉 찰 때마다 용량을 +100칸씩만 늘리면, n번 push의 총비용은?", o: ["O(n)", "O(n log n)", "O(n²)", "O(1)"], a: 2, w: "재할당이 n/100번 일어나고 매번 지금까지의 원소를 옮기므로 이동 횟수가 n²/200에 비례합니다. 등비 증가여야 분할 상환 O(1)입니다." },
      { q: "링 버퍼 용량을 2의 거듭제곱으로 정하는 주된 이유는?", o: ["메모리 정렬 요구 때문에", "% 대신 비트 AND 마스크를 쓰고, 자유 증가 인덱스가 넘쳐도 head − tail이 정확한 개수가 되게 하려고", "캐시 라인 크기와 맞추려고", "C 표준이 요구해서"], a: 1, w: "2^k는 2³²(또는 2⁶⁴)를 나누어떨어지게 하므로, 부호 없는 인덱스가 랩어라운드해도 마스크 결과와 개수 계산이 일관됩니다." }
    ],
    ch3: [
      { q: "연결 리스트가 배열보다 확실히 유리한 상황은?", o: ["인덱스로 임의 접근이 잦을 때", "정렬된 데이터에서 값을 찾을 때", "이미 들고 있는 원소(반복자)를 O(1)에 제거하거나 다른 위치로 옮겨야 할 때", "원소를 순서대로 모두 더할 때"], a: 2, w: "위치를 찾는 비용이 없을 때만 리스트의 O(1) 삽입·삭제가 실제 이득이 됩니다. LRU 캐시와 스케줄러 큐가 대표 사례입니다." },
      { q: "unique_ptr로 연결한 노드 100만 개짜리 리스트가 소멸될 때 크래시가 났다. 가장 가능성 높은 원인은?", o: ["메모리 누수", "기본 소멸자가 노드마다 재귀 호출되어 스택 오버플로", "이중 해제", "unique_ptr은 리스트에 쓸 수 없어서"], a: 1, w: "각 노드의 소멸자가 다음 노드의 소멸자를 부릅니다. 소멸자에서 반복문으로 하나씩 끊으세요." }
    ],
    ch4: [
      { q: "개방 주소법에서 삭제한 칸을 그냥 Empty로 되돌리면 생기는 문제는?", o: ["메모리가 낭비된다", "그 칸 뒤로 밀려 저장된 키를 찾을 때 탐사가 그 칸에서 멈춰 '없음'으로 잘못 판단한다", "해시 함수가 바뀐다", "아무 문제 없다"], a: 1, w: "그래서 툼스톤으로 표시하고, 탐색은 지나가되 삽입은 재사용합니다." },
      { q: "키가 모두 1024의 배수이고 버킷 수가 1024인데 h(k) = k (항등 해시)를 쓴다면?", o: ["고르게 퍼진다", "모든 키가 0번 버킷에 몰려 연산이 O(n)이 된다", "부하율이 0이 된다", "재해시가 무한 반복된다"], a: 1, w: "mod 2^k는 하위 비트만 봅니다. 비트를 섞는 해시(곱셈 해시, Murmur finalizer)가 필요한 이유입니다." }
    ],
    ch5: [
      { q: "계속 증가하는 센서 타임스탬프를 균형을 잡지 않는 BST에 차례로 넣으면 조회 비용은?", o: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], a: 2, w: "모든 노드가 오른쪽 자식만 가져 연결 리스트로 퇴화합니다. 실무에서는 균형 트리를 씁니다." },
      { q: "Rust 표준 라이브러리가 정렬된 맵을 레드-블랙 트리 대신 B-트리로 제공하는 이유로 가장 적절한 것은?", o: ["구현이 더 간단해서", "노드 하나에 키를 여러 개 연속으로 담아 캐시 미스가 적어서", "해시 테이블보다 항상 빨라서", "unsafe 코드를 피하려고"], a: 1, w: "넓고 낮은 트리는 따라갈 포인터가 적고, 노드 안의 키 배열 탐색은 캐시 안에서 끝납니다." }
    ],
    ch6: [
      { q: "최소 힙 배열 [1, 3, 2, 7, 4, 5]에서 인덱스 4(값 4)의 부모는?", o: ["인덱스 1, 값 3", "인덱스 2, 값 2", "인덱스 0, 값 1", "인덱스 3, 값 7"], a: 0, w: "부모 인덱스는 (4 − 1) / 2 = 1이고 a[1] = 3입니다. 3 ≤ 4이므로 힙 규칙도 지켜집니다." },
      { q: "Python heapq로 값이 가장 큰 것부터 꺼내려면?", o: ["heapq.heappush(h, -p)처럼 음수를 넣는다", "heapq.reverse()를 호출한다", "heapq.heapify(h, max=True)를 쓴다", "heapq는 최대 힙이 기본이다"], a: 0, w: "heapq는 최소 힙만 제공합니다. 숫자는 부호를 뒤집고, 객체는 비교 순서를 뒤집은 래퍼를 씁니다." }
    ],
    ch7: [
      { q: "이미 정렬된 배열을 받았을 때 가장 적은 비교로 끝나는 것은?", o: ["삽입 정렬", "첫 원소를 피벗으로 쓰는 퀵 정렬", "힙 정렬", "모두 같다"], a: 0, w: "삽입 정렬은 각 원소가 제자리라 n−1번 비교로 끝납니다. 첫 원소 피벗 퀵 정렬은 같은 입력에서 n²/2로 무너집니다." },
      { q: "a = [1, 3, 3, 3, 7]에서 lower_bound(3)과 upper_bound(3)의 인덱스는?", o: ["1, 4", "1, 3", "2, 4", "0, 4"], a: 0, w: "lower_bound는 3 이상인 첫 위치(1), upper_bound는 3 초과인 첫 위치(4)입니다. 차이 3이 3의 개수입니다." }
    ],
    ch8: [
      { q: "BFS에서 방문 표시를 큐에 넣을 때가 아니라 꺼낼 때 하면?", o: ["최단 경로가 틀려진다", "같은 정점이 큐에 여러 번 들어가 시간과 메모리가 낭비된다", "무한 루프에 빠진다", "아무 차이 없다"], a: 1, w: "결과는 맞지만 중복 삽입이 많아져, 밀집 그래프나 격자에서 큐가 폭증할 수 있습니다." },
      { q: "Kahn 위상 정렬이 끝났는데 출력된 정점 수가 전체보다 적다. 이것이 뜻하는 것은?", o: ["그래프가 여러 조각으로 끊겨 있다", "그래프에 순환이 있다", "간선이 하나도 없다", "큐 크기가 부족했다"], a: 1, w: "순환 위의 정점은 진입 차수가 끝내 0이 되지 않습니다. 끊긴 그래프는 위상 정렬에 문제가 없습니다." }
    ],
    ch9: [
      { q: "다익스트라가 음수 간선이 있으면 틀릴 수 있는 이유는?", o: ["힙이 음수를 저장하지 못해서", "이미 확정한 정점이 나중에 음수 간선을 거친 경로로 더 짧아질 수 있어서", "반드시 무한 루프에 빠져서", "정수 오버플로가 나서"], a: 1, w: "'가장 가까운 것은 더 짧아질 수 없다'는 확정 논리가 가중치 ≥ 0에서만 성립합니다. 음수면 벨만-포드를 씁니다." },
      { q: "크루스칼 알고리즘에서 유니온-파인드의 역할은?", o: ["간선을 가중치 순으로 정렬한다", "두 정점이 이미 같은 덩어리인지(간선이 순환을 만드는지) 빠르게 판정한다", "최단 거리를 계산한다", "가중치 합을 누적한다"], a: 1, w: "같은 덩어리 안을 잇는 간선은 순환을 만들므로 버립니다. 그 판정이 거의 O(1)이라 전체는 정렬 비용 O(E log E)가 됩니다." }
    ],
    ch10: [
      { q: "1차원 배열로 0/1 배낭을 풀 때 용량을 작은 쪽부터 큰 쪽으로 돌면?", o: ["같은 물건이 여러 번 담길 수 있다(무한 배낭이 된다)", "더 빠르고 결과는 같다", "항상 0이 나온다", "인덱스 범위 오류가 난다"], a: 0, w: "best[c − w]가 이미 이번 물건을 반영한 값이 됩니다. 0/1 배낭은 큰 쪽부터, 무한 배낭은 작은 쪽부터 돕니다." },
      { q: "부분 문제가 겹치지 않는 재귀(예: 병합 정렬)에 메모이제이션을 붙이면?", o: ["지수 시간이 다항 시간이 된다", "같은 부분 문제가 다시 나오지 않으므로 이득이 거의 없고 메모리만 쓴다", "틀린 답이 나온다", "재귀 깊이가 절반이 된다"], a: 1, w: "DP의 이득은 '겹치는 부분 문제'에서 나옵니다. 겹치지 않으면 그냥 분할 정복입니다." }
    ],
    ch11: [
      { q: "값이 계속 바뀌는 배열에서 '구간 [l, r)의 최솟값'을 자주 물어야 한다. 가장 적합한 구조는?", o: ["누적 합 배열", "세그먼트 트리", "해시 테이블", "트라이"], a: 1, w: "최솟값은 빼기로 되돌릴 수 없어 누적 합·펜윅 방식이 통하지 않습니다. 결합 법칙만 있으면 되는 세그먼트 트리가 맞습니다." },
      { q: "LRU 캐시에서 해시 맵이 값으로 연결 리스트의 반복자를 저장하는 이유는?", o: ["메모리를 아끼려고", "찾은 원소를 리스트에서 O(1)에 맨 앞으로 옮기기 위해", "리스트를 정렬된 상태로 유지하려고", "해시 충돌을 막으려고"], a: 1, w: "반복자가 있으면 리스트를 훑지 않고 바로 splice할 수 있습니다. std::list 반복자는 다른 원소 변경에도 무효화되지 않습니다." }
    ],
    ch12: [
      { q: "A*에서 휴리스틱이 실제 남은 비용을 과대평가하면?", o: ["탐색이 더 느려질 뿐 결과는 같다", "최적 경로를 보장하지 못한다", "다익스트라와 똑같이 동작한다", "경로를 절대 찾지 못한다"], a: 1, w: "허용적(과대평가하지 않음)이어야 최적성이 보장됩니다. Weighted A*는 이를 알고 일부러 포기해 속도를 얻습니다." },
      { q: "휴리스틱을 h(n) = 0으로 둔 A*는 무엇과 같은가?", o: ["BFS", "다익스트라", "탐욕 최우선 탐색", "DFS"], a: 1, w: "f = g가 되어 출발점에서 가까운 순서로 확장합니다. 모든 간선 비용이 1이면 BFS와 같은 순서가 됩니다." }
    ]
  };
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
