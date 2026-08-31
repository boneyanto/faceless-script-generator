#!/usr/bin/env bash
set -e

# Usage: ./render.sh [channel_x/video_xx_topic]
# Example: ./render.sh channel_1/video_01_what_did_ancient_humans_actually_dream_about

TARGET_DIR="${1:-channel_1/video_01_what_did_ancient_humans_actually_dream_about}"

echo "============================================================"
echo "  🎬 FACELESS VIDEO GENERATOR PIPELINE (WebCodecs + Real-CUGAN)"
echo "============================================================"
echo "🎯 Target Folder: ${TARGET_DIR}"

if [ ! -d "${TARGET_DIR}" ]; then
  echo "❌ Error: Directory '${TARGET_DIR}' not found!"
  exit 1
fi

if [ ! -d "${TARGET_DIR}/images" ]; then
  echo "❌ Error: '${TARGET_DIR}/images' directory not found!"
  exit 1
fi

if [ ! -f "${TARGET_DIR}/timestamp.lrc" ]; then
  echo "❌ Error: '${TARGET_DIR}/timestamp.lrc' not found!"
  exit 1
fi

if [ ! -f "${TARGET_DIR}/vo.mp3" ]; then
  echo "❌ Error: '${TARGET_DIR}/vo.mp3' not found!"
  exit 1
fi

# 1. Check & Setup Python .venv
if [ ! -d ".venv" ]; then
  echo "📦 Setting up Python .venv..."
  python3 -m venv .venv
  .venv/bin/pip install --upgrade pip pillow mutagen requests
fi

# 2. Check Node dependencies via pnpm
if [ ! -d "node_modules" ]; then
  echo "📦 Installing Node dependencies via pnpm..."
  pnpm install
  pnpm exec playwright install chromium
fi

# 3. Ensure Real-CUGAN binary is executable and quarantine removed
if [ -f "tools/realcugan/realcugan-ncnn-vulkan" ]; then
  chmod +x tools/realcugan/realcugan-ncnn-vulkan
  xattr -cr tools/realcugan 2>/dev/null || true
fi

# 4. Run Image Preparation (AI Real-CUGAN Neural Line Smoothing & 2K Upscaling)
echo ""
echo "🚀 [Step 1/2] Processing images with AI Real-CUGAN (Neural Line Smoothing & Denoising)..."
UPSCALE_MODE="${UPSCALE_MODE:-cugan_2x}" TARGET_DIR="${TARGET_DIR}" .venv/bin/python process_images.py "$@"

# 5. Run WebCodecs Video Rendering Engine (No FFmpeg)
echo ""
echo "🚀 [Step 2/2] Rendering Video with WebCodecs API (OffscreenCanvas + Zero-Copy)..."
ANIMATION_MODE="${2:-${ANIMATION_MODE:-sketch}}" TARGET_DIR="${TARGET_DIR}" node render_engine.mjs

echo ""
echo "============================================================"
echo "  ✅ VIDEO RENDERING COMPLETE!"
echo "  📁 Output: ${TARGET_DIR}/output_video.mp4"
echo "============================================================"
