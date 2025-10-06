/**
 * SequenceHandler - Handles PNG sequence animation conversion
 */
class SequenceHandler {
    constructor(imageProcessor, frameManager, animationExporter) {
        this.imageProcessor = imageProcessor;
        this.frameManager = frameManager;
        this.animationExporter = animationExporter;
        
        this.frames = [];
        this.zoomLevel = 1;
        this.fitToFrame = false;
        
        this.initializeElements();
        this.initializeEventListeners();
    }

    initializeElements() {
        this.dropZone = document.getElementById('sequenceDropZone');
        this.fileInput = document.getElementById('sequenceFileInput');
        this.fileList = document.getElementById('sequenceFileList');
        this.previewSection = document.getElementById('sequencePreviewSection');
        this.previewContainer = document.getElementById('sequencePreviewContainer');
        this.previewCanvas = document.getElementById('sequencePreviewCanvas');
        this.timeline = document.getElementById('sequenceTimeline');
        this.animationNameInput = document.getElementById('sequenceAnimationName');
        this.fpsSlider = document.getElementById('sequenceFps');
        this.fpsValue = document.getElementById('sequenceFpsValue');
        this.brightnessSlider = document.getElementById('sequenceBrightness');
        this.brightnessValue = document.getElementById('sequenceBrightnessValue');
        this.loopModeSelect = document.getElementById('sequenceLoopMode');
        this.frameCount = document.getElementById('sequenceFrameCount');
        this.dimensionInfo = document.getElementById('sequenceDimensionInfo');
        this.durationInfo = document.getElementById('sequenceDurationInfo');
        
        // Resolution controls
        this.useCustomResolution = document.getElementById('sequenceUseCustomResolution');
        this.outputWidth = document.getElementById('sequenceOutputWidth');
        this.outputHeight = document.getElementById('sequenceOutputHeight');
        this.cropMode = document.getElementById('sequenceCropMode');
        
        // Control buttons
        this.playBtn = document.getElementById('sequencePlayBtn');
        this.prevFrameBtn = document.getElementById('sequencePrevFrameBtn');
        this.nextFrameBtn = document.getElementById('sequenceNextFrameBtn');
        this.exportTwincatBtn = document.getElementById('sequenceExportTwincatBtn');
        this.exportJsonBtn = document.getElementById('sequenceExportJsonBtn');
        
        // Zoom controls
        this.zoomInBtn = document.getElementById('sequenceZoomIn');
        this.zoomOutBtn = document.getElementById('sequenceZoomOut');
        this.zoomFitBtn = document.getElementById('sequenceZoomFit');
        this.zoomActualBtn = document.getElementById('sequenceZoomActual');
        this.zoomLevelDisplay = document.getElementById('sequenceZoomLevel');
    }

