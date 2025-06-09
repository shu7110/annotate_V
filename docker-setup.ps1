# PowerShell版 Docker環境構築スクリプト (conda環境対応)

Write-Host "🐳 AI画像アノテーションツール Docker環境セットアップ (conda3.11.11対応)" -ForegroundColor Cyan

# 必要なディレクトリを作成
Write-Host "📁 ディレクトリを作成中..." -ForegroundColor Yellow
$directories = @("models", "images", "labels", "data")
foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        Write-Host "✅ ディレクトリ '$dir' を作成しました" -ForegroundColor Green
    } else {
        Write-Host "📂 ディレクトリ '$dir' は既に存在します" -ForegroundColor Blue
    }
}

# サンプルラベルファイルをlabelsディレクトリにコピー（存在する場合）
if (Test-Path "classification_labels_sample.txt") {
    Copy-Item "classification_labels_sample.txt" "labels/"
    Write-Host "✅ 分類ラベルサンプルをコピーしました" -ForegroundColor Green
}

if (Test-Path "detection_labels_sample.txt") {
    Copy-Item "detection_labels_sample.txt" "labels/"
    Write-Host "✅ 検出ラベルサンプルをコピーしました" -ForegroundColor Green
}

# Dockerの確認
Write-Host "🔍 Docker環境をチェック中..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker が利用可能です: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker が見つかりません。Dockerをインストールしてください。" -ForegroundColor Red
    Write-Host "Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# GPU使用可能性をチェック
Write-Host "🎮 GPU環境をチェック中..." -ForegroundColor Yellow
$gpuAvailable = $false
try {
    $nvidiaInfo = nvidia-smi 2>$null
    if ($LASTEXITCODE -eq 0) {
        $gpuAvailable = $true
        Write-Host "✅ NVIDIA GPU が検出されました" -ForegroundColor Green
    }
} catch {
    Write-Host "ℹ️ NVIDIA GPU が検出されませんでした" -ForegroundColor Blue
}

# Docker Compose版の選択
if ($gpuAvailable) {
    Write-Host "`n🚀 利用可能な構成:" -ForegroundColor Cyan
    Write-Host "1) GPU版 (推奨、高速処理)" -ForegroundColor Green
    Write-Host "2) CPU版 (互換性重視)" -ForegroundColor Yellow
    Write-Host "3) 両方ビルド (開発用)" -ForegroundColor Magenta
    
    do {
        $choice = Read-Host "`n選択してください (1/2/3)"
    } while ($choice -notin @("1", "2", "3"))
    
    switch ($choice) {
        "1" {
            Write-Host "`n🚀 GPU版 (conda3.11.11環境) でビルドします..." -ForegroundColor Green
            Write-Host "⚠️ NVIDIA Container Toolkitが必要です" -ForegroundColor Yellow
            docker-compose -f docker-compose.gpu.yml up --build
        }
        "2" {
            Write-Host "`n🖥️ CPU版 (conda3.11.11環境) でビルドします..." -ForegroundColor Yellow
            docker-compose up --build
        }
        "3" {
            Write-Host "`n🔧 両方の環境をビルドします..." -ForegroundColor Magenta
            Write-Host "CPU版をビルド中..." -ForegroundColor Yellow
            docker-compose build
            Write-Host "GPU版をビルド中..." -ForegroundColor Yellow
            docker-compose -f docker-compose.gpu.yml build
            Write-Host "✅ 両方のイメージがビルドされました" -ForegroundColor Green
            Write-Host "`n使用方法:" -ForegroundColor Cyan
            Write-Host "CPU版: docker-compose up" -ForegroundColor Yellow
            Write-Host "GPU版: docker-compose -f docker-compose.gpu.yml up" -ForegroundColor Green
        }
    }
} else {
    Write-Host "`n🖥️ CPU版 (conda3.11.11環境) でビルドします..." -ForegroundColor Yellow
    docker-compose up --build
}

Write-Host "`n🎉 Docker環境のセットアップが完了しました！" -ForegroundColor Green
Write-Host "🌐 ブラウザで http://localhost:8000 にアクセスしてください" -ForegroundColor Cyan

Write-Host "`n📋 利用可能なコマンド:" -ForegroundColor Blue
Write-Host "• 停止: docker-compose down" -ForegroundColor Gray
Write-Host "• バックグラウンド実行: docker-compose up -d" -ForegroundColor Gray
Write-Host "• ログ確認: docker-compose logs -f" -ForegroundColor Gray
Write-Host "• 再ビルド: docker-compose up --build" -ForegroundColor Gray
