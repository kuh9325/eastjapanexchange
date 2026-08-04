const BRANCH_NAMES = {
  chungnam: "충남방면",
  chungbuk: "충북방면",
  daejeon: "대전방면"
};

const CATEGORY_SEQUENCE = ["discussion", "school", "future", "daily", "discussion", "daily"];

export const EMPTY_FIXTURE_MANIFEST = Object.freeze({ version: 1, fixture: "empty", photos: [] });

const fixturePhotos = [];
Object.keys(BRANCH_NAMES).forEach((branch) => {
  CATEGORY_SEQUENCE.forEach((category, index) => {
    fixturePhotos.push({
      id: `fixture-${branch}-${index + 1}`,
      branch,
      category,
      filename: `fixture-${index + 1}.svg`,
      src: `./fixtures/full/gallery/activity-${index + 1}.svg`,
      thumbnail: `./fixtures/full/gallery/activity-${index + 1}.svg`,
      caption: `${BRANCH_NAMES[branch]} 테스트 활동 ${index + 1}`,
      alt: `${BRANCH_NAMES[branch]} 활동 사진 레이아웃을 확인하는 추상 그래픽 ${index + 1}`
    });
  });
});

export const FULL_FIXTURE_MANIFEST = Object.freeze({
  version: 1,
  fixture: "full",
  photos: fixturePhotos
});

const fixtureLeaders = (branch) => [1, 2, 3, 4].map((number) => ({
  role: "",
  name: "",
  photo: `./fixtures/full/leaders/leader-${number}.svg`,
  alt: `${BRANCH_NAMES[branch]} 테스트 간부 카드용 비인물 그래픽 ${number}`,
  objectPosition: "50% 50%"
}));

const fullContent = {};
const emptyContent = {};
Object.keys(BRANCH_NAMES).forEach((branch) => {
  const name = BRANCH_NAMES[branch];
  fullContent[branch] = {
    slogan: `${name} 테스트 슬로건`,
    introduction: `${name} 전시 콘텐츠의 전체 상태를 확인하는 테스트 소개입니다.`,
    leaders: fixtureLeaders(branch),
    meetingPhoto: {
      photo: "./fixtures/full/meeting/group.svg",
      alt: `${name} 단체사진 영역 테스트용 추상 그래픽`,
      caption: `${name} 방면운영회의 테스트 이미지`
    },
    futureMedia: null
  };
  emptyContent[branch] = {
    slogan: "",
    introduction: "",
    leaders: [],
    meetingPhoto: null,
    futureMedia: null
  };
});

export const FULL_FIXTURE_CONTENT = Object.freeze(fullContent);
export const EMPTY_FIXTURE_CONTENT = Object.freeze(emptyContent);
