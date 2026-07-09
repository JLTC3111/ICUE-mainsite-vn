import { ReactiveElement } from 'lit';
/**
 * Declarative child element for adding multiple models to <model-viewer>.
 */
export declare class ExtraModelElement extends ReactiveElement {
    static get is(): string;
    src: string | null;
    /**
     * Reference to the underlying scene graph Model wrapper.
     */
    model?: import('./scene-graph/model.js').Model;
    /**
     * Position offset relative to global origin.
     * Format: "x y z" in meters (e.g., "1 0 -0.5")
     */
    offset: string | null;
    /**
     * Rotation orientation.
     * Format: "x y z" in degrees or radians (mirroring orientation format).
     */
    orientation: string | null;
    /**
     * Scale multiplier.
     * Format: "x y z" or single number multiplier.
     */
    scale: string | null;
    /**
     * Transparently excludes model from AR and casting shadows.
     */
    background: boolean;
    updated(changedProperties: Map<string | number | symbol, unknown>): void;
}
