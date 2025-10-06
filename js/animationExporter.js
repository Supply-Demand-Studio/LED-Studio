/**
 * AnimationExporter - Exports animation data in TwinCAT and JSON formats
 */
class AnimationExporter {
    constructor(imageProcessor) {
        this.imageProcessor = imageProcessor;
    }

    /**
     * Export animation as TwinCAT structured text
     */
    exportTwinCAT(frames, options) {
        const { name, brightness, fps, width, height } = options;
        
        let output = '';
        
        // Header comment
        output += `(* ===================================================== *)\n`;
        output += `(* Animation: ${name} *)\n`;
        output += `(* Frames: ${frames.length} *)\n`;
        output += `(* Resolution: ${width}x${height} *)\n`;
        output += `(* FPS: ${fps} *)\n`;
        output += `(* Duration: ${(frames.length / fps).toFixed(2)}s *)\n`;
        output += `(* Generated: ${new Date().toISOString().split('T')[0]} *)\n`;
        output += `(* ===================================================== *)\n\n`;

        // Constants
        output += `(* Animation constants *)\n`;
        output += `nFrameCount_${name} : INT := ${frames.length};\n`;
        output += `nWidth_${name} : INT := ${width};\n`;
        output += `nHeight_${name} : INT := ${height};\n`;
        output += `nFPS_${name} : INT := ${fps};\n`;
        output += `nPixelsPerFrame_${name} : INT := ${width * height};\n\n`;

        // Frame data arrays
        output += `(* Frame pixel data *)\n`;
        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            const pixels = this.imageProcessor.applyBrightness(frame.pixelData, brightness);
            
            output += `aFrame_${name}_${i.toString().padStart(3, '0')} : ARRAY[0..${pixels.length - 1}] OF DWORD := [\n`;
            
            for (let j = 0; j < pixels.length; j++) {
                output += `    16#${pixels[j].dword.toString(16).padStart(8, '0').toUpperCase()}`;
                
                if (j < pixels.length - 1) {
                    output += ',';
                }
                
                // Line break at end of each row
                if ((j + 1) % width === 0) {
                    output += '\n';
                }
            }
            
            output += `];\n\n`;
        }

        // Frame pointer array
        output += `(* Frame pointer array for easy access *)\n`;
        output += `(* Usage: MEMCPY(ADR(aLEDBuffer), ADR(aFrames_${name}[currentFrame]^), nPixelsPerFrame_${name} * SIZEOF(DWORD)); *)\n`;
        output += `aFrames_${name} : ARRAY[0..${frames.length - 1}] OF POINTER TO DWORD := [\n`;
        
        for (let i = 0; i < frames.length; i++) {
            output += `    ADR(aFrame_${name}_${i.toString().padStart(3, '0')})`;
            
            if (i < frames.length - 1) {
                output += ',';
            }
            output += '\n';
        }
        
        output += `];\n\n`;

        // Usage example
        output += `(* ===================================================== *)\n`;
        output += `(* USAGE EXAMPLE:\n`;
        output += `(*\n`;
        output += `(* Declare in your FB: *)\n`;
        output += `VAR\n`;
        output += `    nCurrentFrame : INT := 0;\n`;
        output += `    fFrameTimer : TON;\n`;
        output += `    nFrameInterval : TIME := INT_TO_TIME(1000 / nFPS_${name}); // ms per frame\n`;
        output += `    aLEDBuffer : ARRAY[0..${width * height - 1}] OF DWORD;\n`;
        output += `END_VAR\n`;
        output += `\n`;
        output += `(* In your FB code: *)\n`;
        output += `fFrameTimer(IN := TRUE, PT := nFrameInterval);\n`;
        output += `\n`;
        output += `IF fFrameTimer.Q THEN\n`;
        output += `    fFrameTimer(IN := FALSE);\n`;
        output += `    \n`;
        output += `    // Copy frame to LED buffer\n`;
        output += `    MEMCPY(\n`;
        output += `        ADR(aLEDBuffer),\n`;
        output += `        aFrames_${name}[nCurrentFrame],\n`;
        output += `        nPixelsPerFrame_${name} * SIZEOF(DWORD)\n`;
        output += `    );\n`;
        output += `    \n`;
        output += `    // Advance frame (loop)\n`;
        output += `    nCurrentFrame := (nCurrentFrame + 1) MOD nFrameCount_${name};\n`;
        output += `    \n`;
        output += `    // Send buffer to LED strip\n`;
        output += `    fbLEDStrip.UpdatePixels(aLEDBuffer);\n`;
        output += `END_IF\n`;
        output += `*)\n`;
        output += `(* ===================================================== *)\n`;

