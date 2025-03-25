import {THREE} from '../three-defs';

import * as shaders from '../../game/render/shaders';

import * as entity from "../entity";

import * as terrain_component from './terrain-component';
import * as math from '../math';

class InstancedFloat16BufferAttribute extends THREE.InstancedBufferAttribute {
  isFloat16BufferAttribute: boolean;

  constructor(array: ArrayLike<number>, itemSize: number, normalized?: boolean, meshPerAttribute: number = 1) {
    super(new Uint16Array(array), itemSize, normalized, meshPerAttribute);
    this.isFloat16BufferAttribute = true;
  }
}

const M_TMP = new THREE.Matrix4();
const S_TMP = new THREE.Sphere();
const AABB_TMP = new THREE.Box3();

const NUM_GRASS = (32 * 32) * 3;
const GRASS_SEGMENTS_LOW = 1;
const GRASS_SEGMENTS_HIGH = 6;
const GRASS_VERTICES_LOW = (GRASS_SEGMENTS_LOW + 1) * 2;
const GRASS_VERTICES_HIGH = (GRASS_SEGMENTS_HIGH + 1) * 2;
const GRASS_LOD_DIST = 15;
const GRASS_MAX_DIST = 100;

const GRASS_PATCH_SIZE = 5 * 2;

const GRASS_WIDTH = 0.1;
const GRASS_HEIGHT = 1.5;

export interface GrassComponentParams {
  terrain: entity.Entity;
  height: number;
  offset: number;
  dims: number;
  heightmap: THREE.Texture;
}

export class GrassComponent extends entity.Component {
  static CLASS_NAME = 'GrassComponent';

  get NAME(): string {
    return GrassComponent.CLASS_NAME;
  }

  #params_: GrassComponentParams;
  #meshesLow_: THREE.Mesh[];
  #meshesHigh_: THREE.Mesh[];
  #group_: THREE.Group;
  #totalTime_: number;
  #grassMaterialLow_: shaders.GameMaterial;
  #grassMaterialHigh_: shaders.GameMaterial;
  #geometryLow_: THREE.InstancedBufferGeometry | null;
  #geometryHigh_: THREE.InstancedBufferGeometry | null;

  constructor(params: GrassComponentParams) {
    super();

    this.#params_ = params;
    this.#meshesLow_ = [];
    this.#meshesHigh_ = [];
    this.#group_ = new THREE.Group();
    this.#group_.name = "GRASS";
    this.#totalTime_ = 0;
    this.#grassMaterialLow_ = null as unknown as shaders.GameMaterial;
    this.#grassMaterialHigh_ = null as unknown as shaders.GameMaterial;
    this.#geometryLow_ = null;
    this.#geometryHigh_ = null;
  }

  Destroy(): void {
    for (let m of this.#meshesLow_) {
      m.removeFromParent();
    }
    for (let m of this.#meshesHigh_) {
      m.removeFromParent();
    }
    this.#group_.removeFromParent();
  }

  #CreateGeometry_(segments: number): THREE.InstancedBufferGeometry {
    math.set_seed(0);

    const VERTICES = (segments + 1) * 2;

    const indices: number[] = [];
    for (let i = 0; i < segments; ++i) {
      const vi = i * 2;
      indices[i*12+0] = vi + 0;
      indices[i*12+1] = vi + 1;
      indices[i*12+2] = vi + 2;

      indices[i*12+3] = vi + 2;
      indices[i*12+4] = vi + 1;
      indices[i*12+5] = vi + 3;

      const fi = VERTICES + vi;
      indices[i*12+6] = fi + 2;
      indices[i*12+7] = fi + 1;
      indices[i*12+8] = fi + 0;

      indices[i*12+9]  = fi + 3;
      indices[i*12+10] = fi + 1;
      indices[i*12+11] = fi + 2;
    }

