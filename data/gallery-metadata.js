export const ZONE_LABELS = Object.freeze({
  baekje: Object.freeze({ ko: "백제권", ja: "百済圏" }),
  seohae: Object.freeze({ ko: "서해권", ja: "西海圏" }),
  cheonan: Object.freeze({ ko: "천안권", ja: "天安圏" }),
  "east-cheongju": Object.freeze({ ko: "동청주권", ja: "東清州圏" }),
  "west-cheongju": Object.freeze({ ko: "서청주권", ja: "西清州圏" }),
  jecheon: Object.freeze({ ko: "제천권", ja: "堤川圏" }),
  chungju: Object.freeze({ ko: "충주권", ja: "忠州圏" }),
  "south-daejeon": Object.freeze({ ko: "남대전권", ja: "南大田圏" }),
  daejeon: Object.freeze({ ko: "대전권", ja: "大田圏" }),
  "west-daejeon": Object.freeze({ ko: "서대전권", ja: "西大田圏" }),
  sejong: Object.freeze({ ko: "세종권", ja: "世宗圏" })
});

export const DEPARTMENT_LABELS = Object.freeze({
  men: Object.freeze({ ko: "남자부", ja: "男子部" }),
  women: Object.freeze({ ko: "여자부", ja: "女子部" }),
  youth: Object.freeze({ ko: "청년부", ja: "青年部" })
});

export function inferDepartment(filename) {
  const normalized = String(filename || "").normalize("NFC");
  const marker = normalized.match(/^\s*\(?\s*(남자부|여자부|남|여)\s*\)?/u)?.[1] || "";
  if (marker.startsWith("남")) return "men";
  if (marker.startsWith("여")) return "women";
  return "youth";
}

export function localizedMetadataLabel(labels, language) {
  if (!labels) return "";
  return labels[language === "ja" ? "ja" : "ko"] || labels.ko || "";
}
