import raw from "./soc-data.json";
import beallsRaw from "./bealls-locations.json";
import lawEnforcementRaw from "./store-law-enforcement.json";

export type BeallsStoreLocation = {
  id: string;
  name: string;
  geomodifier: string;
  label: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  lat: number;
  lng: number;
  closed: boolean;
  slug: string;
};

export type StoreLawEnforcement = {
  agencyName: string;
  contactInfo: string;
  source: string;
  agencyType?: string;
  county?: string;
  distanceMiles?: number;
};

export const STORE_LAW_ENFORCEMENT = lawEnforcementRaw as {
  source: string;
  fetchedAt: string;
  dataset: string;
  storeCount: number;
  withPhone: number;
  stores: Record<string, StoreLawEnforcement>;
};

export const BEALLS_LOCATIONS = beallsRaw as {
  source: string;
  fetchedAt: string;
  totalReported: number;
  openStoreCount: number;
  stores: Record<string, BeallsStoreLocation>;
  storeCoords: Record<string, [number, number]>;
  storeLabels: Record<string, string>;
};

export type SocSite = "FL" | "TX";

export type ImportedOperator = {
  id: string;
  name: string;
  extension: string;
  socSite?: SocSite | null;
  storeCount: number;
  topStore: string | null;
  topLabel: string | null;
  assignedStores: string[];
  hotStore: string | null;
  extraStores: string[];
};

export type ImportedWatchStore = {
  id: string;
  city: string;
  region: string;
  reason: string;
  tier: string;
  socMonitored: boolean;
  lastReview: string;
  flag: string;
};

export type TimeSlotKey = "before9" | "after9" | "after10" | "after11";

export const SOC_DATA = raw as {
  sourceFile: string;
  importedAt: string;
  operators: ImportedOperator[];
  focusBlocks: { focusStores: string[]; hotStore: string | null; dataminrOp: string | null }[];
  priorityStoreIds: string[];
  opportunityStoreIds: string[];
  watchList: ImportedWatchStore[];
  storeLabels: Record<string, string>;
  storeSlots: Record<string, Partial<Record<TimeSlotKey, string | null>>>;
  storeCoords: Record<string, [number, number]>;
  dataminrAlerts: {
    store: string;
    activity: string;
    start: string;
    end: string;
    comments: string;
    operator: string | null;
  }[];
  defaultOperatorExt: string;
};

export function padStoreId(id: string | number): string {
  const raw = String(id).trim();
  if (/^\d{1,4}$/.test(raw)) {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) return String(n).padStart(3, "0");
  }
  return raw;
}

/** Current open stores from stores.bealls.com — canonical source of truth. */
export const OPEN_BEALLS_STORE_IDS = new Set(
  Object.entries(BEALLS_LOCATIONS.stores)
    .filter(([, store]) => !store.closed)
    .map(([id]) => padStoreId(id)),
);

export function isOpenBeallsStore(id: string): boolean {
  return OPEN_BEALLS_STORE_IDS.has(padStoreId(id));
}

export function filterOpenBeallsIds(ids: string[]): string[] {
  return ids.map(padStoreId).filter(isOpenBeallsStore);
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
/** Fixed local Sunday used as week-index epoch (1970-01-04). */
const WEEK_EPOCH_SUNDAY = new Date(1970, 0, 4);

/**
 * US week index keyed to Sunday boundaries (week starts Sunday).
 * Assigned-store rotation advances each Sunday via this index.
 */
export function getSundayWeekIndex(date = new Date()): number {
  const localMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  localMidnight.setDate(localMidnight.getDate() - localMidnight.getDay());
  return Math.floor((localMidnight.getTime() - WEEK_EPOCH_SUNDAY.getTime()) / MS_PER_WEEK);
}

/** Rotate store IDs by Sunday week index so each operator's focus set shifts weekly. */
export function rotateAssignedStores(stores: string[], date = new Date()): string[] {
  const open = filterOpenBeallsIds(stores);
  if (open.length <= 1) return open;
  const offset = ((getSundayWeekIndex(date) % open.length) + open.length) % open.length;
  if (offset === 0) return open;
  return [...open.slice(offset), ...open.slice(0, offset)];
}

export const VALID_WATCH_LIST = SOC_DATA.watchList.filter((w) => isOpenBeallsStore(w.id));

export function storeLabel(id: string): string {
  const key = padStoreId(id);
  if (!isOpenBeallsStore(key)) return `Unknown Store #${key}`;
  return BEALLS_LOCATIONS.storeLabels[key] ?? `Store ${key}`;
}

export function beallsStore(id: string): BeallsStoreLocation | undefined {
  return BEALLS_LOCATIONS.stores[padStoreId(id)];
}

export function storeLawEnforcement(id: string): StoreLawEnforcement | undefined {
  return STORE_LAW_ENFORCEMENT.stores[padStoreId(id)];
}

export function phoneTelHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const normalized = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return normalized.length === 10 ? `tel:+1${normalized}` : null;
}

