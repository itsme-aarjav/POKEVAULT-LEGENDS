/**
 * POKÉVAULT LEGENDS — High-Performance 3D WebGL Holographic Slab Engine (Three.js)
 * Features realistic acrylic glass refraction, custom rainbow foil shader, and smooth mouse/touch physics.
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
    this.dragRotation = { x: 0, y: 0 };

    this.initScene();
    this.buildSlabMesh();
    this.initLights();
    this.initEvents();
    this.animate();
  }

  initScene() {
    this.scene = new THREE.Scene();

    const w = this.container.clientWidth || 450;
    const h = this.container.clientHeight || 550;

    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    // Key directional light for foil gleam
    this.keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    this.keyLight.position.set(3, 5, 5);
    this.scene.add(this.keyLight);

    // Dynamic rainbow spotlight that follows cursor
    this.spotLight = new THREE.PointLight(0xffeedd, 3.5, 12);
    this.spotLight.position.set(0, 0, 4);
    this.scene.add(this.spotLight);

    // Soft colored rim light from bottom
    this.rimLight = new THREE.PointLight(0xff9900, 2.0, 8);
    this.rimLight.position.set(-3, -4, 2);
    this.scene.add(this.rimLight);
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

    // --- 1. ACRYLIC CASE (Transparent Polycarbonate) ---
    const caseWidth = 3.2;
    const caseHeight = 4.8;
    const caseDepth = 0.22;

    const caseGeo = new THREE.BoxGeometry(caseWidth, caseHeight, caseDepth, 4, 4, 4);
    const caseMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.9,
      ior: 1.52, // Optical acrylic refraction index
      thickness: 0.4,
      specularIntensity: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05
    });

    this.acrylicCase = new THREE.Mesh(caseGeo, caseMat);
    this.slabGroup.add(this.acrylicCase);

    // --- 2. PSA TOP LABEL ---
    const labelCanvas = this.createPsaLabelCanvas(data);
    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    labelTexture.colorSpace = THREE.SRGBColorSpace;

    const labelGeo = new THREE.PlaneGeometry(2.85, 0.95);
    const labelMat = new THREE.MeshBasicMaterial({
      map: labelTexture,
      toneMapped: false
    });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.position.set(0, 1.7, 0.015);
    this.slabGroup.add(labelMesh);

    // --- 3. INNER CARD MESH WITH HOLOGRAPHIC FOIL ---
    const textureLoader = new THREE.TextureLoader();
    const cardTexture = textureLoader.load(data.frontImg);
    cardTexture.colorSpace = THREE.SRGBColorSpace;

    const cardGeo = new THREE.PlaneGeometry(2.75, 3.4);
    
    // Custom Holographic Foil Shader Material
    this.foilMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tCard: { value: cardTexture },
        uTime: { value: 0.0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uFoilColor: { value: new THREE.Color(data.foilColor) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D tCard;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform vec3 uFoilColor;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        vec3 rainbow(float t) {
          vec3 a = vec3(0.5, 0.5, 0.5);
          vec3 b = vec3(0.5, 0.5, 0.5);
          vec3 c = vec3(1.0, 1.0, 1.0);
          vec3 d = vec3(0.0, 0.33, 0.67);
          return a + b * cos(6.28318 * (c * t + d));
        }

        void main() {
          vec4 cardColor = texture2D(tCard, vUv);
          vec3 viewDir = normalize(vViewPosition);
          float angle = dot(vNormal, viewDir);

          // Rainbow Iridescent Gradient calculation
          float foilWave = sin((vUv.x + vUv.y) * 8.0 + uTime * 1.5 + (uMouse.x * 2.0));
          vec3 rainbowFoil = rainbow(foilWave * 0.5 + 0.5);

          // Specular shimmer reflection
          float spec = pow(max(0.0, angle), 8.0) * 0.45;
          vec3 finalColor = cardColor.rgb + (rainbowFoil * 0.28 * cardColor.a) + (spec * uFoilColor * 0.25);

          gl_FragColor = vec4(finalColor, cardColor.a);
        }
      `,
      transparent: true,
      side: THREE.FrontSide
    });

    this.cardMesh = new THREE.Mesh(cardGeo, this.foilMaterial);
    this.cardMesh.position.set(0, -0.55, 0.012);
    this.slabGroup.add(this.cardMesh);

    // --- 4. BACK OF CARD (Pocket Monsters Card Back) ---
    const backTexture = textureLoader.load('/assets/pokeball-emoji.png');
    const backGeo = new THREE.PlaneGeometry(2.75, 3.4);
    const backMat = new THREE.MeshStandardMaterial({
      color: 0x1a237e,
      roughness: 0.6,
      metalness: 0.2,
      side: THREE.BackSide
    });
    const backMesh = new THREE.Mesh(backGeo, backMat);
    backMesh.position.set(0, -0.55, -0.012);
    backMesh.rotation.y = Math.PI;
    this.slabGroup.add(backMesh);

    this.scene.add(this.slabGroup);
  }

  switchCard(cardKey) {
    if (!this.cardData[cardKey] || this.currentKey === cardKey) return;
    this.currentKey = cardKey;
    this.scene.remove(this.slabGroup);
    this.buildSlabMesh();

    const data = this.cardData[cardKey];
    this.rimLight.color.setHex(data.lightColor);
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

      if (this.foilMaterial) {
        this.foilMaterial.uniforms.uMouse.value.set(normX + 0.5, normY + 0.5);
      }
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

    // Window Resize Handler with Perfect Aspect-Ratio Containment
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
        this.dragRotation.x *= 0.95;
        this.dragRotation.y *= 0.95;
      }
    }

    // Update Spotlight and Shader Uniforms
    if (this.spotLight) {
      this.spotLight.position.x = this.mouse.x * 4;
      this.spotLight.position.y = -this.mouse.y * 4 + 1;
    }

    if (this.foilMaterial) {
      this.foilMaterial.uniforms.uTime.value = elapsedTime;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
