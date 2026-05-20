// src/components/ShieldIcon.tsx
// ShieldStar — app identity mark. Used in login screen hero and badge displays.
// Spec from DESIGN.md § Icons — star polygon inscribed in shield silhouette, amber fill, leather outline.

import React from 'react';
import { Defs, LinearGradient, Path, Stop, Svg } from 'react-native-svg';

interface ShieldIconProps {
  size?: number;
}

export default function ShieldIcon({ size = 64 }: ShieldIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 46">
      <Defs>
        <LinearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFD700" stopOpacity="1" />
          <Stop offset="1" stopColor="#FFAC30" stopOpacity="1" />
        </LinearGradient>
      </Defs>
      {/* Shield body */}
      <Path
        d="M20 1 L38 7 L38 22 C38 32 20 45 20 45 C20 45 2 32 2 22 L2 7 Z"
        fill="url(#shieldGrad)"
        stroke="#1A1108"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Star — 5-point, centered at (20, 22) */}
      <Path
        d="M20 10 L22.4 17.6 L30.5 17.6 L24.1 22.4 L26.5 30 L20 25.2 L13.5 30 L15.9 22.4 L9.5 17.6 L17.6 17.6 Z"
        fill="#FFFDF7"
        stroke="#1A1108"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
