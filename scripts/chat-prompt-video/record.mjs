// Records a 3-second demo clip of the Content OS chat composer typing a
// prompt, using a headless Chromium instance's built-in video capture.
// Usage: node scripts/chat-prompt-video/record.mjs
import { chromium } from "playwright";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execFileSync } from "node:child_process";
import { mkdirSync, renameSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(DIR, "..", "..", "public", "demo");
const SIZE = { width: 1280, height: 800 };
const CLIP_SECONDS = 3;
const FFMPEG = ffmpegInstaller.path;

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
const mp4Path = path.join(OUT_DIR, "chat-prompt-demo.mp4");
renameSync(rawPath, tmpPath);

// Trim to exactly CLIP_SECONDS and transcode to mp4/h264 for broad
// compatibility (GitHub's inline file preview, most video players).
execFileSync(FFMPEG, [
  "-y",
  "-i", tmpPath,
  "-t", String(CLIP_SECONDS),
  "-c:v", "libx264",
  "-pix_fmt", "yuv420p",
  "-movflags", "+faststart",
  mp4Path,
], { stdio: "inherit" });

if (existsSync(tmpPath)) rmSync(tmpPath);

console.log(`Wrote ${mp4Path}`);
