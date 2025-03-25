import * as entity from './entity';
import * as passes from "./passes";


const ROOT_ = '__root__';

export class EntityManager {
  static #instance_: EntityManager | null = null;

  #root_: entity.Entity | null;
  #entitiesMap_: Record<string, entity.Entity>;

  static Init(): EntityManager {
    this.#instance_ = new EntityManager();
    this.#instance_.#CreateRoot_();
    return this.#instance_;
  }

  static get Instance(): EntityManager | null {
    return this.#instance_;
  }

  constructor() {
    this.#entitiesMap_ = {};
    this.#root_ = null;
  }

  #CreateRoot_(): void {
    this.#root_ = new entity.Entity(ROOT_);
    this.#root_.Init();
  }

  Remove(n: string): void {
    delete this.#entitiesMap_[n];
  }

  Get(n: string): entity.Entity | undefined {
    return this.#entitiesMap_[n];
  }

  Add(child: entity.Entity, parent?: entity.Entity): void {
    this.#entitiesMap_[child.Name] = child;

    // Root check
    if (this.#root_ && child.ID === this.#root_.ID) {
      parent = undefined;
    } else {
      parent = parent ? parent : this.#root_ || undefined;
    }

    child.SetParent(parent ?? null);
  }

  Update(timeElapsed: number): void {
    for (let i = passes.Passes.PASSES_MIN; i <= passes.Passes.PASSES_MAX; i = i << 1) {
      this.UpdatePass_(timeElapsed, i);
    }
  }

  UpdatePass_(timeElapsedS: number, pass: number): void {
    if (this.#root_) {
      this.#root_.Update(timeElapsedS, pass);
    }
  }
} 
