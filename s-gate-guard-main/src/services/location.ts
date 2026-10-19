import * as Location from 'expo-location';

/**
 * Where this phone is right now, for the server's "is the guard at the gate" check.
 * One reading is reused for 20 seconds so a burst of taps does not wait for GPS each time, and the home
 * screen refreshes it every 20 seconds so it is already warm when the guard acts.
 */
export interface GeoReading {
  latitude: number;
  longitude: number;
  accuracy: number;
  takenAt: number;
  mocked: boolean;
}

const REUSE_MS = 20_000;
const FIX_TIMEOUT_MS = 7_000;

let last: GeoReading | null = null;
let inFlight: Promise<GeoReading | null> | null = null;

async function ensurePermission(): Promise<boolean> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Location.requestForegroundPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

async function takeReading(): Promise<GeoReading | null> {
  if (!(await ensurePermission())) return null;
  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), FIX_TIMEOUT_MS)),
    ]);
    if (!position) return last && Date.now() - last.takenAt < 60_000 ? last : null;
    last = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? 999,
      takenAt: position.timestamp || Date.now(),
      mocked: (position as { mocked?: boolean }).mocked === true,
    };
    return last;
  } catch {
    return null;
  }
}

export async function getFreshReading(): Promise<GeoReading | null> {
  if (last && Date.now() - last.takenAt < REUSE_MS) return last;
  if (!inFlight) inFlight = takeReading().finally(() => { inFlight = null; });
  return inFlight;
}

/** Headers the backend reads (x-geo-*). Empty when the phone has no location to give. */
export async function geoHeaders(): Promise<Record<string, string>> {
  const reading = await getFreshReading();
  if (!reading) return {};
  return {
    'x-geo-lat': String(reading.latitude),
    'x-geo-lng': String(reading.longitude),
    'x-geo-acc': String(Math.round(reading.accuracy)),
    'x-geo-ts': String(reading.takenAt),
    'x-geo-mock': reading.mocked ? '1' : '0',
  };
}
