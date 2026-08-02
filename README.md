# 충남·충북·대전 청년 활동 지도 전시

일본 청년 교류 행사에서 충남·충북·대전방면의 좌담회, 창가청년스쿨, 청년미래총회, 평상시 활동 사진을 지도와 함께 보여주는 터치 친화형 정적 웹앱입니다. 사진이 한 장도 없어도 안내 콜라주가 완성된 화면을 구성하며, 사진 폴더를 채우면 빌드 단계에서 자동으로 갤러리에 반영됩니다.

## 방면 데이터와 지도

`data/regions.js`가 조직 방면, 포함 시·군, 색상, 설명, SVG 도형을 함께 보관하는 단일 진실 원천입니다.

- **대전방면:** 대전, 세종, 계룡, 금산, 옥천
- **충남방면:** 천안, 공주, 보령, 아산, 서산, 논산, 당진, 부여, 서천, 청양, 홍성, 예산, 태안
- **충북방면:** 청주, 충주, 제천, 보은, 영동, 증평, 진천, 괴산, 음성, 단양

세종은 행정적으로 충남이 아니지만 조직상 대전방면에 포함합니다. 충남방면에는 계룡·금산이, 충북방면에는 옥천이 중복되지 않습니다. 지도 DOM과 갤러리의 branch 필터가 모두 이 데이터의 key를 사용합니다.

> 지도는 공개 GIS 경계 파일을 전용하지 않고 이 전시를 위해 직접 그린 **시·군 수준의 단순화 다이어그램**입니다. 법적·측량·행정 경계 확인용이 아니며, 섬과 해안선, 시·군 경계 및 상대 크기가 실제와 다를 수 있습니다. 대한민국 실효 지배 구역의 전체 실루엣은 낮은 대비의 위치 맥락으로만 표현합니다.

실제 GIS 데이터로 교체할 때는 `data/regions.js`의 각 `municipalities[].path`, `label`, `outlinePaths`를 동일한 `viewBox` 좌표계의 단순화된 path로 바꾸면 됩니다. `id`, `name`, 방면 key는 유지해야 갤러리 분류가 보존됩니다. 외부 공개 데이터를 채택한다면 해당 데이터셋의 명칭, URL, 버전/기준일, 라이선스와 단순화 방법을 이 문서에 추가해야 합니다.

## 로컬 실행

Node.js 18 이상이 필요하며 런타임 의존성은 없습니다.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:4173`을 엽니다. 개발 서버는 실행 전 사진 manifest를 다시 만듭니다.

```bash
npm run assets   # assets/gallery-manifest.json만 갱신
npm run build    # manifest 생성 후 dist/ 구성
npm run preview  # dist/만 http://localhost:4173에서 제공
npm test         # 임시 사진 fixture, 방면 예외, 문법, 정적 빌드 검증
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
