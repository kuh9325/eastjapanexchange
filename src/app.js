import {
  BRANCHES,
  BRANCH_KEYS,
  CATEGORIES,
  CATEGORY_KEYS,
  COUNTRY_CONTEXT,
  MAP_ATTRIBUTION,
  MAP_DISPLAY_VIEWBOX,
  MAP_FOCUS_VIEWBOX,
  MAP_LANDMARKS,
  MAP_VIEWBOX,
  municipalityNames
} from "../data/regions.js";
import { EXHIBITION_CONTENT } from "../data/exhibition-content.js";
import {
  DEPARTMENT_LABELS,
  localizedMetadataLabel,
  ZONE_LABELS
} from "../data/gallery-metadata.js";
import { formatCopy, UI_COPY } from "../data/ui-copy.js";
import {
  EMPTY_FIXTURE_CONTENT,
  EMPTY_FIXTURE_MANIFEST,
  FULL_FIXTURE_CONTENT,
  FULL_FIXTURE_MANIFEST
} from "../data/fixture-content.js";
import {
  createDialogController,
  initializeDebugMode,
  registerOfflineWorker,
  replaceChildren,
  setRegionInteractive,
  setRuntimeStatus
} from "./compatibility.js";
import { initializeIntro } from "./intro.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const query = new URLSearchParams(window.location.search);
const fixtureMode = query.get("fixture");
const previewMode = query.get("intro") === "preview";
const debugMode = query.get("debug") === "1";
let currentLanguage = query.get("lang") === "ja" ? "ja" : "ko";

const app = document.querySelector("#app");
const stage = document.querySelector(".stage");
const branchSwitcher = document.querySelector("#branch-switcher");
const koreaMap = document.querySelector(".korea-map");
const countryContextLayer = document.querySelector("#country-context-layer");
const branchMapLayer = document.querySelector("#branch-map-layer");
const mapLandmarkLayer = document.querySelector("#map-landmark-layer");
const mapLegend = document.querySelector("#map-legend");
const galleryPanel = document.querySelector(".gallery-panel");
const galleryHeader = document.querySelector(".gallery-sticky-header");
const galleryTitle = document.querySelector("#gallery-title");
const galleryDescription = document.querySelector("#gallery-description");
const branchSlogan = document.querySelector("#branch-slogan");
const introductionDetails = document.querySelector("#branch-introduction-details");
const introductionToggle = document.querySelector("#gallery-intro-toggle");
const introductionToggleLabel = document.querySelector("#gallery-intro-toggle-label");
const hallCard = document.querySelector("#hall-card");
const hallPhotoFrame = document.querySelector("#hall-photo-frame");
const hallCaption = document.querySelector("#hall-caption");
const meetingSection = document.querySelector("#meeting-section");
const meetingContent = document.querySelector("#meeting-content");
const photoGrid = document.querySelector("#photo-grid");
const photoCount = document.querySelector("#photo-count");
const galleryStatus = document.querySelector("#gallery-status");
const categoryButtons = Array.from(document.querySelectorAll("[data-category]"));
const gallerySortControls = document.querySelector(".gallery-sort-controls");
const gallerySortButtons = Array.from(document.querySelectorAll("[data-gallery-sort]"));
const backButton = document.querySelector(".back-button");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxError = document.querySelector("#lightbox-error");
const lightboxCaption = document.querySelector("#lightbox-caption");
const lightboxPrevious = document.querySelector(".lightbox-nav.previous");
const lightboxNext = document.querySelector(".lightbox-nav.next");
const lightboxClose = document.querySelector(".lightbox-close");
const mapAttribution = document.querySelector("#map-attribution");
const languageButtons = Array.from(document.querySelectorAll("[data-language]"));
const panelEntry = document.querySelector("#panel-entry");
const panelExhibition = document.querySelector("#panel-exhibition");
const panelClose = document.querySelector("#panel-close");
const panelTrack = document.querySelector("#panel-track");
const panelSlides = Array.from(document.querySelectorAll(".panel-slide"));
const panelSheets = Array.from(document.querySelectorAll(".panel-slide > .panel-sheet"));
const panelCanvases = Array.from(document.querySelectorAll(".panel-canvas"));
const panelCaptions = Array.from(document.querySelectorAll(".panel-slide > .panel-sheet > figcaption"));
const panelPrevious = document.querySelector("#panel-previous");
const panelNext = document.querySelector("#panel-next");
const panelPagination = document.querySelector("#panel-pagination");
const panelPageButtons = Array.from(document.querySelectorAll("[data-panel-go]"));
const panelLanguageButtons = Array.from(document.querySelectorAll("[data-panel-language]"));
const panelCounter = document.querySelector("#panel-counter");
const panelAchievementButtons = Array.from(document.querySelectorAll(".panel-achievement-list button"));
const panelAwardDialog = document.querySelector("#panel-award-dialog");
const panelAwardDialogClose = document.querySelector("#panel-award-dialog-close");
const panelAwardDialogKicker = document.querySelector("#panel-award-dialog-kicker");
const panelAwardDialogTitle = document.querySelector("#panel-award-dialog-title");
const panelAwardDialogPlace = document.querySelector("#panel-award-dialog-place");
const panelAwardDialogTranslation = document.querySelector("#panel-award-dialog-translation");

let manifest = { photos: [] };
let content = EXHIBITION_CONTENT;
let manifestAvailable = true;
let selectedBranch = null;
let selectedCategory = "all";
let gallerySort = "name";
let randomizedPhotoRanks = new Map();
let visiblePhotos = [];
let isIntroductionCollapsed = false;
let lightboxItems = [];
let lightboxIndex = 0;
let lightboxOpener = null;
let galleryPointerDrag = null;
let galleryDragClickBlockUntil = 0;
let panelIndex = 0;
let panelOpener = null;
let panelScrollFrame = 0;
let panelPointerDrag = null;
let panelResizeTimer = 0;
let panelControlsLayoutTimer = 0;
let panelTapBlockUntil = 0;
let panelAwardOpener = null;

const GALLERY_DRAG_THRESHOLD = 8;
const PANEL_CANVAS_WIDTH = 900;
const PANEL_CANVAS_HEIGHT = 1246;
const STACKED_LAYOUT_QUERY = "(max-width: 900px), (orientation: portrait)";

