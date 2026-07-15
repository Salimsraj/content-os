// Records a 3-second demo clip of the Content OS chat composer typing a
// prompt, using a headless Chromium instance's built-in video capture.
// Usage: node scripts/chat-prompt-video/record.mjs
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, renameSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(DIR, "..", "..", "public", "demo");
const SIZE = { width: 1280, height: 800 };
const CLIP_SECONDS = 3;
const FFMPEG = "/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux";

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: SIZE,
  recordVideo: { dir: OUT_DIR, size: SIZE },
});
const page = await context.newPage();
await page.goto(`file://${path.join(DIR, "mockup.html")}`);

await page.waitForTimeout(CLIP_SECONDS * 1000);

const video = page.video();
await page.close();
await context.close();
await browser.close();

const rawPath = await video.path();
const tmpPath = path.join(OUT_DIR, "_raw.webm");
const webmPath = path.join(OUT_DIR, "chat-prompt-demo.webm");
renameSync(rawPath, tmpPath);

// Trim to exactly CLIP_SECONDS. Playwright ships a minimal ffmpeg build
// (vp8/webm only, no libx264), so webm is the only output format available.
execFileSync(FFMPEG, [
  "-y",
  "-i", tmpPath,
  "-t", String(CLIP_SECONDS),
  "-c:v", "libvpx",
  webmPath,
], { stdio: "inherit" });

if (existsSync(tmpPath)) rmSync(tmpPath);

console.log(`Wrote ${webmPath}`);
