import { useState, useEffect, useMemo, useRef, type Dispatch, type SetStateAction, type RefObject } from "react";
import { createPortal } from "react-dom";
import { MapContainer, TileLayer, Marker, Circle as LeafletCircle, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import {
  Shield, Search, Bell, ChevronDown, LayoutDashboard, AlertTriangle,
  Star, TrendingUp, Eye, Radio, Volume2, BarChart2, Users, Settings,
  Activity, Clock, CheckCircle, Circle, Coffee, MapPin, UserPlus, Zap,
  Filter, RefreshCw, X, ChevronRight, Phone, Hash, Calendar,
  CloudRain, Flame, AlertOctagon, FileText, TrendingDown, CheckSquare,
  Plus, Mail, Building2, ShieldCheck, Siren, BookOpen, Server, Tv2, Map as MapIcon, Wifi, FolderOpen,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  SOC_DATA, DEFAULT_OPERATOR, parseCityState, storeLabel, padStoreId,
  getCurrentTimeSlot, timeSlotLabel, getActiveSlotStoreIds, lookupCoords, initials as nameInitials,
  allBeallsStoreIds, beallsStore, storeLawEnforcement, phoneTelHref, filterOpenBeallsIds,
  rotateAssignedStores, getSundayWeekIndex,
  VALID_PRIORITY_STORE_IDS, VALID_OPPORTUNITY_STORE_IDS, VALID_WATCH_LIST, isOpenBeallsStore,
  type SocSite,
} from "./data/socData";

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = "critical" | "high" | "medium" | "low";
type OperatorStatus = "Available" | "Busy" | "Break";
type MyProfile = { name:string; extension:string; avatar:string; status:OperatorStatus; callsWatching:number; assignedStores:string[]; liveObservation:string[]; };
type CaseType = "SI Call" | "Other Call" | "Dataminr";
/** incoming = store alert · working = on call elsewhere · open = needs coverage · closed = cleared */
type CallQueueStatus = "incoming" | "working" | "open" | "closed";

type Incident = {
  id: string;
  store: string;
  caseType: CaseType;
  time: string;
  queueStatus: CallQueueStatus;
  openedAt?: string;
  respondedAt?: string;
  severity: Severity;
  assigned?: string;
  notes?: string;
};
type Operator = { id: string; name: string; status: OperatorStatus; onStation: boolean; assignedStores: string[]; hotStore: string | null; liveObservation: string[]; observations: number; avatar: string; extension: string; callsWatching: number; socSite: SocSite | null; };
type DataminrAlert = { id: string; type: "shooting"|"weather"|"civil_unrest"|"fire"|"hazmat"|"power"|"traffic"; title: string; description: string; location: string; affectedStores: string[]; severity: Severity; time: string; source: string; };
type PAStore = { storeId: string; city: string; dateDown: string; daysDown: number; ticketNum: string; status: "Open"|"In Progress"|"Resolved"; assignedTech: string; };

interface StoreDetail {
  id: string; locationName: string; address: string; suite?: string; cityStateZip: string;
  phone: string; riskLevel: string; socMonitored: boolean; cctvInfo: string;
  shrinkDepts: { dept: string; amount: string }[];
  leadership: { regionalLPDirector: string; regionalLPPhone: string; districtLPManager: string; districtLPPhone: string; lpFieldInvestigator: string; opsRegionalDirector: string; opsDistrictManager: string; storeManager: string; };
  lawEnforcement: { agencyName: string; contactInfo: string; };
}

// Store details are built from live Bealls locator data + law enforcement lookup.

// ─── Operational Data ─────────────────────────────────────────────────────────

// ─── Live data from station assignments Excel ────────────────────────────────

const PRIORITY_STORE_DATA = VALID_PRIORITY_STORE_IDS.map((id) => {
  const { city, state } = parseCityState(storeLabel(id));
  return { id, city, region: state || "—", lp: "—", alarms: 0, cameras: 0, status: "monitoring" as const };
});

const OPPORTUNITY_STORE_DATA = VALID_OPPORTUNITY_STORE_IDS.map((id) => {
  const { city, state } = parseCityState(storeLabel(id));
  return { id, city, region: state || "—", trend: "up" as const, lossAmt: "—", alarms: 0 };
});

const WATCH_LIST_DATA = VALID_WATCH_LIST.map((s) => ({
  id: s.id,
  city: s.city,
  region: s.region,
  reason: s.reason,
  tier: s.tier,
  socMonitored: s.socMonitored,
  lastReview: s.lastReview,
  flag: s.flag,
}));

type BoloPerson = {
  id: string; caseId: string; label: string; description: string;
  lastStore: string; lastSeen: string; date: string; photo: string; notes: string; filePath: string;
  groupId: string; hitCount: number; storesHit: string[]; threat: "critical" | "high" | "medium";
};

type OrcGroup = {
  id: string; name: string; corridor: string; hitCount: number;
  storesHit: string[]; subjects: number; lastActive: string; threat: "critical" | "high" | "medium";
  notes: string;
};

// Demo ORC/BOLO fixtures only — not real case intel. filePath is intentionally a placeholder
// (never paste internal share paths like S:\… into the app).
const DEMO_CASE_FOLDER = "[Demo] Case folder — set your internal path when replacing sample data";

const ORC_GROUPS: OrcGroup[] = [
  { id:"G1", name:"I-95 East Coast Crew",     corridor:"I-95",     hitCount:14, storesHit:["147","210","192","020"], subjects:3, lastActive:"07/05/2026", threat:"critical", notes:"Demo sample: multi-store pattern on a major corridor. Linked to sample case C-202601." },
  { id:"G2", name:"Gulf Coast Runners",       corridor:"I-10",     hitCount:9,  storesHit:["073","127","048"],         subjects:2, lastActive:"07/04/2026", threat:"high",     notes:"Demo sample: quick in-and-out pattern along a gulf corridor." },
  { id:"G3", name:"Central FL Diversion Team",corridor:"I-4",      hitCount:6,  storesHit:["435","127"],              subjects:1, lastActive:"07/03/2026", threat:"medium",   notes:"Demo sample: pairs using distraction near registers." },
];

const BOLO_PEOPLE: BoloPerson[] = [
  { id:"B001", caseId:"C-202601", label:"Unknown Male",   description:"6'1\" · ~200 lbs · Dark hoodie · Black cap",  lastStore:"147", lastSeen:"14:12", date:"07/05/2026", photo:"https://images.unsplash.com/photo-1676195470090-7c90bf539b3b?w=160&h=200&fit=crop&auto=format", notes:"Demo sample — repeat visitor pattern across several stores.", filePath:DEMO_CASE_FOLDER, groupId:"G1", hitCount:5, storesHit:["147","210","192"], threat:"critical" },
  { id:"B002", caseId:"C-202602", label:"Unknown Female", description:"5'5\" · ~140 lbs · Gray jacket · Jeans",       lastStore:"210", lastSeen:"13:58", date:"07/05/2026", photo:"https://images.unsplash.com/photo-1728232032054-1546e634f03c?w=160&h=200&fit=crop&auto=format", notes:"Demo sample — associated with C-202601; possible diversion role.", filePath:DEMO_CASE_FOLDER, groupId:"G1", hitCount:4, storesHit:["210","147"], threat:"high" },
  { id:"B003", caseId:"C-202603", label:"Unknown Male",   description:"5'10\" · ~175 lbs · White tee · Blue cap",     lastStore:"192", lastSeen:"13:44", date:"07/04/2026", photo:"https://images.unsplash.com/photo-1595644258096-683dfe70d88f?w=160&h=200&fit=crop&auto=format", notes:"Demo sample — possible concealment method noted.", filePath:DEMO_CASE_FOLDER, groupId:"G1", hitCount:3, storesHit:["192","020"], threat:"high" },
  { id:"B004", caseId:"C-202604", label:"Unknown Male",   description:"6'0\" · ~190 lbs · Black jacket · Mask",       lastStore:"020", lastSeen:"13:35", date:"07/04/2026", photo:"https://images.unsplash.com/photo-1742138104342-eee6ce6ed855?w=160&h=200&fit=crop&auto=format", notes:"Demo sample — high-priority; treat as do-not-approach for training.", filePath:DEMO_CASE_FOLDER, groupId:"G2", hitCount:2, storesHit:["020"], threat:"critical" },
  { id:"B005", caseId:"C-202605", label:"Unknown Male",   description:"5'8\" · ~160 lbs · Red shirt · Khakis",        lastStore:"073", lastSeen:"13:20", date:"07/03/2026", photo:"https://images.unsplash.com/photo-1565538534766-87c0206acfef?w=160&h=200&fit=crop&auto=format", notes:"Demo sample — bag/boosting pattern in sample history.", filePath:DEMO_CASE_FOLDER, groupId:"G2", hitCount:3, storesHit:["073","048"], threat:"high" },
  { id:"B006", caseId:"C-202606", label:"Unknown Female", description:"5'6\" · ~130 lbs · Purple top · Black pants",  lastStore:"127", lastSeen:"13:10", date:"07/03/2026", photo:"https://images.unsplash.com/photo-1580559398448-41b11ce7e7d3?w=160&h=200&fit=crop&auto=format", notes:"Demo sample — distraction pattern; often works with a partner.", filePath:DEMO_CASE_FOLDER, groupId:"G3", hitCount:2, storesHit:["127","435"], threat:"medium" },
];

function matchesBoloQuery(p: BoloPerson, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const storeQ = q.replace(/^#/, "").replace(/\D/g, "");
  const group = ORC_GROUPS.find(g => g.id === p.groupId);
  return (
    p.caseId.toLowerCase().includes(q) ||
    p.label.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q) ||
    p.notes.toLowerCase().includes(q) ||
    (!!storeQ && (padStoreId(p.lastStore).includes(padStoreId(storeQ)) || p.storesHit.some(s => padStoreId(s) === padStoreId(storeQ)))) ||
    (!!group && group.name.toLowerCase().includes(q))
  );
}

function findBoloByQuery(raw: string): BoloPerson | undefined {
  const q = raw.trim();
  if (!q) return undefined;
  const exact = BOLO_PEOPLE.find(p => p.caseId.toLowerCase() === q.toLowerCase() || padStoreId(p.lastStore) === padStoreId(q.replace(/^#/, "")));
  if (exact) return exact;
  return BOLO_PEOPLE.find(p => matchesBoloQuery(p, q));
}

const DATAMINR_ALERTS: DataminrAlert[] = [
  { id:"DM001", type:"shooting",     title:"[Demo] Shots Fired Report — Nearby Mall",        description:"Demo alert: law enforcement responding near Store #147. Practice shelter-in-place workflow.",      location:"Demo Region A",     affectedStores:["147","226"], severity:"critical", time:"14:18", source:"Demo Scanner Feed" },
  { id:"DM002", type:"weather",      title:"[Demo] Tropical Storm Warning — SE Coast",      description:"Demo alert: tropical storm warning sample. Sustained winds and flash flood watches for training.",          location:"Southeast Demo Zone",  affectedStores:["127","210","073"], severity:"high", time:"13:55", source:"Demo Weather Feed" },
  { id:"DM003", type:"civil_unrest", title:"[Demo] Large Gathering — Downtown District",               description:"Demo alert: crowd gathering sample with road closures affecting store access.",             location:"Demo City Center",        affectedStores:["435"], severity:"medium", time:"13:40", source:"Demo News Feed" },
  { id:"DM004", type:"fire",         title:"[Demo] Structure Fire — Adjacent Strip Mall",           description:"Demo alert: fire response near Store #073. Smoke reported; no evacuation order yet.",            location:"Demo Coastal City",  affectedStores:["073"], severity:"high", time:"13:22", source:"Demo Fire Feed" },
  { id:"DM005", type:"power",        title:"[Demo] Widespread Power Outage — County Grid",      description:"Demo alert: major outage sample affecting thousands of customers. Estimated restoration several hours.",                                   location:"Demo County",       affectedStores:["020"], severity:"medium", time:"12:58", source:"Demo Utility Map" },
  { id:"DM006", type:"traffic",      title:"[Demo] Interstate Accident — Multi-Hour Delay",         description:"Demo alert: multi-vehicle accident blocking lanes. Alternate route sample for operator practice.",                                       location:"Demo Corridor", affectedStores:["023","048"], severity:"low", time:"12:30", source:"Demo Traffic Feed" },
  { id:"DM007", type:"hazmat",       title:"[Demo] Chemical Spill — Highway Near Store #192",   description:"Demo alert: HAZMAT team responding to tanker spill sample. Road closure within 0.5 miles of store.",         location:"Demo Metro Area",          affectedStores:["192"], severity:"high", time:"11:45", source:"Demo HAZMAT Feed" },
];

type CamStore = { storeId: string; city: string; camerasDown: number; totalCameras: number; reason: string; dateDown: string; daysDown: number; ticketNum: string; status: "Open"|"In Progress"|"Resolved"; assignedTech: string; };
type NVRStore  = { storeId: string; city: string; nvrUnit: string; dateDown: string; daysDown: number; camerasAffected: number; ticketNum: string; status: "Open"|"In Progress"|"Resolved"; assignedTech: string; };

const CAM_DOWN_STORES: CamStore[] = [
  { storeId:"127", city:"Daytona Beach",  camerasDown:16, totalCameras:16, reason:"Full NVR failure — all feeds lost",         dateDown:"07/05/2026", daysDown:0, ticketNum:"TKT-8830", status:"Open",        assignedTech:"IT Help Desk" },
  { storeId:"147", city:"Orangeburg",     camerasDown:4,  totalCameras:16, reason:"Cable damage — rear parking lot quad",      dateDown:"07/04/2026", daysDown:1, ticketNum:"TKT-8810", status:"In Progress", assignedTech:"R. Castillo" },
  { storeId:"192", city:"Tampa",          camerasDown:3,  totalCameras:18, reason:"Power surge — fitting room zone",           dateDown:"07/03/2026", daysDown:2, ticketNum:"TKT-8788", status:"In Progress", assignedTech:"Mike V." },
  { storeId:"020", city:"Sarasota",       camerasDown:2,  totalCameras:10, reason:"Lens obstruction reported by store LP",    dateDown:"07/02/2026", daysDown:3, ticketNum:"TKT-8762", status:"Open",        assignedTech:"Unassigned" },
  { storeId:"073", city:"St. Augustine", camerasDown:1,  totalCameras:10, reason:"Network switch dropped — entrance cam",    dateDown:"07/01/2026", daysDown:4, ticketNum:"TKT-8741", status:"In Progress", assignedTech:"Sara L." },
  { storeId:"023", city:"Port St. Lucie", camerasDown:2,  totalCameras:12, reason:"Vandalism — exterior cameras compromised", dateDown:"06/30/2026", daysDown:5, ticketNum:"TKT-8720", status:"Open",        assignedTech:"Unassigned" },
];

const NVR_DOWN_STORES: NVRStore[] = [
  { storeId:"127", city:parseCityState(storeLabel("127")).city, nvrUnit:"NVR-127-A", dateDown:"07/05/2026", daysDown:0,  camerasAffected:16, ticketNum:"TKT-8829", status:"Open",        assignedTech:"IT Help Desk" },
  { storeId:"066", city:parseCityState(storeLabel("066")).city, nvrUnit:"DVR-066-A", dateDown:"06/28/2026", daysDown:7,  camerasAffected:8,  ticketNum:"TKT-8700", status:"In Progress", assignedTech:"Vendor" },
  { storeId:"330", city:parseCityState(storeLabel("330")).city, nvrUnit:"DVR-330-A", dateDown:"06/25/2026", daysDown:10, camerasAffected:6,  ticketNum:"TKT-8655", status:"Open",        assignedTech:"Unassigned" },
  { storeId:"564", city:parseCityState(storeLabel("564")).city, nvrUnit:"DVR-564-A", dateDown:"06/20/2026", daysDown:15, camerasAffected:8,  ticketNum:"TKT-8610", status:"In Progress", assignedTech:"Vendor" },
];

const PA_DOWN_STORES: PAStore[] = [
  { storeId:"435", city:parseCityState(storeLabel("435")).city, dateDown:"07/05/2026", daysDown:0,  ticketNum:"TKT-8821", status:"Open",        assignedTech:"IT Help Desk" },
  { storeId:"192", city:parseCityState(storeLabel("192")).city, dateDown:"07/04/2026", daysDown:1,  ticketNum:"TKT-8799", status:"In Progress", assignedTech:"Mike V." },
  { storeId:"073", city:parseCityState(storeLabel("073")).city, dateDown:"07/01/2026", daysDown:4,  ticketNum:"TKT-8741", status:"In Progress", assignedTech:"Sara L." },
  { storeId:"023", city:parseCityState(storeLabel("023")).city, dateDown:"06/28/2026", daysDown:7,  ticketNum:"TKT-8692", status:"Open",        assignedTech:"Unassigned" },
  { storeId:"012", city:parseCityState(storeLabel("012")).city, dateDown:"06/25/2026", daysDown:10, ticketNum:"TKT-8644", status:"Resolved",    assignedTech:"Vendor" },
];

const INCIDENTS: Incident[] = [
  { id:"INC-001", store:"147", caseType:"SI Call",    time:"14:32", queueStatus:"incoming", severity:"high" },
  { id:"INC-002", store:"226", caseType:"SI Call",    time:"14:28", queueStatus:"incoming", severity:"medium" },
  { id:"INC-003", store:"210", caseType:"Other Call", time:"14:21", queueStatus:"working", openedAt:"14:22", severity:"medium", assigned:"Ty Kelly" },
  { id:"INC-004", store:"192", caseType:"SI Call",    time:"14:08", queueStatus:"open", openedAt:"14:09", severity:"high", notes:"Needs coverage" },
];

function callTimeNow(): string {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function nextIncidentId(incidents: Incident[]): string {
  const nums = incidents.map((i) => parseInt(i.id.replace(/\D/g, ""), 10)).filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `INC-${String(next).padStart(3, "0")}`;
}

function buildInitialOperators(): Operator[] {
  // assignedStores rotation advances each Sunday (see rotateAssignedStores / getSundayWeekIndex).
  return SOC_DATA.operators
    .filter((o) => o.assignedStores.length > 0)
    .map((o) => ({
      id: o.id,
      name: o.name,
      status: "Available" as OperatorStatus,
      onStation: false,
      assignedStores: rotateAssignedStores(o.assignedStores),
      hotStore: o.hotStore ? padStoreId(o.hotStore) : null,
      liveObservation: [],
      observations: 0,
      avatar: nameInitials(o.name),
      extension: o.extension.startsWith("x") ? o.extension : `x${o.extension}`,
      callsWatching: 0,
      socSite: (o.socSite === "FL" || o.socSite === "TX" ? o.socSite : null) as SocSite | null,
    }));
}

if (import.meta.env.DEV) {
  const tyRaw = SOC_DATA.operators.find((o) => o.name === "Ty Kelly");
  if (tyRaw) {
    const before = filterOpenBeallsIds(tyRaw.assignedStores);
    const after = rotateAssignedStores(tyRaw.assignedStores);
    console.info(
      `[soc] Sunday weekIndex=${getSundayWeekIndex()} · Ty Kelly assignedStores`,
      { before, after, priority: VALID_PRIORITY_STORE_IDS.length, opportunity: VALID_OPPORTUNITY_STORE_IDS.length },
    );
  }
}

function SiteBadge({ site, size = "sm" }: { site: SocSite | null | undefined; size?: "sm" | "md" }) {
  if (!site) return null;
  const sm = size === "sm";
  return (
    <span
      className={`font-bold tracking-wide border ${
        site === "FL"
          ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
          : "bg-orange-500/15 text-orange-400 border-orange-500/30"
      } ${sm ? "text-[9px] px-1.5 py-0.5 rounded" : "text-[10px] px-2 py-0.5 rounded-md"}`}
    >
      {site}
    </span>
  );
}

const OPERATOR_ROSTER = buildInitialOperators();

type SetOperators = Dispatch<SetStateAction<Operator[]>>;

function patchOperator(setOperators: SetOperators, id: string, patch: Partial<Operator>) {
  setOperators((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
}

function goOnStation(setOperators: SetOperators, id: string) {
  patchOperator(setOperators, id, {
    onStation: true,
    status: "Available",
    liveObservation: [],
  });
}

function goOffStation(setOperators: SetOperators, id: string) {
  patchOperator(setOperators, id, {
    onStation: false,
    status: "Available",
    callsWatching: 0,
    liveObservation: [],
  });
}

type OperatorBoardProps = {
  operators: Operator[];
  setOperators: SetOperators;
  myOperatorId: string;
  setMyOperatorId: (id: string) => void;
};

const ACTIVITY = [
  { id:"a1", time:"14:34", event:"SI Call — suspicious individual",  store:"147", type:"alarm" as const },
  { id:"a2", time:"14:32", event:"Marcus T. assigned to incident",   store:"147", type:"assign" as const },
  { id:"a3", time:"14:29", event:"Camera feed restored",             store:"127", type:"camera" as const },
  { id:"a4", time:"14:28", event:"SI Call — EAS tag activated",      store:"226", type:"alarm" as const },
  { id:"a5", time:"14:25", event:"BOLO subject spotted on camera",   store:"210", type:"bolo" as const },
  { id:"a6", time:"14:21", event:"Other Call — NVR issue",           store:"210", type:"camera" as const },
  { id:"a7", time:"14:15", event:"Other Call — PA system failure",   store:"435", type:"alarm" as const },
  { id:"a8", time:"14:09", event:"Incident resolved — clear",        store:"048", type:"resolve" as const },
];

// ─── Store Map — Bealls retail locations (stores.bealls.com) ─

function getStoreCoords(id: string): [number, number] | null {
  return lookupCoords(id);
}

function allMappedStoreIds(): string[] {
  return allBeallsStoreIds();
}

// ORC Interstate Corridors — projected escape/transit routes
// baseProb: baseline likelihood this route is used (adjusted by proximity)
const ORC_CORRIDORS = [
  {
    id:"I-95", name:"I-95 · East Coast", baseProb:92,
    desc:"Miami → Jax → Savannah → Richmond · Highest-volume ORC corridor in SE",
    color:"#F97316",
    coords:[
      [25.77,-80.19],[26.12,-80.14],[26.71,-80.05],[27.29,-80.35],[27.64,-80.40],
      [28.08,-80.61],[29.21,-81.02],[29.89,-81.32],[30.33,-81.66],[30.70,-81.47],
      [31.20,-81.40],[32.08,-81.09],[32.87,-79.97],[33.84,-78.65],[34.23,-77.95],
      [35.05,-78.88],[35.77,-78.64],[36.85,-76.29],[37.54,-77.43],[38.80,-77.05],
    ] as [number,number][],
  },
  {
    id:"I-75", name:"I-75 · West Coast / Interior", baseProb:88,
    desc:"Naples → Tampa → Atlanta → Chattanooga → Knoxville · Primary fencing corridor",
    color:"#3B82F6",
    coords:[
      [25.90,-80.43],[26.14,-81.80],[26.64,-81.87],[27.50,-82.57],[27.95,-82.46],
      [28.04,-81.95],[29.19,-82.14],[29.65,-82.33],[30.18,-82.65],[30.83,-82.28],
      [31.55,-83.60],[33.75,-84.39],[34.50,-84.00],[35.05,-85.31],[35.96,-83.92],
      [36.52,-82.53],[37.15,-84.09],[38.05,-84.50],
    ] as [number,number][],
  },
  {
    id:"I-10", name:"I-10 · Gulf Coast / Panhandle", baseProb:78,
    desc:"Jax → Tallahassee → Pensacola → Mobile → New Orleans → Houston",
    color:"#8B5CF6",
    coords:[
      [30.33,-81.66],[30.38,-82.60],[30.44,-84.28],[30.42,-86.20],[30.42,-87.22],
      [30.69,-88.04],[30.50,-89.09],[29.95,-90.07],[30.22,-93.20],[29.76,-95.37],
      [29.42,-98.49],[31.77,-106.50],
    ] as [number,number][],
  },
  {
    id:"I-85", name:"I-85 · Piedmont Corridor", baseProb:74,
    desc:"Atlanta → Charlotte → Raleigh-Durham · High-density retail strip, growing ORC",
    color:"#EC4899",
    coords:[
      [33.75,-84.39],[33.57,-85.07],[33.27,-85.80],[33.21,-87.57],[32.36,-86.30],
      [33.57,-85.07],[34.85,-82.39],[35.23,-80.84],[35.77,-78.64],[36.07,-79.79],
      [36.00,-78.90],
    ] as [number,number][],
  },
  {
    id:"I-20", name:"I-20 · Deep South", baseProb:71,
    desc:"Atlanta → Birmingham → Jackson → Dallas · Fence goods westward",
    color:"#10B981",
    coords:[
      [33.75,-84.39],[33.52,-86.80],[32.36,-86.30],[32.30,-90.18],[31.33,-89.33],
      [32.78,-96.80],[30.27,-97.74],
    ] as [number,number][],
  },
  {
    id:"I-40", name:"I-40 · Mid-South", baseProb:68,
    desc:"Memphis → Nashville → Knoxville → Asheville → Charlotte",
    color:"#EAB308",
    coords:[
      [35.15,-90.05],[35.61,-88.82],[35.83,-86.39],[36.17,-86.78],[35.96,-83.92],
      [35.96,-84.10],[35.52,-82.56],[35.05,-85.31],[35.73,-81.69],[35.23,-80.84],
    ] as [number,number][],
  },
  {
    id:"FL-TPK", name:"Florida Turnpike", baseProb:65,
    desc:"Miami → Orlando (toll) · Preferred for speed immediately after a hit",
    color:"#06B6D4",
    coords:[
      [25.77,-80.19],[26.12,-80.14],[26.71,-80.05],[27.64,-80.40],[28.08,-80.72],
      [28.29,-81.41],[28.54,-81.38],[28.84,-82.04],
    ] as [number,number][],
  },
  {
    id:"I-4", name:"I-4 · Central FL", baseProb:62,
    desc:"Tampa ↔ Daytona · Links west & east coasts through high-store density",
    color:"#F59E0B",
    coords:[
      [27.95,-82.46],[28.04,-81.95],[28.29,-81.41],[28.54,-81.38],[28.73,-81.14],
      [29.00,-81.02],[29.21,-81.02],
    ] as [number,number][],
  },
  {
    id:"I-75-ALY", name:"Alligator Alley (I-75)", baseProb:55,
    desc:"Naples ↔ Miami · Cross-Everglades post-hit escape route",
    color:"#14B8A6",
    coords:[
      [25.90,-80.43],[26.00,-81.05],[26.14,-81.80],
    ] as [number,number][],
  },
  {
    id:"I-26", name:"I-26 · Carolina Connector", baseProb:58,
    desc:"Columbia → Charleston → Asheville · Secondary SE distribution lane",
    color:"#A78BFA",
    coords:[
      [34.00,-81.03],[33.49,-80.86],[32.77,-79.93],[33.67,-82.02],[34.85,-82.39],
      [35.52,-82.56],
    ] as [number,number][],
  },
  {
    id:"I-275", name:"I-275 · Tampa Bay", baseProb:48,
    desc:"St. Pete / Clearwater ↔ Tampa · Local ORC redistribution loop",
    color:"#F472B6",
    coords:[
      [27.77,-82.64],[27.87,-82.68],[27.95,-82.46],[28.10,-82.44],
    ] as [number,number][],
  },
];

function distKm(a:[number,number], b:[number,number]): number {
  const R=6371, dL=(b[0]-a[0])*Math.PI/180, dN=(b[1]-a[1])*Math.PI/180;
  const x=Math.sin(dL/2)**2+Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dN/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

function distMi(a:[number,number], b:[number,number]): number {
  return distKm(a, b) * 0.621371;
}

/** Straight-line distance × road factor, ~55 mph average (interstate-heavy SE corridor). */
function estDriveMins(a:[number,number], b:[number,number]): number {
  const roadMi = distMi(a, b) * 1.28;
  return Math.max(1, Math.round((roadMi / 55) * 60));
}

function formatDistMi(km: number): string {
  const mi = km * 0.621371;
  return mi < 0.1 ? "<0.1 mi" : `${mi.toFixed(1)} mi`;
}

function MapFlyTo({pos}:{pos:[number,number]|null}) {
  const map = useMap();
  useEffect(()=>{ if(pos) map.flyTo(pos,10,{duration:1.5}); },[pos,map]);
  return null;
}

function createPinIcon(color:string, pulse=false, size=20): L.DivIcon {
  const ring = pulse
    ? `<circle cx="10" cy="10" r="10" fill="none" stroke="${color}" stroke-width="2" opacity="0.5"><animate attributeName="r" from="10" to="22" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite"/></circle>`
    : "";
  const h = Math.round(size * 1.35);
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}" viewBox="0 0 20 27" style="overflow:visible">${ring}<path d="M10,0 C4.5,0 0,4.5 0,10 C0,18 10,27 10,27 C10,27 20,18 20,10 C20,4.5 15.5,0 10,0 Z" fill="${color}" stroke="rgba(255,255,255,0.35)" stroke-width="0.8"/><circle cx="10" cy="10" r="3.5" fill="rgba(255,255,255,0.92)"/></svg>`,
    className: "",
    iconSize:   [size, h],
    iconAnchor: [size/2, h],
    popupAnchor:[0, -h],
  });
}

function systemsDownCount() {
  const open = (s: { status: string }) => s.status !== "Resolved";
  return (
    CAM_DOWN_STORES.filter(open).length +
    NVR_DOWN_STORES.filter(open).length +
    PA_DOWN_STORES.filter(open).length
  );
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard",        id: "dashboard" },
  { icon: Building2,       label: "Stores",           id: "stores" },
  { icon: MapIcon,         label: "Store Map",        id: "storemap" },
  { icon: Eye,             label: "BOLO",             id: "bolo" },
  { icon: Radio,           label: "Dataminr",         id: "dataminr" },
  { icon: Server,          label: "Systems Down",     id: "pa" },
  { icon: BarChart2,       label: "Reports",          id: "reports" },
  { icon: Settings,        label: "Settings",         id: "settings" },
];

function navBadge(id: string): number | undefined {
  switch (id) {
    case "dataminr":   return DATAMINR_ALERTS.length || undefined;
    case "pa":         return systemsDownCount() || undefined;
    default:           return undefined;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sevCfg(s: Severity) {
  const m = {
    critical:{ bg:"bg-red-500/15",    text:"text-red-400",    border:"border-red-500/30",    dot:"bg-red-500",    label:"CRITICAL", badge:"bg-red-500/20 text-red-400" },
    high:    { bg:"bg-orange-500/15", text:"text-orange-400", border:"border-orange-500/30", dot:"bg-orange-500", label:"HIGH",     badge:"bg-orange-500/20 text-orange-400" },
    medium:  { bg:"bg-yellow-500/15", text:"text-yellow-400", border:"border-yellow-500/30", dot:"bg-yellow-500", label:"MEDIUM",   badge:"bg-yellow-500/20 text-yellow-400" },
    low:     { bg:"bg-blue-500/15",   text:"text-blue-400",   border:"border-blue-500/30",   dot:"bg-blue-500",   label:"LOW",      badge:"bg-blue-500/20 text-blue-400" },
  };
  return m[s];
}
function opCfg(s: OperatorStatus) {
  const m = { Available:{ color:"text-emerald-400", bg:"bg-emerald-500/15", dot:"bg-emerald-500", Icon:CheckCircle }, Busy:{ color:"text-red-400", bg:"bg-red-500/15", dot:"bg-red-500", Icon:Circle }, Break:{ color:"text-yellow-400", bg:"bg-yellow-500/15", dot:"bg-yellow-500", Icon:Coffee } };
  return m[s];
}

function effectiveOperatorStatus(op: Operator): OperatorStatus {
  if (op.callsWatching >= 2 && op.status !== "Break") return "Busy";
  return op.status;
}

function StatusBadge({ status, size = "sm" }: { status: OperatorStatus; size?: "sm" | "md" }) {
  const sc = opCfg(status);
  const Icon = sc.Icon;
  return (
    <span className={`inline-flex items-center gap-1 font-bold border ${sc.bg} ${sc.color} ${
      size === "md" ? "px-2.5 py-1 rounded-lg text-xs border-current/25" : "px-1.5 py-0.5 rounded-md text-[9px] border-current/20"
    }`}>
      <Icon size={size === "md" ? 12 : 9} />
      {status}
    </span>
  );
}
function actCfg(t: string) {
  const m: Record<string,{color:string;Icon:React.ElementType}> = { alarm:{color:"bg-red-500",Icon:AlertTriangle}, assign:{color:"bg-blue-500",Icon:UserPlus}, resolve:{color:"bg-emerald-500",Icon:CheckCircle}, camera:{color:"bg-purple-500",Icon:Eye}, bolo:{color:"bg-orange-500",Icon:Eye} };
  return m[t] ?? { color:"bg-slate-500", Icon:Activity };
}
function dmCfg(t: DataminrAlert["type"]) {
  const m: Record<string,{Icon:React.ElementType;color:string;bg:string}> = {
    shooting:    {Icon:AlertOctagon,color:"text-red-400",    bg:"bg-red-500/15"},
    weather:     {Icon:CloudRain,   color:"text-blue-400",   bg:"bg-blue-500/15"},
    civil_unrest:{Icon:Users,       color:"text-orange-400", bg:"bg-orange-500/15"},
    fire:        {Icon:Flame,       color:"text-orange-400", bg:"bg-orange-500/15"},
    hazmat:      {Icon:AlertTriangle,color:"text-yellow-400",bg:"bg-yellow-500/15"},
    power:       {Icon:Zap,         color:"text-yellow-400", bg:"bg-yellow-500/15"},
    traffic:     {Icon:TrendingDown,color:"text-slate-400",  bg:"bg-slate-500/15"},
  };
  return m[t] ?? { Icon:Radio, color:"text-blue-400", bg:"bg-blue-500/15" };
}
const CASE_TYPE_STYLE: Record<CaseType,{bg:string;text:string}> = {
  "SI Call":   {bg:"bg-red-500/15",   text:"text-red-400"},
  "Other Call":{bg:"bg-yellow-500/15",text:"text-yellow-400"},
  "Dataminr":  {bg:"bg-purple-500/15",text:"text-purple-400"},
};
function parseTimeToMins(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function shiftAvgResponseMins(incidents: Incident[]): number | null {
  const responded = incidents.filter((i) => i.queueStatus !== "closed" && i.respondedAt);
  if (!responded.length) return null;
  return Math.round(
    responded.reduce((sum, i) => sum + parseTimeToMins(i.respondedAt!) - parseTimeToMins(i.time), 0) / responded.length,
  );
}

function ShiftAvgResponseBanner({ incidents }: { incidents: Incident[] }) {
  const avg = shiftAvgResponseMins(incidents);
  const responded = incidents.filter((i) => i.respondedAt).length;
  const cls =
    avg === null ? "border-border bg-card text-muted-foreground"
    : avg <= 2 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
    : avg <= 5 ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
    : "border-red-500/30 bg-red-500/10 text-red-400";
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${cls}`}>
      <Clock size={15} className="shrink-0" />
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest opacity-70">Avg. Response Time — This Shift</p>
        <p className="text-xl font-black leading-tight">{avg === null ? "—" : avg <= 0 ? "<1m" : `${avg}m`}</p>
      </div>
      <p className="text-[10px] opacity-60 ml-auto hidden sm:block">{responded} of {incidents.length} calls responded</p>
    </div>
  );
}

type StoreGuideEntry = {
  id: string;
  label: string;
  city: string;
  state: string;
  tags: string[];
  watch?: (typeof WATCH_LIST_DATA)[number];
  storeManager: string;
  storePhone: string;
  leAgency: string;
  lePhone: string;
  hasFullDetail: boolean;
};

function applyStoreLawEnforcement(detail: StoreDetail): StoreDetail {
  const le = storeLawEnforcement(detail.id);
  if (!le) return detail;
  return {
    ...detail,
    lawEnforcement: {
      agencyName: le.agencyName,
      contactInfo: le.contactInfo,
    },
  };
}

function lookupStoreDetail(storeId: string): StoreDetail {
  const id = padStoreId(storeId);
  if (!isOpenBeallsStore(id)) {
    return {
      id,
      locationName: `Unknown Store #${id}`,
      address: "—",
      cityStateZip: "—",
      phone: "—",
      riskLevel: "—",
      socMonitored: false,
      cctvInfo: "—",
      shrinkDepts: [],
      leadership: {
        regionalLPDirector: "—", regionalLPPhone: "", districtLPManager: "—", districtLPPhone: "",
        lpFieldInvestigator: "—", opsRegionalDirector: "—", opsDistrictManager: "—", storeManager: "—",
      },
      lawEnforcement: { agencyName: "—", contactInfo: "—" },
    };
  }

  const bealls = beallsStore(id);
  if (!bealls) {
    return {
      id,
      locationName: storeLabel(id),
      address: "—",
      cityStateZip: "—",
      phone: "—",
      riskLevel: "—",
      socMonitored: false,
      cctvInfo: "—",
      shrinkDepts: [],
      leadership: {
        regionalLPDirector: "—", regionalLPPhone: "", districtLPManager: "—", districtLPPhone: "",
        lpFieldInvestigator: "—", opsRegionalDirector: "—", opsDistrictManager: "—", storeManager: "—",
      },
      lawEnforcement: { agencyName: "—", contactInfo: "—" },
    };
  }

  const watch = WATCH_LIST_DATA.find((s) => padStoreId(s.id) === id);
  const le = storeLawEnforcement(id);

  return applyStoreLawEnforcement({
    id,
    locationName: bealls.label || storeLabel(id),
    address: bealls.address || "—",
    cityStateZip: bealls.zip ? `${bealls.city}, ${bealls.state} ${bealls.zip}` : `${bealls.city}, ${bealls.state}`,
    phone: bealls.phone || "—",
    riskLevel: watch?.tier ?? "—",
    socMonitored: watch?.socMonitored ?? true,
    cctvInfo: "—",
    shrinkDepts: [],
    leadership: {
      regionalLPDirector: "—",
      regionalLPPhone: "",
      districtLPManager: "—",
      districtLPPhone: "",
      lpFieldInvestigator: "—",
      opsRegionalDirector: "—",
      opsDistrictManager: "—",
      storeManager: "Contact district office",
    },
    lawEnforcement: le
      ? { agencyName: le.agencyName, contactInfo: le.contactInfo }
      : { agencyName: "Local Law Enforcement", contactInfo: "Verify non-emergency number locally" },
  });
}

function buildStoreCatalog(): StoreGuideEntry[] {
  const prioritySet = new Set(PRIORITY_STORE_DATA.map((s) => padStoreId(s.id)));
  const opportunitySet = new Set(OPPORTUNITY_STORE_DATA.map((s) => padStoreId(s.id)));
  const watchById = new Map(WATCH_LIST_DATA.map((s) => [padStoreId(s.id), s]));

  return allBeallsStoreIds().map((id) => {
    const detail = lookupStoreDetail(id);
    const { city, state } = parseCityState(detail.locationName);
    const tags: string[] = [];
    if (prioritySet.has(id)) tags.push("Priority");
    if (opportunitySet.has(id)) tags.push("Opportunity");
    return {
      id,
      label: detail.locationName,
      city,
      state,
      tags,
      watch: watchById.get(id),
      storeManager: detail.leadership.storeManager,
      storePhone: detail.phone,
      leAgency: detail.lawEnforcement.agencyName,
      lePhone: detail.lawEnforcement.contactInfo,
      hasFullDetail: true,
    };
  });
}

const STORE_TAG_STYLE: Record<string, string> = {
  Priority: "bg-red-500/15 text-red-400 border-red-500/25",
  Opportunity: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
};

const FLAG_STYLE: Record<string,{bg:string;text:string}> = {
  "Escalation Risk":{bg:"bg-red-500/15",    text:"text-red-400"},
  "Camera Gap":     {bg:"bg-purple-500/15", text:"text-purple-400"},
  "Staffing Gap":   {bg:"bg-orange-500/15", text:"text-orange-400"},
  "Tech Risk":      {bg:"bg-yellow-500/15", text:"text-yellow-400"},
  "SOC Gap":        {bg:"bg-slate-500/15",  text:"text-slate-400"},
  "Seasonal":       {bg:"bg-blue-500/15",   text:"text-blue-400"},
};

// ─── Shared Components ────────────────────────────────────────────────────────

function PageHeader({title,sub,action}:{title:string;sub?:string;action?:React.ReactNode}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div><h1 className="text-base font-bold text-foreground">{title}</h1>{sub&&<p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}</div>
      {action}
    </div>
  );
}
function StatCard({label,value,sub,color,icon:Icon,alert}:{label:string;value:string|number;sub?:string;color:string;icon:React.ElementType;alert?:boolean}) {
  return (
    <div className={`rounded-2xl border bg-card p-4 flex flex-col gap-3 hover:border-blue-500/30 transition-all ${alert?"border-red-500/30":"border-border"}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}><Icon size={14}/></div>
      </div>
      <div>
        <span className={`text-2xl font-bold leading-none ${alert?"text-red-400":"text-foreground"}`}>{value}</span>
        {sub&&<p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}
function Chip({children,className=""}:{children:React.ReactNode;className?:string}) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${className}`}>{children}</span>;
}
function StoreTag({id,color}:{id:string;color:string}) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold ${color}`}><MapPin size={9}/>#{id}</span>;
}

// ─── Store Locator Panel ──────────────────────────────────────────────────────

function StoreLocatorPanel({storeId,onClose}:{storeId:string;onClose:()=>void}) {
  const d = lookupStoreDetail(storeId);
  const watch = WATCH_LIST_DATA.find(s => padStoreId(s.id) === padStoreId(storeId));
  const riskColor = d.riskLevel==="Tier 1"?"text-red-400 bg-red-500/15":d.riskLevel==="Tier 2"?"text-orange-400 bg-orange-500/15":d.riskLevel==="Tier 3"?"text-yellow-400 bg-yellow-500/15":"text-emerald-400 bg-emerald-500/15";

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return createPortal(
    <div className="store-locator-overlay fixed inset-0 flex justify-end" style={{background:"rgba(0,0,0,0.65)"}} onClick={onClose}>
      <div className="relative z-[10001] w-full max-w-2xl h-full flex flex-col border-l border-border overflow-hidden shadow-2xl" style={{background:"#0F172A"}} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0" style={{background:"#0B1120"}}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Chip className={riskColor}><ShieldCheck size={10}/>{d.riskLevel}</Chip>
              <Chip className={d.socMonitored?"bg-emerald-500/15 text-emerald-400":"bg-yellow-500/15 text-yellow-400"}>{d.socMonitored?<><CheckCircle size={10}/>SOC Monitored</>:<><AlertTriangle size={10}/>Not Monitored</>}</Chip>
            </div>
            <h2 className="text-base font-bold text-foreground">{d.locationName}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><X size={16}/></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {watch && (
            <div className="rounded-xl border border-yellow-500/25 bg-yellow-500/5 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400 mb-2">Flagged — {watch.flag}</p>
              <p className="text-xs text-muted-foreground">{watch.reason}</p>
              {!watch.socMonitored && (
                <p className="text-[11px] text-red-400 font-semibold mt-2 flex items-center gap-1"><AlertTriangle size={11}/>Not SOC monitored</p>
              )}
            </div>
          )}
          <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} className="text-blue-400"/>
              <p className="text-[11px] font-bold tracking-widest text-blue-400 uppercase">Store Manager</p>
            </div>
            <p className="text-sm font-bold text-foreground">{d.leadership.storeManager}</p>
            {d.phone !== "—" && (
              <div className="flex items-center gap-2 mt-2">
                <Phone size={12} className="text-blue-400"/>
                <span className="font-mono font-bold text-blue-400">{d.phone}</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3"><div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center"><Building2 size={12} className="text-blue-400"/></div><p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Location Info</p></div>
              <div className="space-y-1.5 text-xs">
                <p className="text-foreground font-semibold">{d.address}{d.suite?`, ${d.suite}`:""}</p>
                <p className="text-foreground">{d.cityStateZip}</p>
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border"><Phone size={11} className="text-blue-400"/><span className="text-blue-400 font-mono font-semibold">{d.phone}</span></div>
                <div className="flex items-center gap-1.5"><ShieldCheck size={11} className={d.riskLevel==="Tier 1"?"text-red-400":"text-yellow-400"}/><span className="text-foreground">Risk Level: <span className={`font-bold ${d.riskLevel==="Tier 1"?"text-red-400":d.riskLevel==="Tier 2"?"text-orange-400":"text-yellow-400"}`}>{d.riskLevel}</span></span></div>
                <div className="flex items-center gap-1.5"><Eye size={11} className={d.socMonitored?"text-emerald-400":"text-yellow-400"}/><span className="text-foreground">SOC Monitored: <span className={`font-bold ${d.socMonitored?"text-emerald-400":"text-yellow-400"}`}>{d.socMonitored?"Yes":"No"}</span></span></div>
                <div className="flex items-start gap-1.5"><Activity size={11} className="text-purple-400 mt-0.5 shrink-0"/><span className="text-foreground">CCTV: <span className="font-mono text-purple-400">{d.cctvInfo}</span></span></div>
              </div>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-center gap-2 mb-3"><div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center"><Siren size={12} className="text-red-400"/></div><p className="text-[11px] font-bold tracking-widest text-red-400 uppercase">Law Enforcement Info</p></div>
              <div className="space-y-2 text-xs">
                <div><p className="text-muted-foreground text-[10px] uppercase tracking-widest font-semibold">Agency Name</p><p className="text-foreground font-bold text-sm mt-0.5">{d.lawEnforcement.agencyName}</p></div>
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase tracking-widest font-semibold">Non-Emergency Number</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Phone size={12} className="text-red-400"/>
                    {phoneTelHref(d.lawEnforcement.contactInfo) ? (
                      <a href={phoneTelHref(d.lawEnforcement.contactInfo)!} className="font-mono font-bold text-red-400 text-sm hover:underline">{d.lawEnforcement.contactInfo}</a>
                    ) : (
                      <span className="font-mono font-bold text-red-400 text-sm">{d.lawEnforcement.contactInfo}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">For emergencies, call 911.</p>
                </div>
                {phoneTelHref(d.lawEnforcement.contactInfo) && (
                  <a href={phoneTelHref(d.lawEnforcement.contactInfo)!} className="w-full flex items-center justify-center gap-2 py-2 mt-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/25 text-[11px] font-bold transition-colors">
                    <Phone size={11}/>Call Non-Emergency Line
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3"><div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center"><Users size={12} className="text-blue-400"/></div><p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Leadership Info</p></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              {[
                {label:"Regional LP Director",value:d.leadership.regionalLPDirector,phone:d.leadership.regionalLPPhone},
                {label:"District LP Manager", value:d.leadership.districtLPManager, phone:d.leadership.districtLPPhone},
                {label:"LP Field Investigator",value:d.leadership.lpFieldInvestigator},
                {label:"Ops Regional Director",value:d.leadership.opsRegionalDirector},
                {label:"Ops District Manager", value:d.leadership.opsDistrictManager},
                {label:"Store Manager",         value:d.leadership.storeManager},
              ].map(item=>(
                <div key={item.label} className="py-1.5 border-b border-border/50 last:border-0">
                  <p className="text-[10px] text-muted-foreground font-semibold underline">{item.label}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-foreground font-medium">{item.value}</span>
                    {item.phone&&<span className="font-mono text-blue-400 text-[11px]">{item.phone}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3"><div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center"><TrendingDown size={12} className="text-orange-400"/></div><p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Shrink Information</p></div>
            <div className="space-y-1">
              {d.shrinkDepts.map((dept,i)=>(
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-muted-foreground w-5">#{i+1}</span><span className="text-xs text-foreground">{dept.dept}</span></div>
                  <span className="text-xs font-mono font-bold text-orange-400">{dept.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Call board: Incoming (store alert) · Open (coverage) — Done clears; Working elsewhere ─

function CallBoard({
  incidents,
  setIncidents,
  setOperators,
  myOperatorId,
  operators,
  storeInputRef,
}: {
  incidents: Incident[];
  setIncidents: Dispatch<SetStateAction<Incident[]>>;
  setOperators: SetOperators;
  myOperatorId: string;
  operators: Operator[];
  storeInputRef?: RefObject<HTMLInputElement | null>;
}) {
  const me = operators.find((o) => o.id === myOperatorId);
  const myStores = useMemo(
    () => new Set((me?.assignedStores ?? []).map(padStoreId)),
    [me?.assignedStores],
  );
  const incoming = incidents.filter((i) => i.queueStatus === "incoming");
  const open = incidents.filter((i) => i.queueStatus === "open");
  const [storeInput, setStoreInput] = useState("");
  const [caseType, setCaseType] = useState<CaseType>("SI Call");
  const [inputErr, setInputErr] = useState("");

  const storeOwnerById = useMemo(() => {
    const map = new Map<string, { name: string; onStation: boolean }>();
    for (const op of operators) {
      for (const sid of op.assignedStores.map(padStoreId)) {
        const existing = map.get(sid);
        if (!existing || (!existing.onStation && op.onStation)) {
          map.set(sid, { name: op.name, onStation: op.onStation });
        }
      }
    }
    return map;
  }, [operators]);

  function bumpCalls(delta: number) {
    if (!me) return;
    patchOperator(setOperators, me.id, {
      callsWatching: Math.max(0, Math.min(5, me.callsWatching + delta)),
    });
  }

  function logIncoming() {
    const raw = storeInput.trim();
    if (!raw) return;
    const store = padStoreId(raw);
    if (!isOpenBeallsStore(store)) {
      setInputErr(`Store #${store} not found`);
      return;
    }
    setInputErr("");
    setIncidents((prev) => [
      {
        id: nextIncidentId(prev),
        store,
        caseType,
        time: callTimeNow(),
        queueStatus: "incoming",
        severity: caseType === "SI Call" ? "high" : "medium",
      },
      ...prev,
    ]);
    setStoreInput("");
    storeInputRef?.current?.focus();
  }

  /** Park for coverage handoff (optional path from Incoming). */
  function putInOpen(id: string) {
    const call = incidents.find((i) => i.id === id);
    setIncidents((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, queueStatus: "open" as const, openedAt: callTimeNow(), assigned: undefined, notes: "Needs coverage" }
          : i,
      ),
    );
    if (me && call?.assigned === me.name && call.queueStatus === "working") {
      bumpCalls(-1);
    }
  }

  /** Done — clear alert / coverage item (does not assign or move to working). */
  function markDone(id: string) {
    const call = incidents.find((i) => i.id === id);
    setIncidents((prev) =>
      prev.map((i) => (i.id === id ? { ...i, queueStatus: "closed" as const, respondedAt: callTimeNow() } : i)),
    );
    if (me && call?.assigned === me.name && call.queueStatus === "working") {
      bumpCalls(-1);
    }
  }

  return (
    <div className="space-y-2">
      {/* Open = needs coverage */}
      {open.length > 0 && (
        <div className="rounded-sm border border-red-500/40 bg-red-500/10 px-3 py-2">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
              Open — Needs Coverage · {open.length}
            </span>
            <span className="text-[10px] text-red-400/60">Done clears when handled</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {open.map((inc) => (
              <div
                key={inc.id}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-red-500/30 bg-red-500/15"
              >
                <span className="font-mono text-[12px] font-bold text-red-300">#{padStoreId(inc.store)}</span>
                <span className="text-[10px] text-red-400/80 hidden sm:inline">
                  {parseCityState(storeLabel(inc.store)).city}
                </span>
                <button
                  type="button"
                  onClick={() => markDone(inc.id)}
                  title="Clear — remove from Open"
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  Done
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border border-border rounded-sm overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1a2535] border-b border-white/5 flex-wrap">
          <Phone size={12} className="text-amber-400 shrink-0" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Incoming Calls</span>
          <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
            <input
              ref={storeInputRef}
              value={storeInput}
              onChange={(e) => { setStoreInput(e.target.value); setInputErr(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") logIncoming(); }}
              placeholder="Store # → Enter"
              className="w-28 px-2.5 py-1.5 rounded text-sm font-mono font-bold bg-card border border-amber-500/30 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              autoComplete="off"
            />
            {(["SI Call", "Other Call"] as CaseType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setCaseType(t)}
                className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                  caseType === t
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-transparent text-slate-500 border-border hover:text-foreground"
                }`}
              >
                {t === "SI Call" ? "SI" : "Other"}
              </button>
            ))}
            <button
              type="button"
              onClick={logIncoming}
              disabled={!storeInput.trim()}
              className="px-3 py-1.5 rounded text-[11px] font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black transition-colors"
            >
              Put in Incoming
            </button>
          </div>
          {inputErr && <span className="text-[10px] text-red-400 font-medium">{inputErr}</span>}
        </div>

        <div className="grid grid-cols-2 divide-x divide-white/5">
          {/* Incoming */}
          <div className="min-w-0">
            <div className="px-3 py-1 bg-amber-500/15 border-b border-amber-500/25 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Incoming</span>
              <span className="text-[9px] text-amber-400/50 truncate hidden sm:inline">Store alert · Done clears</span>
              <span className="text-[10px] font-mono font-bold text-amber-400">{incoming.length}</span>
            </div>
            <div className="max-h-44 overflow-y-auto">
              {incoming.length === 0 ? (
                <p className="px-3 py-5 text-center text-[11px] text-muted-foreground/50">Type a store # above</p>
              ) : (
                <ul>
                  {incoming.map((inc) => {
                    const sid = padStoreId(inc.store);
                    const owner = storeOwnerById.get(sid);
                    const isMine = !!me && (owner?.name === me.name || myStores.has(sid));
                    return (
                      <li
                        key={inc.id}
                        className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 hover:bg-amber-500/5"
                      >
                        <span className="font-mono text-[12px] font-bold text-amber-300 w-10 shrink-0">#{sid}</span>
                        <span className="text-[10px] text-slate-500 truncate flex-1 min-w-0">
                          {parseCityState(storeLabel(inc.store)).city}
                          {owner ? (
                            <span className={`ml-1.5 ${isMine ? "text-emerald-400" : "text-amber-400/90"}`}>
                              <span className="text-slate-600">Store:</span>{" "}
                              <span className="font-semibold">{isMine ? "Yours" : owner.name}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 ml-1.5">Store: Unassigned</span>
                          )}
                        </span>
                        <span className="font-mono text-[10px] text-slate-600 shrink-0">{inc.time}</span>
                        <button
                          type="button"
                          onClick={() => putInOpen(inc.id)}
                          title="Put in Open for coverage handoff"
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-red-300/80 border border-red-500/25 hover:bg-red-500/15 transition-colors shrink-0"
                        >
                          → Open
                        </button>
                        <button
                          type="button"
                          onClick={() => markDone(inc.id)}
                          title="Done — clear store alert"
                          className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shrink-0"
                        >
                          Done
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Open handoff column */}
          <div className="min-w-0">
            <div className="px-3 py-1 bg-red-500/15 border-b border-red-500/25 flex items-center justify-between">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Open (Coverage)</span>
              <span className="text-[10px] font-mono font-bold text-red-400">{open.length}</span>
            </div>
            <div className="max-h-44 overflow-y-auto">
              {open.length === 0 ? (
                <p className="px-3 py-5 text-center text-[11px] text-muted-foreground/50">
                  Coverage handoffs appear here — Done clears
                </p>
              ) : (
                <ul>
                  {open.map((inc) => (
                    <li
                      key={inc.id}
                      className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 bg-red-500/[0.04] hover:bg-red-500/10"
                    >
                      <span className="font-mono text-[12px] font-bold text-red-400 w-10 shrink-0">#{padStoreId(inc.store)}</span>
                      <span className="text-[10px] text-slate-400 truncate flex-1 min-w-0">
                        {parseCityState(storeLabel(inc.store)).city}
                        <span className="text-red-400/70 ml-1.5">Needs coverage</span>
                      </span>
                      <span className="font-mono text-[10px] text-slate-600 shrink-0">{inc.openedAt ?? inc.time}</span>
                      <button
                        type="button"
                        onClick={() => markDone(inc.id)}
                        title="Done — clear from Open"
                        className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shrink-0"
                      >
                        Done
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IncidentCard({inc,onAssign}:{inc:Incident;onAssign:(id:string)=>void}) {
  const sc = sevCfg(inc.severity);
  const ct = CASE_TYPE_STYLE[inc.caseType];
  const [assigned,setAssigned] = useState(!!inc.assigned);
  return (
    <div className={`rounded-lg border ${sc.border} ${sc.bg} p-3 flex flex-col gap-2 hover:scale-[1.01] transition-transform`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} shrink-0 ${inc.severity==="critical"?"animate-pulse":""}`}/>
            <span className={`text-[10px] font-bold tracking-widest ${sc.text}`}>{sc.label}</span>
            <Chip className={`${ct.bg} ${ct.text}`}>{inc.caseType}</Chip>
          </div>
          <p className="text-sm font-bold font-mono text-foreground">Store #{inc.store}</p>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground shrink-0 pt-0.5">{inc.time}</span>
      </div>
      {inc.assigned&&<p className="text-[11px] text-blue-400 font-medium">→ {inc.assigned}</p>}
      <button onClick={()=>{setAssigned(true);onAssign(inc.id);}} className={`w-full flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${assigned?"bg-emerald-500/20 text-emerald-400 border border-emerald-500/30":"bg-blue-600 hover:bg-blue-500 text-white"}`}>
        <UserPlus size={10}/>{assigned?"Assigned":"Assign"}
      </button>
    </div>
  );
}

// ─── Operator Card ────────────────────────────────────────────────────────────

function OperatorCard({op, isMe}:{op:Operator; isMe?: boolean}) {
  const autoBusy = op.callsWatching >= 2;
  const effectiveStatus: OperatorStatus = autoBusy && op.status !== "Break" ? "Busy" : op.status;
  const sc = opCfg(effectiveStatus);
  const StatusIcon = sc.Icon;
  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-4 transition-all ${isMe ? "border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50" : "border-border bg-card hover:border-blue-500/30"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${isMe ? "bg-gradient-to-br from-blue-500 to-blue-700" : "bg-gradient-to-br from-blue-600 to-blue-800"}`}>{op.avatar}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground truncate">{op.name}</p>
            {isMe && <span className="text-[9px] font-bold bg-blue-500 text-white px-1 py-0.5 rounded shrink-0">YOU</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${sc.bg}`}><StatusIcon size={10} className={sc.color}/><span className={`text-xs font-medium ${sc.color}`}>{effectiveStatus}</span></div>
            {autoBusy && <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">AUTO</span>}
            <span className="text-[11px] font-mono text-muted-foreground">{op.extension}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-foreground">{op.observations}</p>
          <p className="text-xs text-muted-foreground">obs.</p>
          {op.callsWatching > 0 && (
            <div className="flex items-center justify-end gap-1 mt-1">
              <Eye size={9} className={op.callsWatching >= 2 ? "text-red-400" : "text-muted-foreground"}/>
              <span className={`text-[9px] font-mono font-bold ${op.callsWatching >= 2 ? "text-red-400" : "text-muted-foreground"}`}>{op.callsWatching}</span>
            </div>
          )}
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live Obs</p>
            </div>
            <span className="text-[9px] font-mono text-muted-foreground">{op.liveObservation.length}/3</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {op.liveObservation.length > 0
              ? op.liveObservation.map(s=><StoreTag key={s} id={s} color="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"/>)
              : <span className="text-[9px] text-muted-foreground italic">None selected</span>
            }
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assigned</p>
            <span className="text-[9px] font-mono text-muted-foreground">{op.assignedStores.length} stores</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {op.assignedStores.map(s=>{
              const isLive = op.liveObservation.includes(s);
              return <StoreTag key={s} id={s} color={isLive ? "bg-emerald-500/10 text-emerald-500/60" : "bg-secondary/60 text-muted-foreground"}/>;
            })}
          </div>
        </div>
      </div>
      <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 transition-colors"><UserPlus size={11}/>Assign Store</button>
    </div>
  );
}

// ─── My Status Card ───────────────────────────────────────────────────────────

function MyStatusCard({
  operators,
  setOperators,
  myOperatorId,
  setMyOperatorId,
  incomingSet,
  workingSet,
  openSet,
}: OperatorBoardProps & {
  incomingSet?: Set<string>;
  workingSet?: Set<string>;
  openSet?: Set<string>;
}) {
  const me = operators.find((o) => o.id === myOperatorId) ?? operators[0];
  const [nameSearch, setNameSearch] = useState("");
  const [inputs, setInputs] = useState<[string, string, string]>(["", "", ""]);

  if (!me) return null;

  const autoBusy = me.callsWatching >= 2 && me.status !== "Break";
  const effectiveStatus = effectiveOperatorStatus(me);
  const sc = opCfg(effectiveStatus);

  const filteredRoster = operators.filter(
    (o) =>
      o.name.toLowerCase().includes(nameSearch.toLowerCase()) ||
      o.extension.includes(nameSearch),
  );

  function setSlotInput(slot: number, val: string) {
    setInputs((prev) => {
      const n = [...prev] as [string, string, string];
      n[slot] = val.toUpperCase();
      return n;
    });
  }

  function confirmSlot(slot: number) {
    const id = padStoreId(inputs[slot].trim());
    if (!id || id === "000" || !isOpenBeallsStore(id) || me.liveObservation.includes(id) || me.liveObservation.length >= 3) return;
    patchOperator(setOperators, me.id, { liveObservation: [...me.liveObservation, id] });
    setSlotInput(slot, "");
  }

  function removeLiveObs(id: string) {
    patchOperator(setOperators, me.id, {
      liveObservation: me.liveObservation.filter((s) => s !== id),
    });
  }

  function handleGoOnStation() {
    goOnStation(setOperators, me.id);
    setInputs(["", "", ""]);
  }

  function handleGoOff() {
    goOffStation(setOperators, me.id);
    setInputs(["", "", ""]);
  }

  if (!me.onStation) {
    return (
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <UserPlus size={14} className="text-blue-400" />
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">Sign In to Operator Board</h2>
        </div>
        <p className="text-[11px] text-muted-foreground mb-2">
          Select your name, then go on station to appear on the Watching Wall.
        </p>
        <div className="relative mb-2">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            placeholder="Search by name or extension…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        <div className="max-h-36 overflow-y-auto rounded-lg border border-border mb-2 divide-y divide-border">
          {filteredRoster.map((op) => (
            <button
              key={op.id}
              onClick={() => setMyOperatorId(op.id)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition-colors hover:bg-secondary/60 ${
                op.id === myOperatorId ? "bg-blue-600/15 border-l-2 border-l-blue-500" : ""
              }`}
            >
              <div className="min-w-0 flex items-center gap-1.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{op.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{op.extension} · {op.assignedStores.length} stores</p>
                </div>
                <SiteBadge site={op.socSite} />
              </div>
              {op.onStation && (
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0 ml-2">
                  On board
                </span>
              )}
            </button>
          ))}
          {filteredRoster.length === 0 && (
            <p className="px-3 py-3 text-[11px] text-muted-foreground text-center">No operators match your search.</p>
          )}
        </div>
        <button
          onClick={handleGoOnStation}
          className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg font-bold text-xs bg-blue-600 border border-blue-500 text-white hover:bg-blue-500 transition-all"
        >
          <div className="w-2 h-2 rounded-full bg-white/70" />
          Go On Station — {me.name}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 bg-gradient-to-br from-blue-500 to-blue-700">
            {me.avatar}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs font-bold text-foreground">{me.name}</h2>
              <SiteBadge site={me.socSite} />
              <StatusBadge status={effectiveStatus} size="sm" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
              {me.extension} · {me.assignedStores.length} stores
              <span className="text-emerald-400 ml-1.5">· On Station</span>
            </p>
          </div>
        </div>
        {autoBusy && (
          <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
            AUTO-BUSY · {me.callsWatching}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleGoOff}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all border bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            On Station — Go Off
          </button>

          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mr-0.5">Avail</span>
            {(["Available", "Busy", "Break"] as OperatorStatus[]).map((s) => {
              const cfg = opCfg(s);
              const Icon = cfg.Icon;
              const active = effectiveStatus === s;
              const locked = autoBusy && s === "Busy";
              return (
                <button
                  key={s}
                  onClick={() => !locked && patchOperator(setOperators, me.id, { status: s })}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border transition-all ${
                    active ? `${cfg.bg} ${cfg.color}` : "border-border text-muted-foreground hover:text-foreground hover:border-blue-500/30"
                  } ${locked ? "cursor-default" : ""}`}
                  style={active ? { borderColor: s === "Available" ? "#10b981" : s === "Busy" ? "#ef4444" : "#eab308" } : undefined}
                >
                  <Icon size={10} />
                  {s}
                  {locked && <span className="text-[8px] ml-0.5 opacity-70">(auto)</span>}
                </button>
              );
            })}
            <div className="flex items-center gap-1 ml-1.5 pl-1.5 border-l border-border">
              <Eye size={11} className={me.callsWatching >= 2 ? "text-red-400" : "text-muted-foreground"} />
              <span className={`text-[11px] font-mono font-bold ${me.callsWatching >= 2 ? "text-red-400" : "text-muted-foreground"}`}>{me.callsWatching}</span>
              <button
                onClick={() => patchOperator(setOperators, me.id, { callsWatching: Math.max(0, me.callsWatching - 1) })}
                disabled={me.callsWatching === 0}
                className="w-4 h-4 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors text-xs font-bold"
              >
                −
              </button>
              <button
                onClick={() => patchOperator(setOperators, me.id, { callsWatching: Math.min(5, me.callsWatching + 1) })}
                className="w-4 h-4 rounded flex items-center justify-center text-blue-400 hover:bg-blue-500/10 transition-colors text-xs font-bold"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between mb-1 gap-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">My Assigned Stores</p>
            <span className="text-[9px] font-mono text-muted-foreground">{me.assignedStores.length}</span>
          </div>
          {me.assignedStores.length === 0 ? (
            <p className="text-[10px] text-muted-foreground/50 italic">No stores assigned</p>
          ) : (
            <div className="flex flex-wrap gap-1 max-h-[2.75rem] overflow-y-auto content-start">
              {me.assignedStores.map((s) => {
                const sid = padStoreId(s);
                const isOpen = openSet?.has(sid);
                const isWorking = workingSet?.has(sid);
                const isIncoming = incomingSet?.has(sid);
                return (
                  <span
                    key={sid}
                    title={storeLabel(sid)}
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      isOpen
                        ? "bg-red-500 text-white border-red-400"
                        : isWorking
                          ? "bg-blue-500 text-white border-blue-400"
                          : isIncoming
                            ? "bg-amber-400 text-black border-amber-300"
                            : "bg-secondary/60 text-foreground border-border"
                    }`}
                  >
                    #{sid}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Live Observation</p>
            <span className="text-[9px] text-muted-foreground/50">type # · Enter · {me.liveObservation.length}/3</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
            {[0, 1, 2].map((slot) => {
              const stored = me.liveObservation[slot];
              return stored ? (
                <div key={slot} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="font-mono font-bold text-[11px] text-emerald-400">#{padStoreId(stored)}</span>
                  <button
                    onClick={() => removeLiveObs(stored)}
                    className="ml-auto p-0.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div key={slot} className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-dashed border-border/40 hover:border-border focus-within:border-emerald-500/40 transition-colors bg-secondary/10">
                  <span className="text-[9px] text-muted-foreground/30 font-mono shrink-0">{slot + 1}</span>
                  <input
                    value={inputs[slot]}
                    onChange={(e) => setSlotInput(slot, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") confirmSlot(slot); }}
                    placeholder="Store #"
                    maxLength={10}
                    className="flex-1 min-w-0 bg-transparent text-[11px] font-mono text-foreground placeholder:text-muted-foreground/25 focus:outline-none"
                  />
                  {inputs[slot].trim() && (
                    <button
                      onClick={() => confirmSlot(slot)}
                      className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 transition-colors shrink-0"
                    >
                      Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardView({ incidents, setIncidents, operators, setOperators, myOperatorId, setMyOperatorId }: OperatorBoardProps & { incidents: Incident[]; setIncidents: Dispatch<SetStateAction<Incident[]>>; onAssign?: (id: string) => void }) {
  const incomingCalls = incidents.filter((i) => i.queueStatus === "incoming");
  const workingCalls = incidents.filter((i) => i.queueStatus === "working");
  const openCalls = incidents.filter((i) => i.queueStatus === "open");
  const activeIncidents = incidents.filter((i) => i.queueStatus !== "closed");
  const incomingSet = new Set(incomingCalls.map((i) => padStoreId(i.store)));
  const workingSet = new Set(workingCalls.map((i) => padStoreId(i.store)));
  const openSet = new Set(openCalls.map((i) => padStoreId(i.store)));
  const incidentSet = new Set(activeIncidents.map((i) => padStoreId(i.store)));
  const onStationOps = operators.filter(o=>o.onStation);
  const liveObsSet   = new Set(onStationOps.flatMap(o=>o.liveObservation.map(padStoreId)));
  const slotSet      = getActiveSlotStoreIds();
  const timeSlot     = getCurrentTimeSlot();
  const storeInputRef = useRef<HTMLInputElement>(null);
  const me = operators.find(o => o.id === myOperatorId);

  function chunk<T>(arr: T[], n: number): T[][] {
    const out: T[][] = [];
    for (let i=0; i<arr.length; i+=n) out.push(arr.slice(i,i+n));
    return out;
  }

  // Open (coverage) = red · Working = blue · Incoming = amber · live obs = dimmer blue
  function cellCls(id: string) {
    const sid = padStoreId(id);
    if (openSet.has(sid)) return "bg-red-500 text-white font-bold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)]";
    if (workingSet.has(sid)) return "bg-blue-500 text-white font-bold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]";
    if (incomingSet.has(sid)) return "bg-amber-400 text-black font-bold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]";
    if (liveObsSet.has(sid)) return "text-white font-bold bg-blue-600/40";
    if (slotSet.has(sid)) return "bg-emerald-500/30 text-emerald-100 font-semibold ring-1 ring-emerald-500/40";
    return "text-slate-500";
  }

  function StoreCell({ id }: { id: string }) {
    const sid = padStoreId(id);
    const lit = openSet.has(sid) || workingSet.has(sid) || incomingSet.has(sid);
    return (
      <div
        className={`flex-1 min-w-0 text-center font-mono text-[10px] py-0.5 px-0.5 border-r border-white/5 last:border-r-0 transition-colors ${cellCls(sid)} ${lit ? "relative z-[1]" : ""}`}
        title={storeLabel(sid)}
      >
        {sid}
      </div>
    );
  }

  const priorityIds = PRIORITY_STORE_DATA.map((s) => padStoreId(s.id));
  const oppIds = OPPORTUNITY_STORE_DATA.map((s) => padStoreId(s.id));
  const priorityCols = priorityIds.length > 18 ? 6 : 5;
  const oppCols = oppIds.length > 40 ? 10 : 8;
  const avgResponse = shiftAvgResponseMins(incidents);
  const activeCallStores = new Set([...incomingSet, ...workingSet, ...openSet]);

  return (
    <div className="space-y-2">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-xs font-bold text-foreground tracking-wide">Bealls SOC</span>
            <span className="text-[11px] text-muted-foreground ml-2">
              {new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}
            </span>
            <span className="font-mono text-[11px] text-blue-400 ml-1">
              {new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}
            </span>
            {me?.onStation && (
              <span className="inline-flex items-center gap-1.5 ml-2 pl-2 border-l border-border">
                <span className="text-[11px] font-semibold text-foreground">{me.name}</span>
                <SiteBadge site={me.socSite} size="md" />
                <StatusBadge status={effectiveOperatorStatus(me)} />
              </span>
            )}
          </div>
          {/* Tiny stat pills */}
          <div className="hidden md:flex items-center gap-1.5 ml-2">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-400 border border-emerald-500/25 bg-emerald-500/10">
              <Clock size={9}/>{timeSlotLabel(timeSlot)}
            </span>
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${avgResponse === null ? "text-slate-500 border-border" : avgResponse <= 2 ? "text-emerald-400 border-emerald-500/25 bg-emerald-500/10" : avgResponse <= 5 ? "text-yellow-400 border-yellow-500/20 bg-yellow-500/10" : "text-red-400 border-red-500/20 bg-red-500/10"}`}>
              <Clock size={9}/>{avgResponse === null ? "— avg" : `${avgResponse <= 0 ? "<1" : avgResponse}m avg`}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-500 border border-border">
              <Users size={9}/>{onStationOps.length} on station
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {openCalls.length > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {openCalls.length} Open
            </span>
          )}
          {incomingCalls.length > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">
              {incomingCalls.length} Incoming
            </span>
          )}
          <button
            onClick={() => storeInputRef.current?.focus()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold transition-colors"
          >
            <Plus size={11}/>Put in Incoming
          </button>
        </div>
      </div>

      <CallBoard
        incidents={incidents}
        setIncidents={setIncidents}
        setOperators={setOperators}
        myOperatorId={myOperatorId}
        operators={operators}
        storeInputRef={storeInputRef}
      />

      {/* ── My Status ── */}
      <MyStatusCard
        operators={operators}
        setOperators={setOperators}
        myOperatorId={myOperatorId}
        setMyOperatorId={setMyOperatorId}
        incomingSet={incomingSet}
        workingSet={workingSet}
        openSet={openSet}
      />

      {/* ── Priority + Opportunity store grids ── */}
      <div className="grid grid-cols-2 gap-2">
        <div className="border border-border overflow-hidden rounded-sm">
          <div className="bg-[#1a2535] text-slate-400 text-[9px] font-bold tracking-[0.2em] uppercase text-center py-0.5 border-b border-white/5">
            Priority Stores
          </div>
          {chunk(priorityIds, priorityCols).map((row, i) => (
            <div key={i} className={`flex border-b border-white/5 last:border-b-0 ${i % 2 === 0 ? "bg-card" : "bg-[#151f30]"}`}>
              {row.map((id) => <StoreCell key={id} id={id} />)}
              {row.length < priorityCols && Array(priorityCols - row.length).fill(0).map((_, j) => (
                <div key={`p-empty-${j}`} className="flex-1 border-r border-white/5 last:border-r-0" />
              ))}
            </div>
          ))}
        </div>

        <div className="border border-border overflow-hidden rounded-sm">
          <div className="bg-[#1a2535] text-slate-400 text-[9px] font-bold tracking-[0.2em] uppercase text-center py-0.5 border-b border-white/5">
            Opportunity Stores
          </div>
          {chunk(oppIds, oppCols).map((row, i) => (
            <div key={i} className={`flex border-b border-white/5 last:border-b-0 ${i % 2 === 0 ? "bg-card" : "bg-[#151f30]"}`}>
              {row.map((id) => <StoreCell key={id} id={id} />)}
              {row.length < oppCols && Array(oppCols - row.length).fill(0).map((_, j) => (
                <div key={`o-empty-${j}`} className="flex-1 border-r border-white/5 last:border-r-0" />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[9px] text-muted-foreground px-0.5 flex-wrap">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400" /> Incoming = store alert · Done clears</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500" /> Open = coverage · Done clears</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500" /> Working (elsewhere)</span>
      </div>

      <WatchingWall
        operators={operators}
        myOperatorId={myOperatorId}
        activeCallStores={activeCallStores}
        incomingSet={incomingSet}
        workingSet={workingSet}
        openSet={openSet}
      />

    </div>
  );
}

// ─── Watching Wall (FL | TX) ──────────────────────────────────────────────────

function WatchingWall({
  operators,
  myOperatorId,
  activeCallStores,
  incomingSet,
  workingSet,
  openSet,
}: {
  operators: Operator[];
  myOperatorId: string;
  activeCallStores: Set<string>;
  incomingSet: Set<string>;
  workingSet: Set<string>;
  openSet: Set<string>;
}) {
  const [showAll, setShowAll] = useState(false);

  function siteOps(site: SocSite) {
    const list = operators.filter((o) => o.socSite === site);
    const filtered = showAll ? list : list.filter((o) => o.onStation);
    return filtered.sort((a, b) => {
      if (a.onStation !== b.onStation) return a.onStation ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  function obsChipCls(sid: string) {
    if (openSet.has(sid)) return "bg-red-500 text-white border-red-400";
    if (workingSet.has(sid)) return "bg-blue-500 text-white border-blue-400";
    if (incomingSet.has(sid)) return "bg-amber-400 text-black border-amber-300";
    if (activeCallStores.has(sid)) return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
  }

  function Column({ site, label }: { site: SocSite; label: string }) {
    const ops = siteOps(site);
    const onCount = operators.filter((o) => o.socSite === site && o.onStation).length;
    return (
      <div className="min-h-[8rem] border-t md:border-t-0 border-border first:border-t-0">
        <div className="flex items-center justify-between px-2 py-1 bg-[#151f30] border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <SiteBadge site={site} />
            <span className="text-[9px] font-bold text-slate-400 tracking-[0.15em] uppercase">{label}</span>
          </div>
          <span className="text-[9px] font-mono text-muted-foreground">{onCount} on station</span>
        </div>
        <div className="divide-y divide-border/60 max-h-56 overflow-y-auto">
          {ops.length === 0 ? (
            <p className="px-2 py-3 text-[10px] text-muted-foreground/60 italic text-center">
              {showAll ? "No operators" : "No one on station"}
            </p>
          ) : (
            ops.map((op) => {
              const isYou = op.id === myOperatorId;
              const eff = effectiveOperatorStatus(op);
              return (
                <div
                  key={op.id}
                  className={`px-2 py-1.5 ${isYou ? "bg-blue-600/10" : op.onStation ? "bg-card" : "bg-secondary/20 opacity-70"}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${op.onStation ? "bg-emerald-400" : "bg-slate-600"}`} />
                    <span className="text-[11px] font-semibold text-foreground truncate">{op.name}</span>
                    <span className="text-[9px] font-mono text-muted-foreground shrink-0">{op.extension}</span>
                    <StatusBadge status={eff} size="sm" />
                    {isYou && (
                      <span className="text-[8px] font-bold text-blue-400 bg-blue-500/15 border border-blue-500/25 px-1 py-px rounded shrink-0">
                        YOU
                      </span>
                    )}
                    {!op.onStation && showAll && (
                      <span className="text-[8px] font-bold text-slate-500 ml-auto shrink-0">OFF</span>
                    )}
                  </div>
                  {op.liveObservation.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1 ml-3.5">
                      {op.liveObservation.map((s) => {
                        const sid = padStoreId(s);
                        const hot = activeCallStores.has(sid);
                        return (
                          <span
                            key={sid}
                            title={storeLabel(sid)}
                            className={`font-mono text-[9px] font-bold px-1 py-px rounded border ${obsChipCls(sid)} ${hot ? "ring-1 ring-white/30" : ""}`}
                          >
                            #{sid}
                          </span>
                        );
                      })}
                    </div>
                  ) : op.onStation ? (
                    <p className="text-[9px] text-muted-foreground/40 ml-3.5 mt-0.5">No live obs</p>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1 bg-[#1a2535] border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <Eye size={11} className="text-slate-400" />
          <span className="text-[9px] font-bold text-slate-400 tracking-[0.15em] uppercase">Watching Wall</span>
          <span className="text-[9px] text-muted-foreground">who’s on station · live obs stores</span>
        </div>
        <button
          onClick={() => setShowAll((v) => !v)}
          className={`text-[9px] font-semibold px-2 py-0.5 rounded border transition-colors ${
            showAll
              ? "bg-secondary text-foreground border-border"
              : "text-muted-foreground border-border hover:text-foreground"
          }`}
        >
          {showAll ? "On-station only" : "Show all"}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-border">
        <Column site="FL" label="SOC-FL" />
        <Column site="TX" label="SOC-TX" />
      </div>
    </div>
  );
}

// ─── Stores View ─────────────────────────────────────────────────────────────

function StoresView() {
  const catalog = useMemo(() => buildStoreCatalog(), []);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "priority" | "opportunity" | "attention">("all");

  const attentionCount = catalog.filter((s) => s.watch && (s.watch.flag === "Escalation Risk" || !s.watch.socMonitored)).length;
  const stats = {
    total: catalog.length,
    priority: catalog.filter((s) => s.tags.includes("Priority")).length,
    opportunity: catalog.filter((s) => s.tags.includes("Opportunity")).length,
  };

  const filtered = catalog.filter((s) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.id.includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.label.toLowerCase().includes(q) ||
      s.storeManager.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (filter === "all") return true;
    if (filter === "priority") return s.tags.includes("Priority");
    if (filter === "opportunity") return s.tags.includes("Opportunity");
    if (filter === "attention") return s.watch && (s.watch.flag === "Escalation Risk" || !s.watch.socMonitored);
    return true;
  });

  return (
    <>
      {selectedStore && <StoreLocatorPanel storeId={selectedStore} onClose={() => setSelectedStore(null)} />}
      <div>
        <PageHeader
          title="Store Directory"
          sub="663 retail stores from stores.bealls.com — click a store # for contacts and law enforcement"
        />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <StatCard label="All Stores" value={stats.total} color="bg-blue-500/20 text-blue-400" icon={Building2} />
          <StatCard label="Priority Stores" value={stats.priority} color="bg-red-500/20 text-red-400" icon={Star} />
          <StatCard label="Opportunity Stores" value={stats.opportunity} color="bg-yellow-500/20 text-yellow-400" icon={TrendingUp} />
        </div>

        <div className="relative mb-3">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search store #, city, manager, or location…"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {([
            ["all", "All", stats.total],
            ["priority", "Priority", stats.priority],
            ["opportunity", "Opportunity", stats.opportunity],
            ["attention", "Needs Attention", attentionCount],
          ] as const).map(([id, label, count]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
                filter === id ? "bg-blue-600 text-white border-blue-500" : "bg-secondary text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {label} <span className="opacity-70 ml-1">{count}</span>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-blue-400" />
              <span className="text-xs font-bold tracking-widest uppercase text-foreground">Store Locator</span>
              <span className="text-[10px] text-muted-foreground">{filtered.length} results</span>
            </div>
            <Chip className="bg-blue-500/15 text-blue-400">Click store # for full contacts</Chip>
          </div>
          <div className="overflow-x-auto max-h-[calc(100vh-340px)] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border">
                  {["Store", "Location", "Tags", "Store Manager", "Store Phone", "Law Enforcement", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-muted-foreground uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedStore(s.id)}
                    className={`border-b border-border/40 cursor-pointer transition-colors hover:bg-blue-500/8 group ${selectedStore === s.id ? "bg-blue-500/15 ring-1 ring-inset ring-blue-500/25" : i % 2 === 0 ? "" : "bg-white/[0.015]"}`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-blue-400 group-hover:underline">#{s.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground font-medium">{s.city}{s.state ? `, ${s.state}` : ""}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[220px]">{s.label}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.tags.map((t) => (
                          <span key={t} className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${STORE_TAG_STYLE[t]}`}>{t}</span>
                        ))}
                        {s.watch && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${FLAG_STYLE[s.watch.flag]?.bg ?? "bg-secondary"} ${FLAG_STYLE[s.watch.flag]?.text ?? "text-muted-foreground"}`}>
                            {s.watch.flag}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground max-w-[140px] truncate">{s.storeManager}</td>
                    <td className="px-4 py-3 font-mono text-blue-400">{s.storePhone !== "—" ? s.storePhone : "—"}</td>
                    <td className="px-4 py-3">
                      <p className="text-foreground truncate max-w-[120px]">{s.leAgency}</p>
                      <p className="font-mono text-[10px] text-red-400">{s.lePhone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 flex items-center gap-1">
                        <ChevronRight size={12}/> Open
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No stores match your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── BOLO View ────────────────────────────────────────────────────────────────

const THREAT_STYLE: Record<BoloPerson["threat"], { badge: string; dot: string }> = {
  critical: { badge: "bg-red-500/15 text-red-400 border-red-500/25", dot: "bg-red-500" },
  high:     { badge: "bg-orange-500/15 text-orange-400 border-orange-500/25", dot: "bg-orange-500" },
  medium:   { badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25", dot: "bg-yellow-400" },
};

function BOLOView({ onViewOnMap }: { onViewOnMap?: (boloId: string) => void }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "critical" | "groups">("all");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const q = search.trim();
  const isSearching = q.length > 0;
  const filteredPeople = BOLO_PEOPLE.filter(p => matchesBoloQuery(p, q)).filter(p =>
    filter === "critical" ? p.threat === "critical" : true,
  );
  const topGroups = [...ORC_GROUPS].sort((a, b) => b.hitCount - a.hitCount);
  const topSubjects = [...BOLO_PEOPLE].sort((a, b) => b.hitCount - a.hitCount).slice(0, 4);

  return (
    <div className="space-y-5">
      <PageHeader
        title="BOLO — Be On the Lookout"
        sub={`${BOLO_PEOPLE.length} active subjects · ${ORC_GROUPS.length} tracked ORC groups`}
        action={
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold transition-colors">
            <Plus size={13}/>Add BOLO
          </button>
        }
      />

      {/* Search bar */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search store #, case ID (C-202601), subject, or ORC group…"
          className="w-full pl-11 pr-10 py-3.5 rounded-2xl text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40 shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "critical", "groups"] as const).map((id) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors border ${
              filter === id ? "bg-orange-600 text-white border-orange-500" : "bg-secondary text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {id === "all" ? "All Subjects" : id === "critical" ? "Critical Only" : "ORC Groups"}
          </button>
        ))}
        <Chip className="bg-orange-500/15 text-orange-400 ml-auto">{filteredPeople.length} results</Chip>
      </div>

      {/* ORC Groups — hidden when deep search narrows to subjects only */}
      {(!isSearching || filter === "groups") && filter !== "critical" && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-orange-400" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Most Active ORC Groups</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {topGroups.map((g) => {
              const ts = THREAT_STYLE[g.threat];
              const members = BOLO_PEOPLE.filter(p => p.groupId === g.id);
              const open = expandedGroup === g.id;
              return (
                <div
                  key={g.id}
                  className={`rounded-2xl border bg-card overflow-hidden transition-all cursor-pointer hover:border-orange-500/40 ${open ? "border-orange-500/40 ring-1 ring-orange-500/20" : "border-border"}`}
                  onClick={() => setExpandedGroup(open ? null : g.id)}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-bold text-foreground leading-tight">{g.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{g.corridor} corridor · {g.subjects} linked subjects</p>
                      </div>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border shrink-0 ${ts.badge}`}>{g.threat}</span>
                    </div>
                    <div className="flex items-center gap-4 mb-3">
                      <div>
                        <p className="text-xl font-black text-orange-400 leading-none">{g.hitCount}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total hits</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground leading-none">{g.storesHit.length}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Stores</p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-[10px] font-mono text-muted-foreground">{g.lastActive}</p>
                        <p className="text-[9px] text-muted-foreground">Last active</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {g.storesHit.map(s => (
                        <span key={s} className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-secondary text-foreground">#{padStoreId(s)}</span>
                      ))}
                    </div>
                  </div>
                  {open && (
                    <div className="border-t border-border px-4 py-3 bg-secondary/20 space-y-2">
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{g.notes}</p>
                      {members.map(m => (
                        <div key={m.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/50 last:border-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-mono font-bold text-orange-400">{m.caseId}</span>
                            <span className="text-[11px] text-foreground truncate">{m.label}</span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); onViewOnMap?.(m.id); }}
                            className="text-[9px] font-bold text-blue-400 hover:text-blue-300 shrink-0"
                          >
                            Map →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top repeat offenders — quick glance when not searching */}
      {!isSearching && filter === "all" && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-red-400" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Highest-Frequency Subjects</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {topSubjects.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setSearch(p.caseId)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-orange-500/30 hover:bg-orange-500/5 transition-colors text-left"
              >
                <span className="text-lg font-black text-muted-foreground/30 w-5 shrink-0">#{i + 1}</span>
                <img src={p.photo} alt="" className="w-9 h-9 rounded-lg object-cover object-top shrink-0 grayscale" />
                <div className="min-w-0">
                  <p className="text-[10px] font-mono font-bold text-orange-400">{p.caseId}</p>
                  <p className="text-[11px] text-foreground font-semibold truncate">{p.label}</p>
                  <p className="text-[9px] text-muted-foreground">{p.hitCount} hits · #{padStoreId(p.lastStore)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Subject cards */}
      {filter !== "groups" && (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Eye size={14} className="text-orange-400" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">
            {isSearching ? "Search Results" : "Active BOLO Subjects"}
          </h2>
        </div>
        {filteredPeople.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">No BOLO matches for &ldquo;{search}&rdquo;</p>
            <p className="text-[11px] text-muted-foreground mt-1">Try a store number like 116 or case ID like C-202601</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPeople.map(person => {
              const group = ORC_GROUPS.find(g => g.id === person.groupId);
              const ts = THREAT_STYLE[person.threat];
              return (
                <div key={person.id} className="rounded-2xl border border-orange-500/20 bg-card overflow-hidden hover:border-orange-500/50 transition-colors">
                  <div className="relative h-44 overflow-hidden bg-slate-900">
                    <img src={person.photo} alt={person.label} className="w-full h-full object-cover object-top" style={{ filter: "grayscale(1) brightness(0.7)" }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="text-[11px] font-bold bg-orange-500 text-white px-2 py-1 rounded-lg flex items-center gap-1"><Hash size={9}/>{person.caseId}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${ts.badge}`}>{person.threat}</span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded">ACTIVE</span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-white font-bold text-sm">{person.label}</p>
                      <p className="text-slate-300 text-xs">{person.description}</p>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {group && (
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-orange-500/8 border border-orange-500/15">
                        <Users size={11} className="text-orange-400 shrink-0" />
                        <span className="text-[10px] text-orange-300 font-semibold truncate">{group.name}</span>
                        <span className="text-[9px] text-muted-foreground ml-auto shrink-0">{person.hitCount} hits</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-orange-400"/>
                        <span className="text-xs text-foreground">Last: <span className="font-mono font-bold">#{padStoreId(person.lastStore)}</span></span>
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground">{person.lastSeen} · {person.date}</span>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/30 p-2.5">
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{person.notes}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onViewOnMap?.(person.id)}
                        className="flex-1 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/25 text-[11px] font-semibold transition-colors"
                      >
                        View on Map
                      </button>
                      <button className="flex-1 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/20 text-[11px] font-semibold transition-colors">
                        Alert Stores
                      </button>
                      <button
                        onClick={() => navigator.clipboard.writeText(person.filePath)}
                        title={person.filePath}
                        className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-muted-foreground hover:text-orange-400 border border-border text-[11px] transition-colors"
                      >
                        <FolderOpen size={11}/>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}
    </div>
  );
}

// ─── Dataminr View ────────────────────────────────────────────────────────────

function DataminrView() {
  const [filter,setFilter] = useState<DataminrAlert["type"]|"all">("all");
  const [emailOpen,setEmailOpen] = useState<string|null>(null);
  const [emailBody,setEmailBody] = useState("");
  const filtered = filter==="all"?DATAMINR_ALERTS:DATAMINR_ALERTS.filter(a=>a.type===filter);
  const typeLabels: Record<string,string> = {shooting:"Shooting",weather:"Weather",civil_unrest:"Civil Unrest",fire:"Fire",hazmat:"HAZMAT",power:"Power",traffic:"Traffic"};

  function openEmail(alertId:string,alertTitle:string) {
    setEmailOpen(alertId);
    setEmailBody(`Team,\n\nDataminr has issued the following alert that may impact our operations:\n\n${alertTitle}\n\nPlease review the affected stores and take appropriate action.\n\nRegards,\nSOC Operations`);
  }

  return (
    <div>
      <PageHeader title="Dataminr Intelligence Feed" sub="Real-time alerts that may impact store operations and safety"/>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Alerts"   value={DATAMINR_ALERTS.length}                                      color="bg-purple-500/20 text-purple-400" icon={Radio}/>
        <StatCard label="Critical"        value={DATAMINR_ALERTS.filter(a=>a.severity==="critical").length}  color="bg-red-500/20 text-red-400"       icon={AlertOctagon} alert/>
        <StatCard label="Stores Affected" value={new Set(DATAMINR_ALERTS.flatMap(a=>a.affectedStores)).size} color="bg-orange-500/20 text-orange-400" icon={MapPin}/>
        <StatCard label="High Priority"   value={DATAMINR_ALERTS.filter(a=>a.severity==="high").length}      color="bg-yellow-500/20 text-yellow-400" icon={AlertTriangle}/>
      </div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={()=>setFilter("all")} className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors ${filter==="all"?"bg-blue-600 text-white":"bg-secondary text-muted-foreground hover:text-foreground"}`}>All</button>
        {(Object.keys(typeLabels) as DataminrAlert["type"][]).map(t=>{const dc=dmCfg(t);const Icon=dc.Icon;return(<button key={t} onClick={()=>setFilter(filter===t?"all":t)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors ${filter===t?`${dc.bg} ${dc.color} border border-current/30`:"bg-secondary text-muted-foreground hover:text-foreground"}`}><Icon size={11}/>{typeLabels[t]}</button>);})}
      </div>
      {emailOpen&&(
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5 mb-4">
          <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Mail size={15} className="text-blue-400"/><p className="text-sm font-bold text-foreground">Compose RLPD Notification</p></div><button onClick={()=>setEmailOpen(null)} className="text-muted-foreground hover:text-foreground"><X size={14}/></button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div><label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-1">To</label><input defaultValue="RLPD@bealls.com; regionalLP@bealls.com" className="w-full px-3 py-2 rounded-lg text-xs bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50"/></div>
            <div><label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-1">Subject</label><input defaultValue={`Dataminr Alert — ${DATAMINR_ALERTS.find(a=>a.id===emailOpen)?.title}`} className="w-full px-3 py-2 rounded-lg text-xs bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50"/></div>
          </div>
          <div><label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-1">Message</label><textarea value={emailBody} onChange={e=>setEmailBody(e.target.value)} rows={5} className="w-full px-3 py-2 rounded-lg text-xs bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"/></div>
          <div className="flex gap-2 mt-3"><button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"><Mail size={13}/>Send to RLPD</button><button onClick={()=>setEmailOpen(null)} className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/70 text-secondary-foreground text-xs font-semibold border border-border transition-colors">Cancel</button></div>
        </div>
      )}
      <div className="space-y-3">
        {filtered.map(alert=>{const sc=sevCfg(alert.severity);const dc=dmCfg(alert.type);const Icon=dc.Icon;return(
          <div key={alert.id} className={`rounded-2xl border ${sc.border} bg-card p-5`}>
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl ${dc.bg} flex items-center justify-center shrink-0 mt-0.5`}><Icon size={18} className={dc.color}/></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1"><Chip className={sc.badge}><span className={`w-1 h-1 rounded-full ${sc.dot}`}/>{sc.label}</Chip><Chip className={`${dc.bg} ${dc.color}`}>{typeLabels[alert.type]}</Chip></div>
                    <h3 className="text-sm font-bold text-foreground">{alert.title}</h3>
                  </div>
                  <div className="text-right shrink-0"><p className="text-[11px] font-mono text-muted-foreground">{alert.time}</p><p className="text-[10px] text-muted-foreground mt-0.5">{alert.source}</p></div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{alert.description}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5"><MapPin size={11} className="text-muted-foreground"/><span className="text-xs text-foreground">{alert.location}</span></div>
                  <div className="flex items-center gap-1.5"><span className="text-[11px] text-muted-foreground">Affected:</span>{alert.affectedStores.map(s=><StoreTag key={s} id={s} color="bg-secondary text-secondary-foreground"/>)}</div>
                  <div className="ml-auto flex gap-2">
                    <button onClick={()=>openEmail(alert.id,alert.title)} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/20 text-[11px] font-semibold transition-colors"><Mail size={11}/>Email</button>
                    <button className="px-3 py-1 rounded-lg bg-secondary hover:bg-secondary/70 text-secondary-foreground text-[11px] font-semibold border border-border transition-colors">Acknowledge</button>
                    <button className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition-colors"><Siren size={11}/>Notify RLPD</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );})}
      </div>
    </div>
  );
}

// ─── Systems Down View ────────────────────────────────────────────────────────

function statusStyle(s: "Open"|"In Progress"|"Resolved") {
  return s==="Open"?{bg:"bg-red-500/15",text:"text-red-400"}:s==="In Progress"?{bg:"bg-yellow-500/15",text:"text-yellow-400"}:{bg:"bg-emerald-500/15",text:"text-emerald-400"};
}

function PADownView() {
  const [tab, setTab] = useState<"pa"|"cameras"|"nvr">("pa");

  const paOpen     = PA_DOWN_STORES.filter(s=>s.status!=="Resolved").length;
  const camOpen    = CAM_DOWN_STORES.filter(s=>s.status!=="Resolved").length;
  const nvrOpen    = NVR_DOWN_STORES.filter(s=>s.status!=="Resolved").length;
  const totalCamsOffline = CAM_DOWN_STORES.filter(s=>s.status!=="Resolved").reduce((a,s)=>a+s.camerasDown,0);

  const tabs = [
    { id:"pa"      as const, label:"PA System",  icon:Volume2, count:paOpen,  color:paOpen>0?"text-red-400":"text-muted-foreground",  activeCls:"bg-red-500/20 text-red-400 border border-red-500/30" },
    { id:"cameras" as const, label:"Cameras",    icon:Tv2,     count:camOpen, color:camOpen>0?"text-orange-400":"text-muted-foreground", activeCls:"bg-orange-500/20 text-orange-400 border border-orange-500/30" },
    { id:"nvr"     as const, label:"NVR / DVR",  icon:Server,  count:nvrOpen, color:nvrOpen>0?"text-purple-400":"text-muted-foreground", activeCls:"bg-purple-500/20 text-purple-400 border border-purple-500/30" },
  ];

  return (
    <div>
      <PageHeader
        title="Systems Down"
        sub="Centralized view — PA systems, cameras, and NVR/DVR units"
        action={<button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"><Plus size={13}/>Log Issue</button>}
      />

      {/* Cross-system summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="PA Systems Down"  value={paOpen}           color="bg-red-500/20 text-red-400"       icon={Volume2}    alert={paOpen>0}/>
        <StatCard label="Cameras Offline"  value={totalCamsOffline} sub="across all stores" color="bg-orange-500/20 text-orange-400"  icon={Tv2}        alert={totalCamsOffline>0}/>
        <StatCard label="NVR / DVR Down"   value={nvrOpen}          color="bg-purple-500/20 text-purple-400" icon={Server}     alert={nvrOpen>0}/>
        <StatCard label="Total Open Tickets" value={paOpen+camOpen+nvrOpen} color="bg-yellow-500/20 text-yellow-400" icon={Activity}/>
      </div>

      {/* Tab strip */}
      <div className="flex items-center gap-2 mb-5">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab===t.id;
          return (
            <button key={t.id} onClick={()=>setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${active?t.activeCls:"bg-secondary text-muted-foreground hover:text-foreground border border-border"}`}>
              <Icon size={13}/>{t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active?"bg-current/20":"bg-secondary text-muted-foreground"}`}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* ── PA Down ── */}
      {tab==="pa" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
            <Volume2 size={14} className="text-red-400"/>
            <span className="text-xs font-bold tracking-widest uppercase text-foreground">PA System Issues</span>
            <Chip className="bg-red-500/15 text-red-400 ml-1">{paOpen} open</Chip>
          </div>
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">{["Store","City","Date Down","Days Down","Ticket #","Assigned Tech","Status","Action"].map(h=><th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-muted-foreground uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>{PA_DOWN_STORES.map((s,i)=>{const ss=statusStyle(s.status);return(
              <tr key={s.storeId} className={`border-b border-border/50 hover:bg-blue-500/5 transition-colors ${i%2===0?"":"bg-white/[0.02]"}`}>
                <td className="px-4 py-3 font-mono font-bold text-foreground">#{s.storeId}</td>
                <td className="px-4 py-3 text-foreground">{s.city}</td>
                <td className="px-4 py-3 font-mono text-foreground">{s.dateDown}</td>
                <td className="px-4 py-3"><span className={`font-bold font-mono ${s.daysDown>5?"text-red-400":s.daysDown>2?"text-yellow-400":"text-foreground"}`}>{s.daysDown}d</span></td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{s.ticketNum}</td>
                <td className="px-4 py-3 text-foreground">{s.assignedTech}</td>
                <td className="px-4 py-3"><Chip className={`${ss.bg} ${ss.text}`}>{s.status}</Chip></td>
                <td className="px-4 py-3"><div className="flex gap-1.5"><button className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/70 text-secondary-foreground text-[11px] font-semibold border border-border transition-colors">Update</button>{s.status!=="Resolved"&&<button className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold transition-colors">Resolve</button>}</div></td>
              </tr>
            );})}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Cameras Down ── */}
      {tab==="cameras" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
            <Tv2 size={14} className="text-orange-400"/>
            <span className="text-xs font-bold tracking-widest uppercase text-foreground">Camera Outages</span>
            <Chip className="bg-orange-500/15 text-orange-400 ml-1">{totalCamsOffline} cameras offline</Chip>
          </div>
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">{["Store","City","Cameras Down","Coverage","Reason","Date Down","Days Down","Ticket #","Assigned Tech","Status","Action"].map(h=><th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-muted-foreground uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>{CAM_DOWN_STORES.map((s,i)=>{
              const ss = statusStyle(s.status);
              const pct = Math.round((s.camerasDown/s.totalCameras)*100);
              const coverageColor = pct>=100?"text-red-400":pct>=50?"text-orange-400":"text-yellow-400";
              return(
                <tr key={s.storeId+i} className={`border-b border-border/50 hover:bg-blue-500/5 transition-colors ${i%2===0?"":"bg-white/[0.02]"}`}>
                  <td className="px-4 py-3 font-mono font-bold text-foreground">#{s.storeId}</td>
                  <td className="px-4 py-3 text-foreground">{s.city}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold font-mono ${coverageColor}`}>{s.camerasDown}</span>
                      <span className="text-muted-foreground">/ {s.totalCameras}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-secondary"><div className={`h-full rounded-full ${pct>=100?"bg-red-500":pct>=50?"bg-orange-500":"bg-yellow-500"}`} style={{width:`${pct}%`}}/></div>
                      <span className={`text-[11px] font-mono font-bold ${coverageColor}`}>{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{s.reason}</td>
                  <td className="px-4 py-3 font-mono text-foreground">{s.dateDown}</td>
                  <td className="px-4 py-3"><span className={`font-bold font-mono ${s.daysDown>5?"text-red-400":s.daysDown>2?"text-yellow-400":"text-foreground"}`}>{s.daysDown}d</span></td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{s.ticketNum}</td>
                  <td className="px-4 py-3 text-foreground">{s.assignedTech}</td>
                  <td className="px-4 py-3"><Chip className={`${ss.bg} ${ss.text}`}>{s.status}</Chip></td>
                  <td className="px-4 py-3"><div className="flex gap-1.5"><button className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/70 text-secondary-foreground text-[11px] font-semibold border border-border transition-colors">Update</button>{s.status!=="Resolved"&&<button className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold transition-colors">Resolve</button>}</div></td>
                </tr>
              );
            })}
            </tbody>
          </table>
          {CAM_DOWN_STORES.some(s=>s.camerasDown===s.totalCameras&&s.status!=="Resolved")&&(
            <div className="m-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
              <div className="flex items-start gap-2"><AlertTriangle size={13} className="text-red-400 mt-0.5 shrink-0"/><p className="text-xs text-red-400 font-semibold">Complete camera blind spot — {CAM_DOWN_STORES.filter(s=>s.camerasDown===s.totalCameras&&s.status!=="Resolved").map(s=>`Store #${s.storeId}`).join(", ")} have zero active feeds. Recommend manual LP coverage or temporary deterrent.</p></div>
            </div>
          )}
        </div>
      )}

      {/* ── NVR Down ── */}
      {tab==="nvr" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
            <Server size={14} className="text-purple-400"/>
            <span className="text-xs font-bold tracking-widest uppercase text-foreground">NVR / DVR Outages</span>
            <Chip className="bg-purple-500/15 text-purple-400 ml-1">{nvrOpen} units down</Chip>
          </div>
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">{["Store","City","Unit ID","Cameras Affected","Date Down","Days Down","Ticket #","Assigned Tech","Status","Action"].map(h=><th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-muted-foreground uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>{NVR_DOWN_STORES.map((s,i)=>{const ss=statusStyle(s.status);return(
              <tr key={s.storeId} className={`border-b border-border/50 hover:bg-blue-500/5 transition-colors ${i%2===0?"":"bg-white/[0.02]"}`}>
                <td className="px-4 py-3 font-mono font-bold text-foreground">#{s.storeId}</td>
                <td className="px-4 py-3 text-foreground">{s.city}</td>
                <td className="px-4 py-3 font-mono text-purple-400 font-semibold">{s.nvrUnit}</td>
                <td className="px-4 py-3"><span className="font-bold text-orange-400 font-mono">{s.camerasAffected}</span><span className="text-muted-foreground ml-1">cams</span></td>
                <td className="px-4 py-3 font-mono text-foreground">{s.dateDown}</td>
                <td className="px-4 py-3"><span className={`font-bold font-mono ${s.daysDown>7?"text-red-400":s.daysDown>3?"text-yellow-400":"text-foreground"}`}>{s.daysDown}d</span></td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{s.ticketNum}</td>
                <td className="px-4 py-3 text-foreground">{s.assignedTech}</td>
                <td className="px-4 py-3"><Chip className={`${ss.bg} ${ss.text}`}>{s.status}</Chip></td>
                <td className="px-4 py-3"><div className="flex gap-1.5"><button className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/70 text-secondary-foreground text-[11px] font-semibold border border-border transition-colors">Update</button>{s.status!=="Resolved"&&<button className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold transition-colors">Resolve</button>}</div></td>
              </tr>
            );})}
            </tbody>
          </table>
          {NVR_DOWN_STORES.some(s=>s.daysDown>=7&&s.status!=="Resolved")&&(
            <div className="m-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
              <div className="flex items-start gap-2"><AlertTriangle size={13} className="text-yellow-400 mt-0.5 shrink-0"/><p className="text-xs text-yellow-400 font-semibold">Long-running NVR outage — {NVR_DOWN_STORES.filter(s=>s.daysDown>=7&&s.status!=="Resolved").map(s=>`#${s.storeId} (${s.daysDown}d)`).join(", ")}. Escalate to vendor or regional IT.</p></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Reports View ─────────────────────────────────────────────────────────────

const TEAM_SCORECARD = [
  { category:"Attempted\nRecovery",  ty:90, ly:68 },
  { category:"Merchandise\nRecovery",ty:82, ly:54 },
  { category:"Proactive\nDetention", ty:115,ly:98 },
  { category:"Trespassing",          ty:31, ly:18 },
];
const TEAM_OBS_PIE = [
  { name:"Live Observation", value:80.3 },
  { name:"SI Call",          value:19.7 },
];
const OBS_COLORS = ["#3B82F6","#1D4ED8"];

const CustomBarLabel = (props:{x?:number;y?:number;width?:number;value?:number}) => {
  const {x=0,y=0,width=0,value} = props;
  if (!value) return null;
  return <text x={x+width/2} y={y-4} fill="#94A3B8" textAnchor="middle" fontSize={11} fontWeight={600}>{value}</text>;
};

function ReportsView({ operators }: { operators: Operator[] }) {
  const [periodFilter,setPeriodFilter] = useState("11");
  const [perOpen,setPerOpen] = useState(false);
  const onStationOps = operators.filter(o => o.onStation);
  return (
    <div>
      <div className="mb-5">
        <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">Dashboard</p>
        <h1 className="text-xl font-bold text-foreground">SOC Team Scorecard</h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          As of {new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}, {new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})} PM · <span className="text-blue-400">On Station · {onStationOps.length} operators</span>
        </p>
      </div>
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Fiscal Period</p>
          <div className="relative">
            <button onClick={()=>setPerOpen(v=>!v)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary border border-blue-500/40 text-blue-400 text-xs font-semibold min-w-[120px] justify-between">equals {periodFilter}<ChevronDown size={12}/></button>
            {perOpen&&(<div className="absolute top-10 left-0 w-36 rounded-xl border border-border bg-card shadow-xl z-20 overflow-hidden">{["1","2","3","4","5","6","7","8","9","10","11","12"].map(p=><button key={p} onClick={()=>{setPeriodFilter(p);setPerOpen(false);}} className="w-full text-left px-3 py-2 text-xs hover:bg-secondary transition-colors text-foreground">{p}</button>)}</div>)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onStationOps.length === 0 ? (
            <span className="text-[11px] text-muted-foreground italic">No operators signed in this shift</span>
          ) : onStationOps.map(op=>{const sc=opCfg(op.status);return(<div key={op.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary border border-border text-[11px]"><span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/><span className="text-foreground font-medium">{op.name}</span><span className="text-muted-foreground font-mono">{op.extension}</span></div>);})}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Bar chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-xs font-bold text-foreground mb-0.5">SOC Team Scorecard TY v LY</h2>
          <p className="text-[10px] text-muted-foreground mb-3">Incident Type › Fiscal Year (All Operators)</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={TEAM_SCORECARD} barGap={4} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false}/>
              <XAxis dataKey="category" tick={{fill:"#64748B",fontSize:10}} axisLine={false} tickLine={false} interval={0} tickFormatter={v=>v.replace("\n"," ")}/>
              <YAxis tick={{fill:"#64748B",fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{background:"#1E293B",border:"1px solid rgba(148,163,184,0.15)",borderRadius:12,color:"#F1F5F9",fontSize:12}}/>
              <Legend wrapperStyle={{fontSize:11,color:"#94A3B8"}} formatter={v=>v==="ty"?"2,026":"2,025"}/>
              <Bar key="bar-ly" dataKey="ly" name="ly" fill="#1D4ED8" fillOpacity={0.7} radius={[3,3,0,0]} label={(p:any)=><CustomBarLabel {...p}/>}/>
              <Bar key="bar-ty" dataKey="ty" name="ty" fill="#3B82F6" fillOpacity={0.9} radius={[3,3,0,0]} label={(p:any)=><CustomBarLabel {...p}/>}/>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-blue-400 mt-2 cursor-pointer hover:underline">View Full Scorecard Report</p>
        </div>

        {/* Donut chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-xs font-bold text-foreground mb-0.5">Live Observations — Team</h2>
          <div className="flex items-center gap-4 mb-2">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500"/><span className="text-[11px] text-muted-foreground">Live Observation</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-800"/><span className="text-[11px] text-muted-foreground">SI Call</span></div>
          </div>
          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={TEAM_OBS_PIE} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                  {TEAM_OBS_PIE.map((_,i)=><Cell key={`obs-cell-${i}`} fill={OBS_COLORS[i]}/>)}
                </Pie>
                <Tooltip contentStyle={{background:"#1E293B",border:"1px solid rgba(148,163,184,0.15)",borderRadius:12,color:"#F1F5F9",fontSize:12}} formatter={(v:number)=>`${v}%`}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center"><p className="text-3xl font-black text-foreground">66</p><p className="text-[10px] text-muted-foreground">Record Count</p></div>
            </div>
          </div>
          <div className="space-y-1.5 mt-2">
            {TEAM_OBS_PIE.map((d,i)=>(
              <div key={d.name} className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm" style={{background:OBS_COLORS[i]}}/><span className="text-xs text-muted-foreground">{d.name}</span></div><span className="text-xs font-bold text-foreground">{d.value}%</span></div>
            ))}
          </div>
          <p className="text-[10px] text-blue-400 mt-3 cursor-pointer hover:underline">View Live Observations Report</p>
        </div>

        {/* KPI tiles */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="flex-1 rounded-2xl border border-border bg-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between"><h2 className="text-xs font-bold text-foreground">Store Engagements</h2><RefreshCw size={12} className="text-muted-foreground"/></div>
            <p className="text-5xl font-black text-orange-400 my-4 text-center">0</p>
            <div><p className="text-[10px] text-blue-400 cursor-pointer hover:underline">View Report</p><p className="text-[10px] text-muted-foreground mt-0.5">As of {new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p></div>
          </div>
          <div className="flex-1 rounded-2xl border border-border bg-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between"><h2 className="text-xs font-bold text-foreground">Total $</h2><RefreshCw size={12} className="text-muted-foreground"/></div>
            <p className="text-4xl font-black text-emerald-400 my-4 text-center">$2.1K</p>
            <p className="text-[10px] text-muted-foreground">{new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>
          </div>
          <div className="flex-1 rounded-2xl border border-border bg-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between"><h2 className="text-xs font-bold text-foreground leading-tight">Submission or Deletion Needed</h2><RefreshCw size={12} className="text-muted-foreground shrink-0"/></div>
            <p className="text-5xl font-black text-emerald-400 my-4 text-center">0</p>
            <p className="text-[10px] text-blue-400 cursor-pointer hover:underline">View Report</p>
          </div>
        </div>
      </div>

      {/* Operator breakdown table */}
      <div className="mt-4 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border"><BarChart2 size={14} className="text-blue-400"/><span className="text-xs font-bold tracking-widest uppercase text-foreground">Operator Breakdown — Period {periodFilter}</span></div>
        <table className="w-full text-xs">
          <thead><tr className="border-b border-border">{["Operator","Ext.","Status","Observations","Assigned","Live Obs","Period Progress"].map(h=><th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-muted-foreground uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>
            {onStationOps.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground italic">No operators signed in this shift</td></tr>
            ) : onStationOps.map((op,i)=>{const sc=opCfg(op.status);const Icon=sc.Icon;return(
              <tr key={op.id} className={`border-b border-border/50 hover:bg-blue-500/5 transition-colors ${i%2===0?"":"bg-white/[0.02]"}`}>
                <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-[10px] font-bold text-white">{op.avatar}</div><span className="font-semibold text-foreground">{op.name}</span></div></td>
                <td className="px-4 py-3 font-mono text-blue-400 text-[11px]">{op.extension}</td>
                <td className="px-4 py-3"><div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${sc.bg}`}><Icon size={9} className={sc.color}/><span className={`text-[10px] font-semibold ${sc.color}`}>{op.status}</span></div></td>
                <td className="px-4 py-3 font-bold font-mono text-foreground">{op.observations}</td>
                <td className="px-4 py-3"><span className="text-xs font-mono font-bold text-foreground">{op.assignedStores.length}</span><span className="text-[9px] text-muted-foreground ml-1">stores</span></td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{op.liveObservation.map(s=><span key={s} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-mono font-bold border border-emerald-500/20"><div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse mr-0.5"/>{s}</span>)}</div></td>
                <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="flex-1 h-1.5 rounded-full bg-secondary max-w-[80px]"><div className="h-full rounded-full bg-blue-500" style={{width:`${(op.observations/19)*100}%`}}/></div><span className="text-[11px] font-mono text-foreground">{op.observations}</span></div></td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Settings View ────────────────────────────────────────────────────────────

function SettingsView() {
  const [notifSound,setNotifSound] = useState(true);
  const [autoAssign,setAutoAssign] = useState(false);
  const [dataminrEnabled,setDataminrEnabled] = useState(true);
  return (
    <div>
      <PageHeader title="Settings" sub="System configuration and preferences"/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          {[{label:"Notification Sounds",desc:"Play audio alert on new critical incident",val:notifSound,set:setNotifSound},{label:"Auto-Assign Incidents",desc:"Automatically assign new incidents to available operators",val:autoAssign,set:setAutoAssign},{label:"Dataminr Integration",desc:"Receive real-time intelligence alerts from Dataminr",val:dataminrEnabled,set:setDataminrEnabled}].map(item=>(
            <div key={item.label} className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between">
              <div><p className="text-sm font-semibold text-foreground">{item.label}</p><p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p></div>
              <button onClick={()=>item.set(!item.val)} className={`relative w-11 h-6 rounded-full transition-colors ${item.val?"bg-blue-600":"bg-secondary"}`}><span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${item.val?"left-6":"left-1"}`}/></button>
            </div>
          ))}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold text-foreground mb-1">Alert Escalation Threshold</p>
            <p className="text-xs text-muted-foreground mb-3">Auto-escalate to supervisor after this many minutes without acknowledgment</p>
            <div className="flex items-center gap-3">{[5,10,15,30].map(v=><button key={v} className="px-4 py-2 rounded-xl text-xs font-semibold border border-border bg-secondary hover:bg-blue-600/20 hover:text-blue-400 hover:border-blue-500/30 text-secondary-foreground transition-colors">{v} min</button>)}</div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-3">System Info</p>
            {[["Version","SOC v2.4.1"],["Last Sync","14:34:02"],["DB Status","Connected"],["API Status","Online"]].map(([k,v])=>(
              <div key={k} className="flex items-center justify-between py-2 border-b border-border last:border-0"><span className="text-xs text-muted-foreground">{k}</span><span className="text-xs font-mono font-semibold text-emerald-400">{v}</span></div>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-3">Quick Links</p>
            {["Incident Report Template","BOLO Submission Form","Operator Schedule","Vendor Contacts"].map(l=>(
              <button key={l} className="w-full flex items-center justify-between py-2.5 text-xs text-foreground hover:text-blue-400 transition-colors border-b border-border last:border-0">{l}<FileText size={12} className="text-muted-foreground"/></button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Store Map View ───────────────────────────────────────────────────────────

function StoreMapView({
  prefillBoloId,
  onPrefillConsumed,
  onGoToBolo,
}: {
  prefillBoloId?: string | null;
  onPrefillConsumed?: () => void;
  onGoToBolo?: () => void;
}) {
  const [selectedStore, setSelectedStore] = useState<string|null>(null);
  const [activeBolo, setActiveBolo]       = useState<string|null>(null);
  const [pinnedStore, setPinnedStore]     = useState<string|null>(null);
  const [routeMode, setRouteMode]         = useState(false);
  const [routeFrom, setRouteFrom]         = useState<string|null>(null);
  const [routeTo, setRouteTo]             = useState<string|null>(null);
  const [layerFilter, setLayerFilter]     = useState<"all"|"priority"|"opportunity">("all");
  const [flyPos, setFlyPos]               = useState<[number,number]|null>(null);
  const [mapSearch, setMapSearch]         = useState("");
  const [mapSearchErr, setMapSearchErr]   = useState("");

  const PROX_KM = 100;

  useEffect(() => {
    if (!prefillBoloId) return;
    const b = BOLO_PEOPLE.find(p => p.id === prefillBoloId);
    if (b) {
      setActiveBolo(b.id);
      setPinnedStore(padStoreId(b.lastStore));
      setFlyPos(getStoreCoords(b.lastStore));
      setMapSearch(b.caseId);
    }
    onPrefillConsumed?.();
  }, [prefillBoloId, onPrefillConsumed]);

  function runMapSearch() {
    const hit = findBoloByQuery(mapSearch);
    if (!hit) {
      setMapSearchErr(`No BOLO for "${mapSearch.trim()}"`);
      return;
    }
    setMapSearchErr("");
    setActiveBolo(hit.id);
    setPinnedStore(padStoreId(hit.lastStore));
    setFlyPos(getStoreCoords(hit.lastStore));
  }

  function nearbyOf(lastStore: string): string[] {
    const o = getStoreCoords(lastStore);
    if (!o) return [];
    return allMappedStoreIds()
      .filter(id => id !== padStoreId(lastStore) && distKm(o, getStoreCoords(id)!) <= PROX_KM);
  }

  function projectedRoutesFor(storeId: string) {
    const ll = getStoreCoords(storeId);
    if (!ll) return [];
    return ORC_CORRIDORS
      .map(r => {
        const minDist = r.coords.reduce((min, wp) => Math.min(min, distKm(ll, wp)), Infinity);
        if (minDist > 80) return null;
        // Closer = higher probability; scale from baseProb down by distance
        const distFactor = Math.max(0, 1 - minDist / 120);
        const prob = Math.round(r.baseProb * (0.4 + 0.6 * distFactor));
        return { ...r, prob, minDist };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.prob - a.prob);
  }

  const boloActive   = activeBolo ? BOLO_PEOPLE.find(b=>b.id===activeBolo) : null;
  const nearby       = boloActive ? nearbyOf(boloActive.lastStore) : [];
  const projRoutes   = boloActive ? projectedRoutesFor(boloActive.lastStore) : [];
  const boloFlyPos   = boloActive ? (getStoreCoords(boloActive.lastStore) ?? null) : null;
  const mapFlyPos    = flyPos ?? boloFlyPos;
  const pinnedRoutes = pinnedStore ? projectedRoutesFor(pinnedStore) : [];
  const allIds       = allMappedStoreIds();

  function catOf(id: string): "priority"|"opportunity"|"standard" {
    const sid = padStoreId(id);
    if (PRIORITY_STORE_DATA.find(s=>padStoreId(s.id)===sid))   return "priority";
    if (OPPORTUNITY_STORE_DATA.find(s=>padStoreId(s.id)===sid)) return "opportunity";
    return "standard";
  }
  function cityOf(id: string) {
    const sid = padStoreId(id);
    const b = beallsStore(sid);
    if (b?.city) return b.state ? `${b.city}, ${b.state}` : b.city;
    return PRIORITY_STORE_DATA.find(s=>padStoreId(s.id)===sid)?.city
        || OPPORTUNITY_STORE_DATA.find(s=>padStoreId(s.id)===sid)?.city
        || parseCityState(storeLabel(sid)).city;
  }

  const orcHits = useMemo(() =>
    [...BOLO_PEOPLE]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(b => ({
        caseId: b.caseId,
        storeId: padStoreId(b.lastStore),
        city: cityOf(b.lastStore),
        date: b.date,
        label: b.label,
      })),
  []);

  const visibleIds = allIds.filter(id => {
    const cat = catOf(id);
    if (layerFilter === "priority") return cat === "priority";
    if (layerFilter === "opportunity") return cat === "opportunity";
    return true;
  });

  const routeFromCoords = routeFrom ? getStoreCoords(routeFrom) : null;
  const routeToCoords   = routeTo ? getStoreCoords(routeTo) : null;
  const routeKm         = routeFromCoords && routeToCoords ? distKm(routeFromCoords, routeToCoords) : null;
  const routeMins       = routeFromCoords && routeToCoords ? estDriveMins(routeFromCoords, routeToCoords) : null;

  function handleMarkerClick(id: string) {
    if (routeMode) {
      if (!routeFrom || (routeFrom && routeTo)) {
        setRouteFrom(id);
        setRouteTo(null);
        setPinnedStore(id);
      } else if (routeFrom === id) {
        return;
      } else {
        setRouteTo(id);
      }
      setFlyPos(getStoreCoords(id));
      return;
    }
    setPinnedStore(pinnedStore === id ? null : id);
    setFlyPos(getStoreCoords(id));
  }

  function clearRoute() {
    setRouteFrom(null);
    setRouteTo(null);
  }

  function pinColor(id: string): string {
    if (boloActive?.lastStore === id) return "#F97316";
    if (nearby.includes(padStoreId(id))) return "#EF4444";
    const c = catOf(id);
    if (c==="priority")   return "#EF4444";
    if (c==="opportunity") return "#EAB308";
    return "#64748B";
  }

  return (
    <>
      {selectedStore && <StoreLocatorPanel storeId={selectedStore} onClose={()=>setSelectedStore(null)}/>}
      <div className="flex flex-col" style={{height:"calc(100vh - 112px)"}}>
        <PageHeader
          title="Store Map"
          sub={`${allIds.length} Bealls retail stores · geocoded from stores.bealls.com · ORC corridors & route planning`}
          action={
            <div className="flex items-center gap-3 flex-wrap">
              {[
                {c:"#EF4444",l:"Priority"},
                {c:"#EAB308",l:"Opportunity"},
                {c:"#64748B",l:"Standard"},
                {c:"#F97316",l:"BOLO Last Seen"},
              ].map(({c,l})=>(
                <div key={l} className="flex items-center gap-1.5">
                  <svg width="9" height="12" viewBox="0 0 20 27">
                    <path d="M10,0 C4.5,0 0,4.5 0,10 C0,18 10,27 10,27 C10,27 20,18 20,10 C20,4.5 15.5,0 10,0 Z" fill={c}/>
                    <circle cx="10" cy="10" r="3.5" fill="rgba(255,255,255,0.9)"/>
                  </svg>
                  <span className="text-[10px] text-muted-foreground">{l}</span>
                </div>
              ))}
              <div className="flex items-center gap-1 ml-1 pl-2 border-l border-border">
                {(["all","priority","opportunity"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setLayerFilter(f)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold capitalize transition-colors ${layerFilter===f?"bg-blue-600 text-white":"bg-secondary text-muted-foreground hover:text-foreground"}`}
                  >
                    {f === "all" ? "All Stores" : f}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setRouteMode(v => !v); if (routeMode) clearRoute(); }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1 ${routeMode?"bg-emerald-600 text-white":"bg-secondary text-muted-foreground hover:text-foreground border border-border"}`}
              >
                <MapPin size={10}/>{routeMode ? "Route Mode ON" : "Plan Route"}
              </button>
            </div>
          }
        />

        <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">

          {/* ── Leaflet Map ── */}
          <div className="flex-1 rounded-2xl border border-border overflow-hidden relative" style={{minHeight:0}}>

            {routeMode && (
              <div className="absolute top-3 left-3 z-[1000] rounded-xl border border-emerald-500/30 px-3 py-2 max-w-[260px]" style={{background:"rgba(15,23,42,0.92)",backdropFilter:"blur(8px)"}}>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Route Planner</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Click a store for <span className="text-foreground font-semibold">From</span>, then another for <span className="text-foreground font-semibold">To</span>.
                </p>
                {(routeFrom || routeTo) && (
                  <div className="mt-2 pt-2 border-t border-border space-y-1">
                    <p className="text-[10px] text-foreground"><span className="text-muted-foreground">From:</span> {routeFrom ? `#${routeFrom}` : "—"}</p>
                    <p className="text-[10px] text-foreground"><span className="text-muted-foreground">To:</span> {routeTo ? `#${routeTo}` : "—"}</p>
                    {routeKm != null && routeMins != null && (
                      <p className="text-[11px] font-bold text-emerald-400">{formatDistMi(routeKm)} · ~{routeMins} min drive</p>
                    )}
                    <button onClick={clearRoute} className="text-[9px] text-muted-foreground hover:text-foreground mt-1">Clear route</button>
                  </div>
                )}
              </div>
            )}

            {/* ORC route legend overlay — only when BOLO active */}
            {boloActive && projRoutes.length>0 && !routeMode && (
              <div className="absolute top-3 left-3 z-[1000] rounded-xl border border-orange-500/30 p-3 max-w-[230px]" style={{background:"rgba(15,23,42,0.92)",backdropFilter:"blur(8px)"}}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={11} className="text-orange-400 shrink-0"/>
                  <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Projected ORC Routes</span>
                </div>
                <div className="space-y-2.5">
                  {projRoutes.map(r=>{
                    const pc = r.prob>=80?"#EF4444":r.prob>=65?"#F97316":r.prob>=50?"#EAB308":"#3B82F6";
                    return (
                      <div key={r.id}>
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{background:r.color}}/>
                            <p className="text-[10px] font-bold text-foreground leading-tight">{r.name}</p>
                          </div>
                          <span className="text-[10px] font-mono font-bold ml-2 shrink-0" style={{color:pc}}>{r.prob}%</span>
                        </div>
                        <div className="w-full h-0.5 rounded-full bg-white/10">
                          <div className="h-0.5 rounded-full" style={{width:`${r.prob}%`,background:pc}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {boloActive && (
              <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2 px-3 py-1.5 rounded-lg border border-orange-500/30" style={{background:"rgba(15,23,42,0.92)",backdropFilter:"blur(8px)"}}>
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"/>
                <span className="text-[11px] font-bold text-orange-400">{boloActive.caseId} active</span>
                <span className="text-[10px] text-orange-300">· {nearby.length} stores · {projRoutes.length} routes</span>
                <button onClick={()=>setActiveBolo(null)} className="text-orange-400 hover:text-foreground ml-1"><X size={11}/></button>
              </div>
            )}

            <MapContainer
              center={[32.5, -84.0]}
              zoom={5}
              minZoom={4}
              maxZoom={14}
              style={{height:"100%",width:"100%"}}
              zoomControl
            >
              <MapFlyTo pos={mapFlyPos}/>

              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                subdomains="abcd"
                maxZoom={19}
              />

              {/* All corridors — faded background */}
              {ORC_CORRIDORS.map(r=>(
                <Polyline
                  key={r.id+"-bg"}
                  positions={r.coords}
                  pathOptions={{color:r.color, weight:1.5, opacity:0.15, dashArray:"5 6"}}
                />
              ))}

              {/* BOLO projected corridors — highlighted */}
              {projRoutes.map(r=>(
                <Polyline
                  key={r.id+"-active"}
                  positions={r.coords}
                  pathOptions={{color:r.color, weight:4.5, opacity:0.88, dashArray:"12 7"}}
                />
              ))}

              {/* Pinned store corridors — bright solid highlight */}
              {pinnedRoutes.map(r=>(
                <Polyline
                  key={r.id+"-pinned"}
                  positions={r.coords}
                  pathOptions={{color:r.color, weight:6, opacity:1, dashArray:undefined}}
                />
              ))}

              {/* Planned route between two stores */}
              {routeFromCoords && routeToCoords && (
                <Polyline
                  positions={[routeFromCoords, routeToCoords]}
                  pathOptions={{color:"#22C55E", weight:4, opacity:0.9, dashArray:"8 6"}}
                />
              )}

              {/* BOLO proximity circle */}
              {boloActive && getStoreCoords(boloActive.lastStore) && (
                <LeafletCircle
                  center={getStoreCoords(boloActive.lastStore)!}
                  radius={PROX_KM * 1000}
                  pathOptions={{color:"#EF4444", fillColor:"#EF4444", fillOpacity:0.04, weight:2, dashArray:"8 5"}}
                />
              )}

              {/* Store markers */}
              {visibleIds.map(id => {
                const ll       = getStoreCoords(id);
                if (!ll) return null;
                const sid      = padStoreId(id);
                const isBolo   = boloActive ? padStoreId(boloActive.lastStore) === sid : false;
                const isNearby = nearby.includes(sid);
                const isPinned = pinnedStore ? padStoreId(pinnedStore) === sid : false;
                const isRoute  = routeFrom === sid || routeTo === sid;
                const fill     = pinColor(id);
                const size     = isBolo ? 26 : isRoute ? 22 : isPinned ? 20 : isNearby ? 18 : 14;
                const icon     = createPinIcon(fill, isBolo||isNearby||isPinned||isRoute, size);

                return (
                  <Marker
                    key={id}
                    position={ll}
                    icon={icon}
                    eventHandlers={{click:()=>handleMarkerClick(id)}}
                    zIndexOffset={isBolo?1000:isRoute?950:isPinned?900:isNearby?500:0}
                  />
                );
              })}
            </MapContainer>
          </div>

          {/* ── Side Panel ── */}
          <div className="w-72 shrink-0 flex flex-col gap-3 overflow-y-auto pb-2">

            {/* Compact ORC / BOLO tracker */}
            <div className="rounded-2xl border border-orange-500/25 bg-card p-4 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Eye size={12} className="text-orange-400"/>
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Track ORC / BOLO</span>
                </div>
                {onGoToBolo && (
                  <button onClick={onGoToBolo} className="text-[9px] font-bold text-orange-400 hover:text-orange-300">
                    Full BOLO →
                  </button>
                )}
              </div>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                <input
                  value={mapSearch}
                  onChange={(e) => { setMapSearch(e.target.value); setMapSearchErr(""); }}
                  onKeyDown={(e) => e.key === "Enter" && runMapSearch()}
                  placeholder="Store # or case ID…"
                  className="w-full pl-8 pr-2 py-2 rounded-xl text-[11px] bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                />
              </div>
              {mapSearchErr && <p className="text-[9px] text-red-400 mt-1.5">{mapSearchErr}</p>}
              {boloActive && (
                <div className="mt-2 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0"/>
                  <span className="text-[10px] font-mono font-bold text-orange-400">{boloActive.caseId}</span>
                  <span className="text-[10px] text-muted-foreground truncate flex-1">#{padStoreId(boloActive.lastStore)}</span>
                  <button onClick={() => { setActiveBolo(null); setMapSearch(""); }} className="text-muted-foreground hover:text-foreground"><X size={10}/></button>
                </div>
              )}
              <button
                onClick={runMapSearch}
                className="mt-2 w-full py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/20 text-[10px] font-bold transition-colors"
              >
                Show on Map
              </button>
            </div>

            {/* Pinned store card */}
            {pinnedStore && (()=>{
              const ps       = pinnedStore;
              const pFill    = pinColor(ps);
              const pCat     = catOf(ps);
              const pCity    = cityOf(ps);
              const pPriSt   = PRIORITY_STORE_DATA.find(s=>s.id===ps)?.status;
              const pRoutes  = pinnedRoutes;
              const pIsBolo  = boloActive?.lastStore === ps;
              const pNearby  = nearby.includes(ps);
              return (
                <div className="rounded-2xl border bg-card p-4 shrink-0 animate-in fade-in slide-in-from-top-2 duration-200" style={{borderColor:pFill+"55"}}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:pFill}}/>
                      <div>
                        <p className="text-sm font-bold text-foreground">#{ps}</p>
                        <p className="text-[10px] text-muted-foreground">{pCity}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{background:pFill+"22",color:pFill}}>{pCat === "standard" ? "Standard" : pCat.charAt(0).toUpperCase() + pCat.slice(1)}</span>
                      <button onClick={()=>setPinnedStore(null)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={12}/></button>
                    </div>
                  </div>

                  {pPriSt && (
                    <div className={`text-[10px] font-semibold mb-2 px-2 py-1 rounded-md ${pPriSt==="incident"?"bg-red-500/10 text-red-400":pPriSt==="monitoring"?"bg-blue-500/10 text-blue-400":"bg-green-500/10 text-green-400"}`}>
                      {pPriSt==="incident"?"● Active Incident":pPriSt==="monitoring"?"● Monitoring":"✓ Clear"}
                    </div>
                  )}
                  {pIsBolo && <div className="text-[10px] font-semibold mb-2 px-2 py-1 rounded-md bg-orange-500/10 text-orange-400">⚠ BOLO Last Seen Here · {boloActive?.caseId}</div>}
                  {pNearby  && <div className="text-[10px] font-semibold mb-2 px-2 py-1 rounded-md bg-red-500/10 text-red-400">⚠ In BOLO Proximity Zone</div>}

                  {pRoutes.length > 0 ? (
                    <>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold mb-2">Projected ORC Routes</p>
                      <div className="space-y-2.5">
                        {pRoutes.map(r=>{
                          const probColor = r.prob>=80?"#EF4444":r.prob>=65?"#F97316":r.prob>=50?"#EAB308":"#3B82F6";
                          const probLabel = r.prob>=80?"Very High":r.prob>=65?"High":r.prob>=50?"Moderate":"Lower";
                          return (
                            <div key={r.id}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2.5 h-0.5 rounded" style={{background:r.color}}/>
                                  <span className="text-[10px] font-semibold text-foreground leading-tight">{r.name}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[9px] font-bold" style={{color:probColor}}>{probLabel}</span>
                                  <span className="text-[10px] font-mono font-bold" style={{color:probColor}}>{r.prob}%</span>
                                </div>
                              </div>
                              <div className="w-full h-1 rounded-full bg-secondary">
                                <div className="h-1 rounded-full transition-all" style={{width:`${r.prob}%`,background:probColor}}/>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-2 leading-relaxed">Probability based on route proximity, ORC activity history, and corridor usage patterns.</p>
                    </>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">No major ORC corridors within 80km of this location.</p>
                  )}

                  <button
                    onClick={()=>setSelectedStore(ps)}
                    className="mt-3 w-full py-1.5 rounded-lg text-[10px] font-bold text-white transition-colors"
                    style={{background:pFill}}
                  >
                    Open Full Store Details →
                  </button>
                </div>
              );
            })()}

            {/* Recent ORC hits — compact */}
            <div className="rounded-2xl border border-border bg-card p-4 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={12} className="text-orange-400"/>
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Recent Hits</span>
              </div>
              <div className="space-y-1.5">
                {orcHits.slice(0, 4).map(hit => (
                  <button
                    key={hit.caseId}
                    onClick={() => {
                      setMapSearch(hit.caseId);
                      setFlyPos(getStoreCoords(hit.storeId));
                      setPinnedStore(hit.storeId);
                      const bolo = BOLO_PEOPLE.find(b => b.caseId === hit.caseId);
                      if (bolo) setActiveBolo(bolo.id);
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg bg-secondary/30 hover:bg-orange-500/10 border border-border hover:border-orange-500/20 transition-colors text-left"
                  >
                    <span className="text-[9px] font-bold font-mono text-orange-400 shrink-0">{hit.caseId}</span>
                    <span className="text-[10px] font-mono font-bold text-foreground">#{hit.storeId}</span>
                    <span className="text-[9px] text-muted-foreground ml-auto shrink-0">{hit.date}</span>
                  </button>
                ))}
              </div>
              {onGoToBolo && (
                <button onClick={onGoToBolo} className="mt-2 w-full text-[10px] text-orange-400 hover:text-orange-300 font-semibold">
                  Manage all BOLOs →
                </button>
              )}
            </div>

            {/* Proximity store results — only when BOLO active */}
            {boloActive && (
              <div className={`rounded-2xl border p-4 shrink-0 ${nearby.length>0?"border-red-500/20 bg-red-500/5":"border-border bg-card"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={12} className={nearby.length>0?"text-red-400":"text-muted-foreground"}/>
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    {nearby.length>0 ? `${nearby.length} Stores In Zone` : "No Stores In Zone"}
                  </span>
                </div>
                {nearby.length>0 ? (
                  <>
                    <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">
                      <span className="text-orange-400 font-bold">{boloActive.caseId}</span> · last seen <span className="font-mono text-foreground">#{boloActive.lastStore}</span> · {boloActive.date}
                    </p>
                    <div className="space-y-1.5 mb-3">
                      {nearby.map(id => {
                        const c = catOf(id);
                        const le = storeLawEnforcement(id);
                        return (
                          <button key={id} onClick={()=>setSelectedStore(id)} className="w-full flex items-center justify-between p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/15 transition-colors text-left">
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c==="priority"?"bg-red-400":c==="opportunity"?"bg-yellow-400":"bg-slate-400"}`}/>
                              <span className="text-[11px] font-mono font-bold text-foreground">#{id}</span>
                              <span className="text-[11px] text-muted-foreground">{cityOf(id)}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {le && <span className="text-[9px] font-mono text-muted-foreground">{le.contactInfo}</span>}
                              <ChevronRight size={9} className="text-muted-foreground ml-0.5"/>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2.5">
                      <p className="text-[10px] text-red-400 font-semibold leading-relaxed">Alert LP at all {nearby.length} nearby store{nearby.length!==1?"s":""}. Share {boloActive.caseId} description and last known vehicle.</p>
                    </div>
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground">No stores within {PROX_KM}km radius of last known location.</p>
                )}
              </div>
            )}

            {/* ORC corridor summary when BOLO active */}
            {boloActive && projRoutes.length>0 && (
              <div className="rounded-2xl border border-yellow-500/20 bg-card p-4 shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={12} className="text-yellow-400"/>
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Projected Routes</span>
                  <Chip className="bg-yellow-500/15 text-yellow-400 ml-auto">{projRoutes.length}</Chip>
                </div>
                <div className="space-y-2">
                  {projRoutes.map(r=>{
                    const pc = r.prob>=80?"#EF4444":r.prob>=65?"#F97316":r.prob>=50?"#EAB308":"#3B82F6";
                    const pl = r.prob>=80?"Very High":r.prob>=65?"High":r.prob>=50?"Moderate":"Lower";
                    return (
                      <div key={r.id} className="p-2 rounded-lg bg-secondary/30 border border-border">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{background:r.color}}/>
                            <p className="text-[10px] font-bold text-foreground">{r.name}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] font-bold uppercase" style={{color:pc}}>{pl}</span>
                            <span className="text-[10px] font-mono font-bold" style={{color:pc}}>{r.prob}%</span>
                          </div>
                        </div>
                        <div className="w-full h-1 rounded-full bg-secondary">
                          <div className="h-1 rounded-full" style={{width:`${r.prob}%`,background:pc}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Store summary */}
            <div className="rounded-2xl border border-border bg-card p-4 shrink-0">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider block mb-3">Network Summary</span>
              <div className="space-y-2.5">
                {[
                  {label:"Priority",    c:"#EF4444", n:PRIORITY_STORE_DATA.length,    note:`${PRIORITY_STORE_DATA.filter(s=>s.status==="incident").length} incidents`},
                  {label:"Opportunity", c:"#EAB308", n:OPPORTUNITY_STORE_DATA.length,  note:null},
                  {label:"Standard",    c:"#64748B", n:Math.max(0, allIds.length - PRIORITY_STORE_DATA.length - OPPORTUNITY_STORE_DATA.length), note:"All other Bealls locations"},
                ].map(item=>(
                  <div key={item.label} className="flex items-center gap-2.5">
                    <svg width="9" height="12" viewBox="0 0 20 27"><path d="M10,0 C4.5,0 0,4.5 0,10 C0,18 10,27 10,27 C10,27 20,18 20,10 C20,4.5 15.5,0 10,0 Z" fill={item.c}/><circle cx="10" cy="10" r="3.5" fill="rgba(255,255,255,0.9)"/></svg>
                    <span className="text-xs text-foreground flex-1">{item.label}</span>
                    <span className="text-xs font-bold font-mono text-foreground">{item.n}</span>
                    {item.note && <span className="text-[9px] text-muted-foreground">{item.note}</span>}
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Stores</span>
                  <span className="text-xs font-bold font-mono text-foreground">{allIds.length}</span>
                </div>
              </div>
            </div>

            {/* Active incidents */}
            <div className="rounded-2xl border border-border bg-card p-4 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"/>
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Active Incidents</span>
                <Chip className="bg-red-500/15 text-red-400 ml-auto">{PRIORITY_STORE_DATA.filter(s=>s.status==="incident").length}</Chip>
              </div>
              <div className="space-y-1.5">
                {PRIORITY_STORE_DATA.filter(s=>s.status==="incident").map(s=>(
                  <button key={s.id} onClick={()=>setSelectedStore(s.id)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/15 border border-red-500/15 transition-colors text-left">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0"/>
                    <span className="text-[11px] font-mono font-bold text-foreground">#{s.id}</span>
                    <span className="text-[11px] text-muted-foreground flex-1">{s.city}</span>
                    <span className="text-[10px] text-red-400 font-bold">{s.alarms} alm</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [activeNav,setActiveNav] = useState("dashboard");
  const [sidebarOpen,setSidebarOpen] = useState(true);
  const [notifOpen,setNotifOpen] = useState(false);
  const [mapBoloPrefill,setMapBoloPrefill] = useState<string|null>(null);
  const [incidents,setIncidents] = useState(INCIDENTS);
  const [operators,setOperators] = useState<Operator[]>(() => buildInitialOperators());
  const [myOperatorId,setMyOperatorId] = useState(DEFAULT_OPERATOR.id);

  const boardProps: OperatorBoardProps = {
    operators,
    setOperators,
    myOperatorId,
    setMyOperatorId,
  };

  function handleAssign(id:string) {
    const operator = operators.find((o) => o.id === myOperatorId);
    const now = callTimeNow();
    setIncidents((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, assigned: operator?.name ?? "Ty Kelly", queueStatus: "working", openedAt: now }
          : i,
      ),
    );
  }

  const activeQueue = incidents.filter((i) => i.queueStatus !== "closed");
  const critical = activeQueue.filter((i) => i.severity === "critical").length;
  const me = operators.find(o => o.id === myOperatorId) ?? operators[0];
  const headerStatus = me?.onStation ? effectiveOperatorStatus(me) : null;

  function renderContent() {
    switch (activeNav) {
      case "dashboard":  return <DashboardView incidents={incidents} setIncidents={setIncidents} onAssign={handleAssign} {...boardProps}/>;
      case "stores":     return <StoresView/>;
      case "storemap":   return (
        <StoreMapView
          prefillBoloId={mapBoloPrefill}
          onPrefillConsumed={() => setMapBoloPrefill(null)}
          onGoToBolo={() => setActiveNav("bolo")}
        />
      );
      case "bolo":       return (
        <BOLOView onViewOnMap={(boloId) => { setMapBoloPrefill(boloId); setActiveNav("storemap"); }} />
      );
      case "dataminr":   return <DataminrView/>;
      case "pa":         return <PADownView/>;
      case "reports":    return <ReportsView operators={operators}/>;
      case "settings":   return <SettingsView/>;
      default:           return <DashboardView incidents={incidents} setIncidents={setIncidents} onAssign={handleAssign} {...boardProps}/>;
    }
  }

  const isPublicDemo =
    import.meta.env.VITE_DEMO === "true" ||
    String(import.meta.env.BASE_URL || "").includes("demo");

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background" style={{fontFamily:"'Inter', sans-serif"}}>
      <div
        className="shrink-0 flex items-center justify-center gap-2 px-4 py-1.5 border-b border-amber-500/20 bg-[#0B1120]"
        role="status"
      >
        <ShieldCheck size={12} className="text-amber-500/80 shrink-0" />
        <p className="text-[11px] font-medium tracking-wide text-amber-200/80">
          {isPublicDemo
            ? "DEMO — concept preview for SOC operations (not a live system)"
            : "DEMO / Internal concept preview — not a live system"}
        </p>
      </div>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside className="flex flex-col shrink-0 transition-all duration-300 overflow-hidden border-r border-border" style={{width:sidebarOpen?220:60,background:"#0B1120"}}>
          <div className="flex items-center gap-3 px-4 py-5 border-b border-border min-h-[64px]">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0"><Shield size={16} className="text-white"/></div>
            {sidebarOpen&&<div className="min-w-0"><p className="text-xs font-bold text-foreground leading-tight truncate">Bealls SOC</p><p className="text-[10px] text-muted-foreground leading-tight truncate">Operations Center</p></div>}
          </div>
          <nav className="flex-1 py-4 overflow-y-auto">
            {NAV_ITEMS.map(item=>{const Icon=item.icon;const active=activeNav===item.id;const badge=navBadge(item.id);return(
              <button key={item.id} onClick={()=>setActiveNav(item.id)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors relative ${active?"bg-blue-600/20 text-blue-400":"text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
                {active&&<span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full"/>}
                <Icon size={16} className="shrink-0"/>
                {sidebarOpen&&<><span className="text-sm font-medium flex-1 truncate">{item.label}</span>{badge!=null&&<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white leading-none">{badge}</span>}</>}
                {!sidebarOpen&&badge!=null&&<span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"/>}
              </button>
            );})}
          </nav>
          <button onClick={()=>setSidebarOpen(v=>!v)} className="flex items-center justify-center py-4 border-t border-border text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight size={14} className={`transition-transform duration-300 ${sidebarOpen?"rotate-180":""}`}/>
          </button>
        </aside>

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <header className="flex items-center gap-4 px-6 border-b border-border bg-card/50 backdrop-blur-sm h-16 shrink-0">
            <div className="flex-1 max-w-sm relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input placeholder="Search stores, incidents…" className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"/></div>
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/><span className="text-xs font-semibold text-emerald-400">LIVE</span></div>
              <button className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><RefreshCw size={15}/></button>
              <div className="relative">
                <button onClick={()=>setNotifOpen(v=>!v)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors relative"><Bell size={15}/>{critical>0&&<span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border border-background"/>}</button>
                {notifOpen&&(
                  <div className="absolute right-0 top-12 w-80 rounded-2xl border border-border bg-card shadow-2xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border"><p className="text-sm font-semibold text-foreground">Notifications</p><button onClick={()=>setNotifOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={14}/></button></div>
                    {incidents.slice(0,4).map(inc=>{const sc=sevCfg(inc.severity);return(<div key={inc.id} className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 border-b border-border last:border-0 transition-colors cursor-pointer"><span className={`w-2 h-2 rounded-full ${sc.dot} mt-1.5 shrink-0`}/><div><p className="text-xs font-semibold text-foreground">{inc.caseType}</p><p className="text-xs text-muted-foreground">Store #{inc.store} · {inc.time}</p></div></div>);})}
                  </div>
                )}
              </div>
              <button className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl hover:bg-secondary transition-colors">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs font-bold text-white">{nameInitials(me?.name ?? "?")}</div>
                <div className="hidden sm:block text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-foreground leading-tight">{me?.name ?? "Operator"}</p>
                    <SiteBadge site={me?.socSite} />
                    {headerStatus && <StatusBadge status={headerStatus} />}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">{me?.extension ?? ""} · Remote LP</p>
                </div>
                <ChevronDown size={12} className="text-muted-foreground"/>
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6">{renderContent()}</main>
        </div>
      </div>
    </div>
  );
}
