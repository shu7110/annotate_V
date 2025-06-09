# AI画像アノテーションツール - Docker環境セットアップガイド

## 🐳 Docker環境（conda3.11.11対応）

このプロジェクトは、conda環境（Python 3.11.11）を使用したDocker環境で動作するように設定されています。

### 🚀 クイックスタート

#### 1. 自動セットアップ（推奨）
```powershell
# PowerShellで実行
.\docker-setup.ps1
```

#### 2. 手動セットアップ

**CPU版:**
```powershell
# ビルドと起動
docker-compose up --build

# バックグラウンド実行
docker-compose up -d --build
```

**GPU版:**
```powershell
# GPU版でビルドと起動
docker-compose -f docker-compose.gpu.yml up --build
```

### 📦 Docker構成

#### ファイル構成
- `Dockerfile` - CPU版（conda環境）
- `Dockerfile.gpu` - GPU版（conda環境）
- `docker-compose.yml` - CPU版設定
- `docker-compose.gpu.yml` - GPU版設定
- `requirements-gpu.txt` - GPU版用依存関係

#### conda環境の特徴
- **Python 3.11.11** を使用
- **miniconda3:23.10.0-1** ベースイメージ
- GPU版では **PyTorch CUDA** をcondaでインストール
- パッケージ管理の安定性向上

### 🛠️ 管理ツール

#### Docker管理スクリプト
```powershell
# 対話式メニュー
.\docker-manager.ps1

# 直接コマンド
.\docker-manager.ps1 cpu     # CPU版起動
.\docker-manager.ps1 gpu     # GPU版起動
.\docker-manager.ps1 dev     # 開発モード
.\docker-manager.ps1 info    # 環境情報
.\docker-manager.ps1 clean   # クリーンアップ
```

### 📂 ボリューム構成

```
./models    -> /app/models     # YOLOモデルファイル
./images    -> /app/images     # 入力画像
./labels    -> /app/labels     # ラベルファイル
./data      -> /app/data       # アノテーションデータ
```

### 🎯 アクセス

コンテナ起動後、ブラウザで以下にアクセス:
```
http://localhost:8000
```

### 🔧 トラブルシューティング

#### よくある問題

**1. ポートエラー**
```powershell
# 既存コンテナの停止
docker-compose down
```

**2. GPU版で起動しない**
- NVIDIA Container Toolkitの確認
- GPU用Dockerランタイムの設定確認

**3. メモリ不足**
```powershell
# 未使用リソースの削除
docker system prune -f
```

**4. conda環境の問題**
```powershell
# イメージを再ビルド
docker-compose up --build --force-recreate
```

### 📋 コマンド一覧

#### 基本操作
```powershell
# 起動
docker-compose up -d

# 停止
docker-compose down

# ログ確認
docker-compose logs -f

# コンテナ内でコマンド実行
docker-compose exec annotate-tool bash
```

#### 開発用
```powershell
# 開発モード（ホットリロード）
.\docker-manager.ps1 dev

# コンテナ内のconda環境確認
docker-compose exec annotate-tool conda list
```

### 🌟 conda環境の利点

1. **安定性**: パッケージ依存関係の管理が優秀
2. **再現性**: 環境の完全な再現が可能
3. **GPU最適化**: PyTorch CUDAの最適なインストール
4. **軽量化**: 必要最小限のパッケージ構成

### 📊 システム要件

#### 最小要件
- **RAM**: 4GB以上
- **ストレージ**: 5GB以上の空き容量
- **Docker**: 20.10以上

#### GPU版追加要件
- **NVIDIA GPU**: CUDA対応
- **NVIDIA Container Toolkit**
- **CUDA**: 11.8以上

### 🔄 アップデート

```powershell
# 最新イメージでリビルド
docker-compose pull
docker-compose up --build --force-recreate
```

---

**🚀 これで conda3.11.11環境でのDocker化が完了しました！**
