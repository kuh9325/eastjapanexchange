/**
 * 조직 방면 분류와 지도 생성 설정의 단일 진실 원천.
 * SVG 좌표와 라벨은 scripts/generate-map-data.mjs가 이 설정과 vendored
 * statgarten/maps 원본을 결합해 data/regions.js에 생성한다.
 */
export const MAP_VIEWBOX = Object.freeze({ x: 0, y: 0, width: 780, height: 760 });
export const MAP_DISPLAY_VIEWBOX = Object.freeze({ x: 20, y: 28, width: 650, height: 700 });
export const MAP_PADDING = 38;

export const MAP_SOURCE = Object.freeze({
  repository: "https://github.com/statgarten/maps",
  commit: "d5f8ea3208f19a73a01f865847d20cc195ae91ba",
  year: 2020,
  attribution: "통계청 SGIS 2020 행정구역 경계 기반, 전시용 단순화"
});

export const BRANCH_CONFIG = Object.freeze({
  chungnam: {
    name: "충남방면",
    shortName: "충남",
    english: "CHUNGNAM AREA",
    color: "coral",
    zones: ["백제권", "서해권", "천안권"],
    description: "서해의 넉넉함과 백제의 문화가 이어지는 충남 청년들의 활동 기록입니다.",
    boundaryNote: "행정구역은 방면의 지도 범위를 나타내며, 충청남도 시·군 가운데 계룡시와 금산군은 대전방면에 표시합니다."
  },
  chungbuk: {
    name: "충북방면",
    shortName: "충북",
    english: "CHUNGBUK AREA",
    color: "teal",
    zones: ["동청주권", "서청주권", "제천권", "충주권"],
    description: "대한민국의 중심에서 사람과 사람을 잇는 충북 청년들의 활동 기록입니다.",
    boundaryNote: "행정구역은 방면의 지도 범위를 나타내며, 옥천군은 대전방면에 표시하고 영동군은 충북방면에서 제외합니다. 제천권의 강원도 영월군은 충북방면에 표시합니다."
  },
  daejeon: {
    name: "대전방면",
    shortName: "대전",
    english: "DAEJEON AREA",
    color: "cobalt",
    zones: ["남대전권", "대전권", "서대전권", "세종권"],
    description: "대전광역시와 세종·계룡·금산·옥천을 하나로 잇는 청년들의 활동 기록입니다.",
    boundaryNote: "행정구역은 방면의 지도 범위를 나타내며, 세종특별자치시와 계룡시·금산군·옥천군을 행정 도 경계와 관계없이 함께 표시합니다."
  }
});

export const CATEGORY_CONFIG = Object.freeze({
  discussion: { name: "좌담회", shortName: "좌담회" },
  school: { name: "창가청년스쿨", shortName: "청년스쿨" },
  future: { name: "청년미래총회", shortName: "미래총회" },
  daily: { name: "평상시 활동", shortName: "평상시" }
});

// 서로 다른 단순화 단계의 SVG를 boolean 연산할 때 예외 지역 가장자리에
// 생기는 작은 분리 조각만 제거한다. 서해의 실제 섬은 x 범위 밖이라 보존된다.
export const BRANCH_GEOMETRY_FILTERS = Object.freeze({
  chungnam: Object.freeze({ detachedMaxArea: 5, detachedMinCenterX: 280 })
});

export const NATIONAL_SOURCE_FILE = "전국_시도_경계.svg";

export const ADMIN_SOURCES = Object.freeze([
  {
    province: "대전광역시",
    file: "대전광역시_시군구_경계.svg",
    defaultBranch: "daejeon",
    overrides: {}
  },
  {
    province: "세종특별자치시",
    file: "세종특별자치시_시군구_경계.svg",
    defaultBranch: "daejeon",
    overrides: {}
  },
  {
    province: "충청남도",
    file: "충청남도_시군구_경계.svg",
    defaultBranch: "chungnam",
    alignProjectionByLargestPolygon: true,
    overrides: {
      "계룡시": "daejeon",
      "금산군": "daejeon"
    }
  },
  {
    province: "충청북도",
    file: "충청북도_시군구_경계.svg",
    defaultBranch: "chungbuk",
    coverageFromIncludedUnits: true,
    exclude: ["영동군"],
    overrides: {
      "옥천군": "daejeon"
    }
  },
  {
    province: "강원도",
    file: "강원도_시군구_경계.svg",
    defaultBranch: null,
    include: ["영월군"],
    overrides: {
      "영월군": "chungbuk"
    }
  }
]);
