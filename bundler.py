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
    """Strip // and /* */ comments (respecting strings), then collapse whitespace.

    Template literals (backtick strings) are extracted before whitespace collapsing
    and restored afterwards, so significant indentation (e.g. JSON in README) is kept.
    """
    protected: list[str] = []   # template-literal content, indexed by position
    out  : list[str] = []
    bt_buf: list[str] = []
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
            if c == "`":
                # Begin template literal — buffer it separately
                bt_buf = [c]; i += 1; state = "bt"; esc = False; continue
            out.append(c); i += 1

        elif state == "lc":
            if c == "\n": out.append("\n"); state = "code"
            i += 1

        elif state == "bc":
            if c == "*" and nxt == "/":
                out.append(" "); i += 2; state = "code"; continue
            i += 1

        elif state in ("sq", "dq"):
            out.append(c); i += 1
            if esc:   esc = False; continue
            if c == "\\": esc = True; continue
            if state == "sq" and c == "'": state = "code"
            elif state == "dq" and c == '"': state = "code"

        else:  # bt — accumulate verbatim, emit placeholder when closed
            bt_buf.append(c); i += 1
            if esc:   esc = False; continue
            if c == "\\": esc = True; continue
            if c == "`":
                protected.append("".join(bt_buf))
                out.append(f"\x00{len(protected)-1}\x00")
                bt_buf = []; state = "code"

    result = "".join(out)
    # Collapse whitespace only in code sections (template literals already extracted)
    result = re.sub(r"[ \t]+", " ", result)
    result = re.sub(r" *\n *", "\n", result)
    result = re.sub(r"\n{2,}", "\n", result)
    # Restore template literals verbatim
    for idx, block in enumerate(protected):
        result = result.replace(f"\x00{idx}\x00", block)
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
        print("Running make_readme_js.py …")
        subprocess.run([sys.executable, str(MAKE_README_JS)], cwd=str(ROOT), check=False)

    html = read(ENTRY)
    html = inline_css(html, ENTRY.parent)
    html = inline_js(html, ENTRY.parent)
    html = minify_html(html)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_HTML.write_text(html, encoding="utf-8")
    # Write a version file so the browser can detect rebuilds.
    import time as _time
    (OUT_DIR / "version.txt").write_text(str(int(_time.time())), encoding="utf-8")
    size = OUT_HTML.stat().st_size
    print(f"OK  {OUT_HTML}  ({size:,} bytes)")
    return 0

# ── Watch mode ────────────────────────────────────────────────────────────────────
def _source_files():
    """Return all source files that should trigger a rebuild when modified."""
    files = [ENTRY, MAKE_README_JS]
    for pattern in ("js/*.js", "css/*.css", "lang/*.js"):
        files.extend(ROOT.glob(pattern))
    return [f for f in files if f.exists()]

def _mtimes(files):
    out = {}
    for f in files:
        try: out[f] = f.stat().st_mtime
        except OSError: pass
    return out

def watch() -> int:
    import time
    print("Bundler watch mode — rebuilding on file changes (Ctrl+C to stop)")
    main()
    last = _mtimes(_source_files())
    while True:
        time.sleep(1)
        curr = _mtimes(_source_files())
        changed = [f for f in set(last) | set(curr) if last.get(f) != curr.get(f)]
        if changed:
            print(f"\nChanged: {', '.join(f.name for f in changed)}")
            main()
            last = _mtimes(_source_files())

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--watch":
        try:
            raise SystemExit(watch())
        except KeyboardInterrupt:
            print("\nWatch stopped.")
            raise SystemExit(0)
    raise SystemExit(main())
