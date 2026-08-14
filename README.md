# 충남·충북·대전 청년 활동 지도 전시

홋카이도 방문단에게 충남·충북·대전방면의 사람과 활동을 소개하는 오프라인 우선 터치 전시 웹앱입니다. SMART TOUCH STS-75IR11(3840×2160, Android 11)의 Opera를 주 실행 환경으로 삼고, 구형 Android Chromium에서도 핵심 선택·필터·사진 확대가 유지되도록 점진적으로 향상합니다.

CDN, 외부 폰트, 온라인 지도 타일, 외부 API를 사용하지 않습니다. `dist/`는 인터넷이 없는 로컬 HTTP 서버에서 그대로 제공할 수 있는 순수 정적 결과물입니다.

## 화면 구조

가로 전시 화면은 브라우저 높이에 고정됩니다. 방면을 선택하면 왼쪽 지도와 오른쪽 콘텐츠가 3:7 비율로 배치되고 오른쪽 콘텐츠 패널만 세로로 스크롤됩니다. 지도, 방면 버튼, 범례는 계속 보입니다. 900px 이하 또는 세로 화면에서는 지도와 콘텐츠가 위아래로 전환됩니다.

- 실제 GIS 도형은 변형하지 않고, 각 시군 path 위에 52px(작은 대전방면 도형은 64px)의 투명 SVG hit-area를 둡니다.
- 방면은 지도와 상단 버튼 모두에서 클릭, 터치, Enter, Space로 선택합니다.
- 방면 선택 버튼은 지도 위쪽에 가로로 겹쳐 표시합니다.
- 선택된 방면만 3.5% 확대하고 굵은 outline·그림자를 적용합니다.
- 방면 선택 후에는 세 방면을 중심으로 지도 범위를 확대하고 나머지 지역을 흐리게 표시합니다.
- 시군명, 행정구역 목록, 시군 tooltip과 `city-label`은 일반 화면에 만들지 않습니다.
- `?debug=1`일 때만 내부 지도 분류를 진단 패널에서 확인할 수 있습니다.
- 오른쪽 콘텐츠는 방면명·소개·방면회관 전경 → 방면운영회의 → 탭 → 사진 순서이며, 데이터가 없는 섹션은 공간까지 숨깁니다.
- 방면 소개는 PC와 모바일에서 접고 펼칠 수 있으며, 접으면 방면명과 전체 지도 버튼만 남겨 사진 영역을 넓힙니다.

`100vh`를 기본으로 사용하고 지원 브라우저에서 `100dvh`를 추가합니다. 사진 확대는 Android의 native dialog·동적 viewport 구현 차이를 피하도록 화면 네 변에 고정된 ARIA dialog 오버레이를 사용합니다. `backdrop-filter`와 `inert`는 기능 감지와 불투명 배경·tabindex/ARIA 대체 동작을 함께 제공합니다.

## 방면 데이터와 GIS 지도

[`data/region-config.js`](data/region-config.js)가 `방면 → 권` 조직 구조와 지도 표시 범위의 단일 진실 원천입니다. [`data/regions.js`](data/regions.js)는 [`scripts/generate-map-data.mjs`](scripts/generate-map-data.mjs)가 생성하므로 직접 편집하지 않습니다. 행정구역은 방면 범위를 그리기 위한 내부 GIS 데이터이고 조직 하위 단위는 권입니다. 권별 지도는 만들지 않습니다.

- 충남방면: 백제권, 서해권, 천안권
- 충북방면: 동청주권, 서청주권, 제천권, 충주권
- 대전방면: 남대전권, 대전권, 서대전권, 세종권

지도 범위는 현재 확정 분류를 유지합니다.

- 대전방면: 대전·세종·계룡·금산·옥천
- 충남방면: 계룡·금산을 제외한 충남
- 충북방면: 옥천과 김천권 소속 영동을 제외한 충북 + 제천권 소속 강원 영월

방면 색면과 굵은 외곽선은 회색 전도와 동일한 전국 시·도 path에서 생성합니다. 계룡·금산·옥천·영동 예외만 시군구 도형으로 잘라내고 모든 결과를 원래 전국 경계 안으로 클리핑하므로, 서로 다른 SVG의 단순 bbox 정규화 오차가 외곽에 나타나지 않습니다. 시군 path는 색을 채우지 않고 매우 옅은 내부선으로만 그리며, 그 선 역시 방면 색면 안으로 클리핑합니다. `polygon-clipping` union으로 내부 중복선이 없는 방면별 `outlinePaths`를 생성하고 섬과 다중 폴리곤을 유지합니다.

