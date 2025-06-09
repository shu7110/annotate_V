from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
import torch
import torchvision.transforms as transforms
from PIL import Image
import io
import numpy as np
import json
import os
from transformers import CLIPProcessor, CLIPModel
from ultralytics import YOLO

app = FastAPI()

# CORSの設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # すべてのオリジンを許可
    allow_credentials=True,
    allow_methods=["*"],  # すべてのメソッドを許可
    allow_headers=["*"],
)

# 静的ファイルの提供
app.mount("/static", StaticFiles(directory="."), name="static")

# ルートパスでindex.htmlを提供
@app.get("/")
async def read_root():
    return FileResponse("index.html")

# モデルの初期化
print("CLIPモデルを読み込み中...")
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

print("YOLO-Worldモデルをダウンロード中...")
try:
    # YOLO-Worldモデルをインストール
    yolo_model = YOLO('yolov8x-worldv2.pt')
    print("YOLO-Worldモデルのダウンロードが完了しました")
except Exception as e:
    print(f"モデルの読み込みに失敗しました: {e}")
    raise Exception("YOLO-Worldモデルのインストールに失敗しました。手動でモデルをダウンロードしてください。")

# クラスラベルの読み込み
def load_labels(label_type):
    try:
        filename = f"{label_type}_labels.txt"
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as f:
                return [line.strip() for line in f if line.strip()]
        return []
    except Exception as e:
        print(f"Error loading labels: {e}")
        return []

@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    task_type: str = Form("classification"),
    prompt: str = Form(None)
):
    try:
        # 画像の読み込み
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        
        if task_type == "zero_shot" and prompt:
            # ゼロショット予測
            inputs = clip_processor(
                text=[prompt],
                images=image,
                return_tensors="pt",
                padding=True
            )
            
            with torch.no_grad():
                outputs = clip_model(**inputs)
                # 類似度スコアをそのまま使用（softmaxは使用しない）
                similarity_score = float(outputs.logits_per_image[0][0])
            
            return JSONResponse(content={
                "confidence": similarity_score
            })
        else:
            raise HTTPException(status_code=400, detail="Only zero-shot prediction is supported with this model")
    except Exception as e:
        print(f"Error in predict: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect")
async def detect_objects(
    file: UploadFile = File(...),
    prompts: str = Form(...)  # カンマ区切りのプロンプト
):
    try:
        print(f"\n=== DETECTION REQUEST START ===")
        print(f"Received detection request with prompts: {prompts}")
        
        # 画像の読み込み
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        print(f"Image loaded successfully. Size: {image.size}")
        
        # プロンプトの処理
        prompt_list = [p.strip() for p in prompts.split(',')]
        print(f"Processed prompts: {prompt_list}")
        
        # YOLO-Worldで物体検出
        print("Running YOLO-World detection...")
        
        # 新しいモデルインスタンスを作成
        print("Creating new YOLO-World model instance...")
        yolo_model_instance = YOLO('yolov8x-worldv2.pt')
        
        try:
            # YOLO-Worldの新しいAPIを使用してプロンプトを設定
            print(f"Setting custom classes: {prompt_list}")
            yolo_model_instance.set_classes(prompt_list)
            print("Custom classes set successfully")
        except AttributeError:
            try:
                # 別のアプローチ: model.modelにアクセス
                print("Trying alternative prompt setting method...")
                if hasattr(yolo_model_instance.model, 'set_classes'):
                    yolo_model_instance.model.set_classes(prompt_list)
                    print("Alternative method: Custom classes set successfully")
                else:
                    print("Warning: Could not set custom classes, using default detection")
            except Exception as e:
                print(f"Warning: Failed to set custom classes: {e}")
        
        # 検出を実行
        print(f"Running detection with confidence threshold 0.4...")
        results = yolo_model_instance(image, conf=0.4, verbose=False)
        print(f"Detection completed. Found {len(results)} results")
        
        # 検出結果の処理
        detections = []
        for result in results:
            if not hasattr(result, 'boxes') or result.boxes is None:
                print("No boxes found in result")
                continue
                
            boxes = result.boxes
            print(f"Processing {len(boxes)} boxes")
            
            if len(boxes) == 0:
                print("No boxes to process")
                continue
            
            # ボックスの詳細情報を表示
            print("Raw box details:")
            print(f"Classes: {boxes.cls.tolist()}")
            print(f"Confidences: {boxes.conf.tolist()}")
            
            # 実際のクラス名を取得（利用可能な場合）
            if hasattr(result, 'names') and result.names:
                print(f"Available class names: {result.names}")
            
            for i, box in enumerate(boxes):
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                confidence = float(box.conf[0])
                class_id = int(box.cls[0])
                
                print(f"Processing box {i}: class_id={class_id}, confidence={confidence:.2f}")
                
                # ラベルの決定
                if hasattr(result, 'names') and result.names and class_id in result.names:
                    # モデルから実際のクラス名を取得
                    label = result.names[class_id]
                    print(f"Using model class name: {label}")
                elif class_id < len(prompt_list):
                    # プロンプトリストからマッピング
                    label = prompt_list[class_id]
                    print(f"Mapped class_id {class_id} to prompt: {label}")
                else:
                    # 最も近いプロンプトを使用
                    label = prompt_list[0] if prompt_list else "unknown"
                    print(f"Using fallback label: {label}")
                
                # バウンディングボックスの座標を正規化
                img_width, img_height = image.size
                x_center = (x1 + x2) / (2 * img_width)
                y_center = (y1 + y2) / (2 * img_height)
                width = (x2 - x1) / img_width
                height = (y2 - y1) / img_height
                
                # 検出結果を追加
                detection = {
                    "label": label,
                    "confidence": confidence,
                    "bbox": {
                        "x": x_center,
                        "y": y_center,
                        "width": width,
                        "height": height
                    }
                }
                print(f"Adding detection: {detection}")
                detections.append(detection)
        
        print(f"Returning {len(detections)} detections")
        print(f"=== DETECTION REQUEST END ===\n")
        return JSONResponse(content={
            "detections": detections
        })
    except Exception as e:
        print(f"Error in detect: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/labels/{label_type}")
async def get_labels(label_type: str):
    labels = load_labels(label_type)
    return JSONResponse(content={"labels": labels})

# モデルの再初期化関数
def reinitialize_yolo_model():
    global yolo_model
    try:
        print("Reinitializing YOLO-World model...")
        yolo_model = YOLO('yolov8x-worldv2.pt')
        print("YOLO-World model reinitialized successfully")
        return True
    except Exception as e:
        print(f"Failed to reinitialize YOLO-World model: {e}")
        return False

# ヘルスチェック用エンドポイント
@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": True}

if __name__ == "__main__":
    import uvicorn
    import sys
    
    # Docker環境での実行かチェック
    host = "0.0.0.0" if len(sys.argv) > 1 and "--host" in sys.argv else "127.0.0.1"
    port = 8000
    
    # コマンドライン引数から設定を読み込み
    if "--host" in sys.argv:
        host_index = sys.argv.index("--host") + 1
        if host_index < len(sys.argv):
            host = sys.argv[host_index]
    
    if "--port" in sys.argv:
        port_index = sys.argv.index("--port") + 1
        if port_index < len(sys.argv):
            port = int(sys.argv[port_index])
    
    print(f"Starting server on {host}:{port}")
    uvicorn.run(app, host=host, port=port)