#!/usr/bin/env bash
# Compile and run every code sample in the book. Fails loudly on any warning or error.
set -u
cd "$(dirname "$0")"
OUT=/tmp/dsa_bin
mkdir -p "$OUT"
fail=0
for f in $(find . -type f -name "*.*" ! -name "*.sh" | sort); do
  name=$(echo "$f" | sed 's|^\./||; s|/|_|g')
  case "$f" in
    *.cpp) cmd="g++ -std=c++17 -O2 -Wall -Wextra -Werror -fsanitize=address,undefined -o $OUT/$name $f" ;;
    *.c)   cmd="gcc -std=c11 -O2 -Wall -Wextra -Werror -fsanitize=address,undefined -o $OUT/$name $f" ;;
    *.rs)  cmd="rustc -D warnings -O --edition 2021 -o $OUT/$name $f" ;;
    *.py)  cmd="python3 -W error -c 'import ast,sys; ast.parse(open(\"$f\").read())'" ;;
    *) continue ;;
  esac
  if ! eval "$cmd" >/tmp/dsa_build.log 2>&1; then
    echo "BUILD FAIL: $f"; cat /tmp/dsa_build.log; fail=1; continue
  fi
  echo "=== $f"
  if [[ "$f" == *.py ]]; then timeout 60 python3 "$f" || { echo "RUN FAIL: $f"; fail=1; }
  else timeout 60 "$OUT/$name" || { echo "RUN FAIL: $f"; fail=1; }
  fi
done
exit $fail
