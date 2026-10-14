import * as THREE from 'three';

/**
 * 3D Card Viewer & Interactive WebGL Shader Engine
 */
export class ThreeCardViewer {
  constructor() {
    this.modalScene = null;
    this.modalCamera = null;
    this.modalRenderer = null;
    this.cardMesh = null;
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.targetRotation = { x: 0, y: 0 };
    this.currentRotation = { x: 0, y: 0 };
    this.animationFrameId = null;
    
    this.initCardTilts();
  }

  /**
   * Initializes 3D Mouse Tilt & Holographic Sheen on standard DOM cards
   */
  initCardTilts() {
    document.addEventListener('mousemove', (e) => {
      const tiltElements = document.querySelectorAll('.slab-container-3d, .hero-card-stage');
      
      tiltElements.forEach((container) => {
        const rect = container.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          
          const rotateX = ((y - centerY) / centerY) * -18;
          const rotateY = ((x - centerX) / centerX) * 18;
          
          const inner = container.querySelector('.slab-card-inner, .hero-card-3d');
          const sheen = container.querySelector('.slab-holo-sheen, .hero-card-glare');
          
          if (inner) {
            inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.04)`;
          }
          
          if (sheen) {
            const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
            sheen.style.background = `linear-gradient(${angle + 90}deg, transparent 20%, rgba(255,255,255,0.6) 45%, rgba(255, 0, 150, 0.4) 55%, transparent 80%)`;
            sheen.style.opacity = '1';
          }
        }
      });
    });

    document.addEventListener('mouseleave', () => {
      const inners = document.querySelectorAll('.slab-card-inner, .hero-card-3d');
      const sheens = document.querySelectorAll('.slab-holo-sheen, .hero-card-glare');
      
      inners.forEach(inner => {
        inner.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
      });
      sheens.forEach(sheen => {
        sheen.style.opacity = '0';
      });
    });
  }

  /**
   * Initializes Three.js Canvas Scene in Modal Container
   */
  initModalViewer(canvasContainer, cardData) {
    // Clear any existing renderer
    if (this.modalRenderer) {
      this.modalRenderer.dispose();
      canvasContainer.innerHTML = '';
    }

    const width = canvasContainer.clientWidth || 500;
    const height = canvasContainer.clientHeight || 500;

    // Scene
    this.modalScene = new THREE.Scene();
    this.modalScene.background = new THREE.Color(0x111115);

    // Camera
    this.modalCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.modalCamera.position.z = 6.5;

    // Renderer
    this.modalRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.modalRenderer.setSize(width, height);
    this.modalRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.modalRenderer.shadowMap.enabled = true;
    canvasContainer.appendChild(this.modalRenderer.domElement);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.modalScene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfff0aa, 2.5);
    mainLight.position.set(5, 5, 5);
    this.modalScene.add(mainLight);

    const blueRimLight = new THREE.PointLight(0x00ccff, 3, 10);
    blueRimLight.position.set(-4, -2, -3);
    this.modalScene.add(blueRimLight);

    const redRimLight = new THREE.PointLight(0xff3300, 3, 10);
    redRimLight.position.set(4, 3, 3);
    this.modalScene.add(redRimLight);

    // Create 3D Card Geometry
    this.createCardGeometry(cardData.image);

    // Controls & Drag Listeners
    this.setupModalControls(this.modalRenderer.domElement);

    // Render loop
    const animate = () => {
      if (!this.modalRenderer || !this.modalScene || !this.modalCamera) {
        return;
      }

      this.animationFrameId = requestAnimationFrame(animate);

      if (this.cardMesh) {
        // Smooth dampening rotation
        this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.08;
        this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.08;

        this.cardMesh.rotation.x = this.currentRotation.x;
        this.cardMesh.rotation.y = this.currentRotation.y;
      }

      this.modalRenderer.render(this.modalScene, this.modalCamera);
    };

    animate();
  }

  createCardGeometry(imagePath) {
    const textureLoader = new THREE.TextureLoader();
    
    // Front card texture
    const frontTexture = textureLoader.load(imagePath);
    
    // Back card texture (Generated procedural gradient canvas)
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#D32F10';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#FFF056';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POKÉVAULT', 256, 230);
    ctx.fillText('LEGENDS', 256, 280);
    
    const backTexture = new THREE.CanvasTexture(canvas);

    // Materials
    const materials = [
      new THREE.MeshStandardMaterial({ color: 0x222222 }), // right
      new THREE.MeshStandardMaterial({ color: 0x222222 }), // left
      new THREE.MeshStandardMaterial({ color: 0x222222 }), // top
      new THREE.MeshStandardMaterial({ color: 0x222222 }), // bottom
      new THREE.MeshStandardMaterial({ map: frontTexture, roughness: 0.2, metalness: 0.3 }), // front
      new THREE.MeshStandardMaterial({ map: backTexture, roughness: 0.4 }) // back
    ];

    const cardGroup = new THREE.Group();

    // Inner Card
    const cardGeometry = new THREE.BoxGeometry(2.4, 3.5, 0.04);
    const cardMesh = new THREE.Mesh(cardGeometry, materials);
    cardGroup.add(cardMesh);

    // Acrylic Slab Case (Transparent Outer Box)
    const slabGeometry = new THREE.BoxGeometry(2.65, 4.0, 0.14);
    const slabMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      transmission: 0.9,
      thickness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });

    const slabMesh = new THREE.Mesh(slabGeometry, slabMaterial);
    cardGroup.add(slabMesh);

    this.cardMesh = cardGroup;
    this.modalScene.add(this.cardMesh);
  }

  setupModalControls(domElement) {
    domElement.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    domElement.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.targetRotation.y += deltaX * 0.012;
      this.targetRotation.x += deltaY * 0.012;

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Reset card view on double click
    domElement.addEventListener('dblclick', () => {
      this.targetRotation = { x: 0, y: Math.PI * 2 };
    });
  }

  destroyModalViewer() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.modalRenderer) {
      this.modalRenderer.dispose();
      this.modalRenderer = null;
    }
    this.modalScene = null;
    this.modalCamera = null;
    this.cardMesh = null;
  }
}

