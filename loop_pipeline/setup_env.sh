#!/usr/bin/env bash
# setup_env.sh - install dependencies and build tools
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
TOOLS_DIR="$SCRIPT_DIR/tools"

# 1) Install apt packages from apt.txt
APT_FILE="$ROOT_DIR/apt.txt"
if [ -f "$APT_FILE" ]; then
  echo "Installing apt packages..."
  sudo apt-get update
  xargs -r -a "$APT_FILE" sudo apt-get install -y --no-install-recommends
else
  echo "apt.txt not found at $APT_FILE"
fi

# 2) Setup Python virtual environment
VENV_DIR="$ROOT_DIR/.venv"
if [ ! -d "$VENV_DIR" ]; then
  python3 -m venv "$VENV_DIR"
fi
# shellcheck source=/dev/null
source "$VENV_DIR/bin/activate"

# 3) Install Python requirements
REQ_FILE="$ROOT_DIR/requirements.txt"
if [ -f "$REQ_FILE" ]; then
  pip install -r "$REQ_FILE"
else
  echo "requirements.txt not found at $REQ_FILE"
fi

# Ensure tools directory exists
mkdir -p "$TOOLS_DIR"
cd "$TOOLS_DIR"

# 4) RIFE build (skip if already built)
if [ ! -d rife-ncnn-vulkan ]; then
  echo "--- Cloning and building RIFE ---"
  git clone https://github.com/nihui/rife-ncnn-vulkan.git
  cd rife-ncnn-vulkan
  git submodule update --init --recursive
  mkdir -p build
  cd build
  cmake ../src -DNCNN_VULKAN=ON
  make -j"$(nproc)"
  cd "$TOOLS_DIR"
else
  echo "RIFE already built. Skipping."
fi

# 4) Real-ESRGAN build (skip if already built)
if [ ! -d Real-ESRGAN-ncnn-vulkan ]; then
  echo "--- Cloning and building Real-ESRGAN ---"
  git clone https://github.com/xinntao/Real-ESRGAN-ncnn-vulkan.git
  cd Real-ESRGAN-ncnn-vulkan
  sed -i 's|git@github.com:|https://github.com/|g' .gitmodules
  git submodule sync --recursive
  git submodule update --init --recursive
  mkdir -p build
  cd build
  cmake ../src -DNCNN_VULKAN=ON -DREALESRGAN_BUILD_TEST=OFF
  make -j2
  cd "$TOOLS_DIR"
else
  echo "Real-ESRGAN already built. Skipping."
fi

echo "Environment setup complete."
