class AnnotationTool {
    constructor() {
        this.images = [];
        this.currentImageIndex = 0;
        this.mode = 'classification';
        this.classificationLabels = [];
        this.detectionLabels = [];
        this.annotations = new Map(); // imageIndex -> annotation data
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentBox = null;
        
        // バウンディングボックス編集関連
        this.selectedBox = null;
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.originalBox = null;
        
        // YOLO-World検出の状態管理
        this.yoloDetectionEnabled = true; // デフォルトで有効
        this.isYoloDetectionRunning = false; // 重複実行防止フラグ
        this.protectExistingAnnotations = true; // 既存アノテーション保護フラグ
        
        // ショートカットキーのデフォルト設定
        this.defaultShortcuts = {
            prev: 'ArrowLeft',
            next: 'ArrowRight',
            clearBoxes: 'Delete'
        };
        this.shortcuts = { ...this.defaultShortcuts };
        
        this.vlmModel = null;
        this.vlmProcessor = null;
        this.isVlmEnabled = false;
        this.modelLoading = false;
        
        this.zeroShotPrompts = document.getElementById('zeroShotPrompts');
        this.runZeroShot = document.getElementById('runZeroShot');
        this.zeroShotResults = document.getElementById('zeroShotResults');
        this.useLoadedLabels = document.createElement('button');
        this.useLoadedLabels.textContent = '読み込んだラベルを使用';
        this.useLoadedLabels.className = 'use-loaded-labels-btn';
        
        // 自動推論の設定
        this.autoInference = false;
        this.autoInferenceToggle = document.createElement('div');
        this.autoInferenceToggle.className = 'auto-inference-toggle';
        this.autoInferenceToggle.innerHTML = `
            <label class="switch">
                <input type="checkbox" id="autoInferenceToggle">
                <span class="slider round"></span>
            </label>
            <span class="toggle-label">自動推論</span>
        `;
        
        // YOLO-World用の「読み込んだラベルを使用」ボタンを追加
        this.useYoloLabels = document.createElement('button');
        this.useYoloLabels.textContent = '読み込んだラベルを使用';
        this.useYoloLabels.className = 'use-yolo-labels-btn';
        
        // 既存アノテーション保護トグルを追加
        this.protectAnnotationsToggle = document.createElement('div');
        this.protectAnnotationsToggle.className = 'protect-annotations-toggle';
        this.protectAnnotationsToggle.innerHTML = `
            <label class="switch">
                <input type="checkbox" id="protectAnnotationsToggle" checked>
                <span class="slider round"></span>
            </label>
            <span class="toggle-label">既存アノテーション保護</span>
        `;
        
        this.initElements();
        this.initEventListeners();
        this.loadSavedData();
        this.initVlm();
        this.addStyles();  // スタイルを追加
    }

    initElements() {
        this.imageInput = document.getElementById('imageInput');
        this.canvas = document.getElementById('annotationCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.imagePreview = document.getElementById('imagePreview');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.imageCounter = document.getElementById('imageCounter');
        
        // Mode elements
        this.modeToggle = document.getElementById('modeToggle');
        this.classificationPanel = document.getElementById('classificationPanel');
        this.detectionPanel = document.getElementById('detectionPanel');
        
        // Classification elements
        this.classificationLabel = document.getElementById('classificationLabel');
        this.addClassLabel = document.getElementById('addClassLabel');
        this.classificationLabelsContainer = document.getElementById('classificationLabels');
        this.currentClassification = document.getElementById('currentClassification');
        this.classificationFileInput = document.getElementById('classificationFileInput');
        this.loadClassificationFile = document.getElementById('loadClassificationFile');
        
        // Detection elements
        this.detectionLabel = document.getElementById('detectionLabel');
        this.addDetectionLabel = document.getElementById('addDetectionLabel');
        this.detectionLabelsContainer = document.getElementById('detectionLabels');
        this.currentDetectionLabel = document.getElementById('currentDetectionLabel');
        this.detectionFileInput = document.getElementById('detectionFileInput');
        this.loadDetectionFile = document.getElementById('loadDetectionFile');
        this.bboxList = document.getElementById('bboxList');
        this.clearAllBoxes = document.getElementById('clearAllBoxes');
        
        // Export elements
        this.exportJson = document.getElementById('exportJson');
        this.exportCsv = document.getElementById('exportCsv');
        this.exportYolo = document.getElementById('exportYolo');
        
        // Settings elements
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettings = document.getElementById('closeSettings');
        this.saveShortcuts = document.getElementById('saveShortcuts');
        this.resetShortcuts = document.getElementById('resetShortcuts');
        this.shortcutInputs = {
            prev: document.getElementById('shortcut-prev'),
            next: document.getElementById('shortcut-next'),
            clearBoxes: document.getElementById('shortcut-clear-boxes')
        };
        
        // ゼロショット予測パネルにボタンを追加
        const zeroShotInput = document.querySelector('.zero-shot-input');
        if (zeroShotInput) {
            zeroShotInput.insertBefore(this.autoInferenceToggle, zeroShotInput.firstChild);
            zeroShotInput.appendChild(this.useLoadedLabels);
        }
        
        // 物体検出パネルにボタンとトグルを追加
        if (this.detectionPanel) {
            this.detectionPanel.insertBefore(this.protectAnnotationsToggle, this.detectionPanel.firstChild.nextSibling);
            this.detectionPanel.insertBefore(this.useYoloLabels, this.detectionPanel.firstChild.nextSibling);
        }
    }

    initEventListeners() {
        // Image handling
        this.imageInput.addEventListener('change', (e) => this.loadImages(e));
        this.prevBtn.addEventListener('click', () => this.previousImage());
        this.nextBtn.addEventListener('click', () => this.nextImage());
          // Mode switching
        this.modeToggle.addEventListener('change', (e) => {
            const mode = e.target.checked ? 'detection' : 'classification';
            this.switchMode(mode);
        });
        
        // Classification
        this.addClassLabel.addEventListener('click', () => this.addClassificationLabel());
        this.classificationLabel.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addClassificationLabel();
        });
        this.currentClassification.addEventListener('change', (e) => this.setClassification(e.target.value));
        this.loadClassificationFile.addEventListener('click', () => this.classificationFileInput.click());
        this.classificationFileInput.addEventListener('change', (e) => this.loadLabelsFromFile(e, 'classification'));
        
