#!/usr/bin/env python3
"""Rebuild the defence-notes HTML from the markdown files in this folder.

Every run reads docs/defense/*.md in filename order and overwrites
docs/defense/RahScan_Defense_Notes.html. Run it again after a note changes:

    python3 docs/defense/build_html.py
"""

from __future__ import annotations

import html
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "RahScan_Defense_Notes.html"

_FENCE_OPEN = re.compile(r"^( {0,3})(`{3,}|~{3,})[ \t]*([^`\n]*?)\s*$")
_HEADING = re.compile(r"^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$")
_LIST_ITEM = re.compile(r"^( *)([-*+]|\d+[.)])[ \t]+(.*)$")
_QUOTE = re.compile(r"^ {0,3}>\s?")
_HR = re.compile(r"^ {0,3}(-{3,}|\*{3,}|_{3,})\s*$")
_TABLE_ROW = re.compile(r"^\s*\|.+\|\s*$")
_SEP_CELL = re.compile(r"^:?-{3,}:?$")
_TOKEN = re.compile(
    r"`[^`\n]+`"
    r"|!\[[^\]]*\]\([^)\s]+\)"
    r"|\[[^\]]+\]\([^)\s]+\)"
    r"|\*\*.+?\*\*"
    r"|(?<!\*)\*(?!\*).+?(?<!\*)\*(?!\*)"
)

PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>
(function () {
  var key = "rahscan-defense-theme";
  var theme = null;
  try { theme = localStorage.getItem(key); } catch (e) {}
  if (theme !== "light" && theme !== "dark") {
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", theme);
})();
</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RahScan Defence Notes</title>
<style>
  :root {
    color-scheme: light;
    --bg: #f6f3ee;
    --sidebar: #efeae3;
    --text: #1f1a17;
    --muted: #5c534c;
    --line: #e4ddd4;
    --accent: #1d4e89;
    --code-bg: #f3efe8;
    --th-bg: #efe8dc;
    --row-alt: #faf7f2;
    --hover: rgba(29, 78, 137, 0.1);
    --select: #d5e4f5;
  }
  :root[data-theme="dark"] {
    color-scheme: dark;
    --bg: #1a1714;
    --sidebar: #141210;
    --text: #f4efe8;
    --muted: #d4c8b8;
    --line: #3a332c;
    --accent: #9ec1e8;
    --code-bg: #221e1b;
    --th-bg: #2e2924;
    --row-alt: #241f1c;
    --hover: rgba(158, 193, 232, 0.14);
    --select: #2c4664;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    display: grid;
    grid-template-columns: 17.5rem minmax(0, 1fr);
    background: var(--bg);
    color: var(--text);
    font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
    font-size: 1.125rem;
    line-height: 1.65;
  }
  ::selection { background: var(--select); color: var(--text); }
  .skip {
    position: absolute;
    left: -999px;
    top: 0.5rem;
    background: var(--bg);
    color: var(--text);
    padding: 0.4rem 0.7rem;
    z-index: 2;
  }
  .skip:focus { left: 0.5rem; }
  aside {
    position: sticky;
    top: 0;
    align-self: start;
    height: 100vh;
    overflow: auto;
    overscroll-behavior: contain;
    background: var(--sidebar);
    border-right: 1px solid var(--line);
    padding: 1.15rem 0.9rem 2rem;
    font-family: "Avenir Next", "Segoe UI", sans-serif;
    font-size: 0.98rem;
    line-height: 1.35;
  }
  .toc-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin: 0 0.2rem 0.85rem;
  }
  .brand {
    margin: 0;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-size: 0.78rem;
    color: var(--muted);
  }
  #theme-toggle {
    font: inherit;
    font-size: 0.85rem;
    font-weight: 650;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 0.22rem 0.7rem;
    cursor: pointer;
  }
  #theme-toggle:hover { border-color: var(--accent); color: var(--accent); }
  #theme-toggle .when-dark { display: none; }
  :root[data-theme="dark"] #theme-toggle .when-light { display: none; }
  :root[data-theme="dark"] #theme-toggle .when-dark { display: inline; }
  .toc, .toc ul { list-style: none; margin: 0; padding: 0; }
  .toc > li { margin: 0 0 0.9rem; }
  .toc a {
    display: block;
    padding: 0.16rem 0.35rem;
    border-radius: 0.3rem;
    color: inherit;
    text-decoration: none;
    overflow-wrap: anywhere;
  }
  .toc a:hover, .toc a:focus-visible { background: var(--hover); color: var(--accent); }
  .toc .file-link { font-weight: 700; }
  .toc .lvl-1 { padding-left: 0.7rem; font-weight: 650; }
  .toc .lvl-2 { padding-left: 1.15rem; }
  .toc .lvl-3 { padding-left: 1.65rem; color: var(--muted); }
  .toc .lvl-4 { padding-left: 2.15rem; color: var(--muted); }
  main {
    width: min(40rem, 100%);
    margin-inline: auto;
    padding: 2.6rem 1.5rem 4rem;
  }
  .kicker {
    margin: 0 0 0.35rem;
    font-family: "Avenir Next", "Segoe UI", sans-serif;
    font-size: 0.75rem;
    font-weight: 650;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
  }
  article.note + article.note {
    margin-top: 2.4rem;
    padding-top: 1.8rem;
    border-top: 1px solid var(--line);
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: inherit;
    line-height: 1.28;
    scroll-margin-top: 1.25rem;
  }
  h1 { font-size: 2rem; font-weight: 700; margin: 0 0 0.8rem; }
  h2 { font-size: 1.45rem; font-weight: 700; margin: 1.8rem 0 0.55rem; }
  h3 { font-size: 1.2rem; font-weight: 700; margin: 1.4rem 0 0.4rem; }
  h4, h5, h6 { font-size: 1.05rem; font-weight: 700; margin: 1.2rem 0 0.35rem; }
  p { margin: 0.7rem 0; }
  a { color: var(--accent); }
  main a { text-underline-offset: 0.14em; }
  ul, ol { margin: 0.55rem 0 0.8rem; padding-left: 1.35rem; }
  li { margin: 0.22rem 0; }
  li > ul, li > ol { margin: 0.15rem 0 0.3rem; }
  blockquote {
    margin: 1rem 0;
    padding: 0.15rem 0 0.15rem 1rem;
    border-left: 3px solid var(--accent);
    color: var(--muted);
  }
  hr { border: 0; border-top: 1px solid var(--line); margin: 1.8rem 0; }
  code {
    font-family: "SF Mono", ui-monospace, Menlo, Consolas, monospace;
    font-size: 0.86em;
    font-variant-ligatures: none;
    background: var(--code-bg);
    padding: 0.08em 0.34em;
    border-radius: 0.25rem;
  }
  pre {
    background: var(--code-bg);
    border: 1px solid var(--line);
    border-radius: 0.55rem;
    padding: 0.85rem 1rem;
    overflow: auto;
    line-height: 1.45;
  }
  pre code { background: none; padding: 0; }
  .diagram-wrap { overflow-x: auto; margin: 1rem 0 1.3rem; }
  pre.mermaid {
    background: transparent;
    border: 0;
    padding: 0;
    text-align: center;
    font-family: inherit;
  }
  .table-wrap { overflow-x: auto; margin: 1rem 0 1.35rem; }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.98rem;
    line-height: 1.45;
  }
  th, td {
    border: 1px solid var(--line);
    padding: 0.5rem 0.7rem;
    vertical-align: top;
    text-align: left;
  }
  th { background: var(--th-bg); font-weight: 700; }
  tbody tr:nth-child(even) td { background: var(--row-alt); }
  img { max-width: 100%; height: auto; }
  footer {
    margin-top: 2.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
    color: var(--muted);
    font-family: "Avenir Next", "Segoe UI", sans-serif;
    font-size: 0.9rem;
  }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  @media (max-width: 860px) {
    body { display: block; }
    aside {
      position: relative;
      height: auto;
      max-height: 46vh;
      border-right: 0;
      border-bottom: 1px solid var(--line);
    }
    main { padding: 1.4rem 1.05rem 3rem; }
  }
  @media print {
    body { display: block; background: white; color: black; font-size: 11pt; }
    aside, .skip, #theme-toggle, footer { display: none; }
    main { width: auto; max-width: none; padding: 0; }
    a { color: black; }
    pre, th { background: white; }
  }
</style>
</head>
<body>
<a class="skip" href="#content">Skip to notes</a>
<aside>
  <div class="toc-head">
    <p class="brand">RahScan</p>
    <button type="button" id="theme-toggle" aria-label="Switch to dark mode"><span class="when-light">Dark</span><span class="when-dark">Light</span></button>
  </div>
  __TOC__
