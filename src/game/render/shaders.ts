import { THREE, CSMShader } from '../../base/three-defs';

interface ShaderCode {
  vsh: string;
  fsh: string;
}

interface ShaderParameters {
  vertexShader?: string;
  fragmentShader?: string;
  uniforms?: Record<string, { value: any }>;
  side?: THREE.Side;
  [key: string]: any;
}

class ShaderManager {
  static shaderCode: Record<string, ShaderCode> = {};
  static threejs: any = null;
}

export function SetThreeJS(threejs: any): void {
  ShaderManager.threejs = threejs;
}

export async function loadShaders(): Promise<void> {
  const loadText = async (url: string): Promise<string> => {
    const d = await fetch(url);
    return await d.text();
  };

  const globalShaders = [
    'header.glsl',
    'common.glsl',
    'oklab.glsl',
    'noise.glsl',
    'sky.glsl',
  ];

  const globalShadersCode: string[] = [];
  for (let i = 0; i < globalShaders.length; ++i) {
    globalShadersCode.push(await loadText('shaders/' + globalShaders[i]));
  }

  const loadShader = async (url: string): Promise<string> => {
    const d = await fetch(url);
    let shaderCode = '';
    for (let i = 0; i < globalShadersCode.length; ++i) {
      shaderCode += globalShadersCode[i] + '\n';
    }
    return shaderCode + '\n' + await d.text();
  }

  ShaderManager.shaderCode['PHONG'] = {
    vsh: await loadShader('shaders/phong-lighting-model-vsh.glsl'),
    fsh: await loadShader('shaders/phong-lighting-model-fsh.glsl'),
  };

  ShaderManager.shaderCode['GRASS'] = {
    vsh: await loadShader('shaders/grass-lighting-model-vsh.glsl'),
    fsh: await loadShader('shaders/grass-lighting-model-fsh.glsl'),
  };

  ShaderManager.shaderCode['TERRAIN'] = {
    vsh: await loadShader('shaders/terrain-lighting-model-vsh.glsl'),
    fsh: await loadShader('shaders/terrain-lighting-model-fsh.glsl'),
  };

  ShaderManager.shaderCode['BUGS'] = {
    vsh: await loadShader('shaders/bugs-lighting-model-vsh.glsl'),
    fsh: await loadShader('shaders/bugs-lighting-model-fsh.glsl'),
  };

  ShaderManager.shaderCode['WIND'] = {
    vsh: await loadShader('shaders/wind-lighting-model-vsh.glsl'),
    fsh: await loadShader('shaders/wind-lighting-model-fsh.glsl'),
  };

  ShaderManager.shaderCode['SKY'] = {
    vsh: await loadShader('shaders/sky-lighting-model-vsh.glsl'),
    fsh: await loadShader('shaders/sky-lighting-model-fsh.glsl'),
  };

  ShaderManager.shaderCode['WATER'] = {
    vsh: await loadShader('shaders/water-lighting-model-vsh.glsl'),
    fsh: await loadShader('shaders/water-lighting-model-fsh.glsl'),
  };

  ShaderManager.shaderCode['WATER-TEXTURE'] = {
    vsh: await loadShader('shaders/water-texture-vsh.glsl'),
    fsh: await loadShader('shaders/water-texture-fsh.glsl'),
  };
} 

export class ShaderMaterial extends THREE.ShaderMaterial {
  constructor(shaderType: string, parameters: ShaderParameters) {
    parameters.vertexShader = ShaderManager.shaderCode[shaderType].vsh;
    parameters.fragmentShader = ShaderManager.shaderCode[shaderType].fsh;

    super(parameters);
  }
}

export class GamePBRMaterial extends THREE.MeshStandardMaterial {
  // TypeScript doesn't support private fields with # syntax well yet
  // Using private keyword instead
  private uniforms_: Record<string, { value: any }> = {};
  private shader_: any = null;

  constructor(shaderType: string, parameters?: any) {
    super(parameters);

    this.shader_ = null;
    this.uniforms_ = {};

    ShaderManager.threejs.SetupMaterial(this);

    const previousCallback = (this as any).onBeforeCompile;
    
    (this as any).onBeforeCompile = (shader: any): void => {
        shader.fragmentShader = ShaderManager.shaderCode[shaderType].fsh;
        shader.vertexShader = ShaderManager.shaderCode[shaderType].vsh;
        shader.uniforms.time = { value: 0.0 };
        shader.uniforms.playerPos = { value: new THREE.Vector3(0.0) };

        for (let k in this.uniforms_) {
          shader.uniforms[k] = this.uniforms_[k];
        }

        this.shader_ = shader;

        if (previousCallback) {
          previousCallback(shader);
        }
    };

    (this as any).onBeforeRender = (): void => {
      if (shaderType == 'BUGS') {
        // Empty - kept for consistency with original code
      }
      // Empty - kept for consistency with original code
    }

    (this as any).customProgramCacheKey = (): string => {
      let uniformStr = '';
      for (let k in this.uniforms_) {
        uniformStr += k + ':' + this.uniforms_[k].value + ';';
      }
      return shaderType + uniformStr;
    }
  }

