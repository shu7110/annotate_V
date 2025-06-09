# AI画像アノテーションツール

最新のAI技術（YOLO-World、CLIP）を活用した高度な画像アノテーションツールです。手動アノテーションとAI支援機能を組み合わせ、効率的なデータセット作成を支援します。

🐳 **Docker環境対応** - conda3.11.11環境での安定動作を保証

## 🚀 主要機能

### 🤖 AI支援機能
- **YOLO-World物体検出**: カスタムプロンプトによる高精度物体検出
- **CLIPゼロショット分類**: 任意のラベルでの画像分類予測
- **自動推論**: 画像切り替え時の自動予測実行
- **予測結果選択**: ワンクリック・キーボードショートカットでの予測結果採用

### 📦 物体検出アノテーション
- **インタラクティブ編集**: マウスでのバウンディングボックス移動・リサイズ
- **YOLO-World統合**: プロンプトベースの自動物体検出
- **既存アノテーション保護**: 手動アノテーションの上書き防止
- **ラベル最適配置**: 大きなボックスでも見やすいラベル表示
- **詳細情報表示**: 座標・信頼度の表示

### 🏷️ 分類アノテーション
- **ゼロショット予測**: 事前学習なしでのカスタムラベル分類
- **予測結果ランキング**: 信頼度順での結果表示
- **ワンクリック採用**: 予測結果から直接ラベル選択
- **自動推論モード**: 画像切り替え時の自動分類

### 📊 データ管理・エクスポート
- **複数形式対応**: JSON, CSV, YOLO形式でのエクスポート
- **自動保存**: ローカルストレージへのリアルタイム保存
- **バッチ処理**: 複数画像の一括アノテーション
- **設定保存**: ユーザー設定の永続化

## 🛠️ 技術スタック

### AI/ML
- **YOLO-World v2**: 最新のオープンボキャブラリ物体検出モデル
- **CLIP-ViT-Base**: OpenAIのマルチモーダル事前学習モデル
- **Ultralytics**: YOLOエコシステムの統合フレームワーク

### Web技術
- **FastAPI**: 高性能なPython Webフレームワーク
- **HTML5 Canvas**: インタラクティブな画像描画
- **JavaScript ES6+**: モダンフロントエンド開発
- **CSS3**: レスポンシブデザイン

### インフラストラクチャ
- **Docker**: コンテナ化による環境の一貫性
- **conda3.11.11**: Python環境管理
- **CUDA対応**: GPU加速処理サポート

## 📋 必要条件

### Docker環境（推奨）
- **Docker Desktop**: 最新版
- **4GB以上のRAM**（AI推論用）
- **5GB以上のストレージ空き容量**
- **モダンなWebブラウザ**（Chrome、Firefox、Safari、Edge）

### GPU版追加要件（オプション）
- **NVIDIA GPU**: CUDA対応
- **NVIDIA Container Toolkit**
- **CUDA**: 11.8以上

### ローカル実行環境（非推奨）
- Python 3.8以上
- 4GB以上のRAM（AI推論用）
- 2GB以上のストレージ空き容量

## 🚀 セットアップ

### 🐳 Docker環境での実行（推奨）

#### 1. リポジトリのクローン
```bash
git clone <repository-url>
cd annotate_V
```

#### 2. 自動セットアップ（推奨）
```powershell
# PowerShellで実行
.\docker-setup.ps1
```

#### 3. 手動でのDocker起動
**CPU版:**
```powershell
docker-compose up --build
```

**GPU版（NVIDIA GPU環境）:**
```powershell
docker-compose -f docker-compose.gpu.yml up --build
```

#### 4. ブラウザでアクセス
```
http://localhost:8000
```

### 💻 ローカル環境での実行（非推奨）

#### 1. リポジトリのクローン
```bash
git clone <repository-url>
cd annotate_V
```

#### 2. Python環境のセットアップ
```bash
# 仮想環境の作成（推奨）
python -m venv .venv

# 仮想環境の有効化
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# 依存関係のインストール
pip install -r requirements.txt
```

#### 3. サーバーの起動
```bash
python server.py
```

サーバーが正常に起動すると、以下のメッセージが表示されます：
```
CLIPモデルを読み込み中...
YOLO-Worldモデルをダウンロード中...
YOLO-Worldモデルのダウンロードが完了しました
INFO:     Uvicorn running on http://127.0.0.1:8000
```

#### 4. ブラウザでアクセス
```
http://127.0.0.1:8000
```

## 🎯 使用方法

### 初期セットアップ
1. **ラベルファイルの準備**
   - 分類用: `classification_labels_sample.txt`
   - 検出用: `detection_labels_sample.txt`
   - 各ファイル形式：1行につき1つのラベル

### AI支援物体検出
1. **物体検出モード**に切り替え
2. **「ファイルからラベル読み込み」**で検出ラベルを設定
3. **「読み込んだラベルを使用」**をクリック
4. YOLO-Worldが自動で物体を検出・ラベリング

