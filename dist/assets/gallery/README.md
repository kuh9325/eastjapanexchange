# 사진 애셋 넣는 법

방면과 활동 종류에 맞는 폴더에 이미지를 넣습니다.

```text
assets/gallery/{chungnam|chungbuk|daejeon}/{school|visit}/{권}/
```

| 폴더 | 화면 표시 |
| --- | --- |
| `school` | 창가청년스쿨 |
| `visit` | 일대일근행회 |

manifest 생성기는 JPG, JPEG, PNG, WebP, AVIF를 읽지만 프로덕션 사진은 `npm run assets:drive`로 모두 WebP 사본을 만듭니다. 권별 하위 폴더까지 재귀적으로 읽되 화면에서는 방면 단위로 합쳐 표시합니다.

파일명 앞의 `남)`, `(남)`, `남자부`, `여)`, `(여)`, `여자부`를 부서 메타데이터로 변환합니다. 썸네일과 확대 화면에는 파일명 대신 `권 | 부서 | 활동`이 표시되며 일본어 전환 시 권·부서·활동이 함께 번역됩니다. 부서 표식이 없는 파일은 `청년부`로 표시합니다.

사진 추가 후 다음 명령으로 `assets/gallery-manifest.json`을 갱신합니다.

```bash
npm run assets
```

`npm run dev`와 `npm run build`도 manifest 생성을 먼저 수행합니다.

## 캡션과 대체 텍스트

사진과 같은 폴더에 선택적으로 `captions.json`을 만듭니다.

```json
{
  "2026-07-19_대전권_창가청년스쿨.webp": {
    "caption": "대전권 창가청년스쿨",
    "alt": "무대 앞에서 함께 기념 촬영한 참가자들"
  }
}
```

`caption`은 카드와 확대 화면에 표시되고, `alt`는 사진 내용을 시각적으로 보지 못하는 관람자에게 전달합니다. `captions.json`이 없거나 항목이 없으면 파일명에서 날짜 접두사와 구분 문자를 정리해 둘 다 생성합니다. 잘못된 JSON은 경고 후 기본값으로 안전하게 대체됩니다.
