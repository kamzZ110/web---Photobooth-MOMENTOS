declare module 'falling-leaves' {
  export interface FallingLeavesOptions {
    shapes?: string[];
    colors?: string[];
    numberOfLeaves?: number;
    speed?: number;
    wind?: number;
  }
  export class FallingLeaves {
    constructor(options?: FallingLeavesOptions);
    destroy?: () => void;
  }
}

declare module 'falling-leaves/react' {
  import type { FC } from 'react';
  export interface FallingLeavesProps {
    fullScreen?: boolean;
    shapes?: string[];
    colors?: string[];
    numberOfLeaves?: number;
    speed?: number;
    wind?: number;
  }
  export const FallingLeaves: FC<FallingLeavesProps>;
}
