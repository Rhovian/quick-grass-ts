export enum Passes {
  PASSES_MIN = 1 << 0,

  INPUT     = 1 << 0,
  CAMERA    = 1 << 1,
  DEFAULT   = 1 << 2,
  UPDATE    = 1 << 3,

  PASSES_MAX = 1 << 3
} 
