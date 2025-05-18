#!/usr/bin/env bash
# make_loop.sh PROMPT_FILE OUT_BASENAME
#
# 例: ./make_loop.sh prompts.txt neon_city

set -e
PROMPT_FILE=$1
BASENAME=$2
LEN=30             # 秒
FPS=24
WIDTH=960          # SkyReels 既定(≒540p * 16:9)
HEIGHT=540

# 0. パス設定
TOOLS=~/tools
SRVENV="$TOOLS/skyreels-venv"
DFENV="$TOOLS/deflick-venv"
OUT_DIR=$(pwd)/output_${BASENAME}
mkdir -p "$OUT_DIR"

# 1. SkyReels V2 生成 (raw 24 fps mp4)
source "$SRVENV/bin/activate"
python "$TOOLS/skyreels-v2/run.py" \
  --prompt-file "$PROMPT_FILE" \
  --fps $FPS --duration $LEN \
  --width $WIDTH --height $HEIGHT \
  --seed 42 --out "$OUT_DIR/src.mp4"
deactivate

# 2. 末尾 0.5 s & 先頭 0.5 s を取り出し連結 → rife input
ffmpeg -y -i "$OUT_DIR/src.mp4" -filter_complex \
 "[0:v]split=2[head][tail]; \
  [head]trim=0:0.5,setpts=PTS-STARTPTS[H]; \
  [tail]trim=end=0.5,setpts=PTS-STARTPTS[T]; \
  [T][H]concat=n=2:v=1:a=0,format=yuv420p10le[out]" \
 -map "[out]" "$OUT_DIR/head_tail.yuv"

# 3. RIFE 4.22 Bidirectional 12 f 補間
"$TOOLS/rife-ncnn-vulkan/build/rife-ncnn-vulkan" \
  -i "$OUT_DIR/head_tail.yuv" \
  -o "$OUT_DIR/rife.yuv" -f 12 -w $WIDTH -h $HEIGHT --loop 2

# 4. Poisson ブレンド + 再統合
python fuse_blend.py "$OUT_DIR/src.mp4" "$OUT_DIR/rife.yuv" \
  "$OUT_DIR/fused.mp4" --fps $FPS

# 5. Deflicker
source "$DFENV/bin/activate"
python deflicker.py --in "$OUT_DIR/fused.mp4" --out "$OUT_DIR/clean.mp4"
deactivate

# 6. アップスケール → 4K
"$TOOLS/Real-ESRGAN-ncnn-vulkan/build/realesrgan-ncnn-vulkan" \
  -i "$OUT_DIR/clean.mp4" -o "$OUT_DIR/4k.mp4" -n realesr-animevideov3 \
  -s 4 -f mp4 -p 60

# 7. 最終エンコード (H.265 Main10 4K60p)
ffmpeg -y -i "$OUT_DIR/4k.mp4" -vf "fps=60,scale=3840:2160" \
  -c:v hevc_nvenc -profile:v main10 -rc vbr_hq -b:v 32M -pix_fmt yuv420p10le \
  -movflags +faststart "$OUT_DIR/${BASENAME}_loop_4k60.mp4"

echo "🎉 完成: $OUT_DIR/${BASENAME}_loop_4k60.mp4"
