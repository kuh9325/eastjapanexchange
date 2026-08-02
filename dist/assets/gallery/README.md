# 사진 애셋 넣는 법

방면과 활동 종류에 맞는 폴더에 이미지를 넣습니다.

```text
assets/gallery/{chungnam|chungbuk|daejeon}/{discussion|school|future|daily}/
```

| 폴더 | 화면 표시 |
| --- | --- |
| `discussion` | 좌담회 |
| `school` | 창가청년스쿨 |
| `future` | 청년미래총회 |
| `daily` | 평상시 활동 |

지원 형식은 JPG, JPEG, PNG, WebP, AVIF이며 대소문자를 구분하지 않습니다. 하위 폴더는 재귀적으로 읽지 않습니다.

사진 추가 후 다음 명령으로 `assets/gallery-manifest.json`을 갱신합니다.

```bash
npm run assets
```

`npm run dev`와 `npm run build`도 manifest 생성을 먼저 수행합니다.

## 캡션과 대체 텍스트

사진과 같은 폴더에 선택적으로 `captions.json`을 만듭니다.

```json
{
  "2026-07-19_동대전_청년미래총회.jpg": {
    "caption": "동대전지역 청년미래총회",
    "alt": "무대 앞에서 함께 기념 촬영한 참가자들"
  }
}
```

`caption`은 카드와 확대 화면에 표시되고, `alt`는 사진 내용을 시각적으로 보지 못하는 관람자에게 전달합니다. `captions.json`이 없거나 항목이 없으면 파일명에서 날짜 접두사와 구분 문자를 정리해 둘 다 생성합니다. 잘못된 JSON은 경고 후 기본값으로 안전하게 대체됩니다.