const copy = () => UI_COPY[currentLanguage];
const localizedValue = (source, key) => {
  if (!source) return "";
  if (currentLanguage === "ja") return source[`${key}Ja`] || source[key] || "";
  return source[key] || "";
};
const branchName = (branch, short = false) => {
  const key = short ? "shortName" : "name";
  return currentLanguage === "ja" ? branch[`${key}Ja`] || branch[key] : branch[key];
};
const categoryName = (category) => currentLanguage === "ja" ? category.nameJa || category.name : category.name;
const usesStackedLayout = () => window.matchMedia(STACKED_LAYOUT_QUERY).matches;

function galleryMetadataLabels(photo) {
  const zone = localizedMetadataLabel(ZONE_LABELS[photo.zone], currentLanguage)
    || branchName(BRANCHES[photo.branch], true);
  const department = localizedMetadataLabel(
    DEPARTMENT_LABELS[photo.department] || DEPARTMENT_LABELS.youth,
    currentLanguage
  );
  const activity = CATEGORIES[photo.category]
    ? categoryName(CATEGORIES[photo.category])
    : copy().activityRecord;
  return [zone, department, activity].filter(Boolean);
}

function galleryPhotoItem(source) {
  const metadataLabels = galleryMetadataLabels(source);
  const metadataText = metadataLabels.join(" | ");
  return {
    src: source.full || source.src || source.photo,
    alt: formatCopy(copy().photoMetadataAlt, { metadata: metadataLabels.join(" ") }),
    caption: metadataText,
    detail: "",
    metadataLabels
  };
}

function reshufflePhotoRanks() {
  const shuffled = manifest.photos.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  randomizedPhotoRanks = new Map(shuffled.map((photo, index) => [photo.id, index]));
}

function orderGalleryPhotos(photos) {
  const ordered = photos.slice();
  if (gallerySort === "random") {
    if (randomizedPhotoRanks.size !== manifest.photos.length) reshufflePhotoRanks();
    return ordered.sort((left, right) => (
      (randomizedPhotoRanks.get(left.id) ?? Number.MAX_SAFE_INTEGER)
      - (randomizedPhotoRanks.get(right.id) ?? Number.MAX_SAFE_INTEGER)
    ));
  }
  return ordered.sort((left, right) => String(left.filename || left.id).localeCompare(
    String(right.filename || right.id),
    "ko",
    { numeric: true, sensitivity: "base" }
  ));
}

function setGallerySort(sort, options) {
  if (!new Set(["random", "name"]).has(sort)) return;
  const config = options || {};
  if (sort === "random" && (gallerySort !== "random" || config.reshuffle)) reshufflePhotoRanks();
  gallerySort = sort;
  gallerySortButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.gallerySort === gallerySort));
  });
  if (selectedBranch) renderGallery();
}

const svgElement = (name, attributes) => {
  const element = document.createElementNS(SVG_NS, name);
  const source = attributes || {};
  Object.keys(source).forEach((key) => element.setAttribute(key, String(source[key])));
  return element;
};

function renderBranchControls() {
  Object.keys(BRANCHES).forEach((branchKey) => {
    const branch = BRANCHES[branchKey];
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "branch-chip";
    chip.dataset.branch = branchKey;
    chip.setAttribute("aria-pressed", "false");
    chip.setAttribute("aria-label", formatCopy(copy().selectBranch, { branch: branchName(branch) }));

    const dot = document.createElement("span");
    dot.className = "branch-dot";
    dot.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "branch-chip-label";
    label.textContent = branchName(branch);
    chip.appendChild(dot);
    chip.appendChild(label);
    branchSwitcher.appendChild(chip);

    const legend = document.createElement("span");
    legend.className = `legend-item legend-${branchKey}`;
    legend.textContent = branchName(branch, true);
    mapLegend.appendChild(legend);
  });
}

function appendCountryContext(layer, includeMetadata) {
  COUNTRY_CONTEXT.forEach((province) => {
    const attributes = {
      class: "country-province",
      d: province.path,
      "fill-rule": province.fillRule || "evenodd"
    };
    if (includeMetadata && debugMode) attributes["data-debug-province"] = province.name;
    layer.appendChild(svgElement("path", attributes));
  });
}

function renderCountryContext() {
  setMapViewport(false);
  appendCountryContext(countryContextLayer, true);
  replaceChildren(mapLandmarkLayer, []);
  appendMapLandmarks(mapLandmarkLayer);
  mapAttribution.textContent = copy().mapAttribution || MAP_ATTRIBUTION;
}

function appendMapLandmarks(layer) {
  MAP_LANDMARKS.forEach((landmark) => {
    const group = svgElement("g", {
      class: `map-landmark map-landmark-${landmark.id}`,
      transform: `translate(${landmark.point[0]} ${landmark.point[1]})`
    });
    const dot = svgElement("circle", { class: "map-landmark-dot", r: 1.6 });
    const title = svgElement("title");
    title.textContent = currentLanguage === "ja" && landmark.id === "dokdo" ? "独島" : landmark.name;
    dot.appendChild(title);
    group.appendChild(dot);
    layer.appendChild(group);
  });
}

function setMapViewport(focused) {
  const viewBox = focused ? MAP_FOCUS_VIEWBOX : MAP_DISPLAY_VIEWBOX;
  koreaMap.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
}

