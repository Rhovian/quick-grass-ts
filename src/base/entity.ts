import {THREE} from './three-defs';
import * as entity_manager from './entity-manager';
import * as passes from './passes';

interface ComponentMap {
  [key: string]: Component;
}

interface HandlerMap {
  [key: string]: Array<(msg: any) => void>;
}

interface AttributeMap {
  [key: string]: any;
}

interface Message {
  topic: string;
  value?: any;
  [key: string]: any;
}

const SCALE_1_ = new THREE.Vector3(1, 1, 1);

let IDS_ = 0;

export class Entity {
  private id_: number;
  private name_: string;
  private components_: ComponentMap;
  private attributes_: AttributeMap;
  private transform_: THREE.Matrix4;
  private worldTransform_: THREE.Matrix4;
  private position_: THREE.Vector3;
  private rotation_: THREE.Quaternion;
  private handlers_: HandlerMap;
  private parent_: Entity | null;
  private dead_: boolean;
  private active_: boolean;
  private childrenActive_: Entity[];
  private children_: Entity[];

  constructor(name?: string) {
    IDS_ += 1;

    this.id_ = IDS_;
    this.name_ = name ? name : this.GenerateName_();
    this.components_ = {};
    this.attributes_ = {};

    this.transform_ = new THREE.Matrix4();
    this.transform_.identity();
    this.worldTransform_ = new THREE.Matrix4();
    this.worldTransform_.identity();

    this.position_ = new THREE.Vector3();
    this.rotation_ = new THREE.Quaternion();

    this.handlers_ = {};
    this.parent_ = null;
    this.dead_ = false;
    this.active_ = true;

    this.childrenActive_ = [];
    this.children_ = [];
  }

  Destroy_(): void {
    for (let c of this.children_) {
      c.Destroy_();
    }
    for (let k in this.components_) {
      this.components_[k].Destroy();
    }
    this.childrenActive_ = [];
    this.children_ = [];
    this.components_ = {};
    this.parent_ = null;
    this.handlers_ = {};
    this.Manager.Remove(this.name_);
  }

  GenerateName_(): string {
    return '__name__' + this.id_;
  }

  RegisterHandler_(n: string, h: (msg: any) => void): void {
    if (!(n in this.handlers_)) {
      this.handlers_[n] = [];
    }
    this.handlers_[n].push(h);
  }

  UnregisterHandler_(n: string, h: (msg: any) => void): void {
    this.handlers_[n] = this.handlers_[n].filter(c => c != h);
  }

  AddChild_(e: Entity): void {
    this.children_.push(e);
    this.RefreshActiveChildren_();
  }

  RemoveChild_(e: Entity): void {
    this.children_ = this.children_.filter(c => c != e);
    this.RefreshActiveChildren_();
  }

  SetParent(p: Entity | null): void {
    if (this.parent_) {
      this.parent_.RemoveChild_(this);
    }

    this.parent_ = p;

    if (this.parent_) {
      this.parent_.AddChild_(this);
    }
  }

  get Name(): string {
    return this.name_;
  }

  get ID(): number {
    return this.id_;
  }

  get Manager(): entity_manager.EntityManager {
    return entity_manager.EntityManager.Instance!;
  }

  get Parent(): Entity | null {
    return this.parent_;
  }

  get Attributes(): AttributeMap {
    return this.attributes_;
  }

  get Children(): Entity[] {
    return [...this.children_];
  }

  get IsDead(): boolean {
    return this.dead_;
  }

  get IsActive(): boolean {
    return this.active_;
  }

  RefreshActiveChildren_(): void {
    this.childrenActive_ = this.children_.filter(c => c.IsActive);
  }

  SetActive(active: boolean): void {
    this.active_ = active;
    if (this.parent_) {
      this.parent_.RefreshActiveChildren_();
    }
  }

  SetDead(): void {
    this.dead_ = true;
  }

  AddComponent(c: Component): void {
    c.SetParent(this);
    this.components_[c.NAME] = c;

    c.InitComponent();
  }

  Init(parent?: Entity): void {
    this.Manager.Add(this, parent);
    this.InitEntity_();
  }

  InitEntity_(): void {
    for (let k in this.components_) {
      this.components_[k].InitEntity();
    }
    this.SetActive(this.active_);
  }

  GetComponent(n: string): Component {
    return this.components_[n];
  }

  FindEntity(name: string): Entity | null {
    return this.Manager.Get(name) || null;
  }

