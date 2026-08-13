/**
 * 전시 문구와 방면회관/단체사진 설정.
 * 지도 경계와 조직 범위는 data/region-config.js에서 관리하며 이 파일과 분리한다.
 * 한국어·일본어 소개와 슬로건을 함께 관리한다.
 */

const hallPhoto = (branch, name, nameJa) => ({
  photo: `./assets/halls/${branch}/exterior.webp`,
  alt: `${name} 회관 전경`,
  caption: `${name} 회관 전경`,
  altJa: `${nameJa}会館の外観`,
  captionJa: `${nameJa}会館の外観`,
  objectPosition: "50% 50%"
});

export const EXHIBITION_CONTENT = Object.freeze({
  chungnam: {
    slogan: "백제에서 미래로 — 문화의 은혜를 평화의 우정으로",
    sloganJa: "百済から未来へ―文化の恩を平和の友情へ",
    introduction: "백제문화의 중심지로 일본 고대문화 형성에 깊은 영향을 전하고, 근대에는 비폭력 독립정신이 꽃핀 역사와 평화의 가치를 이어가는 방면입니다.",
    introductionJa: "百済文化の中心地として日本の古代文化形成に深い影響を与え、近代には非暴力の独立精神が花開いた歴史と平和の価値を受け継ぐ方面です。",
    hallPhoto: hallPhoto("chungnam", "충남방면", "忠南方面"),
    meetingPhoto: null,
    futureMedia: null
  },
  chungbuk: {
    slogan: "중원의 대지 — 조화를 배우고 사명을 계승하다",
    sloganJa: "中原の大地―調和を学び、使命を受け継ぐ",
    introduction: "한반도의 중심에서 다양한 문화가 만나 조화를 이루며, 사제의 정신을 다음 세대에 꾸준히 계승해 온 방면입니다.",
    introductionJa: "朝鮮半島の中央で多様な文化が出会い、調和を育みながら、師弟の精神を次の世代へと脈々と受け継いできた方面です。",
    hallPhoto: hallPhoto("chungbuk", "충북방면", "忠北方面"),
    meetingPhoto: null,
    futureMedia: null
  },
  daejeon: {
    slogan: "한 사람의 행동이 도시를 바꾼다",
    sloganJa: "一人の行動が都市を変える",
    introduction: "이케다 선생님의 고향 오타(大田)와 같은 한자를 쓰는 인연을 품고, 과학·교육·행정·교통의 중심에서 인간주의를 시민행동으로 실천해 온 방면입니다.",
    introductionJa: "池田先生の故郷・大田（おおた）と同じ漢字を持つ縁を胸に、科学・教育・行政・交通の中心地として、人間主義を市民の行動に移してきた方面です。",
    hallPhoto: hallPhoto("daejeon", "대전방면", "大田方面"),
    meetingPhoto: null,
    futureMedia: null
  }
});