        // Detection
        this.addDetectionLabel.addEventListener('click', () => this.addDetectionLabel());
        this.detectionLabel.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addDetectionLabel();
        });
        this.loadDetectionFile.addEventListener('click', () => this.detectionFileInput.click());
        this.detectionFileInput.addEventListener('change', (e) => this.loadLabelsFromFile(e, 'detection'));
        this.clearAllBoxes.addEventListener('click', () => this.clearAllBoundingBoxes());
        
        // Canvas events (更新: 編集機能対応)
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseout', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        
        // Export
        this.exportJson.addEventListener('click', () => this.exportData('json'));
        this.exportCsv.addEventListener('click', () => this.exportData('csv'));
        this.exportYolo.addEventListener('click', () => this.exportYoloFormat());
        
        // Settings
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeSettings.addEventListener('click', () => this.closeSettingsModal());
        this.saveShortcuts.addEventListener('click', () => this.saveShortcutSettings());
        this.resetShortcuts.addEventListener('click', () => this.resetShortcutSettings());
        
        // Modal close on outside click
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.closeSettingsModal();
            }
        });
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcut(e));
        
        // Shortcut input validation
        Object.values(this.shortcutInputs).forEach(input => {
            input.addEventListener('input', (e) => this.validateShortcutInput(e));
        });
        
        // ゼロショット予測
        this.runZeroShot.addEventListener('click', () => this.runZeroShotPrediction());
        this.useLoadedLabels.addEventListener('click', () => this.useLoadedLabelsForPrediction());
        
        // 自動推論トグルのイベントリスナー
        const toggle = this.autoInferenceToggle.querySelector('#autoInferenceToggle');
        toggle.addEventListener('change', (e) => {
            this.autoInference = e.target.checked;
            if (this.autoInference && this.currentImage) {
                this.runZeroShotPrediction();
            }
        });
        
        // 既存アノテーション保護トグルのイベントリスナー
        const protectToggle = this.protectAnnotationsToggle.querySelector('#protectAnnotationsToggle');
        protectToggle.addEventListener('change', (e) => {
            this.protectExistingAnnotations = e.target.checked;
            console.log('Protect existing annotations:', this.protectExistingAnnotations);
        });
        
        // YOLO-World用の「読み込んだラベルを使用」ボタンのイベントリスナー
        this.useYoloLabels.addEventListener('click', () => {
            if (this.detectionLabels.length === 0) {
                this.showNotification('検出ラベルが設定されていません。ラベルファイルを読み込んでください。', 'error');
                return;
            }
            
            if (!this.currentImage) {
                this.showNotification('画像が選択されていません', 'error');
                return;
            }
            
            console.log('Using loaded labels for YOLO-World detection:', this.detectionLabels);
            this.runYoloDetection();
        });
    }

    loadImages(event) {
        const files = Array.from(event.target.files);
        this.images = files.filter(file => file.type.startsWith('image/'));
        this.currentImageIndex = 0;
        this.updateImageCounter();
        this.updateNavigationButtons();
        
        if (this.images.length > 0) {
            this.loadCurrentImage();
        }
    }

    async loadCurrentImage() {
        if (this.images.length === 0) return;
        
        // 画像切り替え時にゼロショット予測結果をクリア
        this.zeroShotResults.innerHTML = '';
        
        const file = this.images[this.currentImageIndex];
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            const img = new Image();
            img.onload = async () => {
                this.displayImage(img);
                this.loadAnnotation();
                
                console.log('Image loaded. YOLO detection enabled:', this.yoloDetectionEnabled);
                console.log('YOLO detection running:', this.isYoloDetectionRunning);
                console.log('Protect existing annotations:', this.protectExistingAnnotations);
                
                // 既存アノテーション保護の確認
                const imageKey = this.getCurrentImageKey();
                const existingAnnotation = this.annotations.get(imageKey);
                const hasExistingDetections = existingAnnotation && existingAnnotation.detections && existingAnnotation.detections.length > 0;
                
                // YOLO検出の実行判定（既存アノテーション保護を考慮）
                const shouldRunYoloDetection = this.detectionLabels.length > 0 && 
                                             !this.isYoloDetectionRunning && 
                                             !(this.protectExistingAnnotations && hasExistingDetections);
                
                if (shouldRunYoloDetection) {
                    console.log('Running YOLO-World detection after image load...');
                    await this.runYoloDetection();
                } else if (this.isYoloDetectionRunning) {
                    console.log('YOLO-World detection already running, skipping...');
                } else if (this.protectExistingAnnotations && hasExistingDetections) {
                    console.log('Skipping YOLO detection: existing annotations found and protection enabled');
                } else if (this.detectionLabels.length === 0) {
                    console.log('No detection labels available for YOLO-World detection');
                }
                
                // 自動推論が有効な場合、推論を実行（分類モードのみ）
                if (this.mode === 'classification' && this.autoInference && this.zeroShotPrompts.value.trim()) {
                    console.log('Running zero-shot prediction with auto-inference enabled');
                    await this.runZeroShotPrediction();
                }
            };
            img.src = e.target.result;
        };
        
        reader.readAsDataURL(file);
    }

    displayImage(img) {
        const containerRect = this.canvas.parentElement.getBoundingClientRect();
        const maxWidth = containerRect.width - 40;
        const maxHeight = containerRect.height - 40;
        
        let { width, height } = this.calculateImageSize(img.width, img.height, maxWidth, maxHeight);
        
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.display = 'block';
        this.imagePreview.style.display = 'none';
        
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.drawImage(img, 0, 0, width, height);
        
        this.currentImage = img;
        this.imageScale = width / img.width;
        
        this.redrawAnnotations();
    }

    calculateImageSize(imgWidth, imgHeight, maxWidth, maxHeight) {
        const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
        return {
            width: imgWidth * ratio,
            height: imgHeight * ratio
        };
    }

    switchMode(mode) {
        this.mode = mode;
        this.classificationPanel.style.display = mode === 'classification' ? 'block' : 'none';
        this.detectionPanel.style.display = mode === 'detection' ? 'block' : 'none';
        this.canvas.style.cursor = mode === 'detection' ? 'crosshair' : 'default';
        
        // ゼロショット予測パネルの表示/非表示を切り替え
        const zeroShotPanel = document.getElementById('zeroShotPanel');
        zeroShotPanel.style.display = mode === 'classification' ? 'block' : 'none';
        
        // YOLO保存ボタンは物体検出モードの時のみ表示
        this.exportYolo.style.display = mode === 'detection' ? 'inline-block' : 'none';
        
        // 分類モードに切り替えた場合、選択状態をクリア
        if (mode === 'classification') {
            this.selectedBox = null;
        }
        
        // モード切り替え時にcanvasを再描画
        if (this.currentImage) {
            this.redrawImage();
            this.redrawAnnotations();
        }
    }

    addClassificationLabel() {
        const label = this.classificationLabel.value.trim();
        if (label && !this.classificationLabels.includes(label)) {
            this.classificationLabels.push(label);
            this.updateClassificationLabels();
            this.classificationLabel.value = '';
            this.saveData();
        }
    }

    updateClassificationLabels() {
        this.classificationLabelsContainer.innerHTML = '';
        this.currentClassification.innerHTML = '<option value="">選択してください</option>';
          this.classificationLabels.forEach((label, index) => {
            // Label list with shortcut key indicator
            const div = document.createElement('div');
            div.className = 'label-item';
            const shortcutKey = index < 9 ? `[${index + 1}]` : '';
            div.innerHTML = `
                <span class="label-text">${shortcutKey} ${label}</span>
                <button onclick="tool.removeClassificationLabel(${index})">削除</button>
            `;
            this.classificationLabelsContainer.appendChild(div);
            
            // Select option
            const option = document.createElement('option');
            option.value = label;
            option.textContent = label;
            this.currentClassification.appendChild(option);
        });
    }

    removeClassificationLabel(index) {
        this.classificationLabels.splice(index, 1);
        this.updateClassificationLabels();
        this.saveData();
    }

    loadLabelsFromFile(event, type) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const lines = content.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);

                let addedCount = 0;
                let targetArray, updateMethod;

                if (type === 'classification') {
                    targetArray = this.classificationLabels;
                    updateMethod = () => this.updateClassificationLabels();
                } else {
                    targetArray = this.detectionLabels;
                    updateMethod = () => this.updateDetectionLabels();
                }

                // 既存のラベルをクリア
                targetArray.length = 0;

                // 新しいラベルを追加
                lines.forEach(label => {
                    if (label && !targetArray.includes(label)) {
                        targetArray.push(label);
                        addedCount++;
                    }
                });

                updateMethod();
                this.saveData();

                // ファイル入力をリセット
                event.target.value = '';

                // 結果をユーザーに通知
                if (addedCount > 0) {
                    this.showNotification(`${addedCount}個のラベルを読み込みました`, 'success');
                    
                    // 検出ラベルの場合、YOLO-World検出が有効なら自動的に検出を実行
                    if (type === 'detection' && this.yoloDetectionEnabled && this.currentImage) {
                        console.log('Running YOLO-World detection with loaded labels:', targetArray);
                        this.runYoloDetection();
                    }
                } else {
                    this.showNotification('ラベルが読み込めませんでした（空のファイルまたは無効な形式）', 'error');
                }

            } catch (error) {
                console.error('Error reading file:', error);
                this.showNotification('ファイルの読み込みに失敗しました。テキストファイルを選択してください。', 'error');
            }
        };

        reader.readAsText(file, 'UTF-8');
    }

    addDetectionLabel() {
        const label = this.detectionLabel.value.trim();
        if (label && !this.detectionLabels.includes(label)) {
            this.detectionLabels.push(label);
            this.updateDetectionLabels();
            this.detectionLabel.value = '';
            this.saveData();
        }
    }

    updateDetectionLabels() {
        this.detectionLabelsContainer.innerHTML = '';
        this.currentDetectionLabel.innerHTML = '<option value="">選択してください</option>';
        
        this.detectionLabels.forEach((label, index) => {
            // Label list
            const div = document.createElement('div');
            div.className = 'label-item';
            div.innerHTML = `
                <span>${label}</span>
                <button onclick="tool.removeDetectionLabel(${index})">削除</button>
            `;
            this.detectionLabelsContainer.appendChild(div);
            
            // Select option
            const option = document.createElement('option');
            option.value = label;
            option.textContent = label;
            this.currentDetectionLabel.appendChild(option);
        });
    }

    removeDetectionLabel(index) {
        this.detectionLabels.splice(index, 1);
        this.updateDetectionLabels();
        this.saveData();
    }

    setClassification(label) {
        if (this.images.length === 0) return;
        
        const imageKey = this.getCurrentImageKey();
        if (!this.annotations.has(imageKey)) {
            this.annotations.set(imageKey, { classification: null, detections: [] });
        }
        
        this.annotations.get(imageKey).classification = label || null;
        this.saveData();
    }

    startDrawing(e) {
        if (this.mode !== 'detection' || !this.currentDetectionLabel.value) return;
        
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        this.startX = e.clientX - rect.left;
        this.startY = e.clientY - rect.top;
    }

    draw(e) {
        if (!this.isDrawing || this.mode !== 'detection') return;
        
        const rect = this.canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        this.redrawImage();
        this.redrawAnnotations();
        
        // Draw current box
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            this.startX,
            this.startY,
            currentX - this.startX,
            currentY - this.startY
        );
    }

    stopDrawing(e) {
        if (!this.isDrawing || this.mode !== 'detection') return;
        
        this.isDrawing = false;
        const rect = this.canvas.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;
        
        const width = Math.abs(endX - this.startX);
        const height = Math.abs(endY - this.startY);
        
        if (width > 10 && height > 10) { // Minimum size check
            this.addBoundingBox(
                Math.min(this.startX, endX),
                Math.min(this.startY, endY),
                width,
                height,
                this.currentDetectionLabel.value
            );
        }
        
        this.redrawImage();
        this.redrawAnnotations();
    }

    addBoundingBox(x, y, width, height, label) {
        const imageKey = this.getCurrentImageKey();
        if (!this.annotations.has(imageKey)) {
            this.annotations.set(imageKey, { classification: null, detections: [] });
        }
        
        // Convert to original image coordinates
        const originalX = x / this.imageScale;
        const originalY = y / this.imageScale;
        const originalWidth = width / this.imageScale;
        const originalHeight = height / this.imageScale;
        
        const detection = {
            label,
            x: originalX,
            y: originalY,
            width: originalWidth,
            height: originalHeight,
            canvasX: x,
            canvasY: y,
            canvasWidth: width,
            canvasHeight: height
        };
        
        console.log('Adding detection to annotations:', detection);
        this.annotations.get(imageKey).detections.push(detection);
        this.updateBoundingBoxList();
        this.redrawImage();
        this.redrawAnnotations();
        this.saveData();
    }

    updateBoundingBoxList() {
        const imageKey = this.getCurrentImageKey();
        const annotation = this.annotations.get(imageKey);
        
        this.bboxList.innerHTML = '';
        
        if (annotation && annotation.detections) {
            annotation.detections.forEach((detection, index) => {
                const div = document.createElement('div');
                div.className = 'bbox-item';
                div.innerHTML = `
                    <div class="bbox-label">${detection.label}</div>
                    <div class="bbox-coords">
                        x: ${Math.round(detection.x)}, y: ${Math.round(detection.y)}<br>
                        w: ${Math.round(detection.width)}, h: ${Math.round(detection.height)}
                    </div>
                    <button onclick="tool.removeBoundingBox(${index})">削除</button>
                `;
                this.bboxList.appendChild(div);
            });
        }
    }

    removeBoundingBox(index) {
        const imageKey = this.getCurrentImageKey();
        const annotation = this.annotations.get(imageKey);
        
        if (annotation && annotation.detections) {
            annotation.detections.splice(index, 1);
            this.updateBoundingBoxList();
            this.redrawImage();
            this.redrawAnnotations();
            this.saveData();
        }
    }

    clearAllBoundingBoxes() {
        const imageKey = this.getCurrentImageKey();
        const annotation = this.annotations.get(imageKey);
        
        if (annotation) {
            annotation.detections = [];
            this.selectedBox = null; // 選択状態もクリア
            this.updateBoundingBoxList();
            this.redrawImage();
            this.saveData();
        }
    }

    redrawImage() {
        if (this.currentImage) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(this.currentImage, 0, 0, this.canvas.width, this.canvas.height);
        }
    }

    redrawAnnotations() {
        // 分類モードの場合はバウンディングボックスを描画しない
        if (this.mode === 'classification') {
            return;
        }
        
        const imageKey = this.getCurrentImageKey();
        const annotation = this.annotations.get(imageKey);
        
        console.log('Redrawing annotations for:', imageKey);
        console.log('Annotation data:', annotation);
        
        if (annotation && annotation.detections && annotation.detections.length > 0) {
            console.log(`Drawing ${annotation.detections.length} bounding boxes`);
            
            // 第1段階: すべてのバウンディングボックスを描画
            annotation.detections.forEach((detection, index) => {
                console.log(`Drawing box ${index}:`, {
                    x: detection.canvasX,
                    y: detection.canvasY,
                    width: detection.canvasWidth,
                    height: detection.canvasHeight,
                    label: detection.label
                });
                
                // 選択されたボックスかどうかで色を変える
                const isSelected = detection === this.selectedBox;
                
                // Draw bounding box
                this.ctx.strokeStyle = isSelected ? '#ff6b6b' : '#00ff00';
                this.ctx.lineWidth = isSelected ? 4 : 3;
                this.ctx.strokeRect(
                    detection.canvasX,
                    detection.canvasY,
                    detection.canvasWidth,
                    detection.canvasHeight
                );
                
                // 選択されたボックスにリサイズハンドルを描画
                if (isSelected) {
                    this.drawResizeHandles(detection);
                }
            });
            
            // 第2段階: すべてのラベルを描画（最前面に表示）
            annotation.detections.forEach((detection, index) => {
                const isSelected = detection === this.selectedBox;
                
                // ラベルの動的配置を計算
                const labelInfo = this.calculateLabelPosition(detection);
                
                // ラベルの背景を描画（影効果付き）
                this.ctx.font = 'bold 14px Arial';
                const textWidth = this.ctx.measureText(detection.label).width;
                const labelHeight = 22;
                const padding = 6;
                
                // 影効果
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.fillRect(
                    labelInfo.x + 2,
                    labelInfo.y + 2,
                    textWidth + padding + 2,
                    labelHeight + 2
                );
                
                // メインの背景
                this.ctx.fillStyle = isSelected ? '#ff6b6b' : '#00ff00';
                this.ctx.fillRect(
                    labelInfo.x,
                    labelInfo.y,
                    textWidth + padding + 2,
                    labelHeight + 2
                );
                
                // ラベルのテキストを描画
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillText(
                    detection.label, 
                    labelInfo.x + padding/2, 
                    labelInfo.y + labelHeight - 6
                );
                
                // ラベルの枠線を描画
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(
                    labelInfo.x,
                    labelInfo.y,
                    textWidth + padding + 2,
                    labelHeight + 2
                );
            });
            
            // 第3段階: 選択されたボックスのラベルを最後に描画（最前面保証）
            if (this.selectedBox) {
                const detection = this.selectedBox;
                const labelInfo = this.calculateLabelPosition(detection);
                
                // Draw selected label with enhanced visibility
                this.ctx.font = 'bold 16px Arial'; // 少し大きく
                const textWidth = this.ctx.measureText(detection.label).width;
                const labelHeight = 26; // 少し高く
                const padding = 8; // パディングも増加
                
                // 強化された影効果
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                this.ctx.fillRect(
                    labelInfo.x + 3,
                    labelInfo.y + 3,
                    textWidth + padding + 2,
                    labelHeight + 2
                );
                
                // メインの背景（選択色）
                this.ctx.fillStyle = '#ff6b6b';
                this.ctx.fillRect(
                    labelInfo.x,
                    labelInfo.y,
                    textWidth + padding + 2,
                    labelHeight + 2
                );
                
                // テキスト
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillText(
                    detection.label, 
                    labelInfo.x + padding/2, 
                    labelInfo.y + labelHeight - 8
                );
                
                // 強化された枠線
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(
                    labelInfo.x,
                    labelInfo.y,
                    textWidth + padding + 2,
                    labelHeight + 2
                );
            }
        } else {
            console.log('No detections to draw');
        }
    }
    
    drawResizeHandles(box) {
        const handleSize = 8;
        const halfHandle = handleSize / 2;
        
        const handles = [
            { x: box.canvasX - halfHandle, y: box.canvasY - halfHandle },
            { x: box.canvasX + box.canvasWidth / 2 - halfHandle, y: box.canvasY - halfHandle },
            { x: box.canvasX + box.canvasWidth - halfHandle, y: box.canvasY - halfHandle },
            { x: box.canvasX + box.canvasWidth - halfHandle, y: box.canvasY + box.canvasHeight / 2 - halfHandle },
            { x: box.canvasX + box.canvasWidth - halfHandle, y: box.canvasY + box.canvasHeight - halfHandle },
            { x: box.canvasX + box.canvasWidth / 2 - halfHandle, y: box.canvasY + box.canvasHeight - halfHandle },
            { x: box.canvasX - halfHandle, y: box.canvasY + box.canvasHeight - halfHandle },
            { x: box.canvasX - halfHandle, y: box.canvasY + box.canvasHeight / 2 - halfHandle }
        ];
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;
        
        handles.forEach(handle => {
            this.ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
            this.ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
        });
    }

    loadAnnotation() {
        const imageKey = this.getCurrentImageKey();
        const annotation = this.annotations.get(imageKey);
        
        if (annotation) {
            // Load classification
            this.currentClassification.value = annotation.classification || '';
            
            // Update canvas coordinates for detections
            if (annotation.detections) {
                annotation.detections.forEach(detection => {
                    detection.canvasX = detection.x * this.imageScale;
                    detection.canvasY = detection.y * this.imageScale;
                    detection.canvasWidth = detection.width * this.imageScale;
                    detection.canvasHeight = detection.height * this.imageScale;
                });
            }
            
            this.updateBoundingBoxList();
        } else {
            this.currentClassification.value = '';
            this.updateBoundingBoxList();
        }
    }

    getCurrentImageKey() {
        return this.images[this.currentImageIndex]?.name || `image_${this.currentImageIndex}`;
    }

    previousImage() {
        if (this.currentImageIndex > 0) {
            this.currentImageIndex--;
            this.loadCurrentImage();
            this.updateImageCounter();
            this.updateNavigationButtons();
        }
    }

    nextImage() {
        if (this.currentImageIndex < this.images.length - 1) {
            this.currentImageIndex++;
            this.loadCurrentImage();
            this.updateImageCounter();
            this.updateNavigationButtons();
        }
    }

    updateImageCounter() {
        this.imageCounter.textContent = `${this.currentImageIndex + 1} / ${this.images.length}`;
    }

    updateNavigationButtons() {
        this.prevBtn.disabled = this.currentImageIndex === 0;
        this.nextBtn.disabled = this.currentImageIndex === this.images.length - 1 || this.images.length === 0;
    }

    exportData(format) {
        const data = {
            classificationLabels: this.classificationLabels,
            detectionLabels: this.detectionLabels,
            annotations: Object.fromEntries(this.annotations)
        };
        
        if (format === 'json') {
            this.downloadJson(data);
        } else if (format === 'csv') {
            this.downloadCsv(data);
        }
    }

    downloadJson(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'annotations.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    downloadCsv(data) {
        let csv = 'Image,Classification,Detection_Label,X,Y,Width,Height\n';
        
        for (const [imageName, annotation] of Object.entries(data.annotations)) {
            if (annotation.classification) {
                csv += `${imageName},${annotation.classification},,,,\n`;
            }
            
            if (annotation.detections && annotation.detections.length > 0) {
                annotation.detections.forEach(detection => {
                    csv += `${imageName},,${detection.label},${detection.x},${detection.y},${detection.width},${detection.height}\n`;
                });
            }
            
            if (!annotation.classification && (!annotation.detections || annotation.detections.length === 0)) {
                csv += `${imageName},,,,,,\n`;
            }
        }
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'annotations.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    async exportYoloFormat() {
        if (this.mode === 'classification') {
            this.showNotification('YOLO形式は物体検出モード専用です');
            return;
        }

        if (this.images.length === 0) {
            this.showNotification('エクスポートする画像がありません');
            return;
        }

        let hasDetectionAnnotations = false;
        for (let [imageKey, annotation] of this.annotations) {
            if (annotation.detections && annotation.detections.length > 0) {
                hasDetectionAnnotations = true;
                break;
            }
        }

        if (!hasDetectionAnnotations) {
            this.showNotification('物体検出のアノテーションがありません');
            return;
        }

        try {
            const zip = new JSZip();
            
            const classesContent = this.detectionLabels.join('\n');
            zip.file('classes.txt', classesContent);
            
            for (let i = 0; i < this.images.length; i++) {
                const imageKey = this.images[i].name;
                const annotation = this.annotations.get(imageKey);
                if (annotation && annotation.detections && annotation.detections.length > 0) {
                    const imageName = this.images[i].name;
                    const imageNameWithoutExt = imageName.substring(0, imageName.lastIndexOf('.')) || imageName;
                    const yoloContent = this.convertToYoloFormat(annotation.detections, i);
                    if (yoloContent.trim()) {
                        zip.file(`${imageNameWithoutExt}.txt`, yoloContent);
                    }
                }
            }
            
            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'yolo_annotations.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('YOLO形式でエクスポートしました');
        } catch (error) {
            console.error('YOLO export error:', error);
            this.showNotification('エクスポート中にエラーが発生しました');
        }
    }

    convertToYoloFormat(detections, imageIndex) {
        const lines = [];
        
        const image = this.currentImage;
        if (!image) return '';
        
        const imageWidth = image.naturalWidth;
        const imageHeight = image.naturalHeight;
        
        for (const detection of detections) {
            const classIndex = this.detectionLabels.indexOf(detection.label);
            if (classIndex === -1) continue;
            
            const centerX = (detection.x + detection.width / 2) / imageWidth;
            const centerY = (detection.y + detection.height / 2) / imageHeight;
            const normalizedWidth = detection.width / imageWidth;
            const normalizedHeight = detection.height / imageHeight;
            
            if (centerX >= 0 && centerX <= 1 && centerY >= 0 && centerY <= 1 && 
                normalizedWidth > 0 && normalizedWidth <= 1 && normalizedHeight > 0 && normalizedHeight <= 1) {
                lines.push(`${classIndex} ${centerX.toFixed(6)} ${centerY.toFixed(6)} ${normalizedWidth.toFixed(6)} ${normalizedHeight.toFixed(6)}`);
            }
        }
        
        return lines.join('\n');
    }

    saveData() {
        const data = {
            classificationLabels: this.classificationLabels,
            detectionLabels: this.detectionLabels,
            annotations: Object.fromEntries(this.annotations)
        };
        localStorage.setItem('annotationToolData', JSON.stringify(data));
    }

    loadSavedData() {
        const saved = localStorage.getItem('annotationToolData');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.classificationLabels = data.classificationLabels || [];
                this.detectionLabels = data.detectionLabels || [];
                this.annotations = new Map(Object.entries(data.annotations || {}));
                
                this.updateClassificationLabels();
                this.updateDetectionLabels();
            } catch (e) {
                console.error('Failed to load saved data:', e);
            }
        }
        
        this.loadShortcutSettings();
    }

    openSettings() {
        this.updateShortcutInputs();
        this.settingsModal.style.display = 'block';
    }

    closeSettingsModal() {
        this.settingsModal.style.display = 'none';
    }

    updateShortcutInputs() {
        Object.keys(this.shortcutInputs).forEach(key => {
            const shortcut = this.shortcuts[key];
            if (shortcut === 'ArrowLeft') {
                this.shortcutInputs[key].value = '←';
            } else if (shortcut === 'ArrowRight') {
                this.shortcutInputs[key].value = '→';
            } else if (shortcut === 'Delete') {
                this.shortcutInputs[key].value = 'Del';
            } else {
                this.shortcutInputs[key].value = shortcut.toUpperCase();
            }
        });
    }

    validateShortcutInput(event) {
        const input = event.target;
        const value = input.value.toLowerCase();
        
        if (value === '←' || value === 'left') {
            input.value = '←';
        } else if (value === '→' || value === 'right') {
            input.value = '→';
        } else if (value === 'del' || value === 'delete') {
            input.value = 'Del';
        } else {
            input.value = value.toUpperCase();
        }
    }

    saveShortcutSettings() {
        const newShortcuts = {};
        
        Object.keys(this.shortcutInputs).forEach(key => {
            const input = this.shortcutInputs[key];
            let value = input.value.toLowerCase();
            
            if (value === '←') {
                value = 'ArrowLeft';
            } else if (value === '→') {
                value = 'ArrowRight';
            } else if (value === 'del') {
                value = 'Delete';
            }
            
            newShortcuts[key] = value || this.defaultShortcuts[key];
        });
        
        this.shortcuts = newShortcuts;
        localStorage.setItem('annotationToolShortcuts', JSON.stringify(this.shortcuts));
        this.closeSettingsModal();
        
        this.showNotification('ショートカットキーを保存しました');
    }

    resetShortcutSettings() {
        this.shortcuts = { ...this.defaultShortcuts };
        this.updateShortcutInputs();
        localStorage.removeItem('annotationToolShortcuts');
        this.showNotification('ショートカットキーをデフォルトに戻しました');
    }

    loadShortcutSettings() {
        const saved = localStorage.getItem('annotationToolShortcuts');
        if (saved) {
            try {
                this.shortcuts = { ...this.defaultShortcuts, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Failed to load shortcut settings:', e);
            }
        }
    }

    handleKeyboardShortcut(event) {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        const key = event.key;
        const keyLower = key.toLowerCase();
        if (key === this.shortcuts.prev) {
            event.preventDefault();
            this.previousImage();
        } else if (key === this.shortcuts.next) {
            event.preventDefault();
            this.nextImage();
        } else if (key === this.shortcuts.clearBoxes && this.mode === 'detection') {
            event.preventDefault();
            this.clearAllBoundingBoxes();
        }
        
        // 分類モードでの処理
        if (this.mode === 'classification') {
            // 数字キー(1-9)で選択
            if (/^[1-9]$/.test(key)) {
                const labelIndex = parseInt(key) - 1;
                
                // 予測結果がある場合は予測結果から選択を優先
                const predictionResults = this.zeroShotResults.querySelectorAll('.zero-shot-result-item[data-index]');
                if (predictionResults.length > 0 && labelIndex < predictionResults.length) {
                    event.preventDefault();
                    if (this.selectPredictionByIndex(labelIndex)) {
                        return; // 予測結果から選択できた場合は終了
                    }
                }
                
                // 予測結果がない場合は従来の分類ラベルから選択
                if (labelIndex < this.classificationLabels.length) {
                    event.preventDefault();
                    const label = this.classificationLabels[labelIndex];
                    this.currentClassification.value = label;
                    this.setClassification(label);
                    this.showNotification(`分類: ${label} を選択`, 'success');
                }
            }
            
            // スペースキーで最高スコアの予測結果を選択
            else if (key === ' ') {
                const topResult = this.zeroShotResults.querySelector('.zero-shot-result-item[data-index="0"]');
                if (topResult) {
                    event.preventDefault();
                    this.selectTopPrediction();
                }
            }
            
            // Enterキーで予測実行
            else if (key === 'Enter') {
                if (this.zeroShotPrompts.value.trim()) {
                    event.preventDefault();
                    this.runZeroShotPrediction();
                }
            }
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#e74c3c' : type === 'info' ? '#3498db' : '#27ae60'};
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 1001;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    async initVlm() {
        if (this.modelLoading) return;
        this.modelLoading = true;

        try {
            this.isVlmEnabled = true;
            this.showNotification('サーバーに接続しました', 'success');
        } catch (error) {
            console.error('Failed to connect to server:', error);
            this.showNotification(`サーバーへの接続に失敗しました: ${error.message}`, 'error');
            this.isVlmEnabled = false;
        } finally {
            this.modelLoading = false;
        }
    }

    async runVlmInference(image) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = this.currentImage.width;
            canvas.height = this.currentImage.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(this.currentImage, 0, 0);

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
            const formData = new FormData();
            formData.append('file', blob);
            formData.append('task_type', 'zero_shot');
            formData.append('prompt', this.currentClassification.value || this.classificationLabels[0]);

            const response = await fetch('http://127.0.0.1:8000/predict', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return {
                label: this.currentClassification.value || this.classificationLabels[0],
                confidence: result.confidence
            };
        } catch (error) {
            console.error('Inference failed:', error);
            this.showNotification('推論に失敗しました', 'error');
            return null;
        }
    }

    handleVlmResults(results) {
        if (this.mode === 'classification') {
            this.currentClassification.value = results.label;
            this.setClassification(results.label);
            this.showNotification(`VLM suggests: ${results.label} (confidence: ${(results.confidence * 100).toFixed(1)}%)`);
        } else {
            results.forEach(det => {
                if (det.confidence > 0.5) {
                    this.addBoundingBox(
                        det.x,
                        det.y,
                        det.width,
                        det.height,
                        det.label
                    );
                }
            });
            this.showNotification(`VLM detected ${results.length} objects`);
        }
    }

    async preprocessImage(image) {
        const canvas = document.createElement('canvas');
        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(image, 0, 0, 224, 224);
        
        const imageData = ctx.getImageData(0, 0, 224, 224);
        const data = imageData.data;
        
        const normalizedData = new Float32Array(3 * 224 * 224);
        for (let i = 0; i < data.length; i += 4) {
            normalizedData[i/4] = data[i] / 255.0;
            normalizedData[i/4 + 224*224] = data[i+1] / 255.0;
            normalizedData[i/4 + 2*224*224] = data[i+2] / 255.0;
        }
        
        return normalizedData;
    }

    async runZeroShotPrediction() {
        if (!this.isVlmEnabled) {
            if (!this.modelLoading) {
                this.showNotification('VLMモデルを再読み込み中...', 'info');
                await this.initVlm();
            } else {
                this.showNotification('VLMモデルの読み込み中です。しばらくお待ちください。', 'info');
                return;
            }
        }

        if (!this.currentImage) {
            this.showNotification('画像が選択されていません', 'error');
            return;
        }

        const prompts = this.zeroShotPrompts.value
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (prompts.length === 0) {
            this.showNotification('予測したいラベルを入力してください', 'error');
            return;
        }

        try {
            console.log('Starting zero-shot prediction...');
            console.log('Prompts:', prompts);
            
            const results = [];
            for (const prompt of prompts) {
                console.log('Processing prompt:', prompt);
                try {
                    const result = await this.runZeroShotInference(this.currentImage, prompt);
                    console.log('Prediction result:', result);
                    results.push({
                        label: prompt,
                        confidence: result
                    });
                } catch (error) {
                    console.error('Error processing prompt:', prompt, error);
                    this.showNotification(`プロンプト "${prompt}" の処理中にエラーが発生しました: ${error.message}`, 'error');
                }
            }

            if (results.length > 0) {
                this.displayZeroShotResults(results);
                this.showNotification('予測が完了しました', 'success');
            } else {
                this.showNotification('予測結果が得られませんでした', 'error');
            }
        } catch (error) {
            console.error('Zero-shot prediction failed:', error);
            this.showNotification(`予測中にエラーが発生しました: ${error.message}`, 'error');
        }
    }

    async runZeroShotInference(image, prompt) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = this.currentImage.width;
            canvas.height = this.currentImage.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(this.currentImage, 0, 0);

            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/jpeg', 0.95);
            });

            const formData = new FormData();
            formData.append('file', blob, 'image.jpg');
            formData.append('task_type', 'zero_shot');
            formData.append('prompt', prompt);

            const response = await fetch('http://127.0.0.1:8000/predict', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (typeof result.confidence !== 'number') {
                throw new Error('Invalid response format: confidence is not a number');
            }
            return result.confidence;
        } catch (error) {
            console.error('Error in runZeroShotInference:', error);
            throw error;
        }
    }

    displayZeroShotResults(results) {
        results.sort((a, b) => b.confidence - a.confidence);

        this.zeroShotResults.innerHTML = '';
        
        // 結果が0の場合の処理
        if (results.length === 0) {
            this.zeroShotResults.innerHTML = '<div class="no-results">予測結果がありません</div>';
            return;
        }
        
        // 自動選択ボタンを追加
        const autoSelectDiv = document.createElement('div');
        autoSelectDiv.className = 'auto-select-controls';
        autoSelectDiv.innerHTML = `
            <button class="auto-select-btn" onclick="tool.selectTopPrediction()">
                最高スコアを選択 (${results[0].label}: ${results[0].confidence.toFixed(3)})
            </button>
        `;
        this.zeroShotResults.appendChild(autoSelectDiv);
        
        // 予測結果リストを表示
        results.forEach((result, index) => {
            if (typeof result.confidence !== 'number') {
                console.error('Invalid confidence value:', result);
                return;
            }
            
            const div = document.createElement('div');
            div.className = 'zero-shot-result-item clickable';
            div.dataset.label = result.label;
            div.dataset.confidence = result.confidence;
            div.dataset.index = index;
            
            // 数字キーのヒント（最初の9個のみ）
            const shortcutHint = index < 9 ? `[${index + 1}] ` : '';
            
            div.innerHTML = `
                <span class="zero-shot-shortcut">${shortcutHint}</span>
                <span class="zero-shot-label">${result.label}</span>
                <span class="zero-shot-confidence">${result.confidence.toFixed(3)}</span>
                <button class="select-result-btn" onclick="tool.selectPredictionResult('${result.label}', ${result.confidence})">選択</button>
            `;
            
            // クリックイベントを追加
            div.addEventListener('click', (e) => {
                if (!e.target.classList.contains('select-result-btn')) {
                    this.selectPredictionResult(result.label, result.confidence);
                }
            });
            
            this.zeroShotResults.appendChild(div);
        });
        
        // 使用方法のヒントを追加
        const hintDiv = document.createElement('div');
        hintDiv.className = 'prediction-hints';
        hintDiv.innerHTML = `
            <small>
                💡 使用方法: 
                クリックで選択 | 
                数字キー(1-${Math.min(results.length, 9)})で選択 | 
                最高スコア自動選択
            </small>
        `;
        this.zeroShotResults.appendChild(hintDiv);
    }
    
    // 予測結果から分類を選択する機能
    selectPredictionResult(label, confidence) {
        // 現在の分類を設定
        this.currentClassification.value = label;
        this.setClassification(label);
        
        // ビジュアルフィードバック
        this.showNotification(`分類「${label}」を選択しました (信頼度: ${confidence.toFixed(3)})`, 'success');
        
        // 選択された項目をハイライト
        const resultItems = this.zeroShotResults.querySelectorAll('.zero-shot-result-item');
        resultItems.forEach(item => {
            item.classList.remove('selected');
            if (item.dataset.label === label) {
                item.classList.add('selected');
                setTimeout(() => item.classList.remove('selected'), 2000);
            }
        });
    }
    
    // 最高スコアの予測結果を自動選択
    selectTopPrediction() {
        const firstResultItem = this.zeroShotResults.querySelector('.zero-shot-result-item[data-index="0"]');
        if (firstResultItem) {
            const label = firstResultItem.dataset.label;
            const confidence = parseFloat(firstResultItem.dataset.confidence);
            this.selectPredictionResult(label, confidence);
        }
    }
    
    // 数字キーで予測結果を選択
    selectPredictionByIndex(index) {
        const resultItem = this.zeroShotResults.querySelector(`.zero-shot-result-item[data-index="${index}"]`);
        if (resultItem) {
            const label = resultItem.dataset.label;
            const confidence = parseFloat(resultItem.dataset.confidence);
            this.selectPredictionResult(label, confidence);
            return true;
        }
        return false;
    }

    useLoadedLabelsForPrediction() {
        let labels = [];
        
        if (this.mode === 'classification') {
            labels = [...this.classificationLabels];
        } else {
            labels = [...this.detectionLabels];
        }
        
        if (labels.length === 0) {
            this.showNotification('読み込まれたラベルがありません', 'error');
            return;
        }
        
        this.zeroShotPrompts.value = labels.join('\n');
        
        this.runZeroShotPrediction();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .auto-inference-toggle {
                display: flex;
                align-items: center;
                margin: 10px 0;
            }
            
            .switch {
                position: relative;
                display: inline-block;
                width: 60px;
                height: 34px;
                margin-right: 10px;
            }
            
            .switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            
            .slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #ccc;
                transition: .4s;
            }
            
            .slider:before {
                position: absolute;
                content: "";
                height: 26px;
                width: 26px;
                left: 4px;
                bottom: 4px;
                background-color: white;
                transition: .4s;
            }
            
            input:checked + .slider {
                background-color: #2196F3;
            }
            
            input:checked + .slider:before {
                transform: translateX(26px);
            }
            
            .slider.round {
                border-radius: 34px;
            }
            
            .slider.round:before {
                border-radius: 50%;
            }
            
            .toggle-label {
                font-size: 14px;
                color: #333;
            }
            
            .use-yolo-labels-btn {
                margin: 10px 0;
                padding: 8px 16px;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }
            
            .use-yolo-labels-btn:hover {
                background-color: #45a049;
            }
            
            .use-yolo-labels-btn:disabled {
                background-color: #cccccc;
                cursor: not-allowed;
            }
            
            .protect-annotations-toggle {
                display: flex;
                align-items: center;
                padding: 10px;
                background-color: #f5f5f5;
                border-radius: 4px;
                margin-bottom: 15px;
            }
            
            .protect-annotations-toggle .toggle-label {
                font-weight: bold;
                color: #2c3e50;
            }
            
            /* 予測結果選択機能のスタイル */
            .auto-select-controls {
                margin-bottom: 10px;
                padding: 8px;
                background-color: #f8f9fa;
                border-radius: 4px;
                border: 1px solid #dee2e6;
            }
            
            .auto-select-btn {
                width: 100%;
                padding: 8px 12px;
                background-color: #28a745;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                font-weight: bold;
                transition: background-color 0.3s;
            }
            
            .auto-select-btn:hover {
                background-color: #218838;
            }
            
            .zero-shot-result-item.clickable {
                cursor: pointer;
                transition: all 0.3s ease;
                border: 1px solid transparent;
                border-radius: 4px;
                padding: 8px;
                margin: 2px 0;
                position: relative;
            }
            
            .zero-shot-result-item.clickable:hover {
                background-color: #f0f8ff;
                border-color: #3498db;
                transform: translateX(2px);
            }
            
            .zero-shot-result-item.selected {
                background-color: #d4edda !important;
                border-color: #28a745 !important;
                animation: pulse 0.5s ease-in-out;
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.02); }
                100% { transform: scale(1); }
            }
            
            .zero-shot-shortcut {
                font-weight: bold;
                color: #6c757d;
                font-size: 12px;
                margin-right: 8px;
                min-width: 25px;
                display: inline-block;
            }
            
            .select-result-btn {
                background-color: #007bff;
                color: white;
                border: none;
                border-radius: 3px;
                padding: 4px 8px;
                cursor: pointer;
                font-size: 11px;
                margin-left: 8px;
                transition: background-color 0.3s;
            }
            
            .select-result-btn:hover {
                background-color: #0056b3;
            }
            
            .prediction-hints {
                margin-top: 10px;
                padding: 8px;
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 4px;
                text-align: center;
            }
            
            .prediction-hints small {
                color: #856404;
                font-size: 12px;
                line-height: 1.4;
            }
            
            .no-results {
                text-align: center;
                color: #6c757d;
                font-style: italic;
                padding: 20px;
            }
        `;
        document.head.appendChild(style);
    }

    async runYoloDetection() {
        // 重複実行を防ぐ
        if (this.isYoloDetectionRunning) {
            console.log('YOLO detection already running, skipping...');
            return;
        }
        
        if (!this.currentImage) {
            console.log('YOLO detection skipped: no image');
            this.showNotification('画像が選択されていません', 'error');
            return;
        }

        // 実行中フラグを設定
        this.isYoloDetectionRunning = true;
        
        try {
            // 現在の検出ラベルをプロンプトとして使用
            const prompts = this.detectionLabels.join(',');
            console.log('Using prompts:', prompts);
            console.log('Detection labels:', this.detectionLabels);
            
            if (!prompts) {
                console.log('No detection labels available');
                this.showNotification('検出ラベルが設定されていません。ラベルファイルを読み込んでください。', 'error');
                return;
            }
            
            // 画像をBlobに変換
            const canvas = document.createElement('canvas');
            canvas.width = this.currentImage.width;
            canvas.height = this.currentImage.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(this.currentImage, 0, 0);
            
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
            const formData = new FormData();
            formData.append('file', blob, 'image.jpg');
            formData.append('prompts', prompts);

            console.log('Sending detection request with prompts:', prompts);
            // APIリクエスト
            const response = await fetch('/detect', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Detection failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('Received detection results:', result);
            
            if (!result.detections || result.detections.length === 0) {
                console.log('No detections found');
                this.showNotification('検出された物体はありません', 'info');
                return;
            }
            
            // 既存のバウンディングボックスをクリア（保護フラグに関係なく、手動実行の場合はクリア）
            this.clearAllBoundingBoxes();
            
            let validDetections = 0;
            // 検出結果をバウンディングボックスとして追加
            for (const detection of result.detections) {
                console.log('Processing detection:', detection);
                
                // ラベルが正しいかチェック
                if (!this.detectionLabels.includes(detection.label)) {
                    console.warn('Invalid label detected:', detection.label);
                    continue;
                }
                
                const { x, y, width, height } = detection.bbox;
                const imgWidth = this.currentImage.width;
                const imgHeight = this.currentImage.height;
                
                // 正規化された座標を実際の座標に変換
                const x1 = (x - width/2) * imgWidth;
                const y1 = (y - height/2) * imgHeight;
                const w = width * imgWidth;
                const h = height * imgHeight;
                
                console.log('Adding bounding box:', { 
                    label: detection.label, 
                    confidence: detection.confidence,
                    x: x1, 
                    y: y1, 
                    w, 
                    h 
                });
                
                // 座標が有効な範囲内かチェック
                if (x1 >= 0 && y1 >= 0 && w > 0 && h > 0 && 
                    x1 + w <= imgWidth && y1 + h <= imgHeight) {
                    this.addBoundingBox(x1, y1, w, h, detection.label);
                    validDetections++;
                } else {
                    console.warn('Invalid bounding box coordinates:', { x1, y1, w, h });
                }
            }
            
            if (validDetections > 0) {
                this.showNotification(`YOLO-World検出が完了しました（${validDetections}個の物体を検出）`, 'success');
            } else {
                this.showNotification('有効な検出結果がありませんでした', 'info');
            }
        } catch (error) {
            console.error('YOLO-World detection error:', error);
            this.showNotification(`YOLO-World検出に失敗しました: ${error.message}`, 'error');
        } finally {
            // 実行中フラグをリセット
            this.isYoloDetectionRunning = false;
            console.log('YOLO detection completed, flag reset');
        }
    }

    // 新しいマウスイベントハンドラ
    handleMouseDown(e) {
        // 分類モードでは何もしない
        if (this.mode !== 'detection') return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 既存のボックス内をクリックしたかチェック
        const clickedBox = this.getBoxAtPosition(x, y);
        
        if (clickedBox) {
            this.selectedBox = clickedBox;
            this.originalBox = { ...clickedBox };
            
            // リサイズハンドルをクリックしたかチェック
            const handle = this.getResizeHandle(x, y, clickedBox);
            if (handle) {
                this.isResizing = true;
                this.resizeHandle = handle;
                this.canvas.style.cursor = this.getResizeCursor(handle);
            } else {
                // ボックス内部をクリック（移動モード）
                this.isDragging = true;
                this.canvas.style.cursor = 'move';
            }
            
            this.dragStartX = x;
            this.dragStartY = y;
            this.updateBoundingBoxList();
            this.redrawImage();
            this.redrawAnnotations();
        } else {
            // 新しいボックスを描画開始
            if (this.currentDetectionLabel.value) {
                this.selectedBox = null;
                this.isDrawing = true;
                this.startX = x;
                this.startY = y;
                this.canvas.style.cursor = 'crosshair';
            }
        }
    }
    
    handleMouseMove(e) {
        // 分類モードでは何もしない
        if (this.mode !== 'detection') return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.isDrawing) {
            // 新しいボックスの描画
            this.redrawImage();
            this.redrawAnnotations();
            
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                this.startX,
                this.startY,
                x - this.startX,
                y - this.startY
            );
        } else if (this.isDragging && this.selectedBox) {
            // ボックスの移動
            const deltaX = x - this.dragStartX;
            const deltaY = y - this.dragStartY;
            
            this.selectedBox.canvasX = this.originalBox.canvasX + deltaX;
            this.selectedBox.canvasY = this.originalBox.canvasY + deltaY;
            
            // 元の座標も更新
            this.selectedBox.x = this.selectedBox.canvasX / this.imageScale;
            this.selectedBox.y = this.selectedBox.canvasY / this.imageScale;
            
            this.redrawImage();
            this.redrawAnnotations();
        } else if (this.isResizing && this.selectedBox) {
            // ボックスのリサイズ
            this.resizeBox(x, y);
            this.redrawImage();
            this.redrawAnnotations();
        } else {
            // マウスカーソルの更新
            this.updateCursor(x, y);
        }
    }
    
    handleMouseUp(e) {
        // 分類モードでは何もしない
        if (this.mode !== 'detection') return;
        
        if (this.isDrawing) {
            const rect = this.canvas.getBoundingClientRect();
            const endX = e.clientX - rect.left;
            const endY = e.clientY - rect.top;
            
            const width = Math.abs(endX - this.startX);
            const height = Math.abs(endY - this.startY);
            
            if (width > 10 && height > 10) {
                this.addBoundingBox(
                    Math.min(this.startX, endX),
                    Math.min(this.startY, endY),
                    width,
                    height,
                    this.currentDetectionLabel.value
                );
            }
            
            this.isDrawing = false;
        }
        
        if (this.isDragging || this.isResizing) {
            this.saveData();
        }
        
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.canvas.style.cursor = this.mode === 'detection' ? 'crosshair' : 'default';
        
        this.redrawImage();
        this.redrawAnnotations();
    }
    
    handleDoubleClick(e) {
        // 分類モードでは何もしない
        if (this.mode !== 'detection') return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const clickedBox = this.getBoxAtPosition(x, y);
        if (clickedBox) {
            // ダブルクリックでボックスを削除
            const imageKey = this.getCurrentImageKey();
            const annotation = this.annotations.get(imageKey);
            
            if (annotation && annotation.detections) {
                const index = annotation.detections.indexOf(clickedBox);
                if (index !== -1) {
                    annotation.detections.splice(index, 1);
                    this.selectedBox = null;
                    this.updateBoundingBoxList();
                    this.redrawImage();
                    this.redrawAnnotations();
                    this.saveData();
                    this.showNotification('バウンディングボックスを削除しました', 'info');
                }
            }
        }
    }
    
    getBoxAtPosition(x, y) {
        const imageKey = this.getCurrentImageKey();
        const annotation = this.annotations.get(imageKey);
        
        if (!annotation || !annotation.detections) return null;
        
        // 逆順でチェック（最後に描画されたものが優先）
        for (let i = annotation.detections.length - 1; i >= 0; i--) {
            const box = annotation.detections[i];
            if (x >= box.canvasX && x <= box.canvasX + box.canvasWidth &&
                y >= box.canvasY && y <= box.canvasY + box.canvasHeight) {
                return box;
            }
        }
        
        return null;
    }
    
    getResizeHandle(x, y, box) {
        const handleSize = 8;
        const halfHandle = handleSize / 2;
        
        const handles = [
            { name: 'nw', x: box.canvasX - halfHandle, y: box.canvasY - halfHandle },
            { name: 'n', x: box.canvasX + box.canvasWidth / 2 - halfHandle, y: box.canvasY - halfHandle },
            { name: 'ne', x: box.canvasX + box.canvasWidth - halfHandle, y: box.canvasY - halfHandle },
            { name: 'e', x: box.canvasX + box.canvasWidth - halfHandle, y: box.canvasY + box.canvasHeight / 2 - halfHandle },
            { name: 'se', x: box.canvasX + box.canvasWidth - halfHandle, y: box.canvasY + box.canvasHeight - halfHandle },
            { name: 's', x: box.canvasX + box.canvasWidth / 2 - halfHandle, y: box.canvasY + box.canvasHeight - halfHandle },
            { name: 'sw', x: box.canvasX - halfHandle, y: box.canvasY + box.canvasHeight - halfHandle },
            { name: 'w', x: box.canvasX - halfHandle, y: box.canvasY + box.canvasHeight / 2 - halfHandle }
        ];
        
        for (const handle of handles) {
            if (x >= handle.x && x <= handle.x + handleSize &&
                y >= handle.y && y <= handle.y + handleSize) {
                return handle.name;
            }
        }
        
        return null;
    }
    
    getResizeCursor(handle) {
        const cursors = {
            'nw': 'nw-resize',
            'n': 'n-resize',
            'ne': 'ne-resize',
            'e': 'e-resize',
            'se': 'se-resize',
            's': 's-resize',
            'sw': 'sw-resize',
            'w': 'w-resize'
        };
        return cursors[handle] || 'default';
    }
    
    resizeBox(mouseX, mouseY) {
        if (!this.selectedBox || !this.resizeHandle) return;
        
        const box = this.selectedBox;
        const original = this.originalBox;
        const handle = this.resizeHandle;
        
        let newX = box.canvasX;
        let newY = box.canvasY;
        let newWidth = box.canvasWidth;
        let newHeight = box.canvasHeight;
        
        switch (handle) {
            case 'nw':
                newX = mouseX;
                newY = mouseY;
                newWidth = original.canvasX + original.canvasWidth - mouseX;
                newHeight = original.canvasY + original.canvasHeight - mouseY;
                break;
            case 'n':
                newY = mouseY;
                newHeight = original.canvasY + original.canvasHeight - mouseY;
                break;
            case 'ne':
                newY = mouseY;
                newWidth = mouseX - original.canvasX;
                newHeight = original.canvasY + original.canvasHeight - mouseY;
                break;
            case 'e':
                newWidth = mouseX - original.canvasX;
                break;
            case 'se':
                newWidth = mouseX - original.canvasX;
                newHeight = mouseY - original.canvasY;
                break;
            case 's':
                newHeight = mouseY - original.canvasY;
                break;
            case 'sw':
                newX = mouseX;
                newWidth = original.canvasX + original.canvasWidth - mouseX;
                newHeight = mouseY - original.canvasY;
                break;
            case 'w':
                newX = mouseX;
                newWidth = original.canvasX + original.canvasWidth - mouseX;
                break;
        }
        
        // 最小サイズの制限
        if (newWidth < 10) newWidth = 10;
        if (newHeight < 10) newHeight = 10;
        
        box.canvasX = newX;
        box.canvasY = newY;
        box.canvasWidth = newWidth;
        box.canvasHeight = newHeight;
        
        // 元の座標も更新
        box.x = box.canvasX / this.imageScale;
        box.y = box.canvasY / this.imageScale;
        box.width = box.canvasWidth / this.imageScale;
        box.height = box.canvasHeight / this.imageScale;
    }
    
    updateCursor(x, y) {
        // 分類モードではデフォルトカーソル
        if (this.mode !== 'detection') {
            this.canvas.style.cursor = 'default';
            return;
        }
        
        const hoveredBox = this.getBoxAtPosition(x, y);
        
        if (hoveredBox) {
            const handle = this.getResizeHandle(x, y, hoveredBox);
            if (handle) {
                this.canvas.style.cursor = this.getResizeCursor(handle);
            } else {
                this.canvas.style.cursor = 'move';
            }
        } else {
            this.canvas.style.cursor = this.mode === 'detection' ? 'crosshair' : 'default';
        }
    }

    // ラベルの最適な位置を計算する新しいメソッド
    calculateLabelPosition(detection) {
        const margin = 5; // キャンバス端からのマージン
        const labelHeight = 22;
        
        // デフォルトはボックスの上
        let x = detection.canvasX;
        let y = detection.canvasY - labelHeight - 2;
        
        // 上端に近すぎる場合はボックス内の上部に配置
        if (y < margin) {
            y = detection.canvasY + margin;
        }
        
        // 左端に近すぎる場合は右にずらす
        if (x < margin) {
            x = margin;
        }
        
        // 右端からはみ出る場合は左にずらす
        const textWidth = this.ctx.measureText(detection.label).width;
        const labelWidth = textWidth + 8; // パディング込み
        if (x + labelWidth > this.canvas.width - margin) {
            x = this.canvas.width - labelWidth - margin;
        }
        
        // バウンディングボックスが画像の大部分を占める場合（80%以上）
        const boxArea = detection.canvasWidth * detection.canvasHeight;
        const canvasArea = this.canvas.width * this.canvas.height;
        const areaRatio = boxArea / canvasArea;
        
        if (areaRatio > 0.8) {
            // 大きなボックスの場合は中央上部に配置
            x = (this.canvas.width - labelWidth) / 2;
            y = detection.canvasY + 20; // ボックス内の上部
            
            // それでも上端に近すぎる場合はさらに下に
            if (y < margin + labelHeight) {
                y = margin + labelHeight;
            }
        }
        
        return { x, y };
    }
}

let tool;
document.addEventListener('DOMContentLoaded', () => {
    tool = new AnnotationTool();
});
