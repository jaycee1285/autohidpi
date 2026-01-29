#!/usr/bin/env node
/**
 * Native messaging host for AutoHiDPI extension.
 * Runs wlr-randr to get display information on Wayland.
 */

const { execSync } = require("child_process");

function parseWlrRandr() {
  let output;
  try {
    output = execSync("wlr-randr", { encoding: "utf8", timeout: 5000 });
  } catch (e) {
    return { error: e.message };
  }

  const displays = [];
  let current = null;

  for (const line of output.split("\n")) {
    // New display starts with no leading whitespace
    if (line && !line.startsWith(" ")) {
      if (current) displays.push(current);

      const [name, ...rest] = line.split(" ");
      const description = rest.join(" ").replace(/"/g, "");

      current = {
        name,
        description,
        enabled: false,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        scale: 1.0
      };
    } else if (current && line.startsWith("  ")) {
      const trimmed = line.trim();

      if (trimmed.startsWith("Enabled:")) {
        current.enabled = trimmed.includes("yes");
      } else if (trimmed.startsWith("Position:")) {
        const match = trimmed.match(/Position:\s*(\d+),(\d+)/);
        if (match) {
          current.x = parseInt(match[1]);
          current.y = parseInt(match[2]);
        }
      } else if (trimmed.startsWith("Scale:")) {
        const match = trimmed.match(/Scale:\s*([\d.]+)/);
        if (match) {
          current.scale = parseFloat(match[1]);
        }
      } else if (trimmed.includes("current") && trimmed.includes("px")) {
        const match = trimmed.match(/(\d+)x(\d+)\s*px/);
        if (match) {
          current.width = parseInt(match[1]);
          current.height = parseInt(match[2]);
        }
      }
    }
  }

  if (current) displays.push(current);

  return { displays: displays.filter(d => d.enabled) };
}

function readMessage() {
  return new Promise((resolve) => {
    let chunks = [];
    let lengthBuffer = null;
    let messageLength = null;

    const onData = (chunk) => {
      chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      // First 4 bytes are the message length
      if (messageLength === null && buffer.length >= 4) {
        messageLength = buffer.readUInt32LE(0);
        chunks = [buffer.slice(4)];
      }

      const currentBuffer = Buffer.concat(chunks);
      if (messageLength !== null && currentBuffer.length >= messageLength) {
        process.stdin.removeListener("data", onData);
        const message = currentBuffer.slice(0, messageLength).toString("utf8");
        resolve(JSON.parse(message));
      }
    };

    process.stdin.on("data", onData);
    process.stdin.once("end", () => resolve(null));
  });
}

function sendMessage(message) {
  const encoded = Buffer.from(JSON.stringify(message), "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32LE(encoded.length, 0);
  process.stdout.write(length);
  process.stdout.write(encoded);
}

async function main() {
  while (true) {
    const message = await readMessage();
    if (message === null) break;

    if (message.action === "getDisplays") {
      sendMessage(parseWlrRandr());
    } else {
      sendMessage({ error: "Unknown action" });
    }
  }
}

main();
