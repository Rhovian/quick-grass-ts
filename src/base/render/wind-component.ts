import {THREE} from '../three-defs';

import * as shaders from '../../game/render/shaders';

import * as entity from "../entity";

import * as terrain_component from './terrain-component';
import MersenneTwister from 'mersenne-twister';

const NUM_BUGS = 8;
const BUG_SPAWN_RANGE = 20.0;
const BUG_MAX_DIST = 50.0;

const M_TMP = new THREE.Matrix4();
const AABB_TMP = new THREE.Box3();

export interface WindComponentParams {
  terrain: entity.Entity;
  height: number;
  offset: number;
  dims: number;
  heightmap: THREE.Texture;
}

export class WindComponent extends entity.Component {
  static CLASS_NAME = 'WindComponent';

  get NAME(): string {
    return WindComponent.CLASS_NAME;
  }

  #params_: WindComponentParams;
  #meshes_: THREE.Mesh[];
  #group_: THREE.Group;
  #totalTime_: number;
  #material_: THREE.ShaderMaterial;
  #geometry_: THREE.InstancedBufferGeometry | null;

  constructor(params: WindComponentParams) {
    super();

    this.#params_ = params;
    this.#meshes_ = [];
    this.#group_ = new THREE.Group();
    this.#totalTime_ = 0;
    this.#geometry_ = null;
    this.#material_ = null as unknown as THREE.ShaderMaterial; // Will be initialized in InitEntity
  }

  Destroy(): void {
    for (let m of this.#meshes_) {
      m.removeFromParent();
    }
    this.#group_.removeFromParent();
  }

  #CreateGeometry_(): THREE.InstancedBufferGeometry {
    const rng = new MersenneTwister(1);

    const offsets = new Float32Array(NUM_BUGS * 3);
    for (let i = 0; i < NUM_BUGS; ++i) {
      offsets[i*3 + 0] = (rng.random() * 2.0 - 1.0) * (BUG_SPAWN_RANGE / 2);
      offsets[i*3 + 1] = rng.random() * 1.0 + 2.0;
      offsets[i*3 + 2] = (rng.random() * 2.0 - 1.0) * (BUG_SPAWN_RANGE / 2);
    }

    const plane = new THREE.PlaneGeometry(1, 1, 1, 1);

    const geo = new THREE.InstancedBufferGeometry();
    geo.instanceCount = NUM_BUGS;
    geo.setAttribute('position', plane.attributes.position);
    geo.setAttribute('uv', plane.attributes.uv);
    geo.setAttribute('normal', plane.attributes.normal);
    geo.setAttribute('offset', new THREE.InstancedBufferAttribute(offsets, 3));
    geo.setIndex(plane.index);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), BUG_SPAWN_RANGE);

    return geo;
  }

  InitEntity(): void {
    const threejs = this.FindEntity('threejs')?.GetComponent('ThreeJSController');
    if (!threejs) return;

    this.#geometry_ = this.#CreateGeometry_();

    const textureLoader = new THREE.TextureLoader();
    const albedo = textureLoader.load('./textures/' + 'dust.png');
    albedo.colorSpace = THREE.SRGBColorSpace;

    this.#material_ = new shaders.ShaderMaterial('WIND', {
      uniforms: {
        time: { value: 0.0 },
        diffuseTexture: { value: albedo },
        dustSize: { value: new THREE.Vector2(0.4, 0.4) },
        heightmap: { value: this.#params_.heightmap },
        heightmapParams: { value: new THREE.Vector3(this.#params_.height, this.#params_.offset, this.#params_.dims) },
      }
    });
    this.#material_.transparent = true;
    this.#material_.side = THREE.DoubleSide;
    this.#material_.depthWrite = false;
    this.#material_.depthTest = true;

    (threejs as any).AddSceneObject(this.#group_, {pass: 'transparent'});
  }

  #CreateMesh_(): THREE.Mesh {
    if (!this.#geometry_ || !this.#material_) {
      throw new Error('Geometry or material not initialized');
    }
    
    const m = new THREE.Mesh(this.#geometry_, this.#material_);
    m.receiveShadow = false;
    m.castShadow = false;
    m.visible = true;

    this.#meshes_.push(m);
    this.#group_.add(m);

    return m;
  }

  Update(timeElapsed: number): void {
    if (!this.#material_) return;

    this.#totalTime_ += timeElapsed;

    this.#material_.uniforms.time.value = this.#totalTime_;

    const threejs = this.FindEntity('threejs')?.GetComponent('ThreeJSController');
    if (!threejs) return;
    
    const camera = (threejs as any).Camera;
    if (!camera) return;
    
    const frustum = new THREE.Frustum().setFromProjectionMatrix(
      M_TMP.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse)
    );

    const meshes = [...this.#meshes_];

    const baseCellPos = camera.position.clone();
    baseCellPos.divideScalar(BUG_SPAWN_RANGE);
    baseCellPos.floor();
    baseCellPos.multiplyScalar(BUG_SPAWN_RANGE);

    // This is dumb and slow
    for (let c of this.#group_.children) {
      c.visible = false;
    }

    const terrain = this.#params_.terrain.GetComponent(terrain_component.TerrainComponent.CLASS_NAME);
    if (!terrain) return;

    const cameraPosXZ = new THREE.Vector3(camera.position.x, 0, camera.position.z);

    for (let x = -3; x < 3; x++) {
      for (let z = -3; z < 3; z++) {
        // Current cell
        const currentCell = new THREE.Vector3(
            baseCellPos.x + x * BUG_SPAWN_RANGE, 0, baseCellPos.z + z * BUG_SPAWN_RANGE);
        currentCell.y = (terrain as any).GetHeight(currentCell.x, currentCell.z);

        AABB_TMP.setFromCenterAndSize(currentCell, new THREE.Vector3(BUG_SPAWN_RANGE, 100, BUG_SPAWN_RANGE));
        const distToCell = AABB_TMP.distanceToPoint(cameraPosXZ);
        if (distToCell > BUG_MAX_DIST) {
          continue;
        }

        if (!frustum.intersectsBox(AABB_TMP)) {
          continue;
        }

        const m = meshes.length > 0 ? meshes.pop() : this.#CreateMesh_();
        m.position.copy(currentCell);
        m.position.y = 0;
        m.visible = true;
      }
    }
  }
} 
