import http from "http";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

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

// Simple HTTP server to serve images, audio, mp4-muxer, and html
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

  let outputWriteStream = null;

  if (req.method === "POST" && urlPath === "/save-chunk") {
    if (!outputWriteStream) {
      outputWriteStream = fs.createWriteStream(OUTPUT_VIDEO_PATH);
    }
    req.pipe(outputWriteStream, { end: false });
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  if (req.method === "POST" && urlPath === "/save-finish") {
    if (outputWriteStream) {
      outputWriteStream.end();
      outputWriteStream = null;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
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
  
  console.log("Launching headless Chromium for WebCodecs execution...");
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--enable-blink-features=WebCodecs",
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
    const renderStats = await page.evaluate(async ({ width, height, fps, bitrate }) => {
      const updateStatus = (text) => {
        const el = document.getElementById("status");
        if (el) el.innerText = text;
        console.log(text);
      };
      
      const updateProgress = (pct) => {
        const el = document.getElementById("progress");
        if (el) el.innerText = `${pct.toFixed(1)}%`;
      };

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
        latencyMode: "quality"
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

      // 6. Setup OffscreenCanvas
      const offscreen = new OffscreenCanvas(width, height);
      const ctx = offscreen.getContext("2d", { willReadFrequently: false });

      // 7. Render Video Chunks (with Anti-Memory Leak & Backpressure Queue Management)
      const totalDuration = audioDuration;
      const totalVideoFrames = Math.ceil(totalDuration * fps);
      const frameDurationMicrosec = (1 / fps) * 1_000_000;

      updateStatus(`Rendering ${tl.chunks.length} chunks (${totalVideoFrames} video frames @ ${fps} fps)...`);

      let currentFrameIdx = 0;

      for (let cIdx = 0; cIdx < tl.chunks.length; cIdx++) {
        const chunk = tl.chunks[cIdx];
        const chunkStartSec = chunk.startTime;
        const chunkEndSec = chunk.endTime;
        
        // Load the 4 panel images for this chunk as ImageBitmaps
        const bitmaps = [];
        for (let pIdx = 0; pIdx < chunk.panels.length; pIdx++) {
          const panel = chunk.panels[pIdx];
          const imgBlob = await (await fetch(`/panels/${panel.file}`)).blob();
          const bmp = await createImageBitmap(imgBlob);
          bitmaps.push({ bmp, panel });
        }

        const chunkStartFrame = Math.round(chunkStartSec * fps);
        const chunkEndFrame = Math.min(totalVideoFrames, Math.round(chunkEndSec * fps));

        for (let f = chunkStartFrame; f < chunkEndFrame; f++) {
          if (videoEncoderError) throw videoEncoderError;

          const currentSec = f / fps;
          
          // Find which of the 4 panels is active at currentSec and its timing
          let activeBmp = bitmaps[0].bmp;
          let activePanel = bitmaps[0].panel;
          for (let p = 0; p < bitmaps.length; p++) {
            if (currentSec >= bitmaps[p].panel.startTime && currentSec <= bitmaps[p].panel.endTime) {
              activeBmp = bitmaps[p].bmp;
              activePanel = bitmaps[p].panel;
              break;
            }
          }

          // Calculate normalized progress within active panel (0.0 to 1.0)
          const panelDuration = Math.max(0.1, activePanel.endTime - activePanel.startTime);
          const rawProgress = Math.min(1.0, Math.max(0.0, (currentSec - activePanel.startTime) / panelDuration));
          // Smooth easing curve (smoothstep)
          const ease = rawProgress * rawProgress * (3 - 2 * rawProgress);

          // Zero-cost dynamic camera motion variations (Kurzgesagt/Vox style Ken Burns)
          let scale = 1.04;
          let panX = 0;
          let panY = 0;
          const maxPan = width * 0.025; // 2.5% subtle horizontal drift

          if (activePanel.subIndex === 1) {
            // Motion 1: Gentle Smooth Zoom-In (1.01x -> 1.08x)
            scale = 1.01 + ease * 0.07;
          } else if (activePanel.subIndex === 2) {
            // Motion 2: Slow Cinematic Pan-Right with steady scale
            scale = 1.05;
            panX = (ease - 0.5) * maxPan;
          } else if (activePanel.subIndex === 3) {
            // Motion 3: Gentle Smooth Zoom-Out (1.08x -> 1.01x)
            scale = 1.08 - ease * 0.07;
          } else {
            // Motion 4: Slow Cinematic Pan-Left with subtle breathing
            scale = 1.03 + Math.sin(ease * Math.PI) * 0.035;
            panX = (0.5 - ease) * maxPan;
          }

          // Draw active panel with hardware-accelerated OffscreenCanvas transform (Zero copy & zero CPU penalty)
          ctx.save();
          ctx.translate(width / 2, height / 2);
          ctx.scale(scale, scale);
          ctx.translate(-width / 2 + panX, -height / 2 + panY);
          ctx.drawImage(activeBmp, 0, 0, width, height);
          ctx.restore();

          const timestampMicrosec = Math.round(f * frameDurationMicrosec);
          const isKeyFrame = f % (fps * 2) === 0; // Keyframe every 2 seconds

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

          // Backpressure Queue Management: throttle if encoder queue fills up
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

        // Anti-Memory Leak: Close ImageBitmaps after chunk finishes
        for (const { bmp } of bitmaps) {
          bmp.close();
        }

        const progressPct = ((cIdx + 1) / tl.chunks.length) * 85.0;
        updateProgress(progressPct);
        updateStatus(`Completed Chunk ${cIdx + 1}/${tl.chunks.length} (${progressPct.toFixed(1)}%)`);
      }

      updateStatus("Flushing VideoEncoder...");
      await videoEncoder.flush();
      videoEncoder.close();

      // 8. Encode Audio Frames
      updateStatus("Encoding Audio Data...");
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

      // 9. Finalize MP4 Muxing
      updateStatus("Finalizing MP4 Muxer...");
      updateProgress(90.0);
      muxer.finalize();

      const { buffer } = muxer.target;
      const finalSizeMB = (buffer.byteLength / (1024 * 1024)).toFixed(2);
      updateStatus(`Muxing complete! Streaming ${finalSizeMB} MB in 8MB chunks to disk...`);

      // Stream binary data in safe 8MB chunks (avoids browser IPC / string length crash!)
      const totalBytes = buffer.byteLength;
      const uploadChunkSize = 8 * 1024 * 1024; // 8MB
      for (let offset = 0; offset < totalBytes; offset += uploadChunkSize) {
        const slice = buffer.slice(offset, offset + uploadChunkSize);
        await fetch("/save-chunk", {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: slice
        });
        const uploadPct = 90.0 + ((offset + slice.byteLength) / totalBytes) * 9.0;
        updateProgress(uploadPct);
      }

      await fetch("/save-finish", { method: "POST" });

      updateStatus("Video successfully saved to disk!");
      updateProgress(100.0);

      return { totalFrames: currentFrameIdx, sizeMB: finalSizeMB, durationSec: totalDuration };
    }, {
      width: 1920,
      height: 1080,
      fps: 30,
      bitrate: 3_000_000
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Render completed in ${elapsed}s! Total Frames: ${renderStats.totalFrames}, Size: ${renderStats.sizeMB} MB`);
    console.log(`Successfully saved final video to: ${OUTPUT_VIDEO_PATH}`);

    await browser.close();
    server.close();
  } catch (err) {
    console.error("Render failed:", err);
    await browser.close();
    server.close();
    process.exit(1);
  }
});
