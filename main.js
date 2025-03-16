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

let hitTestSource = null;
let hitTestSourceRequested = false;

let player = null;
let playerMixer = null;
const clock = new THREE.Clock();

let scoreText;
let scoreGroup;

window.setTreesGroup = function (group) {
  treesGroup = group;
  console.log("Groupe d'arbres assigné dans main.js", group);
};

score = 0;

init();
loadModel();

function initUI() {
  console.log("Initialisation de l'interface utilisateur 3D");
}

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

  const arButton = ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] });
  document.body.appendChild(arButton);

  renderer.xr.addEventListener('sessionstart', () => {
    console.log('Session AR démarrée');
  });

  renderer.xr.addEventListener('sessionend', () => {
    console.log('Session AR terminée');
  });

  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  Model.loadGrid(scene, 9, new THREE.Vector3(0, -2, 0), {
    url: arbresModel,
    spacing: 2,
    scale: 0.3
  });

  updateScoreDisplay();

  createScoreDisplay3D();

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

function createScoreDisplay3D() {
  scoreGroup = new THREE.Group();

  const roundedRectShape = new THREE.Shape();
  const width = 0.4;
  const height = 0.18;
  const radius = 0.05;

  roundedRectShape.moveTo(-width / 2 + radius, -height / 2);
  roundedRectShape.lineTo(width / 2 - radius, -height / 2);
  roundedRectShape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
  roundedRectShape.lineTo(width / 2, height / 2 - radius);
  roundedRectShape.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
  roundedRectShape.lineTo(-width / 2 + radius, height / 2);
  roundedRectShape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
  roundedRectShape.lineTo(-width / 2, -height / 2 + radius);
  roundedRectShape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);

  const scoreBackgroundGeometry = new THREE.ShapeGeometry(roundedRectShape);

  const scoreBackground = new THREE.Mesh(
    scoreBackgroundGeometry,
    new THREE.MeshBasicMaterial({
      color: 0x0a1a2a,
      opacity: 0.85,
      transparent: true,
      side: THREE.DoubleSide
    })
  );

  const glassEffect = new THREE.Mesh(
    scoreBackgroundGeometry,
    new THREE.MeshBasicMaterial({
      color: 0x4cc9f0,
      opacity: 0.15,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
  );
  glassEffect.position.z = 0.001;

  const outerBorderShape = roundedRectShape.clone();
  const outerBorderGeometry = new THREE.ShapeGeometry(outerBorderShape);
  const outerBorder = new THREE.Mesh(
    outerBorderGeometry,
    new THREE.MeshBasicMaterial({
      color: 0x4cc9f0,
      opacity: 0.9,
      transparent: true,
      side: THREE.DoubleSide
    })
  );
  outerBorder.scale.set(1.04, 1.08, 1);
  outerBorder.position.z = -0.002;

  const innerBorder = new THREE.Mesh(
    scoreBackgroundGeometry,
    new THREE.MeshBasicMaterial({
      color: 0x7df9ff,
      opacity: 0.7,
      transparent: true,
      side: THREE.DoubleSide,
      wireframe: false
    })
  );
  innerBorder.scale.set(1.01, 1.03, 1);
  innerBorder.position.z = 0.002;

  const backPlate = new THREE.Mesh(
    scoreBackgroundGeometry,
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      opacity: 0.5,
      transparent: true,
      side: THREE.DoubleSide
    })
  );
  backPlate.position.z = -0.005;
  backPlate.scale.set(1.05, 1.1, 1);

  scoreGroup.add(backPlate);
  scoreGroup.add(outerBorder);
  scoreGroup.add(scoreBackground);
  scoreGroup.add(glassEffect);
  scoreGroup.add(innerBorder);

  const particlesCount = 10;
  const particleGeometry = new THREE.CircleGeometry(0.005, 8);
  const particleMaterial = new THREE.MeshBasicMaterial({
    color: 0x7df9ff,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });

  for (let i = 0; i < particlesCount; i++) {
    const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.22 + Math.random() * 0.05;

    particle.position.x = Math.cos(angle) * radius;
    particle.position.y = Math.sin(angle) * radius;
    particle.position.z = 0.01;

    particle.userData = {
      originalX: particle.position.x,
      originalY: particle.position.y,
      speed: 0.1 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2
    };

    scoreGroup.add(particle);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const context = canvas.getContext('2d');

  context.clearRect(0, 0, canvas.width, canvas.height);

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#f72585');
  gradient.addColorStop(0.3, '#b5179e');
  gradient.addColorStop(0.5, '#7209b7');
  gradient.addColorStop(0.7, '#3a0ca3');
  gradient.addColorStop(0.9, '#4cc9f0');

  context.shadowColor = 'rgba(0, 0, 0, 0.8)';
  context.shadowBlur = 15;
  context.shadowOffsetX = 5;
  context.shadowOffsetY = 5;

  context.font = 'Bold 110px "Segoe UI", Arial, sans-serif';
  context.fillStyle = 'rgba(255, 255, 255, 0.3)';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(`🌲 ${score}`, canvas.width / 2, canvas.height / 2);

  context.font = 'Bold 100px "Segoe UI", Arial, sans-serif';
  context.fillStyle = gradient;
  context.fillText(`🌲 ${score}`, canvas.width / 2, canvas.height / 2);

  context.lineWidth = 3;
  context.strokeStyle = '#ffffff';
  context.strokeText(`🌲 ${score}`, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  scoreText = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.18),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    })
  );

  scoreGroup.add(scoreText);

  scoreGroup.children.forEach(child => {
    if (child.material) {
      child.material.depthTest = false;
      child.material.depthWrite = false;
      child.renderOrder = 999;
    }
  });

  scene.add(scoreGroup);
}

