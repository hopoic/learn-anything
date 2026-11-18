# 자료구조와 알고리즘 교본

빅오 표기에서 출발해 배열·해시 테이블·균형 트리·힙, 정렬·그래프·최단 경로·동적 계획법을 거쳐 A* 경로 계획기를 완성하는 인터랙티브 교본입니다. 메인 언어는 C++17이고, 장마다 같은 개념을 C11·Python 3·Rust로 비교합니다.

- 12장 (Part I 기초 · Part II 핵심 자료구조 · Part III 핵심 알고리즘 · Part IV 고급 + 실전) + 부록 2개
- 8개 실습 벤치, 24개 확인 문제, 완성 프로젝트 1개 (미니 경로 계획기)
- 49개 예제 코드: 모두 경고 없이 컴파일·실행되고 AddressSanitizer·UBSan 검사를 통과

배포되는 것은 외부 의존성 없는 단일 파일 `index.html`입니다(글꼴만 Google Fonts).

## 폴더 구조

```
data-structures-and-algorithms/
├── index.html            # 빌드 결과물 (GitHub Pages가 서빙)
├── code/
│   ├── ch1/ … ch12/      # 책에 실리는 예제 원본 (.cpp .c .py .rs)
│   └── test_code.sh      # 모든 예제 컴파일·실행 검사
└── src/
    ├── 00_head.html      # 스타일, 목차, 표지
    ├── 01_part1.html … 04_part4.html   # 장 본문과 부록
    ├── 05_script.js      # 목차, 진도, 하이라이트, 실습 벤치 8개, 퀴즈 데이터
    └── build.py          # index.html 생성 (예제 코드를 파일에서 읽어 삽입)
```

## 수정하는 법

장 본문은 `src/0N_partN.html`에서 고칩니다. 코드는 본문에 직접 쓰지 않고 `code/` 아래 파일을 매크로로 끌어옵니다. 그래서 책에 실린 코드가 곧 테스트된 코드입니다.

```html
@@CODE ch9/paths.cpp@@                           <!-- 코드 블록 하나 -->
@@TABS ch9/dsu.c ch9/dsu.py ch9/dsu.rs@@          <!-- 언어별 탭 (확장자로 라벨 결정) -->
```

그다음 검사하고 빌드합니다.

```sh
bash code/test_code.sh    # g++/gcc -Wall -Wextra -Werror + ASan/UBSan, rustc -D warnings, python3
python3 src/build.py      # index.html 재생성
```

검증 환경: g++ 13 (C++17), gcc 13 (C11), rustc 1.97 (edition 2021), Python 3.13.

## 로컬에서 미리 보기

```sh
python3 -m http.server 8000   # 저장소 루트에서, 그다음 http://localhost:8000/data-structures-and-algorithms/
```

진도와 퀴즈 결과는 브라우저 localStorage에 `dsa:` 접두사로 저장됩니다.
