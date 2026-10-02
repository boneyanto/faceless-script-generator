#!/usr/bin/env bash
set -e

# ============================================================
# Usage: ./render.sh [channel_x/video_xx_topic] [options]
#
# Options:
#   --no-upscale, --fast, -f     : Skip Real-CUGAN AI upscaling (Direct WebP, ~0.05s/img)
#   --fast-2k, --2k              : Quick Lanczos 2K Resampling (~0.3s/img)
#   --cugan-2x                   : Real-CUGAN 2K AI line-smoothing (Default)
#   --cugan-4x                   : Real-CUGAN 4K AI upscale
#   --force                      : Force reprocess images even if cached
#   --zoom, --zoom-pan           : Use Zoom & Pan camera instead of Sketch
#   --sketch                     : Use Pencil Sketch Animation (Default)
#   --single                     : 1 panel/image per chunk (Default is 4 panels/quadrants)
#   --no-subs, --no-subtitles    : Disable burned-in subtitles (Enabled by default)
#   --subs <file>                : Specify custom subtitle file (.lrc, .srt, .vtt)
#   --watermark <text>, -w       : Add semi-transparent text watermark on video
#   --zoom-scale <value>         : Custom zoom intensity (Default: 0.04 = 4%)
#   --pan-drift <value>          : Custom pan camera drift (Default: 0.015 = 1.5%)
# ============================================================

TARGET_DIR=""
UPSCALE_FLAG="${UPSCALE_MODE:-cugan_2x}"
ANIMATION_MODE="${ANIMATION_MODE:-sketch}"
ENABLE_SUBTITLES="${ENABLE_SUBTITLES:-1}"
SUBTITLE_FILE="${SUBTITLE_FILE:-}"
WATERMARK_TEXT="${WATERMARK_TEXT:-}"
ZOOM_SCALE="${ZOOM_SCALE:-0.04}"
PAN_DRIFT="${PAN_DRIFT:-0.015}"
EXTRA_PY_ARGS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --no-upscale|--none|--skip-upscale|--no-cugan|--fast|-f)
      UPSCALE_FLAG="none"
      EXTRA_PY_ARGS+=("$1")
      shift
      ;;
    --fast-2k|--2k)
      UPSCALE_FLAG="fast_2k"
      EXTRA_PY_ARGS+=("$1")
      shift
      ;;
    --cugan-2x|--cugan2x)
      UPSCALE_FLAG="cugan_2x"
      EXTRA_PY_ARGS+=("$1")
      shift
      ;;
    --cugan-4x|--cugan4x|--cugan)
      UPSCALE_FLAG="cugan_4x"
      EXTRA_PY_ARGS+=("$1")
      shift
      ;;
    --force)
      EXTRA_PY_ARGS+=("--force")
      shift
      ;;
    --zoom|--zoom-pan|zoom_pan|zoom)
      ANIMATION_MODE="zoom_pan"
      shift
      ;;
    --sketch|sketch)
      ANIMATION_MODE="sketch"
      shift
      ;;
    --single|--single-panel|--1-panel)
      PANELS_PER_IMAGE=1
      shift
      ;;
    --no-subtitles|--no-subs|--no-sub)
      ENABLE_SUBTITLES=0
      shift
      ;;
    --subs|--subtitles)
      SUBTITLE_FILE="$2"
      shift 2
      ;;
    --watermark|-w)
      WATERMARK_TEXT="$2"
      shift 2
      ;;
    --zoom-scale|--zoom-level)
      ZOOM_SCALE="$2"
      shift 2
      ;;
    --pan-drift|--pan)
      PAN_DRIFT="$2"
      shift 2
      ;;
    -*)
      EXTRA_PY_ARGS+=("$1")
      shift
      ;;
    *)
      if [ -z "$TARGET_DIR" ]; then
        TARGET_DIR="$1"
      else
        EXTRA_PY_ARGS+=("$1")
      fi
      shift
      ;;
  esac
done

TARGET_DIR="${TARGET_DIR:-channel_1/video_01_what_did_ancient_humans_actually_dream_about}"

echo "============================================================"
echo "  🎬 FACELESS VIDEO GENERATOR PIPELINE (WebCodecs GPU)"
echo "============================================================"
echo "🎯 Target Folder  : ${TARGET_DIR}"
echo "⚡ Upscale Mode   : ${UPSCALE_FLAG}"
echo "🎨 Animation Mode : ${ANIMATION_MODE}"
echo "💬 Subtitles      : $([ "${ENABLE_SUBTITLES}" = "1" ] && echo "Enabled" || echo "Disabled")"
if [ -n "${WATERMARK_TEXT}" ]; then
  echo "🏷️  Watermark     : \"${WATERMARK_TEXT}\""
fi
if [ "${ANIMATION_MODE}" = "zoom_pan" ]; then
  echo "🔍 Zoom Scale     : ${ZOOM_SCALE} | Pan Drift: ${PAN_DRIFT}"
fi
echo "============================================================"

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

# 4. Run Image Preparation
echo ""
echo "🚀 [Step 1/2] Processing images (Mode: ${UPSCALE_FLAG})..."
UPSCALE_MODE="${UPSCALE_FLAG}" TARGET_DIR="${TARGET_DIR}" .venv/bin/python process_images.py "${EXTRA_PY_ARGS[@]}"

# 5. Run WebCodecs Video Rendering Engine (No FFmpeg)
echo ""
echo "🚀 [Step 2/2] Rendering Video with WebCodecs API (${ANIMATION_MODE} mode)..."
ANIMATION_MODE="${ANIMATION_MODE}" TARGET_DIR="${TARGET_DIR}" PANELS_PER_IMAGE="${PANELS_PER_IMAGE:-4}" ENABLE_SUBTITLES="${ENABLE_SUBTITLES}" SUBTITLE_FILE="${SUBTITLE_FILE}" ZOOM_SCALE="${ZOOM_SCALE}" PAN_DRIFT="${PAN_DRIFT}" WATERMARK_TEXT="${WATERMARK_TEXT}" node render_engine.mjs

echo ""
echo "============================================================"
echo "  ✅ VIDEO RENDERING COMPLETE!"
echo "  📁 Output: ${TARGET_DIR}/output_video.mp4"
echo "============================================================"