function renderMap() {
  Object.keys(BRANCHES).forEach((branchKey) => {
    const branch = BRANCHES[branchKey];
    const branchCopy = content[branchKey] || {};
    const accessibleDescription = localizedValue(branchCopy, "introduction")
      || (currentLanguage === "ja" ? branch.descriptionJa : branch.description);
    const name = branchName(branch);
    const region = svgElement("g", {
      class: `branch-region branch-${branchKey}`,
      "data-branch": branchKey,
      tabindex: "0",
      role: "button",
      "aria-pressed": "false",
      "aria-label": `${formatCopy(copy().selectBranch, { branch: name })}. ${accessibleDescription}`
    });
    const title = svgElement("title");
    title.textContent = `${name}. ${accessibleDescription}`;
    region.appendChild(title);

    const clipId = `branch-clip-${branchKey}`;
    const clipPath = svgElement("clipPath", { id: clipId, clipPathUnits: "userSpaceOnUse" });
    branch.fillPaths.forEach((pathData) => {
      clipPath.appendChild(svgElement("path", { d: pathData, "fill-rule": "evenodd", "clip-rule": "evenodd" }));
    });
    region.appendChild(clipPath);

    const zoomViewport = svgElement("g", {
      class: "branch-zoom-viewport",
      "aria-hidden": "true",
      "clip-path": `url(#${clipId})`
    });
    const zoomLayer = svgElement("g", { class: "branch-zoom-layer" });
    const fills = svgElement("g", { class: "branch-fills" });
    branch.fillPaths.forEach((pathData) => {
      fills.appendChild(svgElement("path", { class: "branch-fill", d: pathData, "fill-rule": "evenodd" }));
    });
    zoomLayer.appendChild(fills);

    const municipalities = svgElement("g", {
      class: "municipalities"
    });
    const hitAreas = svgElement("g", {
      class: "branch-hit-areas",
      "aria-hidden": "true",
      "clip-path": `url(#${clipId})`
    });
    branch.municipalities.forEach((municipality) => {
      const pathAttributes = {
        d: municipality.path,
        "fill-rule": municipality.fillRule || "evenodd"
      };
      if (debugMode) pathAttributes["data-debug-city"] = municipality.name;
      municipalities.appendChild(svgElement("path", pathAttributes));
      hitAreas.appendChild(svgElement("path", {
        class: "branch-hit-area",
        d: municipality.path,
        "fill-rule": municipality.fillRule || "evenodd",
        "vector-effect": "non-scaling-stroke"
      }));
    });
    zoomLayer.appendChild(municipalities);
    zoomViewport.appendChild(zoomLayer);
    region.appendChild(zoomViewport);

    const outlines = svgElement("g", {
      class: "branch-outlines",
      "aria-hidden": "true"
    });
    branch.outlinePaths.forEach((pathData) => {
      outlines.appendChild(svgElement("path", { class: "branch-halo", d: pathData, "fill-rule": "evenodd" }));
    });
    region.appendChild(outlines);
    region.appendChild(hitAreas);

    const label = svgElement("text", { class: "branch-label", x: branch.label[0], y: branch.label[1], "aria-hidden": "true" });
    label.textContent = name;
    region.appendChild(label);
    branchMapLayer.appendChild(region);
  });
  if (debugMode) {
    setRuntimeStatus("mapData", BRANCH_KEYS.map((key) => `${BRANCHES[key].name}: ${municipalityNames(key).join(", ")}`).join(" / "));
  }
}

async function loadManifest() {
  if (fixtureMode === "empty") {
    manifest = EMPTY_FIXTURE_MANIFEST;
    content = EMPTY_FIXTURE_CONTENT;
    setRuntimeStatus("manifest", "empty fixture · 사진 0장");
    return;
  }
  if (fixtureMode === "full") {
    manifest = FULL_FIXTURE_MANIFEST;
    content = FULL_FIXTURE_CONTENT;
    setRuntimeStatus("manifest", `full fixture · 사진 ${manifest.photos.length}장`);
    return;
  }
  try {
    const response = await fetch("./assets/gallery-manifest.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
    const result = await response.json();
    if (!Array.isArray(result.photos)) throw new TypeError("manifest photos가 배열이 아닙니다.");
    manifest = {
      ...result,
      photos: result.photos.filter((photo) => (
        BRANCH_KEYS.indexOf(photo.branch) >= 0
        && CATEGORY_KEYS.indexOf(photo.category) >= 0
        && typeof photo.src === "string"
      ))
    };
    setRuntimeStatus("manifest", `성공 · 사진 ${manifest.photos.length}장`);
  } catch (error) {
    manifestAvailable = false;
    manifest = { photos: [] };
    setRuntimeStatus("manifest", `실패 · ${error.message}`);
    console.info("사진 manifest를 읽지 못해 안내 카드를 표시합니다.", error.message);
  }
}

function branchTriggers() {
  return Array.from(document.querySelectorAll("[data-branch]"));
}

const SELECTED_BRANCH_SCALE = 1.035;

function setBranchMapTransform(region, active) {
  if (!region || !region.classList.contains("branch-region")) return;
  const zoomLayer = region.querySelector(".branch-zoom-layer");
  region.removeAttribute("transform");
  if (!zoomLayer) return;
  if (!active) {
    zoomLayer.removeAttribute("transform");
    return;
  }
  const branch = BRANCHES[region.dataset.branch];
  if (!branch) return;
  const centerX = branch.label[0];
  const centerY = branch.label[1];
  zoomLayer.setAttribute(
    "transform",
    `translate(${centerX} ${centerY}) scale(${SELECTED_BRANCH_SCALE}) translate(${-centerX} ${-centerY})`
  );
}

function photoItem(source, fallbackCaption, detail) {
  const caption = localizedValue(source, "caption") || fallbackCaption;
  return {
    src: source.full || source.src || source.photo,
    alt: localizedValue(source, "alt") || caption,
    caption,
    detail: detail || ""
  };
}

function imageWithFallback(source, alt, className, onLoad, onError) {
  const img = document.createElement("img");
  img.className = className || "";
  img.src = source;
  img.alt = alt;
  img.draggable = false;
  img.loading = "lazy";
  img.decoding = "async";
  img.addEventListener("load", () => {
    if (typeof onLoad === "function") onLoad(img);
  }, { once: true });
  img.addEventListener("error", () => {
    img.hidden = true;
    if (typeof onError === "function") onError(img);
  }, { once: true });
  return img;
}

function renderHall(branchKey) {
  const hall = content[branchKey] && content[branchKey].hallPhoto;
  replaceChildren(hallPhotoFrame, []);
  hallCard.classList.remove("has-image");
  hallCard.setAttribute("aria-disabled", "true");
  hallCard.onclick = null;
  const hasHall = Boolean(hall && (hall.src || hall.photo));
  hallCard.dataset.available = String(hasHall);
  hallCard.hidden = isIntroductionCollapsed || !hasHall;
  if (!hasHall) return;

  const branch = BRANCHES[branchKey];
  const item = photoItem(
    hall,
    formatCopy(copy().hallFallback, { branch: branchName(branch) }),
    copy().hallCaption
  );
  hallCaption.textContent = item.caption;
  hallCard.setAttribute("aria-label", formatCopy(copy().openPhoto, { caption: item.caption }));

  const placeholder = document.createElement("span");
  placeholder.className = "hall-placeholder";
  placeholder.textContent = copy().hallPlaceholder;
  hallPhotoFrame.appendChild(placeholder);

  const image = imageWithFallback(item.src, item.alt, "hall-photo", () => {
    hallCard.classList.add("has-image");
    hallCard.removeAttribute("aria-disabled");
  });
  if (hall.objectPosition) image.style.objectPosition = hall.objectPosition;
  hallPhotoFrame.appendChild(image);
  hallCard.onclick = () => {
    if (hallCard.classList.contains("has-image")) openLightbox([item], 0, hallCard);
  };
}

function updateIntroductionToggle() {
  const label = isIntroductionCollapsed
    ? copy().expandIntroduction
    : copy().collapseIntroduction;
  introductionToggleLabel.textContent = label;
  introductionToggle.setAttribute("aria-label", label);
  introductionToggle.setAttribute("aria-expanded", String(!isIntroductionCollapsed));
}

function setIntroductionCollapsed(collapsed) {
  isIntroductionCollapsed = Boolean(collapsed);
  galleryHeader.classList.toggle("is-collapsed", isIntroductionCollapsed);
  introductionDetails.hidden = isIntroductionCollapsed;
  hallCard.hidden = isIntroductionCollapsed || hallCard.dataset.available !== "true";
  updateIntroductionToggle();
}

function renderMeeting(branchKey) {
  const meeting = content[branchKey] && content[branchKey].meetingPhoto;
  replaceChildren(meetingContent, []);
  meetingSection.hidden = !meeting || (!meeting.src && !meeting.photo);
  if (!meeting || (!meeting.src && !meeting.photo)) return;

  const branch = BRANCHES[branchKey];
  const item = photoItem(
    meeting,
    formatCopy(copy().meetingFallback, { branch: branchName(branch) }),
    copy().meetingTitle
  );
  const card = document.createElement("button");
  card.type = "button";
  card.className = "meeting-card";
  card.setAttribute("aria-label", formatCopy(copy().openPhoto, { caption: item.caption }));
  const image = imageWithFallback(item.src, item.alt, "meeting-photo", () => card.classList.add("has-image"), () => {
    meetingSection.hidden = true;
  });
  const caption = document.createElement("span");
  caption.className = "meeting-caption";
  caption.textContent = item.caption;
  card.appendChild(image);
  card.appendChild(caption);
  card.addEventListener("click", () => {
    if (card.classList.contains("has-image")) openLightbox([item], 0, card);
  });
  meetingContent.appendChild(card);
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
    label.textContent = categoryName(category);
    const title = document.createElement("strong");
    title.textContent = formatCopy(copy().nextScene, { branch: branchName(BRANCHES[selectedBranch], true) });
    const placeholderCopy = document.createElement("span");
    placeholderCopy.className = "placeholder-copy";
    placeholderCopy.textContent = copy().photoSoon;
    card.appendChild(number);
    card.appendChild(motif);
    card.appendChild(label);
    card.appendChild(title);
    card.appendChild(placeholderCopy);
    photoGrid.appendChild(card);
  });
}

