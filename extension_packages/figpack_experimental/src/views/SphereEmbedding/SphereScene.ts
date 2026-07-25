import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * Three.js scene wrapper for the SphereEmbedding view: a single indexed
 * triangle mesh with dynamic per-vertex positions and colors, orbit controls,
 * and an optional wireframe overlay sharing the same geometry.
 */
export class SphereScene {
  #scene: THREE.Scene;
  #camera: THREE.PerspectiveCamera;
  #renderer: THREE.WebGLRenderer;
  #controls: OrbitControls;
  #geometry: THREE.BufferGeometry;
  #mesh: THREE.Mesh;
  #wireframeMesh: THREE.Mesh;
  #animationId: number | null = null;
  #defaultCameraState: {
    position: THREE.Vector3;
    target: THREE.Vector3;
  } | null = null;

  constructor(
    container: HTMLElement,
    numVertices: number,
    indices: Uint32Array,
  ) {
    this.#scene = new THREE.Scene();
    this.#scene.background = new THREE.Color("#14161c");

    this.#camera = new THREE.PerspectiveCamera(50, 1, 0.01, 1000);

    this.#renderer = new THREE.WebGLRenderer({ antialias: true });
    this.#renderer.setPixelRatio(window.devicePixelRatio || 1);
    // Let the canvas always fill its container via CSS; resize() then only
    // updates the drawing buffer, so a lagging measurement can never leave a
    // gap between the canvas and the controls
    this.#renderer.domElement.style.width = "100%";
    this.#renderer.domElement.style.height = "100%";
    this.#renderer.domElement.style.display = "block";
    container.appendChild(this.#renderer.domElement);

    // Lighting: ambient plus a headlight attached to the camera so the
    // surface stays lit from the viewing direction as it is rotated
    this.#scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const headlight = new THREE.DirectionalLight(0xffffff, 1.6);
    headlight.position.set(0.5, 0.8, 1);
    this.#camera.add(headlight);
    this.#scene.add(this.#camera);

    this.#geometry = new THREE.BufferGeometry();
    const positionAttr = new THREE.BufferAttribute(
      new Float32Array(numVertices * 3),
      3,
    );
    positionAttr.setUsage(THREE.DynamicDrawUsage);
    const colorAttr = new THREE.BufferAttribute(
      new Float32Array(numVertices * 3),
      3,
    );
    colorAttr.setUsage(THREE.DynamicDrawUsage);
    this.#geometry.setAttribute("position", positionAttr);
    this.#geometry.setAttribute("color", colorAttr);
    this.#geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 25,
      specular: new THREE.Color(0x222222),
    });
    this.#mesh = new THREE.Mesh(this.#geometry, material);
    this.#scene.add(this.#mesh);

    const wireframeMaterial = new THREE.MeshBasicMaterial({
      wireframe: true,
      color: 0x000000,
      transparent: true,
      opacity: 0.25,
    });
    this.#wireframeMesh = new THREE.Mesh(this.#geometry, wireframeMaterial);
    this.#wireframeMesh.visible = false;
    // Render the wireframe slightly "in front" to avoid z-fighting
    wireframeMaterial.polygonOffset = true;
    wireframeMaterial.polygonOffsetFactor = -1;
    wireframeMaterial.polygonOffsetUnits = -1;
    this.#scene.add(this.#wireframeMesh);

    this.#controls = new OrbitControls(this.#camera, this.#renderer.domElement);
    this.#controls.enableDamping = true;
    this.#controls.dampingFactor = 0.1;

    this.#animate();
  }

  #animate = () => {
    this.#animationId = requestAnimationFrame(this.#animate);
    this.#controls.update();
    this.#renderer.render(this.#scene, this.#camera);
  };

  updatePositions(positions: Float32Array): void {
    const attr = this.#geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    (attr.array as Float32Array).set(positions);
    attr.needsUpdate = true;
    this.#geometry.computeVertexNormals();
    this.#geometry.computeBoundingSphere();
  }

  updateColors(colors: Float32Array): void {
    const attr = this.#geometry.getAttribute("color") as THREE.BufferAttribute;
    (attr.array as Float32Array).set(colors);
    attr.needsUpdate = true;
  }

  setWireframe(visible: boolean): void {
    this.#wireframeMesh.visible = visible;
  }

  /**
   * Position the camera to comfortably frame the current geometry.
   * Called once after the first frame is loaded, and by "Reset view".
   */
  fitCamera(): void {
    this.#geometry.computeBoundingSphere();
    const bs = this.#geometry.boundingSphere;
    if (!bs) return;
    const radius = Math.max(bs.radius, 1e-6);
    const distance = radius * 2.6;
    this.#controls.target.copy(bs.center);
    this.#camera.position.set(
      bs.center.x + distance * 0.55,
      bs.center.y + distance * 0.35,
      bs.center.z + distance * 0.75,
    );
    this.#camera.near = radius * 0.01;
    this.#camera.far = radius * 100;
    this.#camera.updateProjectionMatrix();
    this.#controls.update();
    this.#defaultCameraState = {
      position: this.#camera.position.clone(),
      target: this.#controls.target.clone(),
    };
  }

  resetCamera(): void {
    if (this.#defaultCameraState) {
      this.#camera.position.copy(this.#defaultCameraState.position);
      this.#controls.target.copy(this.#defaultCameraState.target);
      this.#controls.update();
    } else {
      this.fitCamera();
    }
  }

  resize(width: number, height: number): void {
    this.#camera.aspect = width / Math.max(1, height);
    this.#camera.updateProjectionMatrix();
    // updateStyle=false: the canvas keeps its 100%/100% CSS sizing
    this.#renderer.setSize(width, height, false);
  }

  dispose(): void {
    if (this.#animationId !== null) {
      cancelAnimationFrame(this.#animationId);
      this.#animationId = null;
    }
    this.#controls.dispose();
    this.#geometry.dispose();
    (this.#mesh.material as THREE.Material).dispose();
    (this.#wireframeMesh.material as THREE.Material).dispose();
    if (this.#renderer.domElement.parentNode) {
      this.#renderer.domElement.parentNode.removeChild(
        this.#renderer.domElement,
      );
    }
    this.#renderer.dispose();
  }
}
