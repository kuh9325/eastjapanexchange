import { setRuntimeStatus } from "./compatibility.js";
import { INTRO_ROUTE } from "../data/intro-route.js";

export const INTRO_TIMELINE = Object.freeze({
  depart: [0, 1000],
  zoomOut: [1000, 3000],
  flight: [3000, 8000],
  koreaZoom: [8000, 9500],
  ground: [9500, 14000],
  arrival: [14000, 15000],
  duration: 15000
});

const CTS = INTRO_ROUTE.cts;
const ICN = INTRO_ROUTE.icn;
const point = ({ scenePoint }) => scenePoint.join(" ");

function haversineDistance(from, to) {
  const earthRadius = 6371;
  const radians = (degrees) => degrees * Math.PI / 180;
  const deltaLatitude = radians(to.latitude - from.latitude);
  const deltaLongitude = radians(to.longitude - from.longitude);
  const halfChord = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude))
    * Math.sin(deltaLongitude / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(halfChord));
}

export const CTS_ICN_DISTANCE = Math.round(haversineDistance(CTS, ICN) / 10) * 10;
const DOMESTIC_STOPS = Object.freeze({
  jincheon: Object.freeze({ revealAt: 9500, move: Object.freeze([10000, 11800]) }),
  daejeon: Object.freeze({ revealAt: 11800, move: Object.freeze([12300, 14000]) })
});
const REDUCED_SEQUENCE_STEPS = Object.freeze([
  Object.freeze(["新千歳空港を出発", INTRO_TIMELINE.depart[0]]),
  Object.freeze(["仁川国際空港に到着", INTRO_TIMELINE.koreaZoom[0]]),
  Object.freeze(["韓国SGI鎮川研修院", DOMESTIC_STOPS.jincheon.move[1]]),
  Object.freeze(["韓国SGI大田文化会館に到着", INTRO_TIMELINE.arrival[0]])
]);
const MAX_TIMELINE_FRAME_DELTA = 50;

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const progressBetween = (elapsed, range) => clamp((elapsed - range[0]) / (range[1] - range[0]), 0, 1);
const ease = (value) => 1 - ((1 - value) ** 3);
const scenePoint = ({ scenePoint: [x, y] }) => ({ x, y });
const cubicPoint = ([start, controlA, controlB, end], progress) => {
  const inverse = 1 - progress;
  return {
    x: (inverse ** 3) * start.x
      + 3 * (inverse ** 2) * progress * controlA.x
      + 3 * inverse * (progress ** 2) * controlB.x
      + (progress ** 3) * end.x,
    y: (inverse ** 3) * start.y
      + 3 * (inverse ** 2) * progress * controlA.y
      + 3 * inverse * (progress ** 2) * controlB.y
      + (progress ** 3) * end.y
  };
};
const sampleCurve = (curve, segments = 120) => {
  const points = [];
  let length = 0;
  let previous = cubicPoint(curve, 0);
  points.push({ ...previous, distance: 0 });
  for (let index = 1; index <= segments; index += 1) {
    const current = cubicPoint(curve, index / segments);
    length += Math.hypot(current.x - previous.x, current.y - previous.y);
    points.push({ ...current, distance: length });
    previous = current;
  }
  return Object.freeze({ points: Object.freeze(points), length });
};
const pointOnSampledCurve = (sampled, fraction) => {
  const target = sampled.length * clamp(fraction, 0, 1);
  let low = 0;
  let high = sampled.points.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (sampled.points[middle].distance < target) low = middle + 1;
    else high = middle;
  }
  const next = sampled.points[low];
  const previous = sampled.points[Math.max(0, low - 1)];
  const segmentLength = next.distance - previous.distance;
  const ratio = segmentLength ? (target - previous.distance) / segmentLength : 0;
  return {
    x: previous.x + (next.x - previous.x) * ratio,
    y: previous.y + (next.y - previous.y) * ratio
  };
};