function renderGallery() {
  if (!selectedBranch) return;
  visiblePhotos = orderGalleryPhotos(manifest.photos.filter((photo) => (
    photo.branch === selectedBranch
    && (selectedCategory === "all" || photo.category === selectedCategory)
  )));
  replaceChildren(photoGrid, []);
  photoCount.textContent = formatCopy(copy().photoCount, { count: visiblePhotos.length });
  galleryStatus.textContent = manifestAvailable
    ? copy().galleryReady
    : copy().galleryUnavailable;
  if (!visiblePhotos.length) {
    renderPlaceholders();
    return;
  }

  visiblePhotos.forEach((photo, index) => {
    const item = galleryPhotoItem(photo);
    const card = document.createElement("button");
    card.type = "button";
    card.className = `photo-card ${index % 7 === 0 ? "wide" : ""} ${index % 9 === 5 ? "tall" : ""}`.trim();
    card.dataset.photoIndex = String(index);
    card.setAttribute("aria-label", formatCopy(copy().openPhoto, { caption: item.caption }));
    const img = imageWithFallback(photo.thumbnail || photo.src, item.alt, "", null, () => {
      card.classList.add("image-missing");
      card.setAttribute("aria-disabled", "true");
      card.setAttribute("aria-label", formatCopy(copy().missingPhoto, { caption: item.caption }));
    });
    if (index < 2) img.loading = "eager";
    const fallback = document.createElement("span");
    fallback.className = "image-fallback";
    fallback.textContent = copy().imagePreparing;
    const meta = document.createElement("span");
    meta.className = "photo-meta";
    meta.setAttribute("aria-hidden", "true");
    item.metadataLabels.forEach((label) => {
      const tag = document.createElement("span");
      tag.className = "photo-meta-tag";
      tag.textContent = label;
      meta.appendChild(tag);
    });
    card.appendChild(img);
    card.appendChild(fallback);
    card.appendChild(meta);
    photoGrid.appendChild(card);
  });
}

function setCategory(category, options) {
  const config = options || {};
  if (category !== "all" && !CATEGORIES[category]) return;
  selectedCategory = category;
  categoryButtons.forEach((button) => {
    const active = button.dataset.category === category;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
    if (active && config.focus) button.focus();
  });
  const activeButton = categoryButtons.find((button) => button.dataset.category === category);
  photoGrid.setAttribute("aria-labelledby", activeButton ? activeButton.id : "tab-all");
  renderGallery();
}

