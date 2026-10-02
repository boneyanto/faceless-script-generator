import http from "http";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const PROJECT_ROOT = path.resolve(".");
const ASSETS_DIR = path.join(PROJECT_ROOT, "assets");
const ANIMATION_MODE = process.env.ANIMATION_MODE || "sketch";
const PANELS_PER_IMAGE = process.env.PANELS_PER_IMAGE ? parseInt(process.env.PANELS_PER_IMAGE, 10) : 4;
const ZOOM_SCALE = parseFloat(process.env.ZOOM_SCALE || "0.04");
const PAN_DRIFT = parseFloat(process.env.PAN_DRIFT || "0.015");
const WATERMARK_TEXT = process.env.WATERMARK_TEXT || "";

const targetEnv = process.env.TARGET_DIR || "channel_1/video_01_what_did_ancient_humans_actually_dream_about";
const VIDEO_DIR = path.resolve(targetEnv);
const TIMELINE_PATH = path.join(VIDEO_DIR, "timeline.json");
const OUTPUT_VIDEO_PATH = path.join(VIDEO_DIR, "output_video.mp4");
const MP4_MUXER_PATH = path.resolve("node_modules/mp4-muxer/build/mp4-muxer.js");

if (!fs.existsSync(TIMELINE_PATH)) {
  console.error("❌ timeline.json not found! Run process_images.py first.");
  process.exit(1);
}

const timeline = JSON.parse(fs.readFileSync(TIMELINE_PATH, "utf-8"));
const totalAudioDuration = timeline.totalAudioDuration;
const IMAGES_DIR = path.join(VIDEO_DIR, "images");

// Strict validation: check raw images count vs timeline chunks count
if (fs.existsSync(IMAGES_DIR)) {
  const rawImageFiles = fs.readdirSync(IMAGES_DIR).filter(f => /\.(png|webp|jpg|jpeg)$/i.test(f));
  if (rawImageFiles.length > 0 && rawImageFiles.length !== timeline.chunks.length) {
    console.error("\n=============================================================");
    console.error("❌ ERROR: DESINKRONISASI TERDETEKSI!");
    console.error(`   Jumlah Chunk Timeline / Audio : ${timeline.chunks.length}`);
    console.error(`   Jumlah Gambar di folder images: ${rawImageFiles.length}`);
    console.error("=============================================================");
    console.error("⚠️  Render digagalkan karena jumlah visual tidak selaras dengan audio.");
    console.error("   Video yang dihasilkan akan mengalami pergeseran gambar.");
    console.error("=============================================================\n");
    process.exit(1);
  }
}

console.log(`Loaded timeline. Total duration: ${totalAudioDuration}s, Chunks: ${timeline.chunks.length}`);
console.log(`Animation mode: ${ANIMATION_MODE}`);
console.log(`Panels per image: ${PANELS_PER_IMAGE}`);
console.log(`Zoom Scale: ${(ZOOM_SCALE * 100).toFixed(1)}% | Pan Drift: ${(PAN_DRIFT * 100).toFixed(1)}%`);
if (WATERMARK_TEXT) console.log(`Watermark text: "${WATERMARK_TEXT}"`);

// Subtitle Parsers (SRT, VTT, LRC)
function parseSRT(content) {
  const cues = [];
  const blocks = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 2) continue;
    let timingIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("-->")) { timingIndex = i; break; }
    }
    if (timingIndex === -1) continue;
    const timeMatch = lines[timingIndex].match(/(\d+):(\d+):(\d+)[,\.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,\.](\d+)/);
    if (!timeMatch) continue;
    const startSec = parseInt(timeMatch[1], 10) * 3600 + parseInt(timeMatch[2], 10) * 60 + parseInt(timeMatch[3], 10) + parseInt(timeMatch[4], 10) / 1000;
    const endSec = parseInt(timeMatch[5], 10) * 3600 + parseInt(timeMatch[6], 10) * 60 + parseInt(timeMatch[7], 10) + parseInt(timeMatch[8], 10) / 1000;
    const text = lines.slice(timingIndex + 1).join(" ").trim();
    if (text) cues.push({ startSec, endSec, text });
  }
  return cues;
}

function parseVTT(content) {
  const cues = [];
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.includes("-->")) {
      const timeMatch = line.match(/(?:(\d+):)?(\d+):(\d+)\.(\d+)\s*-->\s*(?:(\d+):)?(\d+):(\d+)\.(\d+)/);
      if (timeMatch) {
        const startH = timeMatch[1] ? parseInt(timeMatch[1], 10) : 0;
        const startM = parseInt(timeMatch[2], 10);
        const startS = parseInt(timeMatch[3], 10);
        const startMs = parseInt(timeMatch[4].padEnd(3, "0").slice(0, 3), 10);
        const startSec = startH * 3600 + startM * 60 + startS + startMs / 1000;

        const endH = timeMatch[5] ? parseInt(timeMatch[5], 10) : 0;
        const endM = parseInt(timeMatch[6], 10);
        const endS = parseInt(timeMatch[7], 10);
        const endMs = parseInt(timeMatch[8].padEnd(3, "0").slice(0, 3), 10);
        const endSec = endH * 3600 + endM * 60 + endS + endMs / 1000;

        let textLines = [];
        i++;
        while (i < lines.length && lines[i].trim() !== "" && !lines[i].includes("-->")) {
          textLines.push(lines[i].trim());
          i++;
        }
        const text = textLines.join(" ").trim();
        if (text) cues.push({ startSec, endSec, text });
        continue;
      }
    }
    i++;
  }
  return cues;
}

function parseLRC(content, totalDuration) {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const rawEntries = [];
  for (const line of lines) {
    const match = line.match(/\[(\d+):(\d+\.?\d*)\](.*)/);
    if (match) {
      const mins = parseInt(match[1], 10);
      const secs = parseFloat(match[2]);
      const text = (match[3] || "").trim();
      if (text) {
        rawEntries.push({ time: mins * 60 + secs, text });
      }
    }
  }
  rawEntries.sort((a, b) => a.time - b.time);

  const cues = [];
  for (let idx = 0; idx < rawEntries.length; idx++) {
    const cur = rawEntries[idx];
    const nextTime = (idx + 1 < rawEntries.length) ? rawEntries[idx + 1].time : (totalDuration || cur.time + 10);
    const duration = Math.max(1, nextTime - cur.time);

    const sentences = cur.text.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) || [cur.text];
    const cleanSentences = sentences.map(s => s.trim()).filter(s => s.length > 0);

    const subChunks = [];
    for (const sent of cleanSentences) {
      const words = sent.split(" ");
      if (words.length <= 12) {
        subChunks.push(sent);
      } else {
        for (let w = 0; w < words.length; w += 10) {
          subChunks.push(words.slice(w, w + 10).join(" "));
        }
      }
    }

    const totalChars = subChunks.reduce((acc, c) => acc + c.length, 0);
    let currentSubStart = cur.time;
    for (let sIdx = 0; sIdx < subChunks.length; sIdx++) {
      const phrase = subChunks[sIdx];
      const fraction = totalChars > 0 ? (phrase.length / totalChars) : (1 / subChunks.length);
      const phraseDuration = duration * fraction;
      const phraseEnd = (sIdx === subChunks.length - 1) ? nextTime : (currentSubStart + phraseDuration);
      cues.push({
        startSec: parseFloat(currentSubStart.toFixed(2)),
        endSec: parseFloat(phraseEnd.toFixed(2)),
        text: phrase
      });
      currentSubStart = phraseEnd;
    }
  }
  return cues;
}

