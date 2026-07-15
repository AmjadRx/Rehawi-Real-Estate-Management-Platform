"use client";

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";

/**
 * Site map display: MapLibre GL with OpenStreetMap raster tiles. Free, no
 * key, no account. "Open in Google Maps" stays a plain link elsewhere.
 */
const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export function OsmMap({
  lat,
  lng,
  zoom = 15,
  draggable = false,
  onMove,
  className,
}: {
  lat: number;
  lng: number;
  zoom?: number;
  /** Admins drag the pin; onMove fires with the new position on drop. */
  draggable?: boolean;
  onMove?: (position: { lat: number; lng: number }) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [lng, lat],
      zoom,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }));
    map.scrollZoom.disable(); // page scroll stays predictable; zoom via buttons
    map.touchZoomRotate.enable();

    const marker = new maplibregl.Marker({ draggable, color: "#0f766e" })
      .setLngLat([lng, lat])
      .addTo(map);
    if (draggable) {
      marker.on("dragend", () => {
        const pos = marker.getLngLat();
        onMoveRef.current?.({ lat: pos.lat, lng: pos.lng });
      });
    }

    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // The map is created once; position updates flow through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggable]);

  useEffect(() => {
    markerRef.current?.setLngLat([lng, lat]);
    mapRef.current?.easeTo({ center: [lng, lat], duration: 400 });
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      className={className}
      role="application"
      aria-label="Map"
    />
  );
}
