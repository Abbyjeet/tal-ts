import { BrowserDevice } from './base/browserdevice';
import { HTML5MediaPlayer } from './mediaplayer/html5';
import { IAnimator, IAnimOptions } from './base/device';
export declare class WebkitDevice extends BrowserDevice {
    protected mediaPlayer: HTML5MediaPlayer;
    scrollElementTo(): void;
    moveElementTo(): void;
    hideElement(): void;
    showElement(): void;
    tweenElementStyle(options: IAnimOptions): IAnimator;
    stopAnimation(animator: IAnimator): void;
    isAnimationDisabled(): boolean;
}