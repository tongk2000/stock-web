#!/usr/bin/env python3
"""Outline of a source file or folder, so that nobody has to read a file whole to find a symbol.

    python3 docs/outline.py <file.ts|file.tsx|file.py> [word ...]   declarations with their line ranges
    python3 docs/outline.py <folder>                                 files (recursively) with line counts and what each holds

Each line is `first-last  declaration  - first sentence of its comment`. Read that range only (`Read` with offset and
limit, or `sed -n 'first,lastp'`). With words, only the declarations whose name or comment contains one of them are
printed (case-insensitive), with the declarations around them kept for context.

TypeScript: top-level declarations (function, class, interface, type, enum, const/let), class members, and one level
inside a function: inner functions, `const x = useCallback/useMemo(` or arrow functions, `useEffect(` blocks (with their
dependency list) and `return (` JSX; one level more inside a block over 100 lines. Plain values (`useState`) are left out.
Python: `def`/`class` at the top and inside a class. The comment is the `/** */`/`//` block above (one blank line may stand
between) or the line's own `//`; Python: the docstring, else the `#` lines above. Not a parser: TypeScript ranges come
from counting brackets outside strings, templates, regex literals and comments (a quote in JSX text ends with its line);
Python ranges from indentation. No formatter is assumed.
"""
import re
import sys
import tokenize
from pathlib import Path

CODE = (".ts", ".tsx", ".py")
BIG = 100  # an inner block longer than this gets its own inner declarations listed
TOP = re.compile(r"(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?"
                 r"(function\*?|class|interface|type|enum|namespace|const\s+enum|const|let|var)\s+([\w$]+)")
INNER = [
    (re.compile(r"(?:async\s+)?function\*?\s+([\w$]+)"), "function"),
    (re.compile(r"(?:const|let|var)\s+([\w$]+)\s*(?::[^=]+)?=\s*(?:React\.)?(useCallback|useMemo|useEffectEvent)\b"), "hook"),
    (re.compile(r"(?:const|let|var)\s+([\w$]+)\s*(?::[^=]+)?=\s*(?:async\s+)?(?:function\b|[\w$]+\s*=>|<[^>]*>\s*\(|\()"), "arrow"),
    (re.compile(r"(?:React\.)?(useEffect|useLayoutEffect|useInsertionEffect)\s*\("), "effect"),
    (re.compile(r"(return)\s*\($"), "return"),
]
MEMBER = re.compile(r"(?:(?:public|private|protected|static|async|readonly|override|abstract|get|set)\s+)*(#?[\w$]+)\s*(?:<[^>()]*>)?\s*\(")
KEYWORDS = {"if", "for", "while", "switch", "return", "catch", "super", "new", "await", "typeof", "throw", "function"}
CONTINUES_AFTER = tuple("=,([{|&+-*?:><.")
CONTINUES_BEFORE = tuple(".?:|&+*=,")
REGEX_LITERAL = re.compile(r"/(?:\\.|\[(?:\\.|[^\]\\])*\]|[^/\\\n])+/")


def scan_ts(lines):
    """Per line: bracket depth at its start, the code with strings, template text and comments taken out, its `//`
    comment, and whether it starts inside a block comment or a template."""
    depth, mode, stack, out = 0, None, [], []
    for line in lines:
        start, inside, code, note, i, n = depth, mode is not None, [], "", 0, len(line)
        while i < n:
            c, two = line[i], line[i:i + 2]
            if mode == "block":
                if two == "*/":
                    mode, i = None, i + 1
            elif mode == "tpl":
                if c == "\\":
                    i += 1
                elif c == "`":
                    mode = None
                    code.append('"')
                elif two == "${":   # code again until its `}`
                    stack.append(depth)
                    depth, mode, i = depth + 1, None, i + 1
            elif two == "//":
                note = line[i + 2:].strip()
                break
            elif two == "/*":
                mode, i = "block", i + 1
            elif c in "'\"":
                j = i + 1
                while j < n and line[j] != c:
                    j += 2 if line[j] == "\\" else 1
                code.append('""')
                i = j
            elif c == "`":
                mode = "tpl"
            elif c == "/" and re.search(r"(^|[(,=:\[!&|?;{]|\breturn)\s*$", "".join(code)) and (m := REGEX_LITERAL.match(line, i)):
                code.append('""')
                i = m.end() - 1
            else:
                depth += (c in "([{") - (c in ")]}")
                if c == "}" and stack and depth == stack[-1]:
                    stack.pop()
                    mode = "tpl"
                code.append(c)
            i += 1
        out.append((start, "".join(code).strip(), note, inside))
    return out


def comment_text(raw):
    return re.sub(r"^\s*(/\*\*|/\*|\*/|\*|//|#)\s?", "", raw).replace("*/", "").strip()


def sentence(texts, skip=()):
    """First sentence of the first comment line that says something (not a tag, a rule line, or just the name)."""
    for t in texts:
        t = re.sub(r"[─━═=\-]{3,}|^[─━═=\-]+\s*", "", t or "").strip()
        if t and not t.startswith(("@", "eslint", "prettier", "ts-")) and t not in skip:
            return re.split(r"(?<=[.!?])\s", t)[0][:110]
    return ""


