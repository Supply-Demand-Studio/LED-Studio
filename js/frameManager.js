/**
 * FrameManager - Manages animation playback and frame navigation
 */
class FrameManager {
    constructor() {
        this.frames = [];
        this.currentFrame = 0;
        this.fps = 30;
        this.loopMode = 'loop'; // 'loop', 'once', 'pingpong'
        this.playing = false;
        this.direction = 1; // 1 for forward, -1 for backward (pingpong mode)
        this.animationTimer = null;
        this.eventListeners = {};
    }

    /**
     * Set frames data
     */
    setFrames(frames) {
        this.frames = frames;
        this.currentFrame = 0;
        this.stop();
    }

    /**
     * Set frames per second
     */
    setFPS(fps) {
        this.fps = fps;
        if (this.playing) {
            this.stop();
            this.play();
        }
    }

    /**
     * Set loop mode
     */
    setLoopMode(mode) {
        this.loopMode = mode;
        this.direction = 1;
    }

    /**
     * Start playback
     */
    play() {
        if (this.frames.length === 0) return;
        if (this.playing) return;

        this.playing = true;
        this.emit('playStateChange', true);

        const interval = 1000 / this.fps;
        this.animationTimer = setInterval(() => {
            this.advanceFrame();
        }, interval);
    }

    /**
     * Stop playback
     */
    stop() {
        if (!this.playing) return;

        this.playing = false;
        this.emit('playStateChange', false);

        if (this.animationTimer) {
            clearInterval(this.animationTimer);
            this.animationTimer = null;
        }
    }

    /**
     * Check if playing
     */
    isPlaying() {
        return this.playing;
    }

    /**
     * Advance to next frame based on loop mode
     */
    advanceFrame() {
        switch (this.loopMode) {
            case 'loop':
                this.currentFrame = (this.currentFrame + 1) % this.frames.length;
                break;

            case 'once':
                if (this.currentFrame < this.frames.length - 1) {
                    this.currentFrame++;
                } else {
                    this.stop();
                }
                break;

            case 'pingpong':
                this.currentFrame += this.direction;
                
                if (this.currentFrame >= this.frames.length - 1) {
                    this.currentFrame = this.frames.length - 1;
                    this.direction = -1;
                } else if (this.currentFrame <= 0) {
                    this.currentFrame = 0;
                    this.direction = 1;
                }
                break;
        }

        this.emit('frameChange', this.currentFrame);
    }

    /**
     * Go to specific frame
     */
    goToFrame(index) {
        if (index < 0 || index >= this.frames.length) return;
        
        this.currentFrame = index;
        this.emit('frameChange', this.currentFrame);
    }

    /**
     * Go to next frame (manual control)
     */
    nextFrame() {
        const nextIndex = (this.currentFrame + 1) % this.frames.length;
        this.goToFrame(nextIndex);
    }

    /**
     * Go to previous frame (manual control)
     */
    previousFrame() {
        const prevIndex = this.currentFrame - 1;
        const wrappedIndex = prevIndex < 0 ? this.frames.length - 1 : prevIndex;
        this.goToFrame(wrappedIndex);
    }

    /**
     * Get current frame index
     */
    getCurrentFrame() {
        return this.currentFrame;
    }

    /**
     * Get total frame count
     */
    getFrameCount() {
        return this.frames.length;
    }

    /**
     * Event emitter methods
     */
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(data));
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stop();
        this.frames = [];
        this.eventListeners = {};
    }
}
