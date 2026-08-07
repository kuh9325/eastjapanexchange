/**
 * 전시 문구와 방면회관/단체사진 설정.
 * 지도 경계와 조직 범위는 data/region-config.js에서 관리하며 이 파일과 분리한다.
 * 확정되지 않은 슬로건은 빈 문자열로 둔다.
 */

const hallPhoto = (branch, name) => ({
  photo: `./assets/halls/${branch}/exterior.jpg`,
  alt: `${name} 회관 전경`,
  caption: `${name} 회관 전경`,
  objectPosition: "50% 50%"
});

export const EXHIBITION_CONTENT = Object.freeze({
  chungnam: {
    slogan: "",
    introduction: "백제문화의 중심지로 일본 고대문화 형성에 깊은 영향을 전하고, 근대에는 비폭력 독립정신이 꽃핀 역사와 평화의 가치를 이어가는 방면입니다.",
    hallPhoto: hallPhoto("chungnam", "충남방면"),
    meetingPhoto: null,
    futureMedia: null
  },
  chungbuk: {
    slogan: "",
    introduction: "한반도의 중심에서 다양한 문화가 만나 조화를 이루며, 사제의 정신을 다음 세대에 꾸준히 계승해 온 방면입니다.",
    hallPhoto: hallPhoto("chungbuk", "충북방면"),
    meetingPhoto: null,
    futureMedia: null
  },
  daejeon: {
    slogan: "",
    introduction: "이케다 선생님의 고향 오타(大田)와 같은 한자를 쓰는 인연을 품고, 과학·교육·행정·교통의 중심에서 인간주의를 시민행동으로 실천해 온 방면입니다.",
    hallPhoto: hallPhoto("daejeon", "대전방면"),
    meetingPhoto: null,
    futureMedia: null
  }
});
