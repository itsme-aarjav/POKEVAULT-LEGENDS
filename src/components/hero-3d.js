/**
 * POKÉVAULT LEGENDS — High-Performance 3D WebGL Holographic Slab Engine (Three.js)
 * Features realistic acrylic glass refraction, authentic card textures, PSA header label,
 * and smooth interactive physics.
 */

import * as THREE from 'three';

export class Hero3DSlab {
  constructor(canvasContainerId, initialCardKey = 'charizard') {
    this.container = document.getElementById(canvasContainerId);
    if (!this.container) return;

    this.cardData = {
      charizard: {
        name: "1st Edition Shadowless Charizard #4",
        labelTitle: "1999 POKÉMON GAME",
        labelSub: "1ST EDITION SHADOWLESS #4 CHARIZARD",
        grade: "GEM MT 10",
        cert: "47318042",
        frontImg: "/assets/charizard.png",
        foilColor: 0xff3300,
        lightColor: 0xffaa44
      },
      pikachu: {
        name: "1998 Pikachu Illustrator Trophy",
        labelTitle: "1998 POKÉMON JAPANESE PROMO",
        labelSub: "COROCORO ILLUSTRATOR PIKACHU",
        grade: "MINT 9",
        cert: "99302148",
        frontImg: "/assets/pikachu.png",
        foilColor: 0xffdd00,
        lightColor: 0xffee66
      },
      gengar: {
        name: "1999 Masaki Vending Gengar Holo",
        labelTitle: "1999 POKÉMON JAPANESE VENDING",
        labelSub: "MASAKI MAIL EVOLUTION GENGAR",
        grade: "MINT 9",
        cert: "58921473",
        frontImg: "/assets/gengar.png",
        foilColor: 0xaa22ff,
        lightColor: 0xcc66ff
      }
    };

    this.currentKey = initialCardKey;
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.clock = new THREE.Clock();
    this.isDragging = false;
    this.prevPointerPos = { x: 0, y: 0 };
    this.dragRotation = { x: 0.05, y: -0.15 };
    this.textureLoader = new THREE.TextureLoader();

    this.initScene();
    this.initLights();
    this.buildSlabMesh();
    this.initEvents();
    this.animate();
  }

  initScene() {
    this.scene = new THREE.Scene();

    const w = this.container.clientWidth || 460;
    const h = this.container.clientHeight || 580;

    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    this.camera.position.set(0, 0, 7.2);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Clear any existing canvas
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.cursor = 'grab';
  }

  initLights() {
    // Ambient soft studio light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    this.scene.add(ambientLight);

    // Key directional light for foil gleam & acrylic specular highlights
    this.keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    this.keyLight.position.set(4, 6, 6);
    this.scene.add(this.keyLight);

    // Dynamic rainbow spotlight that follows cursor
    this.spotLight = new THREE.PointLight(0xffeedd, 3.5, 14);
    this.spotLight.position.set(0, 0, 5);
    this.scene.add(this.spotLight);

    // Soft colored rim light from bottom left
    const data = this.cardData[this.currentKey];
    this.rimLight = new THREE.PointLight(data?.lightColor || 0xff9900, 2.8, 10);
    this.rimLight.position.set(-4, -4, 3);
    this.scene.add(this.rimLight);

    // Subtle blue rim light from top right for comic/pulp depth
    const blueRimLight = new THREE.PointLight(0x00ccff, 2.0, 8);
    blueRimLight.position.set(4, -3, -2);
    this.scene.add(blueRimLight);
  }

  createPsaLabelCanvas(data) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 340;
    const ctx = canvas.getContext('2d');

    // Label Red Border & Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 1024, 340);

    ctx.strokeStyle = '#D92626';
    ctx.lineWidth = 16;
    ctx.strokeRect(8, 8, 1008, 324);

