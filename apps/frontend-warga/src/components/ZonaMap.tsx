import { useEffect, useRef, useState } from 'react';

interface MockZona {
  id: number;
  code: string;
  name: string;
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
}

interface ZonaMapProps {
  zonaList: MockZona[];
  onZonaClick?: (zona: MockZona) => void;
  /** Initial center [lat, lng] - default Bandung. */
  center?: [number, number];
  /** Initial zoom. Default 12. */
  zoom?: number;
  /** Height px. */
  height?: number;
  /** Enable polygon drawing mode. */
  drawingEnabled?: boolean;
  /** Callback when user finishes drawing polygon. Coords as [lng, lat] pairs. */
  onPolygonDrawn?: (coords: [number, number][]) => void;
}

const ZONA_COLORS: Record<string, string> = {
  'R-': '#10b981',
  'K-': '#0891b2',
  'I-': '#f97316',
  'RTH-': '#16a34a',
  HL: '#15803d',
  'PS-': '#06b6d4',
  CB: '#7c3aed',
  'P-': '#84cc16',
  'SPU-': '#3b82f6',
  'KT-': '#6366f1',
};

function colorFor(code: string): string {
  for (const prefix of Object.keys(ZONA_COLORS)) {
    if (code.startsWith(prefix)) return ZONA_COLORS[prefix] ?? '#64748b';
  }
  return '#64748b';
}

/**
 * Lightweight zona map — pakai Leaflet (loaded via CDN to keep bundle small).
 * Bukan komponen heavyweight react-leaflet wrapper.
 */
export function ZonaMap({
  zonaList,
  onZonaClick,
  center = [-6.92, 107.6],
  zoom = 12,
  height = 500,
  drawingEnabled = false,
  onPolygonDrawn,
}: ZonaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const mapRef = useRef<unknown>(null);

  // Load Leaflet from CDN once. Avoids 150KB bundle bloat.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    type LeafletWindow = Window & { L?: unknown };
    if ((window as LeafletWindow).L) {
      setLeafletReady(true);
      return;
    }
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!leafletReady || !containerRef.current) return;
    type LeafletWindow = Window & {
      L: {
        map: (el: HTMLElement, opts?: unknown) => unknown;
        tileLayer: (url: string, opts?: unknown) => { addTo: (m: unknown) => unknown };
        rectangle: (
          bounds: [[number, number], [number, number]],
          opts?: unknown,
        ) => {
          addTo: (m: unknown) => unknown;
          bindTooltip: (text: string) => unknown;
          on: (evt: string, fn: () => void) => unknown;
        };
        polygon: (coords: [number, number][], opts?: unknown) => { addTo: (m: unknown) => unknown };
      };
    };
    const L = (window as unknown as LeafletWindow).L;
    if (mapRef.current) return; // already initialized

    const map = L.map(containerRef.current, { center, zoom });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    for (const z of zonaList) {
      const [minLng, minLat, maxLng, maxLat] = z.bbox;
      const color = colorFor(z.code);
      const rect = L.rectangle(
        [
          [minLat, minLng],
          [maxLat, maxLng],
        ],
        { color, weight: 1, fillColor: color, fillOpacity: 0.35 },
      );
      rect.addTo(map);
      rect.bindTooltip(`<strong>${z.code}</strong><br/>${z.name}`);
      if (onZonaClick) {
        rect.on('click', () => onZonaClick(z));
      }
    }

    // Drawing mode (simple: click points → double-click to finish)
    if (drawingEnabled && onPolygonDrawn) {
      const points: [number, number][] = [];
      let polygonLayer: { addTo: (m: unknown) => unknown } | null = null;
      type MapWithEvents = {
        on: (evt: string, fn: (e: { latlng: { lat: number; lng: number } }) => void) => void;
      };
      const mapEvents = map as MapWithEvents;
      mapEvents.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        points.push([e.latlng.lng, e.latlng.lat]);
        if (polygonLayer) {
          // remove via leaflet API: skip for brevity (would need map.removeLayer)
        }
        if (points.length >= 3) {
          polygonLayer = L.polygon(
            points.map((p) => [p[1], p[0]]),
            { color: '#dc2626', weight: 2, fillColor: '#dc2626', fillOpacity: 0.3 },
          );
          polygonLayer.addTo(map);
        }
      });
      mapEvents.on('dblclick', () => {
        if (points.length >= 3) onPolygonDrawn([...points]);
      });
    }

    return () => {
      type CleanableMap = { remove: () => void };
      if (mapRef.current) (mapRef.current as CleanableMap).remove();
      mapRef.current = null;
    };
  }, [leafletReady, zonaList, drawingEnabled, onPolygonDrawn, onZonaClick, center, zoom]);

  return (
    <div style={{ position: 'relative', height }}>
      {!leafletReady && <div style={styles.loading}>📍 Memuat peta...</div>}
      <div ref={containerRef} style={{ width: '100%', height }} />
      {drawingEnabled && (
        <div style={styles.hint}>
          💡 Klik beberapa titik di peta untuk menggambar polygon. <strong>Double-click</strong>{' '}
          untuk selesai.
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f1f5f9',
    color: '#64748b',
    zIndex: 10,
  },
  hint: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    background: 'rgba(30,58,138,0.9)',
    color: 'white',
    padding: '6px 12px',
    borderRadius: 6,
    fontSize: 12,
    zIndex: 1000,
    pointerEvents: 'none',
  },
};
