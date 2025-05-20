FROM ubuntu:20.04
ENV DEBIAN_FRONTEND=noninteractive

# Install system packages
COPY apt.txt /tmp/apt.txt
RUN apt-get update && \
    xargs -a /tmp/apt.txt apt-get install -y --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN apt-get install -y python3-pip && \
    pip3 install --no-cache-dir pytesseract opencv-python pillow

WORKDIR /workspace
COPY . /workspace

CMD ["/bin/bash"]
