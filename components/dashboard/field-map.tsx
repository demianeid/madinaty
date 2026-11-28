"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import type {
  Map as LeafletMapType,
  LayerGroup as LeafletLayerGroupType,
  TileLayer as LeafletTileLayerType,
} from "leaflet";
import { ReportStatus } from "@prisma/client";
import { Skeleton } from "@/components/ui/skeleton";

export interface FieldMapReport {
  id: string;
  publicReference: string;
  title: string;
  description?: string;
  status: ReportStatus;
  createdAt: string;
  latitude: number;
  longitude: number;
  addressText?: string | null;
  category?: { labelAr: string } | null;
  authority?: { slug: string; nameAr: string } | null;
  media?: Array<{ id: string; storageKey: string; isResolutionPhoto: boolean }>;
  createdBy?: { name: string; email: string; phoneNumber?: string | null } | null;
}

interface FieldMapProps {
  reports: FieldMapReport[];
  className?: string;
  height?: string;
  onSelectReport?: (report: FieldMapReport) => void;
  hoveredReportId?: string | null;
  selectedReportId?: string | null;
}

/** Returns a hex color for each report status */
function statusColor(status: ReportStatus): string {
  switch (status) {
    case ReportStatus.NEW:
      return "#0891B2"; // Oceanic Cyan
    case ReportStatus.UNDER_REVIEW:
      return "#B45309"; // Amber
    case ReportStatus.ASSIGNED:
      return "#0369A1"; // Blue/Sky
    case ReportStatus.IN_PROGRESS:
      return "#3730A3"; // Indigo
    case ReportStatus.WAITING_FOR_RESIDENT:
      return "#92400E"; // Condition Pill Text Amber
    case ReportStatus.RESOLVED:
      return "#047857"; // Emerald/Green
    case ReportStatus.CLOSED:
      return "#334155"; // Slate Dark
    case ReportStatus.CLOSED_NO_RESPONSE:
      return "#475569"; // Slate Muted
    case ReportStatus.REJECTED:
      return "#B91C1C"; // Red
    default:
      return "#64748B"; // Neutral Gray
  }
}


/** Calculate haversine distance in meters between two coordinates */
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Check if report is urgent / delayed (> 48h active) */
function isReportUrgent(createdAt: string, status: ReportStatus): boolean {
  if (
    status === ReportStatus.RESOLVED ||
    status === ReportStatus.CLOSED ||
    status === ReportStatus.REJECTED
  ) {
    return false;
  }
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return ageHours >= 48;
}

