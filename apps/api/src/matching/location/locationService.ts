import { locations, thresholds, type CanonicalLocation } from "../../config/index.js";

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

function findLocation(id: string): CanonicalLocation | undefined {
  return locations.find((loc) => loc.id === id);
}

function distanceToScore(distanceMeters: number): number {
  const buckets = thresholds.locationBucketsMeters;
  const scores = thresholds.locationBucketScores;
  if (distanceMeters <= buckets.veryNearby) return scores.veryNearby;
  if (distanceMeters <= buckets.nearby) return scores.nearby;
  if (distanceMeters <= buckets.sameCampus) return scores.sameCampus;
  return scores.beyond;
}

/** Nearest canonical location id to a raw lat/lng — used to bucket a
 * user's or event's GPS coordinates into one of the fixed campus spots. */
export function resolveNearestLocation(lat: number, lng: number): string {
  let bestId = locations[0].id;
  let bestDistance = Infinity;
  for (const loc of locations) {
    const distance = haversineMeters(lat, lng, loc.lat, loc.lng);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = loc.id;
    }
  }
  return bestId;
}

/** Best-of compatibility score in [0,1] between a set of candidate intent
 * location ids and a single event location id. Unknown ids never throw —
 * they simply score 0 for that pairing. */
export function locationScore(intentLocationIds: string[], eventLocationId: string): number {
  if (intentLocationIds.length === 0) return 0.5;

  const eventLocation = findLocation(eventLocationId);

  let best = 0;
  for (const intentLocationId of intentLocationIds) {
    if (intentLocationId === eventLocationId) {
      best = Math.max(best, 1.0);
      continue;
    }
    const intentLocation = findLocation(intentLocationId);
    if (!eventLocation || !intentLocation) {
      continue;
    }
    const distance = haversineMeters(intentLocation.lat, intentLocation.lng, eventLocation.lat, eventLocation.lng);
    best = Math.max(best, distanceToScore(distance));
  }
  return best;
}
