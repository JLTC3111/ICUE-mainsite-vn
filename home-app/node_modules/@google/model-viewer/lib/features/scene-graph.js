/* @license
 * Copyright 2020 Google LLC. All Rights Reserved.
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
import { property } from 'lit/decorators.js';
import { CanvasTexture, Object3D, RepeatWrapping, SRGBColorSpace, VideoTexture } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { decompress } from 'three/examples/jsm/utils/WebGLTextureUtils.js';
import { $needsRender, $onModelLoad, $progressTracker, $renderer, $scene } from '../model-viewer-base.js';
import GLTFExporterMaterialsVariantsExtension from '../three-components/gltf-instance/VariantMaterialExporterPlugin.js';
import { $availableVariants, $materialFromPoint, $prepareVariantsForExport, $switchVariant, Model } from './scene-graph/model.js';
import { Texture as ModelViewerTexture } from './scene-graph/texture.js';
export const $currentGLTF = Symbol('currentGLTF');
export const $originalGltfJson = Symbol('originalGltfJson');
export const $model = Symbol('model');
export const $extraModels = Symbol('extraModels');
const $getOnUpdateMethod = Symbol('getOnUpdateMethod');
const $buildTexture = Symbol('buildTexture');
/**
 * SceneGraphMixin manages exposes a model API in order to support operations on
 * the <model-viewer> scene graph.
 */
