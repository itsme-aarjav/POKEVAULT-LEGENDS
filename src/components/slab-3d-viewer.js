/**
 * POKÉVAULT LEGENDS — Product Detail Page 3D Slab Inspection Engine
 * Renders full 360° interactive slab with dynamic holographic shimmer and zoom.
 */

import * as THREE from 'three';

export class Slab3DViewer {
  constructor(containerElement, productData) {
    this.container = containerElement;
    this.product = productData;
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.slabGroup = new THREE.Group();
    this.isDragging = false;
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.dragRotation = { x: 0.1, y: -0.2 };
    this.prevPointer = { x: 0, y: 0 };
    this.clock = new THREE.Clock();

    this.init();
  }

  init() {
    this.container.innerHTML = '';
    const width = this.container.clientWidth || 420;
    const height = this.container.clientHeight || 500;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 7.0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.cursor = 'grab';

    this.setupLights();
    this.buildSlab();
    this.bindControls();
    this.animate();
  }

  setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 2.5);
    dirLight.position.set(4, 6, 5);
    this.scene.add(dirLight);

    this.pointLight = new THREE.PointLight(0xffeedd, 3.0, 10);
    this.pointLight.position.set(0, 0, 4);
    this.scene.add(this.pointLight);
  }

  buildSlab() {
    // 1. Acrylic Case
    const caseGeo = new THREE.BoxGeometry(3.1, 4.6, 0.2);
    const caseMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.32,
      roughness: 0.05,
      transmission: 0.92,
      ior: 1.5,
      thickness: 0.35,
      clearcoat: 1.0
    });
    const acrylicMesh = new THREE.Mesh(caseGeo, caseMat);
    this.slabGroup.add(acrylicMesh);

    // 2. Card Mesh with Texture & Holographic Rainbow Foil
    const textureLoader = new THREE.TextureLoader();
    const cardTexture = textureLoader.load(this.product.image);
    cardTexture.colorSpace = THREE.SRGBColorSpace;

    const cardGeo = new THREE.PlaneGeometry(2.7, 3.8);

    this.foilMat = new THREE.ShaderMaterial({
      uniforms: {
        tCard: { value: cardTexture },
        uTime: { value: 0.0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) }
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
          vec4 tex = texture2D(tCard, vUv);
          vec3 viewDir = normalize(vViewPosition);
          float angle = dot(vNormal, viewDir);

          float wave = sin((vUv.x + vUv.y) * 6.0 + uTime * 1.8 + (uMouse.x * 2.5));
          vec3 foil = rainbow(wave * 0.5 + 0.5);

          float spec = pow(max(0.0, angle), 6.0) * 0.35;
          vec3 col = tex.rgb + (foil * 0.22 * tex.a) + (spec * vec3(1.0, 0.9, 0.6) * 0.2);

          gl_FragColor = vec4(col, tex.a);
        }
      `,
      transparent: true,
      side: THREE.FrontSide
    });

    const cardMesh = new THREE.Mesh(cardGeo, this.foilMat);
    cardMesh.position.set(0, 0, 0.015);
    this.slabGroup.add(cardMesh);

    // 3. Card Back
    const backGeo = new THREE.PlaneGeometry(2.7, 3.8);
    const backMat = new THREE.MeshStandardMaterial({
      color: 0x1a237e,
      roughness: 0.5,
      metalness: 0.2,
      side: THREE.BackSide
    });
    const backMesh = new THREE.Mesh(backGeo, backMat);
    backMesh.position.set(0, 0, -0.015);
    backMesh.rotation.y = Math.PI;
    this.slabGroup.add(backMesh);

    this.scene.add(this.slabGroup);
  }

  bindControls() {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.prevPointer = { x: e.clientX, y: e.clientY };
      dom.style.cursor = 'grabbing';
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
      dom.style.cursor = 'grab';
    });

    window.addEventListener('pointermove', (e) => {
      const rect = dom.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width - 0.5;
      const normY = (e.clientY - rect.top) / rect.height - 0.5;

      this.mouse.targetX = normX;
      this.mouse.targetY = normY;

      if (this.foilMat) {
        this.foilMat.uniforms.uMouse.value.set(normX + 0.5, normY + 0.5);
      }

      if (this.isDragging) {
        const deltaX = e.clientX - this.prevPointer.x;
        const deltaY = e.clientY - this.prevPointer.y;

        this.dragRotation.y += deltaX * 0.008;
        this.dragRotation.x += deltaY * 0.008;

        this.prevPointer = { x: e.clientX, y: e.clientY };
      }
    });

    // Zoom on scroll
    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z + e.deltaY * 0.005, 4.5, 9.5);
    }, { passive: false });

    // Window Resize Handler
    window.addEventListener('resize', () => {
      if (!this.container || !this.renderer || !this.camera) return;
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

    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.08;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.08;

    if (this.slabGroup) {
      if (this.isDragging) {
        this.slabGroup.rotation.y = this.dragRotation.y;
        this.slabGroup.rotation.x = this.dragRotation.x;
      } else {
        this.slabGroup.rotation.y += (this.mouse.x * 0.8 + this.dragRotation.y - this.slabGroup.rotation.y) * 0.08;
        this.slabGroup.rotation.x += (this.mouse.y * 0.8 + this.dragRotation.x - this.slabGroup.rotation.x) * 0.08;
        this.dragRotation.x *= 0.96;
        this.dragRotation.y *= 0.96;
      }

      this.slabGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.05;
    }

    if (this.foilMat) {
      this.foilMat.uniforms.uTime.value = elapsedTime;
    }

    if (this.pointLight) {
      this.pointLight.position.x = this.mouse.x * 4;
      this.pointLight.position.y = -this.mouse.y * 4 + 1;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
