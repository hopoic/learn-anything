"""Assemble the book: concatenate parts and inline tested code files.

Macros inside the HTML parts:
  @@CODE path@@             -> a code block with file name bar and copy button
  @@TABS path1 path2 ...@@  -> a tab set, one tab per file, labelled by language
"""
import html
import pathlib
import re

SRC = pathlib.Path(__file__).parent
ROOT = SRC.parent
CODE = ROOT / "code"
LANG = {".c": ("c", "C"), ".cpp": ("cpp", "C++"), ".py": ("py", "Python"), ".rs": ("rs", "Rust")}


def code_block(rel: str) -> str:
    path = CODE / rel
    lang, _ = LANG[path.suffix]
    src = html.escape(path.read_text().rstrip("\n"), quote=False)
    return (f'<div class="code"><div class="bar"><span>{path.name}</span>'
            f'<button type="button" class="cp">복사</button></div>'
            f'<pre><code data-lang="{lang}">{src}</code></pre></div>')


def tabs_block(rels: list[str]) -> str:
    labels = [LANG[pathlib.Path(r).suffix][1] for r in rels]
    buttons = "".join(
        f'<button role="tab" type="button" aria-selected="{"true" if i == 0 else "false"}">{lab}</button>'
        for i, lab in enumerate(labels))
    panels = "".join(
        f'<div class="panel"{"" if i == 0 else " hidden"}>{code_block(r)}</div>'
        for i, r in enumerate(rels))
    return (f'<div class="tabs" data-tabs><p class="tabcap">같은 개념, 다른 언어</p>'
            f'<div role="tablist" aria-label="다른 언어로 보기">{buttons}</div>{panels}</div>')


def expand(text: str) -> str:
    text = re.sub(r"@@CODE (\S+)@@", lambda m: code_block(m.group(1)), text)
    text = re.sub(r"@@TABS ([^@]+)@@", lambda m: tabs_block(m.group(1).split()), text)
    assert "@@" not in text, "unexpanded macro"
    return text


def main() -> None:
    parts = sorted(SRC.glob("0*.html"))
    body = "".join(expand(p.read_text()) for p in parts)
    script = (SRC / "05_script.js").read_text()
    assert "</script" not in script
    out = body + "\n<script>\n" + script + "</script>\n</body>\n</html>\n"
    dest = ROOT / "index.html"
    dest.write_text(out)
    print(f"wrote {dest} ({len(out.encode()) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