### AI支援分類
1. **分類モード**に切り替え
2. **自動推論トグル**をONに設定
3. **ゼロショット予測エリア**にラベルを入力
4. 画像切り替え時に自動で分類予測が実行

### 手動アノテーション
#### 物体検出
- **新規作成**: ラベル選択後、画像上でドラッグ
- **選択**: ボックスをクリック（赤色でハイライト）
- **移動**: 選択したボックス内をドラッグ
- **リサイズ**: ボックス角の白いハンドルをドラッグ
- **削除**: ダブルクリックまたは削除ボタン

#### 分類
- プルダウンメニューから選択
- 数字キー（1-9）での高速選択
- 予測結果からのワンクリック採用

## ⌨️ キーボードショートカット

### 基本操作
- **←/→**: 前/次の画像
- **Delete**: 全バウンディングボックス削除

### 分類モード
- **1-9**: 数字キーで予測結果またはラベル選択
- **Space**: 最高スコアの予測結果を自動選択
- **Enter**: 予測実行
- **読み込んだラベルを使用**: ロードしたラベルで一括予測

### 設定カスタマイズ
- 右上の⚙️ボタンから設定画面にアクセス
- カスタムショートカットキーの設定
- デフォルト設定への復元

## 📋 エクスポート形式

### JSON形式
```json
{
  "classificationLabels": ["猫", "犬"],
  "detectionLabels": ["顔", "体"],
  "annotations": {
    "image1.jpg": {
      "classification": "猫",
      "detections": [
        {
          "label": "顔",
          "x": 100, "y": 50,
          "width": 200, "height": 150,
          "canvasX": 50, "canvasY": 25,
          "canvasWidth": 100, "canvasHeight": 75
        }
      ]
    }
  }
}
```

### YOLO形式（ZIP）
- `classes.txt`: クラスラベル一覧
- `*.txt`: 各画像のアノテーション（正規化座標）

## ⚙️ 設定・オプション

### 既存アノテーション保護
- **有効時**: 手動アノテーション済み画像でのAI検出をスキップ
- **無効時**: 全画像でAI検出を実行（既存アノテーションを上書き）

### 自動推論
- **有効時**: 画像切り替え時に自動でゼロショット分類を実行
- **無効時**: 手動実行のみ

### 信頼度閾値
- YOLO-World検出：0.4（設定済み）
- より高精度な検出結果を提供

## 🔧 トラブルシューティング

### よくある問題

#### Docker関連

**Docker Desktop が起動していない**
```
ERROR: error during connect: Get "http://...": open //./pipe/dockerDesktopLinuxEngine
```
**解決方法**: 
1. Docker Desktopを起動
2. 完全に起動するまで待機（数分）
3. 再度コマンドを実行

**ポート競合エラー**
```
ERROR: Port 8000 is already allocated
```
**解決方法**: 
```powershell
# 既存コンテナの停止
docker-compose down
# 再起動
docker-compose up --build
```

**メモリ不足エラー**
**解決方法**: 
```powershell
# 未使用リソースの削除
docker system prune -f
# Docker Desktopのメモリ設定を増加
```

#### GPU版固有の問題

**NVIDIA Container Toolkit未インストール**
```
ERROR: could not select device driver "" with capabilities: [[gpu]]
```
**解決方法**: 
1. [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)をインストール
2. Docker Desktopを再起動

**CUDA out of memory**
**解決方法**: 
1. 他のGPUプロセスを終了
2. CPU版への切り替え
```powershell
docker-compose up --build
```

#### ローカル実行時の問題

**ポートエラー（10048）**
```
ERROR: [Errno 10048] error while attempting to bind
```
**解決方法**: 既存のサーバープロセスを終了してから再起動

**モデル読み込みエラー**
**症状**: YOLO-Worldモデルのダウンロード失敗
**解決方法**: 
1. インターネット接続を確認
2. ディスク容量確認（2GB以上必要）
3. 手動でモデルファイルをダウンロード

## 🌟 特徴・利点

### 🎯 高精度AI支援
- 最新のYOLO-World v2による高精度物体検出
- CLIPによる柔軟なゼロショット分類
- カスタムプロンプト対応

### 💡 効率的なワークフロー
- AI予測＋手動補正のハイブリッドアプローチ
- 自動推論による作業時間短縮
- 既存アノテーション保護による安全性

### 🎨 直感的なUI/UX
- リアルタイムプレビュー
- ドラッグ&ドロップ操作
- レスポンシブデザイン
- アクセシビリティ対応

### 🔄 柔軟な統合
- 標準的なエクスポート形式
- REST API経由での拡張可能性
- モジュール化されたアーキテクチャ

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🤝 コントリビューション

バグレポート、機能リクエスト、プルリクエストを歓迎します。

---

**開発状況**: アクティブ開発中  
**最終更新**: 2025年5月
