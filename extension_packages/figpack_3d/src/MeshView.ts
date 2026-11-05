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

// Colormaps. Each function returns sRGB components in [0, 1]; srgbColor
// converts them to the linear working color space used for vertex colors,
// so that the rendered colors match the colormap.

// Stops sampled at 17 evenly spaced points from matplotlib's tables
const viridisStops: [number, number, number][] = [
  [0.267, 0.0049, 0.3294], [0.2823, 0.095, 0.4173], [0.2788, 0.1755, 0.4834],
  [0.259, 0.2515, 0.5247], [0.2297, 0.3224, 0.5457], [0.1994, 0.3876, 0.5546],
  [0.1727, 0.4488, 0.5579], [0.149, 0.5081, 0.5573], [0.1276, 0.5669, 0.5506],
  [0.1206, 0.6258, 0.5335], [0.1579, 0.6838, 0.5017], [0.2461, 0.7389, 0.452],
  [0.3692, 0.7889, 0.3829], [0.516, 0.8312, 0.2943], [0.6785, 0.8637, 0.1895],
  [0.8456, 0.8873, 0.0997], [0.9932, 0.9062, 0.1439],
];
const plasmaStops: [number, number, number][] = [
  [0.0504, 0.0298, 0.528], [0.1934, 0.0184, 0.5903], [0.2999, 0.0096, 0.6316],
  [0.3994, 0.0009, 0.6561], [0.4949, 0.012, 0.6579], [0.5844, 0.0686, 0.6328],
  [0.6651, 0.1386, 0.5856], [0.736, 0.2094, 0.5279], [0.7982, 0.2802, 0.4695],
  [0.8533, 0.3516, 0.4137], [0.9018, 0.4251, 0.3597], [0.9426, 0.5026, 0.3058],
  [0.9734, 0.5858, 0.2515], [0.9914, 0.6754, 0.1985], [0.993, 0.7717, 0.1548],
  [0.9744, 0.8746, 0.1441], [0.94, 0.9752, 0.1313],
];

const interpolateStops = (
  stops: [number, number, number][],
  t: number,
): [number, number, number] => {
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(Math.floor(x), stops.length - 2);
  const f = x - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [
    a[0] + f * (b[0] - a[0]),
    a[1] + f * (b[1] - a[1]),
    a[2] + f * (b[2] - a[2]),
  ];
};

const srgbColor = ([r, g, b]: [number, number, number]) =>
  new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

const colormaps: Record<string, (t: number) => THREE.Color> = {
  viridis: (t: number) => srgbColor(interpolateStops(viridisStops, t)),

  plasma: (t: number) => srgbColor(interpolateStops(plasmaStops, t)),

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
      r = 1 - (0.5 * (t - 0.875)) / 0.125;
      g = 0;
      b = 0;
    }
    return srgbColor([r, g, b]);
  },

  rainbow: (t: number) => {
    // Rainbow colormap (HSL with varying hue, blue to red)
    const hue = (1 - t) * 0.7; // 0.7 = 252 degrees
    return new THREE.Color().setHSL(hue, 1, 0.5, THREE.SRGBColorSpace);
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

    // Lighting: mostly ambient, so that the vertex colors are close to the
    // colormap, plus a weaker directional light for shading. Three.js uses
    // physical light units, in which an intensity of PI reproduces the
    // material color on a surface facing the light.
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75 * Math.PI);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.35 * Math.PI);
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