    initializeEventListeners() {
        // Drop zone click
        this.dropZone.addEventListener('click', () => {
            this.fileInput.click();
        });

        // File input change (multiple files)
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.loadFrames(Array.from(e.target.files));
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
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            if (files.length > 0) {
                this.loadFrames(files);
            }
        });

        // Animation name sanitization
        this.animationNameInput.addEventListener('input', (e) => {
            e.target.value = this.imageProcessor.sanitizeName(e.target.value);
        });

        // FPS slider
        this.fpsSlider.addEventListener('input', (e) => {
            const fps = e.target.value;
            this.fpsValue.textContent = `${fps} fps`;
            this.frameManager.setFPS(parseInt(fps));
            this.updateDurationInfo();
        });

        // Brightness slider
        this.brightnessSlider.addEventListener('input', (e) => {
            this.brightnessValue.textContent = `${e.target.value}%`;
        });

        // Loop mode
        this.loopModeSelect.addEventListener('change', (e) => {
            this.frameManager.setLoopMode(e.target.value);
        });

        // Custom resolution toggle
        this.useCustomResolution.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            this.outputWidth.disabled = !enabled;
            this.outputHeight.disabled = !enabled;
            this.cropMode.disabled = !enabled;
            
            if (enabled && this.frames.length > 0) {
                // Set default to source dimensions
                this.outputWidth.value = this.frameWidth;
                this.outputHeight.value = this.frameHeight;
            }
        });

        // Output dimension changes - reprocess frames
        this.outputWidth.addEventListener('change', () => {
            if (this.useCustomResolution.checked && this.frames.length > 0) {
                this.reprocessFrames();
            }
        });

        this.outputHeight.addEventListener('change', () => {
            if (this.useCustomResolution.checked && this.frames.length > 0) {
                this.reprocessFrames();
            }
        });

        this.cropMode.addEventListener('change', () => {
            if (this.useCustomResolution.checked && this.frames.length > 0) {
                this.reprocessFrames();
            }
        });

        // Playback controls
        this.playBtn.addEventListener('click', () => {
            this.togglePlayback();
        });

        this.prevFrameBtn.addEventListener('click', () => {
            this.frameManager.previousFrame();
        });

        this.nextFrameBtn.addEventListener('click', () => {
            this.frameManager.nextFrame();
        });

        // Export buttons
        this.exportTwincatBtn.addEventListener('click', () => {
            this.exportTwinCAT();
        });

        this.exportJsonBtn.addEventListener('click', () => {
            this.exportJSON();
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

        // Frame manager events
        this.frameManager.on('frameChange', (frameIndex) => {
            this.updatePreview(frameIndex);
            this.updateTimelineSelection(frameIndex);
        });

        this.frameManager.on('playStateChange', (isPlaying) => {
            this.updatePlayButton(isPlaying);
        });
    }

    /**
     * Load multiple frame files
     */
    async loadFrames(files) {
        try {
            window.showLoading(true);

            // Sort files by name (natural sort for frame numbers)
            files.sort((a, b) => {
                return a.name.localeCompare(b.name, undefined, { numeric: true });
            });

            // Clear previous frames
            this.frames = [];
            this.fileList.innerHTML = '';
            this.timeline.innerHTML = '';

            // Load all frames
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const img = await this.loadImageFromFile(file);
                
                // Validate dimensions (all frames must match)
                if (i === 0) {
                    this.frameWidth = img.width;
                    this.frameHeight = img.height;
                } else if (img.width !== this.frameWidth || img.height !== this.frameHeight) {
                    throw new Error(`Frame ${i + 1} dimensions (${img.width}x${img.height}) don't match first frame (${this.frameWidth}x${this.frameHeight})`);
                }

                // Process frame (will be reprocessed if custom resolution is used)
                const pixelData = this.imageProcessor.processImage(img);
                
                this.frames.push({
                    index: i,
                    filename: file.name,
                    image: img,
                    originalPixelData: pixelData,
                    pixelData: pixelData
                });

                // Add to file list
                this.addFileToList(file.name, i);

                // Add to timeline
                await this.addFrameToTimeline(img, i);
            }

            // Auto-generate animation name from first file
            const defaultName = files[0].name.substring(0, files[0].name.lastIndexOf('.')) || 'MY_ANIMATION';
            this.animationNameInput.value = this.imageProcessor.sanitizeName(defaultName.replace(/\d+$/, ''));

            // Initialize frame manager
            this.frameManager.setFrames(this.frames);
            this.frameManager.goToFrame(0);

            // Update info
            this.updateInfo();

            // Show preview section
            this.previewSection.style.display = 'block';

            // Auto-fit small images (like 4x64 from After Effects)
            if (this.frameWidth < 100 || this.frameHeight < 100) {
                this.fitToContainer();
            } else {
                this.setZoom(1);
            }

            window.showSnackbar(`Loaded ${files.length} frames successfully`);
        } catch (error) {
            console.error('Error loading frames:', error);
            window.showSnackbar(`Error: ${error.message}`, 'error');
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
                img.onerror = () => reject(new Error(`Failed to load ${file.name}`));
                img.src = e.target.result;
            };

            reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Add file to list display
     */
    addFileToList(filename, index) {
        const item = document.createElement('div');
        item.className = 'file-list-item';
        item.innerHTML = `
            <span class="material-icons">image</span>
            <span>${index + 1}. ${filename}</span>
        `;
        this.fileList.appendChild(item);
    }

    /**
     * Add frame thumbnail to timeline
     */
    async addFrameToTimeline(image, index) {
        const thumbnail = this.imageProcessor.createThumbnail(image, 80);
        
        const frameDiv = document.createElement('div');
        frameDiv.className = 'timeline-frame';
        frameDiv.dataset.frameIndex = index;
        frameDiv.innerHTML = `
            <img src="${thumbnail}" alt="Frame ${index + 1}">
            <span>${index + 1}</span>
        `;
        
        frameDiv.addEventListener('click', () => {
            this.frameManager.goToFrame(index);
        });
        
        this.timeline.appendChild(frameDiv);
    }

    /**
     * Update preview canvas with current frame
     */
    updatePreview(frameIndex) {
        const frame = this.frames[frameIndex];
        if (!frame) return;

        const ctx = this.previewCanvas.getContext('2d');
        this.previewCanvas.width = frame.image.width;
        this.previewCanvas.height = frame.image.height;

        ctx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(frame.image, 0, 0);

        // Apply current zoom
        this.applyZoom();
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
        if (this.frames.length === 0) return;

        const containerWidth = this.previewContainer.clientWidth - 48; // padding
        const containerHeight = this.previewContainer.clientHeight - 48;

        const scaleX = containerWidth / this.frameWidth;
        const scaleY = containerHeight / this.frameHeight;
        this.zoomLevel = Math.min(scaleX, scaleY, 32); // Cap at 32x
        this.fitToFrame = true;
        this.applyZoom();
    }

    /**
     * Apply current zoom level to canvas
     */
    applyZoom() {
        if (this.frames.length === 0) return;

        const width = this.frameWidth * this.zoomLevel;
        const height = this.frameHeight * this.zoomLevel;

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
     * Update timeline frame selection
     */
    updateTimelineSelection(frameIndex) {
        const allFrames = this.timeline.querySelectorAll('.timeline-frame');
        allFrames.forEach((frame, i) => {
            frame.classList.toggle('active', i === frameIndex);
        });

        // Scroll timeline to show active frame
        const activeFrame = allFrames[frameIndex];
        if (activeFrame) {
            // Use instant scroll during playback, smooth when manually navigating
            const behavior = this.frameManager.isPlaying() ? 'instant' : 'smooth';
            activeFrame.scrollIntoView({ behavior: behavior, block: 'nearest', inline: 'center' });
        }
    }

    /**
     * Toggle playback
     */
    togglePlayback() {
        if (this.frameManager.isPlaying()) {
            this.frameManager.stop();
        } else {
            this.frameManager.play();
        }
    }

    /**
     * Update play button icon
     */
    updatePlayButton(isPlaying) {
        const icon = this.playBtn.querySelector('.material-icons');
        icon.textContent = isPlaying ? 'pause' : 'play_arrow';
    }

    /**
     * Update info displays
     */
    updateInfo() {
        this.frameCount.textContent = `${this.frames.length} frames`;
        this.dimensionInfo.textContent = `${this.frameWidth} x ${this.frameHeight}`;
        this.updateDurationInfo();
    }

    /**
     * Update duration info based on FPS
     */
    updateDurationInfo() {
        const fps = parseInt(this.fpsSlider.value);
        const duration = (this.frames.length / fps).toFixed(2);
        this.durationInfo.textContent = `${duration}s @ ${fps} fps`;
    }

    /**
     * Export as TwinCAT code
     */
    exportTwinCAT() {
        const name = this.animationNameInput.value || 'MY_ANIMATION';
        const brightness = parseInt(this.brightnessSlider.value);
        const fps = parseInt(this.fpsSlider.value);
        const dimensions = this.getOutputDimensions();

        const code = this.animationExporter.exportTwinCAT(this.frames, {
            name,
            brightness,
            fps,
            width: dimensions.width,
            height: dimensions.height
        });

        this.downloadFile(code, `${name}.txt`);
        window.showSnackbar('TwinCAT code exported successfully');
    }

    /**
     * Export as JSON
     */
    exportJSON() {
        const name = this.animationNameInput.value || 'MY_ANIMATION';
        const brightness = parseInt(this.brightnessSlider.value);
        const fps = parseInt(this.fpsSlider.value);
        const dimensions = this.getOutputDimensions();

        const json = this.animationExporter.exportJSON(this.frames, {
            name,
            brightness,
            fps,
            width: dimensions.width,
            height: dimensions.height
        });

        this.downloadFile(json, `${name}.json`);
        window.showSnackbar('JSON exported successfully');
    }

    /**
     * Reprocess all frames with custom resolution settings
     */
    async reprocessFrames() {
        if (!this.useCustomResolution.checked || this.frames.length === 0) {
            return;
        }

        try {
            window.showLoading(true);

            const targetWidth = parseInt(this.outputWidth.value);
            const targetHeight = parseInt(this.outputHeight.value);
            const mode = this.cropMode.value;

            // Reprocess all frames
            for (let i = 0; i < this.frames.length; i++) {
                const frame = this.frames[i];
                frame.pixelData = this.imageProcessor.processImageWithResize(
                    frame.image,
                    targetWidth,
                    targetHeight,
                    mode
                );
            }

            // Update display dimensions
            this.frameWidth = targetWidth;
            this.frameHeight = targetHeight;

            // Update info and preview
            this.updateInfo();
            this.updatePreview(this.frameManager.getCurrentFrame());

            window.showSnackbar(`Frames reprocessed to ${targetWidth}x${targetHeight}`);
        } catch (error) {
            console.error('Error reprocessing frames:', error);
            window.showSnackbar('Error reprocessing frames', 'error');
        } finally {
            window.showLoading(false);
        }
    }

    /**
     * Get effective output dimensions (for export)
     */
    getOutputDimensions() {
        if (this.useCustomResolution.checked) {
            return {
                width: parseInt(this.outputWidth.value),
                height: parseInt(this.outputHeight.value)
            };
        }
        return {
            width: this.frameWidth,
            height: this.frameHeight
        };
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
