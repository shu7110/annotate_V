# conda3.11.11環境を使用したDockerfile
FROM continuumio/miniconda3:23.10.0-1

# 作業ディレクトリを設定
WORKDIR /app

# システムの依存関係をインストール
RUN apt-get update && apt-get install -y \
    curl \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# conda環境を作成（Python 3.11.11）
RUN conda create -n annotate python=3.11.11 -y

# condaの初期化
SHELL ["conda", "run", "-n", "annotate", "/bin/bash", "-c"]

# conda環境をアクティブ化するためのシェル設定
RUN echo "conda activate annotate" >> ~/.bashrc

# requirements.txtをコピー
COPY requirements.txt .

# conda環境内にPythonパッケージをインストール
RUN conda run -n annotate pip install --no-cache-dir -r requirements.txt

# アプリケーションファイルをコピー
COPY . .

# YOLOモデル用のディレクトリを作成
RUN mkdir -p models

# ポート8000を公開
EXPOSE 8000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# conda環境内でアプリケーションを起動
CMD ["conda", "run", "--no-capture-output", "-n", "annotate", "python", "server.py"]
