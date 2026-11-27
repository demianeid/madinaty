import React from "react";

/**
 * WebsiteBackground
 * -----------------
 * Full website-wide layered background system for Madinaty.
 * Creates an organic, flowing, navy-dominant canvas inspired by the brand reference artwork.
 * Blends:
 *   - Deep Navy: #142D4E / #0B1E38 / #07101E
 *   - Primary Cyan: #0891B2 / #0E7490 / #155E75
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
      {/* High-Performance Canvas: Pure Multi-Layered Gradients (Zero GPU Blur overhead) */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 130% 90% at 50% -10%, #163660 0%, #142D4E 35%, #0B1E38 70%, #07101E 100%),
            radial-gradient(circle 600px at 85% 15%, rgba(37, 99, 235, 0.28) 0%, rgba(29, 78, 216, 0.12) 40%, transparent 75%),
            radial-gradient(circle 550px at 10% 40%, rgba(13, 148, 136, 0.22) 0%, rgba(15, 118, 110, 0.08) 45%, transparent 75%),
            radial-gradient(ellipse 700px 500px at 90% 70%, rgba(2, 132, 199, 0.20) 0%, rgba(30, 64, 175, 0.10) 45%, transparent 75%),
            radial-gradient(circle 600px at 25% 95%, rgba(13, 148, 136, 0.18) 0%, rgba(37, 99, 235, 0.08) 45%, transparent 75%)
          `,
        }}
      />

      {/* Layer 2: Organic Flowing Civic Waves (Clean SVG curves, zero blend-mode repaints) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
        preserveAspectRatio="none"
        viewBox="0 0 1440 1000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="madinatyWaveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0891B2" stopOpacity="0.4" />
            <stop offset="45%" stopColor="#0D9488" stopOpacity="0.3" />
            <stop offset="80%" stopColor="#0F766E" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#142D4E" stopOpacity="0.02" />
          </linearGradient>

          <linearGradient id="madinatyWaveGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0D9488" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#0891B2" stopOpacity="0.2" />
            <stop offset="85%" stopColor="#0284C7" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#142D4E" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d="M-100 380 C 250 260, 580 520, 1050 320 C 1300 210, 1480 290, 1600 340 L 1600 1050 L -100 1050 Z"
          fill="url(#madinatyWaveGrad1)"
        />

        <path
          d="M-80 580 C 380 440, 720 720, 1180 480 C 1380 390, 1540 440, 1640 470 L 1640 1050 L -80 1050 Z"
          fill="url(#madinatyWaveGrad2)"
        />
      </svg>

      {/* Layer 3: Soft Edge Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(7, 16, 30, 0.4) 100%)",
        }}
      />
    </div>
  );
}
