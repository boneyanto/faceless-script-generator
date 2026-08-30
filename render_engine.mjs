import http from "http";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const PROJECT_ROOT = path.resolve(".");
const ASSETS_DIR = path.join(PROJECT_ROOT, "assets");
const ANIMATION_MODE = process.env.ANIMATION_MODE || "sketch";

const targetEnv = process.env.TARGET_DIR || "channel_1/video_01_what_did_ancient_humans_actually_dream_about";
const VIDEO_DIR = path.resolve(targetEnv);
const TIMELINE_PATH = path.join(VIDEO_DIR, "timeline.json");
const OUTPUT_VIDEO_PATH = path.join(VIDEO_DIR, "output_video.mp4");
const MP4_MUXER_PATH = path.resolve("node_modules/mp4-muxer/build/mp4-muxer.js");

if (!fs.existsSync(TIMELINE_PATH)) {
  console.error("timeline.json not found! Run process_images.py first.");
  process.exit(1);
}

const timeline = JSON.parse(fs.readFileSync(TIMELINE_PATH, "utf-8"));
const totalAudioDuration = timeline.totalAudioDuration;
console.log(`Loaded timeline. Total duration: ${totalAudioDuration}s, Chunks: ${timeline.chunks.length}`);
console.log(`Animation mode: ${ANIMATION_MODE}`);

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
  
  if (urlPath.startsWith("/panels/")) {
    const filename = path.basename(urlPath);
    const filePath = path.join(VIDEO_DIR, "panels", filename);
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { "Content-Type": "image/webp" });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
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
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "POST" && urlPath === "/save-chunk") {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => {
      const data = Buffer.concat(chunks);
      fs.appendFileSync(OUTPUT_VIDEO_PATH, data);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, written: data.length }));
    });
    return;
  }

  if (req.method === "POST" && urlPath === "/save-finish") {
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
    const renderStats = await page.evaluate(async ({ width, height, fps, bitrate, animationMode }) => {
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

      // 3. Initialize MP4 Muxer (Pure JS)
      updateStatus("Configuring MP4 Muxer & WebCodecs...");
      const muxer = new Mp4Muxer.Muxer({
        target: new Mp4Muxer.ArrayBufferTarget(),
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
        fastStart: "in-memory"
      });

      // 4. Initialize VideoEncoder
      let videoEncoderError = null;
      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => {
          muxer.addVideoChunk(chunk, meta);
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

      // 5. Initialize AudioEncoder
      let audioEncoderError = null;
      const audioEncoder = new AudioEncoder({
        output: (chunk, meta) => {
          muxer.addAudioChunk(chunk, meta);
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

      // 7. Render Video Chunks (with Anti-Memory Leak & Backpressure Queue Management)
      const totalDuration = audioDuration;
      const totalVideoFrames = Math.ceil(totalDuration * fps);
      const frameDurationMicrosec = (1 / fps) * 1_000_000;

      updateStatus(`Rendering ${tl.chunks.length} chunks (${totalVideoFrames} video frames @ ${fps} fps)...`);

      let currentFrameIdx = 0;
      const videoRenderStartTime = performance.now();

      for (let cIdx = 0; cIdx < tl.chunks.length; cIdx++) {
        const chunkStartTime = performance.now();
        const chunk = tl.chunks[cIdx];
        const chunkStartSec = chunk.startTime;
        const chunkEndSec = chunk.endTime;
        const chunkDuration = Math.max(0.1, chunkEndSec - chunkStartSec);

        // Load full 4-panel image (upscaled) if sketch mode, or fallback to sliced panels
        let fullBmp = null;
        let comicStrip = null;

        if (animationMode === "sketch" && pencilBmp) {
          const fullImgFile = chunk.fullImage || `img_${cIdx + 1 < 10 ? '0' : ''}${cIdx + 1}.webp`;
          try {
            const fBlob = await (await fetch(`/upscaled/${fullImgFile}`)).blob();
            fullBmp = await createImageBitmap(fBlob);
            comicStrip = prepareComicStrip(fullBmp, width, height);
          } catch (e) {
            console.warn("Could not load full upscaled image, falling back to panels:", e);
          }
        }

        // Fallback or zoom_pan: load sliced panels
        const bitmaps = [];
        if (!comicStrip) {
          for (let pIdx = 0; pIdx < chunk.panels.length; pIdx++) {
            const panel = chunk.panels[pIdx];
            const imgBlob = await (await fetch(`/panels/${panel.file}`)).blob();
            const bmp = await createImageBitmap(imgBlob);
            bitmaps.push({ bmp, panel });
          }
        }

        const chunkStartFrame = Math.round(chunkStartSec * fps);
        const chunkEndFrame = Math.min(totalVideoFrames, Math.round(chunkEndSec * fps));

        for (let f = chunkStartFrame; f < chunkEndFrame; f++) {
          if (videoEncoderError) throw videoEncoderError;

          const currentSec = f / fps;
          const chunkProgress = Math.min(1.0, Math.max(0.0, (currentSec - chunkStartSec) / chunkDuration));

          if (comicStrip && fullBmp) {
            // Gaya 1: Full-Canvas Comic Strip (Kamera Statis / Subtle Drift)
            // Subtle breathing and cinematic drift across the whole comic sheet
            const scale = 1.02 + Math.sin(chunkProgress * Math.PI) * 0.02;
            const panX = (0.5 - chunkProgress) * (width * 0.015);
            const panY = (0.5 - chunkProgress) * (height * 0.015);

            // Determine active quadrant q in [0, 1, 2, 3] (each takes 25% of chunk)
            const currentQ = Math.min(3, Math.floor(chunkProgress / 0.25));
            const qStart = currentQ * 0.25;
            const qProgress = Math.min(1.0, Math.max(0.0, (chunkProgress - qStart) / 0.25));

            const quadAlphas = [0, 0, 0, 0];
            // Prior quadrants are 100% full-color and fully sketched
            for (let i = 0; i < currentQ; i++) {
              quadAlphas[i] = 1.0;
              const qObj = comicStrip.quads[i];
              if (qObj.drawnCount < qObj.points.length) {
                comicStrip.progressiveCtx.save();
                comicStrip.progressiveCtx.beginPath();
                comicStrip.progressiveCtx.rect(qObj.rect.x, qObj.rect.y, qObj.rect.w, qObj.rect.h);
                comicStrip.progressiveCtx.clip();
                comicStrip.progressiveCtx.drawImage(comicStrip.sketchCanvas, 0, 0);
                comicStrip.progressiveCtx.restore();
                qObj.drawnCount = qObj.points.length;
              }
            }

            let pencilAlpha = 0;
            let penX = comicStrip.lastPenX;
            let penY = comicStrip.lastPenY;

            // Current quadrant progress:
            // 0.00 -> 0.72: Sketching phase of current quadrant (continuous strokes)
            // 0.72 -> 0.95: Color wash phase of current quadrant
            // 0.95 -> 1.00: Hold / transition to next quadrant
            const activeQObj = comicStrip.quads[currentQ];
            const qPoints = activeQObj.points;
            const totalPts = qPoints.length;

            if (qProgress <= 0.72) {
              const sketchRatio = qProgress / 0.72;
              const targetPoints = Math.floor(sketchRatio * totalPts);

              while (activeQObj.drawnCount < targetPoints && activeQObj.drawnCount < totalPts) {
                const curPt = qPoints[activeQObj.drawnCount];
                const prevPt = activeQObj.drawnCount > 0 ? qPoints[activeQObj.drawnCount - 1] : curPt;
                // If continuing stroke (!isStart), draw connected capsule. If pen lift (isStart), start fresh at curPt!
                if (!curPt.isStart && activeQObj.drawnCount > 0) {
                  const prevPt = qPoints[activeQObj.drawnCount - 1];
                  revealCapsule(comicStrip.progressiveCtx, comicStrip.sketchCanvas, prevPt.x, prevPt.y, curPt.x, curPt.y, 14);
                } else {
                  revealCapsule(comicStrip.progressiveCtx, comicStrip.sketchCanvas, curPt.x, curPt.y, curPt.x, curPt.y, 14);
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
              comicStrip.lastPenX = penX;
              comicStrip.lastPenY = penY;
              pencilAlpha = 1.0;
              quadAlphas[currentQ] = 0.0;
            } else if (qProgress <= 0.95) {
              // Ensure full quadrant sketch is revealed cleanly before color wash
              if (activeQObj.drawnCount < totalPts) {
                comicStrip.progressiveCtx.save();
                comicStrip.progressiveCtx.beginPath();
                comicStrip.progressiveCtx.rect(activeQObj.rect.x, activeQObj.rect.y, activeQObj.rect.w, activeQObj.rect.h);
                comicStrip.progressiveCtx.clip();
                comicStrip.progressiveCtx.drawImage(comicStrip.sketchCanvas, 0, 0);
                comicStrip.progressiveCtx.restore();
                activeQObj.drawnCount = totalPts;
              }

              const revealRatio = (qProgress - 0.72) / 0.23;
              quadAlphas[currentQ] = revealRatio * revealRatio * (3 - 2 * revealRatio);

              if (currentQ < 3) {
                // Move pencil smoothly towards starting point of next quadrant
                const nextQObj = comicStrip.quads[currentQ + 1];
                const startPt = nextQObj.points[0];
                const tMove = revealRatio;
                penX = comicStrip.lastPenX * (1 - tMove) + startPt.x * tMove;
                penY = comicStrip.lastPenY * (1 - tMove) + startPt.y * tMove;
                pencilAlpha = 1.0;
              } else {
                // Final quadrant (Q3): pencil smoothly slides down-right off screen
                const exitSlide = revealRatio * (height * 0.75);
                penX = comicStrip.lastPenX + exitSlide * 0.6;
                penY = comicStrip.lastPenY + exitSlide;
                pencilAlpha = Math.max(0, 1.0 - revealRatio * 1.5);
              }
            } else {
              // 0.95 -> 1.00: Quad completed
              quadAlphas[currentQ] = 1.0;
              if (currentQ < 3) {
                const nextQObj = comicStrip.quads[currentQ + 1];
                penX = nextQObj.points[0].x;
                penY = nextQObj.points[0].y;
                comicStrip.lastPenX = penX;
                comicStrip.lastPenY = penY;
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
            ctx.drawImage(comicStrip.progressiveCanvas, 0, 0, width, height);

            // 2. Draw colored quadrants (clipped to each quadrant's bounding rectangle)
            for (let i = 0; i <= currentQ; i++) {
              const alpha = quadAlphas[i];
              if (alpha > 0) {
                const r = comicStrip.quads[i].rect;
                ctx.save();
                ctx.beginPath();
                ctx.rect(r.x, r.y, r.w, r.h);
                ctx.clip();
                ctx.globalAlpha = alpha;
                ctx.drawImage(fullBmp, 0, 0, width, height);
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
          } else {
            // Zoom & Pan fallback
            let activeBmp = bitmaps[0].bmp;
            let activePanel = bitmaps[0].panel;
            for (let p = 0; p < bitmaps.length; p++) {
              if (currentSec >= bitmaps[p].panel.startTime && currentSec <= bitmaps[p].panel.endTime) {
                activeBmp = bitmaps[p].bmp;
                activePanel = bitmaps[p].panel;
                break;
              }
            }
            const panelDuration = Math.max(0.1, activePanel.endTime - activePanel.startTime);
            const rawProgress = Math.min(1.0, Math.max(0.0, (currentSec - activePanel.startTime) / panelDuration));
            const ease = rawProgress * rawProgress * (3 - 2 * rawProgress);
            const scale = 1.03 + ease * 0.05;
            ctx.save();
            ctx.translate(width / 2, height / 2);
            ctx.scale(scale, scale);
            ctx.translate(-width / 2, -height / 2);
            ctx.drawImage(activeBmp, 0, 0, width, height);
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

          // Backpressure Queue Management
          if (videoEncoder.encodeQueueSize > 6) {
            await new Promise(resolve => {
              const onDequeue = () => {
                if (videoEncoder.encodeQueueSize <= 2) {
                  videoEncoder.removeEventListener("dequeue", onDequeue);
                  resolve();
                }
              };
              videoEncoder.addEventListener("dequeue", onDequeue);
              if (videoEncoder.encodeQueueSize <= 2) {
                videoEncoder.removeEventListener("dequeue", onDequeue);
                resolve();
              }
            });
          }
        }

        // Anti-Memory Leak: Close ImageBitmaps and clear sketch canvases after chunk finishes
        if (fullBmp) fullBmp.close();
        if (comicStrip) {
          comicStrip.progressiveCanvas.width = 0;
          comicStrip.progressiveCanvas.height = 0;
          comicStrip.sketchCanvas.width = 0;
          comicStrip.sketchCanvas.height = 0;
        }
        for (const { bmp } of bitmaps) {
          bmp.close();
        }

        const chunkElapsedSec = ((performance.now() - chunkStartTime) / 1000).toFixed(2);
        const totalVideoElapsedSec = ((performance.now() - videoRenderStartTime) / 1000).toFixed(2);
        const framesInChunk = chunkEndFrame - chunkStartFrame;
        const chunkFps = (framesInChunk / (parseFloat(chunkElapsedSec) || 0.001)).toFixed(1);
        const progressPct = ((cIdx + 1) / tl.chunks.length) * 85.0;
        updateProgress(progressPct);
        updateStatus(`[Render] Chunk ${cIdx + 1}/${tl.chunks.length} rendered in ${chunkElapsedSec}s (${chunkFps} fps) | Video elapsed: ${totalVideoElapsedSec}s (${progressPct.toFixed(1)}%)`);
      }

      const totalVideoRenderSec = ((performance.now() - videoRenderStartTime) / 1000).toFixed(2);
      updateStatus(`Flushing VideoEncoder... (Video rendered in ${totalVideoRenderSec}s)`);
      await videoEncoder.flush();
      videoEncoder.close();
      if (pencilBmp) {
        pencilBmp.close();
      }

      // 8. Encode Audio Frames
      updateStatus("Encoding Audio Data...");
      const audioStartTime = performance.now();
      const audioChunkSize = 2048;
      
      for (let offset = 0; offset < totalAudioFrames; offset += audioChunkSize) {
        if (audioEncoderError) throw audioEncoderError;

        const currentChunkLen = Math.min(audioChunkSize, totalAudioFrames - offset);
        const planarData = new Float32Array(currentChunkLen * numberOfChannels);

        for (let ch = 0; ch < numberOfChannels; ch++) {
          const chData = decodedAudio.getChannelData(ch).subarray(offset, offset + currentChunkLen);
          planarData.set(chData, ch * currentChunkLen);
        }

        const audioTimestampMicrosec = Math.round((offset / sampleRate) * 1_000_000);
        const audioDurationMicrosec = Math.round((currentChunkLen / sampleRate) * 1_000_000);

        const audioData = new AudioData({
          format: "f32-planar",
          sampleRate: sampleRate,
          numberOfFrames: currentChunkLen,
          numberOfChannels: numberOfChannels,
          timestamp: audioTimestampMicrosec,
          data: planarData
        });

        audioEncoder.encode(audioData);
        audioData.close(); // Clean up AudioData memory

        // Backpressure check for audio
        if (audioEncoder.encodeQueueSize > 10) {
          await new Promise(resolve => {
            const onAudioDequeue = () => {
              if (audioEncoder.encodeQueueSize <= 3) {
                audioEncoder.removeEventListener("dequeue", onAudioDequeue);
                resolve();
              }
            };
            audioEncoder.addEventListener("dequeue", onAudioDequeue);
            if (audioEncoder.encodeQueueSize <= 3) {
              audioEncoder.removeEventListener("dequeue", onAudioDequeue);
              resolve();
            }
          });
        }
      }

      updateStatus("Flushing AudioEncoder...");
      await audioEncoder.flush();
      audioEncoder.close();
      const totalAudioSec = ((performance.now() - audioStartTime) / 1000).toFixed(2);
      updateStatus(`Audio encoding completed in ${totalAudioSec}s`);

      // 9. Finalize MP4 Muxing
      updateStatus("Finalizing MP4 Muxer...");
      updateProgress(90.0);
      const muxStartTime = performance.now();
      muxer.finalize();
      const totalMuxSec = ((performance.now() - muxStartTime) / 1000).toFixed(2);

      const { buffer } = muxer.target;
      const finalSizeMB = (buffer.byteLength / (1024 * 1024)).toFixed(2);
      updateStatus(`Muxing complete in ${totalMuxSec}s! Merging & streaming ${finalSizeMB} MB in 8MB chunks to disk...`);

      // Stream binary data in safe 8MB chunks (avoids browser IPC / string length crash!)
      const saveStartTime = performance.now();
      await fetch("/save-start", { method: "POST" });
      const totalBytes = buffer.byteLength;
      const uploadChunkSize = 8 * 1024 * 1024; // 8MB
      const totalChunksToMerge = Math.ceil(totalBytes / uploadChunkSize);
      let mergedCount = 0;
      for (let offset = 0; offset < totalBytes; offset += uploadChunkSize) {
        const sliceStartTime = performance.now();
        const slice = buffer.slice(offset, offset + uploadChunkSize);
        await fetch("/save-chunk", {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: slice
        });
        mergedCount++;
        const sliceElapsed = ((performance.now() - sliceStartTime) / 1000).toFixed(2);
        const mergeElapsedSoFar = ((performance.now() - saveStartTime) / 1000).toFixed(2);
        const uploadPct = 90.0 + ((offset + slice.byteLength) / totalBytes) * 9.0;
        updateProgress(uploadPct);
        console.log(`[Merge Disk] Merged chunk ${mergedCount}/${totalChunksToMerge} (8MB) in ${sliceElapsed}s | Total merge elapsed: ${mergeElapsedSoFar}s`);
      }

      await fetch("/save-finish", { method: "POST" });
      const totalSaveSec = ((performance.now() - saveStartTime) / 1000).toFixed(2);

      updateStatus(`Video successfully merged & saved to disk in ${totalSaveSec}s!`);
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
    }, {
      width: 1920,
      height: 1080,
      fps: 30,
      bitrate: 3_000_000,
      animationMode: ANIMATION_MODE
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