def ts_doc_above(lines, scanned, at):
    """The comment block above line `at` (one blank line between is allowed), as (first sentence, index where it
    starts). Without one, the `//` comment at the end of the line itself."""
    gap = at > 1 and not lines[at - 1].strip() and lines[at - 2].strip() and not scanned[at - 2][1]
    start = at - 1 if gap else at
    while start > 0 and lines[start - 1].strip() and not scanned[start - 1][1]:
        start -= 1
    return sentence([comment_text(lines[k]) for k in range(start, at)]) or sentence([scanned[at][2]]), start


def ts_label(lines, scanned, at, kind=""):
    """The declaration as written on its line, without its trailing comment, body brace or initializer."""
    raw = lines[at].strip()
    if scanned[at][2]:
        raw = raw[:raw.rfind("//")].rstrip()
    if kind == "hook":
        return re.match(r".*?\b(?:useCallback|useMemo|useEffectEvent)\b", raw).group(0)
    if kind == "return":
        return "return (...)"
    if kind == "arrow":
        return raw.split("=>")[0].rstrip() + " =>" if "=>" in raw else re.sub(r"[({\s]*$", "", raw) + "(...) =>"
    raw = re.sub(r"\s*(\{|=\s*\{|=\s*\(|=)$", "", raw)
    return raw + "...)" if raw.endswith("(") else raw


def ts_end(scanned, at, base, limit):
    """Last line index of the statement starting at `at` with bracket depth `base`: where the brackets are back at
    `base` and neither that line nor the next one carries the statement on."""
    for i in range(at, limit):
        code = scanned[i][1]
        after = scanned[i + 1][0] if i + 1 < len(scanned) else 0
        if not code or after > base or code.endswith(CONTINUES_AFTER):
            continue
        if not next((s[1] for s in scanned[i + 1:limit] if s[1]), "").startswith(CONTINUES_BEFORE):
            return i
    return limit - 1


def arrow(scanned, at, end):
    """Whether a `const x = ...` statement holds a function: `function`, `x =>`, or `=>` after its `(...)` closes."""
    text = " ".join(s[1] for s in scanned[at:min(end, at + 8) + 1])
    if re.search(r"=\s*(?:async\s+)?(?:function\b|[\w$]+\s*=>)", text):
        return True
    eq, depth = re.search(r"(?<![=!<>])=(?![=>])", text), 0
    for i in range(eq.end() if eq else len(text), len(text)):
        depth += (text[i] == "(") - (text[i] == ")")
        if text[i] == ")" and depth == 0:
            return re.match(r"\s*(?::[^=;]*)?=>", text[i + 1:]) is not None
    return False


def ts_inner(lines, scanned, first, last, level, is_class, rows):
    """Declarations one level inside the block whose header is line `first` and whose closing `}` is on line `last`."""
    if not scanned[last][1].startswith("}") or last - first < 2:
        return
    body, found = scanned[last][0], []
    for i in range(first + 1, last):
        depth, code, _, inside = scanned[i]
        if depth != body or inside or not code:
            continue
        if is_class:
            if (m := MEMBER.match(code)) and m.group(1) not in KEYWORDS:
                found.append((i, m.group(1), ts_label(lines, scanned, i)))
            continue
        for rule, kind in INNER:
            if (m := rule.match(code)) and (kind != "arrow" or arrow(scanned, i, last)):
                found.append((i, m.group(1), ts_label(lines, scanned, i, kind)))
                break
    starts = [ts_doc_above(lines, scanned, i)[1] for i, _, _ in found] + [last]
    for n, (i, name, label) in enumerate(found):
        end = ts_end(scanned, i, body, starts[n + 1])
        if name.startswith("use") and "Effect" in name and (deps := re.search(r",\s*(\[[^\]]*\])\s*\)\s*;?$", scanned[end][1])):
            label = f"{name} {deps.group(1)}"
        rows.append((level, i + 1, end + 1, label[:90], name, ts_doc_above(lines, scanned, i)[0]))
        if end - i > BIG and level < 2:
            ts_inner(lines, scanned, i, end, level + 1, False, rows)


def outline_ts(lines):
    scanned = scan_ts(lines)
    tops = [(i, m) for i, (depth, code, _, inside) in enumerate(scanned)
            if depth == 0 and not inside and (m := TOP.match(code))]
    starts = [ts_doc_above(lines, scanned, i)[1] for i, _ in tops] + [len(lines)]
    rows = []
    for n, (i, m) in enumerate(tops):
        end = ts_end(scanned, i, 0, starts[n + 1])
        rows.append((0, i + 1, end + 1, ts_label(lines, scanned, i)[:100], m.group(2), ts_doc_above(lines, scanned, i)[0]))
        if m.group(1) in ("class", "function", "function*") or m.group(1) in ("const", "let", "var") and arrow(scanned, i, end):
            ts_inner(lines, scanned, i, end, 1, m.group(1) == "class", rows)
    return rows


