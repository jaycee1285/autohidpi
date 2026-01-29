"use strict";

const DEFAULT_PIXEL_RATIO = 1;

let currentPixelRatio = null;
let nativePort = null;

// Connect to native messaging host
function connectNative() {
  if (nativePort) return nativePort;

  try {
    nativePort = browser.runtime.connectNative("autohidpi");

    nativePort.onDisconnect.addListener((p) => {
      console.log("Native host disconnected:", p.error?.message || "unknown");
      nativePort = null;
    });

    return nativePort;
  } catch (e) {
    console.error("Failed to connect to native host:", e);
    return null;
  }
}

// Get displays from native host
async function getDisplays() {
  return new Promise((resolve) => {
    const port = connectNative();
    if (!port) {
      resolve({ error: "Could not connect to native host" });
      return;
    }

    const listener = (response) => {
      port.onMessage.removeListener(listener);
      resolve(response);
    };

    port.onMessage.addListener(listener);
    port.postMessage({ action: "getDisplays" });

    // Timeout after 5 seconds
    setTimeout(() => {
      port.onMessage.removeListener(listener);
      resolve({ error: "Timeout waiting for native host" });
    }, 5000);
  });
}

// Storage functions
async function loadPixelRatios() {
  const result = await browser.storage.local.get("pixelRatios");
  return result.pixelRatios || {};
}

async function loadPixelRatio(displayName) {
  const pixelRatios = await loadPixelRatios();
  return pixelRatios[displayName] || DEFAULT_PIXEL_RATIO;
}

async function savePixelRatio(displayName, pixelRatio) {
  const pixelRatios = await loadPixelRatios();
  pixelRatios[displayName] = pixelRatio;
  await browser.storage.local.set({ pixelRatios });
}

// Preference functions using experiment API
async function setDevPixelsPerPx(pixelRatio) {
  if (pixelRatio && pixelRatio !== currentPixelRatio) {
    console.log("setDevPixelsPerPx", pixelRatio);
    await browser.prefs.set("layout.css.devPixelsPerPx", String(pixelRatio));
    currentPixelRatio = pixelRatio;
  }
}

// Message handling for popup
browser.runtime.onMessage.addListener(async (message, sender) => {
  console.log("Received message:", message);

  if (message.type === "getDisplays") {
    const displayData = await getDisplays();

    if (displayData.error) {
      return displayData;
    }

    // Attach saved pixel ratios to each display
    const pixelRatios = await loadPixelRatios();
    for (const display of displayData.displays) {
      display.savedPixelRatio = pixelRatios[display.name] || DEFAULT_PIXEL_RATIO;
    }

    return displayData;
  }

  if (message.type === "setPixelRatio") {
    const { displayName, pixelRatio } = message;
    await savePixelRatio(displayName, pixelRatio);
    console.log("Saved pixelRatio for", displayName, ":", pixelRatio);
    return { success: true };
  }

  if (message.type === "applyPixelRatio") {
    const { pixelRatio } = message;
    await setDevPixelsPerPx(pixelRatio);
    return { success: true };
  }

  return { error: "Unknown message type" };
});

// Initialize
(async () => {
  console.log("AutoHiDPI background script loaded");
})();