  setFloat(name: string, value: number): void {
    this.uniforms_[name] = { value: value };
    if (this.shader_) {
      this.shader_.uniforms[name] = this.uniforms_[name];
    }
  }

  setVec2(name: string, value: THREE.Vector2): void {
    this.uniforms_[name] = { value: value };
    if (this.shader_) {
      this.shader_.uniforms[name] = this.uniforms_[name];
    }
  }

  setVec3(name: string, value: THREE.Vector3): void {
    this.uniforms_[name] = { value: value };
    if (this.shader_) {
      this.shader_.uniforms[name] = this.uniforms_[name];
    }
  }

  setVec4(name: string, value: THREE.Vector4): void {
    this.uniforms_[name] = { value: value };
    if (this.shader_) {
      this.shader_.uniforms[name] = this.uniforms_[name];
    }
  }

  setMatrix(name: string, value: THREE.Matrix4): void {
    this.uniforms_[name] = { value: value };
    if (this.shader_) {
      this.shader_.uniforms[name] = this.uniforms_[name];
    }
  }

  setTexture(name: string, value: THREE.Texture): void {
    this.uniforms_[name] = { value: value };
    if (this.shader_) {
      this.shader_.uniforms[name] = this.uniforms_[name];
    }
  }

  setTextureArray(name: string, value: THREE.Texture[]): void {
    this.uniforms_[name] = { value: value };
    if (this.shader_) {
      this.shader_.uniforms[name] = this.uniforms_[name];
    }
  }
}

export class GameMaterial extends THREE.MeshPhongMaterial {
  // TypeScript doesn't support private fields with # syntax well yet
  // Using private keyword instead
  private uniforms_: Record<string, { value: any }> = {};
  private shader_: any = null;

  constructor(shaderType: string, parameters?: any) {
    super(parameters);

    this.shader_ = null;
    this.uniforms_ = {};

    ShaderManager.threejs.SetupMaterial(this);

    const previousCallback = (this as any).onBeforeCompile;

    (this as any).onBeforeCompile = (shader: any): void => {
        shader.fragmentShader = ShaderManager.shaderCode[shaderType].fsh;
        shader.vertexShader = ShaderManager.shaderCode[shaderType].vsh;
        shader.uniforms.time = { value: 0.0 };
        shader.uniforms.playerPos = { value: new THREE.Vector3(0.0) };

        for (let k in this.uniforms_) {
          shader.uniforms[k] = this.uniforms_[k];
        }

        this.shader_ = shader;

        if (previousCallback) {
          previousCallback(shader);
        }
    };

    (this as any).onBeforeRender = (): void => {
      if (shaderType == 'BUGS') {
        // Empty - kept for consistency with original code
      }
      // Empty - kept for consistency with original code
    }

    (this as any).customProgramCacheKey = (): string => {
      let uniformStr = '';
      for (let k in this.uniforms_) {
        uniformStr += k + ':' + this.uniforms_[k].value + ';';
      }
      return shaderType + uniformStr;
    }
  }

  setFloat(name: string, value: number): void {
    this.uniforms_[name] = { value: value };
    if (this.shader_) {
      this.shader_.uniforms[name] = this.uniforms_[name];
    }
  }

  setVec2(name: string, value: THREE.Vector2): void {
    this.uniforms_[name] = { value: value };
    if (this.shader_) {
      this.shader_.uniforms[name] = this.uniforms_[name];
    }
  }

  setVec3(name: string, value: THREE.Vector3): void {
    this.uniforms_[name] = { value: value };
    if (this.shader_) {
      this.shader_.uniforms[name] = this.uniforms_[name];
    }
  }

  setVec4(name: string, value: THREE.Vector4): void {
    this.uniforms_[name] = { value: value };
    if (this.shader_) {
      this.shader_.uniforms[name] = this.uniforms_[name];
    }
  }

  setMatrix(name: string, value: THREE.Matrix4): void {
    this.uniforms_[name] = { value: value };
    if (this.shader_) {
      this.shader_.uniforms[name] = this.uniforms_[name];
    }
  }

  setTexture(name: string, value: THREE.Texture): void {
    this.uniforms_[name] = { value: value };
    if (this.shader_) {
      this.shader_.uniforms[name] = this.uniforms_[name];
    }
  }

  setTextureArray(name: string, value: THREE.Texture[]): void {
    this.uniforms_[name] = { value: value };
    if (this.shader_) {
      this.shader_.uniforms[name] = this.uniforms_[name];
    }
  }
} 
