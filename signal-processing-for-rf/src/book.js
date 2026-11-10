(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("sp:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("sp:" + k, JSON.stringify(v)); } catch (e) {} }
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
  function fft(re, im) {                        // in-place iterative radix-2
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
      if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -TAU / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const a = i + k, b = a + len / 2;
          const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
          const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
  }
  const WIN = {
    rect: () => 1,
    hann: (n, N) => 0.5 - 0.5 * Math.cos(TAU * n / (N - 1)),
    hamming: (n, N) => 0.54 - 0.46 * Math.cos(TAU * n / (N - 1)),
    blackman: (n, N) => 0.42 - 0.5 * Math.cos(TAU * n / (N - 1)) + 0.08 * Math.cos(2 * TAU * n / (N - 1))
  };
  /* spectrum in dB, fftshifted; input complex arrays; normalized so a full-scale tone reads 0 dB */
  function specDb(xr, xi, win) {
    const N = xr.length, re = new Float64Array(N), im = new Float64Array(N);
    let sw = 0;
    for (let n = 0; n < N; n++) { const w = WIN[win](n, N); sw += w; re[n] = xr[n] * w; im[n] = xi[n] * w; }
    fft(re, im);
    const out = new Float64Array(N);
    for (let k = 0; k < N; k++) { const j = (k + N / 2) % N; out[k] = db(Math.hypot(re[j], im[j]) / sw); }
    return out;                                 // index k -> frequency (k - N/2)/N
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

  /* ---------- 2-A aliasing ---------- */
  (function () {
    const FS = 1000;
    function draw() {
      const f = +$("#alF").value, k = Math.round(f / FS), fa = Math.abs(f - k * FS);
      $("#oAlF").textContent = f + " Hz";
      // time view: 0..20 ms
      const F = frame({ W: 600, H: 190, x0: 0, x1: 20, y0: -1.25, y1: 1.25, xt: [0, 5, 10, 15, 20], yt: [-1, 0, 1], xf: v => v + " ms", L: 34 });
      let s = F.g;
      const ts = [], yc = [], ya = [];
      for (let i = 0; i <= 900; i++) { const t = i / 900 * 20; ts.push(t); yc.push(Math.cos(TAU * f * t / 1000)); ya.push(Math.cos(TAU * fa * t / 1000)); }
      s += poly(ts, yc, F, "a2") + poly(ts, ya, F, "sd");
      for (let n = 0; n <= 20; n++) {
        const v = Math.cos(TAU * f * n / FS);
        s += '<line class="m" x1="' + F.X(n) + '" x2="' + F.X(n) + '" y1="' + F.Y(0) + '" y2="' + F.Y(v) + '"/><circle class="fk" cx="' + F.X(n) + '" cy="' + F.Y(v) + '" r="3.6"/>';
      }
      $("#alSvgT").innerHTML = s;
      // folding view
      const G = frame({ W: 600, H: 170, x0: 0, x1: 2500, y0: 0, y1: 600, xt: [0, 500, 1000, 1500, 2000, 2500], yt: [0, 250, 500], ylab: "보이는 주파수 ↑ · 실제 주파수 →", L: 44 });
      let z = "";
      for (let i = 0; i < 5; i++) z += '<rect class="' + (i % 2 ? "zone2" : "zone") + '" x="' + G.X(i * 500) + '" y="' + G.T + '" width="' + (G.X(500) - G.X(0)) + '" height="' + (G.H - G.T - G.B) + '"/><text x="' + G.X(i * 500 + 250) + '" y="' + (G.H - G.B - 6) + '" text-anchor="middle">' + (i + 1) + "존</text>";
      const xs = [], ys = [];
      for (let i = 0; i <= 10; i++) { xs.push(i * 250); ys.push(Math.abs(i * 250 - Math.round(i * 250 / FS) * FS)); }
      z += G.g + poly(xs, ys, G, "k");
      z += '<line class="md" x1="' + G.X(f) + '" x2="' + G.X(f) + '" y1="' + G.Y(fa) + '" y2="' + G.Y(0) + '"/><line class="md" x1="' + G.X(0) + '" x2="' + G.X(f) + '" y1="' + G.Y(fa) + '" y2="' + G.Y(fa) + '"/>';
      z += '<circle class="fs" cx="' + G.X(f) + '" cy="' + G.Y(fa) + '" r="5.5"/>';
      $("#alSvgF").innerHTML = z;
      const zone = Math.min(5, Math.floor(f / 500) + 1), st = $("#alNote");
      if (f < 500) { st.className = "status g"; st.textContent = f + " Hz는 나이퀴스트 주파수(500 Hz) 아래라서 그대로 보입니다."; }
      else if (f === 500) { st.className = "status r"; st.textContent = "정확히 fs/2입니다. 위상이 0이라 보이지만, 위상이 90°였다면 모든 샘플이 0이 되어 신호가 사라집니다."; }
      else {
        st.className = "status " + (fa < 1e-9 ? "r" : "y");
        st.textContent = "실제 " + f + " Hz → 샘플만 보면 " + fa + " Hz와 구분할 수 없습니다 (" + zone + "존" + (zone % 2 === 0 ? ", 짝수 존이라 스펙트럼이 뒤집혀 들어옴" : "") + ")." + (fa < 1e-9 ? " fs의 정수배라서 직류(0 Hz)처럼 보입니다." : "");
      }
    }
    $("#alF").addEventListener("input", draw); draw();
  })();

  /* ---------- 3-A phasor ---------- */
  (function () {
    let t = 0.3, playing = false, lastTs = null;
    const svg = $("#phSvg"), btn = $("#phPlay");
    function draw() {
      const f = +$("#phF").value, mode = segGet("phMode");
      $("#oPhF").textContent = (f > 0 ? "+" : "") + f1(f, 2);
      const cx = 105, cy = 115, R = 80, th = TAU * f * t;
      let s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" class="m"/><line class="g" x1="' + (cx - R - 12) + '" x2="' + (cx + R + 12) + '" y1="' + cy + '" y2="' + cy + '"/><line class="g" x1="' + cx + '" x2="' + cx + '" y1="' + (cy - R - 12) + '" y2="' + (cy + R + 12) + '"/>';
      s += '<text x="' + (cx + R + 8) + '" y="' + (cy - 6) + '">I</text><text x="' + (cx + 6) + '" y="' + (cy - R - 2) + '">Q</text>';
      const arrow = (x, y, cls) => '<line class="' + cls + '" x1="' + cx + '" y1="' + cy + '" x2="' + x + '" y2="' + y + '" marker-end="url(#arwa)"/>';
      if (mode === "c") {
        const x = cx + R * Math.cos(th), y = cy - R * Math.sin(th);
        s += '<line class="md" x1="' + x + '" y1="' + y + '" x2="' + x + '" y2="' + cy + '"/><line class="md" x1="' + x + '" y1="' + y + '" x2="' + cx + '" y2="' + y + '"/>';
        s += arrow(x, y, "a") + '<circle class="fa" cx="' + x + '" cy="' + cy + '" r="4"/><circle class="fs" cx="' + cx + '" cy="' + y + '" r="4"/>';
      } else {
        const x1 = cx + R / 2 * Math.cos(th), y1 = cy - R / 2 * Math.sin(th), x2 = cx + R / 2 * Math.cos(-th), y2 = cy - R / 2 * Math.sin(-th);
        s += arrow(x1, y1, "a") + arrow(x2, y2, "a2") + '<circle class="fa" cx="' + (cx + R * Math.cos(th)) + '" cy="' + cy + '" r="5"/>';
      }
      // time traces
      const F = frame({ W: 600, H: 230, x0: -2, x1: 0, y0: -1.3, y1: 1.3, L: 215, R: 165, T: 20, B: 26, xt: [-2, -1, 0], yt: [-1, 0, 1], xf: v => v ? v + "s" : "지금" });
      s += F.g;
      const ts = [], yi = [], yq = [];
      for (let i = 0; i <= 200; i++) { const tau = -2 + i / 100; ts.push(tau); yi.push(Math.cos(TAU * f * (t + tau))); yq.push(mode === "c" ? Math.sin(TAU * f * (t + tau)) : 0); }
      s += poly(ts, yi, F, "a") + poly(ts, yq, F, "s");
      s += '<text x="220" y="14">I(t) <tspan class="fa">━</tspan>  Q(t) <tspan class="fs">━</tspan></text>';
      // spectrum
      const S = frame({ W: 600, H: 230, x0: -2.2, x1: 2.2, y0: 0, y1: 1.15, L: 455, R: 10, T: 20, B: 26, xt: [-2, 0, 2], yt: [], xf: v => (v > 0 ? "+" : "") + v });
      s += S.g + '<text x="460" y="14">스펙트럼</text>';
      const stem = (fx, a) => '<line class="a" x1="' + S.X(fx) + '" x2="' + S.X(fx) + '" y1="' + S.Y(0) + '" y2="' + S.Y(a) + '"/><circle class="fa" cx="' + S.X(fx) + '" cy="' + S.Y(a) + '" r="3.5"/>';
      if (mode === "c" || Math.abs(f) < 1e-9) s += stem(f, 1); else s += stem(f, 0.5) + stem(-f, 0.5);
      svg.innerHTML = s;
      $("#phNote").textContent = mode === "c"
        ? (Math.abs(f) < 1e-9 ? "f = 0: 화살표가 멈춰 있습니다 (DC)." : (f > 0 ? "반시계 방향 회전 = 양의 주파수" : "시계 방향 회전 = 음의 주파수") + ". 스펙트럼 선은 하나뿐입니다.")
        : "두 화살표가 반대로 돌며 허수부를 상쇄합니다. +f와 −f에 절반 크기의 선이 짝으로 생깁니다.";
    }
    function tick(ts) {
      if (!playing) { lastTs = null; return; }
      if (lastTs !== null) t += (ts - lastTs) / 1000;
      lastTs = ts; draw(); requestAnimationFrame(tick);
    }
    btn.addEventListener("click", () => {
      playing = !playing; btn.setAttribute("aria-pressed", playing); btn.textContent = playing ? "일시 정지" : "재생";
      if (playing) requestAnimationFrame(tick);
    });
    $("#phF").addEventListener("input", draw); segBind("phMode", draw); draw();
  })();

  /* ---------- 4-A convolution stepper ---------- */
  (function () {
    const x = [0, 1, 2, 3, 2, 1, 0, 0, 2, 0];
    const H = { ma: [0.25, 0.25, 0.25, 0.25], diff: [1, -1], echo: [1, 0, 0, 0.6] };
    const conv = (a, b) => { const y = new Array(a.length + b.length - 1).fill(0); a.forEach((av, i) => b.forEach((bv, j) => y[i + j] += av * bv)); return y; };
    function draw() {
      const h = H[$("#cvH").value], y = conv(x, h), nmax = y.length - 1, nEl = $("#cvN");
      nEl.max = nmax; let n = Math.min(+nEl.value, nmax); nEl.value = n; $("#oCvN").textContent = n;
      const k0 = -4, k1 = 13, W = 600, L = 62, R = 14;
      const X = k => L + (k - k0) / (k1 - k0) * (W - L - R);
      const rows = [{ t: 8, h: 72, lab: "x[k]" }, { t: 98, h: 72, lab: "h[n−k]" }, { t: 188, h: 92, lab: "y[n]" }];
      const ymax = Math.max(1, ...y.map(Math.abs)), hmax = Math.max(1, ...h.map(Math.abs));
      let s = "";
      rows.forEach((r, i) => {
        const z = r.t + r.h / 2;
        s += '<line class="g" x1="' + L + '" x2="' + (W - R) + '" y1="' + z + '" y2="' + z + '"/><text x="' + (L - 4) + '" y="' + (z + 4) + '" text-anchor="end" class="lbl">' + r.lab + "</text>";
      });
      for (let k = k0; k <= k1; k++) s += '<text x="' + X(k) + '" y="298" text-anchor="middle">' + k + "</text>";
      const stem = (k, v, row, scale, cls, fill, op) => {
        const z = row.t + row.h / 2, yy = z - v / scale * (row.h / 2 - 6);
        return '<g opacity="' + (op ?? 1) + '"><line class="' + cls + '" x1="' + X(k) + '" x2="' + X(k) + '" y1="' + z + '" y2="' + yy + '"/><circle class="' + fill + '" cx="' + X(k) + '" cy="' + yy + '" r="3.8"/></g>';
      };
      x.forEach((v, k) => { const on = n - k >= 0 && n - k < h.length && h[n - k] !== 0 && v !== 0; s += stem(k, v, rows[0], 3, on ? "s" : "k", on ? "fs" : "fk"); });
      h.forEach((v, j) => { const k = n - j; if (k >= k0 && k <= k1) s += stem(k, v, rows[1], hmax, "a", "fa"); });
      y.forEach((v, m) => { if (m <= k1) s += stem(m, v, rows[2], ymax, m === n ? "s" : "k", m === n ? "fs" : "fk", m <= n ? 1 : 0.18); });
      $("#cvSvg").innerHTML = s;
      const terms = [];
      h.forEach((hv, j) => { const k = n - j; if (k >= 0 && k < x.length && hv !== 0) terms.push("x[" + k + "]·h[" + j + "] = " + x[k] + "×" + hv); });
      $("#cvEq").textContent = "y[" + n + "] = " + (terms.length ? terms.join("  +  ") : "겹치는 항 없음") + "  →  " + (+y[n].toFixed(3));
      $("#cvPrev").disabled = n === 0; $("#cvNext").disabled = n === nmax;
    }
    $("#cvH").addEventListener("change", draw); $("#cvN").addEventListener("input", draw);
    $("#cvPrev").addEventListener("click", () => { $("#cvN").value = +$("#cvN").value - 1; draw(); });
    $("#cvNext").addEventListener("click", () => { $("#cvN").value = +$("#cvN").value + 1; draw(); });
    draw();
  })();

  /* ---------- 5-A spectrum analyzer ---------- */
  (function () {
    const INFO = { rect: ["−13 dB", 1.0], hann: ["−31 dB", 1.5], hamming: ["−43 dB", 1.36], blackman: ["−58 dB", 1.73] };
    function draw() {
      const N = +$("#spN").value, win = $("#spWin").value;
      const b1 = +$("#spF1").value, d = +$("#spD").value, a2db = +$("#spA2").value, nz = +$("#spNoise").value;
      $("#oSpF1").textContent = f1(b1, 2); $("#oSpD").textContent = f1(d, 1); $("#oSpA2").textContent = a2db + " dBc"; $("#oSpNoise").textContent = nz + " dBFS";
      const fa = b1 / 256, fb = (b1 + d) / 256, a2 = Math.pow(10, a2db / 20), sg = Math.sqrt(Math.pow(10, nz / 10) / 2);
      const g = gauss(rng(42), 2 * N);
      const mk = withTwo => {
        const re = new Float64Array(N), im = new Float64Array(N);
        for (let n = 0; n < N; n++) {
          re[n] = Math.cos(TAU * fa * n) + sg * g[2 * n]; im[n] = Math.sin(TAU * fa * n) + sg * g[2 * n + 1];
          if (withTwo) { re[n] += a2 * Math.cos(TAU * fb * n); im[n] += a2 * Math.sin(TAU * fb * n); }
        }
        return specDb(re, im, win);
      };
      const S = mk(true), S1 = mk(false);
      const F = frame({ W: 600, H: 260, x0: 0, x1: 0.3, y0: -170, y1: 5, xt: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3], yt: [0, -40, -80, -120, -160], xf: v => v ? v + "fs" : "0", ylab: "dBFS", L: 44 });
      let s = F.g;
      s += '<line class="md" x1="' + F.X(fa) + '" x2="' + F.X(fa) + '" y1="' + F.T + '" y2="' + (F.H - F.B) + '"/><line class="sd" x1="' + F.X(fb) + '" x2="' + F.X(fb) + '" y1="' + F.T + '" y2="' + (F.H - F.B) + '" style="opacity:.6"/>';
      const xs = [], ys = [];
      for (let k = N / 2; k < N; k++) { const fr = (k - N / 2) / N; if (fr > 0.3) break; xs.push(fr); ys.push(S[k]); }
      s += poly(xs, ys, F, "a");
      if (N <= 256) xs.forEach((fr, i) => { s += '<circle class="fa" cx="' + F.X(fr).toFixed(1) + '" cy="' + F.cy(ys[i]).toFixed(1) + '" r="1.8"/>'; });
      s += '<text x="' + (F.X(fb) + 4) + '" y="' + (F.T + 24) + '" class="fs">톤 2</text>';
      $("#spSvg").innerHTML = s;
      const kb = Math.round(fb * N) + N / 2, lift = S[kb] - S1[kb];
      const floor = nz + 10 * Math.log10(INFO[win][1] / N);
      const st = $("#spNote");
      const seen = lift > 6;
      st.className = "status " + (seen ? "g" : "y");
      st.textContent = "해상도 fs/N = " + f1(256 / N, 2) + "빈(N=256 기준) · " + $("#spWin").selectedOptions[0].text + " 최대 사이드로브 " + INFO[win][0] + " · 이론 잡음 바닥 약 " + f1(floor, 0) + " dBFS/빈. " +
        (seen ? "톤 2가 보입니다 (주변보다 " + f1(lift, 0) + " dB 높음)." : "톤 2가 누설이나 잡음에 묻혀 보이지 않습니다. 창, N, 톤 위치를 바꿔 보세요.");
    }
    ["spF1", "spD", "spA2", "spNoise"].forEach(id => $("#" + id).addEventListener("input", draw));
    ["spN", "spWin"].forEach(id => $("#" + id).addEventListener("change", draw));
    draw();
  })();

  /* ---------- 6-A FIR designer ---------- */
  (function () {
    const TW = { rect: 0.9, hann: 3.1, hamming: 3.3, blackman: 5.5 };
    function draw() {
      const N = +$("#fiN").value, fc = +$("#fiFc").value, win = $("#fiWin").value, bits = +$("#fiBits").value;
      $("#oFiN").textContent = N; $("#oFiFc").textContent = f1(fc, 3);
      const M = (N - 1) / 2, h = new Float64Array(N);
      let sum = 0;
      for (let n = 0; n < N; n++) { const t = n - M, sinc = t === 0 ? 1 : Math.sin(Math.PI * 2 * fc * t) / (Math.PI * 2 * fc * t); h[n] = 2 * fc * sinc * WIN[win](n, N); sum += h[n]; }
      for (let n = 0; n < N; n++) { h[n] /= sum; if (bits) h[n] = Math.round(h[n] * Math.pow(2, bits - 1)) / Math.pow(2, bits - 1); }
      const P = 600, fr = [], mag = [];
      for (let i = 0; i <= P; i++) {
        const f = 0.5 * i / P; let re = 0, im = 0;
        for (let n = 0; n < N; n++) { re += h[n] * Math.cos(TAU * f * n); im -= h[n] * Math.sin(TAU * f * n); }
        fr.push(f); mag.push(db(Math.hypot(re, im)));
      }
      const tw = TW[win] / N, fst = Math.min(0.5, fc + tw / 2);
      let worst = -300; fr.forEach((f, i) => { if (f >= fst) worst = Math.max(worst, mag[i]); });
      const F = frame({ W: 600, H: 250, x0: 0, x1: 0.5, y0: -120, y1: 8, xt: [0, 0.1, 0.2, 0.3, 0.4, 0.5], yt: [0, -20, -40, -60, -80, -100, -120], xf: v => v ? v + "fs" : "0", ylab: "|H| dB", L: 44 });
      let s = '<rect class="zone2" x="' + F.X(fst) + '" y="' + F.T + '" width="' + Math.max(0, F.X(0.5) - F.X(fst)) + '" height="' + (F.H - F.T - F.B) + '"/>' + F.g;
      s += '<line class="md" x1="' + F.X(fc) + '" x2="' + F.X(fc) + '" y1="' + F.T + '" y2="' + (F.H - F.B) + '"/>';
      if (worst > -300) s += '<line class="sd" x1="' + F.X(fst) + '" x2="' + F.X(0.5) + '" y1="' + F.cy(worst) + '" y2="' + F.cy(worst) + '"/>';
      s += poly(fr, mag, F, "a");
      $("#fiSvg").innerHTML = s;
      const hm = Math.max(...Array.from(h).map(Math.abs));
      const G = { W: 600, H: 110, L: 44, R: 12 };
      const X = n => G.L + (n + 0.5) / N * (G.W - G.L - G.R), z = 70, Y = v => z - v / hm * 56;
      let t = '<line class="g" x1="' + G.L + '" x2="' + (G.W - G.R) + '" y1="' + z + '" y2="' + z + '"/><text x="' + (G.L - 4) + '" y="' + (z + 4) + '" text-anchor="end">h[n]</text>';
      for (let n = 0; n < N; n++) t += '<line class="a" x1="' + X(n) + '" x2="' + X(n) + '" y1="' + z + '" y2="' + Y(h[n]) + '"/>' + (N <= 65 ? '<circle class="fa" cx="' + X(n) + '" cy="' + Y(h[n]) + '" r="2.4"/>' : "");
      t += '<text x="' + (G.W - G.R) + '" y="104" text-anchor="end">대칭 · 중심 n = ' + M + "</text>";
      $("#fiImp").innerHTML = t;
      $("#fiTr").textContent = "≈ " + f1(tw, 3) + " fs";
      $("#fiAtt").textContent = worst > -300 ? f1(-worst, 1) + " dB" : "—";
      $("#fiDelay").textContent = M + " 샘플";
      $("#fiMul").textContent = Math.ceil(N / 2) + " (직접형 " + N + ")";
    }
    ["fiN", "fiFc"].forEach(id => $("#" + id).addEventListener("input", draw));
    ["fiWin", "fiBits"].forEach(id => $("#" + id).addEventListener("change", draw));
    draw();
  })();

  /* ---------- 8-A DDC ---------- */
  (function () {
    const FS = 2000, N = 4096;                  // kHz units
    const ST = [{ n: "A", f: -600, a: 1.0, sb: 8 }, { n: "B", f: 250, a: 0.1, sb: 5 }, { n: "C", f: 700, a: 0.3, sb: 10 }];
    const xr = new Float64Array(N), xi = new Float64Array(N), g = gauss(rng(7), 2 * N);
    for (let n = 0; n < N; n++) {
      let re = 1e-4 * g[2 * n], im = 1e-4 * g[2 * n + 1];
      ST.forEach(s => [[0, 1], [s.sb, 0.3], [-s.sb, 0.3]].forEach(([df, k]) => { const p = TAU * (s.f + df) / FS * n; re += s.a * k * Math.cos(p); im += s.a * k * Math.sin(p); }));
      xr[n] = re; xi[n] = im;
    }
    const inSpec = specDb(xr, xi, "blackman");
    const wrapF = (f, span) => ((f + span / 2) % span + span) % span - span / 2;
    function draw() {
      const f0 = +$("#ddF").value, M = +$("#ddM").value, lpf = segGet("ddLpf") === "1";
      $("#oDdF").textContent = (f0 > 0 ? "+" : "") + f0 + " kHz";
      const out = FS / M;
      // input spectrum with the band the DDC will keep
      const F = frame({ W: 600, H: 190, x0: -1000, x1: 1000, y0: -110, y1: 8, xt: [-1000, -500, 0, 500, 1000], yt: [0, -40, -80], xf: v => v + "k", ylab: "입력 dB", L: 44 });
      let s = "";
      const lo = f0 - out / 2, hi = f0 + out / 2;
      [[lo, hi], [lo - FS, hi - FS], [lo + FS, hi + FS]].forEach(([a, b]) => { const A = Math.max(a, -1000), B = Math.min(b, 1000); if (B > A) s += '<rect class="zone" x="' + F.X(A) + '" y="' + F.T + '" width="' + (F.X(B) - F.X(A)) + '" height="' + (F.H - F.T - F.B) + '"/>'; });
      s += F.g;
      const xs = [], ys = [];
      for (let k = 0; k < N; k++) { xs.push((k - N / 2) / N * FS); ys.push(inSpec[k]); }
      s += poly(xs, ys, F, "a");
      s += '<line class="sd" x1="' + F.X(f0) + '" x2="' + F.X(f0) + '" y1="' + F.T + '" y2="' + (F.H - F.B) + '"/><text x="' + (F.X(f0) + 4) + '" y="' + (F.H - F.B - 6) + '" class="fs">NCO</text>';
      ST.forEach(st => { s += '<text x="' + F.X(st.f) + '" y="' + (F.T + 14) + '" text-anchor="middle" class="lbl">' + st.n + "</text>"; });
      $("#ddIn").innerHTML = s;
      // mix
      const yr = new Float64Array(N), yi = new Float64Array(N);
      for (let n = 0; n < N; n++) { const p = -TAU * f0 / FS * n, c = Math.cos(p), sn = Math.sin(p); yr[n] = xr[n] * c - xi[n] * sn; yi[n] = xr[n] * sn + xi[n] * c; }
      // filter
      let fr = yr, fi = yi;
      if (lpf && M > 1) {
        const T = 127, Mh = (T - 1) / 2, fc = 0.4 / M, h = new Float64Array(T); let sm = 0;
        for (let k = 0; k < T; k++) { const t = k - Mh, sc = t === 0 ? 1 : Math.sin(TAU * fc * t) / (TAU * fc * t); h[k] = 2 * fc * sc * WIN.blackman(k, T); sm += h[k]; }
        fr = new Float64Array(N); fi = new Float64Array(N);
        for (let n = 0; n < N; n += M) {               // compute only the outputs we keep (polyphase idea)
          let ar = 0, ai = 0;
          for (let k = 0; k < T; k++) { const j = n - k; if (j < 0) break; ar += h[k] * yr[j]; ai += h[k] * yi[j]; }
          fr[n] = ar / sm; fi[n] = ai / sm;
        }
      }
      const L = N / M, zr = new Float64Array(L), zi = new Float64Array(L);
      for (let m = 0; m < L; m++) { zr[m] = fr[m * M]; zi[m] = fi[m * M]; }
      const os = specDb(zr, zi, "blackman");
      const G = frame({ W: 600, H: 190, x0: -out / 2, x1: out / 2, y0: -110, y1: 8, xt: [-out / 2, -out / 4, 0, out / 4, out / 2], yt: [0, -40, -80], xf: v => (+v.toFixed(1)) + "k", ylab: "출력 dB (" + f1(out, 0) + " kSPS)", L: 44 });
      let o = G.g;
      const ox = [], oy = [];
      for (let k = 0; k < L; k++) { ox.push((k - L / 2) / L * out); oy.push(os[k]); }
      o += poly(ox, oy, G, "a");
      const inBand = [], folded = [];
      ST.forEach(st => {
        const sh = wrapF(st.f - f0, FS), al = wrapF(sh, out), native = Math.abs(sh) < out / 2;
        if (native) inBand.push(st.n);
        else if (!(lpf && M > 1)) folded.push(st.n);
        if (native || !(lpf && M > 1)) o += '<text x="' + G.X(al) + '" y="' + (G.T + 14) + '" text-anchor="middle" class="' + (native ? "lbl" : "fb") + '">' + st.n + (native ? "" : " (접힘)") + "</text>";
      });
      $("#ddOut").innerHTML = o;
      const nt = $("#ddNote");
      let msg = "출력 샘플률 " + f1(out, 0) + " kSPS, 대역 ±" + f1(out / 2, 0) + " kHz. ";
      msg += inBand.length ? "원래 대역 안에 있는 채널: " + inBand.join(", ") + ". " : "선택한 대역에 채널이 없습니다. ";
      if (folded.length) { nt.className = "status r"; msg += "필터 없이 버려서 " + folded.join(", ") + "이(가) 접혀 들어왔습니다. 이 신호들은 이제 원하는 채널과 구분할 수 없습니다."; }
      else if (M === 1) { nt.className = "status y"; msg += "M = 1이라 스펙트럼이 옮겨지기만 했습니다. 데시메이션을 켜 보세요."; }
      else { nt.className = "status g"; msg += "대역 밖 채널은 데시메이션 전에 걸러졌습니다."; }
      nt.textContent = msg;
    }
    $("#ddF").addEventListener("input", draw); $("#ddM").addEventListener("change", draw); segBind("ddLpf", draw);
    draw();
  })();

  /* ---------- 9-A quantization ---------- */
  (function () {
    const N = 4096, FQ = 1 / 40.37;
    function draw() {
      const b = +$("#qtB").value, adb = +$("#qtA").value, rnd = segGet("qtRnd"), ovf = segGet("qtOvf");
      $("#oQtB").textContent = b + " 비트"; $("#oQtA").textContent = (adb > 0 ? "+" : "") + adb + " dBFS";
      const A = Math.pow(10, adb / 20), sc = Math.pow(2, b - 1), lo = -sc, hi = sc - 1;
      const x = new Float64Array(N), q = new Float64Array(N);
      let ps = 0, pe = 0, me = 0, clip = 0;
      for (let n = 0; n < N; n++) {
        x[n] = A * Math.sin(TAU * FQ * n + 0.3);
        let v = rnd === "round" ? Math.round(x[n] * sc) : Math.floor(x[n] * sc);
        if (v > hi || v < lo) { clip++; v = ovf === "sat" ? clamp(v, lo, hi) : ((v - lo) % (2 * sc) + 2 * sc) % (2 * sc) + lo; }
        q[n] = v / sc;
        const e = q[n] - x[n]; ps += x[n] * x[n]; pe += e * e; me += e;
      }
      const sq = 10 * Math.log10(ps / pe), th = 6.02 * b + 1.76 + adb;
      $("#qtMeas").textContent = f1(sq, 1) + " dB";
      $("#qtTheory").textContent = adb <= 0 ? f1(th, 1) + " dB" : "해당 없음 (과입력)";
      const dcv = me / N * sc; $("#qtDc").textContent = (Math.abs(dcv) < 5e-4 ? "0.000" : f1(dcv, 3)) + " LSB";
      $("#qtClip").textContent = clip + " / " + N;
      const span = Math.max(A * 1.15, 4 / sc, 0.05);
      const F = frame({ W: 600, H: 150, x0: 0, x1: 120, y0: -span, y1: span, T: 8, B: 18, L: 50, xt: [0, 40, 80, 120], yt: [-span, 0, span].map(v => +v.toPrecision(2)), yf: v => (+v).toPrecision(2) });
      let s = F.g;
      if (span > 1) [1, -1].forEach(v => { s += '<line class="b" style="stroke-dasharray:4 3;stroke-width:1" x1="' + F.L + '" x2="' + (600 - F.R) + '" y1="' + F.Y(v) + '" y2="' + F.Y(v) + '"/>'; });
      const ts = [], ys = [];
      for (let i = 0; i <= 480; i++) { ts.push(i / 4); ys.push(A * Math.sin(TAU * FQ * i / 4 + 0.3)); }
      s += poly(ts, ys, F, "m");
      let d = "";
      for (let n = 0; n <= 120; n++) { const xx = F.X(n), yy = F.cy(q[n]); d += (n ? "L" : "M") + xx.toFixed(1) + " " + yy.toFixed(1) + "L" + F.X(Math.min(120, n + 1)).toFixed(1) + " " + yy.toFixed(1); }
      s += '<path class="a" d="' + d + '"/>';
      // error in LSB
      let emax = 0.6; for (let n = 0; n <= 120; n++) emax = Math.max(emax, Math.abs((q[n] - x[n]) * sc));
      emax = Math.min(emax * 1.1, 2 * sc);
      const G = frame({ W: 600, H: 230, x0: 0, x1: 120, y0: -emax, y1: emax, T: 160, B: 22, L: 50, xt: [], yt: [-emax, 0, emax].map(v => +v.toPrecision(2)) });
      s += G.g;
      const ex = [], ey = []; for (let n = 0; n <= 120; n++) { ex.push(n); ey.push((q[n] - x[n]) * sc); }
      s += poly(ex, ey, G, "s") + '<text class="yl" x="' + (G.L + 5) + '" y="' + (G.T + 13) + '">오차 (LSB)</text>';
      $("#qtSvg").innerHTML = s;
    }
    ["qtB", "qtA"].forEach(id => $("#" + id).addEventListener("input", draw));
    segBind("qtRnd", draw); segBind("qtOvf", draw);
    draw();
  })();

  /* ---------- 10-A constellation ---------- */
  (function () {
    const NS = 600, r = rng(10), gI = gauss(rng(11), NS), gQ = gauss(rng(12), NS);
    const idx = Array.from({ length: NS }, () => Math.floor(r() * 16));
    const C = {
      2: [[1, 0], [-1, 0]],
      4: [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([a, b]) => [a / Math.SQRT2, b / Math.SQRT2]),
      16: (() => { const L = [-3, -1, 1, 3], o = []; L.forEach(a => L.forEach(b => o.push([a / Math.sqrt(10), b / Math.sqrt(10)]))); return o; })()
    };
    function draw() {
      const M = +$("#moMod").value, snr = +$("#moSnr").value, ph = +$("#moPh").value, cfo = +$("#moCfo").value, iq = +$("#moIq").value / 100, dc = +$("#moDc").value;
      $("#oMoSnr").textContent = snr + " dB"; $("#oMoPh").textContent = ph + "°"; $("#oMoCfo").textContent = f1(cfo, 4); $("#oMoIq").textContent = (iq * 100).toFixed(0) + "%"; $("#oMoDc").textContent = f1(dc, 2);
      const pts = C[M], sg = Math.sqrt(Math.pow(10, -snr / 10) / 2);
      let ev = 0, errs = 0;
      const rx = [];
      for (let k = 0; k < NS; k++) {
        const [si, sq] = pts[idx[k] % M], a = ph * Math.PI / 180 + TAU * cfo * k;
        let I = si * Math.cos(a) - sq * Math.sin(a) + sg * gI[k], Q = si * Math.sin(a) + sq * Math.cos(a) + sg * gQ[k];
        I = I * (1 + iq / 2) + dc / Math.SQRT2; Q = Q * (1 - iq / 2) + dc / Math.SQRT2;
        let best = 0, bd = 1e9;
        pts.forEach((p, j) => { const d2 = (I - p[0]) ** 2 + (Q - p[1]) ** 2; if (d2 < bd) { bd = d2; best = j; } });
        const wrong = best !== idx[k] % M;
        if (wrong) errs++;
        ev += (I - si) ** 2 + (Q - sq) ** 2;
        rx.push([I, Q, wrong]);
      }
      const evm = Math.sqrt(ev / NS);
      const lim = 1.75, W = 600, H = 340, S = (H - 20) / (2 * lim), cx = W / 2, cy = H / 2;
      const X = v => cx + v * S, Y = v => cy - v * S;
      let s = '<line class="g" x1="' + X(-lim) + '" x2="' + X(lim) + '" y1="' + cy + '" y2="' + cy + '"/><line class="g" x1="' + cx + '" x2="' + cx + '" y1="' + Y(lim) + '" y2="' + Y(-lim) + '"/>';
      s += '<circle class="g" cx="' + cx + '" cy="' + cy + '" r="' + S + '" fill="none"/><text x="' + (X(lim) - 4) + '" y="' + (cy - 6) + '" text-anchor="end">I</text><text x="' + (cx + 6) + '" y="' + (Y(lim) + 12) + '">Q</text>';
      rx.forEach(([I, Q, w]) => { s += '<circle class="' + (w ? "fb" : "fa") + '" cx="' + X(clamp(I, -lim, lim)).toFixed(1) + '" cy="' + Y(clamp(Q, -lim, lim)).toFixed(1) + '" r="2.3" opacity=".65"/>'; });
      pts.forEach(([a, b]) => { s += '<path class="k" d="M' + (X(a) - 6) + " " + Y(b) + "h12M" + X(a) + " " + (Y(b) - 6) + 'v12"/>'; });
      $("#moSvg").innerHTML = s;
      $("#moEvm").textContent = f1(db(evm), 1) + " dB (" + f1(evm * 100, 1) + "%)";
      $("#moSer").textContent = errs;
      const dg = [];
      if (cfo > 0) dg.push("링: CFO");
      if (Math.abs(ph) >= 3) dg.push("회전: 위상");
      if (iq >= 0.03) dg.push("직사각형: IQ");
      if (dc >= 0.03) dg.push("중심 이동: DC");
      if (snr < 15) dg.push("구름: 잡음");
      $("#moDiag").textContent = dg.length ? dg.join(" · ") : "깨끗함";
    }
    ["moSnr", "moPh", "moCfo", "moIq", "moDc"].forEach(id => $("#" + id).addEventListener("input", draw));
    $("#moMod").addEventListener("change", draw);
    draw();
  })();

  /* ---------- 11-A Costas loop ---------- */
  (function () {
    const NS = 900, r = rng(21), g = gauss(rng(22), 2 * NS);
    const sym = Array.from({ length: NS }, () => [(r() < 0.5 ? 1 : -1) / Math.SQRT2, (r() < 0.5 ? 1 : -1) / Math.SQRT2]);
    const sgn = v => (v >= 0 ? 1 : -1);
    const bnOf = v => 0.001 * Math.pow(200, v / 100);
    function gains(bn, z = 0.707) { const th = bn / (z + 1 / (4 * z)), d = 1 + 2 * z * th + th * th; return [4 * z * th / d, 4 * th * th / d]; }
    function scatter(id, P) {
      const W = 280, lim = 1.6, S = (W - 16) / (2 * lim), c = W / 2;
      let s = '<line class="g" x1="8" x2="' + (W - 8) + '" y1="' + c + '" y2="' + c + '"/><line class="g" x1="' + c + '" x2="' + c + '" y1="8" y2="' + (W - 8) + '"/><circle class="g" cx="' + c + '" cy="' + c + '" r="' + S + '" fill="none"/>';
      P.forEach(([a, b]) => { s += '<circle class="fa" cx="' + (c + clamp(a, -lim, lim) * S).toFixed(1) + '" cy="' + (c - clamp(b, -lim, lim) * S).toFixed(1) + '" r="2" opacity=".6"/>'; });
      $("#" + id).innerHTML = s;
    }
    function draw() {
      const cfo = +$("#csCfo").value, bn = bnOf(+$("#csBw").value), snr = +$("#csSnr").value;
      $("#oCsCfo").textContent = f1(cfo, 4); $("#oCsBw").textContent = bn.toPrecision(2); $("#oCsSnr").textContent = snr + " dB";
      const [kp, ki] = gains(bn), sg = Math.sqrt(Math.pow(10, -snr / 10) / 2);
      let phase = 0, freq = 0;
      const err = [], raw = [], fix = [];
      for (let k = 0; k < NS; k++) {
        const a = TAU * cfo * k + 0.6, [si, sq] = sym[k];
        const I = si * Math.cos(a) - sq * Math.sin(a) + sg * g[2 * k], Q = si * Math.sin(a) + sq * Math.cos(a) + sg * g[2 * k + 1];
        const c = Math.cos(phase), s = Math.sin(phase), zi = I * c + Q * s, zq = Q * c - I * s;
        let e = a - phase; e = ((e + Math.PI / 4) % (Math.PI / 2) + Math.PI / 2) % (Math.PI / 2) - Math.PI / 4;
        err.push(e);
        const pe = sgn(zi) * zq - sgn(zq) * zi;
        freq += ki * pe; phase += freq + kp * pe;
        if (k >= NS - 300) { raw.push([I, Q]); fix.push([zi, zq]); }
      }
      const F = frame({ W: 600, H: 220, x0: 0, x1: NS, y0: -48, y1: 48, xt: [0, 150, 300, 450, 600, 750, 900], yt: [-45, -11.5, 0, 11.5, 45], yf: v => v + "°", ylab: "잔여 위상 오차 (가로축: 심볼)", L: 48 });
      let s = '<rect class="zone" x="' + F.L + '" y="' + F.Y(11.5) + '" width="' + (600 - F.L - F.R) + '" height="' + (F.Y(-11.5) - F.Y(11.5)) + '"/>' + F.g;
      s += poly(err.map((_, i) => i), err.map(v => v * 180 / Math.PI), F, "a");
      let lock = null;
      // locked = the 20-symbol average phase error stays within 0.1 rad (about 6 degrees) for 100 symbols
      const ma = err.map((_, i) => { const a = Math.max(0, i - 19); let m = 0; for (let j = a; j <= i; j++) m += err[j]; return m / (i - a + 1); });
      for (let i = 0; i + 100 <= NS; i++) { let ok = true; for (let j = i; j < i + 100; j++) if (Math.abs(ma[j]) >= 0.1) { ok = false; break; } if (ok) { lock = Math.max(0, i - 19); break; } }
      if (lock !== null) s += '<line class="sd" x1="' + F.X(lock) + '" x2="' + F.X(lock) + '" y1="' + F.T + '" y2="' + (F.H - F.B) + '"/><text x="' + (F.X(lock) + 4) + '" y="' + (F.H - F.B - 6) + '" class="fs">잠금</text>';
      $("#csSvg").innerHTML = s;
      scatter("csBefore", raw); scatter("csAfter", fix);
      const tail = err.slice(-300), mu = tail.reduce((a, b) => a + b, 0) / tail.length;
      const jit = Math.sqrt(tail.reduce((a, b) => a + (b - mu) ** 2, 0) / tail.length) * 180 / Math.PI;
      $("#csLock").textContent = lock === null ? "잠기지 않음" : lock + " 심볼";
      $("#csJit").textContent = lock === null ? "—" : f1(jit, 2) + "°";
      $("#csState").textContent = lock === null ? (cfo > 2 * bn ? "대역폭 부족: 오프셋을 못 따라감" : "아직 끌어당기는 중") : jit > 4 ? "잠김, 지터 큼" : "잠김";
    }
    ["csCfo", "csBw", "csSnr"].forEach(id => $("#" + id).addEventListener("input", draw));
    draw();
  })();

  /* ---------- quizzes ---------- */
  const Q = {
    ch1: [
      { q: "전압 진폭이 2배가 되면 몇 dB인가요?", o: ["+3 dB", "+6 dB", "+10 dB", "+20 dB"], a: 1, w: "진폭 비는 20 log10을 씁니다. 20 log10(2) ≈ 6.02 dB. 전력으로는 4배입니다." },
      { q: "LTI 시스템에 1 kHz 사인파를 넣었을 때 나올 수 있는 출력은?", o: ["1 kHz와 2 kHz가 섞인 신호", "크기와 위상만 바뀐 1 kHz 사인파", "언제나 입력과 똑같은 신호", "3 kHz 사인파"], a: 1, w: "LTI 시스템은 새 주파수를 만들지 못합니다. 주파수마다 크기와 위상만 바꾸고, 그 표가 주파수 응답입니다." }
    ],
    ch2: [
      { q: "fs = 1 MSPS로 실수 샘플링할 때 1.3 MHz 톤은 어디에 보이나요?", o: ["1.3 MHz", "700 kHz", "300 kHz", "보이지 않는다"], a: 2, w: "|1.3 − round(1.3)·1| = 0.3 MHz. 3존이라 뒤집힘 없이 300 kHz로 접혀 보입니다." },
      { q: "ADC 앞의 안티앨리어싱 필터를 생략하면 안 되는 가장 큰 이유는?", o: ["ADC 전력이 늘어나서", "나이퀴스트 밖의 신호와 잡음이 접혀 들어오면 샘플링 후에는 구분해 제거할 수 없어서", "샘플률이 낮아져서", "DC 오프셋이 생겨서"], a: 1, w: "접혀 들어온 성분은 원래 대역의 신호와 같은 숫자열이 됩니다. 앨리어싱은 샘플링 전에만 막을 수 있습니다." }
    ],
    ch3: [
      { q: "LO가 2.440 GHz인 IQ 수신기의 FFT에서 −200 kHz에 피크가 보입니다. 실제 신호 주파수는?", o: ["2.4402 GHz", "2.4398 GHz", "2.440 GHz와 2.4402 GHz 두 곳", "판단할 수 없다"], a: 1, w: "IQ 스펙트럼의 음의 주파수는 LO보다 낮은 쪽입니다. 2.440 GHz − 200 kHz = 2.4398 GHz." },
      { q: "복소 IQ 샘플링으로 20 MHz 대역을 앨리어싱 없이 보려면 최소 샘플률은 대략?", o: ["10 MSPS", "20 MSPS", "40 MSPS", "80 MSPS"], a: 1, w: "복소 신호는 −fs/2 ~ +fs/2를 모두 쓸 수 있어 fs > B면 됩니다. 실수 샘플링이었다면 2B가 필요합니다." }
    ],
    ch4: [
      { q: "x = [1, 2], h = [1, 0, −1]의 컨볼루션은?", o: ["[1, 2, −1, −2]", "[1, 2, −1]", "[1, 0, −1, 2]", "[2, 1, −2, −1]"], a: 0, w: "y0 = 1·1, y1 = 2·1 + 1·0, y2 = 2·0 + 1·(−1), y3 = 2·(−1). 길이는 2 + 3 − 1 = 4." },
      { q: "실수 계수 64탭 FIR을 10 MSPS 복소 신호에 적용할 때 필요한 연산량은?", o: ["640 MMAC/s", "1.28 GMAC/s", "2.56 GMAC/s", "64 MMAC/s"], a: 1, w: "I와 Q 각각에 64탭 × 10 MSPS = 640 MMAC/s, 합계 1.28 GMAC/s입니다." }
    ],
    ch5: [
      { q: "fs = 2 MSPS에서 N = 2048 FFT의 빈 폭은?", o: ["2048 Hz", "약 977 Hz", "정확히 1 kHz", "약 488 Hz"], a: 1, w: "Δf = fs/N = 2,000,000 / 2048 ≈ 976.6 Hz." },
      { q: "강한 톤 옆의 −60 dBc 약한 톤이 보이지 않습니다. 강한 톤이 빈 사이에 있을 때 가장 먼저 시도할 것은?", o: ["제로 패딩으로 N 늘리기", "사이드로브가 낮은 창(Blackman 등) 적용", "샘플률 올리기", "FFT 대신 IFFT 사용"], a: 1, w: "사각 창의 누설은 −13 dB 사이드로브부터 천천히 줄어 약한 톤을 덮습니다. 낮은 사이드로브 창이 해결책입니다. 제로 패딩은 누설을 줄이지 못합니다." }
    ],
    ch6: [
      { q: "감쇠 60 dB, 전이폭 0.02 fs인 저역통과 FIR의 탭 수 어림값(최적 설계)은?", o: ["약 30", "약 70", "약 136", "약 600"], a: 2, w: "(60/22) × (1/0.02) ≈ 2.73 × 50 ≈ 136탭. 창 방식이면 더 많이 듭니다." },
      { q: "IIR 필터가 불안정해지는 조건은?", o: ["영점이 단위원 밖에 있을 때", "극점이 단위원 밖에 있을 때", "계수가 대칭일 때", "탭 수가 홀수일 때"], a: 1, w: "극점이 단위원 밖이면 되먹임이 매번 커져 출력이 발산합니다. FIR은 극점이 없어 항상 안정합니다." }
    ],
    ch7: [
      { q: "샘플률을 8배 낮출 때 올바른 순서는?", o: ["8개 중 1개를 남긴 뒤 저역통과", "새 나이퀴스트(fs/16) 근처 이하만 남기는 저역통과 후 8개 중 1개를 남김", "고역통과 후 버리기", "FFT 후 상위 빈 버리기"], a: 1, w: "버리는 것 자체가 다시 샘플링하는 것이라, 먼저 걸러야 대역 밖 성분이 접혀 들어오지 않습니다." },
      { q: "곱셈기 없이 큰 데시메이션 비율을 구현할 수 있는 필터는?", o: ["하프밴드", "CIC", "IIR biquad", "Parks-McClellan FIR"], a: 1, w: "CIC는 적분기와 미분기, 즉 덧셈과 레지스터만 씁니다. 대신 통과대역 처짐을 보상하는 FIR이 뒤에 필요합니다." }
    ],
    ch8: [
      { q: "32비트 위상 누산기, fs = 100 MHz인 NCO로 10 MHz를 만들려면 FTW는?", o: ["10,000,000", "429,496,730", "2,147,483,648", "42,949,673"], a: 1, w: "FTW = round(10/100 × 2^32) = round(429,496,729.6) = 429,496,730." },
      { q: "직접 변환 수신기에서 관심 신호를 0 Hz에서 일부러 비켜 두는(오프셋 튜닝) 주된 이유는?", o: ["LO 누설과 DC 오프셋이 만드는 0 Hz 스파이크를 피하려고", "샘플률을 줄이려고", "IQ 불균형을 완전히 없애려고", "NCO가 필요 없어져서"], a: 0, w: "신호를 비켜 받고 마지막 튜닝을 DDC의 NCO로 하면 DC 스파이크는 DDC 필터 밖으로 밀려납니다." }
    ],
    ch9: [
      { q: "Q1.15 × Q1.15 곱의 형식과, 16비트로 되돌릴 때 반드시 필요한 처리는?", o: ["Q1.30, 처리 불필요", "Q2.30, (−1)×(−1) 때문에 포화", "Q1.15, 반올림만", "Q2.15, 랩어라운드"], a: 1, w: "정수부가 1+1비트가 됩니다. +1은 Q1.15로 표현할 수 없으므로 포화하지 않으면 −1로 뒤집힙니다." },
      { q: "12비트 입력, 18비트 계수, 128탭 FIR의 최악의 누산기 폭은?", o: ["30비트", "37비트", "48비트", "158비트"], a: 1, w: "12 + 18 + log2(128) = 12 + 18 + 7 = 37비트. DSP48E1의 48비트 누산기에 들어갑니다." }
    ],
    ch10: [
      { q: "QPSK에서 Es/N0 = 13 dB라면 Eb/N0는?", o: ["13 dB", "16 dB", "10 dB", "6.5 dB"], a: 2, w: "QPSK는 심볼당 2비트라 10 log10(2) ≈ 3 dB를 뺍니다." },
      { q: "성상도의 점들이 원점을 중심으로 원호를 따라 번져 링처럼 보입니다. 가장 유력한 원인은?", o: ["IQ 이득 불균형", "DC 오프셋", "반송파 주파수 오프셋(CFO)", "ADC 포화"], a: 2, w: "CFO는 시간에 따라 회전 각도가 계속 커지게 해서 점들을 원을 따라 늘어뜨립니다." }
    ],
    ch11: [
      { q: "±20 ppm 발진기를 쓰는 송신기와 수신기가 915 MHz에서 통신할 때 최악의 상대 주파수 오프셋은?", o: ["18.3 kHz", "36.6 kHz", "915 kHz", "20 kHz"], a: 1, w: "양쪽 오차가 더해져 40 ppm. 915 MHz × 40 × 10⁻⁶ = 36.6 kHz." },
      { q: "코스타스 루프의 대역폭을 크게 넓히면?", o: ["잠금이 느려지고 지터가 줄어든다", "잠금이 빨라지지만 잡음을 따라가 지터가 커진다", "아무 변화가 없다", "90° 모호성이 사라진다"], a: 1, w: "루프 대역폭은 잠금 속도와 잡음 억제의 맞바꿈입니다. 벤치 11-A에서 직접 확인할 수 있습니다." }
    ],
    ch12: [
      { q: "mini_rx.py의 프레임 동기가 상관의 '가장 큰 피크' 대신 '처음 나타난 강한 피크'를 고르는 이유는?", o: ["계산이 빨라서", "데이터가 우연히 프리앰블과 비슷하면 뒤쪽에 비슷한 크기의 가짜 피크가 생길 수 있어서", "90° 모호성을 없애려고", "CFO를 추정하려고"], a: 1, w: "합격 시험에서 실제로 데이터의 첫 32심볼이 프리앰블과 같은 경우가 나왔고, 가장 큰 피크를 고르면 32심볼 늦게 프레임을 잡았습니다." },
      { q: "정합 필터를 PL로 옮길 때, 61.44 MSPS 앞단보다 데시메이션 뒤(1 MSPS)에 두는 것이 유리한 이유는?", o: ["필터 계수가 줄어서", "fclk/fs 비가 커져 DSP 슬라이스 하나를 여러 탭이 시간 다중화로 나눠 쓸 수 있어서", "잡음이 없어서", "USB가 빨라져서"], a: 1, w: "100 MHz 클록에 1 MSPS면 샘플마다 100번의 MAC을 슬라이스 하나로 할 수 있습니다. 61.44 MSPS에서는 같은 필터에 슬라이스 수십 개가 필요합니다." }
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
