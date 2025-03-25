import * as entity from "../base/entity";
import * as passes from '../base/passes';

interface MouseState {
  leftButton: boolean;
  rightButton: boolean;
  mouseXDelta: number;
  mouseYDelta: number;
  mouseX: number;
  mouseY: number;
}

interface KeyboardState {
  [keyCode: number]: boolean;
}

interface InputAttributes {
  Keyboard: {
    Current: KeyboardState;
    Previous: KeyboardState;
  };
  Mouse: {
    Current: MouseState;
    Previous: MouseState | null;
  };
}

interface PlayerInputParams {
  [key: string]: any;
}

export const player_input = (() => {

  const KEYS = {
    'a': 65,
    's': 83,
    'w': 87,
    'd': 68,
    'SPACE': 32,
    'SHIFT_L': 16,
    'CTRL_L': 17,
    'BACKSPACE': 8,
  };

  class PlayerInput extends entity.Component {
    static CLASS_NAME = 'PlayerInput';

    get NAME(): string {
      return PlayerInput.CLASS_NAME;
    }

    private params_: PlayerInputParams;
    private current_: MouseState;
    private previous_: MouseState | null;
    private keys_: KeyboardState;
    private previousKeys_: KeyboardState;
    private target_: Document;

    constructor(params: PlayerInputParams) {
      super();
      this.params_ = params;
      this.current_ = {
        leftButton: false,
        rightButton: false,
        mouseXDelta: 0,
        mouseYDelta: 0,
        mouseX: 0,
        mouseY: 0,
      };
      this.previous_ = null;
      this.keys_ = {};
      this.previousKeys_ = {};
      this.target_ = document;
    }
  
    InitEntity(): void {
      this.target_.addEventListener('mousedown', (e) => this.onMouseDown_(e), false);
      this.target_.addEventListener('mousemove', (e) => this.onMouseMove_(e), false);
      this.target_.addEventListener('mouseup', (e) => this.onMouseUp_(e), false);
      this.target_.addEventListener('keydown', (e) => this.onKeyDown_(e), false);
      this.target_.addEventListener('keyup', (e) => this.onKeyUp_(e), false);

      if (this.Parent) {
        this.Parent.Attributes.Input = {
          Keyboard: {
            Current: this.keys_,
            Previous: this.previousKeys_
          },
          Mouse: {
            Current: this.current_,
            Previous: this.previous_
          },
        };
      }

      this.SetPass(passes.Passes.INPUT);
    }
  
    onMouseMove_(e: MouseEvent): void {
      this.current_.mouseX = e.pageX - window.innerWidth / 2;
      this.current_.mouseY = e.pageY - window.innerHeight / 2;

      if (this.previous_ === null) {
        this.previous_ = {...this.current_};
      }

      this.current_.mouseXDelta = this.current_.mouseX - this.previous_.mouseX;
      this.current_.mouseYDelta = this.current_.mouseY - this.previous_.mouseY;
    }

    onMouseDown_(e: MouseEvent): void {
      this.onMouseMove_(e);

      switch (e.button) {
        case 0: {
          this.current_.leftButton = true;
          break;
        }
        case 2: {
          this.current_.rightButton = true;
          break;
        }
      }
    }

    onMouseUp_(e: MouseEvent): void {
      this.onMouseMove_(e);

      switch (e.button) {
        case 0: {
          this.current_.leftButton = false;
          break;
        }
        case 2: {
          this.current_.rightButton = false;
          break;
        }
      }
    }

    onKeyDown_(e: KeyboardEvent): void {
      this.keys_[e.keyCode] = true;
    }

    onKeyUp_(e: KeyboardEvent): void {
      this.keys_[e.keyCode] = false;
    }

    key(keyCode: number): boolean {
      return !!this.keys_[keyCode];
    }

    mouseLeftReleased(checkPrevious: boolean = true): boolean {
      return (!this.current_.leftButton && this.previous_?.leftButton) || false;
    }

    isReady(): boolean {
      return this.previous_ !== null;
    }

    Update(_: number): void {
      if (this.previous_ !== null) {
        this.current_.mouseXDelta = this.current_.mouseX - this.previous_.mouseX;
        this.current_.mouseYDelta = this.current_.mouseY - this.previous_.mouseY;

        this.previous_ = {...this.current_};
        this.previousKeys_ = {...this.keys_};
      }
    }
  };

  return {
    PlayerInput: PlayerInput,
    KEYS: KEYS,
  };

})(); 
