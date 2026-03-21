#!/usr/bin/env python3
# bundler.py — entry: ./index.html, output: ./dist/index.html
# Inlines all local <link rel="stylesheet"> and <script src="…"> references.
# Minifies CSS (rcssmin) and JS (rjsmin) when available.

from __future__ import annotations
import re
import subprocess
import sys
from pathlib import Path

try:
    import rcssmin as _rcssmin
    def _minify_css(s: str) -> str: return _rcssmin.cssmin(s)
except ImportError:
    def _minify_css(s: str) -> str: return s

try:
    import rjsmin as _rjsmin
    def _minify_js(s: str) -> str: return _rjsmin.jsmin(s)
except ImportError:
    def _minify_js(s: str) -> str: return s

ROOT     = Path(__file__).parent.resolve()
ENTRY    = ROOT / "index.html"
OUT_DIR  = ROOT / "dist"
OUT_HTML = OUT_DIR / "index.html"
MAKE_README_JS = ROOT / "make_readme_js.py"

LINK_RE   = re.compile(r"""<link\b([^>]*?)\brel\s*=\s*["']stylesheet["']([^>]*?)>""", re.IGNORECASE)
HREF_RE   = re.compile(r"""href\s*=\s*["']([^"']+)["']""", re.IGNORECASE)
SCRIPT_RE = re.compile(r"""<script\b([^>]*?)\bsrc\s*=\s*["']([^"']+)["']([^>]*)>\s*</script>""",
                        re.IGNORECASE | re.DOTALL)

MIME_MAP = {
    ".woff2": "font/woff2",
    ".woff":  "font/woff",
    ".ttf":   "font/ttf",
    ".svg":   "image/svg+xml",
    ".png":   "image/png",
    ".jpg":   "image/jpeg",
    ".jpeg":  "image/jpeg",
    ".gif":   "image/gif",
}
CSS_URL_RE = re.compile(r"""url\(\s*['"]?([^'"\)]+)['"]?\s*\)""")

def is_external(url: str) -> bool:
    return url.strip().lower().startswith(("http://", "https://", "//", "data:"))

def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")

def inline_css_urls(css: str, css_path: Path) -> str:
    """Replace local url(...) references in CSS with base64 data URIs."""
    import base64
    def repl(m: re.Match) -> str:
        url = m.group(1).strip()
        if is_external(url):
            return m.group(0)
        target = (css_path.parent / url).resolve()
        if not target.exists():
            return m.group(0)
        mime = MIME_MAP.get(target.suffix.lower(), "application/octet-stream")
        data = base64.b64encode(target.read_bytes()).decode("ascii")
        return f"url('data:{mime};base64,{data}')"
    return CSS_URL_RE.sub(repl, css)

def inline_css(html: str, base: Path) -> str:
    def repl(m: re.Match) -> str:
        href_m = HREF_RE.search(m.group(0))
        if not href_m or is_external(href_m.group(1)):
            return m.group(0)
        css_path = (base / href_m.group(1)).resolve()
        css = read(css_path)
        css = inline_css_urls(css, css_path)
        css = _minify_css(css)
        css = css.replace("</style", "<\\/style")
        return f"<style>{css}</style>"
    return LINK_RE.sub(repl, html)

def inline_js(html: str, base: Path) -> str:
    def repl(m: re.Match) -> str:
        src = m.group(2)
        if is_external(src):
            return m.group(0)
        js = read((base / src).resolve())
        js = _minify_js(js)
        js = js.replace("</script", "<\\/script")
        attrs = re.sub(r"""\bsrc\s*=\s*["'][^"']+["']""", "",
                       (m.group(1) + " " + m.group(3)).strip()).strip()
        return f"<script{' ' + attrs if attrs else ''}>{js}</script>"
    return SCRIPT_RE.sub(repl, html)

def main() -> int:
    if not ENTRY.exists():
        print(f"Missing entry: {ENTRY}", file=sys.stderr)
        return 2

    if MAKE_README_JS.exists():
        print("Running make_readme_js.py …")
        subprocess.run([sys.executable, str(MAKE_README_JS)], cwd=str(ROOT), check=False)

    from datetime import datetime as _datetime
    _now       = _datetime.now()
    build_date = _now.strftime("%Y-%m-%d")           # for footer: 2026-03-21
    build_ts   = _now.strftime("%Y-%m-%dT%H:%M:%S")  # for version.txt: 2026-03-21T15:30:45

    html = read(ENTRY)
    html = html.replace("__BUILD_DATE__", build_date)
    html = inline_css(html, ENTRY.parent)
    html = inline_js(html, ENTRY.parent)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_HTML.write_text(html, encoding="utf-8")

    # Copy static files that must be served alongside index.html
    for fname in ("sitemap.xml", "robots.txt"):
        src = ROOT / fname
        if src.exists():
            import shutil
            shutil.copy2(src, OUT_DIR / fname)
            print(f"OK  {OUT_DIR / fname}")

    (OUT_DIR / "version.txt").write_text(build_ts, encoding="utf-8")
    size = OUT_HTML.stat().st_size
    print(f"OK  {OUT_HTML}  ({size:,} bytes)")
    return 0

def _source_files():
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
        if any(last.get(f) != curr.get(f) for f in set(last) | set(curr)):
            print(f"\nFile changed — rebuilding …")
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
