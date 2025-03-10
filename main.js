import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import TWEEN from '@tweenjs/tween.js';
import testModelURL from '/assets/models/Xbot.glb?url';
import arbresModel from '/assets/models/just_tree.glb?url';
import { Model } from './models.js';

let container;
let camera, scene, renderer;
let controller;
let reticle;
let shadowMesh;
let treeModel;
let treesGroup = null;
let score = 0;
let scoreText;
let scoreGroup;

let hitTestSource = null;
let hitTestSourceRequested = false;

let player = null;
let playerMixer = null;
const clock = new THREE.Clock();

init();
loadModel();



function init() {
  container = document.createElement('div');
  document.body.appendChild(container);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
  hemiLight.position.set(0.5, 1, 0.25);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(5, 10, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -10;
  dirLight.shadow.camera.right = 10;
  dirLight.shadow.camera.top = 10;
  dirLight.shadow.camera.bottom = -10;
  scene.add(dirLight);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.setAnimationLoop(animate);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  Model.loadGrid(scene, 9, new THREE.Vector3(0, -2, 0), {
    url: arbresModel,
    spacing: 2,
    scale: 0.3
  });

  // Création du compteur de score 3D
  scoreGroup = new THREE.Group();

  // Créer un texte temporaire avec plane geometry
  const tempGeometry = new THREE.PlaneGeometry(0.5, 0.2);
  const tempMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8
  });
  scoreText = new THREE.Mesh(tempGeometry, tempMaterial);

  // Position fixe dans le coin supérieur gauche du champ de vision
  scoreGroup.position.set(-0.4, 0.3, -1);
  scoreGroup.add(scoreText);
  scene.add(scoreGroup);

  // On mettra à jour la position du groupe de score pour qu'il reste attaché à la caméra

  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial()
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  window.addEventListener('resize', onWindowResize);
}

function loadModel() {
  const loader = new GLTFLoader();
  loader.load(
    testModelURL,
    (gltf) => {
      player = gltf.scene;
      player.scale.set(0.5, 0.5, 0.5);
      playerMixer = new THREE.AnimationMixer(player);
      if (gltf.animations && gltf.animations.length > 6) {
        const action = playerMixer.clipAction(gltf.animations[6]);
        action.play();
        console.log("Le personnage s'anime");
      }
      player.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
        }
      });
      player.position.set(0, 0, -1);
      scene.add(player);

      const shadowGeo = new THREE.PlaneGeometry(1, 1);
      const shadowMat = new THREE.ShadowMaterial({ opacity: 0.5 });
      shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.set(player.position.x, 0.01, player.position.z);
      shadowMesh.receiveShadow = true;
      scene.add(shadowMesh);
    },
    undefined,
    (error) => {
      console.error("Erreur lors du chargement du modèle :", error);
      const geometry = new THREE.BoxGeometry(1, 2, 1);
      const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
      player = new THREE.Mesh(geometry, material);
      player.castShadow = true;
      scene.add(player);
    }
  );
}

function onSelect() {
  if (reticle.visible && player) {
    const targetPos = new THREE.Vector3();
    const dummyQuat = new THREE.Quaternion();
    const dummyScale = new THREE.Vector3();
    reticle.matrix.decompose(targetPos, dummyQuat, dummyScale);

    const direction = new THREE.Vector3().subVectors(targetPos, player.position);
    direction.y = 0;
    const desiredAngle = Math.atan2(direction.x, direction.z);

    const rotationDuration = 500;
    const positionDuration = 1000;

    const initialAngle = player.rotation.y;
    new TWEEN.Tween({ angle: initialAngle })
      .to({ angle: desiredAngle }, rotationDuration)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(function (obj) {
        player.rotation.y = obj.angle;
      })
      .onComplete(function () {
        new TWEEN.Tween(player.position)
          .to({
            x: targetPos.x,
            y: targetPos.y,
            z: targetPos.z
          }, positionDuration)
          .easing(TWEEN.Easing.Quadratic.Out)
          .start();
      })
      .start();

    console.log("Rotation vers", desiredAngle, "puis déplacement vers", targetPos);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateScoreDisplay() {
  // Crée une texture canvas pour afficher le score
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 128;
  canvas.height = 64;

  context.fillStyle = '#000000';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.font = '24px Arial';
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 8);

  // Mettre à jour la texture du compteur
  if (scoreText.material.map) {
    scoreText.material.map.dispose();
  }

  const texture = new THREE.CanvasTexture(canvas);
  scoreText.material.map = texture;
  scoreText.material.needsUpdate = true;
}

function animate(timestamp, frame) {
  const delta = clock.getDelta();
  if (playerMixer) {
    playerMixer.update(delta);
  }
  TWEEN.update();

  if (player && shadowMesh) {
    shadowMesh.position.x = player.position.x;
    shadowMesh.position.z = player.position.z;
    shadowMesh.position.y = player.position.y;
  }

  // Faire suivre le compteur de score à la caméra
  if (scoreGroup) {
    // Position le groupe de score devant la caméra
    scoreGroup.position.copy(camera.position);
    scoreGroup.position.x -= 0.4; // Décaler vers la gauche
    scoreGroup.position.y += 0.3; // Décaler vers le haut
    scoreGroup.position.z -= 1; // Avancer d'un mètre devant la caméra

    // Orienter vers la caméra
    scoreGroup.quaternion.copy(camera.quaternion);
  }

  // Détection de collision entre le joueur et les arbres
  if (player && treesGroup) {
    // Crée la bounding box du joueur
    const playerBox = new THREE.Box3().setFromObject(player);
    // Parcourt chaque arbre dans la grille
    for (let i = treesGroup.children.length - 1; i >= 0; i--) {
      const tree = treesGroup.children[i];
      const treeBox = new THREE.Box3().setFromObject(tree);
      if (playerBox.intersectsBox(treeBox)) {
        // Retire l'arbre de la scène
        treesGroup.remove(tree);
        score++;
        console.log("Collision détectée ! Score :", score);

        // Met à jour l'affichage du score
        updateScoreDisplay();

        // Animation de l'affichage du score (scale up puis down)
        new TWEEN.Tween(scoreGroup.scale)
          .to({ x: 1.5, y: 1.5, z: 1.5 }, 200)
          .easing(TWEEN.Easing.Cubic.Out)
          .onComplete(() => {
            new TWEEN.Tween(scoreGroup.scale)
              .to({ x: 1, y: 1, z: 1 }, 200)
              .easing(TWEEN.Easing.Cubic.In)
              .start();
          })
          .start();
      }
    }
  }

  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();
    if (!hitTestSourceRequested) {
      session.requestReferenceSpace('viewer').then((referenceSpace) => {
        session.requestHitTestSource({ space: referenceSpace }).then((source) => {
          hitTestSource = source;
        });
      });
      session.addEventListener('end', () => {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });
      hitTestSourceRequested = true;
    }
    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length) {
        const hit = hitTestResults[0];
        reticle.visible = true;
        reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }
  renderer.render(scene, camera);
}

