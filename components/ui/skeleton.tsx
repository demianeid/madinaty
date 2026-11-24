"use client";

import React, { useState } from "react";
import Image, { ImageProps } from "next/image";

// ========================================================
// 1. BASE SKELETON PRIMITIVE
// ========================================================
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "light" | "dark";
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({
  variant = "light",
  className = "",
  style,
  ...props
}: SkeletonProps) {
  const shimmerClass = variant === "dark" ? "skeleton-shimmer-dark" : "skeleton-shimmer";
  return (
    <div
      aria-hidden="true"
      className={`${shimmerClass} rounded-md ${className}`}
      style={style}
      {...props}
    />
  );
}

// ========================================================
// 2. SKELETON TEXT (HEADINGS & PARAGRAPHS)
// ========================================================
export interface SkeletonTextProps {
  lines?: number;
  heading?: boolean;
  lastLineWidth?: string;
  variant?: "light" | "dark";
  className?: string;
}

export function SkeletonText({
  lines = 3,
  heading = false,
  lastLineWidth = "65%",
  variant = "light",
  className = "",
}: SkeletonTextProps) {
  if (heading) {
    return (
      <Skeleton
        variant={variant}
        className={`h-7 sm:h-9 w-3/4 max-w-sm rounded-lg mb-2.5 ${className}`}
      />
    );
  }

  // Pre-calculated natural width variations for realistic paragraph layout
  const widths = ["100%", "92%", "96%", "88%", "94%"];

  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => {
        const isLast = index === lines - 1;
        const width = isLast && lines > 1 ? lastLineWidth : widths[index % widths.length];
        return (
          <Skeleton
            key={index}
            variant={variant}
            className="h-3.5 sm:h-4 rounded-sm"
            style={{ width }}
          />
        );
      })}
    </div>
  );
}

// ========================================================
// 3. SKELETON BUTTON
// ========================================================
export interface SkeletonButtonProps {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
  className?: string;
  style?: React.CSSProperties;
}

export function SkeletonButton({
  size = "md",
  variant = "light",
  className = "",
  style,
}: SkeletonButtonProps) {
  const heightClass =
    size === "sm" ? "h-8 px-3" : size === "lg" ? "h-12 px-6" : "h-[42px] px-5";

  return (
    <Skeleton
      variant={variant}
      className={`rounded-lg w-28 sm:w-32 ${heightClass} ${className}`}
      style={style}
    />
  );
}

// ========================================================
// 4. SKELETON AVATAR
// ========================================================
export interface SkeletonAvatarProps {
  size?: number | string;
  rounded?: "full" | "lg" | "xl" | "md";
  variant?: "light" | "dark";
  className?: string;
}

export function SkeletonAvatar({
  size = 40,
  rounded = "full",
  variant = "light",
  className = "",
}: SkeletonAvatarProps) {
  const roundClass =
    rounded === "full"
      ? "rounded-full"
      : rounded === "xl"
      ? "rounded-xl"
      : rounded === "md"
      ? "rounded-md"
      : "rounded-lg";

  const sizeStyle =
    typeof size === "number" ? { width: `${size}px`, height: `${size}px` } : { width: size, height: size };

  return (
    <Skeleton
      variant={variant}
      className={`shrink-0 ${roundClass} ${className}`}
      style={sizeStyle}
    />
  );
}

// ========================================================
// 5. SKELETON BADGE / PILL
// ========================================================
export interface SkeletonBadgeProps {
  variant?: "light" | "dark";
  className?: string;
  width?: string;
}

export function SkeletonBadge({
  variant = "light",
  className = "",
  width = "72px",
}: SkeletonBadgeProps) {
  return (
    <Skeleton
      variant={variant}
      className={`h-5 sm:h-6 rounded-md ${className}`}
      style={{ width }}
    />
  );
}

// ========================================================
// 6. SKELETON IMAGE
// ========================================================
export interface SkeletonImageProps extends Partial<ImageProps> {
  aspectRatio?: string;
  variant?: "light" | "dark";
  containerClassName?: string;
}