    const offsets: number[] = [];
    for (let i = 0; i < NUM_GRASS; ++i) {
      offsets.push(math.rand_range(-GRASS_PATCH_SIZE * 0.5, GRASS_PATCH_SIZE * 0.5));
      offsets.push(math.rand_range(-GRASS_PATCH_SIZE * 0.5, GRASS_PATCH_SIZE * 0.5));
      offsets.push(0);
    }

    const offsetsData: number[] = offsets.map(THREE.DataUtils.toHalfFloat);

    const vertID = new Uint8Array(VERTICES*2);
    for (let i = 0; i < VERTICES*2; ++i) {
      vertID[i] = i;
    }

    const geo = new THREE.InstancedBufferGeometry();
    geo.instanceCount = NUM_GRASS;
    geo.setAttribute('vertIndex', new THREE.Uint8BufferAttribute(vertID, 1));
    geo.setAttribute('position', new InstancedFloat16BufferAttribute(offsetsData, 3));
    geo.setIndex(indices);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1 + GRASS_PATCH_SIZE * 2);

    return geo;
  }

  InitEntity(): void {
    const threejs = this.FindEntity('threejs')?.GetComponent('ThreeJSController') as any;
    if (!threejs) return;

    this.#grassMaterialLow_ = new shaders.GameMaterial('GRASS');
    this.#grassMaterialHigh_ = new shaders.GameMaterial('GRASS');
    (this.#grassMaterialLow_ as any).side = THREE.FrontSide;
    (this.#grassMaterialHigh_ as any).side = THREE.FrontSide;

    this.#geometryLow_ = this.#CreateGeometry_(GRASS_SEGMENTS_LOW);
    this.#geometryHigh_ = this.#CreateGeometry_(GRASS_SEGMENTS_HIGH);

    this.#grassMaterialLow_.setVec2('grassSize', new THREE.Vector2(GRASS_WIDTH, GRASS_HEIGHT));
    this.#grassMaterialLow_.setVec4('grassParams', new THREE.Vector4(
        GRASS_SEGMENTS_LOW, GRASS_VERTICES_LOW, this.#params_.height, this.#params_.offset));
    this.#grassMaterialLow_.setVec4('grassDraw', new THREE.Vector4(
        GRASS_LOD_DIST, GRASS_MAX_DIST, 0, 0));
    this.#grassMaterialLow_.setTexture('heightmap', this.#params_.heightmap);
    this.#grassMaterialLow_.setVec4('heightParams', new THREE.Vector4(this.#params_.dims, 0, 0, 0));
    this.#grassMaterialLow_.setVec3('grassLODColour', new THREE.Vector3(0, 0, 1));
    (this.#grassMaterialLow_ as any).alphaTest = 0.5;

    this.#grassMaterialHigh_.setVec2('grassSize', new THREE.Vector2(GRASS_WIDTH, GRASS_HEIGHT));
    this.#grassMaterialHigh_.setVec4('grassParams', new THREE.Vector4(
        GRASS_SEGMENTS_HIGH, GRASS_VERTICES_HIGH, this.#params_.height, this.#params_.offset));
    this.#grassMaterialHigh_.setVec4('grassDraw', new THREE.Vector4(
        GRASS_LOD_DIST, GRASS_MAX_DIST, 0, 0));
    this.#grassMaterialHigh_.setTexture('heightmap', this.#params_.heightmap);
    this.#grassMaterialHigh_.setVec4('heightParams', new THREE.Vector4(this.#params_.dims, 0, 0, 0));
    this.#grassMaterialHigh_.setVec3('grassLODColour', new THREE.Vector3(1, 0, 0));
    (this.#grassMaterialHigh_ as any).alphaTest = 0.5;

    threejs.AddSceneObject(this.#group_);
  }

  #CreateMesh_(distToCell: number): THREE.Mesh | null {
    const meshes = distToCell > GRASS_LOD_DIST ? this.#meshesLow_ : this.#meshesHigh_;
    if (meshes.length > 1000) {
      console.log('crap');
      return null;
    }

    const geo = distToCell > GRASS_LOD_DIST ? this.#geometryLow_ : this.#geometryHigh_;
    const mat = distToCell > GRASS_LOD_DIST ? this.#grassMaterialLow_ : this.#grassMaterialHigh_;

    if (!geo || !mat) {
      return null;
    }

    const m = new THREE.Mesh(geo, mat);
    m.position.set(0, 0, 0);
    m.receiveShadow = true;
    m.castShadow = false;
    m.visible = false;

    meshes.push(m);
    this.#group_.add(m);
    return m;
  }

  Update(timeElapsed: number): void {
    if (!this.#grassMaterialLow_ || !this.#grassMaterialHigh_) return;

    this.#totalTime_ += timeElapsed;

    this.#grassMaterialLow_.setFloat('time', this.#totalTime_);
    this.#grassMaterialHigh_.setFloat('time', this.#totalTime_);

    const threejs = this.FindEntity('threejs')?.GetComponent('ThreeJSController') as any;
    if (!threejs || !threejs.Camera) return;

    const camera = threejs.Camera;
    const frustum = new THREE.Frustum().setFromProjectionMatrix(
      M_TMP.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse)
    );

    const meshesLow = [...this.#meshesLow_];
    const meshesHigh = [...this.#meshesHigh_];

    const baseCellPos = camera.position.clone();
    baseCellPos.divideScalar(GRASS_PATCH_SIZE);
    baseCellPos.floor();
    baseCellPos.multiplyScalar(GRASS_PATCH_SIZE);

    // This is dumb and slow
    for (let c of this.#group_.children) {
      c.visible = false;
    }

    const terrain = this.#params_.terrain.GetComponent(terrain_component.TerrainComponent.CLASS_NAME) as any;
    if (!terrain) return;

    const cameraPosXZ = new THREE.Vector3(camera.position.x, 0, camera.position.z);
    const player = this.FindEntity('player');
    if (!player) return;

    const playerPos = player.Position;

    this.#grassMaterialHigh_.setVec3('playerPos', playerPos);
    this.#grassMaterialHigh_.setMatrix('viewMatrixInverse', camera.matrixWorld);
    this.#grassMaterialLow_.setMatrix('viewMatrixInverse', camera.matrixWorld);

    let totalGrass = 0;
    let totalVerts = 0;

    for (let x = -16; x < 16; x++) {
      for (let z = -16; z < 16; z++) {
        // Current cell
        const currentCell = new THREE.Vector3(
            baseCellPos.x + x * GRASS_PATCH_SIZE, 0, baseCellPos.z + z * GRASS_PATCH_SIZE);
        currentCell.y = terrain.GetHeight(currentCell.x, currentCell.z);

        AABB_TMP.setFromCenterAndSize(currentCell, new THREE.Vector3(GRASS_PATCH_SIZE, 1000, GRASS_PATCH_SIZE));
        const distToCell = AABB_TMP.distanceToPoint(cameraPosXZ);
        if (distToCell > GRASS_MAX_DIST) {
          continue;
        }

        if (!frustum.intersectsBox(AABB_TMP)) {
          continue;
        }

        if (distToCell > GRASS_LOD_DIST) {
          const m = meshesLow.length > 0 ? meshesLow.pop() : this.#CreateMesh_(distToCell);
          if (m) {
            m.position.copy(currentCell);
            m.position.y = 0;
            m.visible = true;
            totalVerts += GRASS_VERTICES_LOW;
          }
        } else {
          const m = meshesHigh.length > 0 ? meshesHigh.pop() : this.#CreateMesh_(distToCell);
          if (m) {
            m.position.copy(currentCell);
            m.position.y = 0;
            m.visible = true;
            totalVerts += GRASS_VERTICES_HIGH;
          }
        }
        totalGrass += 1;
      }
    }

    totalGrass *= NUM_GRASS;
    totalVerts *= NUM_GRASS;
    // console.log('total grass: ' + totalGrass + ' total verts: ' + totalVerts);
  }
} 
