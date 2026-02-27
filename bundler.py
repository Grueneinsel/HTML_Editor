#!/usr/bin/env python3
# bundle.py — entry: ./index.html, output: ./dist/index.html
#
# Includes:
# - inline local CSS/JS
# - fixes "</script" inside inlined JS to "<\/script"
# - minifies HTML aggressively + minifies inline CSS conservatively

from __future__ import annotations
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.resolve()

ENTRY = ROOT / "index.html"
OUT_DIR = ROOT / "dist"
OUT_HTML = OUT_DIR / "index.html"

# Optional: README -> generated/readme_content.js aktualisieren
MAKE_README_JS = ROOT / "make_readme_js.py"

# Aggressive: removes whitespace text nodes between tags: `>   <` -> `><`
# WARNING: can change visual spacing if you rely on whitespace between inline elements.
AGGRESSIVE_REMOVE_INTERTAG_WHITESPACE = True

LINK_RE = re.compile(
    r"""<link\b([^>]*?)\brel\s*=\s*["']stylesheet["']([^>]*?)>""",
    re.IGNORECASE,
)
HREF_RE = re.compile(r"""href\s*=\s*["']([^"']+)["']""", re.IGNORECASE)

SCRIPT_RE = re.compile(
    r"""<script\b([^>]*?)\bsrc\s*=\s*["']([^"']+)["']([^>]*)>\s*</script>""",
    re.IGNORECASE | re.DOTALL,
)

RAW_BLOCK_RE = re.compile(
    r"""<(script|style|pre|textarea)\b[^>]*>.*?</\1>""",
    re.IGNORECASE | re.DOTALL,
)

def is_external(url: str) -> bool:
    u = url.strip().lower()
    return (
        u.startswith("http://")
        or u.startswith("https://")
        or u.startswith("//")
        or u.startswith("data:")
    )

def read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8")

def minify_css(css: str) -> str:
    # remove /* ... */ comments
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.DOTALL)
    # collapse whitespace
    css = re.sub(r"\s+", " ", css)
    # tighten around safe punctuation
    css = re.sub(r"\s*([{}:;,])\s*", r"\1", css)
    css = css.replace(";}", "}")
    return css.strip()

def protect_raw_blocks(html: str) -> tuple[str, list[str]]:
    blocks: list[str] = []

    def repl(m: re.Match) -> str:
        blocks.append(m.group(0))
        return f"__RAW_BLOCK_{len(blocks)-1}__"

    return RAW_BLOCK_RE.sub(repl, html), blocks

def restore_raw_blocks(html: str, blocks: list[str]) -> str:
    for i, b in enumerate(blocks):
        html = html.replace(f"__RAW_BLOCK_{i}__", b)
    return html

def minify_html_markup(html: str) -> str:
    # Protect raw blocks (script/style/pre/textarea) from HTML minify
    outside, blocks = protect_raw_blocks(html)

    # Remove HTML comments
    outside = re.sub(r"<!--.*?-->", "", outside, flags=re.DOTALL)

    # Collapse whitespace generally
    outside = re.sub(r"\s+", " ", outside)

    if AGGRESSIVE_REMOVE_INTERTAG_WHITESPACE:
        outside = re.sub(r">\s+<", "><", outside)

    outside = outside.strip()
    return restore_raw_blocks(outside, blocks)

def inline_css(html: str, base_dir: Path) -> str:
    def repl(m: re.Match) -> str:
        whole = m.group(0)
        href_m = HREF_RE.search(whole)
        if not href_m:
            return whole
        href = href_m.group(1)
        if is_external(href):
            return whole

        css_path = (base_dir / href).resolve()
        if not css_path.exists():
            raise FileNotFoundError(f"CSS not found: {href} -> {css_path}")

        css = read_text(css_path)
        css = minify_css(css)

        # Optional safety: prevent premature </style> close if it ever appears in CSS text
        css = re.sub(r"</style", r"<\\/style", css, flags=re.IGNORECASE)

        return f"<!-- inlined: {href} --><style>{css}</style>"

    return LINK_RE.sub(repl, html)

def inline_js(html: str, base_dir: Path) -> str:
    def repl(m: re.Match) -> str:
        before_attrs = m.group(1) or ""
        src = m.group(2)
        after_attrs = m.group(3) or ""

        if is_external(src):
            return m.group(0)

        js_path = (base_dir / src).resolve()
        if not js_path.exists():
            raise FileNotFoundError(f"JS not found: {src} -> {js_path}")

        js = read_text(js_path)

        # CRITICAL FIX for README etc: prevent premature </script> termination when inlined
        js = re.sub(r"</script", r"<\\/script", js, flags=re.IGNORECASE)

        # keep other attributes except src
        attrs = (before_attrs + " " + after_attrs).strip()
        attrs = re.sub(r"""\bsrc\s*=\s*["'][^"']+["']""", "", attrs, flags=re.IGNORECASE).strip()
        attrs_str = f" {attrs}" if attrs else ""

        # keep a short marker comment (will be removed by HTML minifier anyway)
        return f"<!-- inlined: {src} --><script{attrs_str}>\n{js}\n</script>"

    return SCRIPT_RE.sub(repl, html)

def main() -> int:
    if not ENTRY.exists():
        print(f"Missing entry: {ENTRY}", file=sys.stderr)
        return 2

    # Optional: generate readme JS first
    if MAKE_README_JS.exists():
        subprocess.run([sys.executable, str(MAKE_README_JS)], cwd=str(ROOT), check=False)

    base_dir = ENTRY.parent
    html = read_text(ENTRY)

    # Inline assets
    html = inline_css(html, base_dir)
    html = inline_js(html, base_dir)

    # Minify HTML markup
    html = minify_html_markup(html)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_HTML.write_text(html, encoding="utf-8")
    print(f"OK: wrote {OUT_HTML}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())