export function SkeletonImage({
  aspectRatio = "16/9",
  variant = "light",
  containerClassName = "",
  src,
  alt = "",
  className = "",
  ...props
}: SkeletonImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  // If no src provided, render pure placeholder
  if (!src) {
    return (
      <div
        className={`relative overflow-hidden rounded-xl ${containerClassName}`}
        style={{ aspectRatio }}
      >
        <Skeleton variant={variant} className="absolute inset-0 w-full h-full rounded-xl" />
      </div>
    );
  }

  // Interactive Next.js Image wrapper that reveals image once loaded
  return (
    <div
      className={`relative overflow-hidden rounded-xl ${containerClassName}`}
      style={{ aspectRatio }}
    >
      {!isLoaded && (
        <Skeleton
          variant={variant}
          className="absolute inset-0 w-full h-full rounded-xl z-10 transition-opacity duration-300"
        />
      )}
      <Image
        {...(props as ImageProps)}
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        className={`transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"} ${className}`}
      />
    </div>
  );
}

// ========================================================
// 7. SKELETON CARD
// ========================================================
export interface SkeletonCardProps {
  variant?: "light" | "dark";
  hasImage?: boolean;
  imageHeight?: string;
  className?: string;
  lines?: number;
}

export function SkeletonCard({
  variant = "light",
  hasImage = false,
  imageHeight = "160px",
  className = "",
  lines = 2,
}: SkeletonCardProps) {
  const bgSurface =
    variant === "dark"
      ? "bg-slate-900/60 border border-slate-700/60"
      : "bg-white border border-[#CBD5E1]/80";

  return (
    <div
      aria-hidden="true"
      className={`rounded-xl ${bgSurface} p-5 shadow-civic-1 flex flex-col justify-between ${className}`}
    >
      {hasImage && (
        <Skeleton
          variant={variant}
          className="w-full rounded-lg mb-4"
          style={{ height: imageHeight }}
        />
      )}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <SkeletonBadge variant={variant} width="84px" />
          <SkeletonBadge variant={variant} width="52px" />
        </div>
        <Skeleton variant={variant} className="h-5 w-3/4 rounded-md" />
        <SkeletonText lines={lines} variant={variant} />
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <Skeleton variant={variant} className="h-4 w-24 rounded-sm" />
        <Skeleton variant={variant} className="h-4 w-16 rounded-sm" />
      </div>
    </div>
  );
}

// ========================================================
// 8. SKELETON TABLE
// ========================================================
export interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  variant?: "light" | "dark";
  className?: string;
}