const FLIGHT_CURVE = sampleCurve([
  scenePoint(CTS), { x: 755, y: 58 }, { x: 485, y: 178 }, scenePoint(ICN)
], 180);
const DOMESTIC_CURVES = Object.freeze({
  jincheon: sampleCurve([
    scenePoint(ICN), { x: 226, y: 292 }, { x: 249, y: 310 }, scenePoint(INTRO_ROUTE.jincheon)
  ]),
  daejeon: sampleCurve([
    scenePoint(INTRO_ROUTE.jincheon), { x: 267, y: 333 }, { x: 265, y: 346 }, scenePoint(INTRO_ROUTE.daejeon)
  ])
});

export function initializeIntro({ onComplete, onReplay, previewMode = false } = {}) {
  const root = document.querySelector("#intro-screen");
  const app = document.querySelector("#app");
  const scene = document.querySelector("#intro-world");
  const japanLayer = document.querySelector(".intro-japan-layer");
  const koreaLayer = document.querySelector(".intro-korea-layer");
  const flightPath = document.querySelector("#intro-flight-path");
  const groundPath = document.querySelector("#intro-ground-path");
  const groundSegments = {
    jincheon: document.querySelector("#intro-ground-to-jincheon"),
    daejeon: document.querySelector("#intro-ground-to-daejeon")
  };
  const plane = document.querySelector("#intro-plane");
  const travelDot = document.querySelector("#intro-travel-dot");
  const routeLabel = document.querySelector("#intro-flight-label");
  const stageLabel = document.querySelector("#intro-stage-label");
  const welcome = document.querySelector(".intro-welcome");
  const startButton = document.querySelector("#intro-start");
  const skipButtons = Array.from(document.querySelectorAll("[data-intro-skip]"));
  const replayButton = document.querySelector("#intro-replay");
  const controls = document.querySelector("#intro-preview-controls");
  const pauseButton = document.querySelector("#intro-pause");
  const restartButton = document.querySelector("#intro-restart");
  const speedSelect = document.querySelector("#intro-speed");
  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const supportsMotion = typeof window.requestAnimationFrame === "function";

  let frameId = 0;
  let timeoutIds = [];
  let timelineElapsed = 0;
  let lastTickAt = 0;
  let running = false;
  let paused = false;
  let speed = 1;
  let lastStage = "";
  let lastRenderedAt = 0;

  flightPath.setAttribute("d", `M${point(CTS)} C755 58 485 178 ${point(ICN)}`);
  groundPath.setAttribute("d", `M${point(ICN)} C226 292 249 310 ${point(INTRO_ROUTE.jincheon)} C267 333 265 346 ${point(INTRO_ROUTE.daejeon)}`);
  groundSegments.jincheon.setAttribute("d", `M${point(ICN)} C226 292 249 310 ${point(INTRO_ROUTE.jincheon)}`);
  groundSegments.daejeon.setAttribute("d", `M${point(INTRO_ROUTE.jincheon)} C267 333 265 346 ${point(INTRO_ROUTE.daejeon)}`);
  const groundSegmentLengths = {
    jincheon: DOMESTIC_CURVES.jincheon.length,
    daejeon: DOMESTIC_CURVES.daejeon.length
  };
  const domesticPathLength = groundSegmentLengths.jincheon + groundSegmentLengths.daejeon;
  const groundPathLength = domesticPathLength;
  const targetFrameInterval = /Android/i.test(navigator.userAgent)
    || Math.max(window.screen.width, window.screen.height) * (window.devicePixelRatio || 1) >= 3000
    ? 1000 / 30
    : 0;
  groundPath.style.strokeDasharray = String(groundPathLength);
  groundPath.style.strokeDashoffset = String(groundPathLength);
  for (const [key, location] of Object.entries(INTRO_ROUTE)) {
    const marker = document.querySelector(`#intro-point-${key}`);
    if (marker) marker.setAttribute("transform", `translate(${point(location)})`);
  }
  routeLabel.textContent = `CTS → ICN · 約 ${CTS_ICN_DISTANCE.toLocaleString("ja-JP")} km`;
  controls.hidden = !previewMode;
  root.classList.toggle("preview-mode", previewMode);

  const setAttributeIfChanged = (element, name, value) => {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  };
  const setStyleIfChanged = (element, name, value) => {
    if (element.style[name] !== value) element.style[name] = value;
  };

  const clearAsync = () => {
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
    timeoutIds.forEach((id) => window.clearTimeout(id));
    timeoutIds = [];
  };

  const resetScene = () => {
    clearAsync();
    running = false;
    paused = false;
    timelineElapsed = 0;
    lastTickAt = 0;
    lastRenderedAt = 0;
    startButton.disabled = false;
    pauseButton.textContent = "一時停止";
    root.classList.remove("is-running", "is-complete", "show-flight", "show-ground", "show-jincheon", "show-daejeon", "reduced-sequence");
    root.classList.add("is-visible");
    root.setAttribute("aria-hidden", "false");
    app.setAttribute("aria-hidden", "true");
    scene.setAttribute("transform", "translate(-2100 0) scale(3)");
    japanLayer.style.opacity = "1";
    koreaLayer.style.opacity = "0";
    plane.setAttribute("transform", `translate(${point(CTS)})`);
    travelDot.setAttribute("transform", `translate(${point(ICN)})`);
    groundPath.style.strokeDashoffset = String(groundPathLength);
    welcome.hidden = false;
    stageLabel.textContent = "新千歳空港からの出発をお待ちください";
    setRuntimeStatus("intro", "出発待機");
  };

  const complete = () => {
    clearAsync();
    running = false;
    root.classList.add("is-complete");
    stageLabel.textContent = "大田に到着";
    setRuntimeStatus("intro", "大田に到着");
    if (previewMode) {
      const timeout = window.setTimeout(() => start(), 1100 / speed);
      timeoutIds.push(timeout);
      return;
    }
    const timeout = window.setTimeout(() => {
      root.classList.remove("is-visible");
      root.setAttribute("aria-hidden", "true");
      app.removeAttribute("aria-hidden");
      if (typeof onComplete === "function") onComplete();
    }, 650);
    timeoutIds.push(timeout);
  };

  const movementProgress = (elapsed, stop) => {
    if (elapsed <= stop.move[0]) return 0;
    if (elapsed >= stop.move[1]) return 1;
    return ease(progressBetween(elapsed, stop.move));
  };

  const domesticRouteProgress = (elapsed) => {
    const revealedLength = groundSegmentLengths.jincheon * movementProgress(elapsed, DOMESTIC_STOPS.jincheon)
      + groundSegmentLengths.daejeon * movementProgress(elapsed, DOMESTIC_STOPS.daejeon);
    return domesticPathLength ? clamp(revealedLength / domesticPathLength, 0, 1) : 1;
  };

  const domesticTravelPoint = (elapsed) => {
    if (elapsed < DOMESTIC_STOPS.jincheon.move[0]) return { x: ICN.scenePoint[0], y: ICN.scenePoint[1] };
    if (elapsed < DOMESTIC_STOPS.jincheon.move[1]) {
      return pointOnSampledCurve(DOMESTIC_CURVES.jincheon, ease(progressBetween(elapsed, DOMESTIC_STOPS.jincheon.move)));
    }
    if (elapsed < DOMESTIC_STOPS.daejeon.move[0]) return { x: INTRO_ROUTE.jincheon.scenePoint[0], y: INTRO_ROUTE.jincheon.scenePoint[1] };
    return pointOnSampledCurve(DOMESTIC_CURVES.daejeon, ease(progressBetween(elapsed, DOMESTIC_STOPS.daejeon.move)));
  };

  const updateStage = (elapsed) => {
    if (elapsed < INTRO_TIMELINE.zoomOut[0]) return "新千歳空港を出発";
    if (elapsed < INTRO_TIMELINE.flight[0]) return "韓国へ向けてズームアウト";
    if (elapsed < INTRO_TIMELINE.koreaZoom[0]) return "CTS → ICN 飛行中";
    if (elapsed < INTRO_TIMELINE.ground[0]) return "仁川国際空港に到着";
    if (elapsed < 11800) return "仁川国際空港 → 鎮川研修院";
    if (elapsed < INTRO_TIMELINE.arrival[0]) return "鎮川研修院 → 大田文化会館";
    return "大田文化会館に到着";
  };

  const renderFrame = (elapsed) => {
    const zoomOut = ease(progressBetween(elapsed, INTRO_TIMELINE.zoomOut));
    const koreaZoom = ease(progressBetween(elapsed, INTRO_TIMELINE.koreaZoom));
    const koreaReveal = clamp((zoomOut - 0.45) / 0.55, 0, 1);
    let scale = 3 + (1 - 3) * zoomOut;
    let translateX = -2100 * (1 - zoomOut);
    let translateY = 0;
    if (elapsed >= INTRO_TIMELINE.koreaZoom[0]) {
      scale = 1 + 0.55 * koreaZoom;
      translateX = -190 * koreaZoom;
      translateY = -165 * koreaZoom;
    }
    setStyleIfChanged(koreaLayer, "opacity", koreaReveal.toFixed(3));
    setStyleIfChanged(japanLayer, "opacity", (1 - koreaZoom).toFixed(3));
    setAttributeIfChanged(scene, "transform", `translate(${translateX.toFixed(2)} ${translateY.toFixed(2)}) scale(${scale.toFixed(4)})`);

    if (elapsed >= INTRO_TIMELINE.flight[0] && elapsed <= INTRO_TIMELINE.flight[1]) {
      root.classList.add("show-flight");
      const flightProgress = ease(progressBetween(elapsed, INTRO_TIMELINE.flight));
      const point = pointOnSampledCurve(FLIGHT_CURVE, flightProgress);
      const next = pointOnSampledCurve(FLIGHT_CURVE, Math.min(1, flightProgress + 0.006));
      const angle = Math.atan2(next.y - point.y, next.x - point.x) * 180 / Math.PI;
      setAttributeIfChanged(plane, "transform", `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) rotate(${angle.toFixed(2)})`);
    } else if (elapsed > INTRO_TIMELINE.flight[1]) {
      root.classList.remove("show-flight");
    }

    if (elapsed >= INTRO_TIMELINE.ground[0]) {
      root.classList.add("show-ground");
      const point = domesticTravelPoint(elapsed);
      setStyleIfChanged(groundPath, "strokeDashoffset", String(groundPathLength * (1 - domesticRouteProgress(elapsed))));
      setAttributeIfChanged(travelDot, "transform", `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`);
    }
    root.classList.toggle("show-jincheon", elapsed >= DOMESTIC_STOPS.jincheon.revealAt);
    root.classList.toggle("show-daejeon", elapsed >= DOMESTIC_STOPS.daejeon.revealAt);
    const label = updateStage(elapsed);
    if (lastStage !== label) {
      lastStage = label;
      stageLabel.textContent = label;
      setRuntimeStatus("intro", label);
    }
  };

  const tick = (timestamp) => {
    if (!running || paused) return;
    if (!lastTickAt) lastTickAt = timestamp;
    const sinceLastRender = lastRenderedAt ? timestamp - lastRenderedAt : Number.POSITIVE_INFINITY;
    if (targetFrameInterval && sinceLastRender < targetFrameInterval * 0.85) {
      frameId = window.requestAnimationFrame(tick);
      return;
    }
    const frameDelta = Math.min(MAX_TIMELINE_FRAME_DELTA, Math.max(0, timestamp - lastTickAt));
    lastTickAt = timestamp;
    lastRenderedAt = timestamp;
    timelineElapsed += frameDelta * speed;
    try {
      renderFrame(timelineElapsed);
    } catch (error) {
      clearAsync();
      root.classList.remove("show-flight");
      setRuntimeStatus("intro", `静的表示 · ${error.message}`);
      runReducedSequence(timelineElapsed);
      return;
    }
    if (timelineElapsed >= INTRO_TIMELINE.duration) {
      complete();
      return;
    }
    frameId = window.requestAnimationFrame(tick);
  };

  const runReducedSequence = (elapsed = 0) => {
    const reducedElapsed = clamp(elapsed, 0, INTRO_TIMELINE.duration);
    root.classList.add("reduced-sequence", "show-ground");
    groundPath.style.strokeDashoffset = "0";
    REDUCED_SEQUENCE_STEPS.forEach(([label, at], index) => {
      const applyStep = () => {
        if (index >= 1) {
          japanLayer.style.opacity = "0";
          koreaLayer.style.opacity = "1";
          scene.setAttribute("transform", "translate(-190 -165) scale(1.55)");
        }
        if (index >= 2) root.classList.add("show-jincheon");
        if (index >= 3) root.classList.add("show-daejeon");
        stageLabel.textContent = label;
        setRuntimeStatus("intro", `簡易モーション · ${label}`);
        root.dataset.reducedStep = String(index);
      };
      const delay = Math.max(0, at - reducedElapsed) / speed;
      if (!delay) {
        applyStep();
        return;
      }
      timeoutIds.push(window.setTimeout(applyStep, delay));
    });
    const completionDelay = Math.max(0, INTRO_TIMELINE.duration - reducedElapsed) / speed;
    if (!completionDelay) complete();
    else timeoutIds.push(window.setTimeout(complete, completionDelay));
  };

  function start() {
    if (running) return;
    clearAsync();
    running = true;
    paused = false;
    timelineElapsed = 0;
    lastTickAt = 0;
    lastRenderedAt = 0;
    startButton.disabled = true;
    welcome.hidden = true;
    root.classList.add("is-running");
    root.classList.remove("is-complete");
    setRuntimeStatus("intro", "旅を再生中");
    if (reducedMotion || !supportsMotion) {
      runReducedSequence();
      return;
    }
    frameId = window.requestAnimationFrame(tick);
  }

  const skip = () => {
    clearAsync();
    running = false;
    root.classList.remove("is-running", "is-complete", "show-flight", "show-ground", "show-jincheon", "show-daejeon", "reduced-sequence");
    setRuntimeStatus("intro", "スキップ");
    if (previewMode) {
      resetScene();
      return;
    }
    root.classList.remove("is-visible");
    root.setAttribute("aria-hidden", "true");
    app.removeAttribute("aria-hidden");
    if (typeof onComplete === "function") onComplete();
  };

  const replay = () => {
    if (typeof onReplay === "function") onReplay();
    resetScene();
    if (previewMode) start();
  };

  startButton.addEventListener("click", start);
  skipButtons.forEach((button) => button.addEventListener("click", skip));
  replayButton.addEventListener("click", replay);
  restartButton.addEventListener("click", () => {
    resetScene();
    start();
  });
  pauseButton.addEventListener("click", () => {
    if (!running || reducedMotion || !supportsMotion) return;
    paused = !paused;
    if (paused) {
      if (frameId) window.cancelAnimationFrame(frameId);
      pauseButton.textContent = "再生";
      setRuntimeStatus("intro", "一時停止");
    } else {
      lastTickAt = 0;
      pauseButton.textContent = "一時停止";
      frameId = window.requestAnimationFrame(tick);
    }
  });
  speedSelect.addEventListener("change", () => {
    speed = Number(speedSelect.value) || 1;
  });
  window.addEventListener("pagehide", clearAsync);

  resetScene();
  if (previewMode) {
    const timeout = window.setTimeout(start, 300);
    timeoutIds.push(timeout);
  }

  return { start, skip, replay, cleanup: clearAsync };
}
