export const render_order = (() => {
  return {
    DEFAULT: 0,
    DECALS: 1,
    SHIELDS: 2,
    PARTICLES: 3,
  } as const;
})();

// Define a type for the render order values
export type RenderOrder = typeof render_order[keyof typeof render_order]; 
