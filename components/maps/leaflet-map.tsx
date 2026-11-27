"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMapType, Marker as LeafletMarkerType } from "leaflet";
import { isCoordinatesInBounds, DEFAULT_SERVICE_BOUNDARY } from "@/lib/reports/bounds";
import { Skeleton } from "@/components/ui/skeleton";

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  onChange?: (lat: number, lng: number) => void;
  readOnly?: boolean;
  zoom?: number;
  height?: string;
  showBoundaryNotice?: boolean;
}

export function LeafletMap({
  latitude,
  longitude,
  onChange,
  readOnly = false,
  zoom = 13,
  height = "360px",
  showBoundaryNotice = true,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMapType | null>(null);
  const markerRef = useRef<LeafletMarkerType | null>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const isInBounds = isCoordinatesInBounds(latitude, longitude);

  // Initialize Leaflet map client-side
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

      // Import Leaflet dynamically to avoid SSR window errors
      const L = (await import("leaflet")).default;
      // Import Leaflet CSS
      await import("leaflet/dist/leaflet.css");

      if (!isMounted || !mapContainerRef.current) return;

      // Custom SVG Marker Icon pointing straight down
      const customPinIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `
          <div style="width: 34px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 7px rgba(0,0,0,0.35));">
              <!-- Teardrop pin pointing straight down to (17, 42) -->
              <path d="M17 1C8.716 1 2 7.716 2 16C2 26.5 17 42 17 42C17 42 32 26.5 32 16C32 7.716 25.284 1 17 1Z" fill="#0891B2" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>
              <!-- Inner white circular disc -->
              <circle cx="17" cy="16" r="6" fill="#FFFFFF"/>
              <!-- Inner cyan dot -->
              <circle cx="17" cy="16" r="3" fill="#0891B2"/>
            </svg>
          </div>
        `,
        iconSize: [34, 44],
        iconAnchor: [17, 42],
        popupAnchor: [0, -42],
      });

      // Create map instance
      const tileUrl =
        process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom,
        zoomControl: false, // We will add zoom control in top-left or top-right
        fadeAnimation: false,
        zoomAnimation: false,
        markerZoomAnimation: false,
      });

      // Add Arabic zoom control
      L.control
        .zoom({
          position: "topleft",
          zoomInTitle: "تكبير الخريطة",
          zoomOutTitle: "تصغير الخريطة",
        })
        .addTo(map);

      // Add OpenStreetMap tile layer
      L.tileLayer(tileUrl, {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Optional: Add visual boundary polygon
      if (showBoundaryNotice) {
        const bounds = DEFAULT_SERVICE_BOUNDARY;
        L.rectangle(
          [
            [bounds.minLat, bounds.minLng],
            [bounds.maxLat, bounds.maxLng],
          ],
          {
            color: "#0891B2",
            weight: 1.5,
            fillColor: "#06b6d4",
            fillOpacity: 0.06,
            dashArray: "4, 4",
          }
        ).addTo(map);
      }

      // Add Draggable Marker
      const marker = L.marker([latitude, longitude], {
        icon: customPinIcon,
        draggable: !readOnly,
      }).addTo(map);

      // Marker drag event
      if (!readOnly && onChange) {
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onChange(pos.lat, pos.lng);
        });

        // Click on map to reposition marker
        map.on("click", (e) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          onChange(lat, lng);
        });
      }

      mapInstanceRef.current = map;
      markerRef.current = marker;
      setMapReady(true);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop();
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch {
          // Ignore Leaflet unmount animation errors
        }
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run on mount

  // Synchronize marker position when external coordinates change
  useEffect(() => {
    if (!mapReady || !markerRef.current || !mapInstanceRef.current) return;

    try {
      const currentPos = markerRef.current.getLatLng();
      if (Math.abs(currentPos.lat - latitude) > 0.0001 || Math.abs(currentPos.lng - longitude) > 0.0001) {
        markerRef.current.setLatLng([latitude, longitude]);
        mapInstanceRef.current.panTo([latitude, longitude], { animate: false });
      }
    } catch {
      // Guard against concurrent position update during teardown
    }
  }, [latitude, longitude, mapReady]);

  // Browser Geolocation Trigger
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setGeoError("خدمة تحديد الموقع الجغرافي غير مدعومة في متصفحك.");
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (onChange) {
          onChange(lat, lng);
        }

        if (mapInstanceRef.current && markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          mapInstanceRef.current.flyTo([lat, lng], 15, { animate: true });
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("تم رفض إذن الوصول للموقع. يرجى تفعيل إذن الموقع في المتصفح أو تحريك المؤشر يدوياً.");
        } else {
          setGeoError("تعذر التقاط موقعك الجغرافي حالياً. يرجى اختيار الموقع على الخريطة مباشرة.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-xs">
      {!mapReady && (
        <Skeleton className="absolute inset-0 z-20 w-full h-full rounded-2xl pointer-events-none transition-opacity duration-300" />
      )}
      {/* Map canvas container */}
      <div ref={mapContainerRef} style={{ height }} className="w-full z-0" />

      {/* Map Action Toolbar Overlay */}
      {!readOnly && (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 backdrop-blur-xs px-3.5 py-2 text-xs font-bold text-slate-800 shadow-md border border-slate-200/80 hover:bg-cyan-50 hover:text-[#0891B2] hover:border-cyan-300 disabled:opacity-50 transition-all cursor-pointer"
          >
            <span className={isLocating ? "animate-spin" : ""}>📍</span>
            <span>{isLocating ? "جاري التحديد..." : "موقعي الحالي"}</span>
          </button>
        </div>
      )}

      {/* Boundary and Coordinate Status Bar */}
      <div className="absolute bottom-2 left-2 right-2 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/90 backdrop-blur-xs px-3 py-1.5 text-[11px] text-slate-700 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500">الإحداثيات:</span>
          <span className="font-mono font-bold text-slate-800 dir-ltr">
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </span>
        </div>

        <div>
          {isInBounds ? (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              ضمن نطاق الخدمة المعتمد
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              خارج نطاق الخدمة المعتمد
            </span>
          )}
        </div>
      </div>

      {/* Geolocation Error Alert */}
      {geoError && (
        <div className="absolute top-14 right-3 left-3 z-10 rounded-xl bg-red-50/95 border border-red-200 p-2.5 text-xs text-red-800 shadow-sm flex items-center justify-between">
          <span>{geoError}</span>
          <button
            type="button"
            onClick={() => setGeoError(null)}
            className="text-red-500 hover:text-red-800 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

