# 사진 애셋 넣는 법

방면과 활동 종류에 맞는 폴더에 이미지 파일을 넣습니다.

```text
assets/gallery/
├─ chungnam/
│  ├─ discussion/  # 좌담회
│  ├─ school/      # 창가청년스쿨
│  ├─ future/      # 청년미래총회
│  └─ daily/       # 평상시 활동
├─ chungbuk/
└─ daejeon/
```

지원 형식: JPG, JPEG, PNG, WebP, GIF, AVIF

사진 추가 후 아래 명령을 실행합니다.

```bash
npm run assets
```

`npm run dev`와 `npm run build`는 매번 manifest를 자동으로 다시 만듭니다.

## 사진 설명을 직접 지정하는 법

사진과 같은 폴더에 `captions.json`을 만듭니다.

```json
{
  "2026-07-19_동대전_청년미래총회.jpg": {
    "caption": "동대전지역 청년미래총회",
    "alt": "무대 앞에서 함께 기념 촬영한 청년부와 미래부"
  }
}
```

`captions.json`이 없으면 파일명에서 날짜와 밑줄을 정리해 기본 설명으로 사용합니다.
