import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import TWEEN from '@tweenjs/tween.js';

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


    static fadeOutTree(tree, onComplete) {
        const originalScale = tree.scale.clone();

        new TWEEN.Tween(tree.scale)
            .to({ x: 0.001, y: 0.001, z: 0.001 }, 500)
            .easing(TWEEN.Easing.Quadratic.In)
            .onComplete(() => {
                if (onComplete) onComplete(tree, originalScale);
            })
            .start();
    }


    static fadeInTree(tree, originalScale) {
        tree.scale.set(0.001, 0.001, 0.001);

        new TWEEN.Tween(tree.scale)
            .to({ x: originalScale.x, y: originalScale.y, z: originalScale.z }, 500)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
    }


    static relocateTree(tree, bounds = { minX: -5, maxX: 5, minZ: -5, maxZ: 5, y: 0 }) {
        const { minX, maxX, minZ, maxZ, y } = bounds;

        const newX = Math.random() * (maxX - minX) + minX;
        const newZ = Math.random() * (maxZ - minZ) + minZ;

        const newRotY = Math.random() * Math.PI * 2;

        tree.position.set(newX, y, newZ);
        tree.rotation.y = newRotY;
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

                    clone.rotation.y = Math.random() * Math.PI * 2;
                    clone.scale.set(scale, scale, scale);
                    clone.position.set(
                        basePosition.x + (xIndex * spacing - offset),
                        basePosition.y,
                        basePosition.z + (zIndex * spacing - offset)
                    );

                    clone.userData.originalScale = { x: scale, y: scale, z: scale };
                    group.add(clone);
                }
                scene.add(group);

                if (window.setTreesGroup) {
                    window.setTreesGroup(group);
                } else {
                    console.warn("La fonction setTreesGroup n'est pas disponible pour assigner le groupe d'arbres");
                }
                console.log("Grille de", count, "arbres chargée.");

                Model.startTreeCycle(group, {
                    minX: basePosition.x - offset,
                    maxX: basePosition.x + offset,
                    minZ: basePosition.z - offset,
                    maxZ: basePosition.z + offset,
                    y: basePosition.y
                });
            },
            undefined,
            (error) => {
                console.error("Erreur lors du chargement du modèle d'arbre (grid) :", error);
            }
        );
    }


    static startTreeCycle(treeGroup, bounds) {
        if (!treeGroup || !treeGroup.children || treeGroup.children.length === 0) return;

        const getRandomTree = () => {
            if (treeGroup.children.length === 0) return null;
            const index = Math.floor(Math.random() * treeGroup.children.length);
            return treeGroup.children[index];
        };


        const cycleTree = () => {
            const tree = getRandomTree();
            if (!tree) return;
            Model.fadeOutTree(tree, (tree, originalScale) => {

                Model.relocateTree(tree, bounds);


                Model.fadeInTree(tree, originalScale);
            });

            setTimeout(cycleTree, Math.random() * 2000 + 1000);
        };

        setTimeout(cycleTree, 2000);
    }
}
