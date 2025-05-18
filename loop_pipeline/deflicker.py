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
