/**
 * 전시 문구와 인물/단체사진 설정.
 * 지도 경계와 조직 범위는 data/region-config.js에서 관리하며 이 파일과 분리한다.
 * 확정되지 않은 슬로건·직책·이름은 빈 문자열로 둔다.
 */
const leaderSlots = (branch) => ["01", "02", "03", "04"].map((number) => ({
  role: "",
  name: "",
  photo: `./assets/leaders/${branch}/${number}.jpg`,
  alt: "",
  objectPosition: "50% 32%"
}));

export const EXHIBITION_CONTENT = Object.freeze({
  chungnam: {
    slogan: "",
    introduction: "서해의 넉넉함과 백제의 문화가 이어지는 충남 청년들의 활동 기록입니다.",
    leaders: leaderSlots("chungnam"),
    meetingPhoto: null,
    futureMedia: null
  },
  chungbuk: {
    slogan: "",
    introduction: "대한민국의 중심에서 사람과 사람을 잇는 충북 청년들의 활동 기록입니다.",
    leaders: leaderSlots("chungbuk"),
    meetingPhoto: null,
    futureMedia: null
  },
  daejeon: {
    slogan: "",
    introduction: "대전광역시와 세종·계룡·금산·옥천을 하나로 잇는 청년들의 활동 기록입니다.",
    leaders: leaderSlots("daejeon"),
    meetingPhoto: null,
    futureMedia: null
  }
});

