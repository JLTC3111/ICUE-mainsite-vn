/* @license
 * Copyright 2026 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { ReactiveElement } from 'lit';
import { property } from 'lit/decorators.js';
/**
 * Declarative child element for adding multiple models to <model-viewer>.
 */
export class ExtraModelElement extends ReactiveElement {
    constructor() {
        super(...arguments);
        this.src = null;
        /**
         * Position offset relative to global origin.
         * Format: "x y z" in meters (e.g., "1 0 -0.5")
         */
        this.offset = null;
        /**
         * Rotation orientation.
         * Format: "x y z" in degrees or radians (mirroring orientation format).
         */
        this.orientation = null;
        /**
         * Scale multiplier.
         * Format: "x y z" or single number multiplier.
         */
        this.scale = null;
        /**
         * Transparently excludes model from AR and casting shadows.
         */
        this.background = false;
    }
    static get is() {
        return 'extra-model';
    }
    updated(changedProperties) {
        super.updated(changedProperties);
        // Whenever attributes change, dispatch a customized event up to
        // <model-viewer>
        if (changedProperties.has('src') || changedProperties.has('offset') ||
            changedProperties.has('orientation') ||
            changedProperties.has('scale') || changedProperties.has('background')) {
            const srcChanged = changedProperties.has('src');
            this.dispatchEvent(new CustomEvent('extra-model-changed', {
                bubbles: true,
                composed: true,
                detail: {
                    srcChanged,
                    src: this.src,
                    offset: this.offset,
                    orientation: this.orientation,
                    scale: this.scale,
                    background: this.background
                }
            }));
        }
    }
}
__decorate([
    property({ type: String })
], ExtraModelElement.prototype, "src", void 0);
__decorate([
    property({ type: String })
], ExtraModelElement.prototype, "offset", void 0);
__decorate([
    property({ type: String })
], ExtraModelElement.prototype, "orientation", void 0);
__decorate([
    property({ type: String })
], ExtraModelElement.prototype, "scale", void 0);
__decorate([
    property({ type: Boolean })
], ExtraModelElement.prototype, "background", void 0);
customElements.define('extra-model', ExtraModelElement);
//# sourceMappingURL=extra-model.js.map