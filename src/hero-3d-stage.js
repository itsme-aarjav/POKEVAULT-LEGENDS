import * as THREE from 'three';

/**
 * POKÉVAULT LEGENDS — Hyper-Realistic Real-Time 3D Hero Stage Engine
 * GPU-accelerated WebGL real-time 3D environment for featured card & protective cover slab.
 */
export class Hero3DStage {
  constructor(containerOrId = 'hero3DStageContainer') {
    this.container = (typeof containerOrId === 'string')
      ? document.getElementById(containerOrId)
      : containerOrId;
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // 3D Objects Group
    this.stageGroup = new THREE.Group();
    this.cardMesh = null;
    this.coverFrontMesh = null;
    this.coverBackMesh = null;
    this.psaLabelMesh = null;
    this.particles = null;

    // Interaction & Animation State
    this.isAutoSpinning = true;
    this.isExploded = false;
    this.isDragging = false;
    this.mousePos = { x: 0, y: 0 };
    this.targetRotation = { x: 0.1, y: -0.3 };
    this.currentRotation = { x: 0.1, y: -0.3 };
    this.explodeProgress = 0; // 0 = closed, 1 = expanded
    this.targetExplode = 0;

    this.initScene();
    this.createLights();
    this.createGradedSlabAndCover();
    this.create3DParticleMatrix();
    this.bindEvents();
    this.animate();
  }

