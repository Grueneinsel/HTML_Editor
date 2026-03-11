#!/usr/bin/env python3
"""
Converts README.md (English, primary) and README.de.md (German) into a single
JavaScript file so the help modal works without a local HTTP server
(file:// protocol).

Usage:
    python make_readme_js.py

Output:
    generated/readme_content.js
        window.README_CONTENT_EN = `...`;   // English (primary)
        window.README_CONTENT_DE = `...`;   // German (falls back to EN if missing)

The generated file is already referenced in index.html:
    <script src="generated/readme_content.js"></script>
"""

import pathlib
import sys

ROOT    = pathlib.Path(__file__).parent
OUT_DIR = ROOT / "generated"
OUT     = OUT_DIR / "readme_content.js"

SOURCES = [
    ("README.md",               "README_CONTENT_EN"),
    ("README.de.md",            "README_CONTENT_DE"),
    ("testdata/template.json",  "TAGSET_TEMPLATE"),
]


def js_escape_template_literal(text: str) -> str:
    """Escape chars that are special inside a JS template literal."""
    text = text.replace("\\", "\\\\")   # backslash first
    text = text.replace("`",  "\\`")    # backtick
    text = text.replace("${", "\\${")   # template placeholder
    return text


def main() -> int:
    OUT_DIR.mkdir(exist_ok=True)

    lines = [
        "// Auto-generated — do not edit manually.",
        "// Regenerate with:  python make_readme_js.py",
        "",
    ]

    ok = False
    for filename, var in SOURCES:
        src = ROOT / filename
        if not src.exists():
            print(f"SKIP  {filename}  (not found)", file=sys.stderr)
            continue
        content = src.read_text(encoding="utf-8")
        escaped = js_escape_template_literal(content)
        lines.append(f"window.{var} = `{escaped}`;")
        lines.append("")
        size = len(content)
        print(f"OK    {filename:20s}  ->  {var}  ({size:,} chars)")
        ok = True

    if not ok:
        print("ERROR: no source files found.", file=sys.stderr)
        return 1

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"      written to {OUT.relative_to(ROOT)}  ({OUT.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