function rsplit(str: string, sep: string, maxSplits: number): string[] {
  const parts = str.split(sep);
  if (parts.length <= maxSplits + 1) return parts;
  const tail = parts.slice(-maxSplits);
  const head = parts.slice(0, parts.length - maxSplits).join(sep);
  return [head, ...tail];
}

export function parseCityState(label: string): { city: string; state: string } {
  const m = label.match(/-\s*(.+)$/);
  const text = (m ? m[1] : label).trim();
  const parts = rsplit(text, " ", 2);
  if (parts.length >= 2 && parts[parts.length - 1].length === 2) {
    return { city: parts.slice(0, -1).join(" ").trim(), state: parts[parts.length - 1] };
  }
  return { city: text, state: "" };
}

/** Match Excel time columns (Before 9PM / After 9PM / …). */
export function getCurrentTimeSlot(hour = new Date().getHours()): TimeSlotKey {
  if (hour < 21) return "before9";
  if (hour < 22) return "after9";
  if (hour < 23) return "after10";
  return "after11";
}

export function timeSlotLabel(slot: TimeSlotKey): string {
  const labels: Record<TimeSlotKey, string> = {
    before9: "Before 9 PM",
    after9: "After 9 PM",
    after10: "After 10 PM",
    after11: "After 11 PM",
  };
  return labels[slot];
}

/** Stores that rotate into focus for the current time window. */
export function getActiveSlotStoreIds(slot = getCurrentTimeSlot()): Set<string> {
  const active = new Set<string>();
  for (const slots of Object.values(SOC_DATA.storeSlots)) {
    const next = slots[slot];
    if (next && isOpenBeallsStore(next)) active.add(padStoreId(next));
  }
  return active;
}

export function lookupCoords(
  id: string,
  fallback: Record<string, [number, number]> = {},
): [number, number] | null {
  const key = padStoreId(id);
  if (!isOpenBeallsStore(key)) return null;
  const store = beallsStore(key);
  if (store && Number.isFinite(store.lat) && Number.isFinite(store.lng)) {
    return [store.lat, store.lng];
  }
  if (BEALLS_LOCATIONS.storeCoords[key]) return BEALLS_LOCATIONS.storeCoords[key];
  for (const variant of [key, String(parseInt(key, 10)), key.padStart(4, "0")]) {
    if (fallback[variant]) return fallback[variant];
  }
  return null;
}

/** All open Bealls stores with verified lat/lng from the public store locator. */
export function allBeallsStoreIds(): string[] {
  return Object.keys(BEALLS_LOCATIONS.stores)
    .filter((id) => !BEALLS_LOCATIONS.stores[id]?.closed)
    .map(padStoreId)
    .filter(isOpenBeallsStore)
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
}

/** Grow a seed list with real open Bealls IDs for denser Priority/Opportunity preview grids. */
function expandOpenStoreIds(
  seed: string[],
  targetCount: number,
  exclude: ReadonlySet<string> = new Set(),
  prefer: string[] = [],
): string[] {
  const out: string[] = [];
  const used = new Set<string>();
  const push = (id: string) => {
    const key = padStoreId(id);
    if (used.has(key) || exclude.has(key) || !isOpenBeallsStore(key)) return;
    used.add(key);
    out.push(key);
  };
  for (const id of seed) push(id);
  for (const id of prefer) {
    if (out.length >= targetCount) break;
    push(id);
  }
  for (const id of allBeallsStoreIds()) {
    if (out.length >= targetCount) break;
    push(id);
  }
  return out;
}

const FOCUS_POOL_STORE_IDS = SOC_DATA.focusBlocks.flatMap((b) => b.focusStores);

/** Demo/preview expansion: denser Priority grid (~30 open stores). */
export const VALID_PRIORITY_STORE_IDS = expandOpenStoreIds(
  SOC_DATA.priorityStoreIds,
  30,
  new Set(),
  FOCUS_POOL_STORE_IDS,
);

/** Demo/preview expansion: denser Opportunity grid (~24 open stores), disjoint from Priority. */
export const VALID_OPPORTUNITY_STORE_IDS = expandOpenStoreIds(
  SOC_DATA.opportunityStoreIds,
  24,
  new Set(VALID_PRIORITY_STORE_IDS),
  [
    ...SOC_DATA.watchList.map((w) => w.id),
    ...FOCUS_POOL_STORE_IDS,
  ],
);

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const DEFAULT_OPERATOR =
  SOC_DATA.operators.find((o) => o.extension === SOC_DATA.defaultOperatorExt) ??
  SOC_DATA.operators[0];
