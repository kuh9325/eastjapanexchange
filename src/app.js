import { BRANCHES, BRANCH_KEYS, CATEGORIES, CATEGORY_KEYS, municipalityNames } from "../data/regions.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const app = document.querySelector("#app");
const branchSwitcher = document.querySelector("#branch-switcher");
const branchMapLayer = document.querySelector("#branch-map-layer");
const mapLegend = document.querySelector("#map-legend");
const galleryPanel = document.querySelector(".gallery-panel");
const galleryTitle = document.querySelector("#gallery-title");
const galleryKicker = document.querySelector("#gallery-kicker");
const galleryDescription = document.querySelector("#gallery-description");
const boundaryNote = document.querySelector("#boundary-note");
const municipalityList = document.querySelector("#municipality-list");
const photoGrid = document.querySelector("#photo-grid");
const photoCount = document.querySelector("#photo-count");
const galleryStatus = document.querySelector("#gallery-status");
const categoryButtons = [...document.querySelectorAll("[data-category]")];
const backButton = document.querySelector(".back-button");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxCaption = document.querySelector("#lightbox-caption");
const lightboxPrevious = document.querySelector(".lightbox-nav.previous");
const lightboxNext = document.querySelector(".lightbox-nav.next");

let manifest = { photos: [] };
let manifestAvailable = true;
let selectedBranch = null;
let selectedCategory = "all";
let visiblePhotos = [];
let lightboxIndex = 0;
let lightboxOpener = null;

const svgElement = (name, attributes = {}) => {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
};

function renderBranchControls() {
  Object.entries(BRANCHES).forEach(([branchKey, branch]) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "branch-chip";
    chip.dataset.branch = branchKey;
    chip.setAttribute("aria-pressed", "false");
    chip.setAttribute("aria-label", `${branch.name} 선택`);

    const dot = document.createElement("span");
    dot.className = "branch-dot";
    dot.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = branch.name;
    chip.append(dot, label);
    branchSwitcher.append(chip);

    const legend = document.createElement("span");
    legend.className = `legend-item legend-${branchKey}`;
    legend.textContent = branch.shortName;
    mapLegend.append(legend);
  });
}

function renderMap() {
  Object.entries(BRANCHES).forEach(([branchKey, branch]) => {
    const region = svgElement("g", {
      class: `branch-region branch-${branchKey}`,
      "data-branch": branchKey,
      tabindex: "0",
      role: "button",
      "aria-pressed": "false",
      "aria-label": `${branch.name} 선택. 포함 지역: ${municipalityNames(branchKey).join(", ")}`
    });
    const title = svgElement("title");
    title.textContent = `${branch.name}: ${municipalityNames(branchKey).join(", ")}`;
    region.append(title);

    const outlines = svgElement("g", { class: "branch-outlines", "aria-hidden": "true" });
    branch.outlinePaths.forEach((pathData) => {
      outlines.append(svgElement("path", { class: "branch-halo", d: pathData }));
    });
    region.append(outlines);

    const municipalities = svgElement("g", { class: "municipalities", "aria-hidden": "true" });
    branch.municipalities.forEach((municipality) => {
      const path = svgElement("path", { d: municipality.path, "data-city": municipality.name });
      const pathTitle = svgElement("title");
      pathTitle.textContent = municipality.name;
      path.append(pathTitle);
      municipalities.append(path);

      const cityLabel = svgElement("text", {
        class: "city-label",
        x: municipality.label[0],
        y: municipality.label[1]
      });
      cityLabel.textContent = municipality.name;
      municipalities.append(cityLabel);
    });
    region.append(municipalities);

    const [labelX, labelY] = branch.label;
    const label = svgElement("text", { class: "branch-label", x: labelX, y: labelY });
    label.textContent = branch.name;
    region.append(label);
    branchMapLayer.append(region);
  });
}

