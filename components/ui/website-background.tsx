import React from "react";

/**
 * WebsiteBackground
 * -----------------
 * Full website-wide layered background system for Madinaty.
 * Creates an organic, flowing, navy-dominant canvas inspired by the brand reference artwork.
 * Blends:
 *   - Deep Navy: #142D4E / #0B1E38 / #07101E
 *   - Primary Blue: #2563EB / #1D4ED8 / #1E40AF
 *   - Teal Accent: #0D9488 / #0F766E
 *   - Supporting Civic Cyan & Deep Oceanic tones
 *
 * Uses multi-layered radial gradients, soft overlapping blurred light glows,
 * and delicate organic wave paths. Hardware-accelerated CSS animations drift slowly
 * and respect prefers-reduced-motion. Stays fixed and visually stable while scrolling.
 */
export function WebsiteBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none -z-50 overflow-hidden select-none"
      aria-hidden="true"
      style={{
        backgroundColor: "#0B1E38",
      }}
    >
      {/* Layer 1: Base Deep Navy & Radial Foundation */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 130% 90% at 50% -10%, #163660 0%, #142D4E 35%, #0B1E38 70%, #07101E 100%)",
        }}
      />

      {/* Layer 2: Glowing Organic Light Orbs (Floating on GPU compositor) */}

      {/* Glow Orb 1 - Primary Blue Core (Top Right / Center) */}
      <div
        className="absolute -top-32 right-[-5%] w-[820px] h-[820px] rounded-full animate-bg-drift-1"
        style={{
          background:
            "radial-gradient(circle, rgba(37, 99, 235, 0.42) 0%, rgba(29, 78, 216, 0.22) 42%, rgba(20, 45, 78, 0.05) 70%, transparent 80%)",
          filter: "blur(110px)",
        }}
      />

      {/* Glow Orb 2 - Teal Accent & Accessible Teal (Mid Left) */}
      <div
        className="absolute top-[32%] -left-36 w-[860px] h-[860px] rounded-full animate-bg-drift-2"
        style={{
          background:
            "radial-gradient(circle, rgba(13, 148, 136, 0.38) 0%, rgba(15, 118, 110, 0.20) 45%, rgba(11, 30, 56, 0.05) 70%, transparent 80%)",
          filter: "blur(120px)",
        }}
      />

      {/* Glow Orb 3 - Deep Royal Blue to Civic Cyan Blend (Mid-to-Lower Right) */}
      <div
        className="absolute top-[60%] -right-24 w-[920px] h-[780px] rounded-full animate-bg-drift-3"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(2, 132, 199, 0.28) 0%, rgba(30, 64, 175, 0.24) 40%, rgba(20, 45, 78, 0.05) 70%, transparent 80%)",
          filter: "blur(115px)",
        }}
      />

      {/* Glow Orb 4 - Flowing Teal & Deep Navy Convergence (Bottom Left / Center) */}
      <div
        className="absolute -bottom-44 left-[10%] w-[840px] h-[740px] rounded-full animate-bg-drift-1"
        style={{
          background:
            "radial-gradient(circle, rgba(13, 148, 136, 0.32) 0%, rgba(37, 99, 235, 0.18) 45%, transparent 75%)",
          filter: "blur(110px)",
        }}
      />

      {/* Glow Orb 5 - Ambient Central Pulse for cohesive depth */}
      <div
        className="absolute top-[48%] left-[30%] w-[700px] h-[600px] rounded-full animate-bg-drift-2"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(20, 45, 78, 0.45) 0%, rgba(37, 99, 235, 0.12) 50%, transparent 75%)",
          filter: "blur(100px)",
        }}
      />

      {/* Layer 3: Organic Flowing Wave Transitions (Inspired by Reference Artwork) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.22] mix-blend-screen animate-bg-wave"
        preserveAspectRatio="none"
        viewBox="0 0 1440 1000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="madinatyWaveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.45" />
            <stop offset="45%" stopColor="#0D9488" stopOpacity="0.35" />
            <stop offset="80%" stopColor="#0F766E" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#142D4E" stopOpacity="0.05" />
          </linearGradient>

          <linearGradient id="madinatyWaveGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0D9488" stopOpacity="0.38" />
            <stop offset="50%" stopColor="#2563EB" stopOpacity="0.25" />
            <stop offset="85%" stopColor="#0284C7" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#142D4E" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="madinatyWaveGrad3" x1="30%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.2" />
            <stop offset="60%" stopColor="#0D9488" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#142D4E" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Upper flowing wave ribbon */}
        <path
          d="M-100 380 C 250 260, 580 520, 1050 320 C 1300 210, 1480 290, 1600 340 L 1600 1050 L -100 1050 Z"
          fill="url(#madinatyWaveGrad1)"
        />

        {/* Lower counter-flowing wave ribbon */}
        <path
          d="M-80 580 C 380 440, 720 720, 1180 480 C 1380 390, 1540 440, 1640 470 L 1640 1050 L -80 1050 Z"
          fill="url(#madinatyWaveGrad2)"
        />

        {/* Delicate deep sweep */}
        <path
          d="M-50 780 C 450 680, 800 890, 1260 700 C 1440 630, 1580 670, 1650 690 L 1650 1050 L -50 1050 Z"
          fill="url(#madinatyWaveGrad3)"
        />
      </svg>

      {/* Layer 4: Soft Vignette Overlay to ensure seamless contrast */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(7, 16, 30, 0.38) 100%)",
        }}
      />
    </div>
  );
}
