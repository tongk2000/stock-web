#!/usr/bin/env python3
"""Checks the indexes against the tree: every source file has a row in its folder's CLAUDE.md (or the FILES.md next to it,
or docs/CODEMAP.md), every folder's CLAUDE.md with a file table is linked from CODEMAP, every document under docs is
linked from INDEX (work records under docs/history from their own index, docs/history/README.md), nothing listed that is
gone, links and anchors alive in every document that describes the present, source paths named in INDEX exist, no
CLAUDE.md too long to be loaded on every read, and no symbol in a guide's "어디를 볼까" table named next to a file that
does not hold it. Source files that have grown long and guides near their limit are printed as NOTE lines: for the next
tidying session (/stock-tidy), not a failure.

    python3 docs/check-index.py              from any folder; exits 1 when something fails
    python3 docs/check-index.py --stop-hook  as Claude Code's Stop hook (see stop_hook)"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent.parent
CODEMAP, INDEX = ROOT / "docs/CODEMAP.md", ROOT / "docs/INDEX.md"
# The work records have their own index by topic, so that INDEX stays short; INDEX links to it.
HISTORY = ROOT / "docs/history/README.md"
SOURCES = ["src", "test", "tool", "supabase/migrations", "stock-collector", ".github/workflows", ".claude/skills"]
# Source files are split by concern before they grow past this (root CLAUDE.md); longer ones are noted, not refused.
SOURCE_LINES = 800
LONG_CHECKED = ("src/", "stock-collector/")
CODE = (".ts", ".tsx", ".py")
OTHER_FILE = re.compile(r"\.(ya?ml|sql|sh|mjs|cjs|js|json|css|md|txt|toml|ico|svg|png)$")
IDENT = r"[A-Za-z_$][\w$]*"
# Where TypeScript/TSX and Python declare a name. Used only to say where a symbol that a file merely imports lives, so it
# errs on the side of seeing a declaration (a statement-leading call such as `setA(` counts as a member).
DECLARED = [
    re.compile(rf"\b(?:function\*?|class|interface|enum|namespace|def)\s+({IDENT})"),   # also `export default function X`
    re.compile(rf"\btype\s+({IDENT})\s*(?:<[^=\n]*>)?\s*="),
    re.compile(rf"\b(?:const|let|var)\s+({IDENT})"),
    re.compile(rf"(?m)^[ \t]*(?:(?:public|private|protected|static|readonly|async|get|set|override|abstract|declare)\s+)*"
               rf"#?({IDENT})\??\s*(?:<[^>\n]*>\s*)?[:(=](?!=)"),   # object and class members, Python module/class `X = `
]
DESTRUCTURED = re.compile(r"\b(?:const|let|var)\s*[\[{]([^\]}=]*)[\]}]\s*(?::[^=\n]*)?=")  # const [a, setA] = / const { a, b: c } =
# Import statements, taken out before a file is searched for where a name is declared or used.
MODULE = r"""\s*from\s*['"][^'"\n]*['"];?"""
IMPORTS = re.compile(
    r"(?m)^[ \t]*import\s+(?:type\s+)?(?:[\w$]+\s*,?\s*)?(?:\{[^}]*\}|\*\s*as\s+[\w$]+)?" + MODULE  # TS import ... from '...'
    + r"""|^[ \t]*import\s*['"][^'"\n]*['"];?"""                                                    # TS import '...'
    + r"|^[ \t]*export\s+(?:type\s+)?(?:\{[^}]*\}|\*(?:\s*as\s+[\w$]+)?)" + MODULE                  # TS export { a } from '...'
    + r"|^[ \t]*from\s+[\w.]+\s+import\s+(?:\([^)]*\)|[^\n]*)"                                       # Python from x import a
    + r"|^[ \t]*import\s+[\w.]+(?:\s+as\s+\w+)?(?:[ \t]*,[ \t]*[\w.]+(?:\s+as\s+\w+)?)*[ \t]*$")     # Python import x
SYMBOL = re.compile(r"_?[A-Za-z$][\w$]*(?:\.[\w$]+)*(?:\([^`]*\))?$")
# A folder's CLAUDE.md comes along with every file read in that folder, so it has to stay short. What is looked up rather
# than read every time (the file table of a big folder) goes to a FILES.md next to it, which is not loaded by itself.
GUIDE_LIMIT = 24_000
GUIDE_NEAR = 22_000


def git_files(*pathspec):
    out = subprocess.run(["git", "-c", "core.quotepath=off", "ls-files", "--cached", "--others", "--exclude-standard", "--",
                          *pathspec], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return [f for f in out.splitlines() if (ROOT / f).exists()]


def read(path):
    return path.read_text(errors="replace") if path.exists() else ""


def guides():
    """The CLAUDE.md of each folder: its rules and, under "## 파일", one row per file of that folder."""
    return [ROOT / f for f in git_files("*CLAUDE.md")]


def tracked():
    return {f for f in git_files(*SOURCES) if Path(f).name not in ("CLAUDE.md", "FILES.md")}


def links(doc):
    """The files a document links to, resolved (link targets may be URL-encoded: `%5Bcode%5D` for `[code]`)."""
    return {(doc.parent / unquote(t.partition("#")[0])).resolve() for t in re.findall(r"\]\(([^)\s]+)\)", read(doc))}


def listed():
    """Files with a row: in CODEMAP (folders without a CLAUDE.md of their own) or in their folder's CLAUDE.md, where a
    "### `sub/`" heading inside "## 파일" starts the rows of a subfolder. A route folder's brackets stay as they are."""
    files, folder = set(), None
    for line in read(CODEMAP).splitlines():
        if line.startswith("#"):
            folder = heading.group(1) if (heading := re.match(r"### `(.+)`$", line)) else None
        elif folder and (row := re.match(r"\| `([^`]+)` \|", line)):
            files.add(f"{folder}{row.group(1)}")
    for guide in guides() + [g.with_name("FILES.md") for g in guides() if g.with_name("FILES.md").exists()]:
        base, sub, inside = f"{guide.parent.relative_to(ROOT)}/".removeprefix("./"), "", False
        for line in read(guide).splitlines():
            if line.startswith("## "):
                inside, sub = line.strip() == "## 파일", ""
            elif inside and (heading := re.match(r"### `(.+)`$", line)):
                sub = heading.group(1)
            elif inside and (row := re.match(r"\| `([^`]+)` \|", line)):
                files.add(f"{base}{sub}{row.group(1)}")
    return files


