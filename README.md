# 무엇이든 배우기 (Learn Anything)

개념부터 고급까지 직접 만져 보며 익히는 인터랙티브 HTML 교본 모음입니다.

## 책 목록

| # | 책 | 폴더 |
|---|----|------|
| 01 | 하네스 엔지니어링 교본 | [`harness-engineering/`](harness-engineering/) |
| 02 | C 개발자를 위한 Python 교본 | [`python-for-c-developers/`](python-for-c-developers/) |

GitHub Pages로 배포되며, 루트 `index.html`이 책장(목차) 페이지입니다.

## 새 책 추가하기

1. 영문 소문자와 하이픈으로 된 폴더를 만들고 책 파일을 `index.html`로 넣습니다. 예: `rust-for-c-developers/index.html`
2. 루트 `index.html`의 `<ul class="shelf">` 안에 `<li class="book">` 카드를 하나 복사해 링크, 번호, 제목, 통계를 바꿉니다.
3. 위 표에 한 줄 추가합니다.

각 책은 외부 의존성이 없는 단일 HTML 파일입니다(글꼴만 Google Fonts). 진도와 퀴즈 결과는 브라우저 localStorage에 책마다 따로 저장됩니다.
