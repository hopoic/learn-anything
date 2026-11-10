# RF·FPGA를 위한 신호처리 교본

Zynq FPGA + RF 트랜시버(기준 하드웨어: RK-ZYNQ7020-F + FMC-9361 AD9361 카드)로 무언가를 만들기 위한 신호처리 인터랙티브 교본입니다. 샘플링과 IQ에서 시작해 FFT, 필터, 데시메이션, DDC, 고정소수점, 변조와 동기화를 거쳐 미니 QPSK 수신기를 완성합니다.

배포되는 것은 외부 의존성 없는 단일 파일 `index.html`입니다(글꼴만 Google Fonts).

## 폴더 구조

```
signal-processing-for-rf/
├── index.html            # 빌드 결과물 (GitHub Pages가 서빙)
├── code/
│   └── mini_rx.py        # 12장 QPSK 송수신기 (numpy만 필요). 다른 예제들이 import
└── src/
    ├── shell.html        # 머리말, 목차, 표지
    ├── book.css          # 레이아웃·테마
    ├── book.js           # 목차, 진도, 하이라이트, 실습 벤치 9개, 퀴즈 데이터
    ├── ch01.html … ch12.html, zz_appendix.html
    ├── outputs.json      # Python 예제 실행 결과 캐시 (책에 "실행 결과"로 표시)
    └── build.py          # index.html 생성 + 예제 실행 검사
```

## 수정하는 법

장 본문은 `src/chNN.html`에서 고칩니다. 코드 블록은 HTML 이스케이프 없이 그대로 씁니다.

```html
<py file="alias.py" check>
...Python 코드 (check가 있으면 빌드 시 실행하고 출력을 책에 싣는다)...
</py>
<py file="mini_rx.py" src="../code/mini_rx.py" check></py>   <!-- 파일에서 읽기 -->
<c file="fir.c">...</c>   <cpp file="fir_hls.cpp">...</cpp>   <v file="nco.v">...</v>
```

그다음 빌드합니다. `--check`에는 numpy와 scipy가 필요합니다.

```sh
python3 src/build.py           # index.html 재생성 (캐시된 실행 결과 사용)
python3 src/build.py --check   # 모든 check 예제를 실행해 결과를 갱신한 뒤 빌드
```

빌드는 표지의 장·벤치·문제·예제 수를 자동으로 세고, 퀴즈 데이터 누락과 깨진 목차 링크, 중복 id를 검사합니다. 진도와 퀴즈 결과는 브라우저 localStorage에 `sp:` 접두사로 저장됩니다.
