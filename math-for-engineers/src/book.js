(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("me:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("me:" + k, JSON.stringify(v)); } catch (e) {} }
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const TOTAL = {{N_CH}};

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
  function renderDone() {
    $$(".done-btn").forEach(b => { const on = !!done[b.dataset.done]; b.setAttribute("aria-pressed", on); b.textContent = on ? "완료함 ✓" : "이 장을 마쳤어요"; });
    $$(".toc .chk").forEach(c => c.textContent = done[c.dataset.c] ? "✓" : "");
    $("#meter").textContent = Object.values(done).filter(Boolean).length + " / " + TOTAL + " 완료";
  }
  $$(".done-btn").forEach(b => b.addEventListener("click", () => { done[b.dataset.done] = !done[b.dataset.done]; store.set("done", done); renderDone(); }));
  renderDone();

  /* ---------- code highlight + copy ---------- */
  const KW = {
    py: "def|return|if|elif|else|for|while|in|not|and|or|import|from|class|try|except|raise|with|as|None|True|False|break|continue|lambda|pass|is|assert|global|nonlocal|yield",
    c: "int|unsigned|signed|char|short|long|float|double|void|const|static|struct|typedef|return|if|else|for|while|do|break|continue|sizeof|include|define|pragma|auto|bool|true|false|template|typename|namespace|using|class|public|private",
    v: "module|endmodule|input|output|inout|wire|reg|integer|parameter|localparam|always|initial|begin|end|if|else|for|assign|posedge|negedge|signed|case|endcase|default|generate|endgenerate|genvar|function|endfunction"
  };
  const TOKRE = {};
  Object.keys(KW).forEach(l => {
    const com = l === "py" ? "#[^\\n]*" : "\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/";
    const str = l === "py" ? '"""[\\s\\S]*?"""|f?"(?:\\\\.|[^"\\\\\\n])*"|f?\'(?:\\\\.|[^\'\\\\\\n])*\'' : '"(?:\\\\.|[^"\\\\\\n])*"';
    TOKRE[l] = new RegExp("(" + com + ")|(" + str + ")|\\b(" + KW[l] + ")\\b|(\\$\\w+|`\\w+|#\\s*(?:include|define|pragma)\\b)", "g");
  });
  $$("pre code[data-lang]").forEach(el => {
    const re = TOKRE[el.dataset.lang]; if (!re) return;
    const src = el.textContent; let out = "", last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      const cls = m[1] ? "tk-c" : m[2] ? "tk-s" : m[3] ? "tk-k" : "tk-p";
      out += '<span class="' + cls + '">' + esc(m[0]) + "</span>";
      last = re.lastIndex;
    }
    el.innerHTML = out + esc(src.slice(last));
  });
  $$(".cp").forEach(btn => btn.addEventListener("click", () => {
    const code = btn.closest(".code").querySelector("code");
    const ok = () => { btn.textContent = "복사됨"; setTimeout(() => btn.textContent = "복사", 1400); };
    const fallback = () => { const r = document.createRange(); r.selectNodeContents(code); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = "선택됨 · Ctrl+C"; };
    try { navigator.clipboard.writeText(code.textContent).then(ok, fallback); } catch (e) { fallback(); }
  }));

  /* ---------- small math + plotting toolkit ---------- */
  const TAU = 2 * Math.PI;
  const db = v => 20 * Math.log10(Math.max(v, 1e-12));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const f1 = (v, d = 1) => Number(v).toFixed(d);
  function rng(seed) {                         // mulberry32
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function gauss(r, n) {                        // n standard normal samples
    const g = new Float64Array(n);
    for (let i = 0; i < n; i += 2) {
      const u = Math.max(r(), 1e-12), v = r(), m = Math.sqrt(-2 * Math.log(u));
      g[i] = m * Math.cos(TAU * v); if (i + 1 < n) g[i + 1] = m * Math.sin(TAU * v);
    }
    return g;
  }
  /* axes: returns mappers and grid markup */
  function frame(o) {
    const { W, H } = o, L = o.L ?? 44, R = o.R ?? 26, T = o.T ?? 10, B = o.B ?? 26;
    const X = x => L + (x - o.x0) / (o.x1 - o.x0) * (W - L - R);
    const Y = y => T + (1 - (y - o.y0) / (o.y1 - o.y0)) * (H - T - B);
    let g = "";
    (o.yt || []).forEach(v => { g += '<line class="g" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text x="' + (L - 5) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + (o.yf ? o.yf(v) : v) + "</text>"; });
    (o.xt || []).forEach(v => { g += '<line class="g" x1="' + X(v) + '" x2="' + X(v) + '" y1="' + T + '" y2="' + (H - B) + '"/><text x="' + X(v) + '" y="' + (H - B + 15) + '" text-anchor="middle">' + (o.xf ? o.xf(v) : v) + "</text>"; });
    g += '<rect x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (H - T - B) + '" fill="none" class="ax"/>';
    if (o.xlab) g += '<text x="' + (W - R) + '" y="' + (H - 2) + '" text-anchor="end">' + o.xlab + "</text>";
    if (o.ylab) g += '<text class="yl" x="' + (L + 5) + '" y="' + (T + 13) + '">' + o.ylab + "</text>";
    return { X, Y, g, L, R, T, B, W, H, cy: (a, b) => clamp(Y(a), T, H - B) };
  }
  const poly = (xs, ys, F, cls) => {
    let d = "";
    for (let i = 0; i < xs.length; i++) d += (i ? "L" : "M") + F.X(xs[i]).toFixed(1) + " " + clamp(F.Y(ys[i]), F.T - 2, F.H - F.B + 2).toFixed(1);
    return '<path class="' + cls + '" d="' + d + '"/>';
  };
  const bindRange = (id, fmt, fn) => {
    const el = $("#" + id), out = $("#o" + id.charAt(0).toUpperCase() + id.slice(1));
    const upd = () => { if (out) out.textContent = fmt(+el.value); fn(); };
    el.addEventListener("input", upd);
    return upd;
  };
  const segGet = id => { const b = $("#" + id + " button[aria-pressed=true]"); return b ? b.dataset.v : null; };
  const segBind = (id, fn) => $("#" + id).addEventListener("click", e => {
    const b = e.target.closest("button[data-v]"); if (!b) return;
    $$("#" + id + " button").forEach(x => x.setAttribute("aria-pressed", x === b));
    fn();
  });

  /* clipped, unclamped path: pen lifts on non-finite values */
  const clipDef = (id, F) => '<defs><clipPath id="' + id + '"><rect x="' + F.L + '" y="' + F.T + '" width="' + (F.W - F.L - F.R) + '" height="' + (F.H - F.T - F.B) + '"/></clipPath></defs>';
  function pathU(xs, ys, F, cls, clip) {
    let d = "", pen = false;
    for (let i = 0; i < xs.length; i++) {
      const y = F.Y(ys[i]);
      if (!isFinite(y)) { pen = false; continue; }
      d += (pen ? "L" : "M") + F.X(xs[i]).toFixed(1) + " " + clamp(y, -5000, 5000).toFixed(1);
      pen = true;
    }
    return '<path class="' + cls + '" d="' + d + '"' + (clip ? ' clip-path="url(#' + clip + ')"' : "") + "/>";
  }
  const ln = (x1, y1, x2, y2, cls, extra) => '<line class="' + cls + '" x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '"' + (extra || "") + "/>";
  const dot = (x, y, cls, r) => '<circle class="' + cls + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (r || 4) + '"/>';
  const sgn = (v, d) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(d);
  const fmtNum = v => { const a = Math.abs(v); return a !== 0 && (a < 0.001 || a >= 1e5) ? v.toExponential(2) : v.toFixed(a < 1 ? 4 : a < 100 ? 3 : 1); };

  /* ---------- 1-A formula <-> code translation ---------- */
  (function () {
    const S = (top, bot) => '<span class="so"><span>' + top + "</span><b>Σ</b><span>" + bot + "</span></span>";
    const items = [
      { f: S("<var>N</var>−1", "<var>i</var>=0") + " <var>x</var><sub><var>i</var></sub>",
        o: ["s = 0\nfor i in range(N): s += x[i]", "s = 1\nfor i in range(N): s *= x[i]", "s = max(x)"], a: 0,
        w: "Σ는 더하는 루프입니다. 덧셈의 시작값은 0. 곱하는 루프(시작값 1)는 Π입니다." },
      { f: '<span class="so"><span>3</span><b>Π</b><span><var>i</var>=1</span></span> (1 − <var>p</var><sub><var>i</var></sub>)',
        o: ["r = 0\nfor p in ps: r += 1 - p", "r = 1\nfor p in ps: r *= 1 - p", "r = 1 - sum(ps)"], a: 1,
        w: "Π는 곱하는 루프이고 시작값은 1입니다. 세 부품이 모두 고장 나지 않을 확률이 이런 모양입니다(11장)." },
      { f: "Δ<var>x</var><sub><var>k</var></sub> = <var>x</var><sub><var>k</var></sub> − <var>x</var><sub><var>k</var>−1</sub>",
        o: ["d = x[k] - 1", "d = x[k-1] - x[k]", "d = x[k] - x[k-1]"], a: 2,
        w: "아래첨자 k−1은 인덱스 k−1, 즉 바로 전 샘플입니다. x[k] − 1은 값에서 1을 빼는 전혀 다른 계산입니다." },
      { f: "|<var>a</var> − <var>b</var>| &lt; <var>ε</var>",
        o: ["abs(a - b) < eps", "a - b < eps", "abs(a) - abs(b) < eps"], a: 0,
        w: "|…|는 안쪽 전체의 절댓값입니다. 부동소수점 두 값이 '거의 같다'를 검사하는 표준 방법입니다." },
      { f: "√<span class=\"rt\"><var>x</var><sup>2</sup> + <var>y</var><sup>2</sup></span>",
        o: ["sqrt(x^2 + y^2)", "sqrt(x*x + y*y)", "sqrt(x + y) ** 2"], a: 1,
        w: "C와 Python에서 ^는 XOR입니다. 제곱은 x*x나 x**2. 이 식은 벡터의 길이(8장)입니다." },
      { f: "<var>y</var><sub><var>n</var></sub> = " + S("2", "<var>k</var>=0") + " <var>h</var><sub><var>k</var></sub> <var>x</var><sub><var>n</var>−<var>k</var></sub>",
        o: ["y = h[0]*x[0] + h[1]*x[1] + h[2]*x[2]", "y = (h[0] + h[1] + h[2]) * x[n]", "y = h[0]*x[n] + h[1]*x[n-1] + h[2]*x[n-2]"], a: 2,
        w: "k = 0, 1, 2를 차례로 넣어 펼치면 h0·x[n] + h1·x[n−1] + h2·x[n−2]. 최근 입력 3개의 가중합, 즉 3탭 FIR 필터입니다." }
    ];
    const box = $("#xlItems"), picks = {};
    items.forEach((it, i) => {
      const d = document.createElement("div");
      d.className = "item";
      d.innerHTML = '<div class="eq" style="margin:2px 0 10px">' + it.f + '</div><div class="qq" style="margin:0">' +
        it.o.map((o, oi) => '<button type="button" class="opt" data-oi="' + oi + '"><code style="white-space:pre-wrap;background:none;padding:0">' + esc(o) + "</code></button>").join("") +
        '</div><div class="fb" hidden></div>';
      box.appendChild(d);
      d.addEventListener("click", e => {
        const b = e.target.closest(".opt"); if (!b) return;
        const p = +b.dataset.oi; picks[i] = p;
        $$(".opt", d).forEach((x, oi) => { x.classList.toggle("right", oi === p && p === it.a); x.classList.toggle("wrong", oi === p && p !== it.a); });
        const fb = $(".fb", d); fb.hidden = false; fb.className = "fb " + (p === it.a ? "good" : "bad");
        fb.textContent = (p === it.a ? "맞았습니다. " : "다시 보세요. ") + it.w;
        const n = items.filter((x, k) => picks[k] === x.a).length, st = $("#xlScore");
        st.textContent = n + " / " + items.length + " 맞힘" + (n === items.length ? " · 수식을 코드로 읽을 수 있습니다!" : "");
        st.className = "status " + (n === items.length ? "g" : "y");
      });
    });
  })();

  /* ---------- 2-A function playground ---------- */
  (function () {
    const FN = {
      lin: { f: (x, a, b) => a * x + b, s: (a, b) => "y = " + f1(a) + "·x " + sgn(b, 1), n: "a는 기울기(1 갈 때 a만큼 오름), b는 x = 0에서의 높이입니다." },
      quad: { f: (x, a, b) => a * x * x + b, s: (a, b) => "y = " + f1(a) + "·x² " + sgn(b, 1), n: "a가 크면 U자가 좁아지고, 음수면 뒤집힌 ∩자가 됩니다. b는 꼭짓점의 높이입니다." },
      exp: { f: (x, a, b) => b * Math.pow(2, a * x), s: (a, b) => "y = " + f1(b) + "·2^(" + f1(a) + "·x)", n: "a > 0이면 x가 1/a 늘 때마다 두 배(성장), a < 0이면 절반(감쇠). b는 x = 0에서의 값입니다." },
      sin: { f: (x, a, b) => b * Math.sin(a * x), s: (a, b) => "y = " + f1(b) + "·sin(" + f1(a) + "·x)", n: "b는 진폭(물결 높이), a가 크면 같은 폭에 물결이 더 많이 들어갑니다(주기 2π/a)." }
    };
    function draw() {
      const t = segGet("fnType"), a = +$("#fnA").value, b = +$("#fnB").value, x = +$("#fnX").value, fn = FN[t];
      $("#oFnA").textContent = f1(a); $("#oFnB").textContent = f1(b); $("#oFnX").textContent = f1(x);
      const F = frame({ W: 600, H: 300, x0: -4, x1: 4, y0: -4, y1: 4, xt: [-4, -2, 0, 2, 4], yt: [-4, -2, 0, 2, 4], L: 34 });
      let s = clipDef("fnClip", F) + F.g + ln(F.X(-4), F.Y(0), F.X(4), F.Y(0), "m") + ln(F.X(0), F.Y(-4), F.X(0), F.Y(4), "m");
      const xs = [], ys = [];
      for (let i = 0; i <= 600; i++) { const xx = -4 + i / 75; xs.push(xx); ys.push(fn.f(xx, a, b)); }
      s += pathU(xs, ys, F, "a", "fnClip");
      const y = fn.f(x, a, b), inside = Math.abs(y) <= 4;
      if (inside) {
        s += ln(F.X(x), F.Y(0), F.X(x), F.Y(y), "md") + ln(F.X(x), F.Y(y), F.X(0), F.Y(y), "md") + dot(F.X(x), F.Y(y), "fs", 5.5);
      }
      s += '<text class="lbl" x="44" y="24">' + esc(fn.s(a, b)) + "</text>";
      $("#fnSvg").innerHTML = s;
      const st = $("#fnNote");
      st.className = "status " + (inside ? "g" : "y");
      st.textContent = "x = " + f1(x) + "을 넣으면 f(x) = " + fmtNum(y) + (inside ? "" : " (그래프 밖)") + ". " + fn.n;
    }
    ["fnA", "fnB", "fnX"].forEach(id => $("#" + id).addEventListener("input", draw));
    segBind("fnType", draw); draw();
  })();

  /* ---------- 3-A log scale + dB ---------- */
  (function () {
    function draw() {
      const s = +$("#dbR").value, r = Math.pow(10, s), kind = segGet("dbKind"), k = kind === "p" ? 10 : 20, dB = k * s;
      $("#oDbR").textContent = "×" + (r >= 100 ? r.toFixed(0) : r >= 1 ? r.toPrecision(3) : r.toPrecision(2));
      const L = 40, Rr = 560, Xl = v => L + v / 1000 * (Rr - L), Xg = v => L + (Math.log10(v) + 3) / 6 * (Rr - L);
      let g = '<text class="lbl" x="' + L + '" y="22">일반 눈금 (0 ~ 1000): 같은 거리 = 같은 차이</text>' + ln(L, 60, Rr, 60, "k");
      [0, 200, 400, 600, 800, 1000].forEach(v => { g += ln(Xl(v), 55, Xl(v), 65, "k") + '<text x="' + Xl(v) + '" y="80" text-anchor="middle">' + v + "</text>"; });
      g += dot(Xl(Math.min(r, 1000)), 60, "fs", 6.5);
      g += '<text class="lbl" x="' + L + '" y="122">로그 눈금 (0.001 ~ 1000): 같은 거리 = 같은 배수</text>' + ln(L, 160, Rr, 160, "k");
      [0.001, 0.01, 0.1, 1, 10, 100, 1000].forEach(v => {
        g += ln(Xg(v), 154, Xg(v), 166, "k") + '<text x="' + Xg(v) + '" y="182" text-anchor="middle">' + v + "</text>";
        for (let m = 2; m < 10 && v < 1000; m++) g += ln(Xg(v * m), 157, Xg(v * m), 163, "m");
      });
      g += dot(Xg(r), 160, "fs", 6.5);
      $("#dbSvg").innerHTML = g;
      $("#dbRatio").textContent = r.toPrecision(3) + " 배";
      $("#dbVal").textContent = sgn(dB, 2) + " dB";
      $("#dbLog").textContent = s.toFixed(3);
      const st = $("#dbNote");
      st.className = "status " + (Math.abs(s) < 0.005 ? "y" : "g");
      st.textContent = (kind === "p" ? "전력" : "진폭") + "이 " + r.toPrecision(3) + "배 → " + k + " × log₁₀(" + r.toPrecision(3) + ") = " + sgn(dB, 1) + " dB. " +
        (kind === "p" ? "전력은 10배마다 +10 dB, 2배마다 약 +3 dB." : "진폭은 10배마다 +20 dB, 2배마다 약 +6 dB.") +
        (r < 0.01 ? " 일반 눈금에서는 0과 거의 구분되지 않습니다." : "");
    }
    $("#dbR").addEventListener("input", draw); segBind("dbKind", draw); draw();
  })();

  /* ---------- 4-A unit circle ---------- */
  (function () {
    let th = 40, playing = false, last = null;
    const btn = $("#ucPlay"), sl = $("#ucT");
    function draw() {
      const rad = th * Math.PI / 180, c = Math.cos(rad), sn = Math.sin(rad);
      $("#oUcT").textContent = Math.round(th) + "°";
      const cx = 120, cy = 120, R = 88, W0 = 250, W1 = 585, Xw = d => W0 + d / 720 * (W1 - W0);
      let s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" class="m"/>' + ln(cx - R - 14, cy, cx + R + 14, cy, "g") + ln(cx, cy - R - 14, cx, cy + R + 14, "g");
      const px = cx + R * c, py = cy - R * sn;
      s += ln(cx, cy, px, py, "a", ' marker-end="url(#arwa)"') + ln(px, py, px, cy, "s") + ln(cx, cy, px, cy, "a") + dot(px, py, "fk", 5);
      s += '<path class="m" d="M' + (cx + 22) + " " + cy + " A22 22 0 " + ((th % 360) > 180 ? 1 : 0) + " 0 " + (cx + 22 * c).toFixed(1) + " " + (cy - 22 * sn).toFixed(1) + '"/>';
      // unrolled waves
      s += ln(W0, cy, W1, cy, "g") + ln(W0, cy - R, W1, cy - R, "g") + ln(W0, cy + R, W1, cy + R, "g");
      [0, 90, 180, 270, 360, 450, 540, 630, 720].forEach(d => { s += ln(Xw(d), cy - R - 6, Xw(d), cy + R + 6, "g") + '<text x="' + Xw(d) + '" y="' + (cy + R + 24) + '" text-anchor="middle">' + d + "°</text>"; });
      let dc = "", ds = "";
      for (let d = 0; d <= 720; d += 4) { const rr = d * Math.PI / 180; dc += (d ? "L" : "M") + Xw(d).toFixed(1) + " " + (cy - R * Math.cos(rr)).toFixed(1); ds += (d ? "L" : "M") + Xw(d).toFixed(1) + " " + (cy - R * Math.sin(rr)).toFixed(1); }
      s += '<path class="a2" d="' + dc + '"/><path class="s" d="' + ds + '"/>';
      s += ln(px, py, Xw(th), py, "md") + ln(Xw(th), cy - R - 6, Xw(th), cy + R + 6, "m") + dot(Xw(th), py, "fs", 5) + dot(Xw(th), cy - R * c, "fa", 5);
      s += '<text x="' + (W0 - 6) + '" y="' + (cy - R + 4) + '" text-anchor="end">+1</text><text x="' + (W0 - 6) + '" y="' + (cy + 4) + '" text-anchor="end">0</text><text x="' + (W0 - 6) + '" y="' + (cy + R + 4) + '" text-anchor="end">−1</text>';
      $("#ucSvg").innerHTML = s;
      $("#ucRad").textContent = (rad).toFixed(3) + " rad (" + (th / 180).toFixed(2) + "π)";
      $("#ucCos").textContent = c.toFixed(3); $("#ucSin").textContent = sn.toFixed(3);
      const q = Math.floor((th % 360) / 90) + 1;
      $("#ucNote").textContent = (th % 90 === 0 ? "축 위에 있습니다." : q + "사분면: cos " + (c >= 0 ? "+" : "−") + ", sin " + (sn >= 0 ? "+" : "−")) + (th >= 360 ? " (한 바퀴를 넘어 다시 반복)" : "");
    }
    function tick(ts) {
      if (!playing) { last = null; return; }
      if (last !== null) { th = (th + (ts - last) / 1000 * 90) % 720; sl.value = Math.round(th); }
      last = ts; draw(); requestAnimationFrame(tick);
    }
    btn.addEventListener("click", () => { playing = !playing; btn.setAttribute("aria-pressed", playing); btn.textContent = playing ? "일시 정지" : "재생"; if (playing) requestAnimationFrame(tick); });
    sl.addEventListener("input", () => { th = +sl.value; draw(); }); draw();
  })();

  /* ---------- 5-A slope magnifier ---------- */
  (function () {
    const FN = {
      sq: { f: x => x * x, d: x => 2 * x, y0: -1.5, y1: 9, yt: [0, 2, 4, 6, 8] },
      sin: { f: Math.sin, d: Math.cos, y0: -1.6, y1: 1.6, yt: [-1, 0, 1] },
      cub: { f: x => 0.3 * x * x * x - x, d: x => 0.9 * x * x - 1, y0: -5.5, y1: 5.5, yt: [-4, -2, 0, 2, 4] }
    };
    function draw() {
      const fn = FN[segGet("slFn")], x = +$("#slX").value, h = Math.pow(10, -(+$("#slH").value));
      $("#oSlX").textContent = f1(x, 2); $("#oSlH").textContent = "h = " + (h >= 0.01 ? h.toFixed(3) : h.toExponential(1));
      const F = frame({ W: 600, H: 280, x0: -3, x1: 3, y0: fn.y0, y1: fn.y1, xt: [-3, -2, -1, 0, 1, 2, 3], yt: fn.yt, L: 34 });
      let s = clipDef("slClip", F) + F.g;
      const xs = [], ys = [];
      for (let i = 0; i <= 300; i++) { const xx = -3 + i / 50; xs.push(xx); ys.push(fn.f(xx)); }
      s += pathU(xs, ys, F, "k", "slClip");
      const y = fn.f(x), y2 = fn.f(x + h), sec = (y2 - y) / h, tr = fn.d(x);
      s += pathU([-3, 3], [y + sec * (-3 - x), y + sec * (3 - x)], F, "s", "slClip");
      s += pathU([-3, 3], [y + tr * (-3 - x), y + tr * (3 - x)], F, "a", "slClip");
      s += dot(F.X(x), F.Y(y), "fk", 5) + dot(F.X(x + h), F.Y(y2), "fs", 4.5);
      $("#slSvg").innerHTML = s;
      $("#slSec").textContent = sec.toFixed(5); $("#slTrue").textContent = tr.toFixed(5);
      const err = Math.abs(sec - tr); $("#slErr").textContent = err < 1e-4 ? err.toExponential(1) : err.toFixed(4);
      const st = $("#slNote");
      st.className = "status " + (err < 0.01 ? "g" : "y");
      st.textContent = (Math.abs(tr) < 0.08 ? "접선이 거의 수평입니다. 곡선의 꼭대기나 바닥 근처라는 뜻입니다. " : "") +
        (err < 0.01 ? "h가 충분히 작아 할선이 접선과 거의 겹칩니다. 이 극한값이 미분입니다." : "h를 더 줄여 보세요. h를 10배 줄이면 차이도 대략 10배 줄어듭니다.");
    }
    ["slX", "slH"].forEach(id => $("#" + id).addEventListener("input", draw)); segBind("slFn", draw); draw();
  })();

  /* ---------- 6-A Riemann sums ---------- */
  (function () {
    const cur = t => 0.5 + 2.5 * Math.exp(-(t - 1.5) * (t - 1.5) / 0.2) + (t >= 4 && t < 8 ? 1.0 : 0);
    const curEx = (() => { let s = 0; const n = 200000, dx = 10 / n; for (let i = 0; i < n; i++) s += cur((i + 0.5) * dx) * dx; return s; })();
    const FN = {
      sin: { f: Math.sin, a: 0, b: Math.PI, ex: 2, y1: 1.2, xt: [0, 1, 2, 3], yt: [0, 0.5, 1], u: "" },
      sq: { f: x => x * x, a: 0, b: 2, ex: 8 / 3, y1: 4.4, xt: [0, 0.5, 1, 1.5, 2], yt: [0, 1, 2, 3, 4], u: "" },
      cur: { f: cur, a: 0, b: 10, ex: curEx, y1: 3.4, xt: [0, 2, 4, 6, 8, 10], yt: [0, 1, 2, 3], u: " A·s", xf: v => v + "s", yl: "전류 [A]" }
    };
    function draw() {
      const fn = FN[segGet("rmFn")], m = segGet("rmM"), N = +$("#rmN").value;
      $("#oRmN").textContent = N;
      const F = frame({ W: 600, H: 260, x0: fn.a, x1: fn.b, y0: 0, y1: fn.y1, xt: fn.xt, yt: fn.yt, xf: fn.xf, ylab: fn.yl, L: 36 });
      let s = F.g, sum = 0;
      const dx = (fn.b - fn.a) / N;
      for (let i = 0; i < N; i++) {
        const x0 = fn.a + i * dx, x1 = x0 + dx;
        if (m === "T") {
          const ya = fn.f(x0), yb = fn.f(x1); sum += (ya + yb) / 2 * dx;
          s += '<path class="zone" style="stroke:var(--accent);stroke-width:' + (N > 60 ? 0.3 : 1) + '" d="M' + F.X(x0) + " " + F.Y(0) + "L" + F.X(x0) + " " + F.Y(ya) + "L" + F.X(x1) + " " + F.Y(yb) + "L" + F.X(x1) + " " + F.Y(0) + 'Z"/>';
        } else {
          const yh = fn.f(m === "L" ? x0 : x0 + dx / 2); sum += yh * dx;
          s += '<rect class="zone" style="stroke:var(--accent);stroke-width:' + (N > 60 ? 0.3 : 1) + '" x="' + F.X(x0) + '" y="' + F.Y(yh) + '" width="' + (F.X(x1) - F.X(x0)) + '" height="' + (F.Y(0) - F.Y(yh)) + '"/>';
        }
      }
      const xs = [], ys = [];
      for (let i = 0; i <= 500; i++) { const xx = fn.a + (fn.b - fn.a) * i / 500; xs.push(xx); ys.push(fn.f(xx)); }
      s += poly(xs, ys, F, "k");
      $("#rmSvg").innerHTML = s;
      const err = sum - fn.ex, pct = 100 * err / fn.ex;
      $("#rmSum").textContent = sum.toFixed(4) + fn.u; $("#rmEx").textContent = fn.ex.toFixed(4) + fn.u;
      $("#rmErr").textContent = (err >= 0 ? "+" : "") + err.toFixed(4) + " (" + (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%)";
      const st = $("#rmNote");
      st.className = "status " + (Math.abs(pct) < 0.5 ? "g" : Math.abs(pct) < 5 ? "y" : "r");
      st.textContent = "조각 " + N + "개, 폭 Δx = " + dx.toFixed(3) + ". " +
        (Math.abs(pct) < 0.5 ? "오차 0.5% 미만: 막대들이 넓이를 거의 정확히 덮었습니다." : "조각을 늘리거나 '가운데'·'사다리꼴'로 바꿔 보세요.") +
        (fn === FN.cur ? " 이 넓이(A·s)를 3.6으로 나누면 mAh입니다." : "");
    }
    $("#rmN").addEventListener("input", draw); segBind("rmFn", draw); segBind("rmM", draw); draw();
  })();

  /* ---------- 7-A Euler integrator ---------- */
  (function () {
    function draw() {
      const al = +$("#euR").value;
      $("#oEuR").textContent = al.toFixed(2);
      const F = frame({ W: 600, H: 250, x0: 0, x1: 6, y0: -1.5, y1: 3, xt: [0, 1, 2, 3, 4, 5, 6], yt: [-1, 0, 0.632, 1, 2, 3], xf: v => v + "τ", yf: v => v === 0.632 ? "63%" : v, L: 40 });
      let s = clipDef("euClip", F) + F.g + ln(F.X(0), F.Y(1), F.X(6), F.Y(1), "md");
      const xs = [], ys = [];
      for (let i = 0; i <= 300; i++) { const t = i / 50; xs.push(t); ys.push(1 - Math.exp(-t)); }
      s += poly(xs, ys, F, "a");
      const tx = [0], vy = [0]; let V = 0, emax = 0;
      for (let k = 1; k * al <= 6 + 1e-9; k++) {
        V = V + al * (1 - V); tx.push(k * al); vy.push(V);
        if (k * al <= 5 + 1e-9) emax = Math.max(emax, Math.abs(V - (1 - Math.exp(-k * al))));
      }
      s += pathU(tx, vy, F, "s", "euClip");
      tx.forEach((t, i) => { const yy = F.Y(vy[i]); if (yy > F.T - 2 && yy < F.H - F.B + 2) s += dot(F.X(t), yy, "fs", 4); });
      $("#euSvg").innerHTML = s;
      $("#euF").textContent = (1 - al).toFixed(2) + " (|·| = " + Math.abs(1 - al).toFixed(2) + ")";
      $("#euE").textContent = emax.toFixed(3);
      const st = $("#euNote");
      if (al <= 0.1 + 1e-9) { st.className = "status g"; st.textContent = "dt가 τ의 1/10 이하: 계산값이 정확한 곡선 위에 거의 그대로 올라갑니다."; }
      else if (al < 1 - 1e-9) { st.className = "status g"; st.textContent = "α < 1: 매 걸음 오차가 " + (1 - al).toFixed(2) + "배로 줄어 모자란 쪽에서 다가갑니다. 간격이 클수록 오차가 큽니다."; }
      else if (Math.abs(al - 1) < 1e-9) { st.className = "status y"; st.textContent = "α = 1: 첫 걸음에 목표로 순간이동합니다. 수렴은 하지만 실제 곡선과는 전혀 다릅니다."; }
      else if (al < 2 - 1e-9) { st.className = "status y"; st.textContent = "1 < α < 2: 오차에 음수(" + (1 - al).toFixed(2) + ")가 곱해져 목표를 지나쳤다 돌아오기를 반복합니다. 실제 회로에는 없는 가짜 진동입니다."; }
      else if (Math.abs(al - 2) < 1e-9) { st.className = "status r"; st.textContent = "α = 2: 오차가 매번 −1배. 영원히 0과 2 사이를 오갑니다."; }
      else { st.className = "status r"; st.textContent = "α > 2: |1 − α| > 1이라 오차가 매 걸음 커집니다. 발산! 루프 주기를 줄여야 합니다."; }
    }
    $("#euR").addEventListener("input", draw); draw();
  })();

  /* ---------- 8-A dot product ---------- */
  (function () {
    function draw() {
      const A = +$("#dtA").value, B = +$("#dtB").value, la = +$("#dtLa").value, lb = +$("#dtLb").value;
      $("#oDtA").textContent = A + "°"; $("#oDtB").textContent = B + "°"; $("#oDtLa").textContent = la.toFixed(2); $("#oDtLb").textContent = lb.toFixed(2);
      const ra = A * Math.PI / 180, rb = B * Math.PI / 180;
      const a = [la * Math.cos(ra), la * Math.sin(ra)], b = [lb * Math.cos(rb), lb * Math.sin(rb)];
      const ox = 300, oy = 160, S = 70, P = (x, y) => [ox + x * S, oy - y * S];
      let s = "";
      for (let i = -4; i <= 4; i++) s += ln(ox + i * S, 0, ox + i * S, 320, "g");
      for (let j = -2; j <= 2; j++) s += ln(0, oy - j * S, 600, oy - j * S, "g");
      s += ln(0, oy, 600, oy, "m") + ln(ox, 0, ox, 320, "m");
      const d = a[0] * b[0] + a[1] * b[1], bu = [b[0] / lb, b[1] / lb], pr = d / lb, pp = [bu[0] * pr, bu[1] * pr];
      // line along b's direction, then the shadow
      s += ln(...P(-bu[0] * 3, -bu[1] * 3), ...P(bu[0] * 3, bu[1] * 3), "md");
      s += ln(...P(a[0], a[1]), ...P(pp[0], pp[1]), "md") + "";
      s += ln(...P(0, 0), ...P(b[0], b[1]), "s", ' marker-end="url(#arws)"') + ln(...P(0, 0), ...P(pp[0], pp[1]), "k", ' style="stroke-width:7;opacity:.35"') + ln(...P(0, 0), ...P(a[0], a[1]), "a", ' marker-end="url(#arwa)"');
      const ta = P(a[0] * 1.08, a[1] * 1.08), tb0 = P(b[0], b[1]), tb = [tb0[0] - bu[1] * 16 - 4, tb0[1] - bu[0] * 16 + 4];
      s += '<text class="lbl" x="' + ta[0] + '" y="' + ta[1] + '" style="fill:var(--accent)">a</text><text class="lbl" x="' + tb[0] + '" y="' + tb[1] + '" style="fill:var(--signal)">b</text>';
      $("#dtSvg").innerHTML = s;
      let th = Math.abs(A - B) % 360; if (th > 180) th = 360 - th;
      $("#dtDot").textContent = d.toFixed(3);
      $("#dtCos").textContent = (la * lb * Math.cos(th * Math.PI / 180)).toFixed(3);
      $("#dtAng").textContent = th + "°";
      const st = $("#dtNote");
      if (Math.abs(d) < 0.03) { st.className = "status y"; st.textContent = "거의 직각: 내적 ≈ 0. a는 b 방향으로 그림자가 없습니다."; }
      else if (d > 0) { st.className = "status g"; st.textContent = "같은 쪽(θ < 90°): 내적 > 0. a를 b 방향으로 투영한 그림자 길이 = a·b / |b| = " + pr.toFixed(3); }
      else { st.className = "status r"; st.textContent = "반대쪽(θ > 90°): 내적 < 0. 그림자가 b의 반대 방향으로 생깁니다(" + pr.toFixed(3) + ")."; }
    }
    ["dtA", "dtB", "dtLa", "dtLb"].forEach(id => $("#" + id).addEventListener("input", draw)); draw();
  })();

  /* ---------- 9-A matrix transformer ---------- */
  (function () {
    const ids = ["mxA", "mxB", "mxC", "mxD"];
    const PRE = { id: [1, 0, 0, 1], rot: [0.866, -0.5, 0.5, 0.866], scale: [2, 0, 0, 1], shear: [1, 1, 0, 1], flip: [-1, 0, 0, 1], flat: [1, 2, 0.5, 1] };
    function draw() {
      const [a, b, c, d] = ids.map(id => +$("#" + id).value);
      ids.forEach((id, i) => { $("#o" + id.charAt(0).toUpperCase() + id.slice(1)).textContent = [a, b, c, d][i].toFixed(2); });
      const ox = 300, oy = 190, S = 50, P = (x, y) => [ox + (a * x + b * y) * S, oy - (c * x + d * y) * S], O = (x, y) => [ox + x * S, oy - y * S];
      let s = '<defs><clipPath id="mxClip"><rect x="0" y="0" width="600" height="340"/></clipPath></defs><g clip-path="url(#mxClip)">';
      for (let i = -6; i <= 6; i++) { s += ln(...O(i, -4), ...O(i, 4), "g") + ln(...O(-6, i), ...O(6, i), "g"); }
      for (let i = -8; i <= 8; i++) { s += ln(...P(i, -8), ...P(i, 8), "a2", ' style="stroke-width:.8"') + ln(...P(-8, i), ...P(8, i), "a2", ' style="stroke-width:.8"'); }
      const house = [[0, 0], [1, 0], [1, 1], [0.5, 1.6], [0, 1]];
      const pth = f => "M" + house.map(p => f(p[0], p[1]).map(v => v.toFixed(1)).join(" ")).join("L") + "Z";
      s += '<path class="m" style="stroke-dasharray:4 3" d="' + pth(O) + '"/>';
      s += '<path class="zone" style="stroke:var(--ink);stroke-width:1.6" d="' + pth(P) + '"/>';
      s += ln(...O(0, 0), ...P(1, 0), "a", ' style="stroke-width:3" marker-end="url(#arwa)"') + ln(...O(0, 0), ...P(0, 1), "s", ' style="stroke-width:3" marker-end="url(#arws)"');
      s += "</g>";
      $("#mxSvg").innerHTML = s;
      const det = a * d - b * c;
      $("#mxDet").textContent = det.toFixed(3); $("#mxArea").textContent = "1 → " + Math.abs(det).toFixed(3);
      const st = $("#mxNote");
      if (Math.abs(det) < 0.02) { st.className = "status r"; st.textContent = "det ≈ 0: 평면 전체가 직선(또는 점)으로 짓눌렸습니다. 어디서 왔는지 되돌릴 수 없으니 역행렬이 없습니다."; }
      else if (det < 0) { st.className = "status y"; st.textContent = "det < 0: 모양이 거울상으로 뒤집혔습니다. 넓이는 " + Math.abs(det).toFixed(2) + "배."; }
      else { st.className = "status g"; st.textContent = "넓이가 " + det.toFixed(2) + "배가 됩니다. 파란 화살표 = 첫째 열 (" + a.toFixed(2) + ", " + c.toFixed(2) + "), 주황 화살표 = 둘째 열 (" + b.toFixed(2) + ", " + d.toFixed(2) + ")."; }
    }
    ids.forEach(id => $("#" + id).addEventListener("input", draw));
    $("#mxPre").addEventListener("click", e => {
      const btn = e.target.closest("button[data-p]"); if (!btn) return;
      PRE[btn.dataset.p].forEach((v, i) => { $("#" + ids[i]).value = v; }); draw();
    });
    draw();
  })();

  /* ---------- 10-A complex powers ---------- */
  (function () {
    function draw() {
      const r = +$("#cxR").value, tdeg = +$("#cxT").value, n = +$("#cxN").value, t = tdeg * Math.PI / 180;
      $("#oCxR").textContent = r.toFixed(3); $("#oCxT").textContent = tdeg + "°"; $("#oCxN").textContent = n;
      const ox = 300, oy = 160, S = 115, P = (x, y) => [ox + x * S, oy - y * S];
      let s = '<defs><clipPath id="cxClip"><rect x="0" y="0" width="600" height="320"/></clipPath></defs><g clip-path="url(#cxClip)">';
      s += ln(0, oy, 600, oy, "m") + ln(ox, 0, ox, 320, "m") + '<circle class="md" cx="' + ox + '" cy="' + oy + '" r="' + S + '"/>';
      s += '<text x="' + (ox + S + 4) + '" y="' + (oy - 4) + '">1</text><text x="' + (ox + 4) + '" y="' + (oy - S - 4) + '">j</text><text x="' + (ox - S - 18) + '" y="' + (oy - 4) + '">−1</text>';
      let d = "", px = 0, py = 0;
      for (let k = 0; k <= n; k++) {
        const m = Math.pow(r, k), x = m * Math.cos(k * t), y = m * Math.sin(k * t), p = P(x, y);
        d += (k ? "L" : "M") + clamp(p[0], -3000, 3000).toFixed(1) + " " + clamp(p[1], -3000, 3000).toFixed(1);
        s += dot(clamp(p[0], -50, 650), clamp(p[1], -50, 370), k === n ? "fs" : "fa", k === n ? 6 : 3.5);
        px = x; py = y;
      }
      s += '<path class="a2" d="' + d + '"/>' + ln(...P(0, 0), ...P(px, py), "s", ' marker-end="url(#arws)"') + "</g>";
      $("#cxSvg").innerHTML = s;
      $("#cxW").textContent = (r * Math.cos(t)).toFixed(3) + " " + (Math.sin(t) >= 0 ? "+ j" : "− j") + Math.abs(r * Math.sin(t)).toFixed(3);
      $("#cxRn").textContent = fmtNum(Math.pow(r, n));
      $("#cxTn").textContent = (n * tdeg) + "° (= " + ((n * tdeg) % 360) + "°)";
      const st = $("#cxNote");
      if (Math.abs(r - 1) < 0.0026) { st.className = "status y"; st.textContent = "|w| = 1: 곱할 때마다 크기는 그대로, 각도만 " + tdeg + "°씩 더해져 원 위를 돕니다."; }
      else if (r < 1) { st.className = "status g"; st.textContent = "|w| < 1: 안쪽으로 감기는 나선. 곱할수록 0으로 사라집니다(안정한 시스템, 감쇠 진동)."; }
      else { st.className = "status r"; st.textContent = "|w| > 1: 바깥으로 풀리는 나선. 곱할수록 커집니다(불안정, 발산하는 진동)."; }
    }
    ["cxR", "cxT", "cxN"].forEach(id => $("#" + id).addEventListener("input", draw)); draw();
  })();

  /* ---------- 11-A Bayes alarm ---------- */
  (function () {
    function draw() {
      const base = +$("#byBase").value / 100, sens = +$("#bySens").value / 100, fa = +$("#byFa").value / 100;
      $("#oByBase").textContent = (base * 100).toFixed(1) + "%"; $("#oBySens").textContent = Math.round(sens * 100) + "%"; $("#oByFa").textContent = (fa * 100).toFixed(1) + "%";
      const tp = 1000 * base * sens, fn = 1000 * base - tp, fp = 1000 * (1 - base) * fa, post = tp / (tp + fp);
      const nTP = Math.round(tp), nFN = Math.round(1000 * base) - nTP, nFP = Math.round(fp);
      let s = "";
      for (let i = 0; i < 1000; i++) {
        const c = i % 40, r = Math.floor(i / 40);
        const cls = i < nTP ? "fa" : i < nTP + nFN ? "fb" : i < nTP + nFN + nFP ? "fs" : "";
        s += '<circle cx="' + (14 + c * 14.6).toFixed(1) + '" cy="' + (12 + r * 9.8).toFixed(1) + '" r="3.7"' + (cls ? ' class="' + cls + '"' : ' style="fill:var(--rule)"') + "/>";
      }
      $("#bySvg").innerHTML = s;
      $("#byAl").textContent = (tp + fp).toFixed(1); $("#byTp").textContent = tp.toFixed(1); $("#byPost").textContent = (100 * post).toFixed(1) + "%";
      const st = $("#byNote");
      st.className = "status " + (post >= 0.8 ? "g" : post >= 0.4 ? "y" : "r");
      st.textContent = "경보 " + (tp + fp).toFixed(1) + "대 중 진짜 결함은 " + tp.toFixed(1) + "대. 경보가 울렸을 때 결함일 확률은 " + (100 * post).toFixed(1) + "%" +
        (fp > tp ? " — 헛경보(주황)가 진짜 경보(파랑)보다 많습니다." : ".") + " 놓친 결함(빨강)은 " + fn.toFixed(1) + "대.";
    }
    ["byBase", "bySens", "byFa"].forEach(id => $("#" + id).addEventListener("input", draw)); draw();
  })();

  /* ---------- 12-A averaging ---------- */
  (function () {
    let seed = 11;
    const TR = 3000, BINS = 80, LO = -4, HI = 4;
    function hist(v) { const h = new Array(BINS).fill(0); v.forEach(x => { const k = Math.floor((x - LO) / (HI - LO) * BINS); if (k >= 0 && k < BINS) h[k]++; }); return h; }
    function draw() {
      const s = +$("#avN").value, N = Math.pow(2, s);
      $("#oAvN").textContent = N;
      const r = rng(seed), single = gauss(r, TR), g = gauss(r, TR * N), avg = new Float64Array(TR);
      for (let i = 0; i < TR; i++) { let a = 0; for (let k = 0; k < N; k++) a += g[i * N + k]; avg[i] = a / N; }
      const hs = hist(single), ha = hist(avg), top = Math.max(...ha, ...hs) * 1.08;
      const F = frame({ W: 600, H: 260, x0: LO, x1: HI, y0: 0, y1: top, xt: [-4, -3, -2, -1, 0, 1, 2, 3, 4], yt: [], xf: v => v + "σ", L: 14, R: 14 });
      let out = F.g;
      const bw = (HI - LO) / BINS;
      for (let k = 0; k < BINS; k++) {
        const x0 = LO + k * bw;
        if (hs[k]) out += '<rect style="fill:var(--muted);opacity:.45" x="' + F.X(x0).toFixed(1) + '" y="' + F.Y(hs[k]).toFixed(1) + '" width="' + (F.X(x0 + bw) - F.X(x0) - 0.6).toFixed(1) + '" height="' + (F.Y(0) - F.Y(hs[k])).toFixed(1) + '"/>';
        if (ha[k]) out += '<rect class="fa" style="opacity:.8" x="' + F.X(x0).toFixed(1) + '" y="' + F.Y(ha[k]).toFixed(1) + '" width="' + (F.X(x0 + bw) - F.X(x0) - 0.6).toFixed(1) + '" height="' + (F.Y(0) - F.Y(ha[k])).toFixed(1) + '"/>';
      }
      $("#avSvg").innerHTML = out;
      let m = 0; avg.forEach(v => m += v); m /= TR; let vv = 0; avg.forEach(v => vv += (v - m) * (v - m));
      const sd = Math.sqrt(vv / TR);
      $("#avMeas").textContent = sd.toFixed(3); $("#avTh").textContent = (1 / Math.sqrt(N)).toFixed(3);
      $("#avBits").textContent = "+" + (s / 2).toFixed(1) + " 비트";
      $("#avNote").textContent = "N = " + N + ": 잡음 1/√" + N + " = " + (1 / Math.sqrt(N)).toFixed(3) + "배, 대신 측정 시간 " + N + "배";
    }
    $("#avN").addEventListener("input", draw);
    $("#avNew").addEventListener("click", () => { seed = (seed * 7919 + 13) >>> 0; draw(); });
    draw();
  })();

  /* ---------- 13-A Kalman filter ---------- */
  (function () {
    let seed = 1;
    const T = 60, dt = 0.1, n = 600, SO = 0.1;
    let base = null;
    function regen() {
      const r = rng(seed); base = { wo: gauss(r, n), wz: gauss(r, n) };
    }
    function draw() {
      const sz = +$("#kfZ").value, bias = +$("#kfB").value, qe = +$("#kfQ").value, qs = Math.pow(10, qe), view = segGet("kfView");
      $("#oKfZ").textContent = sz.toFixed(2) + " m"; $("#oKfB").textContent = "+" + bias.toFixed(3) + " m/s";
      $("#oKfQ").textContent = "×" + (qs >= 1 ? Math.round(qs) : qs.toPrecision(1));
      const t = new Float64Array(n), xt = new Float64Array(n), z = new Float64Array(n), u = new Float64Array(n), est = new Float64Array(n), dead = new Float64Array(n);
      for (let k = 0; k < n; k++) {
        t[k] = k * dt;
        const v = 0.5 + 0.3 * Math.sin(TAU * t[k] / 20);
        if (k) xt[k] = xt[k - 1] + (0.5 + 0.3 * Math.sin(TAU * t[k - 1] / 20)) * dt;
        u[k] = v + bias + SO * base.wo[k];
        z[k] = xt[k] + sz * base.wz[k];
      }
      const Q = qs * (SO * dt) * (SO * dt), R = sz * sz;
      let x = z[0], P = R, d = z[0], K = 0;
      for (let k = 0; k < n; k++) {
        if (k) { x += u[k - 1] * dt; P += Q; d += u[k - 1] * dt; }
        K = P / (P + R); x += K * (z[k] - x); P *= (1 - K);
        est[k] = x; dead[k] = d;
      }
      const rms = f => { let s = 0; for (let k = 0; k < n; k++) { const e = f(k); s += e * e; } return Math.sqrt(s / n); };
      const rm = rms(k => z[k] - xt[k]), rd = rms(k => dead[k] - xt[k]), rk = rms(k => est[k] - xt[k]);
      let F, s;
      const ts = Array.from(t);
      if (view === "pos") {
        let lo = Infinity, hi = -Infinity; for (let k = 0; k < n; k++) { lo = Math.min(lo, xt[k], dead[k]); hi = Math.max(hi, xt[k], dead[k]); }
        lo = Math.floor(lo - 1.5 * sz - 0.5); hi = Math.ceil(hi + 1.5 * sz + 0.5);
        const step = hi - lo > 30 ? 10 : 5, yt = []; for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) yt.push(v);
        F = frame({ W: 600, H: 280, x0: 0, x1: T, y0: lo, y1: hi, xt: [0, 10, 20, 30, 40, 50, 60], yt, xf: v => v + "s", yf: v => v + "m", L: 42 });
        s = clipDef("kfClip", F) + F.g;
        for (let k = 0; k < n; k += 2) { const yy = F.Y(z[k]); if (yy > F.T && yy < F.H - F.B) s += '<circle style="fill:var(--muted);opacity:.45" cx="' + F.X(t[k]).toFixed(1) + '" cy="' + yy.toFixed(1) + '" r="1.6"/>'; }
        s += pathU(ts, Array.from(xt), F, "k", "kfClip") + pathU(ts, Array.from(dead), F, "b", "kfClip") + pathU(ts, Array.from(est), F, "a", "kfClip");
      } else {
        const lim = Math.max(0.5, Math.ceil(Math.max(2.2 * sz, rd * 1.6) * 2) / 2);
        F = frame({ W: 600, H: 280, x0: 0, x1: T, y0: -lim, y1: lim, xt: [0, 10, 20, 30, 40, 50, 60], yt: [-lim, -lim / 2, 0, lim / 2, lim], xf: v => v + "s", yf: v => v + "m", L: 46 });
        s = clipDef("kfClip", F) + F.g;
        for (let k = 0; k < n; k += 2) { const yy = F.Y(z[k] - xt[k]); if (yy > F.T && yy < F.H - F.B) s += '<circle style="fill:var(--muted);opacity:.45" cx="' + F.X(t[k]).toFixed(1) + '" cy="' + yy.toFixed(1) + '" r="1.6"/>'; }
        s += ln(F.X(0), F.Y(0), F.X(T), F.Y(0), "k") + pathU(ts, Array.from(dead, (v, k) => v - xt[k]), F, "b", "kfClip") + pathU(ts, Array.from(est, (v, k) => v - xt[k]), F, "a", "kfClip");
      }
      $("#kfSvg").innerHTML = s;
      $("#kfRm").textContent = rm.toFixed(3) + " m"; $("#kfRd").textContent = rd.toFixed(3) + " m"; $("#kfRk").textContent = rk.toFixed(3) + " m"; $("#kfK").textContent = K.toFixed(4);
      const best = Math.min(rm, rd);
      $("#kfNote").textContent = rk < best ? "칼만 추정이 둘 중 나은 쪽보다 " + (best / rk).toFixed(1) + "배 정확합니다." : "칼만 추정이 단일 센서보다 나쁩니다. Q 배수를 조정해 보세요.";
    }
    ["kfZ", "kfB", "kfQ"].forEach(id => $("#" + id).addEventListener("input", draw));
    segBind("kfView", draw);
    $("#kfNew").addEventListener("click", () => { seed = (seed * 48271 + 7) >>> 0; regen(); draw(); });
    regen(); draw();
  })();

  /* ---------- quizzes ---------- */
  const Q = {
    ch1: [
      { q: "수식 x_{i−1}(x 아래첨자 i−1)을 코드로 옮기면?", o: ["x[i] - 1", "x[i-1]", "x * (i - 1)", "x ** (i - 1)"], a: 1, w: "아래첨자는 배열 인덱스입니다. i−1번째, 즉 바로 앞의 원소입니다." },
      { q: "C 코드에서 x의 제곱을 x^2로 쓰면 어떻게 되나요?", o: ["제곱이 계산된다", "비트 XOR가 되어 엉뚱한 값이 나온다", "컴파일 에러가 난다", "2배가 된다"], a: 1, w: "C와 Python의 ^는 비트 XOR 연산자입니다. 컴파일이 되니 더 위험합니다. x*x를 쓰세요." }
    ],
    ch2: [
      { q: "ADC가 20°C에서 1000, 70°C에서 2000을 읽었습니다. 1500일 때 온도는? (직선 가정)", o: ["35°C", "45°C", "50°C", "55°C"], a: 1, w: "기울기 50/1000 = 0.05 °C/count. 20 + 0.05 × (1500 − 1000) = 45°C. 딱 가운데이니 20과 70의 평균이기도 합니다." },
      { q: "그래프 f(x − 3)은 f(x)에 비해 어떻게 움직이나요?", o: ["왼쪽으로 3", "오른쪽으로 3", "위로 3", "아래로 3"], a: 1, w: "원래 x = 0에서 일어나던 일이 이제 x = 3에서 일어납니다. 3만큼 늦게, 즉 오른쪽으로 갑니다." }
    ],
    ch3: [
      { q: "5000가지 상태를 구분하려면 최소 몇 비트가 필요한가요?", o: ["12비트", "13비트", "14비트", "5000비트"], a: 1, w: "log₂ 5000 ≈ 12.3. 2¹² = 4096으로는 부족하고 2¹³ = 8192면 충분하므로 13비트입니다." },
      { q: "신호 전압이 1/10로 줄었습니다. 몇 dB인가요?", o: ["−10 dB", "−20 dB", "−3 dB", "−1 dB"], a: 1, w: "전압(진폭) 비는 20 log₁₀. 20 × log₁₀(0.1) = 20 × (−1) = −20 dB. 전력으로는 1/100입니다." }
    ],
    ch4: [
      { q: "반지름 0.1 m인 바퀴가 2바퀴 돌면 로봇은 얼마나 가나요?", o: ["0.2 m", "약 0.628 m", "약 1.257 m", "약 4π m"], a: 2, w: "2바퀴 = 4π rad. 거리 = r × θ = 0.1 × 4π ≈ 1.257 m." },
      { q: "로봇이 10°를 보고 있고 목표 방향이 350°입니다. 올바른 회전 오차는?", o: ["+340°", "−340°", "−20°", "+20°"], a: 2, w: "350 − 10 = 340°를 −180~+180으로 감싸면 −20°. 오른쪽(시계 방향)으로 20°만 돌면 됩니다." }
    ],
    ch5: [
      { q: "f(x) = 3x²의 x = 2에서의 기울기(미분값)는?", o: ["6", "12", "3", "24"], a: 1, w: "x²의 미분은 2x이므로 3x²의 미분은 6x. x = 2를 넣으면 12입니다." },
      { q: "엔코더 위치를 1 kHz에서 10 kHz로 더 자주 읽어 (x[k] − x[k−1])/dt로 속도를 구했더니 값이 더 튑니다. 주된 이유는?", o: ["CPU가 바빠서", "잡음과 양자화 오차가 더 작은 dt로 나뉘어 커지기 때문", "미분 공식이 틀려서", "적분 드리프트 때문"], a: 1, w: "위치의 작은 오차 ε이 ε/dt로 커집니다. dt를 줄이면 잡음이 커집니다. 중앙 차분, 저역통과 필터, 추정기로 대처합니다." }
    ],
    ch6: [
      { q: "로봇이 평균 1.5 A를 40분 동안 썼습니다. 사용한 전하량은?", o: ["60 mAh", "600 mAh", "1000 mAh", "3600 mAh"], a: 2, w: "1.5 A × (40/60) h = 1.0 Ah = 1000 mAh. 전류 그래프 아래 넓이입니다." },
      { q: "정지한 자이로가 0.5 °/s의 바이어스를 가집니다. 보정 없이 1분 적분하면 각도 오차는?", o: ["0.5°", "약 0.008°", "30°", "1800°"], a: 2, w: "바이어스는 상쇄되지 않고 시간에 비례해 쌓입니다. 0.5 °/s × 60 s = 30°." }
    ],
    ch7: [
      { q: "τ = RC = 10 ms인 RC 회로에 계단 전압을 걸었습니다. 약 95%까지 충전되는 시간은?", o: ["10 ms", "20 ms", "30 ms", "100 ms"], a: 2, w: "1τ 63%, 2τ 86%, 3τ 95%. 3 × 10 ms = 30 ms입니다." },
      { q: "y += α(x − y) 필터를 100 Hz 루프에서 α = 0.05로 돌립니다. 시정수 τ는?", o: ["0.05 s", "0.2 s", "2 s", "20 s"], a: 1, w: "α = dt/τ이므로 τ = dt/α = 0.01/0.05 = 0.2 s. 루프 주기를 바꾸면 α도 바꿔야 같은 τ가 유지됩니다." }
    ],
    ch8: [
      { q: "a = (1, 2), b = (3, −1)의 내적은?", o: ["1", "5", "−1", "7"], a: 0, w: "1 × 3 + 2 × (−1) = 3 − 2 = 1. 양수이므로 둘은 대체로 같은 쪽(90° 이내)을 향합니다." },
      { q: "로봇의 방향 단위 벡터 h와 목표 방향 벡터 g의 내적이 음수입니다. 무슨 뜻인가요?", o: ["목표가 정확히 앞에 있다", "목표가 옆(90°)에 있다", "목표가 뒤쪽(90° 넘게)에 있다", "목표까지 거리가 음수다"], a: 2, w: "내적 = |h||g|cos θ. 음수면 cos θ < 0, 즉 θ > 90°라서 목표가 뒤쪽 반평면에 있습니다." }
    ],
    ch9: [
      { q: "행렬 [[0, −1], [1, 0]]을 (1, 0)에 곱하면?", o: ["(0, 1)", "(0, −1)", "(1, 0)", "(−1, 0)"], a: 0, w: "결과는 첫째 열 (0, 1)입니다. 이 행렬은 90° 반시계 회전 R(90°)입니다." },
      { q: "2×2 행렬의 행렬식이 0입니다. 옳은 설명은?", o: ["넓이가 그대로다", "평면이 직선이나 점으로 짓눌려 역행렬이 없다", "90° 회전이다", "모양이 뒤집혔다"], a: 1, w: "행렬식은 넓이 배율입니다. 0이면 공간이 납작해져 정보가 사라지므로 되돌릴 수 없습니다(연립방정식의 해가 유일하지 않음)." }
    ],
    ch10: [
      { q: "(1 + j)(1 − j)는?", o: ["0", "2", "2j", "−2"], a: 1, w: "1 − j + j − j² = 1 − (−1) = 2. 켤레끼리 곱하면 |z|²이 나옵니다(|1 + j|² = 2)." },
      { q: "RC 저역통과 필터의 차단 주파수에서 이득과 위상은?", o: ["0 dB, 0°", "−3 dB, −45°", "−6 dB, −90°", "−20 dB, −45°"], a: 1, w: "H = 1/(1 + j). 크기 1/√2 = −3 dB, 각도 −45°입니다." }
    ],
    ch11: [
      { q: "각각 신뢰도 0.9인 부품 3개가 직렬로 연결된 시스템의 신뢰도는?", o: ["0.9", "0.729", "0.999", "0.7"], a: 1, w: "모두 살아야 하므로 0.9 × 0.9 × 0.9 = 0.729. 부품이 많을수록 직렬 시스템은 약해집니다." },
      { q: "결함 0.1%, 민감도 99%, 헛경보 1%인 검사에서 경보가 울렸습니다. 진짜 결함일 확률에 가장 가까운 것은?", o: ["99%", "50%", "약 9%", "1%"], a: 2, w: "1000대 중 결함 1대(경보 0.99), 정상 999대 중 헛경보 약 10대. 0.99/(0.99 + 9.99) ≈ 9%. 기본 비율이 매우 낮으면 경보 대부분이 헛경보입니다." }
    ],
    ch12: [
      { q: "잡음 σ = 8 mV인 측정을 16번 평균하면 평균값의 잡음은?", o: ["8 mV", "4 mV", "2 mV", "0.5 mV"], a: 2, w: "σ/√N = 8/√16 = 8/4 = 2 mV. 독립 잡음일 때만 성립합니다." },
      { q: "정규분포를 따르는 측정값이 평균 ±2σ 안에 들어올 비율은?", o: ["약 68%", "약 95%", "약 99.7%", "100%"], a: 1, w: "68-95-99.7 규칙: ±1σ 68%, ±2σ 95%, ±3σ 99.7%." }
    ],
    ch13: [
      { q: "예측의 분산 P와 측정의 분산 R이 같을 때 칼만 이득 K는?", o: ["0", "0.5", "1", "2"], a: 1, w: "K = P/(P + R) = P/2P = 0.5. 두 추측을 똑같이 믿어 정확히 가운데를 택합니다." },
      { q: "필터의 R(측정 분산)을 실제보다 훨씬 크게 설정하면 추정은?", o: ["측정을 더 많이 따라가 떨린다", "측정을 덜 믿어 매끄럽지만 늦게 반응하고 예측 쪽 오차에 끌려간다", "아무 변화 없다", "발산한다"], a: 1, w: "R이 크면 K가 작아집니다. 측정 반영이 줄어 매끄럽지만, 오도메트리의 바이어스 같은 예측 오차를 바로잡는 속도가 느려집니다." }
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
