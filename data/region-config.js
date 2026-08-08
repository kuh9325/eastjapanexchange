/**
 * 조직 방면 분류와 지도 생성 설정의 단일 진실 원천.
 * SVG 좌표와 라벨은 scripts/generate-map-data.mjs가 이 설정과 vendored
 * statgarten/maps 원본을 결합해 data/regions.js에 생성한다.
 */
export const MAP_VIEWBOX = Object.freeze({ x: 0, y: 0, width: 780, height: 760 });
export const MAP_DISPLAY_VIEWBOX = Object.freeze({ x: 20, y: 28, width: 720, height: 700 });
export const MAP_FOCUS_VIEWBOX = Object.freeze({ x: 145, y: 150, width: 350, height: 300 });
export const MAP_PADDING = 38;

// 전국 시·도 단순화 원본에는 울릉도는 있으나 독도 도형이 없어 위치점만 둔다.
export const MAP_LANDMARKS = Object.freeze([
  Object.freeze({ id: "dokdo", name: "독도", point: Object.freeze([724, 199]) })
]);

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
    nameJa: "忠南方面",
    shortNameJa: "忠南",
    english: "CHUNGNAM AREA",
    color: "coral",
    zones: ["백제권", "서해권", "천안권"],
    description: "백제문화의 중심지로 일본 고대문화 형성에 깊은 영향을 전하고, 근대에는 비폭력 독립정신이 꽃핀 역사와 평화의 가치를 이어가는 방면입니다.",
    descriptionJa: "百済文化の中心地として日本の古代文化形成に深い影響を与え、近代には非暴力の独立精神が花開いた歴史と平和の価値を受け継ぐ方面です。",
    boundaryNote: "행정구역은 방면의 지도 범위를 나타내며, 충청남도 시·군 가운데 계룡시와 금산군은 대전방면에 표시합니다."
  },
  chungbuk: {
    name: "충북방면",
    shortName: "충북",
    nameJa: "忠北方面",
    shortNameJa: "忠北",
    english: "CHUNGBUK AREA",
    color: "teal",
    zones: ["동청주권", "서청주권", "제천권", "충주권"],
    description: "한반도의 중심에서 다양한 문화가 만나 조화를 이루며, 사제의 정신을 다음 세대에 꾸준히 계승해 온 방면입니다.",
    descriptionJa: "朝鮮半島の中央で多様な文化が出会い、調和を育みながら、師弟の精神を次の世代へと脈々と受け継いできた方面です。",
    boundaryNote: "행정구역은 방면의 지도 범위를 나타내며, 옥천군은 대전방면에 표시하고 영동군은 충북방면에서 제외합니다. 제천권의 강원도 영월군은 충북방면에 표시합니다."
  },
  daejeon: {
    name: "대전방면",
    shortName: "대전",
    nameJa: "大田方面",
    shortNameJa: "大田",
    english: "DAEJEON AREA",
    color: "cobalt",
    zones: ["남대전권", "대전권", "서대전권", "세종권"],
    description: "이케다 선생님의 고향 오타(大田)와 같은 한자를 쓰는 인연을 품고, 과학·교육·행정·교통의 중심에서 인간주의를 시민행동으로 실천해 온 방면입니다.",
    descriptionJa: "池田先生の故郷・大田（おおた）と同じ漢字を持つ縁を胸に、科学・教育・行政・交通の中心地として、人間主義を市民の行動に移してきた方面です。",
    boundaryNote: "행정구역은 방면의 지도 범위를 나타내며, 세종특별자치시와 계룡시·금산군·옥천군을 행정 도 경계와 관계없이 함께 표시합니다."
  }
});

export const CATEGORY_CONFIG = Object.freeze({
  future: { name: "청년미래총회", shortName: "미래총회", nameJa: "青年未来総会", shortNameJa: "未来総会" },
  visit: { name: "방문 일대일 근행회", shortName: "방문 근행회", nameJa: "訪問一対一勤行会", shortNameJa: "訪問勤行会" }
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
