import {THREE} from './base/three-defs';

import * as entity from './base/entity';
import * as terrain_component from './base/render/terrain-component';
import * as shaders from './game/render/shaders';
import {load_controller} from './base/load-controller';
import {ThreeJSController} from './base/threejs-component';

interface DemoBuilderParams {
  [key: string]: any;
}

interface MaterialsMap {
  [key: string]: shaders.GameMaterial;
}

export const demo_builder = (() => {

  class DemoBuilder extends entity.Component {
    static CLASS_NAME = 'DemoBuilder';

    get NAME(): string {
      return DemoBuilder.CLASS_NAME;
    }

    private params_: DemoBuilderParams;
    private spawned_: boolean;
    private materials_: MaterialsMap;
    private currentTime_: number;

    constructor(params: DemoBuilderParams) {
      super();

      this.params_ = params;
      this.spawned_ = false;
      this.materials_ = {};
      this.currentTime_ = 0.0;
    }

    LoadMaterial_(albedoName: string, normalName: string | null, roughnessName: string | null, metalnessName: string | null): shaders.GameMaterial {
      const textureLoader = new THREE.TextureLoader();
      const albedo = textureLoader.load('./textures/' + albedoName);
      
      const threejs = this.FindEntity('threejs')?.GetComponent('ThreeJSController') as ThreeJSController;
      if (threejs) {
        albedo.anisotropy = threejs.getMaxAnisotropy();
      }
      
      albedo.wrapS = THREE.RepeatWrapping;
      albedo.wrapT = THREE.RepeatWrapping;
      albedo.colorSpace = THREE.SRGBColorSpace;

      const material = new shaders.GameMaterial('PHONG', {
        map: albedo,
        color: 0x303030,
      });

      return material;
    }

    BuildHackModel_(): void {
      this.materials_.checkerboard = this.LoadMaterial_(
          'whitesquare.png', null, null, null);

      const ground = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1, 10, 10, 10),
          this.materials_.checkerboard);
      ground.castShadow = true;
      ground.receiveShadow = true;

      const loader = this.FindEntity('loader')?.GetComponent('LoadController') as any;
      if (loader) {
        loader.AddModel(ground, 'built-in.', 'ground');
      }

      const box = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1, 10, 10, 10),
          this.materials_.checkerboard);
      box.castShadow = true;
      box.receiveShadow = true;

      if (loader) {
        loader.AddModel(box, 'built-in.', 'box');
      }

      const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(1, 16, 16),
          this.materials_.checkerboard);
      sphere.castShadow = true;
      sphere.receiveShadow = true;

      if (loader) {
        loader.AddModel(sphere, 'built-in.', 'sphere');
      }
    }

    Update(timeElapsed: number): void {
      this.currentTime_ += timeElapsed;

      if (this.materials_.checkerboard) {
        // Cast to any to access dynamically added properties
        const material = this.materials_.checkerboard as any;
        if (material.userData?.shader) {
          material.userData.shader.uniforms.iTime.value = this.currentTime_;
          material.needsUpdate = true;
        }
      }

      if (this.spawned_) {
        return;
      }

      this.spawned_ = true;

      this.BuildHackModel_();

      const terrain = new entity.Entity('terrain');
      terrain.AddComponent(new terrain_component.TerrainComponent({}));
      terrain.SetActive(true);
      terrain.Init();
    }
  };

  return {
    DemoBuilder: DemoBuilder
  };

})(); 