let parsedSubtitles = [];
const ENABLE_SUBTITLES = process.env.ENABLE_SUBTITLES !== "0";

if (ENABLE_SUBTITLES) {
  let subFilePath = process.env.SUBTITLE_FILE ? path.resolve(process.env.SUBTITLE_FILE) : null;
  if (!subFilePath || !fs.existsSync(subFilePath)) {
    const files = fs.existsSync(VIDEO_DIR) ? fs.readdirSync(VIDEO_DIR) : [];
    const srtFile = files.find(f => f.toLowerCase().endsWith(".srt"));
    const vttFile = files.find(f => f.toLowerCase().endsWith(".vtt"));
    const lrcFile = files.find(f => f.toLowerCase().endsWith(".lrc"));

    if (srtFile) subFilePath = path.join(VIDEO_DIR, srtFile);
    else if (vttFile) subFilePath = path.join(VIDEO_DIR, vttFile);
    else if (lrcFile) subFilePath = path.join(VIDEO_DIR, lrcFile);
  }

  if (subFilePath && fs.existsSync(subFilePath)) {
    console.log(`💬 Subtitle file detected: ${path.basename(subFilePath)}`);
    const content = fs.readFileSync(subFilePath, "utf-8");
    const ext = path.extname(subFilePath).toLowerCase();
    if (ext === ".srt") {
      parsedSubtitles = parseSRT(content);
    } else if (ext === ".vtt") {
      parsedSubtitles = parseVTT(content);
    } else if (ext === ".lrc") {
      parsedSubtitles = parseLRC(content, totalAudioDuration);
    }
    console.log(`💬 Subtitle cues active: ${parsedSubtitles.length} entries`);
  } else {
    console.log("💬 No subtitle file found, proceeding without subtitles.");
  }
} else {
  console.log("💬 Subtitles disabled via ENABLE_SUBTITLES=0.");
}

let outputFd = null;