export const SceneGraphMixin = (ModelViewerElement) => {
    var _a, _b, _c, _d;
    class SceneGraphModelViewerElement extends ModelViewerElement {
        constructor() {
            super(...arguments);
            this[_a] = undefined;
            this[_b] = [];
            this[_c] = null;
            this[_d] = null;
            this.variantName = null;
            this.orientation = '0 0 0';
            this.scale = '1 1 1';
        }
        // Scene-graph API:
        /** @export */
        get model() {
            return this[$model];
        }
        /** @export */
        get extraModels() {
            return this[$extraModels];
        }
        get availableVariants() {
            return this.model ? this.model[$availableVariants]() : [];
        }
        /**
         * Returns a deep copy of the gltf JSON as loaded. It will not reflect
         * changes to the scene-graph, nor will editing it have any effect.
         */
        get originalGltfJson() {
            return this[$originalGltfJson];
        }
        [(_a = $model, _b = $extraModels, _c = $currentGLTF, _d = $originalGltfJson, $getOnUpdateMethod)]() {
            return () => {
                this[$needsRender]();
            };
        }
        [$buildTexture](texture) {
            // Applies glTF default settings.
            texture.colorSpace = SRGBColorSpace;
            texture.wrapS = RepeatWrapping;
            texture.wrapT = RepeatWrapping;
            return new ModelViewerTexture(this[$getOnUpdateMethod](), texture);
        }
        async createTexture(uri, type = 'image/png') {
            const { textureUtils } = this[$renderer];
            const texture = await textureUtils.loadImage(uri, this.withCredentials, type);
            // GLTFExporter cannot encode KTX2; use PNG as export format
            const exportType = (type === 'image/ktx2') ? 'image/png' : type;
            texture.userData.mimeType = exportType;
            return this[$buildTexture](texture);
        }
        async createLottieTexture(uri, quality = 1) {
            const { textureUtils } = this[$renderer];
            const texture = await textureUtils.loadLottie(uri, quality, this.withCredentials);
            return this[$buildTexture](texture);
        }
        createVideoTexture(uri) {
            const video = document.createElement('video');
            video.crossOrigin =
                this.withCredentials ? 'use-credentials' : 'anonymous';
            video.src = uri;
            video.muted = true;
            video.playsInline = true;
            video.loop = true;
            video.play();
            const texture = new VideoTexture(video);
            return this[$buildTexture](texture);
        }
        createCanvasTexture() {
            const canvas = document.createElement('canvas');
            const texture = new CanvasTexture(canvas);
            return this[$buildTexture](texture);
        }
        async updated(changedProperties) {
            super.updated(changedProperties);
            if (changedProperties.has('variantName')) {
                const updateVariantProgress = this[$progressTracker].beginActivity('variant-update');
                updateVariantProgress(0.1);
                const model = this[$model];
                const { variantName } = this;
                if (model != null) {
                    await model[$switchVariant](variantName);
                    this[$needsRender]();
                    this.dispatchEvent(new CustomEvent('variant-applied'));
                }
                updateVariantProgress(1.0);
            }
            if (changedProperties.has('orientation') ||
                changedProperties.has('scale')) {
                if (!this.loaded) {
                    return;
                }
                const scene = this[$scene];
                scene.applyTransform();
                scene.updateBoundingBox();
                scene.updateShadow();
                this[$renderer].arRenderer.onUpdateScene();
                this[$needsRender]();
            }
        }
        [$onModelLoad]() {
            super[$onModelLoad]();
            const { currentGLTFs } = this[$scene];
            const currentGLTF = currentGLTFs.length > 0 ? currentGLTFs[0] : null;
            if (currentGLTF != null) {
                const { correlatedSceneGraph } = currentGLTF;
                if (correlatedSceneGraph != null &&
                    currentGLTF !== this[$currentGLTF]) {
                    this[$model] =
                        new Model(correlatedSceneGraph, this[$getOnUpdateMethod]());
                    this[$originalGltfJson] =
                        JSON.parse(JSON.stringify(correlatedSceneGraph.gltf));
                }
                // KHR_materials_variants extension spec:
                // https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_variants
                if ('variants' in currentGLTF.userData) {
                    this.requestUpdate('variantName');
                }
            }
            this[$extraModels] = [];
            const extraNodes = Array.from(this.querySelectorAll('extra-model'));
            for (let i = 1; i < currentGLTFs.length; i++) {
                const gltf = currentGLTFs[i];
                if (gltf != null && gltf.correlatedSceneGraph != null) {
                    const modelWrapper = new Model(gltf.correlatedSceneGraph, this[$getOnUpdateMethod]());
                    this[$extraModels].push(modelWrapper);
                    // Link back to light-dom DOM node!
                    if (extraNodes[i - 1]) {
                        extraNodes[i - 1].model = modelWrapper;
                    }
                }
            }
            this[$currentGLTF] = currentGLTF;
        }
        /** @export */
        async exportScene(options) {
            const scene = this[$scene];
            return new Promise(async (resolve, reject) => {
                // Defaults
                const opts = {
                    binary: true,
                    onlyVisible: true,
                    maxTextureSize: Infinity,
                    includeCustomExtensions: false,
                    forceIndices: false
                };
                Object.assign(opts, options);
                // Not configurable
                opts.animations = scene.animations;
                opts.truncateDrawRange = true;
                const shadow = scene.shadow;
                let visible = false;
                // Remove shadow from export
                if (shadow != null) {
                    visible = shadow.visible;
                    shadow.visible = false;
                }
                await this[$model][$prepareVariantsForExport]();
                const exporter = new GLTFExporter()
                    .register((writer) => new GLTFExporterMaterialsVariantsExtension(writer));
                exporter.setTextureUtils({
                    decompress: (texture, maxTextureSize) => {
                        return decompress(texture, maxTextureSize !== null && maxTextureSize !== void 0 ? maxTextureSize : Infinity, undefined);
                    }
                });
                let exportTarget;
                if (scene.models.length > 1) {
                    exportTarget = new Object3D();
                    for (const m of scene.models) {
                        exportTarget.add(m);
                    }
                }
                else {
                    exportTarget = scene.models[0];
                }
                exporter.parse(exportTarget, (gltf) => {
                    if (scene.models.length > 1) {
                        for (const m of scene.models) {
                            scene.target.add(m);
                        }
                    }
                    else {
                        scene.target.add(scene.models[0]);
                    }
                    return resolve(new Blob([opts.binary ? gltf : JSON.stringify(gltf)], {
                        type: opts.binary ? 'application/octet-stream' :
                            'application/json'
                    }));
                }, () => {
                    return reject('glTF export failed');
                }, opts);
                if (shadow != null) {
                    shadow.visible = visible;
                }
            });
        }
        materialFromPoint(pixelX, pixelY) {
            const scene = this[$scene];
            const ndcCoords = scene.getNDC(pixelX, pixelY);
            const hit = scene.hitFromPoint(ndcCoords);
            if (hit == null || hit.face == null) {
                return null;
            }
            const model = this[$model];
            if (model != null) {
                const material = model[$materialFromPoint](hit);
                if (material != null)
                    return material;
            }
            for (const extraModel of this[$extraModels]) {
                const extraMaterial = extraModel[$materialFromPoint](hit);
                if (extraMaterial != null)
                    return extraMaterial;
            }
            return null;
        }
    }
    __decorate([
        property({ type: String, attribute: 'variant-name' })
    ], SceneGraphModelViewerElement.prototype, "variantName", void 0);
    __decorate([
        property({ type: String, attribute: 'orientation' })
    ], SceneGraphModelViewerElement.prototype, "orientation", void 0);
    __decorate([
        property({ type: String, attribute: 'scale' })
    ], SceneGraphModelViewerElement.prototype, "scale", void 0);
    return SceneGraphModelViewerElement;
};
//# sourceMappingURL=scene-graph.js.map