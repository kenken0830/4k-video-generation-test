# Adobe Stock 出品パイプライン運用マニュアル

---

## 目的
Runway Gen‑4 で生成した 10 s MP4 を、4 K60 fps の 10 s／20 s／30 s 完全ループに変換し、Adobe Stock へ最短で提出できるファイル一式（MP4 + compliance.json + metadata.json + ZIP）を自動生成する。

---

## 1. 環境前提

| 項目           | 推奨値                                    |
|----------------|-------------------------------------------|
| OS             | Ubuntu 20.04 LTS (vast.ai コンテナ)        |
| シェル         | bash 5.x                                  |
| 必須パッケージ | ffmpeg 4.2+ / tesseract‑ocr               |
| Python         | 3.8 以上 (+ pytesseract / opencv‑python / Pillow) |

**依存インストール (初回のみ)**
```bash
apt update -qq && apt install -y ffmpeg tesseract-ocr \
  && pip3 install -q --upgrade pytesseract opencv-python pillow
```

---

## 2. フォルダ構成

```
/workspace/
├─ run_pipeline.sh          ← 自動化スクリプト (実行用)
├─ 01_runway_gen4/          ← Runway 出力 MP4 を置く
├─ 02_processed/            ← 変換済み MP4 & compliance.json
├─ 03_publish/              ← ZIP バンドル (動画 + compliance)
├─ metadata/                ← metadata.json
└─ logs/                    ← 実行ログ (任意)
```

> **ポイント**: 作業ルートは常に `/workspace` と固定する。

---

## 3. 運用フロー

### STEP 0  スクリプト配置

```bash
cd /workspace
# — コピー & ペーストでスクリプトを作成
cat > run_pipeline.sh <<'EOF'
…(スクリプト全文。最新版を貼り付け) …
EOF
chmod +x run_pipeline.sh
```

### STEP 1  Runway 動画を配置

```
/workspace/01_runway_gen4/
   ├─ hud_teal_10s.mp4        ← 10 s / 16:9 / 24 fps
   └─ …
```

- ファイル名は英数字＋アンダースコア推奨。
- スクリプトが自動で安全リネームするので、空白や日本語が混ざっていても可。

### STEP 2  パイプライン実行

```bash
/workspace/run_pipeline.sh
```

**進捗表示例:**
```
[1/3] ▶ hud_teal_10s
frame= 599 fps=150 time=00:00:09.98 …
✅ 完了 → 10s / 20s / 30s 出力
```

- 完了後 : `/workspace/02_processed/` に 3 尺×4 K60 fps ファイルと compliance.json が生成。

### STEP 3  Adobe Stock へ提出

- Contributor Portal → Upload
- `02_processed/hud_teal_10s_loop10s_4k60.mp4` または `03_publish/hud_teal_10s_bundle.zip` をドラッグ
- 右欄で `metadata/hud_teal_10s.json` を開き、Title / Description / Keywords をコピペ
- Category = Motion Graphics > Abstract を選択
- AI‑generated を ON → Submit

---

## 4. トラブルシューティング

| 症状 | 原因 / 対策 |
|------|-------------|
| スクリプト実行しても何も起きない | 01_runway_gen4 に mp4 が無い。パスを確認。 |
| "No such file or directory" | スクリプト貼り付け時に EOF 行が抜けた。再作成する。 |
| 再生できない／黒画面 | ffmpeg バージョン不足 ⇒ apt upgrade ffmpeg |
| OCR WARN が出る | 発光ラインを文字誤検知。シームレス生成は問題なし (審査には影響しない)。 |
| 20 s / 30 s が出ない | 途中で Ctrl+C で停止。rm 02_processed/* → スクリプト再実行。 |

---

## 5. バージョン管理

| ファイル             | 説明                                     |
|----------------------|------------------------------------------|
| run_pipeline_v1.sh   | 最小版 (10 s のみ)                       |
| run_pipeline_v2.sh   | 10 s + OCR + metadata                    |
| run_pipeline_v3.sh   | 最新 : 10 s / 20 s / 30 s + ZIP (デフォルト) |

- バージョンタグを付けて保管し、不具合時は前版に切替可。

---

## 6. よくある Q&A

- **Q. ループがカクつく**  → **A.** duration=0.5 に変更して再エンコード。
- **Q. 複数カラーを一括処理したい**  → **A.** 同じフォルダに MP4 を追加して再実行。既存ファイルはスキップ。

---

## チェックリスト (提出前)


---

最終更新: 2025‑05‑11