function selectBranch(branchKey, options) {
  const config = options || {};
  if (!BRANCHES[branchKey]) return;
  selectedBranch = branchKey;
  setMapViewport(true);
  app.dataset.branch = branchKey;
  app.classList.add("has-selection");
  setRegionInteractive(galleryPanel, true);
  branchTriggers().forEach((trigger) => {
    const active = trigger.dataset.branch === branchKey;
    trigger.classList.toggle("active", active);
    trigger.classList.toggle("selected", active && trigger.classList.contains("branch-region"));
    setBranchMapTransform(trigger, active);
    trigger.setAttribute("aria-pressed", String(active));
  });
  const selectedMapRegion = branchMapLayer.querySelector(`.branch-region[data-branch="${branchKey}"]`);
  if (selectedMapRegion) branchMapLayer.appendChild(selectedMapRegion);

  const branch = BRANCHES[branchKey];
  const branchContent = content[branchKey] || {};
  galleryTitle.textContent = branchName(branch);
  const slogan = localizedValue(branchContent, "slogan");
  const introduction = localizedValue(branchContent, "introduction");
  branchSlogan.textContent = slogan;
  branchSlogan.hidden = !slogan;
  galleryDescription.textContent = introduction;
  galleryDescription.hidden = !introduction;
  renderHall(branchKey);
  renderMeeting(branchKey);
  setCategory("all");
  galleryPanel.scrollTop = 0;

  if (config.scroll !== false && usesStackedLayout()) {
    window.requestAnimationFrame(() => galleryPanel.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
}

function clearSelection(options) {
  const config = options || {};
  const previousBranch = selectedBranch;
  selectedBranch = null;
  setMapViewport(false);
  delete app.dataset.branch;
  app.classList.remove("has-selection");
  setRegionInteractive(galleryPanel, false);
  branchTriggers().forEach((trigger) => {
    trigger.classList.remove("active", "selected");
    setBranchMapTransform(trigger, false);
    trigger.setAttribute("aria-pressed", "false");
  });
  BRANCH_KEYS.forEach((branchKey) => {
    const mapRegion = branchMapLayer.querySelector(`.branch-region[data-branch="${branchKey}"]`);
    if (mapRegion) branchMapLayer.appendChild(mapRegion);
  });
  if (config.restoreFocus && previousBranch) {
    const trigger = document.querySelector(`.branch-chip[data-branch="${previousBranch}"]`);
    if (trigger) trigger.focus();
  }
}

function updatePanelNavigation() {
  const ui = copy();
  panelPrevious.disabled = panelIndex === 0;
  panelNext.disabled = panelIndex === panelSlides.length - 1;
  panelCounter.textContent = formatCopy(ui.panelPageLabel, {
    current: panelIndex + 1,
    total: panelSlides.length
  });
  panelPageButtons.forEach((button, index) => {
    const active = index === panelIndex;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
}

function usesThreePanelLayout() {
  return window.matchMedia("(min-width: 901px) and (orientation: landscape)").matches;
}

function setPanelControlsHidden(hidden) {
  panelExhibition.classList.toggle("panel-controls-hidden", Boolean(hidden));
  window.clearTimeout(panelControlsLayoutTimer);
  window.requestAnimationFrame(() => window.requestAnimationFrame(updatePanelLayout));
  panelControlsLayoutTimer = window.setTimeout(updatePanelLayout, 280);
}

function updatePanelLayout() {
  const landscape = window.matchMedia("(orientation: landscape)").matches;
  const threePanelLayout = usesThreePanelLayout();
  panelTrack.classList.remove("is-row-contained");
  panelSlides.forEach((slide, index) => {
    const sheet = panelSheets[index];
    const canvas = panelCanvases[index];
    if (!sheet || !canvas) return;
    const slideStyle = window.getComputedStyle(slide);
    const horizontalInset = parseFloat(slideStyle.paddingLeft || "0") + parseFloat(slideStyle.paddingRight || "0");
    const verticalInset = parseFloat(slideStyle.paddingTop || "0") + parseFloat(slideStyle.paddingBottom || "0");
    let availableWidth;
    let availableHeight;
    if (threePanelLayout) {
      availableHeight = Math.max(240, panelTrack.clientHeight - verticalInset);
      const heightScale = availableHeight / PANEL_CANVAS_HEIGHT;
      const slideWidth = PANEL_CANVAS_WIDTH * heightScale + horizontalInset;
      slide.style.flexBasis = `${slideWidth}px`;
      slide.style.width = `${slideWidth}px`;
      slide.style.minWidth = `${slideWidth}px`;
      availableWidth = slideWidth - horizontalInset;
    } else {
      slide.style.removeProperty("flex-basis");
      slide.style.removeProperty("width");
      slide.style.removeProperty("min-width");
      availableWidth = Math.max(280, slide.clientWidth - (landscape ? 164 : horizontalInset));
      availableHeight = Math.max(360, slide.clientHeight - (landscape ? verticalInset : 26));
    }
    const widthScale = availableWidth / PANEL_CANVAS_WIDTH;
    const heightScale = availableHeight / PANEL_CANVAS_HEIGHT;
    const scale = landscape ? Math.min(widthScale, heightScale) : widthScale;
    sheet.style.width = `${PANEL_CANVAS_WIDTH * scale}px`;
    sheet.style.height = `${PANEL_CANVAS_HEIGHT * scale}px`;
    canvas.style.transform = `scale(${scale})`;
  });
  if (threePanelLayout) {
    panelTrack.classList.toggle("is-row-contained", panelTrack.scrollWidth <= panelTrack.clientWidth + 1);
  }
}

function goToPanel(index, options) {
  const config = options || {};
  panelIndex = Math.max(0, Math.min(panelSlides.length - 1, index));
  const maxScroll = Math.max(0, panelTrack.scrollWidth - panelTrack.clientWidth);
  const lastIndex = Math.max(1, panelSlides.length - 1);
  const left = maxScroll * (panelIndex / lastIndex);
  if (config.instant) {
    panelTrack.scrollLeft = left;
  } else {
    try {
      panelTrack.scrollTo({ left, behavior: "smooth" });
    } catch {
      panelTrack.scrollLeft = left;
    }
  }
  updatePanelNavigation();
}

function openPanelViewer(opener) {
  panelOpener = opener || document.activeElement;
  setPanelControlsHidden(false);
  stage.hidden = true;
  panelExhibition.hidden = false;
  panelExhibition.setAttribute("aria-hidden", "false");
  app.classList.add("panel-mode");
  document.body.classList.add("panel-lock");
  window.requestAnimationFrame(() => {
    updatePanelLayout();
    goToPanel(panelIndex, { instant: true });
    panelClose.focus();
  });
}

function closePanelViewer(options) {
  if (panelExhibition.hidden) return;
  const config = options || {};
  if (awardDialogController && awardDialogController.isOpen()) awardDialogController.close();
  setPanelControlsHidden(false);
  panelExhibition.hidden = true;
  panelExhibition.setAttribute("aria-hidden", "true");
  stage.hidden = false;
  app.classList.remove("panel-mode");
  document.body.classList.remove("panel-lock");
  if (config.restoreFocus !== false && panelOpener) panelOpener.focus();
  panelOpener = null;
}

function syncPanelIndexFromScroll() {
  panelScrollFrame = 0;
  const maxScroll = Math.max(0, panelTrack.scrollWidth - panelTrack.clientWidth);
  if (!maxScroll) return;
  const lastIndex = panelSlides.length - 1;
  const nextIndex = Math.max(0, Math.min(lastIndex, Math.round((panelTrack.scrollLeft / maxScroll) * lastIndex)));
  if (nextIndex !== panelIndex) {
    panelIndex = nextIndex;
    updatePanelNavigation();
  }
}

function bindPanelPointerDrag() {
  panelTrack.addEventListener("dragstart", (event) => event.preventDefault());
  panelTrack.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    panelPointerDrag = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      scrollLeft: panelTrack.scrollLeft,
      moved: false
    };
  });
  panelTrack.addEventListener("pointermove", (event) => {
    if (!panelPointerDrag || event.pointerId !== panelPointerDrag.pointerId) return;
    const deltaX = event.clientX - panelPointerDrag.startX;
    if (!panelPointerDrag.moved && Math.abs(deltaX) < GALLERY_DRAG_THRESHOLD) return;
    if (panelPointerDrag.pointerType === "touch") {
      panelPointerDrag.moved = true;
      return;
    }
    if (!panelPointerDrag.moved) {
      panelPointerDrag.moved = true;
      panelTrack.classList.add("is-pointer-dragging");
      try {
        panelTrack.setPointerCapture(event.pointerId);
      } catch (error) {
        setRuntimeStatus("lastError", `panel pointer capture fallback: ${error.message}`);
      }
    }
    event.preventDefault();
    panelTrack.scrollLeft = panelPointerDrag.scrollLeft - deltaX;
  }, { passive: false });
  const finishPanelDrag = (event) => {
    if (!panelPointerDrag || (event && event.pointerId !== panelPointerDrag.pointerId)) return;
    if (panelPointerDrag.moved) panelTapBlockUntil = Date.now() + 350;
    const shouldSnap = panelPointerDrag.pointerType !== "touch";
    panelPointerDrag = null;
    panelTrack.classList.remove("is-pointer-dragging");
    if (shouldSnap) {
      const maxScroll = Math.max(0, panelTrack.scrollWidth - panelTrack.clientWidth);
      const lastIndex = panelSlides.length - 1;
      const nextIndex = maxScroll ? Math.round((panelTrack.scrollLeft / maxScroll) * lastIndex) : 0;
      goToPanel(nextIndex);
    }
  };
  window.addEventListener("pointerup", finishPanelDrag);
  window.addEventListener("pointercancel", finishPanelDrag);
  window.addEventListener("blur", () => finishPanelDrag());
}

function applyLanguage(language) {
  currentLanguage = language === "ja" ? "ja" : "ko";
  const ui = copy();
  document.documentElement.lang = currentLanguage;
  document.title = ui.documentTitle;
  document.querySelector("#meta-description").setAttribute("content", ui.metaDescription);
  document.querySelector("#skip-link").textContent = ui.skipLink;
  document.querySelector(".language-tabs").setAttribute("aria-label", ui.languageLabel);
  languageButtons.forEach((button) => {
    const active = button.dataset.language === currentLanguage;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  panelLanguageButtons.forEach((button) => {
    const active = button.dataset.panelLanguage === currentLanguage;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });

  document.querySelector(".map-panel").setAttribute("aria-label", ui.mapPanelLabel);
  document.querySelector("#hero-title").textContent = ui.heroTitle;
  document.querySelector("#hero-subtitle").textContent = ui.heroSubtitle;
  panelEntry.setAttribute("aria-label", ui.panelEntryLabel);
  document.querySelector("#panel-entry-title").textContent = ui.panelEntryTitle;
  document.querySelector("#panel-entry-description").textContent = ui.panelEntryDescription;
  branchSwitcher.setAttribute("aria-label", ui.branchSwitcherLabel);
  document.querySelector("#map-title").textContent = ui.mapTitle;
  document.querySelector("#map-desc").textContent = ui.mapDescription;
  mapLegend.setAttribute("aria-label", ui.mapLegend);
  document.querySelector("#intro-replay").setAttribute("aria-label", ui.replayLabel);
  document.querySelector("#intro-replay").textContent = ui.replay;
  document.querySelector("#footer-label").textContent = ui.footer;
  document.querySelector("#map-info-label").textContent = ui.mapInfo;
  mapAttribution.textContent = ui.mapAttribution;
  galleryPanel.setAttribute("aria-label", ui.galleryPanelLabel);
  backButton.setAttribute("aria-label", ui.backLabel);
  document.querySelector("#back-button-label").textContent = ui.back;
  updateIntroductionToggle();
  document.querySelector("#meeting-section-title").textContent = ui.meetingTitle;
  document.querySelector("#activity-section-title").textContent = ui.activityTitle;
  document.querySelector(".category-tabs").setAttribute("aria-label", ui.categoryLabel);
  gallerySortControls.setAttribute("aria-label", ui.photoOrderLabel);
  gallerySortButtons.forEach((button) => {
    button.textContent = button.dataset.gallerySort === "random" ? ui.randomOrder : ui.nameOrder;
  });
  categoryButtons.forEach((button) => {
    const category = button.dataset.category;
    button.textContent = category === "all" ? ui.all : categoryName(CATEGORIES[category]);
  });
  lightboxClose.setAttribute("aria-label", ui.closePhoto);
  lightboxPrevious.setAttribute("aria-label", ui.previousPhoto);
  lightboxNext.setAttribute("aria-label", ui.nextPhoto);
  lightboxError.textContent = ui.lightboxError;
  panelClose.setAttribute("aria-label", ui.panelCloseLabel);
  document.querySelector("#panel-close-label").textContent = ui.panelClose;
  document.querySelector("#panel-viewer-kicker").textContent = ui.panelViewerKicker;
  document.querySelector("#panel-viewer-title").textContent = ui.panelViewerTitle;
  document.querySelector("#panel-viewer-description").textContent = ui.panelViewerDescription;
  document.querySelector(".panel-language-tabs").setAttribute("aria-label", ui.languageLabel);
  panelPrevious.setAttribute("aria-label", ui.panelPrevious);
  panelNext.setAttribute("aria-label", ui.panelNext);
  panelPagination.setAttribute("aria-label", ui.panelSelectionLabel);
  document.querySelector("#panel-hint").textContent = ui.panelHint;
  panelCaptions.forEach((caption, index) => {
    caption.textContent = ui[`panelTitle${index + 1}`];
  });
  panelPageButtons.forEach((button, index) => {
    button.setAttribute("aria-label", formatCopy(ui.panelGoTo, { number: index + 1 }));
  });
  if (panelAwardDialogKicker) panelAwardDialogKicker.textContent = ui.panelAwardDetail;
  if (panelAwardDialogClose) panelAwardDialogClose.setAttribute("aria-label", ui.panelAwardClose);
  panelAchievementButtons.forEach((button) => {
    button.setAttribute("aria-label", formatCopy(ui.panelAwardOpen, {
      title: button.querySelector("strong")?.textContent || ""
    }));
  });
  updatePanelNavigation();

  BRANCH_KEYS.forEach((branchKey) => {
    const branch = BRANCHES[branchKey];
    const name = branchName(branch);
    const branchCopy = content[branchKey] || {};
    const description = localizedValue(branchCopy, "introduction")
      || (currentLanguage === "ja" ? branch.descriptionJa : branch.description);
    const ariaLabel = `${formatCopy(ui.selectBranch, { branch: name })}. ${description}`;
    const chip = branchSwitcher.querySelector(`[data-branch="${branchKey}"]`);
    if (chip) {
      chip.setAttribute("aria-label", formatCopy(ui.selectBranch, { branch: name }));
      chip.querySelector(".branch-chip-label").textContent = name;
    }
    const legend = mapLegend.querySelector(`.legend-${branchKey}`);
    if (legend) legend.textContent = branchName(branch, true);
    const region = branchMapLayer.querySelector(`[data-branch="${branchKey}"]`);
    if (region) {
      region.setAttribute("aria-label", ariaLabel);
      region.querySelector("title").textContent = `${name}. ${description}`;
      region.querySelector(".branch-label").textContent = name;
    }
  });
  mapLandmarkLayer.querySelectorAll(".map-landmark-dokdo title").forEach((title) => {
    title.textContent = currentLanguage === "ja" ? "独島" : "독도";
  });

  if (selectedBranch) {
    const branch = BRANCHES[selectedBranch];
    const branchContent = content[selectedBranch] || {};
    const introduction = localizedValue(branchContent, "introduction");
    const slogan = localizedValue(branchContent, "slogan");
    galleryTitle.textContent = branchName(branch);
    galleryDescription.textContent = introduction;
    galleryDescription.hidden = !introduction;
    branchSlogan.textContent = slogan;
    branchSlogan.hidden = !slogan;
    renderHall(selectedBranch);
    renderMeeting(selectedBranch);
    renderGallery();
  } else {
    galleryTitle.textContent = ui.galleryPrompt;
    hallCard.setAttribute("aria-label", ui.hallOpen);
    hallCaption.textContent = ui.hallCaption;
    photoCount.textContent = formatCopy(ui.photoCount, { count: 0 });
    galleryStatus.textContent = ui.galleryReady;
  }
}

const dialogController = createDialogController(lightbox, () => {
  lightboxImage.removeAttribute("src");
  if (lightboxOpener) lightboxOpener.focus();
  lightboxOpener = null;
});

const awardDialogController = panelAwardDialog
  ? createDialogController(panelAwardDialog, () => {
    if (panelAwardOpener) panelAwardOpener.focus();
    panelAwardOpener = null;
  })
  : null;

function openAwardDetail(button) {
  if (!button || !awardDialogController || !panelAwardDialogTitle || !panelAwardDialogPlace || !panelAwardDialogTranslation) return;
  panelAwardOpener = button;
  panelAwardDialogTitle.textContent = button.querySelector("strong")?.textContent || "";
  panelAwardDialogPlace.textContent = button.querySelector("span")?.textContent || "";
  panelAwardDialogTranslation.textContent = button.querySelector("small")?.textContent || "";
  awardDialogController.open();
  if (panelAwardDialogClose) window.setTimeout(() => panelAwardDialogClose.focus(), 0);
}

function updateLightbox(index) {
  const item = lightboxItems[index];
  if (!item) return;
  lightboxIndex = index;
  lightboxImage.hidden = false;
  lightboxError.hidden = true;
  lightboxImage.src = item.src;
  lightboxImage.alt = item.alt;
  lightboxCaption.textContent = `${item.caption}${item.detail ? ` · ${item.detail}` : ""} · ${index + 1}/${lightboxItems.length}`;
  const single = lightboxItems.length < 2;
  lightboxPrevious.disabled = single;
  lightboxNext.disabled = single;
}

function openLightbox(items, index, opener) {
  if (!items || !items[index]) return;
  lightboxItems = items;
  lightboxOpener = opener;
  updateLightbox(index);
  dialogController.open();
  window.setTimeout(() => lightboxClose.focus(), 0);
}

function moveLightbox(direction) {
  if (lightboxItems.length < 2) return;
  updateLightbox((lightboxIndex + direction + lightboxItems.length) % lightboxItems.length);
}

function finishGalleryPointerDrag(event) {
  if (!galleryPointerDrag || (event && event.pointerId !== galleryPointerDrag.pointerId)) return;
  if (galleryPointerDrag.moved) galleryDragClickBlockUntil = Date.now() + 350;
  if (galleryPointerDrag.captured && galleryPanel.hasPointerCapture?.(galleryPointerDrag.pointerId)) {
    galleryPanel.releasePointerCapture(galleryPointerDrag.pointerId);
  }
  galleryPointerDrag = null;
  galleryPanel.classList.remove("is-pointer-dragging");
}

function bindGalleryPointerDragScroll() {
  galleryPanel.addEventListener("dragstart", (event) => {
    if (event.target.closest("img")) event.preventDefault();
  });

  galleryPanel.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0 || event.pointerType === "touch") return;
    if (!event.target.closest(".gallery-scroll-content")) return;
    if (event.target.closest(".category-tabs, a, input, select, textarea")) return;
    galleryPointerDrag = {
      pointerId: event.pointerId,
      startY: event.clientY,
      scrollTop: galleryPanel.scrollTop,
      moved: false,
      captured: false
    };
  });

  galleryPanel.addEventListener("pointermove", (event) => {
    if (!galleryPointerDrag || event.pointerId !== galleryPointerDrag.pointerId) return;
    const deltaY = event.clientY - galleryPointerDrag.startY;
    if (!galleryPointerDrag.moved && Math.abs(deltaY) < GALLERY_DRAG_THRESHOLD) return;
    if (!galleryPointerDrag.moved) {
      galleryPointerDrag.moved = true;
      galleryPanel.classList.add("is-pointer-dragging");
      try {
        galleryPanel.setPointerCapture(event.pointerId);
        galleryPointerDrag.captured = true;
      } catch (error) {
        setRuntimeStatus("lastError", `pointer capture fallback: ${error.message}`);
      }
    }
    event.preventDefault();
    galleryPanel.scrollTop = galleryPointerDrag.scrollTop - deltaY;
  }, { passive: false });

  galleryPanel.addEventListener("click", (event) => {
    if (Date.now() > galleryDragClickBlockUntil) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  window.addEventListener("pointerup", finishGalleryPointerDrag);
  window.addEventListener("pointercancel", finishGalleryPointerDrag);
  window.addEventListener("blur", () => finishGalleryPointerDrag());
}

function bindEvents() {
  bindGalleryPointerDragScroll();
  bindPanelPointerDrag();
  languageButtons.forEach((button, index) => {
    button.addEventListener("click", () => applyLanguage(button.dataset.language));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const offset = event.key === "ArrowRight" ? 1 : -1;
      const next = languageButtons[(index + offset + languageButtons.length) % languageButtons.length];
      applyLanguage(next.dataset.language);
      next.focus();
    });
  });
  panelLanguageButtons.forEach((button, index) => {
    button.addEventListener("click", () => applyLanguage(button.dataset.panelLanguage));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const offset = event.key === "ArrowRight" ? 1 : -1;
      const next = panelLanguageButtons[(index + offset + panelLanguageButtons.length) % panelLanguageButtons.length];
      applyLanguage(next.dataset.panelLanguage);
      next.focus();
    });
  });
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
  gallerySortButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const sort = button.dataset.gallerySort;
      setGallerySort(sort, { reshuffle: sort === "random" && gallerySort === "random" });
    });
  });
  backButton.addEventListener("click", () => clearSelection({ restoreFocus: true }));
  panelEntry.addEventListener("click", () => openPanelViewer(panelEntry));
  panelClose.addEventListener("click", () => closePanelViewer());
  panelPrevious.addEventListener("click", () => goToPanel(panelIndex - 1));
  panelNext.addEventListener("click", () => goToPanel(panelIndex + 1));
  panelPageButtons.forEach((button) => {
    button.addEventListener("click", () => goToPanel(Number(button.dataset.panelGo)));
  });
  panelAchievementButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openAwardDetail(button);
    });
  });
  if (panelAwardDialogClose && panelAwardDialog && awardDialogController) {
    panelAwardDialogClose.addEventListener("click", () => awardDialogController.close());
    panelAwardDialog.addEventListener("click", (event) => {
      if (event.target === panelAwardDialog) awardDialogController.close();
    });
  }
  panelTrack.addEventListener("click", (event) => {
    if (Date.now() < panelTapBlockUntil || !event.target.closest(".panel-sheet")) return;
    const slide = event.target.closest(".panel-slide");
    if (slide) {
      panelIndex = Number(slide.dataset.panelIndex) || 0;
      updatePanelNavigation();
    }
    setPanelControlsHidden(!panelExhibition.classList.contains("panel-controls-hidden"));
  });
  panelTrack.addEventListener("scroll", () => {
    if (panelScrollFrame) return;
    panelScrollFrame = window.requestAnimationFrame(syncPanelIndexFromScroll);
  }, { passive: true });
  panelTrack.addEventListener("keydown", (event) => {
    let nextIndex = null;
    if (event.key === "ArrowLeft") nextIndex = panelIndex - 1;
    if (event.key === "ArrowRight") nextIndex = panelIndex + 1;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = panelSlides.length - 1;
    if (nextIndex !== null) {
      event.preventDefault();
      goToPanel(nextIndex);
    }
  });
  window.addEventListener("resize", () => {
    window.clearTimeout(panelResizeTimer);
    panelResizeTimer = window.setTimeout(() => {
      if (!panelExhibition.hidden) {
        updatePanelLayout();
        goToPanel(panelIndex, { instant: true });
      }
    }, 120);
  });
  introductionToggle.addEventListener("click", () => {
    setIntroductionCollapsed(!isIntroductionCollapsed);
  });
  photoGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".photo-card:not(.image-missing)");
    if (!card) return;
    const items = visiblePhotos.map(galleryPhotoItem);
    openLightbox(items, Number(card.dataset.photoIndex), card);
  });
  lightboxClose.addEventListener("click", () => dialogController.close());
  lightboxPrevious.addEventListener("click", () => moveLightbox(-1));
  lightboxNext.addEventListener("click", () => moveLightbox(1));
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) dialogController.close();
  });
  lightboxImage.addEventListener("load", () => {
    lightboxImage.hidden = false;
    lightboxError.hidden = true;
  });
  lightboxImage.addEventListener("error", () => {
    lightboxImage.hidden = true;
    lightboxError.hidden = false;
  });
  document.addEventListener("keydown", (event) => {
    if (awardDialogController && awardDialogController.isOpen()) {
      if (event.key === "Escape") {
        event.preventDefault();
        awardDialogController.close();
      }
      return;
    }
    if (!dialogController.isOpen()) {
      if (!panelExhibition.hidden && event.key === "Escape") {
        event.preventDefault();
        closePanelViewer();
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      dialogController.close();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveLightbox(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveLightbox(1);
    }
  });
}

async function boot() {
  initializeDebugMode(debugMode);
  initializeIntro({
    previewMode,
    onReplay() {
      clearSelection();
    },
    onComplete() {
      const first = branchSwitcher.querySelector("button");
      if (first) first.focus();
    }
  });
  renderBranchControls();
  renderCountryContext();
  renderMap();
  applyLanguage(currentLanguage);
  setRegionInteractive(galleryPanel, false);
  bindEvents();
  registerOfflineWorker();
  await loadManifest();
  if (selectedBranch) {
    renderMeeting(selectedBranch);
    renderGallery();
  }
}

boot().catch((error) => {
  setRuntimeStatus("lastError", error && error.message ? error.message : String(error));
  console.error("전시 앱 초기화 중 오류가 발생했습니다.", error);
  const intro = document.querySelector("#intro-screen");
  if (!intro || !intro.classList.contains("is-visible")) app.removeAttribute("aria-hidden");
});