def unlisted_guides():
    """A folder's CLAUDE.md that CODEMAP does not link to: nobody coming down from the top finds it."""
    linked = links(CODEMAP)
    def has_table(g):
        return "\n## 파일\n" in read(g) or g.with_name("FILES.md").exists()
    return [f"not in CODEMAP: {g.relative_to(ROOT)}" for g in guides() if has_table(g) and g.resolve() not in linked]


def long_guides():
    return [f"over {GUIDE_LIMIT} bytes ({g.stat().st_size}), move what is looked up to FILES.md: {g.relative_to(ROOT)}"
            for g in guides() if g.stat().st_size > GUIDE_LIMIT]


def notes():
    """What a tidying session should look at: nothing here fails the check."""
    out = [f"NOTE: {g.stat().st_size} bytes, near the {GUIDE_LIMIT} limit: {g.relative_to(ROOT)}"
           for g in guides() if GUIDE_NEAR < g.stat().st_size <= GUIDE_LIMIT]
    for f in sorted(tracked()):
        if f.endswith(CODE) and f.startswith(LONG_CHECKED):
            lines = read(ROOT / f).count("\n")
            if lines > SOURCE_LINES:
                out.append(f"NOTE: {lines} lines, split it by concern: {f}")
    return out


def stale_symbols():
    """Rows of a guide's "어디를 볼까" table whose "볼 곳" cell names a symbol next to a file that does not have it, or
    that only imports it (it has moved). A backticked .ts/.tsx/.py file name (a path from the guide's folder, or a name
    or path tail that is unique in the project) sets where the symbols after it are looked up; another kind of file
    (`.sql`, `.yml`) stops the lookup. A capitalized name by itself, or `Name.member`, looks in `Name.tsx`/`Name.ts`/
    `Name.py` when exactly one such file exists. An all-capitals name (`PAGE_SIZE`, `STORAGE_KEYS.THEME`) only has to
    appear in the file. Another `object.member` stops the lookup. What stands in parentheses is an aside: its symbols
    only have to appear in the file. Not a parser: a word that is no symbol is written without backticks."""
    files = sorted(t for t in tracked() if t.endswith(CODE))
    by_name = {}
    for t in files:
        by_name.setdefault(Path(t).name, []).append(ROOT / t)
    text, bare, declared = {}, {}, {}

    def has(path, word, where=text):
        if path not in text:
            text[path] = read(path)
            bare[path] = IMPORTS.sub("", text[path])
        return re.search(rf"(?<![\w$]){re.escape(word)}(?![\w$])", where[path]) is not None

    def declares(path, word):
        if path not in declared:
            has(path, "")
            found = {m.group(1) for rule in DECLARED for m in rule.finditer(bare[path])}
            for m in DESTRUCTURED.finditer(bare[path]):
                found |= set(re.findall(rf"({IDENT})\s*(?:[,=}}\]]|$)", m.group(1)))
            declared[path] = found
        return word in declared[path]

    def file_of(token, guide):
        """The source file a backticked token names: a path from the guide's folder, or a unique file name or path tail."""
        if not token.endswith(CODE):
            return None
        for near in (guide.parent / token, ROOT / token):
            if near.is_file():
                return near.resolve()
        found = [f for f in by_name.get(Path(token).name, []) if str(f).endswith("/" + token.lstrip("./"))]
        return found[0] if len(found) == 1 else False   # False: ambiguous (`page.tsx`) or missing, nothing checked after it

    def own_file(name):
        found = [f for ext in CODE for f in by_name.get(name + ext, [])]
        return found[0] if len(found) == 1 else None

    bad = []
    for guide in guides():
        column, inside, where = None, False, guide.relative_to(ROOT)
        for n, line in enumerate(read(guide).splitlines(), 1):
            if line.startswith("## "):
                inside, column = line.strip() == "## 어디를 볼까", None
                continue
            if not inside or not line.startswith("|"):
                continue
            cells = [c.strip() for c in line.strip().strip("|").split(" | ")]
            if column is None:
                column = cells.index("볼 곳") if "볼 곳" in cells else -1
                continue
            if column < 0 or column >= len(cells) or set(cells[column]) <= set("-: "):
                continue
            stack = [None]  # the file the next symbols are looked up in; one level per open parenthesis
            for part in re.split(r"(`[^`]*`|[()])", cells[column]):
                if part == "(":
                    stack.append(stack[-1])
                elif part == ")":
                    if len(stack) > 1:
                        stack.pop()
                elif part.startswith("`") and len(part) > 2:
                    token = part[1:-1]
                    if OTHER_FILE.search(token):
                        stack[-1] = None        # some other kind of file: what follows is not looked up
                        continue
                    f = file_of(token, guide)
                    if f is not None:
                        stack[-1] = f or None
                        continue
                    if not SYMBOL.match(token):
                        continue                # a route, a path, a sentence: not a symbol
                    names = re.sub(r"\(.*", "", token).split(".")
                    constant = names[0].isupper()
                    if not constant and (len(names) > 1 or names[0][:1].isupper()):
                        # `Name.member`, or a capitalized name by itself: looked up in Name's own file when it has one.
                        owner = own_file(names[0])
                        if owner:
                            stack[-1], names = owner, names[1:]
                        elif len(names) > 1:
                            stack[-1], names = None, []
                    here = stack[-1]
                    if not names or not here:
                        continue
                    missing = [w for w in names if not has(here, w)]
                    if missing:
                        bad.append(f"{where}:{n}: `{token}` is not in {here.relative_to(ROOT)}")
                    elif len(stack) == 1 and not constant and len(names) == 1 and not has(here, names[0], bare):
                        # Named only in an import line: the file uses it, but it lives in another file.
                        homes = [f.relative_to(ROOT) for f in map(ROOT.joinpath, files) if f != here and declares(f, names[0])]
                        home = ", ".join(map(str, homes[:3])) if homes else "another file"
                        bad.append(f"{where}:{n}: `{token}` is only imported in {here.relative_to(ROOT)}; it is declared in {home}")
    return bad


