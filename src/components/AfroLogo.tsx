import React from "react";

interface AfroLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  color?: string;
}

export function AfroLogo({ className, size = "md", color = "#fcc115" }: AfroLogoProps) {
  const sizeClasses = {
    sm: "h-6 w-auto",
    md: "h-8 w-auto",
    lg: "h-12 w-auto",
    xl: "h-16 w-auto",
  };

  return (
    <svg
      viewBox="0 0 395 115"
      className={`${sizeClasses[size]} ${className || ""}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color }}
    >
      {/* Letter A */}
      <path
        d="M 50,10 L 78,58 H 22 Z M 50,28 L 60,48 H 40 Z"
        fill="currentColor"
      />
      <path
        d="M 20.5,66 H 31.5 L 12.5,105 H 0 Z"
        fill="currentColor"
      />
      <path
        d="M 79.5,66 H 90.5 L 109.5,105 H 97 Z"
        fill="currentColor"
      />
      <path
        d="M 37.5,66 H 72.5 L 55,92 Z"
        fill="currentColor"
      />

      {/* Letter F */}
      <path
        d="M 125,10 V 105 H 144 V 10 Z"
        fill="currentColor"
      />
      <path
        d="M 144,10 H 195 V 32 H 144 Z"
        fill="currentColor"
      />
      <path
        d="M 144,48 H 183 V 70 H 144 Z"
        fill="currentColor"
      />

      {/* Letter R */}
      <path
        d="M 215,10 V 105 H 234 V 10 Z"
        fill="currentColor"
      />
      <path
        d="M 234,10 H 265 C 280,10 286,22 286,34 C 286,46 280,58 265,58 H 234 Z M 234,26 H 261 C 267,26 269,29 269,34 C 269,39 267,42 261,42 H 234 Z"
        fill="currentColor"
      />
      <path
        d="M 238,66 H 258 L 286,105 H 264 L 238,68 Z"
        fill="currentColor"
      />

      {/* Letter O */}
      <circle
        cx="345"
        cy="57.5"
        r="37.5"
        stroke="currentColor"
        strokeWidth="18"
        fill="none"
      />
      <circle
        cx="345"
        cy="57.5"
        r="10"
        fill="currentColor"
      />
    </svg>
  );
}
