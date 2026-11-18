# Rust 교본 — 기초부터 고급 엔지니어까지

소유권과 빌림부터 트레잇, 라이프타임, 동시성, async 내부, unsafe·FFI, 타입 수준 설계까지 다루는 인터랙티브 Rust 교본입니다. 모든 실행 예제는 페이지 안에서 진짜 rustc로 컴파일·실행됩니다.

- 17장 (Part I 기초 · Part II 타입으로 설계하기 · Part III 고급 메커니즘 · Part IV 고급 엔지니어의 Rust) + 부록 3개
- 53개 실행 예제 (그중 7개는 일부러 컴파일 오류를 내는 예제, 2개는 Miri 버튼 포함)
- 13개 실습 벤치, 34개 확인 문제, 완성 프로젝트 1개 (미니 로봇 메시지 버스)

## 실행 엔진

| 엔진 | 위치 | 특징 |
|------|------|------|
| Rust Playground | play.rust-lang.org (`/execute`, 실패 시 `/evaluate.json`) | 기본값. 공식 서비스. Miri 실행도 여기서 함 |
| Compiler Explorer | godbolt.org API | 목록에서 실행 가능한 최신 안정판 rustc를 고름 |
| Wandbox | wandbox.org API | 목록에서 최신 Rust를 고름. 오래된 버전이면 edition 2021로 내려 컴파일 |

기본 설정 **자동**은 위 순서대로 시도합니다. 브라우저 안에서 도는 rustc는 없으므로 인터넷 연결이 필요합니다. 에디션(2024/2021)과 debug/release는 페이지 왼쪽 목차 아래에서 바꿉니다. `mode="release"`가 붙은 예제는 항상 release로 실행됩니다.

## 폴더 구조

```
rust-basics-to-advanced/
├── index.html            # 빌드 결과물 (GitHub Pages가 서빙)
├── assets/
│   ├── book.css          # 레이아웃·테마 (C++ 교본과 같은 Field Manual 디자인)
│   ├── book.js           # 목차, 진도, 하이라이트, 실행 블록 UI, 실습 벤치, 퀴즈 데이터
│   └── runner.js         # 엔진 선택과 Playground / Compiler Explorer / Wandbox 호출
└── src/
    ├── shell.html        # 머리말, 목차, 표지
    ├── ch01.html … ch17.html
    ├── zz_appendix.html  # 부록 A·B·C
    └── build.py          # index.html 생성 + 예제 컴파일 검사
```

## 수정하는 법

장 본문은 `src/chNN.html`에서 고칩니다. 코드 블록은 HTML 이스케이프 없이 그대로 씁니다.

```html
<run file="main.rs">fn main() { println!("hi"); }</run>          <!-- 실행 가능 -->
<run file="oops.rs" expect="error">...</run>   <!-- 일부러 컴파일 오류 -->
<run file="p.rs" expect="panic">...</run>      <!-- 일부러 panic (exit 101) -->
<run file="ub.rs" miri="1">...</run>           <!-- Miri 버튼 추가 -->
<run file="bench.rs" mode="release">...</run>  <!-- 항상 release -->
<rs file="lib.rs">...</rs>  <c>...</c>  <cpp>...</cpp>  <toml>...</toml>  <sh>...</sh>   <!-- 정적 블록 -->
```

그다음 빌드합니다.

```sh
python3 src/build.py           # index.html 재생성 + 퀴즈/앵커/id 검사
python3 src/build.py --check   # + 모든 <run> 예제를 rustc --edition 2024로 컴파일·실행해 expect와 대조
```

`--check`의 실행 결과는 `/tmp/rustbook_runs.json`에 저장됩니다. 표지의 장·예제·벤치·문제 수는 빌드 시 자동으로 채워집니다.

## 로컬에서 미리 보기

```sh
python3 -m http.server 8000   # 저장소 루트에서, 그다음 http://localhost:8000/rust-basics-to-advanced/
```

진도·퀴즈·놀이터 내용은 브라우저 localStorage에 `rsb:` 접두사로 저장됩니다.