</aside>
<main id="content">
__MAIN__
</main>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11.12.2/dist/mermaid.min.js"></script>
<script>
(function () {
  var key = "rahscan-defense-theme";
  var root = document.documentElement;
  var btn = document.getElementById("theme-toggle");
  var diagrams = Array.prototype.slice.call(document.querySelectorAll(".mermaid"));
  diagrams.forEach(function (el) {
    el.setAttribute("data-src", el.textContent);
  });

  function label(theme) {
    var dark = theme === "dark";
    btn.setAttribute("aria-pressed", dark ? "true" : "false");
    btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  }

  function renderDiagrams() {
    if (!window.mermaid || !diagrams.length) return;
    var dark = root.getAttribute("data-theme") === "dark";
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: dark ? "dark" : "default",
        securityLevel: "strict"
      });
      diagrams.forEach(function (el) {
        el.removeAttribute("data-processed");
        el.textContent = el.getAttribute("data-src");
      });
      var pending = mermaid.run({ nodes: diagrams });
      if (pending && pending.catch) pending.catch(function (err) { console.error(err); });
    } catch (err) {
      console.error(err);
    }
  }

  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem(key, theme); } catch (e) {}
    label(theme);
    renderDiagrams();
  }

  label(root.getAttribute("data-theme") || "light");
  btn.addEventListener("click", function () {
    setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });
  renderDiagrams();
})();
</script>
</body>
</html>
"""


def normalize(text: str) -> list[str]:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    if text.startswith("\ufeff"):
        text = text[1:]
    return text.split("\n")


def slug(text: str) -> str:
    text = text.lower().replace("_", "-")
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    text = re.sub(r"\s+", "-", text.strip())
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text[:80]


def unique_id(base: str, used: dict[str, int]) -> str:
    base = base.strip("-") or "section"
    count = used.get(base, 0) + 1
    used[base] = count
    if count == 1:
        return base
    return f"{base}-{count}"


def plain(text: str) -> str:
    text = re.sub(r"!\[([^\]]*)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = text.replace("*", "")
    return re.sub(r"\s+", " ", text).strip()


def split_link(token: str) -> tuple[str, str]:
    end = token.find("](")
    return token[1:end], token[end + 2 : -1]


def render_inline(raw: str) -> str:
    if not raw:
        return ""
    out: list[str] = []
    pos = 0
    for match in _TOKEN.finditer(raw):
        if match.start() > pos:
            out.append(html.escape(raw[pos : match.start()]))
        out.append(render_token(match.group(0)))
        pos = match.end()
    if pos < len(raw):
        out.append(html.escape(raw[pos:]))
    return "".join(out)


def render_token(token: str) -> str:
    if token.startswith("`") and token.endswith("`"):
        return "<code>" + html.escape(token[1:-1]) + "</code>"
    if token.startswith("!["):
        alt, url = split_link(token[1:])
        return f'<img alt="{html.escape(alt, quote=True)}" src="{html.escape(url, quote=True)}">'
    if token.startswith("["):
        label, url = split_link(token)
        extra = ""
        if url.startswith(("http://", "https://")):
            extra = ' target="_blank" rel="noopener noreferrer"'
        return f'<a href="{html.escape(url, quote=True)}"{extra}>{render_inline(label)}</a>'
    if token.startswith("**"):
        return "<strong>" + render_inline(token[2:-2]) + "</strong>"
    if token.startswith("*") and token.endswith("*"):
        return "<em>" + render_inline(token[1:-1]) + "</em>"
    return html.escape(token)


def split_cells(line: str) -> list[str]:
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|") and not line.endswith("\\|"):
        line = line[:-1]
    cells: list[str] = []
    buf: list[str] = []
    i = 0
    while i < len(line):
        if line[i] == "\\" and i + 1 < len(line) and line[i + 1] == "|":
            buf.append("|")
            i += 2
            continue
        if line[i] == "|":
            cells.append("".join(buf).strip())
            buf = []
            i += 1
            continue
        buf.append(line[i])
        i += 1
    cells.append("".join(buf).strip())
    return cells


def is_separator_row(line: str) -> bool:
    if "|" not in line:
        return False
    cells = [cell.replace(" ", "") for cell in split_cells(line)]
    return bool(cells) and all(_SEP_CELL.fullmatch(cell) for cell in cells)


def alignment(cell: str) -> str:
    compact = cell.strip().replace(" ", "")
    left = compact.startswith(":")
    right = compact.endswith(":")
    if left and right:
        return "center"
    if right:
        return "right"
    return "left"


def is_table_start(lines: list[str], index: int) -> bool:
    if index + 1 >= len(lines):
        return False
    if not lines[index].strip().startswith("|"):
        return False
    return is_separator_row(lines[index + 1])


def is_fence_close(line: str, char: str, length: int) -> bool:
    match = re.match(r"^( {0,3})(`+|~+)\s*$", line)
    if not match:
        return False
    marks = match.group(2)
    return marks[0] == char and len(marks) >= length


def starts_block(lines: list[str], index: int) -> bool:
    line = lines[index]
    if (
        _FENCE_OPEN.match(line)
        or _HEADING.match(line)
        or _HR.match(line)
        or _LIST_ITEM.match(line)
        or _QUOTE.match(line)
    ):
        return True
    return is_table_start(lines, index)


def render_table(header: list[str], aligns: list[str], rows: list[list[str]]) -> str:
    width = len(header)

    def cell(tag: str, text: str, align: str) -> str:
        style = f' style="text-align:{align}"' if align in ("center", "right") else ""
        return f"<{tag}{style}>{render_inline(text)}</{tag}>"

    head = "".join(
        cell("th", text, aligns[i] if i < len(aligns) else "left")
        for i, text in enumerate(header)
    )
    body_rows: list[str] = []
    for row in rows:
        padded = row + [""] * (width - len(row))
        tds = "".join(
            cell("td", padded[i], aligns[i] if i < len(aligns) else "left")
            for i in range(width)
        )
        body_rows.append(f"<tr>{tds}</tr>")
    body = f"<tbody>{''.join(body_rows)}</tbody>" if body_rows else ""
    return f'<div class="table-wrap"><table><thead><tr>{head}</tr></thead>{body}</table></div>'


def language_class(lang: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9_+#.-]", "", lang)
    if not safe:
        return ""
    return f' class="language-{safe}"'


def render_code(lang: str, code: str) -> str:
    if lang.lower() == "mermaid":
        if not code.strip():
            return ""
        return f'<div class="diagram-wrap"><pre class="mermaid">{html.escape(code)}</pre></div>'
    klass = language_class(lang)
    return f"<pre><code{klass}>{html.escape(code)}</code></pre>"


def render_items(items: list[dict], index: int, parent_indent: int) -> tuple[str, int]:
    chunks: list[str] = []
    while index < len(items) and items[index]["indent"] > parent_indent:
        indent = items[index]["indent"]
        tag = items[index]["tag"]
        start = items[index]["start"]
        lis: list[str] = []
        while (
            index < len(items)
            and items[index]["indent"] == indent
            and items[index]["tag"] == tag
        ):
            item = items[index]
            index += 1
            child = ""
            if index < len(items) and items[index]["indent"] > indent:
                child, index = render_items(items, index, indent)
            bits = [render_inline(item["text"])]
            if item["extra"]:
                bits.append(render_inline(" ".join(item["extra"])))
            lis.append("<li>" + " ".join(bits) + child + "</li>")
        attr = ""
        if tag == "ol" and isinstance(start, int) and start != 1:
            attr = f' start="{start}"'
        chunks.append(f"<{tag}{attr}>{''.join(lis)}</{tag}>")
    return "".join(chunks), index


def parse_list(lines: list[str], index: int) -> tuple[str, int]:
    items: list[dict] = []
    total = len(lines)
    first = _LIST_ITEM.match(lines[index])
    if not first:
        return "", index
    base_indent = len(first.group(1))
    while index < total:
        line = lines[index]
        if not line.strip():
            peek = index + 1
            while peek < total and not lines[peek].strip():
                peek += 1
            if peek < total:
                nxt = _LIST_ITEM.match(lines[peek])
                if nxt and len(nxt.group(1)) >= base_indent:
                    index = peek
                    continue
            break
        match = _LIST_ITEM.match(line)
        if match:
            indent = len(match.group(1))
            if indent < base_indent:
                break
            marker = match.group(2)
            tag = "ol" if marker[0].isdigit() else "ul"
            start = int(re.match(r"\d+", marker).group()) if tag == "ol" else None
            items.append(
                {"indent": indent, "tag": tag, "start": start, "text": match.group(3), "extra": []}
            )
            index += 1
            continue
        if items:
            indent_ws = len(line) - len(line.lstrip(" "))
            if line.strip() and indent_ws > items[-1]["indent"]:
                items[-1]["extra"].append(line.strip())
                index += 1
                continue
        break
    chunk, _ = render_items(items, 0, -1)
    return chunk, index


def parse_blocks(
    lines: list[str],
    toc: list[tuple[int, str, str]],
    used: dict[str, int],
    prefix: str,
) -> str:
    parts: list[str] = []
    index = 0
    total = len(lines)
    while index < total:
        line = lines[index]
        if not line.strip():
            index += 1
            continue

        fence = _FENCE_OPEN.match(line)
        if fence:
            char = fence.group(2)[0]
            length = len(fence.group(2))
            info = fence.group(3).strip()
            lang = info.split()[0] if info else ""
            index += 1
            buf: list[str] = []
            while index < total and not is_fence_close(lines[index], char, length):
                buf.append(lines[index])
                index += 1
            if index < total:
                index += 1
            block = render_code(lang, "\n".join(buf).strip("\n"))
            if block:
                parts.append(block)
            continue

        heading = _HEADING.match(line)
        if heading:
            level = len(heading.group(1))
            text = heading.group(2).strip()
            label = plain(text)
            leaf = slug(label) or "section"
            heading_id = unique_id(f"{prefix}--{leaf}" if prefix else leaf, used)
            if level <= 4:
                toc.append((level, label, heading_id))
            parts.append(f'<h{level} id="{heading_id}">{render_inline(text)}</h{level}>')
            index += 1
            continue

        if _HR.match(line):
            parts.append("<hr>")
            index += 1
            continue

        if is_table_start(lines, index):
            header = split_cells(line)
            aligns = [alignment(cell) for cell in split_cells(lines[index + 1])]
            while len(aligns) < len(header):
                aligns.append("left")
            index += 2
            rows: list[list[str]] = []
            while index < total and _TABLE_ROW.match(lines[index]):
                rows.append(split_cells(lines[index]))
                index += 1
            parts.append(render_table(header, aligns, rows))
            continue

        if _LIST_ITEM.match(line):
            chunk, index = parse_list(lines, index)
            if chunk:
                parts.append(chunk)
            continue

        if _QUOTE.match(line):
            quoted: list[str] = []
            while index < total and _QUOTE.match(lines[index]):
                quoted.append(_QUOTE.sub("", lines[index], count=1))
                index += 1
            inner = parse_blocks(quoted, toc, used, prefix)
            parts.append(f"<blockquote>{inner}</blockquote>")
            continue

        paragraph = [line.strip()]
        index += 1
        while index < total and lines[index].strip() and not starts_block(lines, index):
            paragraph.append(lines[index].strip())
            index += 1
        parts.append("<p>" + render_inline(" ".join(paragraph)) + "</p>")
    return "\n".join(parts)


def render_toc(files: list[tuple[str, str, list[tuple[int, str, str]]]]) -> str:
    if not files:
        return '<p class="brand">No notes yet</p>'
    items: list[str] = []
    for file_id, stem, headings in files:
        children = "".join(
            f'<li><a class="lvl-{level}" href="#{html.escape(heading_id, quote=True)}">{html.escape(label)}</a></li>'
            for level, label, heading_id in headings
        )
        nest = f"<ul>{children}</ul>" if children else ""
        items.append(
            f'<li><a class="file-link" href="#{html.escape(file_id, quote=True)}">{html.escape(stem)}</a>{nest}</li>'
        )
    return '<ol class="toc">' + "".join(items) + "</ol>"


def markdown_files() -> list[Path]:
    return sorted((path for path in HERE.glob("*.md") if path.is_file()), key=lambda path: path.name)


def build(paths: list[Path]) -> str:
    used: dict[str, int] = {}
    articles: list[str] = []
    toc_files: list[tuple[str, str, list[tuple[int, str, str]]]] = []
    for path in paths:
        prefix = slug(path.stem) or "note"
        file_id = unique_id(f"file-{prefix}", used)
        toc: list[tuple[int, str, str]] = []
        body = parse_blocks(normalize(path.read_text(encoding="utf-8")), toc, used, prefix)
        kicker = f'<p class="kicker">{html.escape(path.name)}</p>'
        articles.append(f'<article id="{file_id}" class="note">{kicker}\n{body}\n</article>')
        toc_files.append((file_id, path.stem, toc))
    if articles:
        main = "\n".join(articles)
    else:
        main = "<p>No markdown notes in this folder.</p>"
    count = len(paths)
    noun = "file" if count == 1 else "files"
    main += (
        "\n<footer><p>Built from "
        f"{count} markdown {noun}, in filename order. "
        "Re-run <code>python3 docs/defense/build_html.py</code> "
        "to rebuild this page after a note changes.</p></footer>"
    )
    head, rest = PAGE.split("__TOC__", 1)
    mid, tail = rest.split("__MAIN__", 1)
    page = head + render_toc(toc_files) + mid + main + tail
    if not page.endswith("\n"):
        page += "\n"
    return page


def main() -> int:
    paths = markdown_files()
    OUT.write_text(build(paths), encoding="utf-8", newline="\n")
    print(OUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
