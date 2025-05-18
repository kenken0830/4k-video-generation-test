#!/usr/bin/env bash
# setup_env.sh – 必要 OSS を $TOOLS_DIR 以下にビルド・配置
set -e

# スクリプトがあるディレクトリを基準にTOOLS_DIRを設定
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
TOOLS_DIR="$SCRIPT_DIR/tools" # setup_env.sh と同じ階層の tools ディレクトリを指定

echo "DEBUG: SCRIPT_DIR is $SCRIPT_DIR"
echo "DEBUG: TOOLS_DIR will be $TOOLS_DIR"

echo "Updating package lists and installing base dependencies..."
apt-get update && apt-get -y install git build-essential pkg-config \
    ffmpeg libnvidia-encode-535 nvidia-cuda-toolkit python3-venv \
    vulkan-tools libvulkan-dev glslang-tools wget bc

echo "Creating tools directory: $TOOLS_DIR"
mkdir -p "$TOOLS_DIR"
echo "DEBUG: State of parent of TOOLS_DIR ($SCRIPT_DIR) after mkdir -p $TOOLS_DIR:"
ls -la "$SCRIPT_DIR"
echo "DEBUG: State of TOOLS_DIR ($TOOLS_DIR) after mkdir -p:"
ls -la "$TOOLS_DIR"
# Initial cd to tools_dir, subsequent blocks will re-cd to ensure correct base
cd "$TOOLS_DIR"

# --- Miniconda Setup ---
echo "--- Setting up Miniconda ---"
cd "$TOOLS_DIR" # Ensure we are in the correct base directory
if [ ! -d "$TOOLS_DIR/miniconda3" ]; then
    echo "Miniconda: Downloading Miniconda installer..."
    wget https://repo.anaconda.com/miniconda/Miniconda3-py39_4.12.0-Linux-x86_64.sh -O Miniconda3-latest-Linux-x86_64.sh
    DOWNLOAD_EXIT_CODE=$?
    if [ $DOWNLOAD_EXIT_CODE -ne 0 ]; then
        echo "ERROR: Miniconda: Failed to download Miniconda installer. Exit code: $DOWNLOAD_EXIT_CODE"
        exit 1
    fi
    echo "Miniconda: Installing Miniconda to $TOOLS_DIR/miniconda3..."
    bash Miniconda3-latest-Linux-x86_64.sh -b -p "$TOOLS_DIR/miniconda3"
    INSTALL_EXIT_CODE=$?
    rm Miniconda3-latest-Linux-x86_64.sh
    if [ $INSTALL_EXIT_CODE -ne 0 ]; then
        echo "ERROR: Miniconda: Failed to install Miniconda. Exit code: $INSTALL_EXIT_CODE"
        exit 1
    fi
    echo "Miniconda: Installation successful."
else
    echo "Miniconda: Miniconda already installed at $TOOLS_DIR/miniconda3."
fi
# Ensure conda is available in the current shell session
CONDA_BASE_PATH="$TOOLS_DIR/miniconda3"
CONDA_SH_PATH="$CONDA_BASE_PATH/etc/profile.d/conda.sh"
if [ ! -f "$CONDA_SH_PATH" ]; then
    echo "ERROR: Miniconda: conda.sh not found at $CONDA_SH_PATH after installation attempt."
    exit 1
fi
echo "Miniconda: conda.sh found at $CONDA_SH_PATH. Sourcing for current session..."
# shellcheck source=/dev/null
source "$CONDA_SH_PATH"
cd "$TOOLS_DIR" # Return to the main tools directory

# --- All-in-One Deflicker Setup (including Conda env) ---
echo "--- Setting up All-In-One Deflicker ---"
AIO_DEFLICKER_REPO_DIR="$TOOLS_DIR/all-in-one-deflicker"
AIO_DEFLICKER_ENV_NAME="deflicker" # As defined in run_pipeline_v3.sh

cd "$TOOLS_DIR" # Ensure we are in the correct base directory
if [ -d "$AIO_DEFLICKER_REPO_DIR" ]; then
    echo "All-In-One Deflicker: Repository already exists at $AIO_DEFLICKER_REPO_DIR. Removing for a clean clone."
    rm -rf "$AIO_DEFLICKER_REPO_DIR"
fi
echo "All-In-One Deflicker: Cloning repository..."
git clone https://github.com/ChenyangLEI/All-In-One-Deflicker.git "$AIO_DEFLICKER_REPO_DIR"
CLONE_AIO_EXIT_CODE=$?
if [ $CLONE_AIO_EXIT_CODE -ne 0 ]; then
    echo "ERROR: All-In-One Deflicker: git clone failed with exit code $CLONE_AIO_EXIT_CODE"
    # Not exiting, as it might be optional or handled later if user desires
