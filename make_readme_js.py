#!/usr/bin/env python3
"""
Converts README.md to a JavaScript file so the help modal works
without a local HTTP server (file:// protocol).

Usage:
    python make_readme_js.py

Output:
    generated/readme_content.js  →  window.README_CONTENT = `...`;

Add the generated file to index.html (already done if you used the bundled version):
    <script src="generated/readme_content.js"></script>
"""

import pathlib
import sys

ROOT    = pathlib.Path(__file__).parent
SRC     = ROOT / "README.md"
OUT_DIR = ROOT / "generated"
OUT     = OUT_DIR / "readme_content.js"


def js_escape_template_literal(text: str) -> str:
    """Escape chars that are special inside a JS template literal."""
    text = text.replace("\\", "\\\\")   # backslash first
    text = text.replace("`",  "\\`")    # backtick
    text = text.replace("${", "\\${")   # template placeholder
    return text


def main() -> int:
    if not SRC.exists():
        print(f"ERROR: {SRC} not found.", file=sys.stderr)
        return 1

    content = SRC.read_text(encoding="utf-8")
    escaped = js_escape_template_literal(content)

    OUT_DIR.mkdir(exist_ok=True)

    js = (
        "// Auto-generated from README.md — do not edit manually.\n"
        "// Regenerate with:  python make_readme_js.py\n"
        f"window.README_CONTENT = `{escaped}`;\n"
    )
    OUT.write_text(js, encoding="utf-8")

    print(f"OK  {OUT.relative_to(ROOT)}")
    print(f"    {len(content):,} chars  ->  {OUT.stat().st_size:,} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
