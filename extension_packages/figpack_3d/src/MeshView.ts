/**
 * MeshView - Custom triangle mesh visualization with per-vertex scalar values
 */

import * as THREE from "three";
import { RenderParams } from "./figpack-interface";

interface MeshConfig {
  colormap: string;
  wireframe: boolean;
  scalarRange: [number, number];
  backgroundColor?: string;
  cameraPosition?: [number, number, number];
  enableControls?: boolean;
}

// Colormap functions
const colormaps: Record<string, (t: number) => THREE.Color> = {
  viridis: (t: number) => {
    // Viridis colormap approximation
    const r = Math.max(0, Math.min(1, 0.267 + t * (0.004 - 0.267)));
    const g = Math.max(0, Math.min(1, 0.005 + t * (0.993 - 0.005)));
    const b = Math.max(0, Math.min(1, 0.329 + t * (0.559 - 0.329)));
    
    // More accurate viridis using polynomial approximation
    const c0 = [0.267004, 0.004874, 0.329415];
    const c1 = [0.127568, 1.564526, -0.896615];
    const c2 = [-0.024924, 0.235793, 3.407040];
    const c3 = [0.433155, -1.707920, -1.616270];
    
    const col = [
      c0[0] + t * (c1[0] + t * (c2[0] + t * c3[0])),
      c0[1] + t * (c1[1] + t * (c2[1] + t * c3[1])),
      c0[2] + t * (c1[2] + t * (c2[2] + t * c3[2])),
    ];
    
    return new THREE.Color(
      Math.max(0, Math.min(1, col[0])),
      Math.max(0, Math.min(1, col[1])),
      Math.max(0, Math.min(1, col[2]))
    );
  },
  
  plasma: (t: number) => {
    // Plasma colormap approximation
    const c0 = [0.050383, 0.029803, 0.527975];
    const c1 = [2.176514, 1.125030, -0.651204];
    const c2 = [-3.086763, -1.447163, 3.817500];
    const c3 = [1.062325, 2.893970, -5.164414];
    
    const col = [
      c0[0] + t * (c1[0] + t * (c2[0] + t * c3[0])),
      c0[1] + t * (c1[1] + t * (c2[1] + t * c3[1])),
      c0[2] + t * (c1[2] + t * (c2[2] + t * c3[2])),
    ];
    
    return new THREE.Color(
      Math.max(0, Math.min(1, col[0])),
      Math.max(0, Math.min(1, col[1])),
      Math.max(0, Math.min(1, col[2]))
    );
  },
  
  jet: (t: number) => {
    // Classic jet colormap
    let r, g, b;
    if (t < 0.125) {
      r = 0;
      g = 0;
      b = 0.5 + 0.5 * (t / 0.125);
    } else if (t < 0.375) {
      r = 0;
      g = (t - 0.125) / 0.25;
      b = 1;
    } else if (t < 0.625) {
      r = (t - 0.375) / 0.25;
      g = 1;
      b = 1 - (t - 0.375) / 0.25;
    } else if (t < 0.875) {
      r = 1;
      g = 1 - (t - 0.625) / 0.25;
      b = 0;
    } else {
      r = 1 - 0.5 * (t - 0.875) / 0.125;
      g = 0;
      b = 0;
    }
    return new THREE.Color(r, g, b);
  },
  
  rainbow: (t: number) => {
    // Rainbow colormap (HSV with varying hue)
    const hue = (1 - t) * 0.7; // 0.7 = 252 degrees (blue to red)
    const color = new THREE.Color();
    color.setHSL(hue, 1, 0.5);
    return color;
  },
};

class MeshScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animationId: number | null = null;
  private config: MeshConfig;
  private container: HTMLElement;
  private mesh: THREE.Mesh | null = null;

  constructor(container: HTMLElement, config: MeshConfig) {
    this.container = container;
    this.config = config;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });

    this.init();
  }

  private init(): void {
    // Set up renderer
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );
    this.renderer.setClearColor(
      this.config.backgroundColor || "#000000"
    );
    this.container.appendChild(this.renderer.domElement);

    // Set up camera
    const [x, y, z] = this.config.cameraPosition || [2, 2, 2];
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);

    // Add lighting - use high ambient light to see vertex colors clearly
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(10, 10, 5);
    this.scene.add(directionalLight);

    // Add mouse controls if enabled
    if (this.config.enableControls !== false) {
      this.addMouseControls();
    }
  }

  private addMouseControls(): void {
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;
    let rotationX = 0;
    let rotationY = 0;

    const onMouseDown = (event: MouseEvent) => {
      isMouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const onMouseUp = () => {
      isMouseDown = false;
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isMouseDown) return;

      const deltaX = event.clientX - mouseX;
      const deltaY = event.clientY - mouseY;

      targetRotationY += deltaX * 0.005;
      targetRotationX += deltaY * 0.005;

      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    this.renderer.domElement.addEventListener("mousedown", onMouseDown);
    this.renderer.domElement.addEventListener("mouseup", onMouseUp);
    this.renderer.domElement.addEventListener("mousemove", onMouseMove);

    // Mouse wheel zoom
    this.renderer.domElement.addEventListener("wheel", (event: WheelEvent) => {
      event.preventDefault();

      const zoomSpeed = 0.1;
      const zoomDirection = event.deltaY > 0 ? 1 : -1;
      const zoomFactor = 1 + zoomDirection * zoomSpeed;

      this.camera.position.multiplyScalar(zoomFactor);

      // Clamp zoom limits
      const distance = this.camera.position.length();
      const minDistance = 0.5;
      const maxDistance = 50;

      if (distance < minDistance) {
        this.camera.position.normalize().multiplyScalar(minDistance);
      } else if (distance > maxDistance) {
        this.camera.position.normalize().multiplyScalar(maxDistance);
      }
    });

    // Store controls for animation
    (this as any).mouseControls = {
      rotationX: () => rotationX,
      rotationY: () => rotationY,
      update: () => {
        rotationX += (targetRotationX - rotationX) * 0.1;
        rotationY += (targetRotationY - rotationY) * 0.1;
      },
    };
  }

  setMeshData(
    vertices: Float32Array,
    faces: Uint32Array,
    scalars: Float32Array
  ): void {
    // Remove existing mesh
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
    }

    // Create buffer geometry
    const geometry = new THREE.BufferGeometry();

    // Set position attribute
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(vertices, 3)
    );

    // Set index attribute (faces)
    geometry.setIndex(new THREE.BufferAttribute(faces, 1));

    // Compute vertex normals for proper lighting
    geometry.computeVertexNormals();

    // Map scalars to colors
    const colors = this.scalarToColors(scalars);
    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3)
    );

    // Create material with vertex colors
    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      wireframe: this.config.wireframe,
      side: THREE.DoubleSide,
    });

    // Create mesh
    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);
  }

  private scalarToColors(scalars: Float32Array): Float32Array {
    const [minVal, maxVal] = this.config.scalarRange;
    const range = maxVal - minVal;
    const colors = new Float32Array(scalars.length * 3);

    const colormapFunc = colormaps[this.config.colormap] || colormaps.viridis;

    for (let i = 0; i < scalars.length; i++) {
      // Normalize scalar to [0, 1]
      const t = range > 0 ? (scalars[i] - minVal) / range : 0.5;
      const clampedT = Math.max(0, Math.min(1, t));

      // Get color from colormap
      const color = colormapFunc(clampedT);

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return colors;
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    // Update mouse controls
    if (this.config.enableControls !== false && (this as any).mouseControls) {
      (this as any).mouseControls.update();
      this.scene.rotation.x = (this as any).mouseControls.rotationX();
      this.scene.rotation.y = (this as any).mouseControls.rotationY();
    }

    this.renderer.render(this.scene, this.camera);
  }

  start(): void {
    if (!this.animationId) {
      this.animate();
    }
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  destroy(): void {
    this.stop();
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
    }
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(
        this.renderer.domElement
      );
    }
    this.renderer.dispose();
  }
}

export const renderMeshView = async (params: RenderParams) => {
  const { container, zarrGroup, width, height, onResize } = params;

  container.innerHTML = "";

  try {
    // Load configuration
    const config: MeshConfig = JSON.parse(zarrGroup.attrs.config || "{}");

    // Load mesh data
    const vertices = await zarrGroup.getDatasetData("vertices", {});
    const faces = await zarrGroup.getDatasetData("faces", {});
    const scalars = await zarrGroup.getDatasetData("scalars", {});

    if (!vertices || !faces || !scalars) {
      throw new Error("Missing mesh data (vertices, faces, or scalars)");
    }

    // Create and configure the mesh scene
    const meshScene = new MeshScene(container, config);
    meshScene.setMeshData(
      new Float32Array(vertices.buffer),
      new Uint32Array(faces.buffer),
      new Float32Array(scalars.buffer)
    );
    meshScene.resize(width, height);
    meshScene.start();

    // Handle resize events
    onResize((newWidth: number, newHeight: number) => {
      meshScene.resize(newWidth, newHeight);
    });

    return {
      destroy: () => {
        meshScene.destroy();
      },
    };
  } catch (error) {
    console.error("Error rendering mesh:", error);
    renderError(container, width, height, (error as Error).message);
    return { destroy: () => {} };
  }
};

const renderError = (
  container: HTMLElement,
  width: number,
  height: number,
  message: string
) => {
  container.innerHTML = `
    <div style="
      width: ${width}px; 
      height: ${height}px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      background-color: #f8f9fa; 
      border: 1px solid #dee2e6; 
      color: #6c757d;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      text-align: center;
      padding: 20px;
      box-sizing: border-box;
    ">
      <div>
        <div style="margin-bottom: 10px; font-weight: 500;">Mesh View Error</div>
        <div style="font-size: 12px;">${message}</div>
      </div>
    </div>
  `;
};
