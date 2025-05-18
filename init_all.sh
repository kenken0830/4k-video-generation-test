#!/usr/bin/env bash
# プロジェクトの必要なフォルダと主要ファイルを一発作成するスクリプト
set -e

# 1. 主要ディレクトリ作成
mkdir -p input logs 02_processed 03_publish metadata loop_pipeline

# 2. loop_pipeline/ の主要ファイル生成
cd loop_pipeline

# setup_env.sh
cat <<'EOS' > setup_env.sh
#!/usr/bin/env bash
# setup_env.sh – 必要 OSS を ~/tools 以下にビルド・配置
set -e
apt-get update && apt-get -y install git build-essential pkg-config \
    ffmpeg libnvidia-encode-535 nvidia-cuda-toolkit python3-venv
mkdir -p ~/tools && cd ~/tools
# 1) SkyReels V2
git clone https://github.com/cocktailpeanut/skyreels-v2.git
python3 -m venv skyreels-venv && \
  source skyreels-venv/bin/activate && \
  pip install torch torchvision --extra-index-url https://download.pytorch.org/whl/cu118 && \
  pip install -r skyreels-v2/requirements.txt
deactivate
# 2) RIFE 4.22
git clone https://github.com/nihui/rife-ncnn-vulkan.git && cd rife-ncnn-vulkan
mkdir build && cd build && cmake .. -DNCNN_VULKAN=ON && make -j$(nproc)
cd ~/tools
# 3) Real-ESRGAN
git clone https://github.com/xinntao/Real-ESRGAN-ncnn-vulkan.git && cd Real-ESRGAN-ncnn-vulkan
mkdir build && cd build && cmake .. && make -j$(nproc)
cd ~/tools
# 4) All-in-One Deflicker
git clone https://github.com/google-research/all-in-one-deflicker.git
python3 -m venv deflick-venv && \
  source deflick-venv/bin/activate && pip install -r all-in-one-deflicker/requirements.txt
deactivate
echo "✅ 依存 OSS のセットアップ完了"
EOS
chmod +x setup_env.sh

# make_loop.sh
cat <<'EOS' > make_loop.sh
#!/usr/bin/env bash
# make_loop.sh PROMPT_FILE OUT_BASENAME
set -e
PROMPT_FILE=$1
BASENAME=$2
LEN=30
FPS=24
WIDTH=960
HEIGHT=540
TOOLS=~/tools
SRVENV="$TOOLS/skyreels-venv"
DFENV="$TOOLS/deflick-venv"
OUT_DIR=$(pwd)/output_${BASENAME}
mkdir -p "$OUT_DIR"
source "$SRVENV/bin/activate"
python "$TOOLS/skyreels-v2/run.py" \
  --prompt-file "$PROMPT_FILE" \
  --fps $FPS --duration $LEN \
  --width $WIDTH --height $HEIGHT \
  --seed 42 --out "$OUT_DIR/src.mp4"
deactivate
ffmpeg -y -i "$OUT_DIR/src.mp4" -filter_complex \
 "[0:v]split=2[head][tail]; \
  [head]trim=0:0.5,setpts=PTS-STARTPTS[H]; \
  [tail]trim=end=0.5,setpts=PTS-STARTPTS[T]; \
  [T][H]concat=n=2:v=1:a=0,format=yuv420p10le[out]" \
 -map "[out]" "$OUT_DIR/head_tail.yuv"
"$TOOLS/rife-ncnn-vulkan/build/rife-ncnn-vulkan" \
  -i "$OUT_DIR/head_tail.yuv" \
  -o "$OUT_DIR/rife.yuv" -f 12 -w $WIDTH -h $HEIGHT --loop 2
python fuse_blend.py "$OUT_DIR/src.mp4" "$OUT_DIR/rife.yuv" \
  "$OUT_DIR/fused.mp4" --fps $FPS
source "$DFENV/bin/activate"
python deflicker.py --in "$OUT_DIR/fused.mp4" --out "$OUT_DIR/clean.mp4"
deactivate
"$TOOLS/Real-ESRGAN-ncnn-vulkan/build/realesrgan-ncnn-vulkan" \
  -i "$OUT_DIR/clean.mp4" -o "$OUT_DIR/4k.mp4" -n realesr-animevideov3 \
  -s 4 -f mp4 -p 60
ffmpeg -y -i "$OUT_DIR/4k.mp4" -vf "fps=60,scale=3840:2160" \
  -c:v hevc_nvenc -profile:v main10 -rc vbr_hq -b:v 32M -pix_fmt yuv420p10le \
  -movflags +faststart "$OUT_DIR/${BASENAME}_loop_4k60.mp4"
echo "🎉 完成: $OUT_DIR/${BASENAME}_loop_4k60.mp4"
EOS
chmod +x make_loop.sh

