import React from "react";

// Enterprise-grade logo: hex/cube with blue accent and page fold
export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ContractEngine logo"
      style={{ display: 'block' }}
    >
      {/* Main hex outline */}
      <polygon
        points="16,4 28,10 28,22 16,28 4,22 4,10"
        stroke="#222"
        strokeWidth="2"
        fill="white"
      />
      {/* Blue accent face (bottom right) */}
      <polygon
        points="16,28 28,22 28,10 16,16"
        fill="#2563eb" // Tailwind blue-600
        opacity="0.85"
      />
      {/* Subtle page fold (top right) */}
      <polygon
        points="28,10 22,7 16,10 16,16"
        fill="#e0e7ef"
        opacity="0.9"
      />
      {/* Cube inner lines */}
      <polyline
        points="16,4 16,16 28,22"
        stroke="#222"
        strokeWidth="1.2"
        fill="none"
        opacity="0.7"
      />
      <polyline
        points="16,16 4,22"
        stroke="#222"
        strokeWidth="1.2"
        fill="none"
        opacity="0.7"
      />
    </svg>
  );
} 