import os
import sys
import glob
import subprocess
import json
import re
from PIL import Image
from mutagen.mp3 import MP3

PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
target_env = os.environ.get("TARGET_DIR", "channel_1/video_01_what_did_ancient_humans_actually_dream_about")
VIDEO_DIR = os.path.abspath(target_env) if os.path.isabs(target_env) else os.path.join(PROJECT_ROOT, target_env)
IMAGES_DIR = os.path.join(VIDEO_DIR, "images")
UPSCALED_DIR = os.path.join(VIDEO_DIR, "upscaled")
PANELS_DIR = os.path.join(VIDEO_DIR, "panels")
LRC_PATH = os.path.join(VIDEO_DIR, "timestamp.lrc")
VO_PATH = os.path.join(VIDEO_DIR, "vo.mp3")
TIMELINE_PATH = os.path.join(VIDEO_DIR, "timeline.json")
REALCUGAN_DIR = os.path.join(PROJECT_ROOT, "tools/realcugan")
REALCUGAN_BIN = os.path.join(REALCUGAN_DIR, "realcugan-ncnn-vulkan")

os.makedirs(UPSCALED_DIR, exist_ok=True)
os.makedirs(PANELS_DIR, exist_ok=True)

# 1. Upscale images using Real-CUGAN CLI with smart caching
input_images = sorted(glob.glob(os.path.join(IMAGES_DIR, "*.png")))
if not input_images:
    input_images = sorted(glob.glob(os.path.join(IMAGES_DIR, "*.webp"))) + sorted(glob.glob(os.path.join(IMAGES_DIR, "*.jpg")))

force_reprocess = "--force" in sys.argv

print(f"Found {len(input_images)} input images.")

for idx, img_path in enumerate(input_images, 1):
    base_webp = f"img_{idx:02d}.webp"
    out_webp_path = os.path.join(UPSCALED_DIR, base_webp)
    temp_png = os.path.join(UPSCALED_DIR, f"temp_{idx:02d}.png")
    
    if os.path.exists(out_webp_path) and os.path.getsize(out_webp_path) > 0 and not force_reprocess:
        print(f"[{idx}/{len(input_images)}] (Cached) {base_webp} already upscaled, skipping Real-CUGAN.")
        continue

    print(f"[{idx}/{len(input_images)}] Real-CUGAN upscaling {os.path.basename(img_path)} -> {base_webp}...")
    cmd = [
        REALCUGAN_BIN,
        "-i", os.path.abspath(img_path),
        "-o", os.path.abspath(temp_png),
        "-m", "models-se",
        "-s", "4",
        "-n", "0",
        "-f", "png"
    ]
    subprocess.run(cmd, cwd=REALCUGAN_DIR, check=True)
    
    # Convert PNG and resize to standard 4K UHD (3840x2160) for optimal rendering speed
    with Image.open(temp_png) as im:
        im_4k = im.resize((3840, 2160), Image.Resampling.LANCZOS)
        im_4k.save(out_webp_path, "WEBP", quality=95)
    if os.path.exists(temp_png):
        os.remove(temp_png)

# 2. Symmetrically crop each 4-panel image into 4 quadrants with caching
print("\nChecking 4-quadrant symmetric panels...")
panel_list = []

for idx in range(1, len(input_images) + 1):
    upscaled_path = os.path.join(UPSCALED_DIR, f"img_{idx:02d}.webp")
    if not os.path.exists(upscaled_path):
        continue

    quadrants = [
        ("01", "Top-Left"),
        ("02", "Top-Right"),
        ("03", "Bottom-Left"),
        ("04", "Bottom-Right"),
    ]
    
    # Check if all 4 panels exist
    all_panels_exist = all(
        os.path.exists(os.path.join(PANELS_DIR, f"panel_{idx:02d}_{q_idx}.webp"))
        and os.path.getsize(os.path.join(PANELS_DIR, f"panel_{idx:02d}_{q_idx}.webp")) > 0
        for q_idx, _ in quadrants
    )

    if all_panels_exist and not force_reprocess:
        for q_idx, _ in quadrants:
            panel_list.append(os.path.join(PANELS_DIR, f"panel_{idx:02d}_{q_idx}.webp"))
        continue

    with Image.open(upscaled_path) as im:
        W, H = im.size
        mid_x = W // 2
        mid_y = H // 2
        
        crop_boxes = [
            ("01", (0, 0, mid_x, mid_y)),        # Top-Left
            ("02", (mid_x, 0, W, mid_y)),        # Top-Right
            ("03", (0, mid_y, mid_x, H)),        # Bottom-Left
            ("04", (mid_x, mid_y, W, H)),        # Bottom-Right
        ]
        
        for q_idx, box in crop_boxes:
            panel_name = f"panel_{idx:02d}_{q_idx}.webp"
            panel_path = os.path.join(PANELS_DIR, panel_name)
            cropped = im.crop(box)
            cropped.save(panel_path, "WEBP", quality=95)
            panel_list.append(panel_path)
            print(f"Saved: {panel_name} ({cropped.size[0]}x{cropped.size[1]})")

print(f"\nAll {len(panel_list)} panels verified & ready.")

# 3. Parse LRC and calculate chunk durations
audio = MP3(VO_PATH)
total_audio_duration = audio.info.length
print(f"Total audio duration: {total_audio_duration:.3f}s")

timestamps = []
with open(LRC_PATH, "r") as f:
    for line in f:
        match = re.match(r"\[(\d+):(\d+\.\d+)\](.*)", line)
        if match:
            mins = int(match.group(1))
            secs = float(match.group(2))
            text = match.group(3).strip()
            total_sec = mins * 60 + secs
            timestamps.append({"time": total_sec, "text": text})

print(f"Parsed {len(timestamps)} timestamps from LRC.")

chunks = []
all_panels_timeline = []

for i in range(len(timestamps)):
    start_time = timestamps[i]["time"]
    end_time = timestamps[i+1]["time"] if i + 1 < len(timestamps) else total_audio_duration
    duration = end_time - start_time
    chunk_idx = i + 1
    
    sub_duration = duration / 4.0
    chunk_panels = []
    
    for p in range(1, 5):
        panel_file = f"panel_{chunk_idx:02d}_{p:02d}.webp"
        p_start = start_time + (p - 1) * sub_duration
        p_end = start_time + p * sub_duration
        panel_info = {
            "panelIndex": (chunk_idx - 1) * 4 + p,
            "chunkIndex": chunk_idx,
            "subIndex": p,
            "file": panel_file,
            "path": os.path.join(PANELS_DIR, panel_file),
            "startTime": round(p_start, 4),
            "endTime": round(p_end, 4),
            "duration": round(sub_duration, 4)
        }
        chunk_panels.append(panel_info)
        all_panels_timeline.append(panel_info)
        
    chunks.append({
        "chunkIndex": chunk_idx,
        "startTime": round(start_time, 4),
        "endTime": round(end_time, 4),
        "duration": round(duration, 4),
        "text": timestamps[i]["text"],
        "panels": chunk_panels
    })

timeline_data = {
    "totalAudioDuration": round(total_audio_duration, 4),
    "audioFile": "vo.mp3",
    "totalChunks": len(chunks),
    "totalPanels": len(all_panels_timeline),
    "chunks": chunks,
    "panelsTimeline": all_panels_timeline
}

with open(TIMELINE_PATH, "w") as f:
    json.dump(timeline_data, f, indent=2)

print(f"Timeline saved to {TIMELINE_PATH}.")