else
    echo "All-In-One Deflicker: git clone completed successfully into $AIO_DEFLICKER_REPO_DIR."
    cd "$AIO_DEFLICKER_REPO_DIR"
    echo "All-In-One Deflicker: Current directory: $(pwd)"

    echo "--- Setting up Conda environment for All-In-One Deflicker ---"
    # Source conda.sh again just in case (should be sourced already)
    # shellcheck source=/dev/null
    source "$CONDA_SH_PATH"

    # Check if environment exists and remove if it does for a clean setup
    if conda env list | grep -E "^${AIO_DEFLICKER_ENV_NAME}\s" > /dev/null; then
        echo "All-In-One Deflicker: Conda environment '$AIO_DEFLICKER_ENV_NAME' already exists. Removing for a clean setup..."
        conda env remove -n "$AIO_DEFLICKER_ENV_NAME" -y
    fi

    echo "All-In-One Deflicker: Creating Conda environment '$AIO_DEFLICKER_ENV_NAME'..."
    if [ -f environment.yml ]; then
        echo "All-In-One Deflicker: Creating environment from environment.yml"
        conda env create -n "$AIO_DEFLICKER_ENV_NAME" -f environment.yml
        CREATE_ENV_EXIT_CODE=$?
        if [ $CREATE_ENV_EXIT_CODE -ne 0 ]; then
            echo "ERROR: All-In-One Deflicker: Failed to create Conda environment from yml. Exit code: $CREATE_ENV_EXIT_CODE. Attempting pip install into a new basic env."
            conda create -n "$AIO_DEFLICKER_ENV_NAME" python=3.9 -y # Create a base env
            # Activate for pip install
            eval "$(conda shell.bash hook)" # Ensure conda activate works
            conda activate "$AIO_DEFLICKER_ENV_NAME"
            echo "All-In-One Deflicker: Installing dependencies via pip..."
            pip install contourpy==1.0.7 cycler==0.11.0 docker-pycreds==0.4.0 easydict==1.10 filelock==3.9.0 fonttools==4.39.0 gdown==4.6.4 gitdb==4.0.10 gitpython==3.1.31 google-auth==2.16.2 google-auth-oauthlib==0.4.6 grpcio==1.51.3 imageio==2.26.0 imageio-ffmpeg==0.4.8 kiwisolver==1.4.4 lazy-loader==0.1 markdown==3.4.1 markupsafe==2.1.2 matplotlib==3.7.1 networkx==3.0 oauthlib==3.2.2 opencv-python==4.7.0.72 packaging==23.0 pathtools==0.1.2 protobuf==3.20.3 psutil==5.9.4 pyasn1==0.4.8 pyasn1-modules==0.2.8 pyparsing==3.0.9 python-dateutil==2.8.2 pywavelets==1.4.1 pyyaml==6.0 requests-oauthlib==1.3.1 rsa==4.9 scikit-image==0.20.0 scipy==1.10.1 sentry-sdk==1.16.0 setproctitle==1.3.2 six==1.16.0 smmap==5.0.0 soupsieve==2.4 tensorboard==2.12.0 tensorboard-data-server==0.7.0 tensorboard-plugin-wit==1.8.1 tensorboardx==2.6 tifffile==2023.2.28 tqdm==4.65.0 wandb==0.13.11 werkzeug==2.2.3
            conda deactivate
        else
             echo "All-In-One Deflicker: Conda environment '$AIO_DEFLICKER_ENV_NAME' created successfully from yml."
        fi
    else
        echo "WARNING: All-In-One Deflicker: environment.yml not found in $(pwd). Creating basic environment and installing with pip."
        conda create -n "$AIO_DEFLICKER_ENV_NAME" python=3.9 -y
        # Activate for pip install
        eval "$(conda shell.bash hook)" # Ensure conda activate works
        conda activate "$AIO_DEFLICKER_ENV_NAME"
        echo "All-In-One Deflicker: Installing dependencies via pip..."
        pip install contourpy==1.0.7 cycler==0.11.0 docker-pycreds==0.4.0 easydict==1.10 filelock==3.9.0 fonttools==4.39.0 gdown==4.6.4 gitdb==4.0.10 gitpython==3.1.31 google-auth==2.16.2 google-auth-oauthlib==0.4.6 grpcio==1.51.3 imageio==2.26.0 imageio-ffmpeg==0.4.8 kiwisolver==1.4.4 lazy-loader==0.1 markdown==3.4.1 markupsafe==2.1.2 matplotlib==3.7.1 networkx==3.0 oauthlib==3.2.2 opencv-python==4.7.0.72 packaging==23.0 pathtools==0.1.2 protobuf==3.20.3 psutil==5.9.4 pyasn1==0.4.8 pyasn1-modules==0.2.8 pyparsing==3.0.9 python-dateutil==2.8.2 pywavelets==1.4.1 pyyaml==6.0 requests-oauthlib==1.3.1 rsa==4.9 scikit-image==0.20.0 scipy==1.10.1 sentry-sdk==1.16.0 setproctitle==1.3.2 six==1.16.0 smmap==5.0.0 soupsieve==2.4 tensorboard==2.12.0 tensorboard-data-server==0.7.0 tensorboard-plugin-wit==1.8.1 tensorboardx==2.6 tifffile==2023.2.28 tqdm==4.65.0 wandb==0.13.11 werkzeug==2.2.3
        conda deactivate
    fi
    echo "All-In-One Deflicker: Conda environment setup finished."
    cd "$TOOLS_DIR" # Return to tools dir
