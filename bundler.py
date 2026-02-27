#!/usr/bin/env python3
# bundle.py — fixed entry: ./index.html, fixed output: ./dist/index.html
#
# Fix: When inlining JS into <script>...</script>, any literal "</script" inside
# the JS (e.g. contained in README strings) would prematurely terminate the tag.
# We escape it to "<\/script" (same runtime string, safe for HTML parser).
#
# Optional: same for CSS "</style".

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

LINK_RE = re.compile(
    r"""<link\b([^>]*?)\brel\s*=\s*["']stylesheet["']([^>]*?)>""",
    re.IGNORECASE,
)
HREF_RE = re.compile(r"""href\s*=\s*["']([^"']+)["']""", re.IGNORECASE)

SCRIPT_RE = re.compile(
    r"""<script\b([^>]*?)\bsrc\s*=\s*["']([^"']+)["']([^>]*)>\s*</script>""",
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

        # Optional safety: prevent premature </style> close if it ever appears in CSS text
        css = re.sub(r"</style", r"<\\/style", css, flags=re.IGNORECASE)

        return f"<!-- inlined: {href} -->\n<style>\n{css}\n</style>"

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

        # CRITICAL FIX: prevent premature </script> termination when inlined
        js = re.sub(r"</script", r"<\\/script", js, flags=re.IGNORECASE)

        # andere Attribute behalten (type="module", defer, nomodule, ...)
        attrs = (before_attrs + " " + after_attrs).strip()
        attrs = re.sub(r"""\bsrc\s*=\s*["'][^"']+["']""", "", attrs, flags=re.IGNORECASE).strip()
        attrs_str = f" {attrs}" if attrs else ""

        return f"<!-- inlined: {src} -->\n<script{attrs_str}>\n{js}\n</script>"

    return SCRIPT_RE.sub(repl, html)

def main() -> int:
    if not ENTRY.exists():
        print(f"Missing entry: {ENTRY}", file=sys.stderr)
        return 2

    # README JS Generator laufen lassen (optional)
    if MAKE_README_JS.exists():
        # check=False: bundlen soll trotzdem gehen, falls README-Gen mal fehlschlägt
        subprocess.run([sys.executable, str(MAKE_README_JS)], cwd=str(ROOT), check=False)

    base_dir = ENTRY.parent
    html = read_text(ENTRY)

    html = inline_css(html, base_dir)
    html = inline_js(html, base_dir)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_HTML.write_text(html, encoding="utf-8")
    print(f"OK: wrote {OUT_HTML}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())