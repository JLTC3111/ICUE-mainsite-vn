import ModelViewerElementBase from '../model-viewer-base.js';
import { Constructor } from '../utilities.js';
interface PlayAnimationOptions {
    repetitions: number;
    pingpong: boolean;
    modelIndex?: number;
}
interface AppendAnimationOptions {
    pingpong?: boolean;
    repetitions?: number | null;
    weight?: number;
    timeScale?: number;
    fade?: boolean | number;
    warp?: boolean | number;
    relativeWarp?: boolean;
    time?: number | null;
    modelIndex?: number;
}
interface DetachAnimationOptions {
    fade?: boolean | number;
    modelIndex?: number;
}
export declare interface AnimationInterface {
    autoplay: boolean;
    animationName: string | void;
    animationCrossfadeDuration: number;
    readonly availableAnimations: Array<string>;
    readonly appendedAnimations: Array<string>;
    readonly paused: boolean;
    readonly duration: number;
    currentTime: number;
    timeScale: number;
    pause(): void;
    play(options?: PlayAnimationOptions): void;
    appendAnimation(animationName: string, options?: AppendAnimationOptions): void;
    detachAnimation(animationName: string, options?: DetachAnimationOptions): void;
}
export declare const AnimationMixin: <T extends Constructor<ModelViewerElementBase>>(ModelViewerElement: T) => Constructor<AnimationInterface> & T;
export {};
