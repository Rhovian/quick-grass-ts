import {THREE} from '../../base/three-defs';
import * as entity from "../../base/entity";
import * as shaders from "./shaders";

export class RenderSkyComponent extends entity.Component {
  static CLASS_NAME = 'RenderSkyComponent';
  
  // Private field for the sky mesh
  private sky_: THREE.Mesh | null = null;

  get NAME(): string {
    return RenderSkyComponent.CLASS_NAME;
  }

  constructor() {
    super();
  }

  InitEntity(): void {
    const uniforms = {
      "time": { value: 0.0 },
    };

    const skyGeo = new THREE.SphereGeometry(5000, 32, 15);
    const skyMat = new shaders.ShaderMaterial('SKY', {
        uniforms: uniforms,
        side: THREE.BackSide
    });

    this.sky_ = new THREE.Mesh(skyGeo, skyMat);
    this.sky_.castShadow = false;
    this.sky_.receiveShadow = false;

    const threejs = this.FindEntity('threejs')?.GetComponent('ThreeJSController');
    if (threejs) {
      (threejs as any).AddSceneObject(this.sky_);
    }
  }

  Update(timeElapsed: number): void {
    const player = this.FindEntity('player');
    if (!player) {
      return;
    }
    const pos = player.Position;

    if (this.sky_) {
      (this.sky_.material as any).uniforms.time.value += timeElapsed;
    }

    this.sky_?.position.copy(pos);
  }
} 
