import {THREE} from './three-defs';
import * as entity from './entity';
import {ThreeJSController} from './threejs-component';
import {load_controller} from './load-controller';

export interface RenderComponentParams {
  resourcePath: string;
  resourceName: string;
  scale: THREE.Vector3;
  offset?: {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
  };
  textures?: {
    resourcePath: string;
    names: Record<string, string>;
    wrap?: boolean;
  };
  receiveShadow?: boolean;
  castShadow?: boolean;
  visible?: boolean;
  specular?: THREE.Color;
  emissive?: THREE.Color;
  colour?: THREE.Color;
  onMaterial?: (material: THREE.Material) => void;
}

interface Message {
  topic: string;
  value?: any;
  offset?: any;
}

export class RenderComponent extends entity.Component {
  static CLASS_NAME = 'RenderComponent';
  private group_: THREE.Group;
  private target_: THREE.Object3D | null;
  private offset_: {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
  } | null;
  private params_: RenderComponentParams;

  get NAME(): string {
    return RenderComponent.CLASS_NAME;
  }

  constructor(params: RenderComponentParams) {
    super();
    this.group_ = new THREE.Group();
    this.target_ = null;
    this.offset_ = null;
    this.params_ = params;
  }

  Destroy(): void {
    this.group_.traverse((c: any) => {
      if (c.material) {
        c.material.dispose();
      }
      if (c.geometry) {
        c.geometry.dispose();
      }
    });
    this.group_.removeFromParent();
  }

  InitEntity(): void {
    const threejs = this.FindEntity('threejs')?.GetComponent('ThreeJSController') as ThreeJSController;
    if (threejs) {
      threejs.AddSceneObject(this.group_);
    }

    if (this.Parent) {
      this.Parent.Attributes.Render = {
        group: this.group_,
      };
    }

    this.LoadModels_();
  }

  InitComponent(): void {
    this.RegisterHandler_('update.position', (m: Message) => { this.OnPosition_(m); });
    this.RegisterHandler_('update.rotation', (m: Message) => { this.OnRotation_(m); });
    this.RegisterHandler_('render.visible', (m: Message) => { this.OnVisible_(m); });
    this.RegisterHandler_('render.offset', (m: Message) => { this.OnOffset_(m.offset); });
  }

  OnVisible_(m: Message): void {
    this.group_.visible = !!m.value;
  }

  OnPosition_(m: Message): void {
    if (m.value) {
      this.group_.position.copy(m.value);
    }
  }

  OnRotation_(m: Message): void {
    if (m.value) {
      this.group_.quaternion.copy(m.value);
    }
  }

  OnOffset_(offset: any): void {
    this.offset_ = offset;
    if (!this.offset_) {
      return;
    }

    if (this.target_) {
      this.target_.position.copy(this.offset_.position);
      this.target_.quaternion.copy(this.offset_.quaternion);
    }
  }

  LoadModels_(): void {
    const loader = this.FindEntity('loader')?.GetComponent('LoadController') as any;
    if (loader) {
      loader.Load(
        this.params_.resourcePath, 
        this.params_.resourceName, 
        (mdl: any) => {
          this.OnLoaded_(mdl.scene);
        }
      );
    }
  }

  OnLoaded_(obj: THREE.Object3D): void {
    this.target_ = obj;
    this.group_.add(this.target_);
    
    if (this.Parent) {
      this.group_.position.copy(this.Parent.Position);
      this.group_.quaternion.copy(this.Parent.Quaternion);
    }

    if (this.params_.scale) {
      this.target_.scale.copy(this.params_.scale);
    }
    
    if (this.params_.offset) {
      this.offset_ = this.params_.offset;
    }
    this.OnOffset_(this.offset_);

    const textures: Record<string, THREE.Texture> = {};
    if (this.params_.textures) {
      const loader = this.FindEntity('loader')?.GetComponent('LoadController') as any;
      if (loader) {
        for (let k in this.params_.textures.names) {
          const t = loader.LoadTexture(
            this.params_.textures.resourcePath, 
            this.params_.textures.names[k]
          );

          if (this.params_.textures.wrap) {
            t.wrapS = THREE.RepeatWrapping;
            t.wrapT = THREE.RepeatWrapping;
          }

          textures[k] = t;
        }
      }
    }

    this.target_.traverse((c: any) => {
      let materials: THREE.Material[] = [];
      if (c.material) {
        if (!(c.material instanceof Array)) {
          materials = [c.material];
        } else {
          materials = c.material;
        }
      }

      if (c.geometry) {
        c.geometry.computeBoundingBox();
      }

      for (let m of materials) {
        if (m) {
          if (this.params_.onMaterial) {
            this.params_.onMaterial(m);
          }
          for (let k in textures) {
            if (m.name.search(k) >= 0) {
              (m as THREE.MeshStandardMaterial).map = textures[k];
            }
          }
          if (this.params_.specular && 'specular' in m) {
            (m as any).specular = this.params_.specular;
          }
          if (this.params_.emissive && 'emissive' in m) {
            (m as THREE.MeshStandardMaterial).emissive = this.params_.emissive;
          }
          if (this.params_.colour) {
            m.color = this.params_.colour;
          }
        }
      }

      c.castShadow = true;
      c.receiveShadow = true;

      if (this.params_.receiveShadow !== undefined) {
        c.receiveShadow = this.params_.receiveShadow;
      }
      if (this.params_.castShadow !== undefined) {
        c.castShadow = this.params_.castShadow;
      }
      if (this.params_.visible !== undefined) {
        c.visible = this.params_.visible;
      }
    });

    this.Broadcast({
      topic: 'render.loaded',
      value: this.target_,
    });
  }

  Update(timeInSeconds: number): void {
    // Empty implementation
  }
} 
