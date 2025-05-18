(main) root@C.20120681:/workspace/4k-video-generation$ bash /workspace/4k-video-generation/run_pipeline_v3.sh
--- Processing: Gen-4  312847421 4K.mp4 ---
--- [1/5] Running All-In-One-Deflicker for Gen-4  312847421 4K.mp4 ---
Sourcing Conda from: /workspace/4k-video-generation/./loop_pipeline/tools/miniconda3/etc/profile.d/conda.sh
Activating Conda environment: deflicker
Conda environment activated.
Running Deflicker with input: /workspace/4k-video-generation/./input/Gen-4  312847421 4K.mp4
Namespace(ckpt_filter='./pretrained_weights/neural_filter.pth', ckpt_local='./pretrained_weights/local_refinement_net.pth', video_name='/workspace/4k-video-generation/./input/Gen-4  312847421 4K.mp4', video_frame_folder=None, fps=10, gpu=0, class_name=None)
ffmpeg -i /workspace/4k-video-generation/./input/Gen-4  312847421 4K.mp4 -vf fps=10 -start_number 0 ./data/test/Gen-4  312847421 4K/%05d.png
ffmpeg version 5.1.2 Copyright (c) 2000-2022 the FFmpeg developers
  built with gcc 11.3.0 (conda-forge gcc 11.3.0-19)
  configuration: --prefix=/workspace/4k-video-generation/loop_pipeline/tools/miniconda3/envs/deflicker --cc=/home/conda/feedstock_root/build_artifacts/ffmpeg_1674566204550/_build_env/bin/x86_64-conda-linux-gnu-cc --cxx=/home/conda/feedstock_root/build_artifacts/ffmpeg_1674566204550/_build_env/bin/x86_64-conda-linux-gnu-c++ --nm=/home/conda/feedstock_root/build_artifacts/ffmpeg_1674566204550/_build_env/bin/x86_64-conda-linux-gnu-nm --ar=/home/conda/feedstock_root/build_artifacts/ffmpeg_1674566204550/_build_env/bin/x86_64-conda-linux-gnu-ar --disable-doc --disable-openssl --enable-demuxer=dash --enable-hardcoded-tables --enable-libfreetype --enable-libfontconfig --enable-libopenh264 --enable-gnutls --enable-libmp3lame --enable-libvpx --enable-pthreads --enable-vaapi --enable-gpl --enable-libx264 --enable-libx265 --enable-libaom --enable-libsvtav1 --enable-libxml2 --enable-pic --enable-shared --disable-static --enable-version3 --enable-zlib --enable-libopus --pkg-config=/home/conda/feedstock_root/build_artifacts/ffmpeg_1674566204550/_build_env/bin/pkg-config
  libavutil      57. 28.100 / 57. 28.100
  libavcodec     59. 37.100 / 59. 37.100
  libavformat    59. 27.100 / 59. 27.100
  libavdevice    59.  7.100 / 59.  7.100
  libavfilter     8. 44.100 /  8. 44.100
  libswscale      6.  7.100 /  6.  7.100
  libswresample   4.  7.100 /  4.  7.100
  libpostproc    56.  6.100 / 56.  6.100
/workspace/4k-video-generation/./input/Gen-4: No such file or directory
Traceback (most recent call last):
  File "/workspace/4k-video-generation/loop_pipeline/tools/all-in-one-deflicker/src/stage1_neural_atlas.py", line 10, in <module>
    from src.models.stage_1.implicit_neural_networks import IMLP
ModuleNotFoundError: No module named 'src'
Traceback (most recent call last):
  File "/workspace/4k-video-generation/loop_pipeline/tools/all-in-one-deflicker/src/neural_filter_and_refinement.py", line 6, in <module>
    import src.models.network_filter as net
ModuleNotFoundError: No module named 'src'
エラー: Deflicker処理後のビデオが見つかりません: /workspace/4k-video-generation/./loop_pipeline/tools/all-in-one-deflicker/results/Gen-4  312847421 4K/final/output.mp4
All-In-One-Deflickerの出力パスを確認してください。
find: ‘/workspace/4k-video-generation/./loop_pipeline/tools/all-in-one-deflicker/results/’: No such file or directory
(main) root@C.20120681:/workspace/4k-video-generation$ 