/** Build an SVG map pin pointing directly down with ground contact shadow, active ring, and SLA pulse ring */
function buildPinHtml(
  color: string,
  isUrgent: boolean,
  isHovered: boolean,
  isSelected: boolean
): string {
  return `
    <div style="width: 36px; height: 46px; position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1); ${
      isSelected
        ? "transform: scale(1.32) translateY(-9px); z-index: 9999;"
        : isHovered
        ? "transform: scale(1.18) translateY(-5px); z-index: 9990;"
        : ""
    }">
      ${
        isSelected
          ? `<div style="
              position: absolute;
              top: -6px;
              left: -5px;
              width: 46px;
              height: 46px;
              border-radius: 50%;
              border: 3px solid #0891B2;
              background: rgba(8, 145, 178, 0.22);
              box-shadow: 0 0 16px rgba(8, 145, 178, 0.55);
              pointer-events: none;
            "></div>`
          : isUrgent
          ? `<div style="
              position: absolute;
              top: -6px;
              left: -4px;
              width: 44px;
              height: 44px;
              border-radius: 50%;
              background: rgba(220, 38, 38, 0.35);
              animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
              pointer-events: none;
            "></div>`
          : ""
      }
      <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 8px rgba(15,23,42,0.32));">
        <!-- Ground contact shadow ellipse -->
        <ellipse cx="18" cy="43.5" rx="5.5" ry="2" fill="rgba(15,23,42,0.28)"/>
        <!-- Teardrop pin body pointing straight down to (18, 43) -->
        <path d="M18 1.5C9.44 1.5 2.5 8.44 2.5 17C2.5 27.8 18 43 18 43C18 43 33.5 27.8 33.5 17C33.5 8.44 26.56 1.5 18 1.5Z" fill="${color}" stroke="${
          isSelected ? "#0891B2" : "#FFFFFF"
        }" stroke-width="${isSelected ? "3.6" : isHovered ? "3.2" : "2.2"}" stroke-linejoin="round"/>
        <!-- Inner white disc for crisp contrast -->
        <circle cx="18" cy="16.5" r="6" fill="#FFFFFF"/>
        <!-- Inner status color dot -->
        <circle cx="18" cy="16.5" r="3.2" fill="${color}"/>
      </svg>
    </div>
  `;
}

/** Build a cluster badge marker */
function buildClusterHtml(count: number): string {
  return `
    <div style="
      width: 42px; height: 42px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0891B2 0%, #0e7490 100%);
      color: white;
      border: 3px solid white;
      box-shadow: 0 4px 14px rgba(8, 145, 178, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 13px;
      font-family: system-ui, -apple-system, sans-serif;
      cursor: pointer;
      transition: transform 0.16s ease;
    ">
      +${count}
    </div>
  `;
}

// Alexandria Governorate default center (Sidi Gaber / Smouha)
const DEFAULT_CENTER: [number, number] = [31.2001, 29.9187];
const DEFAULT_ZOOM = 13;

export function FieldMap({
  reports,
  className = "",
  height = "400px",
  onSelectReport,
  hoveredReportId,
  selectedReportId,
}: FieldMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMapType | null>(null);
  const markersLayerRef = useRef<LeafletLayerGroupType | null>(null);
  const ambientDensityLayerRef = useRef<LeafletLayerGroupType | null>(null);
  const streetTileLayerRef = useRef<LeafletTileLayerType | null>(null);
  const satelliteTileLayerRef = useRef<LeafletTileLayerType | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletModuleRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapMode, setMapMode] = useState<"streets" | "satellite">("streets");
  const [enableClustering, setEnableClustering] = useState(true);
  const [activeStatusFilter, setActiveStatusFilter] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<FieldMapReport | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const hasAutoFittedRef = useRef(false);

  const reportsWithCoords = useMemo(
    () => reports.filter((r) => typeof r.latitude === "number" && typeof r.longitude === "number"),
    [reports]
  );

  // Filtered reports by active status filter if selected
  const displayedReports = useMemo(() => {
    return activeStatusFilter
      ? reportsWithCoords.filter((r) => r.status === activeStatusFilter)
      : reportsWithCoords;
  }, [reportsWithCoords, activeStatusFilter]);

  // Search results for fullscreen quick jump (by reference, title, or street/address)
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return reportsWithCoords
      .filter(
        (r) =>
          r.publicReference.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          (r.addressText && r.addressText.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [reportsWithCoords, searchQuery]);

  // Global helper for opening preview drawer from Leaflet popup DOM
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__madinaty_preview = (reportId: string) => {
      const matched = reportsWithCoords.find((r) => r.id === reportId);
      if (matched && onSelectReport) {
        onSelectReport(matched);
      }
    };
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__madinaty_preview;
    };
  }, [reportsWithCoords, onSelectReport]);

  // Initialize Map container once
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      // Clear any stale _leaflet_id left by StrictMode/HMR
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((mapContainerRef.current as any)._leaflet_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (mapContainerRef.current as any)._leaflet_id;
      }

      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (!isMounted || !mapContainerRef.current) return;
      leafletModuleRef.current = L;

      // Determine initial center
      const center: [number, number] =
        reportsWithCoords.length > 0
          ? [reportsWithCoords[0].latitude, reportsWithCoords[0].longitude]
          : DEFAULT_CENTER;

      // Configure map with smooth inertia and scrollWheelZoom disabled to prevent scroll trap
      const map = L.map(mapContainerRef.current, {
        center,
        zoom: DEFAULT_ZOOM,
        zoomControl: false, // We use unified modern floating controls
        scrollWheelZoom: false, // Prevents mouse wheel scrolling from trapping page scroll
        doubleClickZoom: true,
        touchZoom: true,
        boxZoom: true,
        bounceAtZoomLimits: true,
        inertia: true,
        inertiaDeceleration: 3000,
        inertiaMaxSpeed: 1500,
        easeLinearity: 0.2,
        fadeAnimation: true,
        zoomAnimation: true,
        markerZoomAnimation: true,
      });

      map.on("zoomend", () => {
        setCurrentZoom(map.getZoom());
      });

      map.on("click", (e) => {
        // Dismiss selected report card if clicking map canvas
        if (!(e.originalEvent.target as HTMLElement).closest(".field-map-marker")) {
          setSelectedReport(null);
        }
      });

      // Standard OSM Tile Layer
      const streetUrl =
        process.env.NEXT_PUBLIC_MAP_TILE_URL ||
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

      const streetLayer = L.tileLayer(streetUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Satellite Tile Layer (Esri World Imagery)
      const satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: '&copy; <a href="https://www.esri.com/" target="_blank">Esri</a>, Maxar, Earthstar Geographics',
          maxZoom: 19,
        }
      );

      streetTileLayerRef.current = streetLayer;
      satelliteTileLayerRef.current = satelliteLayer;

      // Managed layers (Ambient density halos on ground, markers & clusters on top)
      const ambientDensityGroup = L.layerGroup().addTo(map);
      const markersGroup = L.layerGroup().addTo(map);

      ambientDensityLayerRef.current = ambientDensityGroup;
      markersLayerRef.current = markersGroup;

      mapInstanceRef.current = map;
      setMapReady(true);
    }

    initMap();

    return () => {
      isMounted = false;
      if (ambientDensityLayerRef.current) {
        try {
          ambientDensityLayerRef.current.clearLayers();
        } catch {
          // Ignore cleanup errors
        }
        ambientDensityLayerRef.current = null;
      }
      if (markersLayerRef.current) {
        try {
          markersLayerRef.current.clearLayers();
        } catch {
          // Ignore cleanup errors
        }
        markersLayerRef.current = null;
      }
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop();
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch {
          // Prevent Leaflet teardown DOM exceptions
        }
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Tile Layer Switch (Streets vs Satellite)
  useEffect(() => {
    if (
      !mapReady ||
      !mapInstanceRef.current ||
      !streetTileLayerRef.current ||
      !satelliteTileLayerRef.current
    )
      return;
    const map = mapInstanceRef.current;
    if (mapMode === "satellite") {
      map.removeLayer(streetTileLayerRef.current);
      map.addLayer(satelliteTileLayerRef.current);
    } else {
      map.removeLayer(satelliteTileLayerRef.current);
      map.addLayer(streetTileLayerRef.current);
    }
  }, [mapMode, mapReady]);

  // Toggle scrollWheelZoom, body scroll lock, and invalidate map size on fullscreen toggle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map) {
      if (isFullscreen) {
        map.scrollWheelZoom.enable();
      } else {
        map.scrollWheelZoom.disable();
      }
      map.invalidateSize();
    }

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    let prevOverflow: string | undefined;
    if (isFullscreen && typeof document !== "undefined") {
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    if (!isFullscreen) {
      setSearchQuery("");
    }

    return () => {
      clearTimeout(timer);
      if (prevOverflow !== undefined && typeof document !== "undefined") {
        document.body.style.overflow = prevOverflow;
      }
    };
  }, [isFullscreen, mapReady]);

  // Auto-center and fit bounds on initial load when reports with coordinates are ready
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || reportsWithCoords.length === 0) return;

    if (!hasAutoFittedRef.current) {
      hasAutoFittedRef.current = true;
      if (reportsWithCoords.length === 1) {
        mapInstanceRef.current.setView(
          [reportsWithCoords[0].latitude, reportsWithCoords[0].longitude],
          15,
          { animate: true }
        );
      } else {
        const latLngs = reportsWithCoords.map(
          (r) => [r.latitude, r.longitude] as [number, number]
        );
        mapInstanceRef.current.fitBounds(latLngs, {
          padding: [50, 50],
          maxZoom: 15,
          animate: true,
        });
      }
    }
  }, [mapReady, reportsWithCoords]);

  // Handle ESC key to clear search first or exit fullscreen
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isFullscreen) {
        if (searchQuery.trim()) {
          setSearchQuery("");
        } else {
          setIsFullscreen(false);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen, searchQuery]);

  // Jump immediately to a searched report on the map
  const handleJumpToReport = (report: FieldMapReport) => {
    setSelectedReport(report);
    setSearchQuery("");
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([report.latitude, report.longitude], 17, {
        animate: true,
        duration: 0.7,
      });
    }
    if (onSelectReport) {
      onSelectReport(report);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER MARKERS / CLUSTERS & SUBTLE AMBIENT DENSITY HALOS
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (
      !mapReady ||
      !mapInstanceRef.current ||
      !markersLayerRef.current ||
      !ambientDensityLayerRef.current ||
      !leafletModuleRef.current
    )
      return;

    const L = leafletModuleRef.current;
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const ambientLayer = ambientDensityLayerRef.current;

    markersLayer.clearLayers();
    ambientLayer.clearLayers();

    if (displayedReports.length === 0) return;

    // ── 1. Pure Geographical Density Hotspots (Adaptive Multi-tier Warm Bloom) ──
    const zoomFactor =
      currentZoom >= 16 ? 0.55 : currentZoom >= 14 ? 0.8 : currentZoom <= 11 ? 1.35 : 1.0;

    // Radius within which nearby reports contribute to local concentration (approx 650m)
    const DENSITY_RADIUS_METERS = 650;

    for (const report of displayedReports) {
      // Calculate how many reports are in the immediate vicinity
      let neighborCount = 0;
      for (const other of displayedReports) {
        if (
          getDistanceMeters(
            report.latitude,
            report.longitude,
            other.latitude,
            other.longitude
          ) <= DENSITY_RADIUS_METERS
        ) {
          neighborCount++;
        }
      }

      // Pure density grading (Noticeable yet subtle and soft)
      let haloColor = "#f59e0b"; // Warm amber (low/solo)
      let outerRadius = Math.max(160, 260 * zoomFactor);
      let innerRadius = outerRadius * 0.55;
      let outerOpacity = 0.05;
      let innerOpacity = 0.08;

      if (neighborCount >= 7) {
        // High density hotspot (Deep warm orange/amber)
        haloColor = "#ea580c";
        outerRadius = Math.max(260, 480 * zoomFactor);
        innerRadius = outerRadius * 0.55;
        outerOpacity = 0.08;
        innerOpacity = 0.15;
      } else if (neighborCount >= 4) {
        // Medium density cluster (Warm orange)
        haloColor = "#f97316";
        outerRadius = Math.max(220, 380 * zoomFactor);
        innerRadius = outerRadius * 0.55;
        outerOpacity = 0.07;
        innerOpacity = 0.12;
      } else if (neighborCount >= 2) {
        // Low-to-medium density (Golden amber)
        haloColor = "#f59e0b";
        outerRadius = Math.max(190, 310 * zoomFactor);
        innerRadius = outerRadius * 0.55;
        outerOpacity = 0.06;
        innerOpacity = 0.10;
      }

      // Outer soft diffused perimeter
      L.circle([report.latitude, report.longitude], {
        radius: outerRadius,
        color: "transparent",
        fillColor: haloColor,
        fillOpacity: outerOpacity,
        interactive: false,
      }).addTo(ambientLayer);

      // Inner glowing core
      L.circle([report.latitude, report.longitude], {
        radius: innerRadius,
        color: "transparent",
        fillColor: haloColor,
        fillOpacity: innerOpacity,
        interactive: false,
      }).addTo(ambientLayer);
    }

    // ── 2. Distance clustering & markers on top ──
    const clusterDistThreshold =
      currentZoom <= 11 ? 0.045 : currentZoom <= 13 ? 0.015 : currentZoom <= 15 ? 0.005 : 0;

    type ClusterItem = {
      lat: number;
      lng: number;
      reports: FieldMapReport[];
    };

    const clusters: ClusterItem[] = [];

    if (enableClustering && clusterDistThreshold > 0) {
      for (const report of displayedReports) {
        let added = false;
        for (const cluster of clusters) {
          const dLat = Math.abs(cluster.lat - report.latitude);
          const dLng = Math.abs(cluster.lng - report.longitude);
          if (dLat < clusterDistThreshold && dLng < clusterDistThreshold) {
            cluster.reports.push(report);
            cluster.lat = (cluster.lat + report.latitude) / 2;
            cluster.lng = (cluster.lng + report.longitude) / 2;
            added = true;
            break;
          }
        }
        if (!added) {
          clusters.push({
            lat: report.latitude,
            lng: report.longitude,
            reports: [report],
          });
        }
      }
    } else {
      // No clustering
      for (const r of displayedReports) {
        clusters.push({ lat: r.latitude, lng: r.longitude, reports: [r] });
      }
    }

    // Render clusters and individual pins
    for (const cluster of clusters) {
      if (cluster.reports.length > 1) {
        // Multi-report Cluster Marker
        const clusterIcon = L.divIcon({
          className: "field-map-cluster",
          html: buildClusterHtml(cluster.reports.length),
          iconSize: [42, 42],
          iconAnchor: [21, 21],
        });

        const clusterMarker = L.marker([cluster.lat, cluster.lng], {
          icon: clusterIcon,
        }).addTo(markersLayer);

        clusterMarker.on("click", () => {
          const latLngs = cluster.reports.map(
            (r) => [r.latitude, r.longitude] as [number, number]
          );
          map.fitBounds(latLngs, { padding: [60, 60], maxZoom: 17, animate: true });
        });
      } else {
        // Single Individual Report Pin
        const report = cluster.reports[0];
        const color = statusColor(report.status);
        const isUrgent = isReportUrgent(report.createdAt, report.status);
        const isHovered = hoveredReportId === report.id;
        const activeReportId = selectedReportId ?? selectedReport?.id ?? null;
        const isSelected = activeReportId === report.id;

        const pinIcon = L.divIcon({
          className: "field-map-marker",
          html: buildPinHtml(color, isUrgent, isHovered, isSelected),
          iconSize: [36, 46],
          iconAnchor: [18, 43],
        });

        const marker = L.marker([report.latitude, report.longitude], { icon: pinIcon })
          .addTo(markersLayer);

        marker.on("click", () => {
          setSelectedReport(report);
          // Gently pan and center the map on the clicked marker
          map.panTo([report.latitude, report.longitude], { animate: true, duration: 0.5 });
          if (onSelectReport) {
            onSelectReport(report);
          }
        });
      }
    }
  }, [
    displayedReports,
    mapReady,
    enableClustering,
    currentZoom,
    hoveredReportId,
    selectedReport,
    selectedReportId,
    onSelectReport,
  ]);

  // Fit all reports handler
  const handleFitAllReports = () => {
    if (!mapInstanceRef.current || reportsWithCoords.length === 0) return;
    if (reportsWithCoords.length === 1) {
      mapInstanceRef.current.setView(
        [reportsWithCoords[0].latitude, reportsWithCoords[0].longitude],
        15,
        { animate: true }
      );
    } else {
      const latLngs = reportsWithCoords.map(
        (r) => [r.latitude, r.longitude] as [number, number]
      );
      mapInstanceRef.current.fitBounds(latLngs, { padding: [45, 45], maxZoom: 16 });
    }
  };

  const legendItems: Array<{ status: ReportStatus; color: string; label: string }> = [
    { status: ReportStatus.NEW, color: "#0284c7", label: "جديد" },
    { status: ReportStatus.ASSIGNED, color: "#7c3aed", label: "مُسند" },
    { status: ReportStatus.IN_PROGRESS, color: "#d97706", label: "قيد العمل" },
    { status: ReportStatus.WAITING_FOR_RESIDENT, color: "#f59e0b", label: "بانتظار مواطن" },
    { status: ReportStatus.RESOLVED, color: "#16a34a", label: "مُعالج" },
    { status: ReportStatus.REJECTED, color: "#dc2626", label: "مرفوض" },
  ];

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 w-screen h-screen font-sans bg-slate-100"
          : `relative w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm font-sans ${className}`
      }
    >
      {/* Map Canvas - Fills 100% of container */}
      <div
        ref={mapContainerRef}
        style={{ height: isFullscreen ? "100%" : height }}
        className="w-full h-full flex-1 z-0"
        dir="ltr"
      />

      {!mapReady && (
        <Skeleton className="absolute inset-0 z-20 w-full h-full rounded-2xl pointer-events-none transition-opacity duration-300" />
      )}

      {/* ── 1. Unified Floating Navigation FAB (Top Left) ── */}
      <div className="absolute top-3.5 left-3.5 z-10 flex flex-col items-center bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-md p-1 gap-1">
        {/* Zoom In */}
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-700 hover:text-[#0891B2] hover:bg-cyan-50 active:scale-90 transition-all font-bold text-base cursor-pointer"
          title="تكبير الخريطة (+)"
          aria-label="تكبير"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Micro Divider */}
        <div className="w-5 h-[1px] bg-slate-200/80" />

        {/* Zoom Out */}
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-700 hover:text-[#0891B2] hover:bg-cyan-50 active:scale-90 transition-all font-bold text-base cursor-pointer"
          title="تصغير الخريطة (−)"
          aria-label="تصغير"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M20 12H4" />
          </svg>
        </button>

        {/* Micro Divider */}
        <div className="w-5 h-[1px] bg-slate-200/80" />

        {/* Fit All Reports / Re-center (Target Bullseye Icon - completely distinct from fullscreen) */}
        <button
          type="button"
          onClick={handleFitAllReports}
          className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-700 hover:text-[#0891B2] hover:bg-cyan-50 active:scale-90 transition-all cursor-pointer"
          title="إعادة التمركز واحتواء كافة البلاغات"
          aria-label="إعادة التمركز"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="7" />
            <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            <line x1="12" y1="2" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="2" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="22" y2="12" />
          </svg>
        </button>
      </div>

      {/* ── 2. Top Executive Command Dock & Fullscreen Search (Top Right) ── */}
      <div className="absolute top-3.5 right-3.5 z-20 flex flex-col items-start gap-2 max-w-[calc(100%-4.5rem)] pointer-events-none">
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
        {/* Reports Count Pill */}
        <div className="inline-flex items-center gap-2 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-sm px-3.5 py-1.5 text-xs font-bold text-slate-800">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0891B2] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0891B2]" />
          </span>
          <span>
            {displayedReports.length} {displayedReports.length === reportsWithCoords.length ? "بلاغ" : `من ${reportsWithCoords.length}`}
          </span>
        </div>

        {/* Segmented Map Mode Switcher: [ 🗺️ شوارع | 🛰️ قمر صناعي ] */}
        <div className="inline-flex items-center p-1 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-sm gap-1">
          <button
            type="button"
            onClick={() => setMapMode("streets")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mapMode === "streets"
                ? "bg-[#0891B2] text-white shadow-xs"
                : "text-slate-600 hover:text-[#0891B2] hover:bg-cyan-50/60"
            }`}
            title="عرض خريطة الشوارع التفاعلية"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span>شوارع</span>
          </button>
          <button
            type="button"
            onClick={() => setMapMode("satellite")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mapMode === "satellite"
                ? "bg-[#142D4E] text-white shadow-xs"
                : "text-slate-600 hover:text-[#142D4E] hover:bg-slate-100/60"
            }`}
            title="عرض صور القمر الصناعي الجوية"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>قمر صناعي</span>
          </button>
        </div>

        {/* Clustering Toggle Pill */}
        <button
          type="button"
          onClick={() => setEnableClustering((c) => !c)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-sm text-xs font-bold transition-all cursor-pointer ${
            enableClustering
              ? "text-[#0891B2] border-[#0891B2]/30 bg-cyan-50/80"
              : "text-slate-600 hover:text-[#0891B2] hover:bg-cyan-50/50"
          }`}
          title={enableClustering ? "تجميع النقاط المتقاربة: مُفعّل" : "تجميع النقاط: مُعطّل"}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>تجميع</span>
          <span
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              enableClustering ? "bg-[#0891B2]" : "bg-slate-300"
            }`}
          />
        </button>

        {/* Fullscreen Toggle Button */}
        <button
          type="button"
          onClick={() => setIsFullscreen((f) => !f)}
          className={`h-8 w-8 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-sm flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
            isFullscreen
              ? "text-rose-600 hover:bg-rose-50 hover:border-rose-200"
              : "text-slate-700 hover:text-[#0891B2] hover:bg-cyan-50/80"
          }`}
          title={isFullscreen ? "إنهاء ملء الشاشة (Esc)" : "تكبير الخريطة لملء الشاشة"}
          aria-label={isFullscreen ? "إنهاء ملء الشاشة" : "ملء الشاشة"}
        >
          {isFullscreen ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>
      </div>

      {/* ── 2b. Compact Quick Search & Jump Bar (Fullscreen Only) ── */}
      {isFullscreen && (
        <div dir="rtl" className="w-72 sm:w-80 max-w-full pointer-events-auto">
          <div className="relative flex items-center rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md px-3 py-1.5 focus-within:border-[#0891B2] focus-within:ring-2 focus-within:ring-[#0891B2]/20 transition-all">
            <svg className="w-4 h-4 text-[#0891B2] shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchResults.length > 0) {
                  e.preventDefault();
                  handleJumpToReport(searchResults[0]);
                }
              }}
              placeholder="ابحث بالرقم المرجعي أو الشارع..."
              className="w-full bg-transparent border-0 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 py-1"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded-md transition-colors cursor-pointer shrink-0"
                aria-label="مسح البحث"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchQuery.trim() && (
            <div className="mt-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl overflow-hidden max-h-72 overflow-y-auto animate-in fade-in-0 slide-in-from-top-1 duration-150">
              {searchResults.length === 0 ? (
                <div className="px-3.5 py-3 text-center text-[11px] text-slate-400 font-medium">
                  لا توجد نتائج مطابقة على الخريطة
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {searchResults.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleJumpToReport(r)}
                      className="w-full text-right px-3.5 py-2.5 hover:bg-cyan-50/70 transition-colors flex items-start gap-2.5 cursor-pointer"
                    >
                      <span
                        className="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-white shadow-xs"
                        style={{ backgroundColor: statusColor(r.status) }}
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] font-bold text-[#0891B2] bg-cyan-50 border border-cyan-200/80 px-1.5 py-0.5 rounded">
                            {r.publicReference}
                          </span>
                          <span className="text-[10px] text-slate-400">انتقال ←</span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate">{r.title}</p>
                        {r.addressText && (
                          <p className="text-[10px] text-slate-500 truncate">{r.addressText}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      </div>

      {/* ── 3. Interactive Bottom Status Filter Ribbon (Bottom Center) ── */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 max-w-[94%] overflow-x-auto scrollbar-none pointer-events-auto">
        <div className="inline-flex items-center gap-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md p-1.5 text-xs">
          {/* All reports button */}
          <button
            type="button"
            onClick={() => setActiveStatusFilter(null)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-[11px] ${
              activeStatusFilter === null
                ? "bg-[#142D4E] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            كافة البلاغات ({reportsWithCoords.length})
          </button>

          {/* Status chips */}
          {legendItems.map((item) => {
            const count = reportsWithCoords.filter((r) => r.status === item.status).length;
            if (count === 0) return null;
            const isSelected = activeStatusFilter === item.status;
            return (
              <button
                key={item.status}
                type="button"
                onClick={() => setActiveStatusFilter(isSelected ? null : item.status)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-[11px] ${
                  isSelected
                    ? "bg-cyan-50 text-[#0891B2] ring-1.5 ring-[#0891B2]"
                    : "text-slate-700 hover:bg-slate-100/80"
                }`}
                title={`انقر لتصفية بلاغات ${item.label}`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.label}</span>
                <span className="font-mono text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}

          {/* Reset filter chip if active */}
          {activeStatusFilter !== null && (
            <button
              type="button"
              onClick={() => setActiveStatusFilter(null)}
              className="text-[10px] text-rose-600 hover:text-rose-700 font-bold px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
              title="إلغاء التصفية"
            >
              ✕ مسح
            </button>
          )}
        </div>
      </div>



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
