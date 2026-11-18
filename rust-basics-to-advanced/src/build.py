#!/usr/bin/env python3
"""Build index.html from src/shell.html + src/chNN.html fragments.

Code blocks inside fragments are written raw (no HTML escaping needed):

    <run file="main.rs" expect="error|panic|fail" mode="release" miri="1">
    ...Rust source...
    </run>
    <rs file="lib.rs">...</rs>          static Rust block (not runnable)
    <c file="a.c">...</c>               static C block
    <cpp file="a.cpp">...</cpp>         static C++ block
    <toml file="Cargo.toml">...</toml>  static TOML block
    <sh file="terminal">...</sh>        static shell block

expect:
    (none)  must compile and exit 0
    error   must FAIL to compile (the point is to read rustc's message)
    panic   must compile and panic (exit 101)
    fail    must compile and exit non-zero

Usage:
    python3 src/build.py            # build index.html
    python3 src/build.py --check    # also compile & run every <run> block with rustc (edition 2024)
"""
import html, json, os, re, subprocess, sys, tempfile, textwrap

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
BLOCK = re.compile(r'<(run|rs|c|cpp|toml|sh)((?:\s+[\w-]+="[^"]*")*)\s*>\n?(.*?)</\1>', re.S)
ATTR = re.compile(r'([\w-]+)="([^"]*)"')
LANG = {"run": "rust", "rs": "rust", "c": "c", "cpp": "cpp", "toml": "toml", "sh": "sh"}
DEFAULT_FILE = {"run": "main.rs", "rs": "main.rs", "c": "main.c", "cpp": "main.cpp", "toml": "Cargo.toml", "sh": "terminal"}
EXPECT_BADGE = {"error": "컴파일 오류 예제", "panic": "panic 예제", "fail": "실패 예제"}


def norm(code):
    code = textwrap.dedent(code.rstrip())
    return code.strip("\n") + "\n"


def render(kind, attrs, code):
    fn = attrs.get("file", DEFAULT_FILE[kind])
    esc = html.escape(code, quote=False)
    if kind != "run":
        return ('<div class="code"><div class="bar"><span class="fn">%s</span><span class="acts">'
                '<button type="button" class="cp">복사</button></span></div><pre><code data-lang="%s">%s</code></pre></div>'
                % (html.escape(fn), LANG[kind], esc))
    data, badges = "", ""
    if attrs.get("mode") == "release":
        data += ' data-mode="release"'
        badges += '<span class="std">release</span>'
    exp = attrs.get("expect")
    if exp:
        data += ' data-expect="%s"' % html.escape(exp)
        badges += '<span class="std x-%s">%s</span>' % (exp, EXPECT_BADGE[exp])
    miri = ""
    if attrs.get("miri"):
        data += ' data-miri="1"'
        miri = '<button type="button" class="mb" title="Miri로 정의되지 않은 동작 검사">Miri</button>'
    return ('<div class="code run"%s><div class="bar"><span class="fn">%s%s</span><span class="acts">'
            '<button type="button" class="cp">복사</button><button type="button" class="eb">편집</button>%s'
            '<button type="button" class="rb">▶ 실행</button></span></div><pre><code data-lang="rust">%s</code></pre></div>'
            % (data, html.escape(fn), badges, miri, esc))


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
    problems = 0
    for q in re.findall(r'data-quiz="(ch\d+)"', page):
        if not re.search(r"\b%s: \[" % q, qblock):
            problems += 1
            print("!! missing Q data for", q)
    for href in re.findall(r'href="#([\w-]+)"', page):
        if ('id="%s"' % href) not in page:
            problems += 1
            print("!! broken anchor", href)
    ids = re.findall(r'\bid="([\w-]+)"', page)
    dup = sorted({i for i in ids if ids.count(i) > 1})
    if dup:
        problems += 1
        print("!! duplicate ids", dup)
    if check:
        problems += check_runs(runs)
    return problems


def check_runs(runs):
    fails = 0
    report = []
    with tempfile.TemporaryDirectory() as d:
        for i, (f, attrs, code) in enumerate(runs):
            src = os.path.join(d, "m%d.rs" % i)
            exe = os.path.join(d, "m%d" % i)
            open(src, "w").write(code)
            args = ["rustc", "--edition", "2024", "--crate-name", "playground", src, "-o", exe]
            if attrs.get("mode") == "release":
                args[1:1] = ["-O"]
            c = subprocess.run(args, capture_output=True, text=True)
            expect = attrs.get("expect", "")
            name = "%s:%s" % (f, attrs.get("file", "?"))
            if c.returncode != 0:
                if expect != "error":
                    fails += 1
                    print("!! COMPILE FAIL", name, "\n", c.stderr[:2000])
                else:
                    codes = sorted(set(re.findall(r"error\[(E\d+)\]", c.stderr)))
                    print("   ok (expected error)", name, codes)
                report.append({"name": name, "compile": c.stderr[-1200:], "expect": expect})
                continue
            if expect == "error":
                fails += 1
                print("!! expected compile error but compiled:", name)
            if c.stderr.strip():
                print("-- warnings in", name, "\n", c.stderr[:800])
            try:
                r = subprocess.run([exe], capture_output=True, text=True, timeout=15, cwd=d)
            except subprocess.TimeoutExpired:
                fails += 1
                print("!! TIMEOUT", name)
                continue
            ok = (r.returncode == 0 if not expect else
                  r.returncode == 101 if expect == "panic" else r.returncode != 0)
            if not ok:
                fails += 1
                print("!! unexpected exit", r.returncode, name, "\n", r.stderr[-800:])
            report.append({"name": name, "exit": r.returncode, "out": r.stdout[-2500:], "err": r.stderr[-800:], "expect": expect})
    with open(os.path.join(tempfile.gettempdir(), "rustbook_runs.json"), "w") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)
    print("checked %d runnable blocks, %d problems" % (len(runs), fails))
    return fails


if __name__ == "__main__":
    sys.exit(1 if build(check="--check" in sys.argv) else 0)