function updateScoreDisplay() {
  if (scoreText) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const context = canvas.getContext('2d');

    context.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#f72585');
    gradient.addColorStop(0.3, '#b5179e');
    gradient.addColorStop(0.5, '#7209b7');
    gradient.addColorStop(0.7, '#3a0ca3');
    gradient.addColorStop(0.9, '#4cc9f0');

    context.shadowColor = 'rgba(0, 0, 0, 0.8)';
    context.shadowBlur = 15;
    context.shadowOffsetX = 5;
    context.shadowOffsetY = 5;

    context.font = 'Bold 110px "Segoe UI", Arial, sans-serif';
    context.fillStyle = 'rgba(255, 255, 255, 0.3)';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`🌲 ${score}`, canvas.width / 2, canvas.height / 2);

    context.font = 'Bold 100px "Segoe UI", Arial, sans-serif';
    context.fillStyle = gradient;
    context.fillText(`🌲 ${score}`, canvas.width / 2, canvas.height / 2);

    context.lineWidth = 3;
    context.strokeStyle = '#ffffff';
    context.strokeText(`🌲 ${score}`, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    scoreText.material.map = texture;
    scoreText.material.needsUpdate = true;

    scoreText.scale.set(1.5, 1.5, 1.5);

    const borders = scoreGroup.children.filter(child =>
      child.material && child.material.wireframe);

    borders.forEach(border => {
      const originalColor = border.material.color.clone();

      border.material.color.set(0xffffff);

      setTimeout(() => {
        border.material.color.copy(originalColor);
      }, 350);
    });

    const particles = scoreGroup.children.filter(child =>
      child.geometry && child.geometry.type === 'CircleGeometry');

    particles.forEach(particle => {
      const originalX = particle.userData.originalX;
      const originalY = particle.userData.originalY;

      const explosionRadius = 0.1;
      const randomAngle = Math.random() * Math.PI * 2;

      particle.position.x = originalX + Math.cos(randomAngle) * explosionRadius;
      particle.position.y = originalY + Math.sin(randomAngle) * explosionRadius;

      particle.material.opacity = 1.0;

      setTimeout(() => {
        new TWEEN.Tween(particle.position)
          .to({ x: originalX, y: originalY }, 1000)
          .easing(TWEEN.Easing.Elastic.Out)
          .start();

        new TWEEN.Tween(particle.material)
          .to({ opacity: 0.6 }, 1000)
          .start();
      }, 400);
    });

    setTimeout(() => {
      new TWEEN.Tween(scoreText.scale)
        .to({ x: 1, y: 1, z: 1 }, 500)
        .easing(TWEEN.Easing.Elastic.Out)
        .start();
    }, 250);
  }

  console.log("Score mis à jour:", score);
}