fi


# 2) RIFE 4.22 (ncnn vulkan)
echo "--- Setting up RIFE (rife-ncnn-vulkan) ---"
cd "$TOOLS_DIR" # Ensure we are in the correct base directory
if [ -d rife-ncnn-vulkan ]; then rm -rf rife-ncnn-vulkan; fi # Clean previous before clone
echo "RIFE: Cloning repository..."
git clone https://github.com/nihui/rife-ncnn-vulkan.git
CLONE_EXIT_CODE=$?
if [ $CLONE_EXIT_CODE -ne 0 ]; then
    echo "ERROR: RIFE: git clone failed with exit code $CLONE_EXIT_CODE"
    exit 1
fi
echo "RIFE: git clone completed successfully."
cd rife-ncnn-vulkan
echo "RIFE: Current directory: $(pwd)"
echo "RIFE: Updating submodules..."
git submodule update --init --recursive
if [ ! -f src/CMakeLists.txt ]; then
    echo "ERROR: RIFE: src/CMakeLists.txt not found in $(pwd)/src after clone and submodule update!"
    exit 1
fi
echo "RIFE: Found src/CMakeLists.txt in $(pwd)/src"
mkdir -p build
cd build
cmake ../src -DNCNN_VULKAN=ON
make -j$(nproc)
cd "$TOOLS_DIR" # Return to the main tools directory

# 3) Real-ESRGAN (ncnn vulkan)
echo "--- Setting up Real-ESRGAN (Real-ESRGAN-ncnn-vulkan) ---"
cd "$TOOLS_DIR" # Ensure we are in the correct base directory
if [ -d Real-ESRGAN-ncnn-vulkan ]; then rm -rf Real-ESRGAN-ncnn-vulkan; fi # Clean previous
echo "Real-ESRGAN: Cloning repository..."
git clone https://github.com/xinntao/Real-ESRGAN-ncnn-vulkan.git
CLONE_EXIT_CODE=$?
if [ $CLONE_EXIT_CODE -ne 0 ]; then
    echo "ERROR: Real-ESRGAN: git clone failed with exit code $CLONE_EXIT_CODE"
    exit 1
fi
echo "Real-ESRGAN: git clone completed successfully."
cd Real-ESRGAN-ncnn-vulkan
echo "Real-ESRGAN: Current directory: $(pwd)"
echo "Real-ESRGAN: Modifying .gitmodules to use HTTPS for submodules..."
sed -i 's|git@github.com:|https://github.com/|g' .gitmodules
echo "Real-ESRGAN: Syncing submodule URLs..."
git submodule sync --recursive
echo "Real-ESRGAN: Updating submodules..."
git submodule update --init --recursive
if [ ! -f src/CMakeLists.txt ]; then # Check for CMakeLists.txt in src
    echo "ERROR: Real-ESRGAN: src/CMakeLists.txt not found in $(pwd)/src after clone and submodule update!"
    exit 1
fi
echo "Real-ESRGAN: Found src/CMakeLists.txt in $(pwd)/src"
mkdir -p build
cd build
cmake ../src -DNCNN_VULKAN=ON -DREALESRGAN_BUILD_TEST=OFF
make -j2 # Reduced jobs for Real-ESRGAN as it can be memory intensive
cd "$TOOLS_DIR" # Return to the main tools directory


echo "--- Environment setup script finished ---"
echo "DEBUG: Final state of TOOLS_DIR ($TOOLS_DIR):"
ls -laR "$TOOLS_DIR"
echo "DEBUG: Final pwd: $(pwd)"
echo "To make conda command available in your current session after this script, run:"
echo "source $TOOLS_DIR/miniconda3/etc/profile.d/conda.sh"
echo "Available conda environments:"
# shellcheck source=/dev/null
source "$TOOLS_DIR/miniconda3/etc/profile.d/conda.sh"
conda env list
