# XR Tree Capture Game

Repository link: [https://github.com/Antonin22/XR_threeJS](https://github.com/Antonin22/XR_threeJS)

## Play the Game Online

You can play the game directly in your browser or mobile device without installation:

**[Play XR Tree Capture Game](https://antonin22.github.io/XR_threeJS/)**

For the best experience, we recommend using a mobile device with AR capabilities.

## Project Description

An augmented reality (WebXR) game where you explore your environment to capture trees. The project uses Three.js to create an AR experience accessible through a compatible web browser.

### Project Goal

The goal of this project is to create an immersive augmented reality game where the player must capture trees in their real environment. The game particularly emphasizes:

- Visualization and interaction with 3D models in augmented reality
- Tree interpolation management (smooth appearance/disappearance with fluid animations)
- Score system with visual effects
- Real-time collision detection and interactions
- Animation and movement of the user-controlled character

The project also illustrates the implementation of advanced WebXR techniques such as hit-testing to place virtual objects consistently in the real environment.

## User Guide

### Prerequisites
- An AR-compatible mobile device (with ARCore or ARKit support)
- A WebXR-compatible web browser (recent Chrome, Safari, or Firefox)
- Or a WebXR-compatible AR/VR headset

### Installation

1. Clone the repository
   ```
   git clone https://github.com/Antonin22/XR_threeJS.git
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Launch the development server
   ```
   npm run dev
   ```

4. Open the application on your mobile device
   ```
   http://[your-local-ip-address]:5173
   ```

### How to Play

1. When the application starts, grant camera access permissions.
2. Scan your environment by slowly moving your device to allow WebXR to detect surfaces.
3. Once surfaces are detected, you'll see a circle (reticle) appear on the ground.
4. Touch the screen to position your character at the location indicated by the reticle.
5. Trees will appear in your environment.
6. Move towards the trees to capture them - your score will increase with each capture.
7. Trees disappear with a smooth animation and reappear in another location.
8. Continue exploring and capturing as many trees as possible!

### Technical Features

- **Tree Interpolation**: Trees appear and disappear with smooth animations (fade-in/fade-out and resizing)
- **Collision Detection**: Precise detection system between the player and trees
- **3D User Interface**: Score display directly in the AR environment
- **Particle Animations**: Visual effects when capturing a tree
- **Intelligent Movement**: The character first turns towards its destination before moving there

## Technologies Used

- Three.js for 3D rendering
- WebXR for augmented reality functionality
- Tween.js for animations and interpolations
- GLTFLoader for loading 3D models
- Advanced shader techniques and visual effects for the user interface

## Screenshots

![Character navigating in AR environment](/public/IMG_7713.png)
![Character navigating in AR environment](/public/IMG_7712.png)