        return output;
    }

    /**
     * Export animation as TwinCAT Global Variable List (.TcGVL) - RECOMMENDED
     * This format can be added directly to your TwinCAT project
     */
    exportTcGVL(frames, options) {
        const { name, brightness, fps, width, height } = options;
        const guid = this.generateGUID();
        const gvlName = `GVL_Anim_${name}`;
        
        let output = '';
        
        // XML header
        output += `<?xml version="1.0" encoding="utf-8"?>\n`;
        output += `<TcPlcObject Version="1.1.0.1" ProductVersion="3.1.4024.12">\n`;
        output += `  <GVL Name="${gvlName}" Id="${guid}">\n`;
        output += `    <Declaration><![CDATA[{attribute 'qualified_only'}\n`;
        output += `VAR_GLOBAL CONSTANT\n`;
        
        // Metadata constants
        output += `    // Animation metadata\n`;
        output += `    nFrameCount_${name} : INT := ${frames.length};\n`;
        output += `    nWidth_${name} : INT := ${width};\n`;
        output += `    nHeight_${name} : INT := ${height};\n`;
        output += `    nFPS_${name} : INT := ${fps};\n`;
        output += `    nPixelsPerFrame_${name} : INT := ${width * height};\n\n`;
        
        // Frame data arrays
        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            const pixels = this.imageProcessor.applyBrightness(frame.pixelData, brightness);
            
            output += `    aFrame_${name}_${i.toString().padStart(3, '0')} : ARRAY[0..${pixels.length - 1}] OF DWORD := [\n`;
            
            for (let j = 0; j < pixels.length; j++) {
                output += `        16#${pixels[j].dword.toString(16).padStart(8, '0').toUpperCase()}`;
                
                if (j < pixels.length - 1) {
                    output += ',';
                }
                
                // Line break every 4 pixels for readability
                if ((j + 1) % 4 === 0 && j < pixels.length - 1) {
                    output += '\n';
                }
            }
            
            output += `\n    ];\n\n`;
        }

        // Frame pointer array
        output += `    // Frame pointer array for playback\n`;
        output += `    aFramePointers_${name} : ARRAY[0..${frames.length - 1}] OF POINTER TO ARRAY[0..${width * height - 1}] OF DWORD := [\n`;
        
        for (let i = 0; i < frames.length; i++) {
            output += `        ADR(aFrame_${name}_${i.toString().padStart(3, '0')})`;
            
            if (i < frames.length - 1) {
                output += ',';
            }
            output += '\n';
        }
        
        output += `    ];\n`;
        output += `END_VAR]]></Declaration>\n`;
        output += `  </GVL>\n`;
        output += `</TcPlcObject>\n`;

        return output;
    }

    /**
     * Generate a GUID for TwinCAT objects
     */
    generateGUID() {
        return '{xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx}'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Export animation as JSON (for debugging or external tools)
     */
    exportJSON(frames, options) {
        const { name, brightness, fps, width, height } = options;
        
        const animationData = {
            metadata: {
                name: name,
                frameCount: frames.length,
                width: width,
                height: height,
                fps: fps,
                duration: frames.length / fps,
                brightness: brightness,
                pixelsPerFrame: width * height,
                generated: new Date().toISOString()
            },
            frames: []
        };

        // Add each frame's pixel data
        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            const pixels = this.imageProcessor.applyBrightness(frame.pixelData, brightness);
            
            const frameData = {
                index: i,
                filename: frame.filename,
                pixels: pixels.map(p => ({
                    dword: '0x' + p.dword.toString(16).padStart(8, '0').toUpperCase(),
                    rgb: {
                        r: p.r,
                        g: p.g,
                        b: p.b
                    }
                }))
            };
            
            animationData.frames.push(frameData);
        }

        // Usage information
        animationData.usage = {
            description: "Animation data in portable JSON format",
            formats: {
                dword: "32-bit DWORD in 0x00BBGGRR format",
                rgb: "Individual red, green, blue components (0-255)"
            },
            examples: {
                twincat: "Use DWORD values directly in TwinCAT arrays",
                javascript: "Use RGB values for HTML5 canvas rendering",
                python: "Parse JSON for LED controller scripts"
            }
        };

        return JSON.stringify(animationData, null, 2);
    }

    /**
     * Calculate memory usage estimate
     */
    calculateMemoryUsage(frames, width, height) {
        const pixelsPerFrame = width * height;
        const bytesPerPixel = 4; // DWORD
        const bytesPerFrame = pixelsPerFrame * bytesPerPixel;
        const totalBytes = bytesPerFrame * frames.length;
        
        return {
            pixelsPerFrame: pixelsPerFrame,
            bytesPerFrame: bytesPerFrame,
            totalFrames: frames.length,
            totalBytes: totalBytes,
            totalKB: (totalBytes / 1024).toFixed(2),
            totalMB: (totalBytes / (1024 * 1024)).toFixed(2)
        };
    }

    /**
     * Generate memory usage report
     */
    generateMemoryReport(frames, options) {
        const { name, width, height } = options;
        const usage = this.calculateMemoryUsage(frames, width, height);
        
        let report = '';
        report += `(* ===================================================== *)\n`;
        report += `(* MEMORY USAGE REPORT: ${name} *)\n`;
        report += `(* ===================================================== *)\n`;
        report += `(* Pixels per frame: ${usage.pixelsPerFrame} *)\n`;
        report += `(* Bytes per frame: ${usage.bytesPerFrame} bytes *)\n`;
        report += `(* Total frames: ${usage.totalFrames} *)\n`;
        report += `(* Total memory: ${usage.totalBytes} bytes (${usage.totalKB} KB / ${usage.totalMB} MB) *)\n`;
        report += `(* ===================================================== *)\n`;
        
        // Memory warnings
        if (usage.totalBytes > 10 * 1024 * 1024) {
            report += `(* WARNING: Animation exceeds 10MB! Consider: *)\n`;
            report += `(* - Reducing frame count *)\n`;
            report += `(* - Decreasing resolution *)\n`;
            report += `(* - Loading frames from file instead *)\n`;
            report += `(* ===================================================== *)\n`;
        }
        
        return report;
    }
}
