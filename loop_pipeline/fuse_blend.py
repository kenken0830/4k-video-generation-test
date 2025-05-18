#!/usr/bin/env python
# fuse_blend.py SRC_MP4 RIFE_YUV OUT_MP4 --fps 24
import subprocess, sys, cv2, numpy as np, tempfile, os, argparse

parser = argparse.ArgumentParser()
parser.add_argument("src"), parser.add_argument("interp"), parser.add_argument("out")
parser.add_argument("--fps", type=int, default=24)
args = parser.parse_args()

fps = args.fps
tmp = tempfile.mkdtemp()

# 1) 末尾 0.5 s をカット
subprocess.run(["ffmpeg","-y","-i",args.src,
                "-t",f"{float(os.path.getsize(args.interp))/(args.fps*args.fps*3)/2}",  # not precise; shortcut
                f"{tmp}/head.mp4"], check=True)
subprocess.run(["ffmpeg","-y","-s","960x540","-pix_fmt","yuv420p10le","-r",str(fps),
                "-i",args.interp,f"{tmp}/interp.mp4"],check=True)

# 2) Concatenate head + interp + src
with open(f"{tmp}/list.txt","w") as f:
    f.write(f"file '{args.src}'\n")
    f.write(f"file '{tmp}/interp.mp4'\n")

subprocess.run(["ffmpeg","-y","-f","concat","-safe","0","-i",f"{tmp}/list.txt",
                "-c","copy",f"{tmp}/concat.mp4"],check=True)

# 3) Poisson seamlessClone (OpenCV) on 16 frames
cap=cv2.VideoCapture(f"{tmp}/concat.mp4")
w=int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); h=int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fourcc=cv2.VideoWriter_fourcc(*'avc1'); out=cv2.VideoWriter(args.out,fourcc,fps,(w,h),True)

frames=[]
while True:
    ret,frm=cap.read()
    if not ret: break
    frames.append(frm)
cap.release()

# Poisson blend only on overlap (last 12f + first 12f)
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
