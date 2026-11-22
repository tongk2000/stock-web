#!/bin/sh
# 작업 후 검사: 타입 검사, 린트(기준선), 단위 테스트, 수집 스크립트 문법, 색인 검사를 차례로 돌리고
# 하나라도 실패하면 거기서 멈춘다(exit 1). 인자 `build`를 주면 끝에 `npm run build`도 돈다.
# 사용법: sh tool/check.sh [build]   (어느 디렉터리에서 불러도 저장소 루트로 가서 돈다)
set -eu

# 어느 단계가 어떤 코드로 끝났든 실패는 exit 1로 알린다.
trap 'rc=$?; if [ "$rc" -ne 0 ]; then echo "FAIL" >&2; exit 1; fi' EXIT

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$root"

with_build=0
case "${1-}" in
  '') ;;
  build) with_build=1 ;;
  *) echo "사용법: sh tool/check.sh [build]" >&2; exit 1 ;;
esac

echo '== tsc =='
npx tsc --noEmit
echo '== lint =='
python3 tool/lint-check.py
echo '== test =='
npm test
echo '== py_compile =='
python3 -m py_compile stock-collector/*.py
echo '== check-index =='
python3 docs/check-index.py
if [ "$with_build" = 1 ]; then
  echo '== build =='
  npm run build
fi
echo PASS
