import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Model {
    /**
     * @param {THREE.Scene} scene - La scène dans laquelle ajouter le modèle.
     * @param {string} url - L'URL du modèle glTF à charger.
     * @param {Object} options - Options de placement et de transformation.
     */
    constructor(scene, url, options = {}) {
        this.scene = scene;
        this.url = url;
        this.options = {
            minX: options.minX ?? -5,
            maxX: options.maxX ?? 5,
            minZ: options.minZ ?? -5,
            maxZ: options.maxZ ?? 5,
            y: options.y ?? 0,
            scale: options.scale ?? 1
        };
        this.loader = new GLTFLoader();
        this.model = null;
    }

    load() {
        this.loader.load(
            this.url,
            (gltf) => {
                this.model = gltf.scene;

                this.model.scale.set(this.options.scale, this.options.scale, this.options.scale);


                this.model.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });


                this.setRandomPosition();

                this.scene.add(this.model);
                console.log("Modèle chargé en position :", this.model.position);
            },
            undefined,
            (error) => {
                console.error("Erreur lors du chargement du modèle :", error);
            }
        );
    }

    setRandomPosition() {
        const { minX, maxX, minZ, maxZ, y } = this.options;

        this.model.position.x = Math.random() * (maxX - minX) + minX;
        this.model.position.z = Math.random() * (maxZ - minZ) + minZ;

        this.setY(y);
    }

    setY(newY) {
        if (this.model) {
            this.model.updateMatrixWorld(true);
            const bbox = new THREE.Box3().setFromObject(this.model);
            const yOffset = bbox.min.y;

            this.model.position.y = newY - yOffset;
        }
    }

    static loadGrid(scene, count, basePosition, options = {}) {
        const spacing = options.spacing || 2;
        const scale = options.scale || 0.3;
        const url = options.url;
        if (!url) {
            console.error("L'URL du modèle d'arbre est requise pour loadGrid.");
            return;
        }
        const loader = new GLTFLoader();
        loader.load(
            url,
            (gltf) => {
                const group = new THREE.Group();
                const gridSize = Math.ceil(Math.sqrt(count));
                const offset = (gridSize * spacing) / 2;
                for (let i = 0; i < count; i++) {
                    const xIndex = i % gridSize;
                    const zIndex = Math.floor(i / gridSize);
                    const clone = gltf.scene.clone(true);
                    clone.traverse(child => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    // Rotation aléatoire
                    clone.rotation.y = Math.random() * Math.PI * 2;
                    clone.scale.set(scale, scale, scale);
                    clone.position.set(
                        basePosition.x + (xIndex * spacing - offset),
                        basePosition.y,
                        basePosition.z + (zIndex * spacing - offset)
                    );
                    group.add(clone);
                }
                scene.add(group);
                // Affectation du groupe à la variable globale pour collision
                treesGroup = group;
                console.log("Grille de", count, "arbres chargée.");
            },
            undefined,
            (error) => {
                console.error("Erreur lors du chargement du modèle d'arbre (grid) :", error);
            }
        );
    }
}