def head_ts(lines):
    """The comment at the top of the file, above the first import (a 'use client' line may stand before it)."""
    i, texts = 0, []
    while i < len(lines) and (not lines[i].strip() or re.match(r"\s*['\"]use \w+['\"];?\s*$", lines[i])):
        i += 1
    if i < len(lines) and lines[i].lstrip().startswith(("/*", "//")):
        scanned = scan_ts(lines[:i + 60])
        while i < len(scanned) and lines[i].strip() and not scanned[i][1]:
            texts.append(comment_text(lines[i]))
            i += 1
    return texts


def py_statements(lines):
    """Indexes of the lines that start a statement (not a comment, not inside a string or open brackets)."""
    starts, new = set(), True
    try:
        for tok in tokenize.generate_tokens(iter([line + "\n" for line in lines]).__next__):
            if tok.type == tokenize.NEWLINE:
                new = True
            elif new and tok.type not in (tokenize.NL, tokenize.COMMENT, tokenize.INDENT, tokenize.DEDENT):
                starts.add(tok.start[0] - 1)
                new = False
    except (tokenize.TokenError, SyntaxError):
        pass  # what was read so far still counts
    return starts


DEF = re.compile(r"\s*(?:async\s+)?(def|class)\s+(\w+)")
DOCSTRING = re.compile(r"\s*[rRuU]?('''|\"\"\")(.*?)(?:\1|$)", re.S)


def py_doc(lines, at):
    """The first sentence of the docstring under the `def`/`class` on line `at`, else of the `#` lines above it."""
    i = next((k for k in range(at, len(lines)) if re.search(r":\s*(#.*)?$", lines[k])), at)
    m = DOCSTRING.match("\n".join(lines[i + 1:i + 12]))
    if m and (doc := sentence([t.strip() for t in m.group(2).splitlines()])):
        return doc
    k = at
    while k > 0 and lines[k - 1].strip().startswith(("#", "@")):
        k -= 1
    return sentence([comment_text(lines[j]) for j in range(k, at) if lines[j].strip().startswith("#")])


def outline_py(lines):
    starts = py_statements(lines)
    indent = [len(l) - len(l.lstrip()) if i in starts else None for i, l in enumerate(lines)]
    rows = []

    def add(i, m, level):
        end = next((j for j in range(i + 1, len(lines)) if indent[j] is not None and indent[j] <= indent[i]), len(lines))
        end = max(k for k in range(i, end) if lines[k].strip())
        label = re.sub(r"\($", "(...)", lines[i].strip().rstrip(":"))
        rows.append((level, i + 1, end + 1, label[:100], m.group(2), py_doc(lines, i)))
        return end

    for i, line in enumerate(lines):
        if indent[i] == 0 and (m := DEF.match(line)):
            end = add(i, m, 0)
            body = next((indent[j] for j in range(i + 1, end + 1) if indent[j]), None)
            for j in range(i + 1, end + 1) if m.group(1) == "class" else ():
                if indent[j] == body and (member := DEF.match(lines[j])):
                    add(j, member, 1)
    return rows


def head_py(lines):
    m = DOCSTRING.match("\n".join(l for l in lines if not l.startswith("#")).lstrip())
    return [t.strip() for t in m.group(2).splitlines()] if m else []


def outline(path):
    lines = path.read_text(errors="replace").splitlines()
    return lines, (outline_py if path.suffix == ".py" else outline_ts)(lines)


def show_file(path, words):
    lines, rows = outline(path)
    print(f"{path}  ({len(lines)} lines)")
    words = [w.lower() for w in words]
    keep = [not words or any(w in f"{r[4]} {r[5]}".lower() for w in words) for r in rows]
    for n, (depth, first, last, label, _, doc) in enumerate(rows):
        inside = any(keep[k] for k in range(n + 1, len(rows)) if rows[k][0] > depth and rows[k][1] <= last)
        if keep[n] or inside:
            print(f"{'    ' * depth}{first}-{last}  {label}" + (f"  - {doc}" if doc else ""))
    if not rows:
        print("  (no declarations found)")


def show_folder(folder):
    for path in sorted(folder.rglob("*")):
        if path.suffix not in CODE or not path.is_file() or {"node_modules", "__pycache__", ".next", "venv"} & set(path.parts):
            continue
        lines, rows = outline(path)
        tops = [r for r in rows if r[0] == 0]
        doc = sentence(head_py(lines) if path.suffix == ".py" else head_ts(lines), {path.stem}) or next((r[5] for r in tops if r[5]), "")
        if path.suffix == ".py":
            names = ", ".join(r[4] for r in tops if not r[4].startswith("_"))
        else:  # what the file exports, else everything at the top
            names = ", ".join([r[4] for r in tops if r[3].startswith("export")] or [r[4] for r in tops])
        print(f"{path.relative_to(folder)}  ({len(lines)})  {doc}" + (f"  [{names[:120]}]" if names else ""))


def main():
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else sys.exit(__doc__)
    if target.is_dir():
        show_folder(target)
    elif target.is_file():
        show_file(target, sys.argv[2:])
    else:
        sys.exit(f"no such file or folder: {target}")


if __name__ == "__main__":
    main()
