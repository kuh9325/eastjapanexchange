const BRANCH_NAMES = {
  chungnam: "충남방면",
  chungbuk: "충북방면",
  daejeon: "대전방면"
};
const BRANCH_NAMES_JA = {
  chungnam: "忠南方面",
  chungbuk: "忠北方面",
  daejeon: "大田方面"
};

const CATEGORY_SEQUENCE = ["school", "visit", "school", "visit", "school", "visit"];

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
      alt: `${BRANCH_NAMES[branch]} 활동 사진 레이아웃을 확인하는 추상 그래픽 ${index + 1}`,
      captionJa: `${BRANCH_NAMES_JA[branch]} テスト活動 ${index + 1}`,
      altJa: `${BRANCH_NAMES_JA[branch]}の活動写真レイアウトを確認する抽象グラフィック ${index + 1}`
    });
  });
});

export const FULL_FIXTURE_MANIFEST = Object.freeze({
  version: 1,
  fixture: "full",
  photos: fixturePhotos
});

const fullContent = {};
const emptyContent = {};
Object.keys(BRANCH_NAMES).forEach((branch) => {
  const name = BRANCH_NAMES[branch];
  const nameJa = BRANCH_NAMES_JA[branch];
  fullContent[branch] = {
    slogan: `${name} 테스트 슬로건`,
    sloganJa: `${nameJa}のテストスローガン`,
    introduction: `${name} 전시 콘텐츠의 전체 상태를 확인하는 테스트 소개입니다.`,
    introductionJa: `${nameJa}の展示コンテンツ全体を確認するためのテスト紹介文です。`,
    hallPhoto: {
      photo: "./fixtures/full/meeting/group.svg",
      alt: `${name} 회관 전경 영역 테스트용 추상 그래픽`,
      caption: `${name} 회관 전경 테스트 이미지`,
      altJa: `${nameJa}会館の外観枠を確認するテスト用グラフィック`,
      captionJa: `${nameJa}会館の外観テスト画像`
    },
    meetingPhoto: {
      photo: "./fixtures/full/meeting/group.svg",
      alt: `${name} 단체사진 영역 테스트용 추상 그래픽`,
      caption: `${name} 방면운영회의 테스트 이미지`,
      altJa: `${nameJa}の集合写真枠を確認するテスト用グラフィック`,
      captionJa: `${nameJa}運営会議のテスト画像`
    },
    futureMedia: null
  };
  emptyContent[branch] = {
    slogan: "",
    sloganJa: "",
    introduction: "",
    introductionJa: "",
    hallPhoto: null,
    meetingPhoto: null,
    futureMedia: null
  };
});

export const FULL_FIXTURE_CONTENT = Object.freeze(fullContent);
export const EMPTY_FIXTURE_CONTENT = Object.freeze(emptyContent);
