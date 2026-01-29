"use strict";

const loadingEl = document.getElementById("loading");
const displaysEl = document.getElementById("displays");

function createDisplayCard(display) {
  const card = document.createElement("div");
  card.className = "display-card";

  const header = document.createElement("div");
  header.className = "display-header";

  const name = document.createElement("span");
  name.className = "display-name";
  name.textContent = display.name;

  header.appendChild(name);

  const info = document.createElement("div");
  info.className = "display-info";
  info.textContent = `${display.width}x${display.height} @ ${display.x},${display.y} (scale: ${display.scale})`;

  const controlRow = document.createElement("div");
  controlRow.className = "control-row";

  const ratioDisplay = document.createElement("span");
  ratioDisplay.className = "pixel-ratio-display";
  ratioDisplay.textContent = display.savedPixelRatio + "x";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0.5";
  slider.max = "3";
  slider.step = "0.125";
  slider.value = display.savedPixelRatio;

  const applyBtn = document.createElement("button");
  applyBtn.className = "apply-btn";
  applyBtn.textContent = "Apply";

  // Update display as user drags slider
  slider.addEventListener("input", () => {
    ratioDisplay.textContent = slider.value + "x";
  });

  // Save when user releases slider
  slider.addEventListener("change", async () => {
    const pixelRatio = parseFloat(slider.value);
    await browser.runtime.sendMessage({
      type: "setPixelRatio",
      displayName: display.name,
      pixelRatio
    });
  });

  // Apply button sets the DPI immediately
  applyBtn.addEventListener("click", async () => {
    const pixelRatio = parseFloat(slider.value);

    // Save first
    await browser.runtime.sendMessage({
      type: "setPixelRatio",
      displayName: display.name,
      pixelRatio
    });

    // Then apply
    await browser.runtime.sendMessage({
      type: "applyPixelRatio",
      pixelRatio
    });

    // Visual feedback
    applyBtn.classList.add("active");
    applyBtn.textContent = "Applied!";
    setTimeout(() => {
      applyBtn.classList.remove("active");
      applyBtn.textContent = "Apply";
    }, 1000);
  });

  controlRow.appendChild(ratioDisplay);
  controlRow.appendChild(slider);
  controlRow.appendChild(applyBtn);

  card.appendChild(header);
  card.appendChild(info);
  card.appendChild(controlRow);

  return card;
}

// Load displays on popup open
(async () => {
  const response = await browser.runtime.sendMessage({ type: "getDisplays" });

  loadingEl.style.display = "none";

  if (response.error) {
    displaysEl.innerHTML = `<div class="error">${response.error}</div>`;
    return;
  }

  if (!response.displays || response.displays.length === 0) {
    displaysEl.innerHTML = `<div class="error">No displays found</div>`;
    return;
  }

  for (const display of response.displays) {
    displaysEl.appendChild(createDisplayCard(display));
  }
})();
