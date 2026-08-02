# 충남·충북·대전 청년 활동 지도 전시

일본 청년 교류 행사에서 충남·충북·대전방면의 좌담회, 창가청년스쿨, 청년미래총회, 평상시 활동 사진을 지도와 함께 보여주는 터치 친화형 정적 웹앱입니다. 사진이 한 장도 없어도 안내 콜라주가 완성된 화면을 구성하며, 사진 폴더를 채우면 빌드 단계에서 자동으로 갤러리에 반영됩니다.

## 방면 데이터와 지도

`data/region-config.js`가 `방면 → 권` 조직 구조와 지도 표시 범위의 단일 진실 원천이며, `data/regions.js`는 SGIS 기반 SVG에서 자동 생성되는 지도 데이터입니다. 생성 파일은 직접 편집하지 않습니다. **행정구역은 방면의 지도 범위를 표현하기 위한 자료이며 조직의 하위 단위가 아닙니다.** 권별 경계는 지도에 표시하지 않습니다.

- **충남방면:** 백제권, 서해권, 천안권
- **충북방면:** 동청주권, 서청주권, 제천권, 충주권
- **대전방면:** 남대전권, 대전권, 서대전권, 세종권

지도 범위에서 대전방면은 대전·세종·계룡·금산·옥천을, 충남방면은 계룡·금산을 제외한 충남 지역을 표시합니다. 충북방면은 옥천과 김천권 소속 영동군을 제외한 충북 지역에 **제천권 소속 강원도 영월군**을 더해 표시합니다. 영동군은 이 전시의 세 방면 어디에도 표시하지 않습니다. 지도 DOM과 갤러리 필터는 동일한 방면 key를 사용합니다. 원본에서 천안·청주는 구 단위로 나뉘며, 대전광역시는 5개 구의 내부 경계를 그대로 표시합니다.

지도는 [statgarten/maps](https://github.com/statgarten/maps)의 `svg/simple` 자료를 사용합니다. 이 저장소는 통계청 SGIS 오픈 API에서 수집한 2020 행정구역 경계를 SVG로 제공하며 MIT 라이선스를 적용합니다. 사용한 원본 5개 SVG, upstream commit, 라이선스는 `data/vendor/statgarten-maps/`에 보관합니다.

`scripts/generate-map-data.mjs`는 다음을 자동 수행합니다.

1. 전국 시·도 SVG와 충남·충북·대전·세종·강원 시군구 SVG의 이름과 path를 추출합니다. 강원 SVG에서는 영월군만 선택합니다.
2. 지역별 확대 SVG의 실제 bounds를 전국 SVG에서 같은 시·도가 차지하는 bounds로 다시 투영합니다.
3. 전국과 시군구 좌표를 공통 `0 0 780 760` viewBox로 정규화합니다.
4. `polygon-clipping`의 union으로 같은 조직 방면을 dissolve하여 내부 중복선이 없는 `outlinePaths`를 만듭니다.
5. 면적 중심과 내부점 탐색으로 각 행정구역과 방면의 label 좌표를 생성합니다.

섬과 다중 폴리곤 subpath는 유지하며, 시군구 path는 얇은 내부 경계로, dissolve 결과는 굵은 방면 외곽선으로 렌더링합니다. 화면 하단에는 `통계청 SGIS 2020 행정구역 경계 기반, 전시용 단순화`를 표시합니다. 법적·측량·행정 경계 확인용으로 사용하면 안 됩니다.

## 로컬 실행

Node.js 18 이상이 필요합니다. 브라우저 런타임 의존성은 없으며, 지도 build 단계에서만 polygon union 패키지를 사용합니다.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:4173`을 엽니다. 개발 서버는 실행 전 지도 데이터와 사진 manifest를 다시 만듭니다.

```bash
npm run assets   # assets/gallery-manifest.json만 갱신
npm run map      # SGIS SVG에서 data/regions.js 재생성
npm run build    # 지도와 manifest 생성 후 dist/ 구성
npm run preview  # dist/만 http://localhost:4173에서 제공
npm test         # 지도·dissolve·사진 fixture·방면 예외·정적 빌드 검증
```

모든 HTML, CSS, JS, manifest 경로는 상대 경로이므로 `https://사용자.github.io/eastjapanexchange/` 같은 프로젝트 하위 경로에서 동작합니다.

## 사진 추가

사진을 아래 폴더 중 하나에 넣습니다. 빈 폴더는 `.gitkeep`으로 저장소에 유지됩니다.

```text
assets/gallery/
├─ chungnam/
│  ├─ discussion/  # 좌담회
│  ├─ school/      # 창가청년스쿨
│  ├─ future/      # 청년미래총회
│  └─ daily/       # 평상시 활동
├─ chungbuk/
│  └─ (같은 네 폴더)
└─ daejeon/
   └─ (같은 네 폴더)
```

지원 형식은 JPG, JPEG, PNG, WebP, AVIF입니다. 파일명에서 날짜 접두사, `_`, `-`를 정리한 값이 기본 캡션과 alt가 됩니다. 같은 폴더의 선택적 `captions.json`으로 덮어쓸 수 있습니다.

```json
{
  "2026-07-19_동대전_청년미래총회.jpg": {
    "caption": "동대전지역 청년미래총회",
    "alt": "무대 앞에서 함께 기념 촬영한 참가자들"
  }
}
```

사진 추가 후 `npm run assets` 또는 `npm run build`를 실행하고 생성된 `assets/gallery-manifest.json`도 함께 커밋합니다. 더 자세한 안내는 [`assets/gallery/README.md`](assets/gallery/README.md)에 있습니다.

## 배포

`.github/workflows/pages.yml`은 `main` push와 수동 실행을 지원합니다. Actions에서 Node.js 20으로 `npm ci`, `npm test`를 실행한 뒤 생성된 `dist/`만 GitHub Pages artifact로 배포합니다. 저장소 **Settings → Pages → Source**는 **GitHub Actions**로 설정합니다.

## 전시 및 접근성

- 1440×900에서는 중앙 지도에서 선택 후 좌측 지도/우측 콜라주로 전환합니다.
- 1080px 이하에서는 지도 위/사진 아래의 세로 흐름으로 전환합니다.
- SVG 방면은 클릭, 터치, Enter, Space로 선택할 수 있습니다.
- 활동 탭은 클릭과 터치 외에 방향키, Home, End를 지원합니다.
- 사진 dialog는 이전/다음 버튼, 좌우 방향키, Escape 닫기를 지원합니다.
- 터치 조작 요소는 최소 44px이며, 포커스 표시와 `prefers-reduced-motion`을 제공합니다.
- manifest나 이미지 파일이 누락되어도 깨진 이미지 대신 안내/실패 카드를 표시합니다.

권장 사진 크기는 긴 변 약 2000px, WebP 또는 품질 80–88의 JPEG입니다. 관람자가 직접 선택하도록 자동 슬라이드와 자동 페이지 이동은 사용하지 않습니다.
