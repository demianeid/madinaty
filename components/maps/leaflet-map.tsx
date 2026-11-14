"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMapType, Marker as LeafletMarkerType } from "leaflet";
import { isCoordinatesInBounds, DEFAULT_SERVICE_BOUNDARY } from "@/lib/reports/bounds";

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

      // Import Leaflet dynamically to avoid SSR window errors
      const L = (await import("leaflet")).default;
      // Import Leaflet CSS
      await import("leaflet/dist/leaflet.css");

      if (!isMounted || !mapContainerRef.current) return;

      // Custom SVG Marker Icon to avoid broken image paths in Turbopack
      const customPinIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `
          <div style="transform: translate(-50%, -100%); cursor: pointer; display: flex; flex-direction: column; align-items: center;">
            <div style="background-color: #007766; color: white; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0, 119, 102, 0.4); border: 2px solid white;">
              <span style="transform: rotate(45deg); font-size: 14px; font-weight: bold;">📍</span>
            </div>
            <div style="width: 10px; height: 4px; background: rgba(0,0,0,0.25); border-radius: 50%; margin-top: 2px;"></div>
          </div>
        `,
        iconSize: [34, 40],
        iconAnchor: [17, 40],
      });

      // Create map instance
      const tileUrl =
        process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom,
        zoomControl: false, // We will add zoom control in top-left or top-right
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
            color: "#059669",
            weight: 1.5,
            fillColor: "#10b981",
            fillOpacity: 0.05,
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
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run on mount

  // Synchronize marker position when external coordinates change
  useEffect(() => {
    if (!mapReady || !markerRef.current || !mapInstanceRef.current) return;

    const currentPos = markerRef.current.getLatLng();
    if (Math.abs(currentPos.lat - latitude) > 0.0001 || Math.abs(currentPos.lng - longitude) > 0.0001) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapInstanceRef.current.panTo([latitude, longitude], { animate: true });
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
      {/* Map canvas container */}
      <div ref={mapContainerRef} style={{ height }} className="w-full z-0" />

      {/* Map Action Toolbar Overlay */}
      {!readOnly && (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 backdrop-blur-xs px-3.5 py-2 text-xs font-bold text-slate-800 shadow-md border border-slate-200/80 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 disabled:opacity-50 transition-all cursor-pointer"
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

