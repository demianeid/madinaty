"use client";

import React, { Suspense } from "react";
import { usePathname } from "next/navigation";

/**
 * WebsiteBackground
 * -----------------
 * Full website-wide layered background system for Madinaty.
 * Creates an organic, flowing, navy-dominant canvas inspired by the brand reference artwork.
 * Automatically disabled on dashboard, admin, and report consoles for clean civic readability.
 * Wrapped in Suspense to prevent Next.js prerender/streaming route blocking on dynamic routes.
 */
function WebsiteBackgroundContent() {
  const pathname = usePathname();
  const isExcluded =
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/reports");

  if (isExcluded) {
    return null;
  }

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
            <stop offset="100%" stopColor="#142D4E" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <path
          d="M0,280 C360,180 720,380 1080,240 C1260,170 1380,210 1440,230 L1440,1000 L0,1000 Z"
          fill="url(#madinatyWaveGrad1)"
        />
        <path
          d="M0,520 C280,440 680,620 1040,480 C1240,400 1380,460 1440,490 L1440,1000 L0,1000 Z"
          fill="url(#madinatyWaveGrad2)"
        />
      </svg>
    </div>
  );
}

export function WebsiteBackground() {
  return (
    <Suspense fallback={null}>
      <WebsiteBackgroundContent />
    </Suspense>
  );
}
