import * as entity_manager from './base/entity-manager';
import * as entity from './base/entity';

import {load_controller} from './base/load-controller';
import {spawners} from './game/spawners';

import { ThreeJSController } from './base/threejs-component';
import { THREE } from './base/three-defs';

import * as render_sky_component from './game/render/render-sky-component';
import * as shaders from './game/render/shaders';


class QuickFPS1 {
  private entityManager_!: entity_manager.EntityManager;
  private previousRAF_: number | null;
  private camera_!: THREE.Camera;
  private threejs_!: ThreeJSController;

  constructor() {
    this.previousRAF_ = null;
  }

  async Init(): Promise<void> {
    await shaders.loadShaders();

    this.Initialize_();
  }

  Initialize_(): void {
    this.entityManager_ = entity_manager.EntityManager.Init();

    this.OnGameStarted_();
  }

  OnGameStarted_(): void {
    this.LoadControllers_();

    this.previousRAF_ = null;
    this.RAF_();
  }

  LoadControllers_(): void {
    const threejs = new entity.Entity('threejs');
    threejs.AddComponent(new ThreeJSController());
    threejs.Init();

    const sky = new entity.Entity();
    sky.AddComponent(new render_sky_component.RenderSkyComponent());
    sky.Init(threejs);

    // Hack
    this.camera_ = (threejs.GetComponent('ThreeJSController') as ThreeJSController).Camera;
    this.threejs_ = threejs.GetComponent('ThreeJSController') as ThreeJSController;

    const loader = new entity.Entity('loader');
    loader.AddComponent(new load_controller.LoadController());
    loader.Init();

    const basicParams = {
      camera: this.camera_,
    };

    const spawner = new entity.Entity('spawners');
    spawner.AddComponent(new spawners.PlayerSpawner(basicParams));
    spawner.AddComponent(new spawners.DemoSpawner(basicParams));
    spawner.Init();

    (spawner.GetComponent('PlayerSpawner') as any).Spawn();
    (spawner.GetComponent('DemoSpawner') as any).Spawn();
  }

  RAF_(): void {
    requestAnimationFrame((t) => {
      if (this.previousRAF_ === null) {
        this.previousRAF_ = t;
      } else {
        this.Step_(t - this.previousRAF_);
        this.previousRAF_ = t;
      }

      setTimeout(() => {
        this.RAF_();
      }, 1);
    });
  }

  Step_(timeElapsed: number): void {
    const timeElapsedS = Math.min(1.0 / 30.0, timeElapsed * 0.001);

    this.entityManager_.Update(timeElapsedS);

    this.threejs_.Render(timeElapsedS);
  }
}


let _APP: QuickFPS1 | null = null;

window.addEventListener('DOMContentLoaded', async () => {
  _APP = new QuickFPS1();
  await _APP.Init();
}); 
