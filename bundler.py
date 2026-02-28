#!/usr/bin/env python3
# bundler.py — entry: ./index.html, output: ./dist/index.html
# Inlines all local <link rel="stylesheet"> and <script src="…"> references.
# Minifies CSS, JS (comment stripping + whitespace collapse) and HTML markup.

from __future__ import annotations
import re
import subprocess
import sys
from pathlib import Path

ROOT    = Path(__file__).parent.resolve()
ENTRY   = ROOT / "index.html"
OUT_DIR = ROOT / "dist"
OUT_HTML = OUT_DIR / "index.html"
MAKE_README_JS = ROOT / "make_readme_js.py"

# ── Regex patterns ──────────────────────────────────────────────────────────────
LINK_RE = re.compile(
    r"""<link\b([^>]*?)\brel\s*=\s*["']stylesheet["']([^>]*?)>""",
    re.IGNORECASE,
)
HREF_RE   = re.compile(r"""href\s*=\s*["']([^"']+)["']""",  re.IGNORECASE)
SCRIPT_RE = re.compile(
    r"""<script\b([^>]*?)\bsrc\s*=\s*["']([^"']+)["']([^>]*)>\s*</script>""",
    re.IGNORECASE | re.DOTALL,
)
RAW_RE = re.compile(
    r"""<(script|style|pre|textarea)\b[^>]*>.*?</\1>""",
    re.IGNORECASE | re.DOTALL,
)

# ── Helpers ─────────────────────────────────────────────────────────────────────
def is_external(url: str) -> bool:
    u = url.strip().lower()
    return u.startswith(("http://", "https://", "//", "data:"))

def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")

# ── Minifiers ───────────────────────────────────────────────────────────────────
def minify_css(css: str) -> str:
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.DOTALL)  # strip comments
    css = re.sub(r"\s+", " ", css)                         # collapse whitespace
    css = re.sub(r"\s*([{}:;,>~+])\s*", r"\1", css)       # remove space around tokens
    css = css.replace(";}", "}")                           # drop last semicolon
    return css.strip()

def minify_js(js: str) -> str:
    """Strip // and /* */ comments (respecting strings), then collapse whitespace."""
    out   = []
    i     = 0
    n     = len(js)
    state = "code"   # code | lc | bc | sq | dq | bt
    esc   = False

    while i < n:
        c   = js[i]
        nxt = js[i + 1] if i + 1 < n else ""

        if state == "code":
            if c == "/" and nxt == "/":
                i += 2; state = "lc"; continue
            if c == "/" and nxt == "*":
                i += 2; state = "bc"; continue
            if c == "'": out.append(c); i += 1; state = "sq"; esc = False; continue
            if c == '"': out.append(c); i += 1; state = "dq"; esc = False; continue
            if c == "`": out.append(c); i += 1; state = "bt"; esc = False; continue
            out.append(c); i += 1

        elif state == "lc":
            if c == "\n": out.append("\n"); state = "code"
            i += 1

        elif state == "bc":
            if c == "*" and nxt == "/":
                out.append(" "); i += 2; state = "code"; continue
            i += 1

        else:  # sq | dq | bt
            out.append(c); i += 1
            if esc:   esc = False; continue
            if c == "\\": esc = True; continue
            if state == "sq" and c == "'": state = "code"
            elif state == "dq" and c == '"': state = "code"
            elif state == "bt" and c == "`": state = "code"

    result = "".join(out)
    result = re.sub(r"[ \t]+", " ", result)        # collapse horizontal whitespace
    result = re.sub(r" *\n *", "\n", result)        # trim spaces around newlines
    result = re.sub(r"\n{2,}", "\n", result)        # collapse blank lines
    return result.strip()

def minify_html(html: str) -> str:
    """Strip HTML comments and collapse inter-tag whitespace, leaving raw blocks intact."""
    blocks: list[str] = []
    def protect(m: re.Match) -> str:
        blocks.append(m.group(0))
        return f"\x00{len(blocks)-1}\x00"
    html = RAW_RE.sub(protect, html)
    html = re.sub(r"<!--.*?-->", "", html, flags=re.DOTALL)
    html = re.sub(r"\s+", " ", html)
    html = re.sub(r">\s+<", "><", html)
    for i, b in enumerate(blocks):
        html = html.replace(f"\x00{i}\x00", b)
    return html.strip()

# ── Inliners ────────────────────────────────────────────────────────────────────
def inline_css(html: str, base: Path) -> str:
    def repl(m: re.Match) -> str:
        href_m = HREF_RE.search(m.group(0))
        if not href_m or is_external(href_m.group(1)):
            return m.group(0)
        p = (base / href_m.group(1)).resolve()
        css = minify_css(read(p))
        css = re.sub(r"</style", r"<\\/style", css, flags=re.IGNORECASE)
        return f"<style>{css}</style>"
    return LINK_RE.sub(repl, html)

def inline_js(html: str, base: Path) -> str:
    def repl(m: re.Match) -> str:
        src = m.group(2)
        if is_external(src):
            return m.group(0)
        p  = (base / src).resolve()
        js = minify_js(read(p))
        js = re.sub(r"</script", r"<\\/script", js, flags=re.IGNORECASE)
        attrs = (m.group(1) + " " + m.group(3)).strip()
        attrs = re.sub(r"""\bsrc\s*=\s*["'][^"']+["']""", "", attrs).strip()
        return f"<script{' ' + attrs if attrs else ''}>\n{js}\n</script>"
    return SCRIPT_RE.sub(repl, html)

# ── Main ─────────────────────────────────────────────────────────────────────────
def main() -> int:
    if not ENTRY.exists():
        print(f"Missing entry: {ENTRY}", file=sys.stderr); return 2

    if MAKE_README_JS.exists():
        subprocess.run([sys.executable, str(MAKE_README_JS)], cwd=str(ROOT), check=False)

    html = read(ENTRY)
    html = inline_css(html, ENTRY.parent)
    html = inline_js(html, ENTRY.parent)
    html = minify_html(html)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_HTML.write_text(html, encoding="utf-8")
    size = OUT_HTML.stat().st_size
    print(f"OK  {OUT_HTML}  ({size:,} bytes)")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
