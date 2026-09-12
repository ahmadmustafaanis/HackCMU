import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import L from "leaflet";
import "leaflet.heat";
import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";
import type { Activity } from "shared-types";

interface Hotspot {
  locationId: string;
  name: string;
  lat: number;
  lng: number;
  eventCount: number;
  people: number;
}

interface Coords {
  lat: number;
  lng: number;
}

interface CampusHeatmapProps {
  activities: Activity[];
  selectedLocationId?: string;
  onSelectLocation?: (locationId: string | null) => void;
  compact?: boolean;
  onUserLocation?: (coords: Coords) => void;
  requestLocationOnMount?: boolean;
}

const CMU_CENTER: [number, number] = [40.4432, -79.9435];
const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function colorForIntensity(t: number): string {
  if (t < 0.34) return "#f0b7c0";
  if (t < 0.67) return "#a83b52";
  return "#7a2338";
}

function isNearCampus(coords: Coords): boolean {
  const dLat = coords.lat - CMU_CENTER[0];
  const dLng = coords.lng - CMU_CENTER[1];
  return dLat * dLat + dLng * dLng < 0.08 * 0.08;
}

function MapHandle({ mapRef }: { mapRef: MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    const timer = window.setTimeout(() => map.invalidateSize(), 80);
    return () => {
      window.clearTimeout(timer);
      if (mapRef.current === map) mapRef.current = null;
    };
  }, [map, mapRef]);
  return null;
}

