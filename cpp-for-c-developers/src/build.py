#!/usr/bin/env python3
"""Build index.html from src/shell.html + src/chNN.html fragments.

Code blocks inside fragments are written raw (no HTML escaping needed):

    <run file="hello.cpp" std="c++23" stdin="line1\\nline2" expect="error">
    ...C++ source...
    </run>
    <cpp file="snippet.cpp">...</cpp>     static C++ block (not runnable)
    <c file="legacy.c">...</c>             static C block

Usage:
    python3 src/build.py            # build index.html
    python3 src/build.py --check    # also compile & run every <run> block with g++ (needs g++ >= 13)
"""
import html, os, re, subprocess, sys, tempfile, textwrap, json

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
BLOCK = re.compile(r'<(run|cpp|c)((?:\s+[\w-]+="[^"]*")*)\s*>\n?(.*?)</\1>', re.S)
ATTR = re.compile(r'([\w-]+)="([^"]*)"')


def norm(code):
    code = textwrap.dedent(code.rstrip())
    return code.strip("\n") + "\n"


def render(kind, attrs, code):
    fn = attrs.get("file", "main.cpp" if kind != "c" else "main.c")
    lang = "c" if kind == "c" else "cpp"
    esc = html.escape(code, quote=False)
    if kind != "run":
        return ('<div class="code"><div class="bar"><span class="fn">%s</span><span class="acts">'
                '<button type="button" class="cp">복사</button></span></div><pre><code data-lang="%s">%s</code></pre></div>'
                % (html.escape(fn), lang, esc))
    data = ""
    std = attrs.get("std")
    if std:
        data += ' data-std="%s"' % html.escape(std)
    if "stdin" in attrs:
        data += ' data-stdin="%s"' % html.escape(attrs["stdin"].replace("\\n", "\n")).replace("\n", "&#10;")
    badge = '<span class="std">%s</span>' % html.escape(std) if std else ""
    return ('<div class="code run"%s><div class="bar"><span class="fn">%s%s</span><span class="acts">'
            '<button type="button" class="cp">복사</button><button type="button" class="eb">편집</button>'
            '<button type="button" class="rb">▶ 실행</button></span></div><pre><code data-lang="cpp">%s</code></pre></div>'
            % (data, html.escape(fn), badge, esc))


def build(check=False):
    shell = open(os.path.join(SRC, "shell.html"), encoding="utf-8").read()
    parts = sorted(f for f in os.listdir(SRC) if re.match(r"(ch\d\d|zz_appendix)\.html$", f))
    body, runs = [], []
    for f in parts:
        text = open(os.path.join(SRC, f), encoding="utf-8").read()

        def sub(m):
            attrs = dict(ATTR.findall(m.group(2)))
            code = norm(m.group(3))
            if m.group(1) == "run":
                runs.append((f, attrs, code))
            return render(m.group(1), attrs, code)

        body.append(BLOCK.sub(sub, text))
    out = "\n".join(body)
    book_js = open(os.path.join(ROOT, "assets", "book.js"), encoding="utf-8").read()
    qblock = book_js[book_js.index("const Q = {"):book_js.index("/* end Q */")]
    stats = {
        "N_CH": len(re.findall(r'<section class="chapter col" id="ch\d+"', out)),
        "N_RUN": len(runs),
        "N_BENCH": len(re.findall(r'<div class="bench"', out)),
        "N_QUIZ": len(re.findall(r"\{ q: ", qblock)),
    }
    page = shell.replace("{{CHAPTERS}}", out)
    for k, v in stats.items():
        page = page.replace("{{%s}}" % k, str(v))
    with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8") as fh:
        fh.write(page)
    print("built index.html", stats, "%d bytes" % len(page.encode()))
    # sanity: every quiz has data, every toc link has a target
    quizzes = re.findall(r'data-quiz="(ch\d+)"', page)
    for q in quizzes:
        if not re.search(r"\b%s: \[" % q, qblock):
            print("!! missing Q data for", q)
    for href in re.findall(r'href="#([\w-]+)"', page):
        if ('id="%s"' % href) not in page:
            print("!! broken anchor", href)
    if check:
        check_runs(runs)


def check_runs(runs):
    fails = 0
    report = []
    with tempfile.TemporaryDirectory() as d:
        for i, (f, attrs, code) in enumerate(runs):
            src = os.path.join(d, "m%d.cpp" % i)
            exe = os.path.join(d, "m%d" % i)
            open(src, "w").write(code)
            std = attrs.get("std", "c++20")
            c = subprocess.run(["g++", "-std=" + std, "-O2", "-Wall", "-Wextra", "-pthread", src, "-o", exe],
                               capture_output=True, text=True)
            expect_err = attrs.get("expect") == "error"
            name = "%s:%s" % (f, attrs.get("file", "?"))
            if c.returncode != 0:
                if not expect_err:
                    fails += 1
                    print("!! COMPILE FAIL", name, "\n", c.stderr[:1500])
                report.append({"name": name, "compile": c.stderr[-600:], "ok": expect_err})
                continue
            if expect_err:
                fails += 1
                print("!! expected compile error but compiled:", name)
            stdin = attrs.get("stdin", "").replace("\\n", "\n")
            try:
                r = subprocess.run([exe], input=stdin, capture_output=True, text=True, timeout=10, cwd=d)
                report.append({"name": name, "warn": c.stderr[-400:], "exit": r.returncode, "out": r.stdout[-1500:], "err": r.stderr[-400:]})
                if c.stderr.strip():
                    print("-- warnings in", name, "\n", c.stderr[:600])
            except subprocess.TimeoutExpired:
                fails += 1
                print("!! TIMEOUT", name)
    with open(os.path.join(tempfile.gettempdir(), "cppbook_runs.json"), "w") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)
    print("checked %d runnable blocks, %d problems" % (len(runs), fails))


if __name__ == "__main__":
    build(check="--check" in sys.argv)
