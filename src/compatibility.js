export const runtimeStatus = {
  manifest: "대기 중",
  intro: "대기 중",
  mapData: "일반 화면에서 숨김",
  lastError: "없음",
  animationFrame: typeof window.requestAnimationFrame === "function" ? "지원" : "미지원"
};

window.addEventListener("error", (event) => {
  runtimeStatus.lastError = event.message || "알 수 없는 오류";
  updateDebugPanel();
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  runtimeStatus.lastError = reason && reason.message ? reason.message : String(reason || "Promise 오류");
  updateDebugPanel();
});

export function replaceChildren(element, children) {
  while (element.firstChild) element.removeChild(element.firstChild);
  (children || []).forEach((child) => element.appendChild(child));
}

export function setRegionInteractive(element, enabled) {
  element.setAttribute("aria-hidden", String(!enabled));
  element.style.pointerEvents = enabled ? "" : "none";
  if ("inert" in element) {
    element.inert = !enabled;
    return;
  }
  const focusable = element.querySelectorAll("button, [href], input, select, textarea, [tabindex]");
  focusable.forEach((node) => {
    if (!enabled) {
      if (node.hasAttribute("tabindex")) node.dataset.savedTabindex = node.getAttribute("tabindex");
      node.setAttribute("tabindex", "-1");
    } else if (node.dataset.savedTabindex !== undefined) {
      node.setAttribute("tabindex", node.dataset.savedTabindex);
      delete node.dataset.savedTabindex;
    } else {
      node.removeAttribute("tabindex");
    }
  });
}

export function createDialogController(dialog, onClosed) {
  let nativeUsable = typeof window.HTMLDialogElement !== "undefined"
    && typeof dialog.showModal === "function"
    && typeof dialog.close === "function";
  let fallbackOpen = false;

  const focusable = () => Array.from(dialog.querySelectorAll("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])"))
    .filter((element) => !element.hidden);

  const finishClose = () => {
    document.body.classList.remove("lightbox-lock");
    dialog.hidden = true;
    if (typeof onClosed === "function") onClosed();
  };

  const controller = {
    supportsNative: nativeUsable,
    isOpen() {
      return nativeUsable ? dialog.open : fallbackOpen;
    },
    open() {
      document.body.classList.add("lightbox-lock");
      dialog.hidden = false;
      if (nativeUsable) {
        try {
          if (!dialog.open) dialog.showModal();
          return;
        } catch (error) {
          nativeUsable = false;
          controller.supportsNative = false;
          runtimeStatus.lastError = `dialog fallback: ${error.message}`;
        }
      }
      fallbackOpen = true;
      dialog.hidden = false;
      dialog.setAttribute("open", "");
      dialog.classList.add("fallback-open");
      const items = focusable();
      if (items[0]) items[0].focus();
    },
    close() {
      if (nativeUsable && dialog.open) {
        dialog.close();
        return;
      }
      if (!fallbackOpen) return;
      fallbackOpen = false;
      dialog.hidden = true;
      dialog.removeAttribute("open");
      dialog.classList.remove("fallback-open");
      finishClose();
    }
  };

  if (nativeUsable) dialog.addEventListener("close", finishClose);
  dialog.addEventListener("keydown", (event) => {
    if (!controller.isOpen() || event.key !== "Tab") return;
    const items = focusable();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  return controller;
}

export function setRuntimeStatus(key, value) {
  runtimeStatus[key] = value;
  updateDebugPanel();
}

export function updateDebugPanel() {
  const panel = document.querySelector("#debug-panel");
  if (!panel || panel.hidden) return;
  const supportsBackdrop = Boolean(window.CSS && CSS.supports
    && (CSS.supports("backdrop-filter", "blur(2px)") || CSS.supports("-webkit-backdrop-filter", "blur(2px)")));
  const rows = [
    ["userAgent", navigator.userAgent],
    ["viewport", `${window.innerWidth} × ${window.innerHeight}`],
    ["devicePixelRatio", String(window.devicePixelRatio || 1)],
    ["사진 확대", document.querySelector("#lightbox[role='dialog']") ? "고정 오버레이" : "dialog"],
    ["inert", "inert" in HTMLElement.prototype ? "지원" : "fallback"],
    ["backdrop-filter", supportsBackdrop ? "지원" : "fallback"],
    ["requestAnimationFrame", runtimeStatus.animationFrame],
    ["manifest", runtimeStatus.manifest],
    ["intro", runtimeStatus.intro],
    ["행정구역(내부 확인)", runtimeStatus.mapData],
    ["마지막 JS 오류", runtimeStatus.lastError]
  ];
  replaceChildren(panel, rows.map(([term, value]) => {
    const row = document.createElement("div");
    const label = document.createElement("strong");
    const copy = document.createElement("span");
    label.textContent = term;
    copy.textContent = value;
    row.append(label, copy);
    return row;
  }));
}

export function initializeDebugMode(enabled) {
  const panel = document.querySelector("#debug-panel");
  if (!panel) return;
  panel.hidden = !enabled;
  document.documentElement.classList.toggle("debug-mode", enabled);
  if (enabled) updateDebugPanel();
  window.addEventListener("resize", updateDebugPanel);
}

export async function registerOfflineWorker() {
  if (document.documentElement.dataset.build !== "production") return;
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(location.hostname)) return;
  try {
    await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
  } catch (error) {
    console.info("오프라인 캐시를 등록하지 못했지만 전시는 계속 실행됩니다.", error.message);
  }
}