대한민국 지도는 [statgarten/maps](https://github.com/statgarten/maps)의 통계청 SGIS 2020 경계 기반 단순화 SVG(MIT)를 사용합니다. vendored 원본, upstream commit, 라이선스는 [`data/vendor/statgarten-maps`](data/vendor/statgarten-maps)에 있습니다. 화면에는 `통계청 SGIS 2020 행정구역 경계 기반, 전시용 단순화`라고 표시합니다. 법적·측량·행정 경계 확인용 지도가 아닙니다.

전국 단순화 원본에는 울릉도 도형은 있지만 독도 도형은 포함되지 않아, 독도는 본 화면과 인트로 대한민국 지도 모두에서 실제 상대 위치에 작은 점으로만 표시합니다.

인트로 일본 지도는 [Natural Earth Vector](https://github.com/nvkelso/natural-earth-vector)의 공개 도메인 데이터를 단순화해 저장소에 포함했습니다. 정확한 commit과 설명은 [`assets/intro/SOURCE.md`](assets/intro/SOURCE.md)에 있습니다. 실행 중 어느 지도 서버에도 요청하지 않습니다.

## 전시 문구와 회관 사진

확정 문구와 사진 설정은 [`data/exhibition-content.js`](data/exhibition-content.js)에서 수정합니다. 소개문과 슬로건은 `introduction`/`introductionJa`, `slogan`/`sloganJa` 쌍으로 관리하며, 메인 화면의 `한국어`·`日本語` 탭으로 전환합니다. 공통 UI 번역은 [`data/ui-copy.js`](data/ui-copy.js)에 있습니다. `futureMedia`는 추후 영상 확장용 데이터 자리만 있고 이번 버전에는 `video`, 자동 재생, 업로드 기능이 없습니다.

방면 소개 옆 회관 전경 사진은 아래 경로가 기본 설정되어 있습니다.

```text
assets/halls/chungnam/exterior.webp
assets/halls/chungbuk/exterior.webp
assets/halls/daejeon/exterior.webp
```

사진은 16:9 비율로 표시됩니다. 초점 위치 조정은 각 `hallPhoto`의 `objectPosition` 값을 `"50% 42%"`처럼 바꿉니다. 파일이 없으면 깨진 아이콘 대신 자리표시자를 표시합니다.

방면운영회의 사진을 표시하려면 같은 파일에서 `meetingPhoto`를 설정하고 파일을 다음 위치에 둡니다.

```text
assets/meeting/chungnam/group.jpg
assets/meeting/chungbuk/group.jpg
assets/meeting/daejeon/group.jpg
```

예시는 다음과 같습니다.

```js
meetingPhoto: {
  photo: "./assets/meeting/chungnam/group.jpg",
  caption: "",
  alt: ""
}
```

`meetingPhoto: null`이거나 이미지 로딩이 실패하면 섹션 전체를 숨깁니다.

## 활동 사진과 manifest

브라우저가 디렉터리를 스캔하지 않습니다. [`scripts/generate-gallery-manifest.mjs`](scripts/generate-gallery-manifest.mjs)가 빌드 전에 폴더를 읽어 `assets/gallery-manifest.json`을 만듭니다.

```text
assets/gallery/
├─ chungnam/
│  ├─ school/  # 창가청년스쿨
│  │  ├─ baekje/
│  │  ├─ seohae/
│  │  └─ cheonan/
│  └─ visit/   # 일대일근행회, 권별 하위 폴더 허용
├─ chungbuk/   # 같은 분류와 권별 하위 폴더
└─ daejeon/    # 같은 분류와 권별 하위 폴더
```

권별 하위 폴더까지 재귀적으로 읽지만 전시 화면의 선택 단위는 방면과 활동 카테고리로 유지합니다. 원본 JPG, JPEG, PNG, HEIF/HEIC를 가져올 수 있으며 프로덕션 전시 사본은 모두 WebP로 정규화합니다. 파일명은 화면에 직접 표시하지 않고 권 폴더, 파일명의 `남/여` 표식, 활동 폴더를 해석해 `권 | 부서 | 활동` 메타데이터로 표시합니다. 부서 표식이 없는 파일은 임의 추정하지 않고 `청년부`로 표시합니다.

한국어·일본어 메타데이터 표기는 [`data/gallery-metadata.js`](data/gallery-metadata.js)에서 한 번에 관리합니다. 예를 들어 `충주권 | 남자부 | 창가청년스쿨`은 일본어 전환 시 `忠州圏 | 男子部 | 創価青年スクール`로 함께 바뀝니다.

Google Drive에서 받은 원본은 프로젝트 밖 임시 폴더에 보관하고, 다음 명령으로 최대 변 2000px·품질 82의 WebP 확대용 사본과 최대 변 720px·품질 72의 WebP 썸네일을 함께 만듭니다. `--inventory`는 Drive 커넥터로 만든 파일 ID·제목·방면·권·카테고리 목록입니다. 사진에서는 PNG보다 WebP가 훨씬 작으며, 필요할 때만 `--format jpeg`로 확대용 JPEG 출력을 선택합니다.

```text
npm run assets:drive -- --source <원본 폴더> --inventory <인벤토리 JSON>
```

전시 카테고리는 Drive 구조와 동일하게 `창가청년스쿨(school)`과 `일대일근행회(visit)` 두 개를 사용합니다. 권별 폴더는 애셋 트리와 manifest의 `zone` 정보로 보존하지만 화면에서는 방면 단위로 합쳐 표시합니다.

```json
{
  "2026-07-19_창가청년스쿨.webp": {
    "caption": "창가청년스쿨",
    "alt": "무대 앞에서 기념 촬영한 참가자들"
  }
}
```

manifest의 `src`는 확대용 사진, `thumbnail`은 목록용 사진을 가리킵니다. 기존 사진에 썸네일이 없으면 `npm run thumbnails` 또는 build 과정에서 자동 생성하고, 화면 밖 이미지는 lazy loading과 `content-visibility`로 렌더링 부담을 줄입니다.

## 인트로 여정

첫 화면과 진행 단계 문구는 모두 일본어로 표시합니다. `韓国へようこそ`와 `出発`에서 시작해 약 15초 동안 신치토세공항 → 인천국제공항 → 한국SGI 진천연수원(진천군 초평면 초평로 1048-6) → 한국SGI 대전문화회관(대덕구 비래동로40번길 46) 순으로 이동합니다. CTS(42.7752, 141.6923)와 ICN(37.4602, 126.4407)의 Haversine 거리를 10km 단위로 반올림해 `約 1,420 km`로 표시합니다.

인트로 지점은 화면 크기에 따른 픽셀 위치가 아니라 [`data/intro-route.js`](data/intro-route.js)의 로컬 지도 좌표로 관리합니다. 대한민국 지점은 `regions.js`와 같은 780×760 좌표계에 둔 뒤 인트로 장면으로 변환하므로 모바일에서도 전도와 동쪽으로 어긋나지 않습니다. 시설 주소나 지도 애셋을 바꿀 때는 이 파일의 `mapPoint`만 갱신합니다.

비행기와 이동 점은 CSS motion path 대신 SVG `getTotalLength()`, `getPointAtLength()`, `requestAnimationFrame()`으로 이동합니다. 경로 길이는 시작할 때 한 번만 계산하고 이동선은 `stroke-dashoffset`으로 표시합니다. 대한민국 지도는 외부 SVG 이미지로 한 번 래스터화할 수 있게 분리하며 Android·4K 화면에서는 30fps로 제한합니다. 건너뛰기·페이지 이탈·완료 때 frame과 timer를 정리합니다. `prefers-reduced-motion`에서는 지점 이름만 짧게 순차 표시합니다. 자세한 15초 구성은 [`docs/intro-motion-spec.md`](docs/intro-motion-spec.md)에 있습니다.

개발 검토용 인트로 반복 모드:

```text
http://localhost:4180/?intro=preview
```

재생/일시정지, 처음부터, 0.5×·1×·2×를 제공합니다. 저작권 있는 참고 영상은 포함하지 않았고 녹화 파일 대신 재현 가능한 preview URL과 motion spec을 제공합니다.

## fixture와 디버그 URL

fixture는 프로덕션 manifest와 완전히 분리되며 기본 화면에는 나타나지 않습니다.

```text
http://localhost:4180/?fixture=empty
http://localhost:4180/?fixture=full
http://localhost:4180/?fixture=full&debug=1
http://localhost:4180/?intro=preview&debug=1
```

- `fixture=empty`: 활동 0장, 회관·단체사진 없음. 안내 카드만 표시하고 빈 섹션을 숨깁니다.
- `fixture=full`: 방면별 활동 SVG 6장, 회관 전경용 그래픽 1장, 단체 그래픽 1장을 표시합니다.
- `debug=1`: userAgent, viewport, devicePixelRatio, dialog/inert/backdrop-filter/rAF 지원, manifest, 인트로 상태, 내부 GIS 분류, 마지막 JS 오류를 표시합니다.

## 실행과 전시 배포

Node.js 18 이상이 필요합니다.

```bash
npm install
npm run dev      # 지도 + manifest 생성 후 http://localhost:4180
npm run assets   # gallery-manifest.json 생성
npm run thumbnails # 목록용 720px WebP 썸네일 생성
npm run build    # 지도 + manifest + 호환 번들 + service worker + dist 생성
npm run preview  # dist를 http://localhost:4180에서 확인
npm run kiosk    # dist를 http://localhost:8081에서 제공
npm test         # 데이터·레이아웃 계약·fixture·인트로·kiosk·dist 검증
```

Cloudflare Workers Builds에서 정적 사이트로 배포할 때는 다음 값을 사용합니다.

```text
Build command: npm run build
Deploy command: npx wrangler deploy
```

[`wrangler.jsonc`](wrangler.jsonc)가 빌드 결과물인 `dist/`를 정적 애셋으로
배포하도록 지정합니다. 실제 Cloudflare Pages의 Git 연동을 선택한 경우에는
빌드 명령을 `npm run build`, 출력 디렉터리를 `dist`로 설정하며 별도의 배포
명령은 입력하지 않습니다.

키오스크 서버 옵션:

```bash
npm run kiosk -- --port 9090
npm run kiosk -- --host 0.0.0.0 --port 8081
```

개발·미리보기 기본 port는 `4180`, 전시 kiosk 기본 port는 `8081`입니다. 영상 기획 웹앱과 포트가 겹치지 않도록 분리했습니다. kiosk 기본 host는 `localhost`이며, 같은 LAN의 전자칠판이 개발 PC에 접속할 때만 `--host 0.0.0.0`을 사용합니다. 적절한 MIME type으로 정적 파일만 제공하고 path traversal을 차단합니다. 종료는 서버를 실행한 터미널에서 `Ctrl+C`입니다.

`file://` 직접 열기는 ES module과 `fetch` 보안 정책 때문에 기본 지원하지 않습니다. 전자칠판에서는 일반 Android 로컬 HTTP 서버 앱의 document root로 `dist/` 전체를 지정할 수 있습니다.

실제 전시 준비 순서는 다음과 같습니다.

1. 활동·회관 전경·단체사진을 위 경로에 복사합니다.
2. 개발 PC/Mac에서 `npm run assets`를 실행합니다.
3. `npm run build`를 실행합니다.
4. 생성된 `dist/` 전체를 전자칠판으로 복사합니다.
5. 전자칠판의 로컬 HTTP 서버로 `dist/`를 제공합니다.
6. Opera에서 서버 주소를 열고 `?fixture=full` 같은 테스트 query가 없는지 확인합니다.

서비스 워커는 production build이며 localhost 또는 HTTPS일 때만 등록됩니다. 핵심 HTML/JS/CSS, 지도, manifest, 인트로와 fixture 애셋만 사전 캐시하고 외부 URL은 캐시하지 않습니다. 빌드 hash가 바뀌면 이전 캐시를 삭제합니다. 등록 실패해도 앱은 정적 서버에서 계속 동작합니다. 개발 소스(`npm run dev`)는 `data-build="development"`이므로 서비스 워커를 등록하지 않습니다.

## 구형 Android 대응

- esbuild가 브라우저 코드를 Chrome 69, Safari 12, Edge 79 수준의 단일 ES module로 번들합니다.
- `color-mix()`와 CSS motion path를 사용하지 않습니다.
- `100vh` 뒤에 기능 감지된 `100dvh`를 둡니다.
- 사진 확대는 native `dialog.showModal()`을 사용하지 않고 fixed ARIA dialog로 일관되게 표시합니다.
- `backdrop-filter` 미지원 환경은 먼저 선언한 불투명 패널을 사용합니다.
- 인트로 이동 API나 rAF가 없으면 정적 축소 여정으로 자동 전환합니다.
- 한 이미지나 manifest 로딩 실패는 전체 앱을 중단시키지 않습니다.

Android 11 Opera에서 터치, 내부 패널 관성 스크롤, 사진 확대 오버레이, 재생 완료 후 frame 정리를 최종 현장 점검해야 합니다. 구형 Chrome에서는 ES module 자체 지원 여부, SVG path 길이 API, fixed/overflow 조합을 `?debug=1`로 확인합니다. Chrome이 ES module을 지원하지 않을 정도로 오래된 경우 Opera를 사용합니다.

## GitHub Pages

`.github/workflows/pages.yml`은 `main` push와 수동 실행에서 Node.js로 설치·테스트·빌드 후 `dist/`만 Pages artifact로 배포합니다. 모든 런타임 경로는 상대 경로이므로 `https://사용자.github.io/eastjapanexchange/` 같은 프로젝트 하위 경로에서 동작합니다.
