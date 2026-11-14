"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMapType } from "leaflet";
import { ReportStatus } from "@prisma/client";

export interface FieldMapReport {
  id: string;
  publicReference: string;
  title: string;
  status: ReportStatus;
  latitude: number;
  longitude: number;
  addressText?: string | null;
  category?: { labelAr: string } | null;
}

interface FieldMapProps {
  reports: FieldMapReport[];
  className?: string;
  height?: string;
}

/** Returns a hex color for each report status */
function statusColor(status: ReportStatus): string {
  switch (status) {
    case ReportStatus.NEW:
      return "#0284c7"; // Sky blue
    case ReportStatus.ASSIGNED:
      return "#7c3aed"; // Violet
    case ReportStatus.IN_PROGRESS:
      return "#d97706"; // Amber
    case ReportStatus.WAITING_FOR_RESIDENT:
      return "#f59e0b"; // Orange
    case ReportStatus.RESOLVED:
    case ReportStatus.CLOSED:
      return "#16a34a"; // Emerald green
    case ReportStatus.REJECTED:
    case ReportStatus.CLOSED_NO_RESPONSE:
      return "#dc2626"; // Red
    default:
      return "#64748b"; // Slate
  }
}

/** Arabic label for each status */
function statusLabel(status: ReportStatus): string {
  switch (status) {
    case ReportStatus.NEW:              return "جديد";
    case ReportStatus.ASSIGNED:         return "مُسند";
    case ReportStatus.IN_PROGRESS:      return "قيد العمل";
    case ReportStatus.WAITING_FOR_RESIDENT: return "بانتظار المواطن";
    case ReportStatus.RESOLVED:         return "تمت المعالجة";
    case ReportStatus.CLOSED:           return "مغلق";
    case ReportStatus.REJECTED:         return "مرفوض";
    case ReportStatus.CLOSED_NO_RESPONSE: return "مغلق / لا رد";
    default:                            return status;
  }
}

/** Build a custom SVG pin div-icon for Leaflet */
function buildPinHtml(color: string): string {
  return `
    <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <div style="
        background-color: ${color};
        width: 28px; height: 28px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 3px 8px rgba(0,0,0,0.25);
        border: 2px solid white;
      ">
        <span style="transform: rotate(45deg); font-size: 11px; color: white; font-weight: bold;">●</span>
      </div>
      <div style="width: 8px; height: 3px; background: rgba(0,0,0,0.2); border-radius: 50%; margin-top: 1px;"></div>
    </div>
  `;
}

// Madinaty, Cairo default center
const DEFAULT_CENTER: [number, number] = [30.071, 31.634];
const DEFAULT_ZOOM = 13;

