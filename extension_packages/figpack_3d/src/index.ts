/**
 * figpack_3d Extension - 3D visualization using Three.js
 * Provides interactive 3D scene rendering for figpack
 */

import * as THREE from 'three';

// Declare global types for figpack extension system
declare global {
  interface Window {
    figpackExtensions: Record<string, any>;
  }
}

interface SceneConfig {
  backgroundColor?: string;
  cameraPosition?: [number, number, number];
  enableControls?: boolean;
}

interface SceneData {
  objects: Array<{
    type: 'cube' | 'sphere' | 'cylinder';
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    color?: string;
    wireframe?: boolean;
  }>;
}

class ThreeScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animationId: number | null = null;
  private config: SceneConfig;
  private container: HTMLElement;

  constructor(container: HTMLElement, config: SceneConfig = {}) {
    this.container = container;
    this.config = {
      backgroundColor: '#000000',
      cameraPosition: [5, 5, 5],
      enableControls: true,
      ...config
    };

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
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(this.config.backgroundColor || '#000000');
    this.container.appendChild(this.renderer.domElement);

    // Set up camera
    const [x, y, z] = this.config.cameraPosition || [5, 5, 5];
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);

    // Add basic lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    this.scene.add(directionalLight);

    // Add basic mouse controls
    if (this.config.enableControls) {
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

      targetRotationY += deltaX * 0.01;
      targetRotationX += deltaY * 0.01;

      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    this.renderer.domElement.addEventListener('mousedown', onMouseDown);
    this.renderer.domElement.addEventListener('mouseup', onMouseUp);
    this.renderer.domElement.addEventListener('mousemove', onMouseMove);
    
    // Add mouse wheel zoom
    this.renderer.domElement.addEventListener('wheel', (event: WheelEvent) => {
      event.preventDefault();
      
      const zoomSpeed = 0.1;
      const zoomDirection = event.deltaY > 0 ? 1 : -1;
      const zoomFactor = 1 + (zoomDirection * zoomSpeed);
      
      // Zoom by moving camera closer/farther from the origin
      this.camera.position.multiplyScalar(zoomFactor);
      
      // Clamp zoom to reasonable limits
      const distance = this.camera.position.length();
      const minDistance = 2;
      const maxDistance = 50;
      
      if (distance < minDistance) {
        this.camera.position.normalize().multiplyScalar(minDistance);
      } else if (distance > maxDistance) {
        this.camera.position.normalize().multiplyScalar(maxDistance);
      }
    });

    // Store mouse control state for use in animate method
    (this as any).mouseControls = {
      rotationX: () => rotationX,
      rotationY: () => rotationY,
      update: () => {
        rotationX += (targetRotationX - rotationX) * 0.1;
        rotationY += (targetRotationY - rotationY) * 0.1;
      }
    };
  }

  addSceneData(data: SceneData): void {
    // Clear existing objects (except lights)
    const objectsToRemove = this.scene.children.filter(
      child => !(child instanceof THREE.Light)
    );
    objectsToRemove.forEach(obj => this.scene.remove(obj));

    // Add new objects
    data.objects.forEach(objData => {
      const mesh = this.createMesh(objData);
      if (mesh) {
        this.scene.add(mesh);
      }
    });
  }

  private createMesh(objData: any): THREE.Mesh | null {
    let geometry: THREE.BufferGeometry;
    
    switch (objData.type) {
      case 'cube':
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(0.5, 32, 32);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
        break;
      default:
        console.warn(`Unknown object type: ${objData.type}`);
        return null;
    }

    const material = new THREE.MeshLambertMaterial({
      color: objData.color || '#ffffff',
      wireframe: objData.wireframe || false
    });

    const mesh = new THREE.Mesh(geometry, material);
    
    // Set position
    const [x, y, z] = objData.position;
    mesh.position.set(x, y, z);
    
    // Set rotation if provided
    if (objData.rotation) {
      const [rx, ry, rz] = objData.rotation;
      mesh.rotation.set(rx, ry, rz);
    }
    
    // Set scale if provided
    if (objData.scale) {
      const [sx, sy, sz] = objData.scale;
      mesh.scale.set(sx, sy, sz);
    }

    return mesh;
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    
    // Update mouse controls if enabled
    if (this.config.enableControls && (this as any).mouseControls) {
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
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}

// Register the figpack extension
window.figpackExtensions = window.figpackExtensions || {};

window.figpackExtensions['figpack-3d'] = {
  render: async function(a: {container: HTMLElement, zarrGroup: any, width: number, height: number, onResize: (callback: (width: number, height: number) => void) => void}) {
    const { container, zarrGroup, width, height, onResize } = a;
    container.innerHTML = '';
    
    try {
      // Load scene data and config from zarr
      const sceneData = await this.loadSceneData(zarrGroup);
      const config = JSON.parse(zarrGroup.attrs.config || "{}");
      
      // Debug: log the configuration
      console.log('3D Scene config:', config);
      
      // Create and start the 3D scene
      const threeScene = new ThreeScene(container, config);
      threeScene.addSceneData(sceneData);
      threeScene.resize(width, height);
      threeScene.start();
      
      // Handle resize events
      onResize((newWidth: number, newHeight: number) => {
        threeScene.resize(newWidth, newHeight);
      });
      
      return {
        destroy: () => {
          threeScene.destroy();
        }
      };
      
    } catch (error) {
      console.error('Error rendering 3D scene:', error);
      this.renderError(container, width, height, (error as Error).message);
      return { destroy: () => {} };
    }
  },

  loadSceneData: async function(zarrGroup: any): Promise<SceneData> {
    try {
      // Load the scene data from the zarr group
      const sceneDataBytes = await zarrGroup.file.getDatasetData(
        this.joinPath(zarrGroup.path, 'scene_data'),
        {}
      );
      
      if (!sceneDataBytes || sceneDataBytes.length === 0) {
        return { objects: [] };
      }
      
      // Convert bytes to string and parse JSON
      const jsonString = new TextDecoder('utf-8').decode(sceneDataBytes);
      const sceneData = JSON.parse(jsonString);
      
      // Validate data structure
      if (!sceneData.objects) sceneData.objects = [];
      
      return sceneData;
      
    } catch (error) {
      console.warn('Error loading scene data:', error);
      return { objects: [] };
    }
  },

  renderError: function(container: HTMLElement, width: number, height: number, message: string): void {
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
          <div style="margin-bottom: 10px; font-weight: 500;">3D Scene Error</div>
          <div style="font-size: 12px;">${message}</div>
        </div>
      </div>
    `;
  },

  joinPath: function(p1: string, p2: string): string {
    if (p1.endsWith('/')) p1 = p1.slice(0, -1);
    if (p2.startsWith('/')) p2 = p2.slice(1);
    return p1 + '/' + p2;
  }
};
