/**
 * SingleImageHandler - Handles single image conversion (maintains legacy functionality)
 */
class SingleImageHandler {
    constructor(imageProcessor) {
        this.imageProcessor = imageProcessor;
        this.currentImage = null;
        this.currentPixelData = null;
        this.zoomLevel = 1;
        this.fitToFrame = false;
        
        this.initializeElements();
        this.initializeEventListeners();
    }

    initializeElements() {
        this.dropZone = document.getElementById('singleDropZone');
        this.fileInput = document.getElementById('singleFileInput');
        this.previewSection = document.getElementById('singlePreviewSection');
        this.previewContainer = document.getElementById('singlePreviewContainer');
        this.previewCanvas = document.getElementById('singlePreviewCanvas');
        this.imageNameInput = document.getElementById('singleImageName');
        this.brightnessSlider = document.getElementById('singleBrightness');
        this.brightnessValue = document.getElementById('singleBrightnessValue');
        this.dimensionInfo = document.getElementById('singleDimensionInfo');
        this.pixelCount = document.getElementById('singlePixelCount');
        this.exportBtn = document.getElementById('singleExportBtn');
        
        // Zoom controls
        this.zoomInBtn = document.getElementById('singleZoomIn');
        this.zoomOutBtn = document.getElementById('singleZoomOut');
        this.zoomFitBtn = document.getElementById('singleZoomFit');
        this.zoomActualBtn = document.getElementById('singleZoomActual');
        this.zoomLevelDisplay = document.getElementById('singleZoomLevel');
    }

    initializeEventListeners() {
        // Drop zone click
        this.dropZone.addEventListener('click', () => {
            this.fileInput.click();
        });

        // File input change
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadImage(file);
            }
        });

        // Drag and drop
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.classList.add('drag-over');
        });

        this.dropZone.addEventListener('dragleave', () => {
            this.dropZone.classList.remove('drag-over');
        });

        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.loadImage(file);
            }
        });

        // Image name sanitization
        this.imageNameInput.addEventListener('input', (e) => {
            e.target.value = this.imageProcessor.sanitizeName(e.target.value);
        });

        // Brightness slider
        this.brightnessSlider.addEventListener('input', (e) => {
            this.brightnessValue.textContent = `${e.target.value}%`;
        });

        // Export button
        this.exportBtn.addEventListener('click', () => {
            this.exportTwinCAT();
        });

        // Zoom controls
        this.zoomInBtn.addEventListener('click', () => {
            this.setZoom(this.zoomLevel * 2);
        });

        this.zoomOutBtn.addEventListener('click', () => {
            this.setZoom(this.zoomLevel / 2);
        });

        this.zoomFitBtn.addEventListener('click', () => {
            this.fitToContainer();
        });

        this.zoomActualBtn.addEventListener('click', () => {
            this.setZoom(1);
        });
    }

    /**
     * Load and process image file
     */
    async loadImage(file) {
        try {
            window.showLoading(true);

            const img = await this.loadImageFromFile(file);
            this.currentImage = img;

            // Auto-generate name from filename
            const defaultName = file.name.substring(0, file.name.lastIndexOf('.')) || 'MY_IMAGE';
            this.imageNameInput.value = this.imageProcessor.sanitizeName(defaultName);

            // Process image
            this.currentPixelData = this.imageProcessor.processImage(img);

            // Update preview
            this.updatePreview();

            // Show preview section
            this.previewSection.style.display = 'block';

            window.showSnackbar('Image loaded successfully');
        } catch (error) {
            console.error('Error loading image:', error);
            window.showSnackbar('Error loading image', 'error');
        } finally {
            window.showLoading(false);
        }
    }

    /**
     * Load image from file
     */
    loadImageFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const img = new Image();

            reader.onload = (e) => {
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Update preview canvas and info
     */
    updatePreview() {
        if (!this.currentImage) return;

        const ctx = this.previewCanvas.getContext('2d');
        this.previewCanvas.width = this.currentImage.width;
        this.previewCanvas.height = this.currentImage.height;

        ctx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.currentImage, 0, 0);

        // Update info
        const pixelCount = this.currentImage.width * this.currentImage.height;
        this.dimensionInfo.textContent = `${this.currentImage.width} x ${this.currentImage.height}`;
        this.pixelCount.textContent = `${pixelCount} pixels`;

        // Auto-fit small images
        if (this.currentImage.width < 100 || this.currentImage.height < 100) {
            this.fitToContainer();
        } else {
            this.setZoom(1);
        }
    }

    /**
     * Set zoom level
     */
    setZoom(level) {
        this.zoomLevel = Math.max(0.1, Math.min(32, level));
        this.fitToFrame = false;
        this.applyZoom();
    }

    /**
     * Fit image to container
     */
    fitToContainer() {
        if (!this.currentImage) return;

        const containerWidth = this.previewContainer.clientWidth - 48; // padding
        const containerHeight = this.previewContainer.clientHeight - 48;

        const scaleX = containerWidth / this.currentImage.width;
        const scaleY = containerHeight / this.currentImage.height;
        this.zoomLevel = Math.min(scaleX, scaleY, 32); // Cap at 32x
        this.fitToFrame = true;
        this.applyZoom();
    }

    /**
     * Apply current zoom level to canvas
     */
    applyZoom() {
        if (!this.currentImage) return;

        const width = this.currentImage.width * this.zoomLevel;
        const height = this.currentImage.height * this.zoomLevel;

        this.previewCanvas.style.width = `${width}px`;
        this.previewCanvas.style.height = `${height}px`;

        // Update zoom display
        if (this.fitToFrame) {
            this.zoomLevelDisplay.textContent = `${Math.round(this.zoomLevel * 100)}% (Fit)`;
        } else {
            this.zoomLevelDisplay.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }
    }

    /**
     * Export as TwinCAT code
     */
    exportTwinCAT() {
        if (!this.currentPixelData) return;

        const name = this.imageNameInput.value || 'MY_IMAGE';
        const brightness = parseInt(this.brightnessSlider.value);
        const pixels = this.imageProcessor.applyBrightness(this.currentPixelData, brightness);

        // Generate TwinCAT code
        let output = `(* Image: ${name} *)\n`;
        output += `(* Resolution: ${this.currentPixelData.width}x${this.currentPixelData.height} *)\n`;
        output += `(* Generated: ${new Date().toISOString().split('T')[0]} *)\n\n`;
        
        output += `nWidth_${name} : INT := ${this.currentPixelData.width};\n`;
        output += `nHeight_${name} : INT := ${this.currentPixelData.height};\n\n`;
        
        output += `aArray_${name} : ARRAY[0..${pixels.length - 1}] OF DWORD := [\n`;

        for (let i = 0; i < pixels.length; i++) {
            output += `    16#${pixels[i].dword.toString(16).padStart(8, '0').toUpperCase()}`;

            if (i < pixels.length - 1) {
                output += ',';
            }

            // Line break at end of each row
            if ((i + 1) % this.currentPixelData.width === 0) {
                output += '\n';
            }
        }

        output += `];`;

        // Download file
        this.downloadFile(output, `${name}.txt`);
        window.showSnackbar('TwinCAT code exported successfully');
    }

    /**
     * Download file
     */
    downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