def anchors(path):
    found = set()
    for line in read(path).splitlines():
        if heading := re.match(r"#{1,6} (.+)", line):
            text = heading.group(1).strip().lower().replace("`", "")
            found.add(re.sub(r"[^\w\- ]", "", text).replace(" ", "-"))
    return found


def living_docs():
    """Documents that describe the present: every tracked or new .md file but the work records, which are of their day
    and keep their links as written (their index, docs/history/README.md, is checked)."""
    history = HISTORY.parent.relative_to(ROOT).parts
    return [ROOT / f for f in git_files("*.md") if ROOT / f == HISTORY or Path(f).parts[:len(history)] != history]


def broken_links():
    bad = []
    for doc in living_docs():
        text = re.sub(r"```.*?```", "", read(doc), flags=re.S)
        text = re.sub(r"`[^`\n]*`", "", text)  # code spans: `[a](b)` written as an example is no link
        for target in re.findall(r"\]\(([^)\s]+)\)", text):
            if re.match(r"[a-z][a-z0-9+.-]*:", target):
                continue  # http:, https:, mailto:
            file, _, anchor = target.partition("#")
            path = (doc.parent / unquote(file)).resolve() if file else doc
            if not path.exists():
                bad.append(f"{doc.relative_to(ROOT)}: {target}")
            elif anchor and path.suffix == ".md" and unquote(anchor) not in anchors(path):
                bad.append(f"{doc.relative_to(ROOT)}: {target} (no such heading)")
    return bad


