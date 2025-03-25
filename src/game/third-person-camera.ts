import * as THREE from 'three';
import * as entity from '../base/entity';
import * as passes from '../base/passes';
import * as terrain_component from '../base/render/terrain-component';

interface CameraParams {
  camera: THREE.Camera;
  [key: string]: any;
}

export const third_person_camera = (() => {
  
  class ThirdPersonCamera extends entity.Component {
    static CLASS_NAME = 'ThirdPersonCamera';

    get NAME(): string {
      return ThirdPersonCamera.CLASS_NAME;
    }

    private params_: CameraParams;
    private camera_: THREE.Camera;
    private currentPosition_: THREE.Vector3;
    private currentLookat_: THREE.Vector3;

    constructor(params: CameraParams) {
      super();

      this.params_ = params;
      this.camera_ = params.camera;

      this.currentPosition_ = new THREE.Vector3();
      this.currentLookat_ = new THREE.Vector3();
    }

    InitEntity(): void {
      this.SetPass(passes.Passes.CAMERA);
    }

    CalculateIdealOffset_(): THREE.Vector3 {
      const idealOffset = new THREE.Vector3(0, 0.5, -8);
      // idealOffset.multiplyScalar(10.0);
      if (this.Parent) {
        idealOffset.applyQuaternion(this.Parent.Quaternion);
        idealOffset.add(this.Parent.Position);
      }

      // idealOffset.y = Math.min(idealOffset.y, height + 1.5);
      // idealOffset.y += (this.Parent.Position.y - 1.5 + height);

      return idealOffset;
    }

    CalculateIdealLookat_(): THREE.Vector3 {
      const idealLookat = new THREE.Vector3(0, 1.25, 4);
      if (this.Parent) {
        idealLookat.applyQuaternion(this.Parent.Quaternion);
        idealLookat.add(this.Parent.Position);
      }
      return idealLookat;
    }

    Update(timeElapsed: number): void {
      const terrain = this.FindEntity('terrain');
      if (terrain) {
        const terrainComponent = terrain.GetComponent(terrain_component.TerrainComponent.CLASS_NAME);
        if (!terrainComponent || !(terrainComponent as any).IsReady()) {
          return;
        }

        const idealOffset = this.CalculateIdealOffset_();
        const idealLookat = this.CalculateIdealLookat_();
  
        const height = (terrainComponent as any).GetHeight(idealOffset.x, idealOffset.z);
        idealOffset.y = height + 4.25;

        // const t = 0.05;
        // const t = 4.0 * timeElapsed;
        const t = 1.0 - Math.pow(0.0001, timeElapsed);
  
        this.currentPosition_.lerp(idealOffset, t);
        this.currentLookat_.lerp(idealLookat, t);
  
        this.camera_.position.copy(this.currentPosition_);
        if (this.camera_ instanceof THREE.PerspectiveCamera || this.camera_ instanceof THREE.OrthographicCamera) {
          this.camera_.lookAt(this.currentLookat_);
        }
      }
    }
  }

  return {
    ThirdPersonCamera: ThirdPersonCamera
  };

})(); 
