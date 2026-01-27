import { createImagePanZoom } from "../src/index.ts";

let panzoom;
let isTransitionEnabled = true;
const eventLog = document.getElementById("event-log");

function logEvent(message) {
  const eventItem = document.createElement("div");
  eventItem.className = "event-item";
  eventItem.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  eventLog.prepend(eventItem);

  if (eventLog.children.length > 10) {
    eventLog.removeChild(eventLog.lastChild);
  }
}

function updateStats() {
  if (panzoom) {
    const transform = panzoom.getTransform();
    document.getElementById("scale-value").textContent =
      transform.scale.toFixed(2);
    document.getElementById("x-value").textContent = transform.x.toFixed(2);
    document.getElementById("y-value").textContent = transform.y.toFixed(2);
    document.getElementById(
      "rotation-value"
    ).textContent = `${transform.rotation.toFixed(0)}°`;
  }
}

function initPanZoom() {
  const container = document.getElementById("image-container");
  const image = document.getElementById("image");

  if (panzoom) {
    panzoom.destroy();
  }

  panzoom = createImagePanZoom(container, image, {
    minScale: 0.1,
    maxScale: 10,
    initialScale: 1,
    wheelZoomSpeed: 0.0015,
    boundsPadding: 0.1,
    friction: 0.92,
    maxSpeed: 300,
    transition: isTransitionEnabled,
    pinchSpeed: 1,
    enableRotation: true,
  });

  const originalApplyTransform = panzoom.applyTransform;
  panzoom.applyTransform = function (useTransition) {
    originalApplyTransform.call(this, useTransition);
    updateStats();
  };

  logEvent("ImagePanZoom инициализирован");
  updateStats();
}

window.moveTo = function (x, y) {
  if (!panzoom) return;
  panzoom.moveTo(parseFloat(x), parseFloat(y));
  logEvent(`moveTo(${x}, ${y})`);
};

window.moveBy = function (dx, dy) {
  if (!panzoom) return;
  panzoom.moveBy(parseFloat(dx), parseFloat(dy));
  logEvent(`moveBy(${dx}, ${dy})`);
};

window.moveToCustom = function () {
  const x = document.getElementById("move-x").value;
  const y = document.getElementById("move-y").value;
  moveTo(x, y);
};

window.zoomTo = function (scale) {
  if (!panzoom) return;
  panzoom.zoomTo(parseFloat(scale));
  logEvent(`zoomTo(${scale})`);
};

window.zoomToCustom = function () {
  const scale = document.getElementById("zoom-scale").value;
  zoomTo(scale);
};

window.zoomIn = function () {
  if (!panzoom) return;
  const transform = panzoom.getTransform();
  const newScale = Math.min(transform.scale * 1.2, 10);
  panzoom.zoomTo(newScale);
  logEvent(`zoomIn (${transform.scale.toFixed(2)} → ${newScale.toFixed(2)})`);
};

window.zoomOut = function () {
  if (!panzoom) return;
  const transform = panzoom.getTransform();
  const newScale = Math.max(transform.scale * 0.8, 0.1);
  panzoom.zoomTo(newScale);
  logEvent(`zoomOut (${transform.scale.toFixed(2)} → ${newScale.toFixed(2)})`);
};

window.rotateBy = function (degrees) {
  if (!panzoom) return;
  panzoom.rotate(parseFloat(degrees));
  logEvent(`rotateBy(${degrees}°)`);
};

window.rotateTo = function (degrees) {
  if (!panzoom) return;
  panzoom.setTransform({ rotation: parseFloat(degrees) });
  logEvent(`rotateTo(${degrees}°)`);
};

window.centerOnImagePointCustom = function () {
  if (!panzoom) return;

  const img = document.getElementById("image");
  const randomX = Math.random() * img.naturalWidth;
  const randomY = Math.random() * img.naturalHeight;
  panzoom.centerOnImagePoint(randomX, randomY);
  logEvent(`centerOnImagePoint(${randomX.toFixed(0)}, ${randomY.toFixed(0)})`);
};

window.resetTransform = function () {
  if (!panzoom) return;
  panzoom.reset();
  logEvent("reset()");
};

window.getTransformState = function () {
  if (!panzoom) return;
  const transform = panzoom.getTransform();
  logEvent(
    `getTransform(): scale=${transform.scale.toFixed(
      2
    )}, x=${transform.x.toFixed(2)}, y=${transform.y.toFixed(2)}, rotation=${
      transform.rotation
    }°`
  );

  alert(JSON.stringify(transform, null, 2));
};

document
  .getElementById("toggle-transition")
  .addEventListener("change", function (e) {
    isTransitionEnabled = e.target.checked;
    if (panzoom) {
      panzoom.options.transition = isTransitionEnabled;
      logEvent(`Transition: ${isTransitionEnabled ? "включено" : "выключено"}`);
    }
  });

document.addEventListener("DOMContentLoaded", () => {
  initPanZoom();

  setInterval(updateStats, 100);

  const container = document.getElementById("image-container");
  container.addEventListener("click", (e) => {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    document.getElementById("move-x").value = Math.round(x);
    document.getElementById("move-y").value = Math.round(y);

    if (panzoom) {
      const imgCoords = panzoom.containerToImage(x, y);
      logEvent(
        `Клик: контейнер(${x.toFixed(0)}, ${y.toFixed(
          0
        )}) → изображение(${imgCoords.x.toFixed(0)}, ${imgCoords.y.toFixed(0)})`
      );
    }
  });

  logEvent("Демо загружено. Готово к работе!");
});