function ActivityHeat({ points }: { points: Array<[number, number, number]> }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");

  useEffect(() => {
    if (points.length === 0) return;
    const layer = L.heatLayer(points, {
      radius: 38,
      blur: 24,
      minOpacity: 0.28,
      maxZoom: 18,
      gradient: {
        0.2: "#f0b7c0",
        0.5: "#a83b52",
        0.85: "#7a2338",
      },
    }).addTo(map);
    return () => {
      map.removeLayer(layer);
    };
    // points identity is captured by `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

  return null;
}

function FitToSpots({ spots, selectedLocationId }: { spots: Hotspot[]; selectedLocationId: string }) {
  const map = useMap();
  const selectedKey = spots.map((s) => s.locationId).join(",");

  useEffect(() => {
    const selected = spots.find((s) => s.locationId === selectedLocationId);
    if (selected) {
      map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 17), { duration: 0.4 });
      return;
    }
    if (spots.length === 0) {
      map.setView(CMU_CENTER, 16);
      return;
    }
    if (spots.length === 1) {
      map.setView([spots[0]!.lat, spots[0]!.lng], 17);
      return;
    }
    const bounds = L.latLngBounds(spots.map((s) => [s.lat, s.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 17 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selectedKey, selectedLocationId]);

  return null;
}

export default function CampusHeatmap({
  activities,
  selectedLocationId = "all",
  onSelectLocation,
  compact = false,
  onUserLocation,
  requestLocationOnMount = false,
}: CampusHeatmapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [me, setMe] = useState<Coords | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "asking" | "ok" | "denied">("idle");

  const spots = useMemo(() => {
    const grouped = new Map<string, Hotspot>();
    for (const activity of activities) {
      if (activity.lat == null || activity.lng == null || !activity.locationId) continue;
      const existing = grouped.get(activity.locationId);
      if (existing) {
        existing.eventCount += 1;
        existing.people += activity.attendeeCount;
      } else {
        grouped.set(activity.locationId, {
          locationId: activity.locationId,
          name: activity.approximateLocation,
          lat: activity.lat,
          lng: activity.lng,
          eventCount: 1,
          people: activity.attendeeCount,
        });
      }
    }
    return Array.from(grouped.values());
  }, [activities]);

  const maxPeople = Math.max(1, ...spots.map((s) => s.people));
  const heatPoints = useMemo(
    () => spots.map((s) => [s.lat, s.lng, Math.max(0.35, s.people / maxPeople)] as [number, number, number]),
    [spots, maxPeople],
  );

  const handleSelect = (locationId: string) => {
    if (!onSelectLocation) return;
    onSelectLocation(selectedLocationId === locationId ? null : locationId);
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      setGeoStatus("denied");
      return;
    }
    setGeoStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMe(coords);
        onUserLocation?.(coords);
        setGeoStatus("ok");
        mapRef.current?.flyTo([coords.lat, coords.lng], 17, { duration: 0.5 });
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 },
    );
  };

  useEffect(() => {
    if (requestLocationOnMount) locateMe();
    // The Home page requests once when it mounts; the button remains available
    // for an explicit retry after a denied or timed-out request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestLocationOnMount]);

  const activeId = hovered ?? (selectedLocationId !== "all" ? selectedLocationId : null);
  const active = spots.find((s) => s.locationId === activeId);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
      <div className={`relative ${compact ? "h-52" : "h-72"}`}>
        <MapContainer
          center={CMU_CENTER}
          zoom={16}
          scrollWheelZoom={false}
          className="h-full w-full"
          attributionControl
        >
          <TileLayer attribution={OSM_ATTR} url={OSM_TILES} />
          <MapHandle mapRef={mapRef} />
          <FitToSpots spots={spots} selectedLocationId={selectedLocationId} />
          <ActivityHeat points={heatPoints} />
          {spots.map((spot) => {
            const selected = selectedLocationId === spot.locationId;
            const t = spot.people / maxPeople;
            return (
              <CircleMarker
                key={spot.locationId}
                center={[spot.lat, spot.lng]}
                radius={selected ? 11 : 8}
                pathOptions={{
                  color: selected ? "#201a1c" : "#ffffff",
                  weight: selected ? 3 : 2,
                  fillColor: colorForIntensity(t),
                  fillOpacity: 0.95,
                }}
                eventHandlers={{
                  click: () => handleSelect(spot.locationId),
                  mouseover: () => setHovered(spot.locationId),
                  mouseout: () => setHovered(null),
                }}
              />
            );
          })}
          {me && (
            <CircleMarker
              center={[me.lat, me.lng]}
              radius={9}
              pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }}
            />
          )}
        </MapContainer>

        <button
          type="button"
          onClick={locateMe}
          className="absolute right-2 top-2 z-[500] rounded-full border border-line bg-card px-3 py-1.5 text-[11px] font-semibold text-ink shadow-sm"
        >
          {geoStatus === "asking" ? "Locating…" : geoStatus === "ok" ? "Recenter on me" : "Show my location"}
        </button>

        {geoStatus === "denied" && (
          <p className="pointer-events-none absolute left-2 top-2 z-[500] max-w-[70%] rounded-lg bg-card/95 px-2 py-1 text-[10px] text-muted">
            Location blocked — allow it to see where you are.
          </p>
        )}

        {active && (
          <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-[500] rounded-xl bg-ink/90 px-3 py-2 text-white">
            <p className="text-xs font-semibold">{active.name}</p>
            <p className="text-[11px] text-white/80">
              {active.eventCount} open {active.eventCount === 1 ? "activity" : "activities"} · {active.people} joined
            </p>
          </div>
        )}
        {!active && me && !isNearCampus(me) && (
          <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-[500] rounded-xl bg-ink/90 px-3 py-2 text-[11px] text-white/90">
            You&apos;re not on campus — tap “Recenter on me” to jump to your pin.
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted">
          <span>Quiet</span>
          <span className="h-1.5 w-16 rounded-full bg-gradient-to-r from-[#f0b7c0] to-[#7a2338]" />
          <span>Busy</span>
        </div>
        {!compact && onSelectLocation && selectedLocationId !== "all" && (
          <button
            type="button"
            onClick={() => onSelectLocation(null)}
            className="text-[11px] font-medium text-primary underline"
          >
            Show all
          </button>
        )}
        {compact && <p className="text-[10px] text-muted">Tap a building</p>}
      </div>
    </div>
  );
}
