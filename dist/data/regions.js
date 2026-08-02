/**
 * 전시 방면의 단일 진실 원천(SSOT).
 *
 * 지도는 municipalities의 path를 그리며, 갤러리는 같은 branch key를
 * manifest 필터에 사용한다. 따라서 행정구역/조직 방면 예외는 이 파일에서만
 * 수정하면 된다. 도형은 법적 경계가 아닌 전시용 단순화 다이어그램이다.
 */
export const BRANCHES = Object.freeze({
  chungnam: {
    name: "충남방면",
    shortName: "충남",
    english: "CHUNGNAM AREA",
    color: "coral",
    description: "서해의 넉넉함과 백제의 문화가 이어지는 충남 청년들의 활동 기록입니다.",
    boundaryNote: "충청남도 시·군 가운데 계룡시와 금산군은 대전방면으로 분류합니다.",
    label: [291, 409],
    outlinePaths: [
      "M194 300 L239 253 L336 244 L401 277 L414 335 L398 382 L414 438 L388 510 L329 540 L258 526 L211 480 L201 418 L176 375 Z"
    ],
    municipalities: [
      { id: "taean", name: "태안", path: "M176 326 L205 294 L230 310 L226 354 L198 375 L176 357 Z", label: [201, 337] },
      { id: "seosan", name: "서산", path: "M205 294 L245 270 L274 303 L253 344 L226 354 L230 310 Z", label: [239, 313] },
      { id: "dangjin", name: "당진", path: "M245 270 L278 245 L326 246 L338 281 L302 309 L274 303 Z", label: [294, 276] },
      { id: "cheonan", name: "천안", path: "M326 246 L371 261 L401 287 L390 323 L349 319 L338 281 Z", label: [363, 288] },
      { id: "asan", name: "아산", path: "M302 309 L338 281 L349 319 L332 351 L290 348 L274 303 Z", label: [315, 322] },
      { id: "yesan", name: "예산", path: "M253 344 L290 348 L332 351 L318 389 L275 397 L240 374 Z", label: [286, 370] },
      { id: "hongseong", name: "홍성", path: "M198 375 L226 354 L240 374 L275 397 L260 431 L218 423 L201 402 Z", label: [232, 400] },
      { id: "gongju", name: "공주", path: "M332 351 L370 339 L397 367 L382 413 L341 421 L318 389 Z", label: [360, 383] },
      { id: "cheongyang", name: "청양", path: "M275 397 L318 389 L341 421 L314 452 L260 431 Z", label: [300, 421] },
      { id: "boryeong", name: "보령", path: "M201 402 L218 423 L260 431 L253 475 L211 480 L192 448 Z", label: [229, 451] },
      { id: "buyeo", name: "부여", path: "M314 452 L341 421 L382 413 L387 457 L355 485 L306 484 Z", label: [347, 453] },
      { id: "nonsan", name: "논산", path: "M355 485 L387 457 L407 476 L388 510 L353 527 L329 503 Z", label: [371, 492] },
      { id: "seocheon", name: "서천", path: "M211 480 L253 475 L306 484 L329 503 L299 532 L258 526 L229 511 Z", label: [274, 507] }
    ]
  },
  chungbuk: {
    name: "충북방면",
    shortName: "충북",
    english: "CHUNGBUK AREA",
    color: "teal",
    description: "대한민국의 중심에서 사람과 사람을 잇는 충북 청년들의 활동 기록입니다.",
    boundaryNote: "충청북도 시·군 가운데 옥천군은 대전방면으로 분류합니다.",
    label: [506, 387],
    outlinePaths: [
      "M411 247 L465 214 L543 235 L584 278 L582 338 L607 376 L592 427 L611 466 L579 520 L513 552 L456 532 L421 487 L407 432 L391 374 L405 314 Z"
    ],
    municipalities: [
      { id: "jincheon", name: "진천", path: "M411 263 L447 231 L476 257 L461 299 L420 314 L405 286 Z", label: [439, 270] },
      { id: "eumseong", name: "음성", path: "M447 231 L486 214 L528 232 L543 267 L506 287 L476 257 Z", label: [493, 249] },
      { id: "chungju", name: "충주", path: "M476 257 L506 287 L553 274 L582 304 L567 349 L520 365 L461 299 Z", label: [519, 318] },
      { id: "jecheon", name: "제천", path: "M528 232 L568 250 L584 278 L582 304 L553 274 L506 287 L543 267 Z", label: [552, 270] },
      { id: "danyang", name: "단양", path: "M582 304 L594 340 L607 376 L582 401 L554 378 L567 349 Z", label: [582, 361] },
      { id: "jeungpyeong", name: "증평", path: "M420 314 L461 299 L477 331 L451 351 L414 345 Z", label: [445, 329] },
      { id: "cheongju", name: "청주", path: "M414 345 L451 351 L487 378 L472 426 L423 423 L391 374 Z", label: [438, 390] },
      { id: "goesan", name: "괴산", path: "M477 331 L520 365 L554 378 L567 416 L530 443 L487 378 L451 351 Z", label: [518, 393] },
      { id: "boeun", name: "보은", path: "M423 423 L472 426 L500 460 L480 493 L438 482 L407 432 Z", label: [454, 456] },
      { id: "yeongdong", name: "영동", path: "M500 460 L530 443 L579 459 L592 491 L563 523 L513 540 L480 493 Z", label: [536, 491] }
    ]
  },
  daejeon: {
    name: "대전방면",
    shortName: "대전",
    english: "DAEJEON AREA",
    color: "cobalt",
    description: "대전광역시와 세종·계룡·금산·옥천을 하나로 잇는 청년들의 활동 기록입니다.",
    boundaryNote: "세종특별자치시와 계룡시·금산군·옥천군을 행정 도 경계와 관계없이 함께 표시합니다.",
    label: [432, 430],
    outlinePaths: [
      "M366 310 L411 291 L443 321 L438 363 L405 389 L370 373 L351 340 Z",
      "M374 383 L433 365 L475 390 L498 431 L476 482 L432 500 L390 471 L363 426 Z"
    ],
    municipalities: [
      { id: "sejong", name: "세종", path: "M370 313 L411 292 L441 321 L435 356 L405 378 L372 365 L352 340 Z", label: [402, 336] },
      { id: "daejeon", name: "대전", path: "M405 378 L435 356 L471 377 L470 417 L436 443 L397 424 L382 397 Z", label: [430, 402] },
      { id: "gyeryong", name: "계룡", path: "M382 397 L397 424 L389 450 L363 426 Z", label: [379, 426] },
      { id: "geumsan", name: "금산", path: "M389 450 L436 443 L470 417 L497 432 L476 480 L432 499 L402 478 Z", label: [442, 468] },
      { id: "okcheon", name: "옥천", path: "M471 377 L502 365 L523 394 L510 424 L497 432 L470 417 Z", label: [494, 398] }
    ]
  }
});

export const CATEGORIES = Object.freeze({
  discussion: { name: "좌담회", shortName: "좌담회" },
  school: { name: "창가청년스쿨", shortName: "청년스쿨" },
  future: { name: "청년미래총회", shortName: "미래총회" },
  daily: { name: "평상시 활동", shortName: "평상시" }
});

export const BRANCH_KEYS = Object.freeze(Object.keys(BRANCHES));
export const CATEGORY_KEYS = Object.freeze(Object.keys(CATEGORIES));

export function municipalityNames(branchKey) {
  return BRANCHES[branchKey]?.municipalities.map(({ name }) => name) ?? [];
}
