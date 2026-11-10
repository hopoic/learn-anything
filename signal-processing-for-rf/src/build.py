#!/usr/bin/env python3
"""Build ../index.html (one self-contained file) from src/ fragments.

Code blocks inside chapter fragments are written raw (no HTML escaping):

    <py file="alias.py" check>...</py>     Python; with `check` it is executed by --check
    <py file="mini_rx.py" src="../code/mini_rx.py" check></py>   body loaded from a file
    <c file="fir.c">...</c>                 C (static)
    <cpp file="fir_hls.cpp">...</cpp>       C++ / HLS (static)
    <v file="nco.v">...</v>                 Verilog (static)

Usage:
    python3 src/build.py            # build index.html using cached outputs
    python3 src/build.py --check    # run every `check` block, refresh outputs.json, then build
"""
import html, json, os, re, subprocess, sys, tempfile, textwrap

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
OUT_CACHE = os.path.join(SRC, "outputs.json")
BLOCK = re.compile(r'<(py|c|cpp|v)((?:\s+[\w-]+(?:="[^"]*")?)*)\s*>\n?(.*?)</\1>', re.S)
ATTR = re.compile(r'([\w-]+)(?:="([^"]*)")?')
LANG = {"py": "py", "c": "c", "cpp": "c", "v": "v"}


def norm(code):
    code = textwrap.dedent(code.rstrip())
    return code.strip("\n") + "\n"


def run_py(code):
    with tempfile.TemporaryDirectory() as d:
        # Make the book's helper modules importable from examples
        env = dict(os.environ, PYTHONPATH=os.path.join(ROOT, "code"))
        p = subprocess.run([sys.executable, "-c", code],
                           capture_output=True, text=True, timeout=300, cwd=d, env=env)
        return p.returncode, p.stdout, p.stderr


def render(kind, attrs, code, output):
    fn = attrs.get("file") or {"py": "example.py", "c": "example.c", "cpp": "example.cpp", "v": "example.v"}[kind]
    tag = '<span class="tokc">· 실행 검증됨</span>' if "check" in attrs else ""
    s = ('<div class="code"><div class="bar"><span>%s %s</span><button type="button" class="cp">복사</button></div>'
         '<pre><code data-lang="%s">%s</code></pre>' % (html.escape(fn), tag, LANG[kind], html.escape(code, quote=False)))
    if output:
        s += '<div class="out"><span class="lab">실행 결과</span><pre>%s</pre></div>' % html.escape(output.rstrip(), quote=False)
    return s + "</div>"


def build(check=False):
    cache = json.load(open(OUT_CACHE, encoding="utf-8")) if os.path.exists(OUT_CACHE) else {}
    shell = open(os.path.join(SRC, "shell.html"), encoding="utf-8").read()
    parts = sorted(f for f in os.listdir(SRC) if re.match(r"(ch\d\d|zz_appendix)\.html$", f))
    body, checks, problems = [], 0, 0
    for f in parts:
        text = open(os.path.join(SRC, f), encoding="utf-8").read()

        def sub(m):
            nonlocal checks, problems
            attrs = {k: v for k, v in ATTR.findall(m.group(2))}
            code = m.group(3)
            if attrs.get("src"):
                code = open(os.path.join(SRC, attrs["src"]), encoding="utf-8").read()
            code = norm(code)
            key = "%s:%s" % (f, attrs.get("file", "?"))
            out = ""
            if "check" in attrs and m.group(1) == "py":
                checks += 1
                if check:
                    rc, so, se = run_py(code)
                    if rc != 0:
                        problems += 1
                        print("!! FAIL", key, "\n", se[-2000:])
                    cache[key] = so
                    print("ok" if rc == 0 else "!!", key, "(%d lines out)" % len(so.splitlines()))
                out = "" if "noout" in attrs else cache.get(key, "")
            return render(m.group(1), attrs, code, out)

        body.append(BLOCK.sub(sub, text))
    out = "\n".join(body)
    css = open(os.path.join(SRC, "book.css"), encoding="utf-8").read()
    js = open(os.path.join(SRC, "book.js"), encoding="utf-8").read()
    qblock = js[js.index("const Q = {"):js.index("/* end Q */")]
    stats = {
        "N_CH": len(re.findall(r'<section class="chapter col" id="ch\d+"', out)),
        "N_BENCH": len(re.findall(r'<div class="bench"', out)),
        "N_QUIZ": len(re.findall(r"\{ q: ", qblock)),
        "N_PY": checks,
    }
    page = shell.replace("{{CSS}}", css).replace("{{JS}}", js.replace("{{N_CH}}", str(stats["N_CH"])))
    page = page.replace("{{CHAPTERS}}", out)
    for k, v in stats.items():
        page = page.replace("{{%s}}" % k, str(v))
    with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8") as fh:
        fh.write(page)
    if check:
        json.dump(cache, open(OUT_CACHE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("built index.html", stats, "%d bytes" % len(page.encode()))
    # Sanity checks: every quiz has data, every TOC link has a target, every bench id is unique
    for q in re.findall(r'data-quiz="(ch\d+)"', page):
        if not re.search(r"\b%s: \[" % q, qblock):
            print("!! missing Q data for", q)
    for href in re.findall(r'href="#([\w-]+)"', page):
        if ('id="%s"' % href) not in page:
            print("!! broken anchor", href)
    ids = re.findall(r'\sid="([^"]+)"', page)
    dup = sorted({i for i in ids if ids.count(i) > 1})
    if dup:
        print("!! duplicate ids", dup)
    for i in re.findall(r'\$\("#([\w-]+)"\)', js):
        if ('id="%s"' % i) not in page:
            print("!! script refers to missing id", i)
    if problems:
        print("!! %d example(s) failed" % problems)
        sys.exit(1)


if __name__ == "__main__":
    build(check="--check" in sys.argv)