async function loadManifest() {
  try {
    const response = await fetch("./assets/gallery-manifest.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
    const result = await response.json();
    if (!Array.isArray(result.photos)) throw new TypeError("manifest photos가 배열이 아닙니다.");
    manifest = {
      ...result,
      photos: result.photos.filter((photo) => (
        BRANCH_KEYS.includes(photo.branch)
        && CATEGORY_KEYS.includes(photo.category)
        && typeof photo.src === "string"
      ))
    };
  } catch (error) {
    manifestAvailable = false;
    manifest = { photos: [] };
    console.info("사진 manifest를 읽지 못해 안내 카드를 표시합니다.", error.message);
  }
}

function branchTriggers() {
  return [...document.querySelectorAll("[data-branch]")];
}

function selectBranch(branchKey, { scroll = true } = {}) {
  if (!BRANCHES[branchKey]) return;
  selectedBranch = branchKey;
  app.dataset.branch = branchKey;
  app.classList.add("has-selection");
  galleryPanel.inert = false;
  galleryPanel.setAttribute("aria-hidden", "false");

  branchTriggers().forEach((trigger) => {
    const active = trigger.dataset.branch === branchKey;
    trigger.classList.toggle("active", active);
    trigger.classList.toggle("selected", active && trigger.classList.contains("branch-region"));
    trigger.setAttribute("aria-pressed", String(active));
  });
  setCategory("all", { focus: false });

  const branch = BRANCHES[branchKey];
  galleryKicker.textContent = branch.english;
  galleryTitle.textContent = branch.name;
  galleryDescription.textContent = branch.description;
  boundaryNote.textContent = branch.boundaryNote;
  municipalityList.replaceChildren(...branch.municipalities.map(({ name }) => {
    const item = document.createElement("li");
    item.textContent = name;
    return item;
  }));
  renderGallery();

  if (scroll && window.matchMedia("(max-width: 1080px)").matches) {
    requestAnimationFrame(() => galleryPanel.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
}

function clearSelection({ restoreFocus = false } = {}) {
  const previousBranch = selectedBranch;
  selectedBranch = null;
  delete app.dataset.branch;
  app.classList.remove("has-selection");
  galleryPanel.inert = true;
  galleryPanel.setAttribute("aria-hidden", "true");
  branchTriggers().forEach((trigger) => {
    trigger.classList.remove("active", "selected");
    trigger.setAttribute("aria-pressed", "false");
  });
  if (restoreFocus && previousBranch) {
    document.querySelector(`.branch-chip[data-branch="${previousBranch}"]`)?.focus();
  }
}

function humaniseFilename(filename) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/^\d{4}[-_.]?\d{2}[-_.]?\d{2}[-_ ]?/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "청년 활동의 순간";
}

function renderGallery() {
  if (!selectedBranch) return;
  visiblePhotos = manifest.photos.filter((photo) => (
    photo.branch === selectedBranch
    && (selectedCategory === "all" || photo.category === selectedCategory)
  ));

  photoGrid.replaceChildren();
  photoCount.textContent = `${visiblePhotos.length}장의 기록`;
  galleryStatus.textContent = manifestAvailable
    ? "사진을 눌러 크게 볼 수 있습니다."
    : "사진 목록을 불러오지 못했습니다. 안내 카드를 표시합니다.";

  if (!visiblePhotos.length) {
    renderPlaceholders();
    return;
  }

  visiblePhotos.forEach((photo, index) => {
    const caption = photo.caption || humaniseFilename(photo.filename || "");
    const card = document.createElement("button");
    card.type = "button";
    card.className = `photo-card ${index % 7 === 0 ? "wide" : ""} ${index % 9 === 5 ? "tall" : ""}`.trim();
    card.style.setProperty("--delay", `${Math.min(index, 12) * 45}ms`);
    card.dataset.photoIndex = String(index);
    card.setAttribute("aria-label", `${caption} 사진 크게 보기`);

    const img = document.createElement("img");
    img.src = photo.src;
    img.alt = photo.alt || caption;
    img.loading = index < 5 ? "eager" : "lazy";
    img.decoding = "async";
    img.addEventListener("error", () => {
      img.hidden = true;
      card.classList.add("image-missing");
      card.setAttribute("aria-label", `${caption}. 이미지 파일을 불러올 수 없습니다.`);
    }, { once: true });

    const fallback = document.createElement("span");
    fallback.className = "image-fallback";
    fallback.textContent = "이미지를 불러올 수 없습니다";

    const meta = document.createElement("span");
    meta.className = "photo-meta";
    const title = document.createElement("strong");
    title.textContent = caption;
    const type = document.createElement("span");
    type.textContent = CATEGORIES[photo.category]?.name || "활동 기록";
    meta.append(title, type);
    card.append(img, fallback, meta);
    photoGrid.append(card);
  });
}

function renderPlaceholders() {
  const categories = selectedCategory === "all" ? CATEGORY_KEYS : [selectedCategory];
  categories.forEach((categoryKey, index) => {
    const category = CATEGORIES[categoryKey];
    const card = document.createElement("article");
    card.className = `placeholder-card placeholder-${categoryKey}`;

    const number = document.createElement("span");
    number.className = "placeholder-number";
    number.textContent = String(index + 1).padStart(2, "0");
    number.setAttribute("aria-hidden", "true");
    const motif = document.createElement("span");
    motif.className = "placeholder-motif";
    motif.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "placeholder-label";
    label.textContent = category.name;
    const title = document.createElement("strong");
    title.textContent = `${BRANCHES[selectedBranch].shortName}의 다음 장면을 기다립니다`;
    const copy = document.createElement("span");
    copy.className = "placeholder-copy";
    copy.textContent = `assets/gallery/${selectedBranch}/${categoryKey}/ 폴더에 사진을 추가해 주세요.`;
    card.append(number, motif, label, title, copy);
    photoGrid.append(card);
  });
}

function setCategory(category, { focus = false } = {}) {
  if (category !== "all" && !CATEGORIES[category]) return;
  selectedCategory = category;
  categoryButtons.forEach((button) => {
    const active = button.dataset.category === category;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
    if (active && focus) button.focus();
  });
  const activeButton = categoryButtons.find((button) => button.dataset.category === category);
  photoGrid.setAttribute("aria-labelledby", activeButton?.id || "tab-all");
  renderGallery();
}

function updateLightbox(index) {
  const photo = visiblePhotos[index];
  if (!photo) return;
  const caption = photo.caption || humaniseFilename(photo.filename || "");
  lightboxIndex = index;
  lightboxImage.src = photo.src;
  lightboxImage.alt = photo.alt || caption;
  lightboxCaption.textContent = `${caption} · ${CATEGORIES[photo.category]?.name || "활동 기록"} · ${index + 1}/${visiblePhotos.length}`;
  const singlePhoto = visiblePhotos.length < 2;
  lightboxPrevious.disabled = singlePhoto;
  lightboxNext.disabled = singlePhoto;
}

function openLightbox(index, opener) {
  if (!visiblePhotos[index]) return;
  lightboxOpener = opener;
  updateLightbox(index);
  if (!lightbox.open) lightbox.showModal();
}

function moveLightbox(direction) {
  if (visiblePhotos.length < 2) return;
  updateLightbox((lightboxIndex + direction + visiblePhotos.length) % visiblePhotos.length);
}

renderBranchControls();
renderMap();
galleryPanel.inert = true;

branchTriggers().forEach((trigger) => {
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

categoryButtons.forEach((button, index) => {
  button.addEventListener("click", () => setCategory(button.dataset.category));
  button.addEventListener("keydown", (event) => {
    let nextIndex = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % categoryButtons.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + categoryButtons.length) % categoryButtons.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = categoryButtons.length - 1;
    if (nextIndex !== null) {
      event.preventDefault();
      setCategory(categoryButtons[nextIndex].dataset.category, { focus: true });
    }
  });
});

backButton.addEventListener("click", () => clearSelection({ restoreFocus: true }));
photoGrid.addEventListener("click", (event) => {
  const card = event.target.closest(".photo-card:not(.image-missing)");
  if (card) openLightbox(Number(card.dataset.photoIndex), card);
});
document.querySelector(".lightbox-close").addEventListener("click", () => lightbox.close());
lightboxPrevious.addEventListener("click", () => moveLightbox(-1));
lightboxNext.addEventListener("click", () => moveLightbox(1));
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) lightbox.close();
});
lightbox.addEventListener("close", () => {
  lightboxImage.removeAttribute("src");
  lightboxOpener?.focus();
  lightboxOpener = null;
});
document.addEventListener("keydown", (event) => {
  if (!lightbox.open) return;
  if (event.key === "Escape") {
    event.preventDefault();
    lightbox.close();
    return;
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    moveLightbox(-1);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    moveLightbox(1);
  }
});

await loadManifest();
