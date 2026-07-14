"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import type { GlobePin } from "@/lib/globe";

/**
 * Full-screen 3D globe (§6.5): night-earth texture, auto-rotate until the
 * user interacts, colored pins with hover tooltip cards, click → fly-to
 * zoom, then navigate to the property.
 */
export default function GlobeCanvas({ pins }: { pins: GlobePin[] }) {
  const router = useRouter();
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onReady = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    // Stop rotating at first interaction, per spec.
    controls.addEventListener("start", () => {
      controls.autoRotate = false;
    });
    globe.pointOfView({ lat: 35, lng: 30, altitude: 2.1 }, 0);
  }, []);

  const onPinClick = useCallback(
    (pin: object) => {
      const p = pin as GlobePin;
      const globe = globeRef.current;
      if (globe) {
        globe.controls().autoRotate = false;
        globe.pointOfView({ lat: p.lat, lng: p.lng, altitude: 0.35 }, 1100);
      }
      setTimeout(() => router.push(`/properties/${p.id}`), 1250);
    },
    [router],
  );

  const tooltip = useCallback((pin: object) => {
    const p = pin as GlobePin;
    return `
      <div style="
        background: rgba(20,20,22,0.92); color: #fff; border-radius: 12px;
        padding: 10px 12px; font: 500 13px/1.45 system-ui, sans-serif;
        max-width: 220px; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        border: 1px solid rgba(255,255,255,0.12);
      ">
        ${p.thumb ? `<img src="${p.thumb}" alt="" style="width:100%;height:84px;object-fit:cover;border-radius:8px;margin-bottom:8px" />` : ""}
        <div style="font-weight:600">${p.name}</div>
        <div style="opacity:0.75;font-size:12px">${p.city}, ${p.country}</div>
        <div style="margin-top:6px;display:inline-block;padding:2px 8px;border-radius:99px;background:${p.color}33;color:${p.color};font-size:11px;font-weight:600">
          ● ${p.status.replace("_", " ")}
        </div>
      </div>`;
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden bg-[#000010]">
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="#000010"
          globeImageUrl="/textures/earth-night.jpg"
          bumpImageUrl="/textures/earth-topology.png"
          atmosphereColor="#4a90d9"
          atmosphereAltitude={0.18}
          pointsData={pins}
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointAltitude={0.02}
          pointRadius={0.55}
          pointResolution={24}
          pointLabel={tooltip}
          onPointClick={onPinClick}
          onGlobeReady={onReady}
        />
      )}
    </div>
  );
}
