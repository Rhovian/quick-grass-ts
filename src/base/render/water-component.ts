import {THREE} from '../three-defs';
import * as shaders from '../../game/render/shaders';
import * as entity from "../entity";

class InstancedFloat16BufferAttribute extends THREE.InstancedBufferAttribute {
  isFloat16BufferAttribute: boolean;

  constructor(array: ArrayLike<number>, itemSize: number, normalized?: boolean, meshPerAttribute: number = 1) {
    super(new Uint16Array(array), itemSize, normalized, meshPerAttribute);
    this.isFloat16BufferAttribute = true;
  }
}

const NUM_BUGS = 6;
const NUM_SEGMENTS = 2;
const NUM_VERTICES = (NUM_SEGMENTS + 1) * 2;
const BUG_SPAWN_RANGE = 40.0;
const BUG_MAX_DIST = 100.0;

const M_TMP = new THREE.Matrix4();
const AABB_TMP = new THREE.Box3();

export interface WaterComponentParams {
  // Add any required parameters here
}

export class WaterComponent extends entity.Component {
  static CLASS_NAME = 'WaterComponent';

  get NAME(): string {
    return WaterComponent.CLASS_NAME;
  }

  #params_: WaterComponentParams;
  #mesh_: THREE.Mesh;
  #group_: THREE.Group;
  #totalTime_: number;
  #material_: shaders.GameMaterial;
  #geometry_: THREE.BufferGeometry | null;

  constructor(params: WaterComponentParams) {
    super();

    this.#params_ = params;
    this.#mesh_ = null as unknown as THREE.Mesh; // Will be initialized in InitEntity
    this.#group_ = new THREE.Group();
    this.#totalTime_ = 0;
    this.#geometry_ = null;
    this.#material_ = null as unknown as shaders.GameMaterial; // Will be initialized in InitEntity
  }

  Destroy(): void {
    this.#mesh_.removeFromParent();
    this.#group_.removeFromParent();
  }

  #CreateGeometry_(): THREE.BufferGeometry {
    const plane = new THREE.PlaneGeometry(2000, 2000, 1, 1);
    plane.rotateX(-Math.PI / 2);
    return plane;
  }

  InitEntity(): void {
    const threejs = this.FindEntity('threejs')?.GetComponent('ThreeJSController') as any;
    if (!threejs) return;

    this.#geometry_ = this.#CreateGeometry_();
    this.#material_ = new shaders.GameMaterial('WATER');
    (this.#material_ as any).depthWrite = false;
    (this.#material_ as any).depthTest = true;
    this.#mesh_ = this.#CreateMesh_();
    this.#mesh_.position.y = -14.0;

    this.#group_.add(this.#mesh_);

    (threejs as any).AddSceneObject(this.#group_, { pass: 'water' });
  }

  #CreateMesh_(): THREE.Mesh {
    if (!this.#geometry_ || !this.#material_) {
      throw new Error('Geometry or material not initialized');
    }
    
    const m = new THREE.Mesh(this.#geometry_, this.#material_);
    m.receiveShadow = true;
    m.castShadow = false;
    m.visible = true;

    return m;
  }

  Update(timeElapsed: number): void {
    const threejs = this.FindEntity('threejs')?.GetComponent('ThreeJSController') as any;
    if (!threejs || !this.#material_) return;

    this.#totalTime_ += timeElapsed;

    this.#material_.setFloat('time', this.#totalTime_);
    this.#material_.setVec2('resolution', new THREE.Vector2(window.innerWidth, window.innerHeight));
    this.#material_.setTexture('colourTexture', threejs.WaterTexture);
    
    const camera = threejs.Camera;
    if (camera) {
      this.#material_.setMatrix('inverseProjectMatrix', camera.projectionMatrixInverse);
    }
  }
} 
