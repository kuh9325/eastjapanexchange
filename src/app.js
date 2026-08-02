import { BRANCHES, CATEGORIES } from "../data/regions.js";

const app = document.querySelector("#app");
const galleryPanel = document.querySelector(".gallery-panel");
const galleryTitle = document.querySelector("#gallery-title");
const galleryKicker = document.querySelector("#gallery-kicker");
const galleryDescription = document.querySelector("#gallery-description");
const photoGrid = document.querySelector("#photo-grid");
const photoCount = document.querySelector("#photo-count");
const branchTriggers = [...document.querySelectorAll("[data-branch]")];
const mapRegions = [...document.querySelectorAll(".branch-region")];
const categoryButtons = [...document.querySelectorAll("[data-category]")];
const backButton = document.querySelector(".back-button");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxCaption = document.querySelector("#lightbox-caption");

let manifest = { photos: [] };
let selectedBranch = null;
let selectedCategory = "all";
let visiblePhotos = [];
let lightboxIndex = 0;

async function loadManifest() {
  try {
    const response = await fetch("./assets/gallery-manifest.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`manifest ${response.status}`);
    manifest = await response.json();
  } catch (error) {
    console.info("사진 애셋이 아직 없어 기본 안내 화면을 표시합니다.", error);
    manifest = { photos: [] };
  }
}

function selectBranch(branchKey) {
  if (!BRANCHES[branchKey]) return;
  selectedBranch = branchKey;
  selectedCategory = "all";
  app.classList.add("has-selection");
  galleryPanel.setAttribute("aria-hidden", "false");

  branchTriggers.forEach((trigger) => {
    const active = trigger.dataset.branch === branchKey;
    trigger.classList.toggle("active", active);
    if (trigger.matches("button")) trigger.setAttribute("aria-pressed", String(active));
  });
  mapRegions.forEach((region) => region.classList.toggle("selected", region.dataset.branch === branchKey));
  categoryButtons.forEach((button) => button.setAttribute("aria-selected", String(button.dataset.category === "all")));

  const branch = BRANCHES[branchKey];
  galleryKicker.textContent = branch.english;
  galleryTitle.textContent = branch.name;
  galleryDescription.textContent = branch.description;
  renderGallery();

  if (window.matchMedia("(max-width: 980px)").matches) {
    requestAnimationFrame(() => galleryPanel.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
}

function clearSelection() {
  selectedBranch = null;
  app.classList.remove("has-selection");
  galleryPanel.setAttribute("aria-hidden", "true");
  branchTriggers.forEach((trigger) => trigger.classList.remove("active"));
  mapRegions.forEach((region) => region.classList.remove("selected"));
}

function humaniseFilename(filename) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/^\d{4}[-_.]?\d{2}[-_.]?\d{2}[-_ ]?/, "")
    .replace(/[_-]+/g, " ")
    .trim() || "청년 활동의 순간";
}

function renderGallery() {
  if (!selectedBranch) return;
  visiblePhotos = manifest.photos.filter((photo) => {
    const branchMatch = photo.branch === selectedBranch;
    const categoryMatch = selectedCategory === "all" || photo.category === selectedCategory;
    return branchMatch && categoryMatch;
  });

  photoGrid.replaceChildren();
  photoCount.textContent = `${visiblePhotos.length}장의 기록`;

  if (!visiblePhotos.length) {
    renderPlaceholders();
    return;
  }

  visiblePhotos.forEach((photo, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `photo-card ${index % 7 === 0 ? "wide" : ""} ${index % 9 === 5 ? "tall" : ""}`.trim();
    card.style.animationDelay = `${Math.min(index, 12) * 45}ms`;
    card.dataset.photoIndex = String(index);
    card.setAttribute("aria-label", `${photo.caption || humaniseFilename(photo.filename)} 사진 크게 보기`);

    const img = document.createElement("img");
    img.src = photo.src;
    img.alt = photo.alt || photo.caption || humaniseFilename(photo.filename);
    img.loading = index < 5 ? "eager" : "lazy";
    img.decoding = "async";

    const meta = document.createElement("span");
    meta.className = "photo-meta";
    const title = document.createElement("strong");
    title.textContent = photo.caption || humaniseFilename(photo.filename);
    const type = document.createElement("span");
    type.textContent = CATEGORIES[photo.category] || "활동 기록";
    meta.append(title, type);
    card.append(img, meta);
    photoGrid.append(card);
  });
}

function renderPlaceholders() {
  const branchName = BRANCHES[selectedBranch].name;
  const categoryName = selectedCategory === "all" ? "활동" : CATEGORIES[selectedCategory];
  const messages = [
    ["🖼️", `${branchName} 사진을 기다리고 있습니다`, `assets/gallery/${selectedBranch}/ 아래에 사진을 넣고 npm run assets를 실행하세요.`],
    ["🤝", `${categoryName}의 따뜻한 순간`, "사진이 들어오면 이 영역이 자동으로 콜라주 갤러리로 바뀝니다."],
    ["✨", "사람이 중심이 되는 전시", "파일명은 화면의 기본 사진 설명으로 자동 변환됩니다."]
  ];
  messages.forEach(([icon, title, copy]) => {
    const card = document.createElement("div");
    card.className = "placeholder-card";
    card.innerHTML = `<div><span class="placeholder-icon">${icon}</span><strong>${title}</strong><span>${copy}</span></div>`;
    photoGrid.append(card);
  });
}

function setCategory(category) {
  selectedCategory = category;
  categoryButtons.forEach((button) => button.setAttribute("aria-selected", String(button.dataset.category === category)));
  renderGallery();
}

function openLightbox(index) {
  const photo = visiblePhotos[index];
  if (!photo) return;
  lightboxIndex = index;
  lightboxImage.src = photo.src;
  lightboxImage.alt = photo.alt || photo.caption || humaniseFilename(photo.filename);
  lightboxCaption.textContent = `${photo.caption || humaniseFilename(photo.filename)} · ${CATEGORIES[photo.category] || "활동 기록"}`;
  if (!lightbox.open) lightbox.showModal();
}

function moveLightbox(direction) {
  if (!visiblePhotos.length) return;
  const next = (lightboxIndex + direction + visiblePhotos.length) % visiblePhotos.length;
  openLightbox(next);
}

branchTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => selectBranch(trigger.dataset.branch));
  if (trigger.classList.contains("branch-region")) {
    trigger.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectBranch(trigger.dataset.branch);
      }
    });
  }
});
categoryButtons.forEach((button) => button.addEventListener("click", () => setCategory(button.dataset.category)));
backButton.addEventListener("click", clearSelection);
photoGrid.addEventListener("click", (event) => {
  const card = event.target.closest(".photo-card");
  if (card) openLightbox(Number(card.dataset.photoIndex));
});
document.querySelector(".lightbox-close").addEventListener("click", () => lightbox.close());
document.querySelector(".lightbox-nav.previous").addEventListener("click", () => moveLightbox(-1));
document.querySelector(".lightbox-nav.next").addEventListener("click", () => moveLightbox(1));
lightbox.addEventListener("click", (event) => { if (event.target === lightbox) lightbox.close(); });
document.addEventListener("keydown", (event) => {
  if (!lightbox.open) return;
  if (event.key === "ArrowLeft") moveLightbox(-1);
  if (event.key === "ArrowRight") moveLightbox(1);
});

await loadManifest();