    // Inner Red Border Separator
    ctx.strokeStyle = '#D92626';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 984, 300);

    // PSA Text Header
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 36px "Space Mono", monospace, sans-serif';
    ctx.fillText(data.labelTitle, 36, 75);

    ctx.font = 'bold 38px "Inter", sans-serif';
    ctx.fillText(data.labelSub, 36, 140);

    ctx.font = 'bold 34px "Space Mono", monospace, sans-serif';
    ctx.fillText(`CERT #${data.cert}`, 36, 210);

    // Grade Text on Right
    ctx.fillStyle = '#D92626';
    ctx.font = '900 62px "Inter", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(data.grade, 970, 130);

    // PSA Logo Stamp
    ctx.fillStyle = '#000000';
    ctx.font = '900 36px "Inter", sans-serif';
    ctx.fillText('PSA', 970, 210);

    // Security Hologram Line
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(36, 250, 952, 40);
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('★ POKÉVAULT VERIFIED AUTHENTIC REGISTRY LEDGER ★', 512, 278);

    return canvas;
  }

  buildSlabMesh() {
    this.slabGroup = new THREE.Group();
    const data = this.cardData[this.currentKey];

    // =========================================================================
    // 1. INNER CARD MESH (Front & Back Authentic Card)
    // =========================================================================
    const cardWidth = 2.75;
    const cardHeight = 3.4;
    const cardThickness = 0.035;

    // Load Card Front Texture
    const frontTexture = this.textureLoader.load(data.frontImg);
    frontTexture.colorSpace = THREE.SRGBColorSpace;
    frontTexture.generateMipmaps = true;

    // Load Card Back Texture
    const backTexture = this.textureLoader.load('/assets/card_back.png');
    backTexture.colorSpace = THREE.SRGBColorSpace;
    backTexture.generateMipmaps = true;

    // Card Core Box Material (6 sides: Right, Left, Top, Bottom, Front, Back)
    const cardStockEdgeMat = new THREE.MeshStandardMaterial({
      color: 0xE8ECF0,
      roughness: 0.6,
      metalness: 0.1
    });

    const frontCardMat = new THREE.MeshStandardMaterial({
      map: frontTexture,
      roughness: 0.18,
      metalness: 0.22,
      bumpScale: 0.02
    });

    const backCardMat = new THREE.MeshStandardMaterial({
      map: backTexture,
      roughness: 0.35,
      metalness: 0.1
    });

    const cardMaterials = [
      cardStockEdgeMat, // right
      cardStockEdgeMat, // left
      cardStockEdgeMat, // top
      cardStockEdgeMat, // bottom
      frontCardMat,     // front (+Z)
      backCardMat       // back (-Z)
    ];

    const cardGeo = new THREE.BoxGeometry(cardWidth, cardHeight, cardThickness);
    this.cardMesh = new THREE.Mesh(cardGeo, cardMaterials);
    this.cardMesh.position.set(0, -0.55, 0);
    this.cardMesh.castShadow = true;
    this.cardMesh.receiveShadow = true;
    this.cardMesh.renderOrder = 1;
    this.slabGroup.add(this.cardMesh);

    // =========================================================================
    // 2. PSA TOP HEADER LABEL
    // =========================================================================
    const labelCanvas = this.createPsaLabelCanvas(data);
    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    labelTexture.colorSpace = THREE.SRGBColorSpace;

    const labelGeo = new THREE.PlaneGeometry(2.85, 0.95);
    const labelMat = new THREE.MeshBasicMaterial({
      map: labelTexture,
      toneMapped: false,
      side: THREE.DoubleSide
    });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.position.set(0, 1.7, 0.01);
    labelMesh.renderOrder = 2;
    this.slabGroup.add(labelMesh);

    // =========================================================================
    // 3. PSA SLAB INTERNAL FROSTED BORDER / INNER RAILS
    // =========================================================================
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xF1F5F9,
      roughness: 0.4,
      metalness: 0.15,
      transparent: true,
      opacity: 0.65
    });

    // Top Header Inset Box
    const headerBorderGeo = new THREE.BoxGeometry(2.95, 1.05, 0.04);
    const headerBorderMesh = new THREE.Mesh(headerBorderGeo, railMat);
    headerBorderMesh.position.set(0, 1.7, 0);
    headerBorderMesh.renderOrder = 1;
    this.slabGroup.add(headerBorderMesh);

    // Card Window Inset Rail Frame
    const cardBorderGeo = new THREE.BoxGeometry(2.85, 3.5, 0.04);
    const cardBorderMesh = new THREE.Mesh(cardBorderGeo, railMat);
    cardBorderMesh.position.set(0, -0.55, -0.005);
    cardBorderMesh.renderOrder = 1;
    this.slabGroup.add(cardBorderMesh);

    // =========================================================================
    // 4. CRYSTAL CLEAR ACRYLIC CASING (Outer Glass Slab)
    // =========================================================================
    const caseWidth = 3.25;
    const caseHeight = 4.85;
    const caseDepth = 0.18;

    const caseGeo = new THREE.BoxGeometry(caseWidth, caseHeight, caseDepth);
    const caseMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.28,
      roughness: 0.05,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      ior: 1.5,
      depthWrite: false, // Ensures card textures inside are never occluded
      side: THREE.DoubleSide
    });

    this.acrylicCase = new THREE.Mesh(caseGeo, caseMat);
    this.acrylicCase.renderOrder = 10;
    this.slabGroup.add(this.acrylicCase);

    this.scene.add(this.slabGroup);
  }

  switchCard(cardKey) {
    if (!this.cardData[cardKey] || this.currentKey === cardKey) return;
    this.currentKey = cardKey;
    this.scene.remove(this.slabGroup);
    this.buildSlabMesh();

    const data = this.cardData[cardKey];
    if (this.rimLight) {
      this.rimLight.color.setHex(data.lightColor);
    }
  }

  initEvents() {
    // Mouse Move Tilt Tracker
    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) return;
      const rect = this.container.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width - 0.5;
      const normY = (e.clientY - rect.top) / rect.height - 0.5;

      this.mouse.targetX = normX * 0.75;
      this.mouse.targetY = normY * 0.75;
    });

    // Touch / Mobile Gyroscope / Drag
    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.prevPointerPos = { x: e.clientX, y: e.clientY };
      dom.style.cursor = 'grabbing';
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
      dom.style.cursor = 'grab';
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.prevPointerPos.x;
      const deltaY = e.clientY - this.prevPointerPos.y;

      this.dragRotation.y += deltaX * 0.008;
      this.dragRotation.x += deltaY * 0.008;

      this.prevPointerPos = { x: e.clientX, y: e.clientY };
    });

    // Device Orientation / Gyroscope for Mobile
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', (e) => {
        if (e.gamma !== null && e.beta !== null) {
          const tiltX = (e.gamma / 45); // Left/Right Tilt (-1 to 1)
          const tiltY = ((e.beta - 45) / 45); // Front/Back Tilt
          this.mouse.targetX = tiltX * 0.5;
          this.mouse.targetY = tiltY * 0.5;
        }
      }, { passive: true });
    }

    // Window Resize Handler with Aspect-Ratio Containment
    window.addEventListener('resize', () => {
      if (!this.container) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      if (w > 0 && h > 0) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      }
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const elapsedTime = this.clock.getElapsedTime();

    // Smooth Spring Interpolation (LERP)
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.06;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.06;

    if (this.slabGroup) {
      // Gentle Anti-Gravity Floating Oscillation
      const floatY = Math.sin(elapsedTime * 1.8) * 0.08;
      const floatRotZ = Math.sin(elapsedTime * 1.2) * 0.02;

      this.slabGroup.position.y = floatY;

      if (this.isDragging) {
        this.slabGroup.rotation.y = this.dragRotation.y;
        this.slabGroup.rotation.x = this.dragRotation.x;
      } else {
        // Return smoothly to cursor-tracking tilt
        this.slabGroup.rotation.y += (this.mouse.x * 1.1 + this.dragRotation.y - this.slabGroup.rotation.y) * 0.08;
        this.slabGroup.rotation.x += (this.mouse.y * 1.1 + this.dragRotation.x - this.slabGroup.rotation.x) * 0.08;
        this.slabGroup.rotation.z = floatRotZ;

        // Dampen drag rotation over time
        this.dragRotation.x *= 0.96;
        this.dragRotation.y *= 0.96;
      }
    }

    // Update Spotlight Position for Dynamic Sheen Effect
    if (this.spotLight) {
      this.spotLight.position.x = this.mouse.x * 4;
      this.spotLight.position.y = -this.mouse.y * 4 + 1;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
