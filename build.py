#!/usr/bin/env python3
"""Assemble the training site into a single self-contained HTML file.

Sources live in src/:
  template.html   page shell with {{STYLE}}, {{PAGES}} and {{SCRIPT}} placeholders
  styles.css      all styling
  data.js         quiz bank, glossary, checklist content
  app.js          router, progress tracking, quizzes and interactive exercises
  pages/*.html    one file per route, concatenated in filename order

Outputs:
  index.html            standalone site (open directly in a browser or serve statically)
  dist/artifact.html    same page without the <html>/<head>/<body> skeleton,
                        for hosts that wrap the page themselves
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def build() -> None:
    template = read(SRC / "template.html")
    pages = "\n".join(read(p) for p in sorted((SRC / "pages").glob("*.html")))
    script = read(SRC / "data.js") + "\n" + read(SRC / "app.js")
    html = (
        template.replace("{{STYLE}}", read(SRC / "styles.css"))
        .replace("{{PAGES}}", pages)
        .replace("{{SCRIPT}}", script)
    )
    (ROOT / "index.html").write_text(html, encoding="utf-8")

    # Artifact variant: drop the document skeleton, keep head content at the top.
    head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
    head = re.sub(r'<meta charset="utf-8">\s*', "", head)
    head = re.sub(r'<meta name="viewport"[^>]*>\s*', "", head)
    body = re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)
    (ROOT / "dist").mkdir(exist_ok=True)
    (ROOT / "dist" / "artifact.html").write_text(head.strip() + "\n" + body.strip() + "\n", encoding="utf-8")
    print(f"index.html: {len(html) / 1024:.0f} KB")


if __name__ == "__main__":
    build()
