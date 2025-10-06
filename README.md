# SAND LED Studio

A web-based tool for converting images and PNG sequences into TwinCAT-compatible pixel arrays for LED matrix control.

**🌐 Live Tool:** https://supply-demand-studio.github.io/LED-Studio/

**📦 Part of the SAND_Common ecosystem:** [BECKHOFF_PLC_COMMON](https://github.com/Supply-Demand-Studio/BECKHOFF_PLC_COMMON)

## Features

### Single Image Mode
- Convert individual PNG images to TwinCAT DWORD arrays
- Adjustable brightness control
- Real-time preview
- Automatic RGBW pixel format (0x00BBGGRR)
- Variable naming with automatic formatting

### Animation Sequence Mode
- Import multiple PNG files as animation frames
- Automatic frame sorting by filename
- **Custom Resolution & Cropping**: Resize/crop frames to match your LED strip
  - **After Effects Workflow**: Export at 4px height minimum, crop to 1px height
  - **Crop Modes**: Top, Bottom, Center, Stretch, or Fit
  - Perfect for 1D LED strips (1x64, 1x144, etc.)
- Configurable frame rate (1-60 FPS)
- Loop modes: Loop, Play Once, Ping Pong
- Interactive playback controls and timeline
- Frame-by-frame navigation
- Export complete TwinCAT animation structures

## Usage

### Single Image

1. **Upload Image**
   - Open `index.html` in a web browser
   - Click the "Single Image" tab
   - Drag and drop an image or click to browse
   - Supported formats: PNG, JPEG, GIF

2. **Configure**
   - Enter a name for your image (auto-formatted to TwinCAT naming conventions)
   - Adjust brightness (0-100%)

3. **Export**
   - Click "Export TwinCAT Code"
   - Saves a `.txt` file with:
     - Width and height variables
     - Pixel array in DWORD format

### Animation Sequence

1. **Upload Frames**
   - Click the "Animation Sequence" tab
   - Select multiple PNG files (e.g., `frame_001.png`, `frame_002.png`, etc.)
   - Files are automatically sorted numerically

2. **Configure Animation**
   - **Animation Name**: Identifier for the animation (e.g., `LOADING_SPINNER`)
   - **Frame Rate**: Playback speed in FPS (1-60)
   - **Loop Mode**: 
     - **Loop**: Continuous playback
     - **Play Once**: Single playback then stop
     - **Ping Pong**: Forward then reverse
   - **Brightness**: Global brightness adjustment

3. **Custom Resolution** (Optional)
   - Enable "Use custom output resolution"
   - Set target width and height (e.g., 64x1 for 1D LED strip)
   - Select resize mode:
     - **Crop from top**: Takes first rows (best for After Effects → 1px strip)
     - **Crop from bottom**: Takes last rows
     - **Crop center**: Takes middle section
     - **Stretch**: Distorts to fit target
     - **Fit**: Maintains aspect ratio, adds black bars

4. **Preview**
   - Use playback controls to preview animation
   - Scrub through timeline
   - View individual frames

4. **Export**
   - **TwinCAT Structure**: Complete animation data with frame arrays and metadata
   - **JSON**: Portable format for external processing

## Output Format

### Single Image

```st
nWidth_MY_IMAGE : INT := 16;
nHeight_MY_IMAGE : INT := 16;

aArray_MY_IMAGE : ARRAY[0..255] OF DWORD := [
    16#00FF0000, 16#0000FF00, 16#000000FF, ...
];
```

### Animation Sequence

```st
(* Animation: MY_ANIMATION *)
(* Frame Count: 30 *)
(* Resolution: 16x16 *)
(* Duration: 1.00s *)
(* FPS: 30 *)

// Frame 0
nWidth_MY_ANIMATION_Frame0 : INT := 16;
nHeight_MY_ANIMATION_Frame0 : INT := 16;
aPixels_MY_ANIMATION_Frame0 : ARRAY[0..255] OF DWORD := [
    16#00FF0000, 16#0000FF00, ...
];

// Frame 1
nWidth_MY_ANIMATION_Frame1 : INT := 16;
nHeight_MY_ANIMATION_Frame1 : INT := 16;
aPixels_MY_ANIMATION_Frame1 : ARRAY[0..255] OF DWORD := [
    ...
];

// Animation Structure
TYPE ST_Animation_MY_ANIMATION :
STRUCT
    sName : STRING(80) := 'MY_ANIMATION';
    nFrameCount : INT := 30;
    nWidth : INT := 16;
    nHeight : INT := 16;
    fFrameRate : REAL := 30.0;
    eLoopMode : E_AnimationLoopMode := E_AnimationLoopMode.LOOP;
END_STRUCT
END_TYPE

VAR_GLOBAL
    aFrames_MY_ANIMATION : ARRAY[0..29] OF POINTER TO DWORD := [
        ADR(aPixels_MY_ANIMATION_Frame0),
        ADR(aPixels_MY_ANIMATION_Frame1),
        ...
    ];
END_VAR
```

## Pixel Format

Pixels are encoded as 32-bit DWORD values in **0x00BBGGRR** format:
- **Bits 0-7**: Red channel (0-255)
- **Bits 8-15**: Green channel (0-255)
- **Bits 16-23**: Blue channel (0-255)
- **Bits 24-31**: White/Alpha channel (always 0x00)

Example:
- Pure Red: `16#000000FF`
- Pure Green: `16#0000FF00`
- Pure Blue: `16#00FF0000`
- White (R+G+B): `16#00FFFFFF`

## After Effects → LED Strip Workflow

### Problem
After Effects has a minimum composition height of **4 pixels**, but many LED installations use **1-pixel tall strips** (e.g., 1x64, 1x144).

### Solution: Crop Mode

1. **In After Effects:**
   - Create composition at minimum size: `64px × 4px` (or your strip length × 4)
   - Design your animation on the **top row** of pixels
   - Render as PNG sequence: `frame_001.png`, `frame_002.png`, etc.

2. **In This Converter:**
   - Upload the PNG sequence
   - Enable "Use custom output resolution"
   - Set dimensions: Width = `64`, Height = `1`
   - Select **"Crop from top"** mode
   - Export TwinCAT code

3. **Result:**
   - Only the **first row** of pixels is extracted
   - Output is perfect 1×64 array for your LED strip
   - All other pixels are discarded

### Example
```
Source (After Effects):  64×4 pixels
                        ████████████... (your animation - row 0)
                        ████████████... (unused - row 1)
                        ████████████... (unused - row 2)
                        ████████████... (unused - row 3)

Output (Cropped):       64×1 pixels
                        ████████████... (extracted row 0)
```

## Integration with TwinCAT

### Single Image Example

```st
PROGRAM MAIN
VAR
    fbLEDController : FB_EL2574_LEDController;
    nPixelIndex : INT;
END_VAR

// Set all pixels from array
FOR nPixelIndex := 0 TO (nWidth_MY_IMAGE * nHeight_MY_IMAGE) - 1 DO
    fbLEDController.M_SetPixelByIndex(nPixelIndex, aArray_MY_IMAGE[nPixelIndex]);
END_FOR

fbLEDController.M_Update();
```

### Animation Example

```st
PROGRAM MAIN
VAR
    stAnimation : ST_Animation_MY_ANIMATION;
    fbAnimationPlayer : FB_AnimationPlayer;
    pCurrentFrame : POINTER TO DWORD;
END_VAR

// Play animation
fbAnimationPlayer.Play(stAnimation);
pCurrentFrame := aFrames_MY_ANIMATION[stAnimation.nCurrentFrame];

// Display current frame
// ...
```

## File Structure

```
converter/
├── index.html                 # Main application
├── ImageConverter.html        # Legacy single-image converter (kept for reference)
├── README.md                  # This file
├── css/
│   ├── material-theme.css     # Material Design 3 theme variables
│   └── styles.css             # Application-specific styles
└── js/
    ├── app.js                 # Main application controller
    ├── imageProcessor.js      # Image processing and pixel extraction
    ├── frameManager.js        # Animation frame management
    ├── animationExporter.js   # Export formatting (TwinCAT, JSON)
    ├── singleImageHandler.js  # Single image tab logic
    └── sequenceHandler.js     # Animation sequence tab logic
```

## Browser Compatibility

- **Chrome/Edge**: ✅ Full support
- **Firefox**: ✅ Full support
- **Safari**: ✅ Full support (iOS 11+)
- **Internet Explorer**: ❌ Not supported

## Tips & Best Practices

### Creating Animations

1. **Consistent Dimensions**: All frames should have the same width and height
2. **Naming Convention**: Use numbered filenames (e.g., `frame_001.png`, `frame_002.png`)
3. **Frame Rate**: 
   - 15-20 FPS for smooth LED animations
   - 30+ FPS for video-like playback
4. **File Size**: Keep individual frames under 64x64 pixels for reasonable memory usage
5. **Color Depth**: Use full RGB colors; transparency is converted to black

### Memory Considerations

Each frame uses **width × height × 4 bytes** of memory:
- 16×16 frame: 1,024 bytes (1 KB)
- 32×32 frame: 4,096 bytes (4 KB)
- 64×64 frame: 16,384 bytes (16 KB)

A 30-frame animation at 16×16: **30 KB** total

### Recommended Tools

- **Pixel Art Editor**: [Piskel](https://www.piskelapp.com/p/create/sprite)
- **Animation**: Export PNG sequence from video editing software
- **Batch Processing**: Use ImageMagick for bulk conversions

## Troubleshooting

### Problem: Frames out of order
**Solution**: Ensure filenames have proper zero-padding (e.g., `frame_001.png` not `frame_1.png`)

### Problem: Animation too fast/slow
**Solution**: Adjust FPS in animation settings before export

### Problem: Colors look wrong on LED matrix
**Solution**: Check that your LED controller expects RGBW format in 0x00BBGGRR order

### Problem: Export file is huge
**Solution**: Reduce frame count, resolution, or use lower FPS

## References

This tool is designed for use with **Beckhoff EL2574 LED controllers** and follows the pixel format conventions from the official Beckhoff documentation:

**📖 Beckhoff EL2574 Documentation:** [https://infosys.beckhoff.com/english.php?content=../content/1033/el2574/index.html](https://infosys.beckhoff.com/english.php?content=../content/1033/el2574/index.html)

The DWORD pixel format (0x00BBGGRR) and array structure are based on Beckhoff's official examples for LED strip control.

## License

MIT License

Copyright (c) 2025 Supply & Demand Studio

Part of the SAND_Common ecosystem and MNEX Interactive Installation System project.

## Version History

- **v1.0.0** (2025-10-06): 
  - Complete rewrite with Material Design 3 UI
  - Added animation sequence support
  - Custom resolution and crop modes
  - Zoom controls for tiny images
  - After Effects workflow support
- **v0.1.0** (2023): Initial single-image converter

## Related Documentation

- [SAND_Common Library](https://github.com/Supply-Demand-Studio/BECKHOFF_PLC_COMMON)
- [Beckhoff EL2574 Terminal Documentation](https://infosys.beckhoff.com/english.php?content=../content/1033/el2574/index.html)
- [TwinCAT 3 PLC Programming](https://www.beckhoff.com/en-en/products/automation/twincat/)

---

**Created by Supply & Demand Studio** | [GitHub](https://github.com/Supply-Demand-Studio/LED-Studio)