  initScene() {
    this.container.innerHTML = '';
    const width = this.container.clientWidth || 460;
    const height = this.container.clientHeight || 580;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = null; // Transparent background over retro halftone overlay

    // Camera
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 7.2);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
    this.scene.add(this.stageGroup);
  }

  createLights() {
    // Ambient Warm Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(ambientLight);

    // Main Gold Key Light
    const keyLight = new THREE.DirectionalLight(0xfff5cc, 3.2);
    keyLight.position.set(5, 8, 6);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    // Cyan/Blue Rim Spotlight
    const rimLightBlue = new THREE.SpotLight(0x00e5ff, 4.5, 12, Math.PI / 4, 0.5);
    rimLightBlue.position.set(-6, 3, -2);
    this.scene.add(rimLightBlue);

    // Magenta/Red Accent Point Light
    const fillLightMagenta = new THREE.PointLight(0xff0055, 3.5, 10);
    fillLightMagenta.position.set(4, -4, 3);
    this.scene.add(fillLightMagenta);
  }

  createGradedSlabAndCover() {
    const textureLoader = new THREE.TextureLoader();

    // 1. Front Holo Card Texture
    const frontTexture = textureLoader.load('/assets/charizard.png');
    frontTexture.generateMipmaps = true;

    // 2. Procedural Back Card Texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#D32F10';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#FFF056';
    ctx.lineWidth = 12;
    ctx.strokeRect(20, 20, 472, 472);
    ctx.fillStyle = '#FFF056';
    ctx.font = '900 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POKÉVAULT', 256, 230);
    ctx.fillText('LEGENDS', 256, 285);
    ctx.font = 'bold 20px monospace';
    ctx.fillText('★ 1ST EDITION ARCHIVAL ★', 256, 340);
    const backTexture = new THREE.CanvasTexture(canvas);

    // Card Core Box Mesh
    const cardMaterials = [
      new THREE.MeshStandardMaterial({ color: 0x111111 }),
      new THREE.MeshStandardMaterial({ color: 0x111111 }),
      new THREE.MeshStandardMaterial({ color: 0x111111 }),
      new THREE.MeshStandardMaterial({ color: 0x111111 }),
      new THREE.MeshStandardMaterial({ map: frontTexture, roughness: 0.15, metalness: 0.35 }),
      new THREE.MeshStandardMaterial({ map: backTexture, roughness: 0.35 })
    ];

    const cardGeo = new THREE.BoxGeometry(2.35, 3.45, 0.03);
    this.cardMesh = new THREE.Mesh(cardGeo, cardMaterials);
    this.cardMesh.castShadow = true;
    this.stageGroup.add(this.cardMesh);

    // 3. Clear Acrylic Front Cover Case
    const coverMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.38,
      roughness: 0.05,
      transmission: 0.95,
      thickness: 0.6,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      ior: 1.52
    });

    const coverFrontGeo = new THREE.BoxGeometry(2.65, 4.05, 0.07);
    this.coverFrontMesh = new THREE.Mesh(coverFrontGeo, coverMaterial);
    this.coverFrontMesh.position.z = 0.06;
    this.stageGroup.add(this.coverFrontMesh);

    // Clear Acrylic Back Cover Case
    const coverBackGeo = new THREE.BoxGeometry(2.65, 4.05, 0.07);
    this.coverBackMesh = new THREE.Mesh(coverBackGeo, coverMaterial);
    this.coverBackMesh.position.z = -0.06;
    this.stageGroup.add(this.coverBackMesh);

    // 4. PSA 10 GEM MT Header Label Insert
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 512;
    labelCanvas.height = 128;
    const lCtx = labelCanvas.getContext('2d');
    lCtx.fillStyle = '#FFFFFF';
    lCtx.fillRect(0, 0, 512, 128);
    lCtx.strokeStyle = '#D32F10';
    lCtx.lineWidth = 8;
    lCtx.strokeRect(6, 6, 500, 116);
    lCtx.fillStyle = '#000000';
    lCtx.font = 'bold 24px monospace';
    lCtx.fillText('1ST EDITION CHARIZARD #4/102', 20, 45);
    lCtx.font = '900 28px sans-serif';
    lCtx.fillStyle = '#D32F10';
    lCtx.fillText('PSA 10 GEM MT', 300, 85);
    lCtx.fillStyle = '#000000';
    lCtx.font = 'bold 18px monospace';
    lCtx.fillText('CERT: #47318042', 20, 85);

    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    const labelMat = new THREE.MeshBasicMaterial({ map: labelTexture });
    const labelGeo = new THREE.PlaneGeometry(2.45, 0.65);
    this.psaLabelMesh = new THREE.Mesh(labelGeo, labelMat);
    this.psaLabelMesh.position.set(0, 1.48, 0.075);
    this.stageGroup.add(this.psaLabelMesh);
  }

  create3DParticleMatrix() {
    const particleCount = 120;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorPalette = [
      new THREE.Color(0xfff056), // Gold
      new THREE.Color(0xff5500), // Orange/Fire
      new THREE.Color(0x00e5ff)  // Electric Cyan
    ];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;

      const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  bindEvents() {
    const dom = this.renderer.domElement;

    // Drag Orbit Listener
    dom.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.isAutoSpinning = false;
      this.mousePos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.mousePos.x;
        const deltaY = e.clientY - this.mousePos.y;

        this.targetRotation.y += deltaX * 0.008;
        this.targetRotation.x += deltaY * 0.008;

        this.mousePos = { x: e.clientX, y: e.clientY };
      } else {
        // Subtle Mouse Parallax Tilt
        const rect = dom.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          const normX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
          const normY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
          this.targetRotation.y = normX * 0.5;
          this.targetRotation.x = -normY * 0.4;
        }
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Resize Listener
    window.addEventListener('resize', () => {
      if (!this.container || !this.renderer || !this.camera) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  toggleExplodedView() {
    this.isExploded = !this.isExploded;
    this.targetExplode = this.isExploded ? 1 : 0;
    return this.isExploded;
  }

  toggleAutoSpin() {
    this.isAutoSpinning = !this.isAutoSpinning;
    return this.isAutoSpinning;
  }

  focusPsaLabel() {
    this.isAutoSpinning = false;
    this.targetRotation = { x: -0.2, y: 0 };
    this.camera.position.set(0, 1.2, 3.8);
  }

  resetCameraView() {
    this.camera.position.set(0, 0, 7.2);
    this.targetRotation = { x: 0.1, y: -0.3 };
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (!this.renderer || !this.scene || !this.camera) return;

    // Auto-spin rotation
    if (this.isAutoSpinning && !this.isDragging) {
      this.targetRotation.y += 0.008;
    }

    // Damped rotation physics
    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.06;
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.06;

    this.stageGroup.rotation.x = this.currentRotation.x;
    this.stageGroup.rotation.y = this.currentRotation.y;

    // Damped 3D Cover Exploded View Animation
    this.explodeProgress += (this.targetExplode - this.explodeProgress) * 0.08;

    if (this.coverFrontMesh && this.coverBackMesh && this.cardMesh) {
      this.coverFrontMesh.position.z = 0.06 + this.explodeProgress * 0.85;
      this.coverBackMesh.position.z = -0.06 - this.explodeProgress * 0.85;
      this.psaLabelMesh.position.z = 0.075 + this.explodeProgress * 0.86;
      this.cardMesh.position.y = Math.sin(Date.now() * 0.002) * 0.08; // Floating card pulse
    }

    // Rotate 3D particle matrix
    if (this.particles) {
      this.particles.rotation.y += 0.002;
      this.particles.rotation.x += 0.001;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
