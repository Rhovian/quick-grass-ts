import {THREE} from '../three-defs';
import * as entity from "../entity";

export interface LightParams {
  hemi?: {
    upColour: THREE.Color;
    downColour: THREE.Color;
    intensity: number;
  };
}

export class LightComponent extends entity.Component {
  static CLASS_NAME = 'LightComponent';

  get NAME(): string {
    return LightComponent.CLASS_NAME;
  }

  #params_: LightParams;
  #light_: THREE.Light | null;
  sky_: THREE.Object3D | null;

  constructor(params: LightParams) {
    super();

    this.#params_ = params;
    this.#light_ = null;
    this.sky_ = null;
  }

  Destroy(): void {
    if (this.#light_) {
      this.#light_.removeFromParent();
    }
  }

  InitEntity(): void {
    const threejs = this.FindEntity('threejs')?.GetComponent('ThreeJSController') as any;
    if (threejs && this.#params_.hemi) {
      const params = this.#params_.hemi;
      this.#light_ = new THREE.HemisphereLight(params.upColour, params.downColour, params.intensity);
      threejs.AddSceneObject(this.#light_);
    }
  }

  Update(timeElapsed: number): void {
    const player = this.FindEntity('player');
    if (!player) {
      return;
    }
    const pos = player.Position;

    if (this.sky_ && (this.sky_.material as any)?.uniforms?.time) {
      (this.sky_.material as any).uniforms.time.value += timeElapsed;
    }

    if (this.sky_) {
      this.sky_.position.copy(pos);
    }
  }
} 
