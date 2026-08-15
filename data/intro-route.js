const KOREA_SCENE = Object.freeze({ x: 100, y: 185, scale: 0.52 });
const JAPAN_SCENE = Object.freeze({ x: 470, y: 30, width: 690, height: 414, viewBoxWidth: 900, viewBoxHeight: 540 });

const koreaToScene = ([x, y]) => Object.freeze([
  Number((KOREA_SCENE.x + x * KOREA_SCENE.scale).toFixed(2)),
  Number((KOREA_SCENE.y + y * KOREA_SCENE.scale).toFixed(2))
]);

const japanToScene = ([x, y]) => Object.freeze([
  Number((JAPAN_SCENE.x + x * JAPAN_SCENE.width / JAPAN_SCENE.viewBoxWidth).toFixed(2)),
  Number((JAPAN_SCENE.y + y * JAPAN_SCENE.height / JAPAN_SCENE.viewBoxHeight).toFixed(2))
]);

/*
 * 화면 픽셀을 직접 찍지 않고, 각 로컬 SVG의 고유 좌표계에 지점을 보관한다.
 * 대한민국 지점은 regions.js와 같은 780×760 좌표계이며, ICN은 영종도 공항,
 * 진천과 대전은 실제 시설 주소가 속한 도형 안의 위치를 기준으로 잡았다.
 */
export const INTRO_ROUTE = Object.freeze({
  cts: Object.freeze({
    label: "新千歳空港 · CTS",
    latitude: 42.7752,
    longitude: 141.6923,
    mapPoint: Object.freeze([574.95, 94.2]),
    scenePoint: japanToScene([574.95, 94.2])
  }),
  icn: Object.freeze({
    label: "仁川国際空港",
    latitude: 37.4602,
    longitude: 126.4407,
    mapPoint: Object.freeze([214.2, 185.6]),
    scenePoint: koreaToScene([214.2, 185.6])
  }),
  jincheon: Object.freeze({
    label: "韓国SGI鎮川研修院",
    latitude: 36.81428,
    longitude: 127.517518,
    address: "충청북도 진천군 초평면 초평로 1048-6",
    mapPoint: Object.freeze([318.65, 262.4]),
    scenePoint: koreaToScene([318.65, 262.4])
  }),
  daejeon: Object.freeze({
    label: "韓国SGI大田文化会館",
    address: "대전광역시 대덕구 비래동로40번길 46",
    mapPoint: Object.freeze([313.4, 323]),
    scenePoint: koreaToScene([313.4, 323])
  })
});

export const INTRO_SCENE_TRANSFORMS = Object.freeze({ korea: KOREA_SCENE, japan: JAPAN_SCENE });
