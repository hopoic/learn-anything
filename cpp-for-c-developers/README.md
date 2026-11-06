# C 개발자를 위한 C++ 교본

C를 아는 개발자를 위한 인터랙티브 C++ 교본입니다. 모든 예제는 페이지 안에서 진짜 컴파일러로 컴파일·실행됩니다.

## 실행 엔진

| 엔진 | 위치 | 특징 |
|------|------|------|
| Wandbox · GCC | 온라인 (wandbox.org API) | 기본값. C++23, 예외, 스레드 모두 지원 |
| Compiler Explorer · GCC | 온라인 (godbolt.org API) | Wandbox 실패 시 자동 전환 |
| 브라우저 내장 Clang | 이 브라우저 (WebAssembly) | 첫 사용 시 약 23MB 다운로드 후 캐시. 코드가 외부로 나가지 않음. 예외·스레드 미지원 |

기본 설정 **자동**은 위 순서대로 시도합니다. 엔진은 페이지 왼쪽 목차 아래에서 바꿀 수 있습니다.

## 폴더 구조

```
cpp-for-c-developers/
├── index.html                 # 빌드 결과물 (GitHub Pages가 서빙)
├── assets/
│   ├── book.css               # 레이아웃·테마
│   ├── book.js                # 목차, 진도, 하이라이트, 실행 블록 UI, 실습 벤치, 퀴즈
│   ├── runner.js              # 엔진 선택과 Wandbox / Compiler Explorer / WASM 호출
│   ├── compiler-worker.js     # 모듈 워커: YoWASP Clang(WASM)으로 컴파일
│   ├── program-worker.js      # 모듈 워커: 컴파일된 WASI 프로그램 실행
│   └── vendor/browser_wasi_shim.js
└── src/
    ├── shell.html             # 머리말, 목차, 표지
    ├── ch01.html … ch12.html  # 장 본문
    ├── zz_appendix.html       # 부록
    └── build.py               # index.html 생성 + 예제 컴파일 검사
```

## 수정하는 법

장 본문은 `src/chNN.html`에서 고칩니다. 코드 블록은 HTML 이스케이프 없이 그대로 씁니다.

```html
<run file="hello.cpp" std="c++23" stdin="1 2\n3">
#include <iostream>
int main() { std::cout << "hi\n"; }
</run>
<cpp file="snippet.cpp">...실행 버튼 없는 C++ 코드...</cpp>
<c file="legacy.c">...C 코드...</c>
```

그다음 빌드합니다.

```sh
python3 src/build.py           # index.html 재생성
python3 src/build.py --check   # + 모든 <run> 예제를 g++(13 이상)로 컴파일·실행해 검사
```

`expect="error"`를 붙인 예제는 일부러 컴파일 오류를 내는 예제이며, `--check`는 이 예제가 실제로 실패하는지도 확인합니다.

## 로컬에서 미리 보기

워커는 `file://`에서 동작하지 않으므로 간단한 서버로 엽니다.

```sh
python3 -m http.server 8000   # 그다음 http://localhost:8000/cpp-for-c-developers/
```

## 오프라인(자체 호스팅) 내장 컴파일러

기본으로 jsDelivr → unpkg CDN에서 `@yowasp/clang`을 받습니다. CDN 없이 쓰려면 패키지를 `assets/vendor/yowasp-clang/`에 풀어 두면 마지막 후보로 사용됩니다(약 105MB, 저장소에는 넣지 않는 것을 권장).

```sh
npm pack @yowasp/clang@22.0.0-git20542-10 && tar xzf yowasp-clang-*.tgz
mkdir -p assets/vendor/yowasp-clang && cp package/gen/* assets/vendor/yowasp-clang/
```

## 서드파티

- [browser_wasi_shim](https://github.com/bjorn3/browser_wasi_shim) 0.4.2 — MIT OR Apache-2.0, `assets/vendor/`에 번들
- [YoWASP Clang](https://yowasp.org) — LLVM(Apache-2.0 WITH LLVM-exception), 실행 시 CDN에서 로드
- Wandbox, Compiler Explorer — 공개 API 사용
