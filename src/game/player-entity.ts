import * as THREE from 'three';

import * as entity from '../base/entity';
import {player_input} from './player-input';

interface PlayerMessage {
  value: any;
}

interface PlayerParams {
  [key: string]: any;
}

export const player_entity = (() => {

  class BasicCharacterController extends entity.Component {
    static CLASS_NAME = 'BasicCharacterController';

    get NAME(): string {
      return BasicCharacterController.CLASS_NAME;
    }

    private params_: PlayerParams;
    private decceleration_!: THREE.Vector3;
    private acceleration_!: THREE.Vector3;
    private velocity_!: THREE.Vector3;
    private group_!: THREE.Group;
    private rotation_!: THREE.Quaternion;
    private translation_!: THREE.Vector3;
    private animations_!: Record<string, any>;
    private stateMachine_: any;

    constructor(params: PlayerParams) {
      super();
      this.params_ = params;
    }

    InitEntity(): void {
      this.Init_();
    }

    Init_(): void {
      this.decceleration_ = new THREE.Vector3(-0.0005, -0.0001, -5.0);
      this.acceleration_ = new THREE.Vector3(1, 0.125, 20.0);
      this.velocity_ = new THREE.Vector3(0, 0, 0);
      this.group_ = new THREE.Group();

      // let light = new THREE.DirectionalLight(0xFFFFFF, 0.5);
      // light.position.set(-20, 20, 20);
      // light.target.position.set(0, 0, 0);
      // light.intensity = 10;
      // this.group_.add(light);

      const threejs = this.FindEntity('threejs')?.GetComponent('ThreeJSController');
      if (threejs) {
        (threejs as any).AddSceneObject(this.group_, {type: 'player'});
      }

      this.rotation_ = new THREE.Quaternion();
      this.translation_ = new THREE.Vector3(0, 3, 0);

      this.animations_ = {};
  
      this.LoadModels_();
    }

    InitComponent(): void {
      this.RegisterHandler_('health.death', (m) => { this.OnDeath_(m); });
      this.RegisterHandler_(
          'update.position', (m) => { this.OnUpdatePosition_(m); });
      this.RegisterHandler_(
          'update.rotation', (m) => { this.OnUpdateRotation_(m); });
    }

    OnUpdatePosition_(msg: PlayerMessage): void {
      this.group_.position.copy(msg.value);
    }

    OnUpdateRotation_(msg: PlayerMessage): void {
      this.group_.quaternion.copy(msg.value);
    }

    OnDeath_(msg: PlayerMessage): void {
      if (this.stateMachine_) {
        this.stateMachine_.SetState('death');
      }
    }

    LoadModels_(): void {
      // Implementation goes here
    }

    Update(timeInSeconds: number): void {
      const input = this.GetComponent('PlayerInput');
      if (!input) return;
  
      const controlObject = this.group_;
      const _Q = new THREE.Quaternion();
      const _A = new THREE.Vector3();
      const _R = controlObject.quaternion.clone();

      if ((input as any).key(player_input.KEYS.a)) {
        _A.set(0, 1, 0);
        _Q.setFromAxisAngle(_A, 2.0 * Math.PI * timeInSeconds * this.acceleration_.y);
        _R.multiply(_Q);
      }
      if ((input as any).key(player_input.KEYS.d)) {
        _A.set(0, 1, 0);
        _Q.setFromAxisAngle(_A, 2.0 * -Math.PI * timeInSeconds * this.acceleration_.y);
        _R.multiply(_Q);
      }
  
      if (this.Parent) {
        this.Parent.SetQuaternion(_R);
      }
    }
  };
  
  return {
    BasicCharacterController: BasicCharacterController,
  };

})(); 