  FindChild(name: string, recursive?: boolean): Entity | null {
    let result: Entity | null = null;

    for (let i = 0, n = this.children_.length; i < n; ++i) {
      if (this.children_[i].Name == name) {
        result = this.children_[i];
        break;
      }

      if (recursive) {
        result = this.children_[i].FindChild(name, recursive);
        if (result) {
          break;
        }
      }
    }
    return result;
  }

  Broadcast(msg: Message): void {
    if (this.IsDead) {
      return;
    }
    if (!(msg.topic in this.handlers_)) {
      return;
    }

    for (let curHandler of this.handlers_[msg.topic]) {
      curHandler(msg);
    }
  }

  SetPosition(p: THREE.Vector3): void {
    this.position_.copy(p);
    this.transform_.compose(this.position_, this.rotation_, SCALE_1_);
    this.Broadcast({
      topic: 'update.position',
      value: this.position_,
    });
  }

  SetQuaternion(r: THREE.Quaternion): void {
    this.rotation_.copy(r);
    this.transform_.compose(this.position_, this.rotation_, SCALE_1_);
    this.Broadcast({
      topic: 'update.rotation',
      value: this.rotation_,
    });
  }

  get Transform(): THREE.Matrix4 {
    return this.transform_;
  }

  get WorldTransform(): THREE.Matrix4 {
    const m = this.worldTransform_.copy(this.transform_);
    if (this.parent_) {
      m.multiply(this.parent_.Transform);
    }
    return m;
  }

  GetWorldPosition(target: THREE.Vector3): THREE.Vector3 {
    target.setFromMatrixPosition(this.WorldTransform);
    return target;
  }

  get Position(): THREE.Vector3 {
    return this.position_;
  }

  get Quaternion(): THREE.Quaternion {
    return this.rotation_;
  }

  get Forward(): THREE.Vector3 {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.rotation_);
    return forward;
  }

  get Left(): THREE.Vector3 {
    const forward = new THREE.Vector3(-1, 0, 0);
    forward.applyQuaternion(this.rotation_);
    return forward;
  }

  get Up(): THREE.Vector3 {
    const forward = new THREE.Vector3(0, 1, 0);
    forward.applyQuaternion(this.rotation_);
    return forward;
  }

  UpdateComponents_(timeElapsed: number, pass: number): void {
    for (let k in this.components_) {
      if (this.components_[k].Pass & pass) {
        this.components_[k].Update(timeElapsed);
      }
    }
  }

  UpdateChildren_(timeElapsed: number, pass: number): void {
    for (let i = 0; i < this.childrenActive_.length; ++i) {
      const child = this.childrenActive_[i];
      if (child.dead_) {
        this.childrenActive_.splice(i, 1);
        this.children_.splice(this.children_.indexOf(child), 1);
        this.Broadcast({
          topic: 'events.removedchild',
          entity: child,
        });
        i--;
        continue;
      }
      child.Update(timeElapsed, pass);
    }
  }

  Update(timeElapsed: number, pass: number): void {
    if (this.IsDead) {
      return;
    }
    this.UpdateComponents_(timeElapsed, pass);
    this.UpdateChildren_(timeElapsed, pass);
  }
}

export class Component {
  private parent_: Entity | null = null;
  private pass_: number = passes.Passes.UPDATE;

  get NAME(): string {
    throw new Error('Component must implement NAME');
  }

  constructor() {}

  Destroy(): void {}
  InitComponent(): void {}
  InitEntity(): void {}
  Update(timeElapsed: number): void {}

  SetParent(parent: Entity): void {
    this.parent_ = parent;
  }

  SetPass(pass: number): void {
    this.pass_ = pass;
  }

  get Pass(): number {
    return this.pass_;
  }

  GetComponent(name: string): Component {
    return this.parent_?.GetComponent(name) as Component;
  }

  get Manager(): entity_manager.EntityManager {
    return entity_manager.EntityManager.Instance!;
  }

  get Parent(): Entity | null {
    return this.parent_;
  }

  FindEntity(name: string): Entity | null {
    return this.parent_?.FindEntity(name) || null;
  }

  Broadcast(m: Message): void {
    if (this.parent_) {
      this.parent_.Broadcast(m);
    }
  }

  RegisterHandler_(name: string, cb: (msg: any) => void): void {
    if (this.parent_) {
      this.parent_.RegisterHandler_(name, cb);
    }
  }
} 