def missing_paths():
    """Source paths written in backticks in INDEX: from src/, from the repository root, or a file name in the project."""
    names = {Path(f).name for f in tracked()}
    bad = []
    for path in re.findall(r"`([\w/\-.\[\]]+\.(?:ts|tsx|py|sql|yml|sh|mjs))`", read(INDEX)):
        if not any((ROOT / r / path).exists() for r in ("src", ".")) and Path(path).name not in names:
            bad.append(f"INDEX.md: {path}")
    return bad


def unindexed_docs():
    """Documents under docs/ that neither INDEX.md nor the work record index links to: a document nobody can find from an
    index is lost. A work record counts only when the work record index lists it."""
    index, history = links(INDEX), links(HISTORY)
    bad = []
    for d in sorted((ROOT / "docs").rglob("*.md")):
        if d in (INDEX, CODEMAP):
            continue
        if HISTORY.parent in d.parents and d != HISTORY:
            if d.resolve() not in history:
                bad.append(f"not in docs/history/README.md: {d.relative_to(ROOT)}")
        elif d.resolve() not in index:
            bad.append(f"not in INDEX: {d.relative_to(ROOT)}")
    return bad


def stop_hook(problems):
    """As Claude Code's Stop hook (.claude/settings.json): a failing check sends the session back once to fix it, with the
    failing lines. Silent when the check passes, and the second time round (stop_hook_active), so that a failure the
    session cannot fix, such as another session's unfinished file in the same folder, never holds it for good."""
    try:
        again = json.load(sys.stdin).get("stop_hook_active")
    except ValueError:
        again = False
    if problems and not again:
        command = os.path.relpath(Path(__file__).resolve())
        command = command if not command.startswith("..") else str(Path(__file__).resolve())
        shown = problems[:25] + ([f"... and {len(problems) - 25} more"] if len(problems) > 25 else [])
        print(json.dumps({"decision": "block", "reason":
              f"python3 {command} fails. Fix these before you finish (a file table, a link, a symbol in a guide). "
              "If a line is about a file another session is still working on, leave it and say so in your report.\n"
              + "\n".join(shown)}, ensure_ascii=False))


def main():
    if not HISTORY.exists():
        sys.exit(f"missing: {HISTORY.relative_to(ROOT)} (the index of the work records)")
    files, want = tracked(), listed()
    problems = [f"missing: {p.relative_to(ROOT)}" for p in (CODEMAP, INDEX) if not p.exists()]
    problems += [f"no row in its folder's CLAUDE.md, FILES.md or CODEMAP: {f}" for f in sorted(files - want)]
    problems += unlisted_guides() + long_guides() + unindexed_docs()
    problems += [f"gone but listed: {f}" for f in sorted(want - files)]
    problems += broken_links() + missing_paths() + stale_symbols()
    if "--stop-hook" in sys.argv:
        return stop_hook(problems)
    print("\n".join(problems + notes()) if problems else "\n".join([f"PASS: {len(files)} files, links and paths alive"] + notes()))
    sys.exit(1 if problems else 0)


main()
