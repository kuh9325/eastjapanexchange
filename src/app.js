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
const branchSwitcher = document.querySelector("#branch-switcher");
const koreaMap = document.querySelector(".korea-map");
const countryContextLayer = document.querySelector("#country-context-layer");
const branchMapLayer = document.querySelector("#branch-map-layer");
const mapLandmarkLayer = document.querySelector("#map-landmark-layer");
const introKoreaLayer = document.querySelector("#intro-korea-layer");
const mapLegend = document.querySelector("#map-legend");
const galleryPanel = document.querySelector(".gallery-panel");
const galleryTitle = document.querySelector("#gallery-title");
const galleryKicker = document.querySelector("#gallery-kicker");
const galleryDescription = document.querySelector("#gallery-description");
const branchSlogan = document.querySelector("#branch-slogan");
const hallCard = document.querySelector("#hall-card");
const hallPhotoFrame = document.querySelector("#hall-photo-frame");
const hallCaption = document.querySelector("#hall-caption");
const meetingSection = document.querySelector("#meeting-section");
const meetingContent = document.querySelector("#meeting-content");
const photoGrid = document.querySelector("#photo-grid");
const photoCount = document.querySelector("#photo-count");
const galleryStatus = document.querySelector("#gallery-status");
const categoryButtons = Array.from(document.querySelectorAll("[data-category]"));
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

let manifest = { photos: [] };
let content = EXHIBITION_CONTENT;
let manifestAvailable = true;
let selectedBranch = null;
let selectedCategory = "all";
let visiblePhotos = [];
let lightboxItems = [];
let lightboxIndex = 0;
let lightboxOpener = null;

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

const svgElement = (name, attributes) => {
  const element = document.createElementNS(SVG_NS, name);
  const source = attributes || {};
  Object.keys(source).forEach((key) => element.setAttribute(key, String(source[key])));
  return element;
};

function humaniseFilename(filename) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/^\d{4}[-_.]?\d{2}[-_.]?\d{2}[-_ ]?/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || copy().fallbackCaption;
}

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
  appendCountryContext(introKoreaLayer, false);
  replaceChildren(mapLandmarkLayer, []);
  appendMapLandmarks(mapLandmarkLayer);
  appendMapLandmarks(introKoreaLayer);
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
  hallCard.hidden = !hall || (!hall.src && !hall.photo);
  if (hallCard.hidden) return;

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
  visiblePhotos = manifest.photos.filter((photo) => (
    photo.branch === selectedBranch
    && (selectedCategory === "all" || photo.category === selectedCategory)
  ));
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
    const caption = localizedValue(photo, "caption") || humaniseFilename(photo.filename || "");
    const item = photoItem(
      photo,
      caption,
      CATEGORIES[photo.category] ? categoryName(CATEGORIES[photo.category]) : copy().activityRecord
    );
    const card = document.createElement("button");
    card.type = "button";
    card.className = `photo-card ${index % 7 === 0 ? "wide" : ""} ${index % 9 === 5 ? "tall" : ""}`.trim();
    card.dataset.photoIndex = String(index);
    card.setAttribute("aria-label", formatCopy(copy().openPhoto, { caption }));
    const img = imageWithFallback(photo.thumbnail || photo.src, item.alt, "", null, () => {
      card.classList.add("image-missing");
      card.setAttribute("aria-disabled", "true");
      card.setAttribute("aria-label", formatCopy(copy().missingPhoto, { caption }));
    });
    if (index < 2) img.loading = "eager";
    const fallback = document.createElement("span");
    fallback.className = "image-fallback";
    fallback.textContent = copy().imagePreparing;
    const meta = document.createElement("span");
    meta.className = "photo-meta";
    const title = document.createElement("strong");
    title.textContent = caption;
    const type = document.createElement("span");
    type.textContent = item.detail;
    meta.appendChild(title);
    meta.appendChild(type);
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
  galleryKicker.textContent = branch.english;
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

  if (config.scroll !== false && window.matchMedia("(max-width: 1080px), (orientation: portrait)").matches) {
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

  document.querySelector(".map-panel").setAttribute("aria-label", ui.mapPanelLabel);
  document.querySelector("#hero-title").textContent = ui.heroTitle;
  document.querySelector("#hero-subtitle").textContent = ui.heroSubtitle;
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
  document.querySelector("#meeting-section-title").textContent = ui.meetingTitle;
  document.querySelector("#activity-section-title").textContent = ui.activityTitle;
  document.querySelector(".category-tabs").setAttribute("aria-label", ui.categoryLabel);
  categoryButtons.forEach((button) => {
    const category = button.dataset.category;
    button.textContent = category === "all" ? ui.all : categoryName(CATEGORIES[category]);
  });
  lightboxClose.setAttribute("aria-label", ui.closePhoto);
  lightboxPrevious.setAttribute("aria-label", ui.previousPhoto);
  lightboxNext.setAttribute("aria-label", ui.nextPhoto);
  lightboxError.textContent = ui.lightboxError;

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

function bindEvents() {
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
    if (!card) return;
    const items = visiblePhotos.map((photo) => photoItem(
      photo,
      localizedValue(photo, "caption") || humaniseFilename(photo.filename || ""),
      CATEGORIES[photo.category] ? categoryName(CATEGORIES[photo.category]) : copy().activityRecord
    ));
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
    if (!dialogController.isOpen()) return;
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
  await loadManifest();
  renderBranchControls();
  renderCountryContext();
  renderMap();
  applyLanguage(currentLanguage);
  setRegionInteractive(galleryPanel, false);
  bindEvents();
  initializeIntro({
    previewMode,
    onComplete() {
      const first = branchSwitcher.querySelector("button");
      if (first) first.focus();
    }
  });
  registerOfflineWorker();
}

boot().catch((error) => {
  setRuntimeStatus("lastError", error && error.message ? error.message : String(error));
  console.error("전시 앱 초기화 중 오류가 발생했습니다.", error);
  const intro = document.querySelector("#intro-screen");
  if (intro) intro.classList.remove("is-visible");
  app.removeAttribute("aria-hidden");
});
