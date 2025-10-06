/**
 * ImageProcessor - Converts images to pixel arrays for TwinCAT
 */
class ImageProcessor {
    constructor() {
        this.canvas = document.getElementById('processingCanvas') || document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }

    /**
     * Process an image and extract pixel data
     */
    processImage(image) {
        this.canvas.width = image.width;
        this.canvas.height = image.height;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(image, 0, 0);

        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        return this.convertToPixelArray(imageData);
    }

    /**
     * Convert ImageData to pixel array
     */
    convertToPixelArray(imageData) {
        const pixels = [];
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            const pixel = {
                r: r,
                g: g,
                b: b,
                a: a,
                dword: this.rgbToDword(r, g, b)
            };

            pixels.push(pixel);
        }

        return {
            width: imageData.width,
            height: imageData.height,
            pixels: pixels
        };
    }

    /**
     * Convert RGB to DWORD format (0x00BBGGRR)
     */
    rgbToDword(r, g, b) {
        return (b << 16) | (g << 8) | r;
    }

    /**
     * Apply brightness scaling to pixel data
     */
    applyBrightness(pixelData, brightness) {
        const scale = brightness / 100;
        
        return pixelData.pixels.map(pixel => ({
            ...pixel,
            r: Math.round(pixel.r * scale),
            g: Math.round(pixel.g * scale),
            b: Math.round(pixel.b * scale),
            dword: this.rgbToDword(
                Math.round(pixel.r * scale),
                Math.round(pixel.g * scale),
                Math.round(pixel.b * scale)
            )
        }));
    }

    /**
     * Create thumbnail for timeline
     */
    createThumbnail(image, maxSize = 60) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        const scale = Math.min(maxSize / image.width, maxSize / image.height);
        tempCanvas.width = image.width * scale;
        tempCanvas.height = image.height * scale;

        tempCtx.imageSmoothingEnabled = false;
        tempCtx.drawImage(image, 0, 0, tempCanvas.width, tempCanvas.height);

        return tempCanvas.toDataURL();
    }

    /**
     * Resize/crop image to target dimensions
     * @param {Image} image - Source image
     * @param {number} targetWidth - Target width
     * @param {number} targetHeight - Target height
     * @param {string} mode - Resize mode: 'crop-top', 'crop-bottom', 'crop-center', 'stretch', 'fit'
     * @returns {Object} Processed pixel data with target dimensions
     */
    processImageWithResize(image, targetWidth, targetHeight, mode = 'crop-top') {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        ctx.imageSmoothingEnabled = false;
        
        let sx = 0, sy = 0, sWidth = image.width, sHeight = image.height;
        let dx = 0, dy = 0, dWidth = targetWidth, dHeight = targetHeight;
        
        switch (mode) {
            case 'crop-top':
                // Take pixels from top of source (perfect for After Effects 4px height -> 1px strip)
                sWidth = Math.min(targetWidth, image.width);
                sHeight = Math.min(targetHeight, image.height);
                sy = 0;
                sx = 0;
                break;
                
            case 'crop-bottom':
                // Take pixels from bottom of source
                sWidth = Math.min(targetWidth, image.width);
                sHeight = Math.min(targetHeight, image.height);
                sy = Math.max(0, image.height - sHeight);
                sx = 0;
                break;
                
            case 'crop-center':
                // Take pixels from center of source
                sWidth = Math.min(targetWidth, image.width);
                sHeight = Math.min(targetHeight, image.height);
                sy = Math.floor((image.height - sHeight) / 2);
                sx = Math.floor((image.width - sWidth) / 2);
                break;
                
            case 'stretch':
                // Stretch entire image to fit target (distort if needed)
                // Use default values (entire source to entire destination)
                break;
                
            case 'fit':
                // Fit entire image maintaining aspect ratio
                const scaleX = targetWidth / image.width;
                const scaleY = targetHeight / image.height;
                const scale = Math.min(scaleX, scaleY);
                
                dWidth = Math.floor(image.width * scale);
                dHeight = Math.floor(image.height * scale);
                dx = Math.floor((targetWidth - dWidth) / 2);
                dy = Math.floor((targetHeight - dHeight) / 2);
                
                // Clear canvas with black background
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, targetWidth, targetHeight);
                break;
        }
        
        // Draw the resized/cropped image
        ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
        
        // Get pixel data
        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        return this.convertToPixelArray(imageData);
    }

    /**
     * Sanitize name for TwinCAT variable naming
     */
    sanitizeName(name) {
        return name.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    }
}
