# Docker環境管理用ユーティリティスクリプト

# 環境情報表示
function Show-Environment {
    Write-Host "🐳 Docker環境情報" -ForegroundColor Cyan
    Write-Host "===================" -ForegroundColor Cyan
    
    # Dockerバージョン
    try {
        $dockerVersion = docker --version
        Write-Host "Docker: $dockerVersion" -ForegroundColor Green
    } catch {
        Write-Host "Docker: 未インストール" -ForegroundColor Red
    }
    
    # Docker Composeバージョン
    try {
        $composeVersion = docker-compose --version
        Write-Host "Docker Compose: $composeVersion" -ForegroundColor Green
    } catch {
        Write-Host "Docker Compose: 未インストール" -ForegroundColor Red
    }
    
    # NVIDIA GPU
    try {
        nvidia-smi 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "NVIDIA GPU: 利用可能" -ForegroundColor Green
        }
    } catch {
        Write-Host "NVIDIA GPU: 利用不可" -ForegroundColor Yellow
    }
    
    # 既存のコンテナ
    Write-Host "`n📦 実行中のコンテナ:" -ForegroundColor Blue
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# 環境のクリーンアップ
function Clear-Environment {
    Write-Host "🧹 Docker環境をクリーンアップ中..." -ForegroundColor Yellow
    
    # コンテナ停止
    docker-compose down 2>$null
    docker-compose -f docker-compose.gpu.yml down 2>$null
    
    # 未使用イメージ削除
    docker image prune -f
    
    # 未使用ボリューム削除（確認付き）
    $confirm = Read-Host "未使用ボリュームを削除しますか？ (y/N)"
    if ($confirm -eq "y" -or $confirm -eq "Y") {
        docker volume prune -f
    }
    
    Write-Host "✅ クリーンアップ完了" -ForegroundColor Green
}

# 開発モード（ホットリロード）
function Start-Development {
    Write-Host "🛠️ 開発モードで起動中..." -ForegroundColor Cyan
    Write-Host "ファイル変更時に自動でリロードされます" -ForegroundColor Yellow
    
    # 開発用docker-compose設定
    $devConfig = @"
version: '3.8'
services:
  annotate-tool-dev:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - .:/app
      - ./models:/app/models
      - ./data:/app/data
    environment:
      - PYTHONUNBUFFERED=1
      - CONDA_DEFAULT_ENV=annotate
    command: conda run --no-capture-output -n annotate uvicorn server:app --host 0.0.0.0 --port 8000 --reload
"@
    
    $devConfig | Out-File -FilePath "docker-compose.dev.yml" -Encoding UTF8
    docker-compose -f docker-compose.dev.yml up --build
}

# ログ表示
function Show-Logs {
    param(
        [string]$Service = ""
    )
    
    if ($Service) {
        docker-compose logs -f $Service
    } else {
        Write-Host "📜 利用可能なサービス:" -ForegroundColor Blue
        Write-Host "• annotate-tool (CPU版)" -ForegroundColor Gray
        Write-Host "• annotate-tool-gpu (GPU版)" -ForegroundColor Gray
        
        $service = Read-Host "ログを表示するサービス名を入力してください"
        docker-compose logs -f $service
    }
}

# メニュー表示
function Show-Menu {
    Write-Host "`n🐳 AI画像アノテーションツール Docker管理" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "1) 環境情報表示" -ForegroundColor White
    Write-Host "2) CPU版起動" -ForegroundColor Yellow
    Write-Host "3) GPU版起動" -ForegroundColor Green
    Write-Host "4) 開発モード起動" -ForegroundColor Magenta
    Write-Host "5) 停止" -ForegroundColor Red
    Write-Host "6) ログ表示" -ForegroundColor Blue
    Write-Host "7) 環境クリーンアップ" -ForegroundColor DarkYellow
    Write-Host "8) 終了" -ForegroundColor Gray
    
    do {
        $choice = Read-Host "`n選択してください (1-8)"
    } while ($choice -notin @("1", "2", "3", "4", "5", "6", "7", "8"))
    
    switch ($choice) {
        "1" { Show-Environment }
        "2" { 
            Write-Host "CPU版を起動中..." -ForegroundColor Yellow
            docker-compose up --build
        }
        "3" { 
            Write-Host "GPU版を起動中..." -ForegroundColor Green
            docker-compose -f docker-compose.gpu.yml up --build
        }
        "4" { Start-Development }
        "5" { 
            Write-Host "コンテナを停止中..." -ForegroundColor Red
            docker-compose down
            docker-compose -f docker-compose.gpu.yml down
        }
        "6" { Show-Logs }
        "7" { Clear-Environment }
        "8" { 
            Write-Host "👋 お疲れ様でした！" -ForegroundColor Green
            exit 
        }
    }
    
    if ($choice -ne "8") {
        Read-Host "`nEnterキーを押してメニューに戻る"
        Show-Menu
    }
}

# メイン実行
if ($args.Length -eq 0) {
    Show-Menu
} else {
    switch ($args[0]) {
        "info" { Show-Environment }
        "cpu" { docker-compose up --build }
        "gpu" { docker-compose -f docker-compose.gpu.yml up --build }
        "dev" { Start-Development }
        "stop" { 
            docker-compose down
            docker-compose -f docker-compose.gpu.yml down
        }
        "clean" { Clear-Environment }
        "logs" { Show-Logs -Service $args[1] }
        default { Show-Menu }
    }
}