export function SkeletonTable({
  rows = 5,
  cols = 6,
  variant = "light",
  className = "",
}: SkeletonTableProps) {
  return (
    <div className={`overflow-x-auto ${className}`} aria-hidden="true">
      <table className="w-full text-right text-xs">
        <thead className="bg-[#F1F5F9] border-b border-[#CBD5E1]">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="py-3 px-4">
                <Skeleton variant={variant} className="h-4 w-20 rounded-sm" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {Array.from({ length: rows }).map((_, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-50/50">
              {Array.from({ length: cols }).map((_, cIdx) => (
                <td key={cIdx} className="py-3.5 px-4">
                  {cIdx === 0 ? (
                    <Skeleton variant={variant} className="h-4 w-24 rounded-sm" />
                  ) : cIdx === 1 ? (
                    <Skeleton variant={variant} className="h-4 w-36 sm:w-48 rounded-sm" />
                  ) : cIdx === cols - 1 ? (
                    <Skeleton variant={variant} className="h-7 w-16 rounded-lg mx-auto" />
                  ) : (
                    <Skeleton variant={variant} className="h-4 w-20 rounded-sm" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ========================================================
// 9. COMPOSITE SKELETONS FOR WHOLE PAGES / SECTIONS
// ========================================================

/**
 * Skeleton for Notification items in center or bell dropdown
 */
export function NotificationItemSkeleton({ variant = "light" }: { variant?: "light" | "dark" }) {
  return (
    <div
      aria-hidden="true"
      className="p-4 rounded-xl border border-[#CBD5E1] bg-white flex items-start gap-3.5"
    >
      <SkeletonAvatar size={38} variant={variant} rounded="xl" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Skeleton variant={variant} className="h-4 w-1/3 rounded-sm" />
          <Skeleton variant={variant} className="h-3 w-16 rounded-sm" />
        </div>
        <Skeleton variant={variant} className="h-3.5 w-5/6 rounded-sm" />
        <div className="flex items-center gap-2 pt-1">
          <SkeletonBadge variant={variant} width="60px" />
          <SkeletonBadge variant={variant} width="80px" />
        </div>
      </div>
    </div>
  );
}

/**
 * Notifications Page Full View Skeleton
 */
export function NotificationsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="جاري تحميل مركز الإشعارات">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-16 rounded-sm" />
        <span className="text-slate-400">/</span>
        <Skeleton className="h-3 w-32 rounded-sm" />
      </div>

      {/* Header Title Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56 rounded-lg" />
          <Skeleton className="h-4 w-80 sm:w-96 rounded-sm" />
        </div>
        <SkeletonButton size="sm" className="w-36" />
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2 border-b border-[#CBD5E1] pb-3">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      {/* Items Skeletons */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <NotificationItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Public Track Report Result Skeleton
 */
export function TrackReportSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="جاري تحميل نتيجة الاستعلام">
      {/* Status Header Card */}
      <div className="rounded-xl border border-[#CBD5E1] bg-white p-6 shadow-civic-1 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-6 w-28 rounded-md" />
              <SkeletonBadge width="80px" />
              <SkeletonBadge width="90px" />
              <SkeletonBadge width="110px" />
            </div>
            <Skeleton className="h-7 w-64 sm:w-80 rounded-lg" />
            <Skeleton className="h-3.5 w-44 rounded-sm" />
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Skeleton className="h-4 w-28 rounded-sm" />
            <Skeleton className="h-3.5 w-36 rounded-sm" />
          </div>
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-32 rounded-sm" />
          <SkeletonText lines={3} />
        </div>
      </div>

      {/* Grid: Map & Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[#CBD5E1] bg-white p-6 shadow-civic-1 space-y-4">
          <Skeleton className="h-5 w-36 rounded-md" />
          <Skeleton className="h-[220px] w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4 rounded-sm" />
        </div>
        <div className="rounded-xl border border-[#CBD5E1] bg-white p-6 shadow-civic-1 space-y-4">
          <Skeleton className="h-5 w-40 rounded-md" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <Skeleton className="h-4 w-24 rounded-sm" />
                <Skeleton className="h-4 w-32 rounded-sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Report Details View Skeleton
 */
export function ReportDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="جاري تحميل تفاصيل البلاغ">
      {/* Top Banner Skeleton */}
      <div className="rounded-xl border border-[#CBD5E1] bg-white p-6 sm:p-8 shadow-civic-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-6 w-32 rounded-md" />
              <SkeletonBadge width="90px" />
              <SkeletonBadge width="100px" />
              <SkeletonBadge width="120px" />
            </div>
            <Skeleton className="h-8 w-72 sm:w-96 rounded-lg" />
            <Skeleton className="h-4 w-48 rounded-sm" />
          </div>
          <div className="flex flex-wrap gap-2">
            <SkeletonButton size="sm" className="w-24" />
            <SkeletonButton size="sm" className="w-24" />
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <Skeleton className="h-4 w-28 rounded-sm" />
          <SkeletonText lines={3} />
        </div>
      </div>

      {/* Main Content Grid: Content (2 cols) & Sidebar (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Photos Skeleton */}
          <div className="rounded-xl border border-[#CBD5E1] bg-white p-6 shadow-civic-1 space-y-4">
            <Skeleton className="h-5 w-32 rounded-md" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          </div>

          {/* Location Map Skeleton */}
          <div className="rounded-xl border border-[#CBD5E1] bg-white p-6 shadow-civic-1 space-y-4">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-[240px] w-full rounded-xl" />
            <Skeleton className="h-4 w-2/3 rounded-sm" />
          </div>

          {/* Timeline History Skeleton */}
          <div className="rounded-xl border border-[#CBD5E1] bg-white p-6 shadow-civic-1 space-y-4">
            <Skeleton className="h-5 w-44 rounded-md" />
            <div className="space-y-4 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <SkeletonAvatar size={28} rounded="full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-1/3 rounded-sm" />
                    <Skeleton className="h-3 w-1/4 rounded-sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Actions Skeleton */}
        <div className="space-y-6">
          <div className="rounded-xl border border-[#CBD5E1] bg-white p-6 shadow-civic-1 space-y-4">
            <Skeleton className="h-5 w-36 rounded-md" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <Skeleton className="h-4 w-20 rounded-sm" />
                  <Skeleton className="h-4 w-28 rounded-sm" />
                </div>
              ))}
            </div>
            <SkeletonButton className="w-full mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard Overview Skeleton (for Citizens and Staff)
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="جاري تحميل لوحة التحكم">
      {/* Welcome Banner Skeleton */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-civic-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2.5">
            <Skeleton className="h-4 w-28 rounded-sm" />
            <Skeleton className="h-8 w-56 sm:w-72 rounded-lg" />
            <Skeleton className="h-4 w-72 sm:w-96 rounded-sm" />
          </div>
          <div className="flex items-center gap-3">
            <SkeletonButton className="w-32" />
          </div>
        </div>
      </div>

      {/* KPI 4-Card Row Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-civic-1 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20 rounded-sm" />
              <SkeletonAvatar size={24} rounded="md" />
            </div>
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-3 w-28 rounded-sm" />
          </div>
        ))}
      </div>

      {/* Reports Table Skeleton */}
      <div className="rounded-xl border border-slate-200/90 bg-white shadow-civic-1 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-3.5 w-60 rounded-sm" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-44 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
        <SkeletonTable rows={5} cols={6} />
      </div>
    </div>
  );
}

/**
 * Admin Dashboard View Skeleton
 */
export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="جاري تحميل لوحة الإدارة">
      {/* Admin Top Banner Skeleton */}
      <div className="rounded-xl bg-gradient-to-l from-[#142D4E] via-[#1D4ED8] to-[#2563EB] p-6 sm:p-8 shadow-civic-3 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton variant="dark" className="h-5 w-40 rounded-full" />
            <Skeleton variant="dark" className="h-8 w-64 sm:w-80 rounded-lg" />
            <Skeleton variant="dark" className="h-4 w-80 sm:w-96 rounded-sm" />
          </div>
          <Skeleton variant="dark" className="h-9 w-32 rounded-lg" />
        </div>
        <div className="flex gap-2 pt-3 border-t border-white/10">
          <Skeleton variant="dark" className="h-8 w-36 rounded-lg" />
          <Skeleton variant="dark" className="h-8 w-36 rounded-lg" />
          <Skeleton variant="dark" className="h-8 w-36 rounded-lg" />
        </div>
      </div>

      {/* Audit Logs / Stats Table Container Skeleton */}
      <div className="rounded-xl border border-[#CBD5E1] bg-white shadow-civic-1 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="h-3.5 w-72 rounded-sm" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
        </div>
        <SkeletonTable rows={6} cols={5} />
      </div>
    </div>
  );
}

/**
 * New Report Form Skeleton
 */
export function NewReportFormSkeleton() {
  return (
    <div className="rounded-xl border border-[#CBD5E1] bg-white p-6 sm:p-8 shadow-civic-1 space-y-6" aria-busy="true" aria-label="جاري تهيئة نموذج البلاغ">
      <div className="space-y-2 border-b border-slate-100 pb-4">
        <Skeleton className="h-7 w-52 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded-sm" />
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24 rounded-sm" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28 rounded-sm" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32 rounded-sm" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28 rounded-sm" />
          <Skeleton className="h-[280px] w-full rounded-xl" />
        </div>
        <div className="pt-2">
          <SkeletonButton className="w-full sm:w-48" size="lg" />
        </div>
      </div>
    </div>
  );
}