function animate(timestamp, frame) {
  const delta = clock.getDelta();
  if (playerMixer) {
    playerMixer.update(delta);
  }
  TWEEN.update();

  if (scoreGroup) {
    const particles = scoreGroup.children.filter(child =>
      child.geometry && child.geometry.type === 'CircleGeometry');

    particles.forEach(particle => {
      if (particle.userData) {
        const time = performance.now() * 0.001;
        const speed = particle.userData.speed;
        const phase = particle.userData.phase;
        const originalX = particle.userData.originalX;
        const originalY = particle.userData.originalY;

        const pulseFactor = Math.sin(time * speed + phase) * 0.02;
        const orbitSpeed = time * 0.1 + phase;

        const x = originalX * (1 + pulseFactor);
        const y = originalY * (1 + pulseFactor);

        particle.position.x = x * Math.cos(orbitSpeed) - y * Math.sin(orbitSpeed);
        particle.position.y = x * Math.sin(orbitSpeed) + y * Math.cos(orbitSpeed);

        particle.material.opacity = 0.6 + Math.sin(time * 2 + phase) * 0.2;
      }
    });
  }

  const isPresenting = renderer.xr.isPresenting;

  if (scoreGroup && camera) {
    if (isPresenting) {
      const distance = 1;

      const matrix = new THREE.Matrix4();
      matrix.makeTranslation(-0.1, 0.6, -distance);

      const camMatrix = camera.matrixWorld.clone();

      matrix.multiplyMatrices(camMatrix, matrix);

      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      matrix.decompose(position, quaternion, scale);

      scoreGroup.position.copy(position);
      scoreGroup.quaternion.copy(quaternion);

      scoreGroup.visible = true;
    } else {
      const hudDistance = 0.5;

      scoreGroup.position.set(-0.1, 0.6, -hudDistance);

      scoreGroup.quaternion.copy(camera.quaternion);

      scoreGroup.visible = true;
    }
  }

  if (player && shadowMesh) {
    shadowMesh.position.x = player.position.x;
    shadowMesh.position.z = player.position.z;
    shadowMesh.position.y = player.position.y;
  }

  if (player && treesGroup && treesGroup.children) {
    const playerBox = new THREE.Box3().setFromObject(player);

    for (let i = treesGroup.children.length - 1; i >= 0; i--) {
      const tree = treesGroup.children[i];

      if (!tree || tree.userData.isCollecting) continue;

      const treeBox = new THREE.Box3().setFromObject(tree);
      if (playerBox.intersectsBox(treeBox)) {
        tree.userData.isCollecting = true;

        score++;
        console.log("Collision détectée ! Score :", score);
        updateScoreDisplay();

        const flashElement = document.createElement('div');
        flashElement.style.position = 'fixed';
        flashElement.style.top = '0';
        flashElement.style.left = '0';
        flashElement.style.width = '100%';
        flashElement.style.height = '100%';
        flashElement.style.backgroundColor = 'rgba(255, 215, 0, 0.3)';
        flashElement.style.zIndex = '9998';
        flashElement.style.pointerEvents = 'none';
        document.body.appendChild(flashElement);

        setTimeout(() => {
          document.body.removeChild(flashElement);
        }, 300);

        Model.fadeOutTree(tree, (tree) => {
          const gridSize = Math.ceil(Math.sqrt(treesGroup.children.length));
          const spacing = 2;
          const offset = (gridSize * spacing) / 2;

          const bounds = {
            minX: -offset,
            maxX: offset,
            minZ: -offset,
            maxZ: offset,
            y: tree.position.y
          };

          Model.relocateTree(tree, bounds);

          const originalScale = new THREE.Vector3(
            tree.userData.originalScale.x,
            tree.userData.originalScale.y,
            tree.userData.originalScale.z
          );

          Model.fadeInTree(tree, originalScale);

          setTimeout(() => {
            tree.userData.isCollecting = false;
          }, 500);
        });

        break;
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