export function FieldMap({ reports, className = "", height = "400px" }: FieldMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMapType | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const reportsWithCoords = reports.filter(
    (r) => typeof r.latitude === "number" && typeof r.longitude === "number"
  );

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (!isMounted || !mapContainerRef.current) return;

      // Determine map center — use first report with coords if available, else Madinaty
      const center: [number, number] =
        reportsWithCoords.length > 0
          ? [reportsWithCoords[0].latitude, reportsWithCoords[0].longitude]
          : DEFAULT_CENTER;

      const map = L.map(mapContainerRef.current, {
        center,
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
      });

      L.control
        .zoom({
          position: "topleft",
          zoomInTitle: "تكبير الخريطة",
          zoomOutTitle: "تصغير الخريطة",
        })
        .addTo(map);

      const tileUrl =
        process.env.NEXT_PUBLIC_MAP_TILE_URL ||
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

      L.tileLayer(tileUrl, {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Add a marker for every report with coordinates
      for (const report of reportsWithCoords) {
        const color = statusColor(report.status);
        const icon = L.divIcon({
          className: "field-map-marker",
          html: buildPinHtml(color),
          iconSize: [28, 36],
          iconAnchor: [14, 36],
        });

        const popupContent = `
          <div dir="rtl" style="font-family: system-ui, sans-serif; min-width: 200px; max-width: 240px;">
            <p style="font-size: 10px; font-weight: 700; color: #64748b; margin: 0 0 2px 0;">${report.publicReference}</p>
            <p style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 0 0 6px 0; line-height: 1.4;">${report.title}</p>
            <span style="
              display: inline-block;
              background: ${color}22;
              color: ${color};
              border: 1px solid ${color}55;
              border-radius: 20px;
              padding: 2px 10px;
              font-size: 10px;
              font-weight: 700;
              margin-bottom: 8px;
            ">${statusLabel(report.status)}</span>
            ${report.addressText ? `<p style="font-size: 10px; color: #64748b; margin: 0 0 6px 0;">📍 ${report.addressText}</p>` : ""}
            ${report.category?.labelAr ? `<p style="font-size: 10px; color: #64748b; margin: 0 0 8px 0;">🏷 ${report.category.labelAr}</p>` : ""}
            <a href="/reports/${report.id}" style="
              display: inline-block;
              background: #007766;
              color: white;
              text-decoration: none;
              padding: 4px 12px;
              border-radius: 6px;
              font-size: 10px;
              font-weight: 700;
            ">عرض التفاصيل</a>
          </div>
        `;

        L.marker([report.latitude, report.longitude], { icon })
          .addTo(map)
          .bindPopup(popupContent, {
            maxWidth: 260,
            className: "field-map-popup",
          });
      }

      // Fit bounds if more than one report
      if (reportsWithCoords.length > 1) {
        const latLngs = reportsWithCoords.map(
          (r) => [r.latitude, r.longitude] as [number, number]
        );
        map.fitBounds(latLngs, { padding: [32, 32] });
      }

      mapInstanceRef.current = map;
      setMapReady(true);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-add markers when reports change (after initial mount)
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    // We re-initialize on reports change by clearing and re-adding layers
    // This is safe since we don't store marker refs individually
    // For production: use a proper layer group; for now, full re-init handled by key-prop on parent
  }, [reports, mapReady]);

  const legendItems = [
    { color: "#0284c7", label: "جديد" },
    { color: "#7c3aed", label: "مُسند" },
    { color: "#d97706", label: "قيد العمل" },
    { color: "#f59e0b", label: "بانتظار مواطن" },
    { color: "#16a34a", label: "مُعالج / مغلق" },
    { color: "#dc2626", label: "مرفوض" },
  ];

  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      {/* Map Canvas */}
      <div ref={mapContainerRef} style={{ height }} className="w-full z-0" dir="ltr" />

      {/* Top-right control strip */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {/* Pin count badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm px-3 py-1.5 text-[11px] font-bold text-slate-700">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: "#007766" }}
          />
          {reportsWithCoords.length} بلاغ على الخريطة
        </div>

        {/* Legend toggle */}
        <button
          type="button"
          onClick={() => setShowLegend((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-[#ecfdf5] hover:text-[#007766] hover:border-[#007766]/30 transition-all cursor-pointer"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="0" y="0" width="4" height="4" rx="1" />
            <rect x="0" y="8" width="4" height="4" rx="1" />
            <rect x="6" y="1" width="6" height="2" rx="1" />
            <rect x="6" y="9" width="6" height="2" rx="1" />
          </svg>
          دليل الألوان
        </button>
      </div>

      {/* Legend panel */}
      {showLegend && (
        <div
          dir="rtl"
          className="absolute top-14 right-3 z-10 rounded-xl bg-white/97 backdrop-blur-sm border border-slate-200 shadow-md p-3 min-w-[160px]"
        >
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wide mb-2">
            الحالة
          </p>
          <div className="space-y-1.5">
            {legendItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[11px] font-semibold text-slate-700">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state overlay */}
      {reportsWithCoords.length === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <svg
              className="h-7 w-7 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 20.25l-6.75-6.75a1.5 1.5 0 010-2.12L9 4.5m6 15.75l6.75-6.75a1.5 1.5 0 000-2.12L15 4.5"
              />
            </svg>
          </div>
          <p className="text-sm font-bold text-slate-700" dir="rtl">
            لا توجد بلاغات مُحدَّدة الموقع
          </p>
          <p className="text-xs text-slate-500 mt-1" dir="rtl">
            البلاغات التي تحتوي على إحداثيات ستظهر هنا
          </p>
        </div>
      )}
    </div>
  );
}

