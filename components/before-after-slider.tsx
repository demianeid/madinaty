"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeAlt?: string;
  afterAlt?: string;
  beforeLabel?: string;
  afterLabel?: string;
  initialPosition?: number;
}

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeAlt = "قبل الإصلاح",
  afterAlt = "بعد الإصلاح والاعتماد",
  beforeLabel = "قبل الإصلاح",
  afterLabel = "بعد الإصلاح والاعتماد",
  initialPosition = 50,
}: BeforeAfterSliderProps) {
  const [sliderPos, setSliderPos] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pos);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    try {
      containerRef.current?.setPointerCapture(e.pointerId);
    } catch {}
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      containerRef.current?.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSliderPos((prev) => Math.max(0, prev - 5));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSliderPos((prev) => Math.min(100, prev + 5));
    } else if (e.key === "Home") {
      e.preventDefault();
      setSliderPos(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setSliderPos(100);
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden select-none touch-none cursor-ew-resize bg-slate-100"
      style={{ WebkitUserSelect: "none" }}
    >
      {/* Base Layer: Before Image (visible on the right side) */}
      <Image
        src={beforeImage}
        alt={beforeAlt}
        fill
        sizes="(max-width: 1024px) 100vw, 896px"
        className="object-cover select-none pointer-events-none"
        priority
      />

      {/* Top Layer: After Image (clipped to slider position, visible from 0% on the left to sliderPos) */}
      <div
        className="absolute inset-0 overflow-hidden select-none pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
      >
        <Image
          src={afterImage}
          alt={afterAlt}
          fill
          sizes="(max-width: 1024px) 100vw, 896px"
          className="object-cover select-none pointer-events-none"
          priority
        />
      </div>

      {/* Divider Line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none z-20"
        style={{ left: `${sliderPos}%` }}
      />

      {/* Draggable Circular Handle */}
      <div
        role="slider"
        tabIndex={0}
        aria-valuenow={Math.round(sliderPos)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="مقارنة الصورة قبل وبعد الإصلاح"
        onKeyDown={handleKeyDown}
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-[#142D4E] shadow-[0_4px_16px_rgba(0,0,0,0.35)] border-2 border-white flex items-center justify-center cursor-ew-resize hover:scale-110 active:scale-95 transition-transform z-30 focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
        style={{ left: `${sliderPos}%` }}
      >
        <svg
          className="w-5 h-5 text-[#0D9488]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-4 3 4 3m8-6l4 3-4 3" />
        </svg>
      </div>

      {/* Floating Badge: After (Left side) */}
      <div
        className="absolute top-3.5 left-3.5 z-20 pointer-events-none transition-opacity duration-200"
        style={{ opacity: sliderPos > 14 ? 1 : 0 }}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#047857]/95 text-white backdrop-blur-md px-3 py-1 text-xs font-bold border border-white/20 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
          <span>{afterLabel}</span>
        </span>
      </div>

      {/* Floating Badge: Before (Right side) */}
      <div
        className="absolute top-3.5 right-3.5 z-20 pointer-events-none transition-opacity duration-200"
        style={{ opacity: sliderPos < 86 ? 1 : 0 }}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-600/95 text-white backdrop-blur-md px-3 py-1 text-xs font-bold border border-white/20 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-200" />
          <span>{beforeLabel}</span>
        </span>
      </div>

      {/* Floating Center Hint */}
      <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none inline-flex items-center gap-1.5 rounded-full bg-slate-950/65 backdrop-blur-md text-white text-[11px] font-medium px-3.5 py-1 shadow-md border border-white/10">
        <svg className="w-3.5 h-3.5 text-[#A7F3D0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l-4 3 4 3m8-6l4 3-4 3" />
        </svg>
        <span>اسحب المؤشر للمقارنة</span>
      </div>
    </div>
  );
}