// Simple HTTP server to serve images, audio, mp4-muxer, assets, and html
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  
  if (urlPath === "/" || urlPath === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>WebCodecs Video Renderer</title>
  <script src="/mp4-muxer.js"></script>
</head>
<body style="background:#111; color:#eee; font-family:sans-serif;">
  <h2>WebCodecs Rendering Engine</h2>
  <div id="status">Initializing...</div>
  <div id="progress">0%</div>
</body>
</html>`);
    return;
  }
  
  if (urlPath === "/mp4-muxer.js") {
    res.writeHead(200, { "Content-Type": "application/javascript" });
    fs.createReadStream(MP4_MUXER_PATH).pipe(res);
    return;
  }
  
  if (urlPath === "/vo.mp3") {
    res.writeHead(200, { "Content-Type": "audio/mpeg" });
    fs.createReadStream(path.join(VIDEO_DIR, "vo.mp3")).pipe(res);
    return;
  }
  
  if (urlPath.startsWith("/upscaled/")) {
    const filename = path.basename(urlPath);
    const filePath = path.join(VIDEO_DIR, "upscaled", filename);
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { "Content-Type": "image/webp" });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  if (urlPath.startsWith("/assets/")) {
    const filename = path.basename(urlPath);
    const filePath = path.join(ASSETS_DIR, filename);
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { "Content-Type": "image/png" });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  if (req.method === "POST" && urlPath === "/save-start") {
    if (fs.existsSync(OUTPUT_VIDEO_PATH)) {
      fs.unlinkSync(OUTPUT_VIDEO_PATH);
    }
    if (outputFd !== null) {
      try { fs.closeSync(outputFd); } catch (e) {}
    }
    outputFd = fs.openSync(OUTPUT_VIDEO_PATH, "w+");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "POST" && urlPath === "/save-chunk") {
    const posHeader = req.headers["x-position"];
    const position = posHeader !== undefined ? parseInt(posHeader, 10) : null;
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => {
      const data = Buffer.concat(chunks);
      if (outputFd === null) {
        outputFd = fs.openSync(OUTPUT_VIDEO_PATH, fs.existsSync(OUTPUT_VIDEO_PATH) ? "r+" : "w+");
      }
      if (position !== null && !isNaN(position)) {
        fs.writeSync(outputFd, data, 0, data.length, position);
      } else {
        fs.appendFileSync(OUTPUT_VIDEO_PATH, data);
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, written: data.length }));
    });
    return;
  }

  if (req.method === "POST" && urlPath === "/save-finish") {
    if (outputFd !== null) {
      try { fs.closeSync(outputFd); } catch (e) {}
      outputFd = null;
    }
    const totalSize = fs.existsSync(OUTPUT_VIDEO_PATH) ? fs.statSync(OUTPUT_VIDEO_PATH).size : 0;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, totalSize }));
    return;
  }

  if (urlPath === "/timeline.json") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(timeline));
    return;
  }
  
  res.writeHead(404);
  res.end("Not Found");
});

const PORT = 9876;
server.listen(PORT, async () => {
  console.log(`Render server listening on http://localhost:${PORT}`);
  
  console.log("Launching headless Chromium for WebCodecs execution (Metal GPU accelerated)...");
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--enable-blink-features=WebCodecs",
      "--use-gl=angle",
      "--use-angle=metal",
      "--enable-gpu-rasterization",
      "--enable-zero-copy",
      "--ignore-gpu-blocklist",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--autoplay-policy=no-user-gesture-required",
      "--js-flags=--max-old-space-size=4096"
    ]
  });

  const page = await browser.newPage();

  // Forward console logs
  page.on("console", (msg) => {
    console.log(`[Browser ${msg.type()}]:`, msg.text());
  });

  await page.goto(`http://localhost:${PORT}`);

  console.log("Starting in-browser WebCodecs render pipeline...");
  const startTime = Date.now();

  try {
    const renderStats = await page.evaluate(async ({ width, height, fps, bitrate, animationMode, panelsPerImage, subtitles, zoomScale, panDrift, watermark }) => {
      const updateStatus = (text) => {
        const el = document.getElementById("status");
        if (el) el.innerText = text;
        console.log(text);
      };
      
      const updateProgress = (pct) => {
        const el = document.getElementById("progress");
        if (el) el.innerText = `${pct.toFixed(1)}%`;
      };

      // Natural continuous pencil stroke capsule clip
      function revealCapsule(ctx, src, x1, y1, x2, y2, r = 14) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        ctx.save();
        ctx.beginPath();
        if (len < 1) {
          ctx.arc(x1, y1, r, 0, Math.PI * 2);
        } else {
          const nx = -dy / len * r;
          const ny = dx / len * r;
          ctx.moveTo(x1 + nx, y1 + ny);
          ctx.lineTo(x2 + nx, y2 + ny);
          ctx.arc(x2, y2, r, Math.atan2(ny, nx), Math.atan2(-ny, -nx));
          ctx.lineTo(x1 - nx, y1 - ny);
          ctx.arc(x1, y1, r, Math.atan2(-ny, -nx), Math.atan2(ny, nx));
        }
        ctx.clip();
        ctx.drawImage(src, 0, 0);
        ctx.restore();
      }

      // 4-Quadrant Sequential Comic Strip Preparation (Gaya 1: Full-Canvas)
      function prepareComicStrip(fullBmp, width, height) {
        // 1. Generate full-canvas smooth graphite sketch via GPU Color Dodge
        const grayCanvas = new OffscreenCanvas(width, height);
        const gCtx = grayCanvas.getContext("2d");
        gCtx.filter = "grayscale(100%)";
        gCtx.drawImage(fullBmp, 0, 0, width, height);

        const invCanvas = new OffscreenCanvas(width, height);
        const iCtx = invCanvas.getContext("2d");
        iCtx.filter = "grayscale(100%) invert(100%) blur(12px)";
        iCtx.drawImage(fullBmp, 0, 0, width, height);

        const sCanvas = new OffscreenCanvas(width, height);
        const sCtx = sCanvas.getContext("2d");
        sCtx.drawImage(grayCanvas, 0, 0);
        sCtx.globalCompositeOperation = "color-dodge";
        sCtx.drawImage(invCanvas, 0, 0);

        // 2. Downscaled analysis to detect sketch paths in 4 quadrants
        const aW = Math.round(width / 4);  // 480
        const aH = Math.round(height / 4); // 270
        const aMidX = Math.round(aW / 2);  // 240
        const aMidY = Math.round(aH / 2);  // 135
        const halfW = width / 2;           // 960
        const halfH = height / 2;          // 540

        const aCanvas = new OffscreenCanvas(aW, aH);
        const aCtx = aCanvas.getContext("2d");
        aCtx.drawImage(sCanvas, 0, 0, aW, aH);
        const imgData = aCtx.getImageData(0, 0, aW, aH);
        const data = imgData.data;

        // Build edge mask for dark contours & ink lines
        const edgeGrid = new Uint8Array(aW * aH);
        for (let y = 2; y < aH - 2; y++) {
          const row = y * aW;
          for (let x = 2; x < aW - 2; x++) {
            const idx = (row + x) * 4;
            if (data[idx] < 205) {
              edgeGrid[row + x] = 1;
            }
          }
        }

        // Trace continuous stroke lines via 8-connected walk
        const visited = new Uint8Array(aW * aH);
        const quadStrokes = [[], [], [], []];
        const quadRects = [
          { x: 0, y: 0, w: halfW, h: halfH },
          { x: halfW, y: 0, w: halfW, h: halfH },
          { x: 0, y: halfH, w: halfW, h: halfH },
          { x: halfW, y: halfH, w: halfW, h: halfH }
        ];

        const neighbors = [
          [1, 0], [1, 1], [0, 1], [-1, 1],
          [-1, 0], [-1, -1], [0, -1], [1, -1]
        ];

        for (let y = 2; y < aH - 2; y++) {
          for (let x = 2; x < aW - 2; x++) {
            const idx = y * aW + x;
            if (edgeGrid[idx] && !visited[idx]) {
              const stroke = [{ x: x * 4, y: y * 4 }];
              visited[idx] = 1;
              let cx = x, cy = y;
              let extended = true;
              while (extended) {
                extended = false;
                for (const [dx, dy] of neighbors) {
                  const nx = cx + dx, ny = cy + dy;
                  if (nx >= 2 && nx < aW - 2 && ny >= 2 && ny < aH - 2) {
                    const nIdx = ny * aW + nx;
                    if (edgeGrid[nIdx] && !visited[nIdx]) {
                      visited[nIdx] = 1;
                      stroke.push({ x: nx * 4, y: ny * 4 });
                      cx = nx; cy = ny;
                      extended = true;
                      break;
                    }
                  }
                }
              }

              // Keep strokes with at least 3 vertices
              if (stroke.length >= 3) {
                const midPt = stroke[Math.floor(stroke.length / 2)];
                let qIdx = 0;
                if (midPt.x < halfW && midPt.y < halfH) qIdx = 0;
                else if (midPt.x >= halfW && midPt.y < halfH) qIdx = 1;
                else if (midPt.x < halfW && midPt.y >= halfH) qIdx = 2;
                else qIdx = 3;

                quadStrokes[qIdx].push(stroke);
              }
            }
          }
        }

        // Order strokes within each quadrant using greedy nearest-neighbor chaining
        const orderedQuads = [];
        for (let q = 0; q < 4; q++) {
          const rawStrokes = quadStrokes[q];
          const S = rawStrokes.length;
          const points = [];

          if (S > 0) {
            const strokeVisited = new Uint8Array(S);
            strokeVisited[0] = 1;

            const appendStroke = (st) => {
              for (let i = 0; i < st.length; i++) {
                points.push({
                  x: st[i].x,
                  y: st[i].y,
                  isStart: i === 0
                });
              }
            };

            appendStroke(rawStrokes[0]);

            for (let step = 1; step < S; step++) {
              const lastPt = points[points.length - 1];
              let bestDist = Infinity;
              let bestIdx = -1;
              let reverseStroke = false;

              for (let j = 0; j < S; j++) {
                if (strokeVisited[j]) continue;
                const st = rawStrokes[j];
                const startPt = st[0];
                const endPt = st[st.length - 1];
                const dStart = (startPt.x - lastPt.x) ** 2 + (startPt.y - lastPt.y) ** 2;
                const dEnd = (endPt.x - lastPt.x) ** 2 + (endPt.y - lastPt.y) ** 2;

                if (dStart < bestDist) {
                  bestDist = dStart;
                  bestIdx = j;
                  reverseStroke = false;
                }
                if (dEnd < bestDist) {
                  bestDist = dEnd;
                  bestIdx = j;
                  reverseStroke = true;
                }
              }

              if (bestIdx >= 0) {
                strokeVisited[bestIdx] = 1;
                const nextSt = reverseStroke ? rawStrokes[bestIdx].slice().reverse() : rawStrokes[bestIdx];
                appendStroke(nextSt);
              }
            }
          } else {
            const r = quadRects[q];
            points.push({ x: r.x + r.w / 2, y: r.y + r.h / 2, isStart: true });
          }

          orderedQuads.push({
            rect: quadRects[q],
            points: points,
            drawnCount: 0
          });
        }

        // Progressive canvas: starts clean white for the whole comic strip
        const pCanvas = new OffscreenCanvas(width, height);
        const pCtx = pCanvas.getContext("2d");
        pCtx.fillStyle = "#ffffff";
        pCtx.fillRect(0, 0, width, height);

        return {
          quads: orderedQuads,
          sketchCanvas: sCanvas,
          progressiveCanvas: pCanvas,
          progressiveCtx: pCtx,
          lastPenX: width / 4,
          lastPenY: height / 4
        };
      }

      // 1. Fetch Timeline and Audio
      updateStatus("Fetching timeline and audio...");
      const tlRes = await fetch("/timeline.json");
      const tl = await tlRes.json();
      
      const audioRes = await fetch("/vo.mp3");
      const audioArrayBuffer = await audioRes.arrayBuffer();

      // 2. Decode Audio using Web Audio API
      updateStatus("Decoding audio with AudioContext...");
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const decodedAudio = await audioCtx.decodeAudioData(audioArrayBuffer);
      const sampleRate = decodedAudio.sampleRate;
      const numberOfChannels = decodedAudio.numberOfChannels;
      const totalAudioFrames = decodedAudio.length;
      const audioDuration = decodedAudio.duration;
      console.log(`Decoded audio: ${audioDuration.toFixed(2)}s, ${sampleRate}Hz, ${numberOfChannels} channels`);

      // 3. Initialize MP4 Muxer (Zero-RAM StreamTarget Architecture)
      updateStatus("Configuring StreamTarget MP4 Muxer (Direct streaming to disk)...");
      await fetch("/save-start", { method: "POST" });

      let streamChain = Promise.resolve();
      let streamWriteError = null;
      let streamChunkCount = 0;

      const sendStreamChunk = async (data, position) => {
        try {
          const res = await fetch("/save-chunk", {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "x-position": position !== undefined ? position.toString() : "0"
            },
            body: data
          });
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        } catch (err) {
          console.error("Stream chunk write error:", err);
          streamWriteError = err;
        }
      };

      const muxer = new Mp4Muxer.Muxer({
        target: new Mp4Muxer.StreamTarget({
          onData: (data, position) => {
            streamChunkCount++;
            streamChain = streamChain.then(() => sendStreamChunk(data, position));
          },
          chunked: true,
          chunkSize: 4 * 1024 * 1024 // 4MB stream chunks
        }),
        video: {
          codec: "avc",
          width: width,
          height: height
        },
        audio: {
          codec: "aac",
          numberOfChannels: numberOfChannels,
          sampleRate: sampleRate
        },
        fastStart: "fragmented"
      });

      // 4. Initialize VideoEncoder
      let videoEncoderError = null;
      let encodedVideoFramesCount = 0;
      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => {
          muxer.addVideoChunk(chunk, meta);
          encodedVideoFramesCount++;
        },
        error: (e) => {
          console.error("VideoEncoder error:", e);
          videoEncoderError = e;
        }
      });

      videoEncoder.configure({
        codec: "avc1.420028",
        width: width,
        height: height,
        bitrate: bitrate,
        framerate: fps,
        latencyMode: "quality",
        hardwareAcceleration: "prefer-hardware"
      });

      // Static zero-allocation ondequeue handler for video backpressure (from render.worker.ts)
      let videoQueueDrainResolver = null;
      videoEncoder.ondequeue = () => {
        if (videoQueueDrainResolver && videoEncoder.encodeQueueSize <= 3) {
          const resolve = videoQueueDrainResolver;
          videoQueueDrainResolver = null;
          resolve();
        }
      };

      // 5. Initialize AudioEncoder
      let audioEncoderError = null;
      let encodedAudioFramesCount = 0;
      const audioEncoder = new AudioEncoder({
        output: (chunk, meta) => {
          muxer.addAudioChunk(chunk, meta);
          encodedAudioFramesCount++;
        },
        error: (e) => {
          console.error("AudioEncoder error:", e);
          audioEncoderError = e;
        }
      });

      audioEncoder.configure({
        codec: "mp4a.40.2",
        numberOfChannels: numberOfChannels,
        sampleRate: sampleRate,
        bitrate: 192000
      });

      // Static zero-allocation ondequeue handler for audio backpressure
      let audioQueueDrainResolver = null;
      audioEncoder.ondequeue = () => {
        if (audioQueueDrainResolver && audioEncoder.encodeQueueSize <= 3) {
          const resolve = audioQueueDrainResolver;
          audioQueueDrainResolver = null;
          resolve();
        }
      };

      // Determine effective duration from timeline or decoded audio
      const effectiveAudioDuration = (tl.totalAudioDuration && tl.totalAudioDuration > 0)
        ? Math.min(tl.totalAudioDuration, audioDuration)
        : audioDuration;
      const targetAudioFrames = Math.min(totalAudioFrames, Math.round(effectiveAudioDuration * sampleRate));

      // Concurrent background audio encoding (render.worker.ts pattern)
      const encodeAudioConcurrently = async () => {
        const audioChunkSize = 2048;
        for (let offset = 0; offset < targetAudioFrames; offset += audioChunkSize) {
          if (audioEncoderError) throw audioEncoderError;

          const currentChunkLen = Math.min(audioChunkSize, targetAudioFrames - offset);
          const planarData = new Float32Array(currentChunkLen * numberOfChannels);

          for (let ch = 0; ch < numberOfChannels; ch++) {
            const chData = decodedAudio.getChannelData(ch).subarray(offset, offset + currentChunkLen);
            planarData.set(chData, ch * currentChunkLen);
          }

          const audioTimestampMicrosec = Math.round((offset / sampleRate) * 1_000_000);

          const audioData = new AudioData({
            format: "f32-planar",
            sampleRate: sampleRate,
            numberOfFrames: currentChunkLen,
            numberOfChannels: numberOfChannels,
            timestamp: audioTimestampMicrosec,
            data: planarData
          });

          audioEncoder.encode(audioData);
          audioData.close(); // Mandatory cleanup to prevent memory leaks!

          if (audioEncoder.encodeQueueSize > 8) {
            await new Promise(resolve => {
              audioQueueDrainResolver = resolve;
              if (audioEncoder.encodeQueueSize <= 3) {
                audioQueueDrainResolver = null;
                resolve();
              }
            });
          }
        }

        await audioEncoder.flush();
        audioEncoder.close();
      };

      // Start audio encoding concurrently in background
      const audioEncodingPromise = encodeAudioConcurrently();

      // 6. Setup OffscreenCanvas & Pencil Asset
      const offscreen = new OffscreenCanvas(width, height);
      const ctx = offscreen.getContext("2d", { willReadFrequently: false });

      let pencilBmp = null;
      if (animationMode === "sketch") {
        updateStatus("Loading slim drawing pencil asset...");
        try {
          const pencilRes = await fetch("/assets/pencil.png");
          if (pencilRes.ok) {
            const pencilBlob = await pencilRes.blob();
            pencilBmp = await createImageBitmap(pencilBlob);
            console.log("Pencil bitmap loaded successfully:", pencilBmp.width, "x", pencilBmp.height);
          } else {
            console.warn("Pencil asset not found at /assets/pencil.png, falling back to zoom_pan");
          }
        } catch (e) {
          console.warn("Failed to load pencil asset:", e);
        }
      }

      // 7. Render Video Chunks (with Strict Anti-Memory Leak & Backpressure Flow Control)
      const totalDuration = effectiveAudioDuration;
      const totalVideoFrames = Math.ceil(totalDuration * fps);
      const frameDurationMicrosec = (1 / fps) * 1_000_000;

      updateStatus(`Rendering ${tl.chunks.length} chunks (${totalVideoFrames} video frames @ ${fps} fps)...`);

      let currentFrameIdx = 0;
      const videoRenderStartTime = performance.now();
      let windowStartTime = videoRenderStartTime;
      let windowStartFrame = 0;

      let currentFullBmp = null;
      let currentComicStrip = null;
      let bgCanvas = null;

      try {
        for (let cIdx = 0; cIdx < tl.chunks.length; cIdx++) {
          const chunkStartTime = performance.now();
          const chunk = tl.chunks[cIdx];
          const chunkStartSec = chunk.startTime;
          const chunkEndSec = chunk.endTime;
          const chunkDuration = Math.max(0.1, chunkEndSec - chunkStartSec);

          // Always load full 4-panel image (from /upscaled/)
          const fullImgFile = chunk.fullImage || `img_${cIdx + 1 < 10 ? '0' : ''}${cIdx + 1}.webp`;
          const fBlob = await (await fetch(`/upscaled/${fullImgFile}`)).blob();
          currentFullBmp = await createImageBitmap(fBlob);
          currentComicStrip = (animationMode === "sketch" && pencilBmp) ? prepareComicStrip(currentFullBmp, width, height) : null;

          // Prepare ambient blurred backdrop once per chunk (16:9 cover, zero FPS penalty)
          if (animationMode !== "sketch" && currentFullBmp) {
            try {
              bgCanvas = new OffscreenCanvas(480, 270);
              const bgCtx = bgCanvas.getContext("2d");
              bgCtx.filter = "blur(14px) brightness(0.5)";
              const imgAspect = currentFullBmp.width / currentFullBmp.height;
              const bgAspect = 480 / 270;
              let srcX = 0, srcY = 0, srcW = currentFullBmp.width, srcH = currentFullBmp.height;
              if (imgAspect > bgAspect) {
                srcW = currentFullBmp.height * bgAspect;
                srcX = (currentFullBmp.width - srcW) / 2;
              } else {
                srcH = currentFullBmp.width / bgAspect;
                srcY = (currentFullBmp.height - srcH) / 2;
              }
              bgCtx.drawImage(currentFullBmp, srcX, srcY, srcW, srcH, 0, 0, 480, 270);
            } catch (e) {
              console.warn("Failed to generate ambient backdrop:", e);
            }
          }

          const chunkStartFrame = Math.round(chunkStartSec * fps);
          const chunkEndFrame = Math.min(totalVideoFrames, Math.round(chunkEndSec * fps));

          for (let f = chunkStartFrame; f < chunkEndFrame; f++) {
            if (videoEncoderError) throw videoEncoderError;
            if (audioEncoderError) throw audioEncoderError;

            const currentSec = f / fps;
            const elapsedInChunk = currentSec - chunkStartSec;
            const chunkProgress = Math.min(1.0, Math.max(0.0, elapsedInChunk / chunkDuration));

            // Selesaikan proses animasi 5 detik sebelum pindah gambar agar penonton bisa melihat 4 panel utuh lebih lama
            const HOLD_DURATION = 5.0; // detik hold setelah seluruh 4 panel selesai
            const animDuration = (chunkDuration > HOLD_DURATION + 2.0)
              ? (chunkDuration - HOLD_DURATION)
              : Math.max(1.0, chunkDuration * 0.65); // fallback aman bila durasi chunk pendek (<7s)
            const animProgress = Math.min(1.0, Math.max(0.0, elapsedInChunk / animDuration));

            if (currentComicStrip && currentFullBmp) {
              // Gaya 1: Full-Canvas Comic Strip (Kamera Statis / Subtle Drift)
              // Subtle breathing and cinematic drift across the whole comic sheet
              const scale = 1.02 + Math.sin(chunkProgress * Math.PI) * 0.02;
              const panX = (0.5 - chunkProgress) * (width * 0.015);
              const panY = (0.5 - chunkProgress) * (height * 0.015);

              // Determine active quadrant q in [0, 1, 2, 3] (each takes 25% of animDuration)
              const currentQ = Math.min(3, Math.floor(animProgress / 0.25));
              const qStart = currentQ * 0.25;
              const qProgress = Math.min(1.0, Math.max(0.0, (animProgress - qStart) / 0.25));

              const quadAlphas = [0, 0, 0, 0];
              // Prior quadrants are 100% full-color and fully sketched
              for (let i = 0; i < currentQ; i++) {
                quadAlphas[i] = 1.0;
                const qObj = currentComicStrip.quads[i];
                if (qObj.drawnCount < qObj.points.length) {
                  currentComicStrip.progressiveCtx.save();
                  currentComicStrip.progressiveCtx.beginPath();
                  currentComicStrip.progressiveCtx.rect(qObj.rect.x, qObj.rect.y, qObj.rect.w, qObj.rect.h);
                  currentComicStrip.progressiveCtx.clip();
                  currentComicStrip.progressiveCtx.drawImage(currentComicStrip.sketchCanvas, 0, 0);
                  currentComicStrip.progressiveCtx.restore();
                  qObj.drawnCount = qObj.points.length;
                }
              }

              let pencilAlpha = 0;
              let penX = currentComicStrip.lastPenX;
              let penY = currentComicStrip.lastPenY;

              const activeQObj = currentComicStrip.quads[currentQ];
              const qPoints = activeQObj.points;
              const totalPts = qPoints.length;

              if (qProgress <= 0.72) {
                const sketchRatio = qProgress / 0.72;
                const targetPoints = Math.floor(sketchRatio * totalPts);

                while (activeQObj.drawnCount < targetPoints && activeQObj.drawnCount < totalPts) {
                  const curPt = qPoints[activeQObj.drawnCount];
                  if (!curPt.isStart && activeQObj.drawnCount > 0) {
                    const prevPt = qPoints[activeQObj.drawnCount - 1];
                    revealCapsule(currentComicStrip.progressiveCtx, currentComicStrip.sketchCanvas, prevPt.x, prevPt.y, curPt.x, curPt.y, 14);
                  } else {
                    revealCapsule(currentComicStrip.progressiveCtx, currentComicStrip.sketchCanvas, curPt.x, curPt.y, curPt.x, curPt.y, 14);
                  }
                  activeQObj.drawnCount++;
                }

                // Continuous sub-segment pencil position along the stroke
                const floatIdx = sketchRatio * Math.max(1, totalPts - 1);
                const idxFloor = Math.min(totalPts - 1, Math.floor(floatIdx));
                const idxNext = Math.min(totalPts - 1, idxFloor + 1);
                const frac = floatIdx - idxFloor;
                const pA = qPoints[idxFloor];
                const pB = qPoints[idxNext];

                const wobbleX = Math.sin(f * 1.8) * 1.8;
                const wobbleY = Math.cos(f * 1.8) * 1.8;
                penX = pA.x + (pB.x - pA.x) * frac + wobbleX;
                penY = pA.y + (pB.y - pA.y) * frac + wobbleY;
                currentComicStrip.lastPenX = penX;
                currentComicStrip.lastPenY = penY;
                pencilAlpha = 1.0;
                quadAlphas[currentQ] = 0.0;
              } else if (qProgress <= 0.95) {
                // Ensure full quadrant sketch is revealed cleanly before color wash
                if (activeQObj.drawnCount < totalPts) {
                  currentComicStrip.progressiveCtx.save();
                  currentComicStrip.progressiveCtx.beginPath();
                  currentComicStrip.progressiveCtx.rect(activeQObj.rect.x, activeQObj.rect.y, activeQObj.rect.w, activeQObj.rect.h);
                  currentComicStrip.progressiveCtx.clip();
                  currentComicStrip.progressiveCtx.drawImage(currentComicStrip.sketchCanvas, 0, 0);
                  currentComicStrip.progressiveCtx.restore();
                  activeQObj.drawnCount = totalPts;
                }

                const revealRatio = (qProgress - 0.72) / 0.23;
                quadAlphas[currentQ] = revealRatio * revealRatio * (3 - 2 * revealRatio);

                if (currentQ < 3) {
                  // Move pencil smoothly towards starting point of next quadrant
                  const nextQObj = currentComicStrip.quads[currentQ + 1];
                  const startPt = nextQObj.points[0];
                  const tMove = revealRatio;
                  penX = currentComicStrip.lastPenX * (1 - tMove) + startPt.x * tMove;
                  penY = currentComicStrip.lastPenY * (1 - tMove) + startPt.y * tMove;
                  pencilAlpha = 1.0;
                } else {
                  // Final quadrant (Q3): pencil smoothly slides down-right off screen
                  const exitSlide = revealRatio * (height * 0.75);
                  penX = currentComicStrip.lastPenX + exitSlide * 0.6;
                  penY = currentComicStrip.lastPenY + exitSlide;
                  pencilAlpha = Math.max(0, 1.0 - revealRatio * 1.5);
                }
              } else {
                // 0.95 -> 1.00: Quad completed
                quadAlphas[currentQ] = 1.0;
                if (currentQ < 3) {
                  const nextQObj = currentComicStrip.quads[currentQ + 1];
                  penX = nextQObj.points[0].x;
                  penY = nextQObj.points[0].y;
                  currentComicStrip.lastPenX = penX;
                  currentComicStrip.lastPenY = penY;
                  pencilAlpha = 1.0;
                } else {
                  pencilAlpha = 0.0;
                }
              }

              // Composite full comic sheet with camera transform
              ctx.save();
              ctx.translate(width / 2, height / 2);
              ctx.scale(scale, scale);
              ctx.translate(-width / 2 + panX, -height / 2 + panY);

              // 1. Draw progressive sketch canvas (white background + revealed graphite lines)
              ctx.drawImage(currentComicStrip.progressiveCanvas, 0, 0, width, height);

              // 2. Draw colored quadrants (clipped to each quadrant's bounding rectangle)
              for (let i = 0; i <= currentQ; i++) {
                const alpha = quadAlphas[i];
                if (alpha > 0) {
                  const r = currentComicStrip.quads[i].rect;
                  ctx.save();
                  ctx.beginPath();
                  ctx.rect(r.x, r.y, r.w, r.h);
                  ctx.clip();
                  ctx.globalAlpha = alpha;
                  ctx.drawImage(currentFullBmp, 0, 0, width, height);
                  ctx.restore();
                }
              }

              // 3. Draw slim drawing pencil
              if (pencilBmp && pencilAlpha > 0) {
                const pencilWidth = width * 0.11;
                const pencilHeight = pencilWidth * (pencilBmp.height / pencilBmp.width);
                ctx.globalAlpha = pencilAlpha;
                ctx.drawImage(pencilBmp, penX, penY, pencilWidth, pencilHeight);
                ctx.globalAlpha = 1.0;
              }

              ctx.restore();
            } else if (currentFullBmp) {
              // Zoom & Pan: supports 4-quadrant comic strips and single images with exact aspect-ratio preservation
              const isSinglePanel = panelsPerImage === 1;
              const subProgress = isSinglePanel ? chunkProgress : (chunkProgress * 4) % 1.0;
              const qIdx = isSinglePanel ? 0 : Math.min(3, Math.floor(chunkProgress * 4));
              const shotIdx = isSinglePanel ? cIdx : (cIdx * 4 + qIdx);

              // Pseudo-random deterministic camera movement per shot (prevents repetitive template feel)
              const h = Math.sin(shotIdx * 997.1 + 13.7) * 10000;
              const seed = h - Math.floor(h);
              const angle = seed * Math.PI * 2;
              const isZoomIn = Math.sin(shotIdx * 331.3) > -0.5; // ~75% push-in, 25% pull-out

              const ease = subProgress * subProgress * (3 - 2 * subProgress);
              const zScale = typeof zoomScale === "number" ? zoomScale : 0.04;
              const scale = isZoomIn ? (1.01 + ease * zScale) : (1.01 + zScale - ease * zScale);

              const drift = typeof panDrift === "number" ? panDrift : 0.015;
              const panProgress = ease - 0.5; // Smooth movement from -0.5 to +0.5
              const panX = panProgress * Math.cos(angle) * (width * drift);
              const panY = panProgress * Math.sin(angle) * (height * drift);

              let sx, sy, sw, sh;
              if (isSinglePanel) {
                sx = 0;
                sy = 0;
                sw = currentFullBmp.width;
                sh = currentFullBmp.height;
              } else {
                const halfW = currentFullBmp.width / 2;
                const halfH = currentFullBmp.height / 2;
                sx = (qIdx % 2 === 1) ? halfW : 0;
                sy = (qIdx >= 2) ? halfH : 0;
                sw = halfW;
                sh = halfH;
              }

              // Preserve natural aspect ratio (contain mode: no stretch, no forced fullscreen)
              const srcAspect = sw / sh;
              const canvasAspect = width / height;

              let drawW, drawH;
              if (srcAspect > canvasAspect) {
                // Wider than canvas: fit to width, letterbox top/bottom
                drawW = width;
                drawH = width / srcAspect;
              } else {
                // Taller or narrower than canvas: fit to height, pillarbox left/right
                drawH = height;
                drawW = height * srcAspect;
              }

              const drawX = (width - drawW) / 2;
              const drawY = (height - drawH) / 2;

              // 1. Zoomed and blurred ambient background
              if (bgCanvas) {
                ctx.drawImage(bgCanvas, 0, 0, width, height);
              } else {
                ctx.fillStyle = "#000000";
                ctx.fillRect(0, 0, width, height);
              }

              // 2. Smooth cinematic zoom & pan centered on canvas
              ctx.save();
              ctx.translate(width / 2, height / 2);
              ctx.scale(scale, scale);
              ctx.translate(-width / 2 + panX, -height / 2 + panY);

              // 3. Draw panel/image with undistorted natural proportions + subtle drop shadow
              ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
              ctx.shadowBlur = 28;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 4;
              ctx.drawImage(currentFullBmp, sx, sy, sw, sh, drawX, drawY, drawW, drawH);
              ctx.restore();
            }

            // 4. Render Active Subtitle Cue (if any)
            if (subtitles && subtitles.length > 0) {
              const activeCue = subtitles.find(s => currentSec >= s.startSec && currentSec < s.endSec);
              if (activeCue && activeCue.text) {
                ctx.save();
                const fontSize = 38;
                ctx.font = `bold ${fontSize}px "Segoe UI", Montserrat, -apple-system, Roboto, sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                // Word wrap subtitle lines if width > maxTextWidth
                const maxTextWidth = width * 0.82;
                const words = activeCue.text.split(" ");
                const lines = [];
                let curLine = words[0] || "";
                for (let wIdx = 1; wIdx < words.length; wIdx++) {
                  const testLine = curLine + " " + words[wIdx];
                  if (ctx.measureText(testLine).width < maxTextWidth) {
                    curLine = testLine;
                  } else {
                    lines.push(curLine);
                    curLine = words[wIdx];
                  }
                }
                if (curLine) lines.push(curLine);

                const lineHeight = fontSize * 1.35;
                const bottomY = height * 0.88;
                const startY = bottomY - ((lines.length - 1) * lineHeight) / 2;

                // Draw subtle dark pill behind each line for guaranteed readability
                for (let l = 0; l < lines.length; l++) {
                  const lineText = lines[l];
                  const lineY = startY + (l * lineHeight);
                  const textMetrics = ctx.measureText(lineText);
                  const boxPadX = 18;
                  const boxPadY = 6;
                  const boxW = textMetrics.width + boxPadX * 2;
                  const boxH = fontSize + boxPadY * 2;
                  const boxX = (width - boxW) / 2;
                  const boxTop = lineY - boxH / 2;

                  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
                  ctx.beginPath();
                  if (ctx.roundRect) {
                    ctx.roundRect(boxX, boxTop, boxW, boxH, 10);
                  } else {
                    ctx.rect(boxX, boxTop, boxW, boxH);
                  }
                  ctx.fill();

                  // Crisp outline and white text
                  ctx.strokeStyle = "#000000";
                  ctx.lineWidth = 5;
                  ctx.lineJoin = "round";
                  ctx.strokeText(lineText, width / 2, lineY);
                  ctx.fillStyle = "#FFFFFF";
                  ctx.fillText(lineText, width / 2, lineY);
                }
                ctx.restore();
              }
            }

            // 5. Render Watermark (if provided)
            if (watermark) {
              ctx.save();
              ctx.font = '600 24px "Segoe UI", Montserrat, -apple-system, Roboto, Arial, sans-serif';
              ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
              ctx.textAlign = "right";
              ctx.textBaseline = "top";
              ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
              ctx.shadowBlur = 6;
              ctx.fillText(watermark, width - 45, 36);
              ctx.restore();
            }

            const timestampMicrosec = Math.round(f * frameDurationMicrosec);
            const isKeyFrame = f % (fps * 2) === 0;

            // Instantiate VideoFrame from OffscreenCanvas
            const videoFrame = new VideoFrame(offscreen, {
              timestamp: timestampMicrosec,
              duration: Math.round(frameDurationMicrosec)
            });

            // Zero-copy encode
            videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });

            // MANDATORY: Call .close() immediately on VideoFrame to prevent memory leaks!
            videoFrame.close();

            currentFrameIdx++;

            // Backpressure Flow Control with zero-allocation ondequeue (render.worker.ts pattern)
            if (videoEncoder.encodeQueueSize > 6) {
              await new Promise(resolve => {
                videoQueueDrainResolver = resolve;
                if (videoEncoder.encodeQueueSize <= 3) {
                  videoQueueDrainResolver = null;
                  resolve();
                }
              });
            }

            // Realtime Sliding-Window Telemetry (render.worker.ts pattern)
            if (currentFrameIdx % 15 === 0 || currentFrameIdx === totalVideoFrames) {
              const now = performance.now();
              const windowElapsedSec = (now - windowStartTime) / 1000;
              const framesInWindow = currentFrameIdx - windowStartFrame;
              if (windowElapsedSec > 0.05) {
                const currentFPS = Math.round(framesInWindow / windowElapsedSec);
                const remainingFrames = totalVideoFrames - currentFrameIdx;
                const etaSec = currentFPS > 0 ? Math.max(0, Math.round(remainingFrames / currentFPS)) : 0;
                windowStartTime = now;
                windowStartFrame = currentFrameIdx;
                updateProgress(((currentFrameIdx / totalVideoFrames) * 88.0));
                updateStatus(`[Render] Frame ${currentFrameIdx}/${totalVideoFrames} | ${currentFPS} FPS | ETA: ${etaSec}s`);
              }
            }
          }

          // Anti-Memory Leak: Close ImageBitmaps and clear sketch canvases after chunk finishes
          if (currentFullBmp) {
            currentFullBmp.close();
            currentFullBmp = null;
          }
          if (currentComicStrip) {
            currentComicStrip.progressiveCanvas.width = 0;
            currentComicStrip.progressiveCanvas.height = 0;
            currentComicStrip.sketchCanvas.width = 0;
            currentComicStrip.sketchCanvas.height = 0;
            currentComicStrip = null;
          }
          if (bgCanvas) {
            bgCanvas.width = 0;
            bgCanvas.height = 0;
            bgCanvas = null;
          }

          const chunkElapsedSec = ((performance.now() - chunkStartTime) / 1000).toFixed(2);
          const totalVideoElapsedSec = ((performance.now() - videoRenderStartTime) / 1000).toFixed(2);
          const framesInChunk = chunkEndFrame - chunkStartFrame;
          const chunkFps = (framesInChunk / (parseFloat(chunkElapsedSec) || 0.001)).toFixed(1);
          console.log(`Chunk ${cIdx + 1}/${tl.chunks.length} rendered in ${chunkElapsedSec}s (${chunkFps} fps)`);
        }

        const totalVideoRenderSec = ((performance.now() - videoRenderStartTime) / 1000).toFixed(2);
        updateStatus(`Flushing VideoEncoder... (Video rendered in ${totalVideoRenderSec}s)`);
        await videoEncoder.flush();
        videoEncoder.close();

        // Wait for concurrent background audio encoding to complete (render.worker.ts pattern)
        updateStatus("Awaiting background audio encoding completion...");
        const audioWaitStartTime = performance.now();
        await audioEncodingPromise;
        const totalAudioSec = ((performance.now() - audioWaitStartTime) / 1000).toFixed(2);

        // 8. Finalize MP4 Muxing (Zero-RAM Stream Completion)
        updateStatus("Finalizing MP4 Muxer (Writing moov metadata & flushing stream)...");
        updateProgress(92.0);
        const muxStartTime = performance.now();
        muxer.finalize();
        const totalMuxSec = ((performance.now() - muxStartTime) / 1000).toFixed(2);

        // Await all in-flight streamed chunks to finish writing sequentially to disk
        const saveStartTime = performance.now();
        updateStatus(`Flushing ${streamChunkCount} streamed chunks to disk...`);
        await streamChain;
        if (streamWriteError) throw streamWriteError;

        const finishRes = await fetch("/save-finish", { method: "POST" });
        const finishData = await finishRes.json();
        const finalSizeMB = (finishData.totalSize / (1024 * 1024)).toFixed(2);
        const totalSaveSec = ((performance.now() - saveStartTime) / 1000).toFixed(2);

        updateStatus(`Video successfully streamed & saved to disk in ${totalSaveSec}s (${finalSizeMB} MB)!`);
        updateProgress(100.0);

        return {
          totalFrames: currentFrameIdx,
          sizeMB: finalSizeMB,
          durationSec: totalDuration,
          timings: {
            videoRenderSec: totalVideoRenderSec,
            audioSec: totalAudioSec,
            muxSec: totalMuxSec,
            saveDiskSec: totalSaveSec
          }
        };
      } finally {
        // Strict Fail-Safe Cleanup for GPU/VRAM & Encoders (render.worker.ts pattern)
        if (currentFullBmp) {
          try { currentFullBmp.close(); } catch (e) {}
          currentFullBmp = null;
        }
        if (pencilBmp) {
          try { pencilBmp.close(); } catch (e) {}
          pencilBmp = null;
        }
        if (currentComicStrip) {
          try {
            currentComicStrip.progressiveCanvas.width = 0;
            currentComicStrip.progressiveCanvas.height = 0;
            currentComicStrip.sketchCanvas.width = 0;
            currentComicStrip.sketchCanvas.height = 0;
          } catch (e) {}
          currentComicStrip = null;
        }
        if (bgCanvas) {
          try {
            bgCanvas.width = 0;
            bgCanvas.height = 0;
          } catch (e) {}
          bgCanvas = null;
        }
        try {
          if (videoEncoder.state !== "closed") videoEncoder.close();
        } catch (e) {}
        try {
          if (audioEncoder.state !== "closed") audioEncoder.close();
        } catch (e) {}
      }
    }, {
      width: 1920,
      height: 1080,
      fps: 30,
      bitrate: 3_000_000,
      animationMode: ANIMATION_MODE,
      panelsPerImage: PANELS_PER_IMAGE,
      subtitles: parsedSubtitles,
      zoomScale: ZOOM_SCALE,
      panDrift: PAN_DRIFT,
      watermark: WATERMARK_TEXT
    });

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const speedRatio = (renderStats.durationSec / (parseFloat(totalElapsed) || 0.01)).toFixed(1);
    const avgFps = (renderStats.totalFrames / (parseFloat(renderStats.timings.videoRenderSec) || 0.01)).toFixed(1);

    console.log("\n" + "=".repeat(62));
    console.log("  ⏱️  RENDER TIMING & PERFORMANCE SUMMARY");
    console.log("=".repeat(62));
    console.log(`  🎞️  Render Chunks (Video) : ${renderStats.timings.videoRenderSec}s (${avgFps} avg fps)`);
    console.log(`  🎵  Encode Audio          : ${renderStats.timings.audioSec}s`);
    console.log(`  📦  MP4 Muxer Finalize    : ${renderStats.timings.muxSec}s`);
    console.log(`  💾  Merge Chunks to Disk  : ${renderStats.timings.saveDiskSec}s (${renderStats.sizeMB} MB)`);
    console.log("  " + "-".repeat(58));
    console.log(`  ⚡  Total Time Elapsed    : ${totalElapsed}s (${speedRatio}x Realtime Speed)`);
    console.log(`  📁  Output File           : ${OUTPUT_VIDEO_PATH}`);
    console.log("=".repeat(62) + "\n");

    await browser.close();
    server.close();
  } catch (err) {
    console.error("Render failed:", err);
    await browser.close();
    server.close();
    process.exit(1);
  }
});
