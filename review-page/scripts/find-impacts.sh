#!/usr/bin/env bash
# 바뀐 파일을 import하는 다른 파일을 찾는다 (plan.md 9.3)
# 사용법: find-impacts.sh <파일>... [--dir src]
# 설정 파일(review.config.ts) 폴더에서 실행한다. 출력 경로는 그 폴더 기준이라 케이스 impacts에 그대로 넣는다.
set -euo pipefail

dir=src
files=()
while [ $# -gt 0 ]; do
  case "$1" in
    --dir) dir="$2"; shift 2 ;;
    *) files+=("${1#./}"); shift ;;
  esac
done
[ ${#files[@]} -gt 0 ] || { echo "사용법: find-impacts.sh <파일>... [--dir src]" >&2; exit 1; }
command -v rg >/dev/null || { echo "rg(ripgrep)가 필요합니다" >&2; exit 1; }

for file in "${files[@]}"; do
  # 모듈 이름: 확장자를 뺀 파일 이름, index면 폴더 이름
  name=$(basename "$file")
  name=${name%.*}
  [ "$name" = index ] && name=$(basename "$(dirname "$file")")
  # 정규식 특수문자 이스케이프
  name=$(printf '%s' "$name" | sed 's/[][\.*^$+?(){}|]/\\&/g')
  rg -l --glob '*.{ts,tsx,js,jsx,mts,cts}' \
    "(from\s+|import\s*\(\s*|import\s+)['\"]([^'\"]*/)?${name}(/index)?(\.[cm]?[jt]sx?)?['\"]" "$dir" || true
done | sort -u | while read -r hit; do
  hit=${hit#./}
  skip=
  for file in "${files[@]}"; do [ "$hit" = "$file" ] && skip=1; done
  [ -z "$skip" ] && echo "$hit"
done
exit 0
