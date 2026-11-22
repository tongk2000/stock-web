#!/usr/bin/env python3
"""eslint 오류를 기준선(tool/lint-baseline.json)과 비교한다. 기준선보다 늘어난 오류만 실패로 본다.

사용법:
  python3 tool/lint-check.py            기준선과 비교. 늘어난 (파일, 규칙) 쌍이 있으면 그 오류를 찍고 exit 1.
  python3 tool/lint-check.py --update   지금 상태를 기준선으로 적는다. 기존 오류를 고쳐 줄었을 때만 쓴다.

기준선은 (저장소 기준 상대 경로, ruleId)별 오류 개수다. 줄 번호는 넣지 않아 줄이 밀려도 깨지지 않는다.
경고는 개수만 알리고 기준선에 넣지 않는다. 표준 라이브러리만 쓴다.
"""
import json
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASELINE = ROOT / "tool" / "lint-baseline.json"
NO_RULE = "(규칙 없음)"  # ruleId가 null인 것(구문 오류 등)


def run_eslint():
    """eslint를 돌려 파일별 결과 목록을 돌려준다. 오류가 있으면 eslint는 exit 1이므로 종료 코드는 보지 않는다."""
    try:
        proc = subprocess.run(
            ["npx", "eslint", "-f", "json"],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        sys.exit("lint: npx를 찾을 수 없다. Node.js를 설치한다.")
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError:
        sys.stderr.write(proc.stderr or proc.stdout)
        sys.exit("lint: eslint 출력이 JSON이 아니다(eslint 실행 실패). 위 출력을 본다.")


def collect(results):
    """(counts, errors, warning_count)를 돌려준다.

    counts: {상대경로: {규칙: 개수}}  errors: {(상대경로, 규칙): [(줄, 메시지 첫 줄)]}
    """
    counts = defaultdict(lambda: defaultdict(int))
    errors = defaultdict(list)
    warnings = 0
    for res in results:
        try:
            rel = Path(res["filePath"]).resolve().relative_to(ROOT).as_posix()
        except ValueError:
            rel = res["filePath"]
        for msg in res.get("messages", []):
            if msg.get("severity") == 2 or msg.get("fatal"):
                rule = msg.get("ruleId") or NO_RULE
                counts[rel][rule] += 1
                first = (msg.get("message") or "").splitlines()
                errors[(rel, rule)].append((msg.get("line", 0), first[0] if first else ""))
            else:
                warnings += 1
    return counts, errors, warnings


def to_plain(counts):
    return {f: dict(sorted(r.items())) for f, r in sorted(counts.items())}


def total(counts):
    return sum(n for rules in counts.values() for n in rules.values())


def main():
    args = sys.argv[1:]
    if args not in ([], ["--update"]):
        sys.exit("사용법: python3 tool/lint-check.py [--update]")

    counts, errors, warnings = collect(run_eslint())

    if args == ["--update"]:
        BASELINE.write_text(
            json.dumps({"errors": to_plain(counts)}, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        print(f"lint: 기준선을 적었다. 오류 {total(counts)}개, 경고 {warnings}개(경고는 기준선에 넣지 않는다)")
        return 0

    if not BASELINE.exists():
        sys.exit("lint: tool/lint-baseline.json이 없다. python3 tool/lint-check.py --update 로 만든다.")
    baseline = json.loads(BASELINE.read_text(encoding="utf-8")).get("errors", {})

    new = []  # (파일, 규칙, 현재 개수, 기준선 개수)
    reduced = False
    for rel, rules in counts.items():
        for rule, n in rules.items():
            base = baseline.get(rel, {}).get(rule, 0)
            if n > base:
                new.append((rel, rule, n, base))
    for rel, rules in baseline.items():
        for rule, base in rules.items():
            if counts.get(rel, {}).get(rule, 0) < base:
                reduced = True

    if new:
        print("lint: 기준선보다 늘어난 오류가 있다.")
        for rel, rule, n, base in sorted(new):
            print(f"  {rel} {rule}: {base}개 -> {n}개")
            # 줄 번호 없이 개수만 비교하므로 어느 것이 새것인지는 알 수 없다. 이 쌍의 오류를 모두 보인다.
            for line, text in sorted(errors[(rel, rule)]):
                print(f"    {rel}:{line} {rule} {text}")
        if warnings:
            print(f"lint: 경고 {warnings}개(개수만 알림)")
        return 1

    print(f"lint: 기존 오류 {total(baseline)}개(기준선), 새 오류 없음")
    if reduced:
        print("lint: 기준선보다 오류가 줄었다. python3 tool/lint-check.py --update 로 기준선을 다시 적는다.")
    if warnings:
        print(f"lint: 경고 {warnings}개(개수만 알림)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