# fuse_blend.py
cat <<'EOS' > fuse_blend.py
#!/usr/bin/env python
import subprocess, sys, cv2, numpy as np, tempfile, os, argparse
parser = argparse.ArgumentParser()
parser.add_argument("src"), parser.add_argument("interp"), parser.add_argument("out")
parser.add_argument("--fps", type=int, default=24)
args = parser.parse_args()
fps = args.fps
tmp = tempfile.mkdtemp()
subprocess.run(["ffmpeg","-y","-i",args.src,
                "-t",f"{float(os.path.getsize(args.interp))/(args.fps*args.fps*3)/2}",
                f"{tmp}/head.mp4"], check=True)
subprocess.run(["ffmpeg","-y","-s","960x540","-pix_fmt","yuv420p10le","-r",str(fps),
                "-i",args.interp,f"{tmp}/interp.mp4"],check=True)
with open(f"{tmp}/list.txt","w") as f:
    f.write(f"file '{args.src}'\n")
    f.write(f"file '{tmp}/interp.mp4'\n")
subprocess.run(["ffmpeg","-y","-f","concat","-safe","0","-i",f"{tmp}/list.txt",
                "-c","copy",f"{tmp}/concat.mp4"],check=True)
cap=cv2.VideoCapture(f"{tmp}/concat.mp4")
w=int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); h=int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fourcc=cv2.VideoWriter_fourcc(*'avc1'); out=cv2.VideoWriter(args.out,fourcc,fps,(w,h),True)
frames=[]
while True:
    ret,frm=cap.read()
    if not ret: break
    frames.append(frm)
cap.release()
n=len(frames); blend=12
for i,frm in enumerate(frames):
    if i>=n-blend:
        alpha=(i-(n-blend))/blend
        dst=frames[i]; src=frames[(i-(n-blend))]
        mask=np.ones_like(src[:,:,0])*255
        center=(w//2,h//2)
        mixed=cv2.seamlessClone(src,dst,mask,center,cv2.NORMAL_CLONE)
        out.write(cv2.addWeighted(dst,alpha,mixed,1-alpha,0))
    else:
        out.write(frm)
out.release()
EOS

# deflicker.py
cat <<'EOS' > deflicker.py
#!/usr/bin/env python
import subprocess, sys, argparse, os, tempfile, json
parser=argparse.ArgumentParser()
parser.add_argument("--in", dest="inp"), parser.add_argument("--out", dest="outp")
args=parser.parse_args()
temp=tempfile.mkdtemp()
json_cfg=os.path.join(temp,"job.json")
with open(json_cfg,"w") as f:
    json.dump({"input_path":args.inp,"output_path":args.outp,
               "window":12,"sigma":0.5},f)
subprocess.run(["python","-m","aio_deflicker.run",json_cfg],check=True)
EOS

# prompts.txt
cat <<'EOS' > prompts.txt
loop, seamless neon city street at night, anime style
EOS
cd ..

# 3. run_pipeline_v3.sh（雛形）をプロジェクト直下に生成
cat <<'EOS' > run_pipeline_v3.sh
#!/usr/bin/env bash
# run_pipeline_v3.sh 入力動画.mp4
set -e
INFILE="$1"
BASENAME=$(basename "$INFILE" .mp4)
OUTDIR="02_processed"
mkdir -p "$OUTDIR"
# 例: 4K60pに変換して保存
ffmpeg -y -i "$INFILE" -vf "scale=3840:2160,fps=60" -c:v libx264 -preset veryfast -crf 18 "$OUTDIR/${BASENAME}_4k60p.mp4"
echo "処理完了: $OUTDIR/${BASENAME}_4k60p.mp4"
EOS
chmod +x run_pipeline_v3.sh

# 4. batch_run_pipeline_vast.sh（スペース対応版）を生成
cat <<'EOS' > batch_run_pipeline_vast.sh
#!/usr/bin/env bash
# Vast.ai用: input/内の全mp4動画をrun_pipeline_v3.shで一括処理（スペース対応）
set -e
WORKDIR="$(pwd)"
INPUT_DIR="$WORKDIR/input"
SCRIPT="$WORKDIR/run_pipeline_v3.sh"
LOGDIR="$WORKDIR/logs"
mkdir -p "$LOGDIR"
find "$INPUT_DIR" -maxdepth 1 -type f -name "*.mp4" -print0 | while IFS= read -r -d '' f; do
  BASENAME=$(basename "$f" .mp4)
  echo "=== 処理開始: $BASENAME ==="
  bash "$SCRIPT" "$f" > "$LOGDIR/${BASENAME}.log" 2>&1
  echo "=== 完了: $BASENAME ==="
done
echo "全動画の処理が完了しました！（ログは logs/ に保存）"
EOS
chmod +x batch_run_pipeline_vast.sh

cd ..
echo "✅ プロジェクトの必要な全フォルダ・主要ファイルを生成しました！"
