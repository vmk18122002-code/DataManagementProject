/*
  Mock data layer (UI only - no backend yet).
  - ds.json    : real DS divisions, need scores and limits from need_model_v2.py
  - alert.json : real Nov-2024 flood alert with XGBoost predictions from disaster_model.py
  Everything else (donors, donations, collectors) is sample data.
  Replace these exports with API calls when the NestJS / LangGraph backend is ready.
*/
import dsRaw from "@/data/ds.json";
import alertRaw from "@/data/alert.json";

export type ItemKey = "food" | "clothes" | "books";
export type Mode = "normal" | "disaster";
export type Level = "High" | "Medium" | "Low";
export type DisasterLevel = "Critical" | "High" | "Medium";

export const ITEMS: Record<ItemKey, { label: string; unit: string; noun: string; need: "living" | "education" }> = {
  food: { label: "Food packs", unit: "packs", noun: "food packs", need: "living" },
  clothes: { label: "Clothes", unit: "sets", noun: "clothing sets", need: "living" },
  books: { label: "Books & school supplies", unit: "books", noun: "books", need: "education" },
};
export const ITEM_KEYS = Object.keys(ITEMS) as ItemKey[];

export interface DSArea {
  id: number;
  district: string;
  ds: string;
  population: number;
  poverty: number;
  living: number;
  education: number;
  livingLevel: Level;
  educationLevel: Level;
  group: string;
  limit: Record<ItemKey, number>;
  used: Record<ItemKey, number>;
}
export const DS_AREAS = dsRaw as DSArea[];
export const DISTRICTS = [...new Set(DS_AREAS.map((d) => d.district))].sort();

// approximate district centres - used for "closest area to the donor"
export const DISTRICT_XY: Record<string, [number, number]> = {
  Colombo: [6.93, 79.86], Gampaha: [7.09, 80.0], Kalutara: [6.58, 79.96], Kandy: [7.29, 80.63],
  Matale: [7.47, 80.62], "Nuwara Eliya": [6.97, 80.77], Galle: [6.05, 80.22], Matara: [5.95, 80.54],
  Hambantota: [6.12, 81.12], Jaffna: [9.66, 80.02], Kilinochchi: [9.38, 80.4], Mannar: [8.98, 79.9],
  Vavuniya: [8.75, 80.5], Mullaitivu: [9.27, 80.81], Batticaloa: [7.73, 81.7], Ampara: [7.3, 81.67],
  Trincomalee: [8.59, 81.21], Kurunegala: [7.49, 80.36], Puttalam: [8.04, 79.84],
  Anuradhapura: [8.31, 80.4], Polonnaruwa: [7.94, 81.0], Badulla: [6.99, 81.06],
  Monaragala: [6.87, 81.35], Ratnapura: [6.68, 80.4], Kegalle: [7.25, 80.35],
};

export function distanceKm(a: string, b: string) {
  const [la1, lo1] = DISTRICT_XY[a] ?? [7.8, 80.7];
  const [la2, lo2] = DISTRICT_XY[b] ?? [7.8, 80.7];
  const dx = (lo2 - lo1) * 111 * Math.cos(((la1 + la2) / 2) * (Math.PI / 180));
  const dy = (la2 - la1) * 111;
  return Math.round(Math.sqrt(dx * dx + dy * dy));
}

// ---------------------------------------------------------------- disaster alert (real model output)
export interface AffectedArea {
  district: string;
  ds: string;
  hazard: string;
  start: string;
  predicted: number;
  level: "High" | "Medium";
  // set by build_alert_history.py from the disaster records: an earlier disaster (>=100 people or
  // >=10 houses) ended 7-90 days before this alert started
  alreadyAffected: boolean;
  prevHazard?: string;
  prevEnd?: string;
  prevPeople?: number;
  prevHouses?: number;
  daysSincePrev?: number;
  priority: DisasterLevel;
}
// already affected -> one level up (Medium -> High, High -> Critical), so size still counts
export const AFFECTED: AffectedArea[] = (alertRaw as Omit<AffectedArea, "priority">[]).map((a) => {
  const base: DisasterLevel = a.level === "High" ? "High" : "Medium";
  const priority: DisasterLevel = !a.alreadyAffected ? base : base === "High" ? "Critical" : "High";
  return { ...a, priority };
});
const SURGE: Record<DisasterLevel, number> = { Critical: 1.5, High: 1.2, Medium: 1.0 };
const PER_PERSON: Record<ItemKey, number> = { food: 1 / 3.7, clothes: 0.5, books: 0.23 * 8 };

export function disasterExtra(area: AffectedArea, item: ItemKey) {
  return Math.round(area.predicted * PER_PERSON[item] * SURGE[area.priority]);
}

export interface Alert {
  id: string;
  source: "DMC" | "NBRO" | "Met Department" | "GDACS" | "RISE Sri Lanka";
  hazard: string;
  title: string;
  districts: string[];
  issued: string;
  severity: "Red" | "Amber" | "Yellow";
  status: "New" | "Confirmed" | "Dismissed";
}
export const ALERTS: Alert[] = [
  { id: "AL-2411-07", source: "DMC", hazard: "Flood", title: "Flood situation report - heavy flooding in Eastern & Northern provinces",
    districts: ["Ampara", "Trincomalee", "Mullaitivu", "Vavuniya"], issued: "2024-11-26 06:30", severity: "Red", status: "New" },
  { id: "AL-2411-06", source: "Met Department", hazard: "Heavy rain", title: "Heavy rainfall warning (>150 mm) for Eastern, Uva and North-Central provinces",
    districts: ["Ampara", "Batticaloa", "Badulla", "Polonnaruwa"], issued: "2024-11-25 16:00", severity: "Amber", status: "New" },
  { id: "AL-2411-05", source: "NBRO", hazard: "Landslide", title: "Landslide early warning - Level 2 (Be alert)",
    districts: ["Badulla", "Nuwara Eliya"], issued: "2024-11-25 12:15", severity: "Amber", status: "New" },
  { id: "AL-2411-04", source: "GDACS", hazard: "Cyclone / wind", title: "Tropical depression over south-west Bay of Bengal",
    districts: ["Trincomalee", "Batticaloa", "Jaffna"], issued: "2024-11-24 21:00", severity: "Yellow", status: "New" },
  { id: "AL-2411-03", source: "RISE Sri Lanka", hazard: "Flood", title: "Community reports: roads flooded near Kinniya",
    districts: ["Trincomalee"], issued: "2024-11-24 18:40", severity: "Yellow", status: "Dismissed" },
];

// ---------------------------------------------------------------- donors, donations, collectors
export type DonationStatus = "Submitted" | "Allocated" | "Collector assigned" | "Picked up" | "Delivered" | "Dispatched to area" | "Reached area";
export const STATUS_FLOW: DonationStatus[] = ["Submitted", "Allocated", "Collector assigned", "Picked up", "Delivered", "Dispatched to area", "Reached area"];

export interface Donation {
  id: string;
  donor: string;
  phone: string;
  email: string;
  address: string;
  district: string;
  items: { item: ItemKey; qty: number }[];
  targetDs: string;
  targetDistrict: string;
  date: string;
  status: DonationStatus;
  collector?: string;
  proof?: {
    photoUrl: string;   // base64 data URL of the delivery photo
    note: string;       // collector's delivery note / voucher comment
    time: string;       // ISO timestamp when proof was submitted
    org: string;        // name of the collecting organisation
  };
  areaProof?: {
    photoUrl: string;   // photo proof that items reached the target DS area
    note: string;       // field agent confirmation note
    time: string;       // ISO timestamp
    by: string;         // name of field agent / org who confirmed
  };
}

export const DONATIONS: Donation[] = [
  { id: "DN-1042", donor: "Nimal Perera", phone: "077 123 4567", email: "nimal@example.com", address: "24 Temple Rd, Maharagama",
    district: "Colombo", items: [{ item: "food", qty: 120 }], targetDs: "Ayagama", targetDistrict: "Ratnapura",
    date: "2026-09-24", status: "Collector assigned", collector: "Kasun Silva" },
  { id: "DN-1041", donor: "Fathima Rizwan", phone: "071 555 2211", email: "fathima@example.com", address: "8 Lake View, Kandy",
    district: "Kandy", items: [{ item: "books", qty: 400 }, { item: "clothes", qty: 60 }], targetDs: "Meegahakivula", targetDistrict: "Badulla",
    date: "2026-09-23", status: "Picked up", collector: "Ruwan Bandara" },
  { id: "DN-1040", donor: "Selvam Traders", phone: "021 222 8899", email: "orders@selvam.example", address: "112 Hospital Rd, Jaffna",
    district: "Jaffna", items: [{ item: "food", qty: 300 }], targetDs: "Maritime Pattu", targetDistrict: "Mullaitivu",
    date: "2026-09-22", status: "Delivered", collector: "Tharshan Ravi" },
  { id: "DN-1039", donor: "Amaya de Silva", phone: "076 888 1020", email: "amaya@example.com", address: "5 Galle Rd, Panadura",
    district: "Kalutara", items: [{ item: "clothes", qty: 45 }], targetDs: "Bulathsinhala", targetDistrict: "Kalutara",
    date: "2026-09-22", status: "Allocated" },
  { id: "DN-1038", donor: "Hope Rotary Club", phone: "081 234 5678", email: "rotary@example.com", address: "Peradeniya Rd, Kandy",
    district: "Kandy", items: [{ item: "books", qty: 1200 }], targetDs: "Koralai Pattu North", targetDistrict: "Batticaloa",
    date: "2026-09-21", status: "Delivered", collector: "Ruwan Bandara" },
  { id: "DN-1037", donor: "Kavindu Jayasuriya", phone: "070 111 3344", email: "kavindu@example.com", address: "17 Station Rd, Gampaha",
    district: "Gampaha", items: [{ item: "food", qty: 50 }, { item: "books", qty: 80 }], targetDs: "Nildandahinna", targetDistrict: "Nuwara Eliya",
    date: "2026-09-20", status: "Submitted" },
  { id: "DN-0987", donor: "Nimal Perera", phone: "077 123 4567", email: "nimal@example.com", address: "24 Temple Rd, Maharagama",
    district: "Colombo", items: [{ item: "clothes", qty: 80 }], targetDs: "Walapane", targetDistrict: "Nuwara Eliya",
    date: "2026-08-14", status: "Delivered", collector: "Kasun Silva" },
  { id: "DN-0911", donor: "Nimal Perera", phone: "077 123 4567", email: "nimal@example.com", address: "24 Temple Rd, Maharagama",
    district: "Colombo", items: [{ item: "books", qty: 250 }, { item: "food", qty: 40 }], targetDs: "Haldummulla", targetDistrict: "Badulla",
    date: "2026-07-02", status: "Delivered", collector: "Kasun Silva" },
];

// the donor who is "logged in" to the donor portal
export const CURRENT_DONOR = {
  name: "Nimal Perera", email: "nimal@example.com", phone: "077 123 4567",
  address: "24 Temple Rd, Maharagama", district: "Colombo",
};

export interface Collector {
  name: string;
  org: string;
  district: string;
  phone: string;
  vehicle: string;
  active: number;
  status: "Available" | "On route" | "Off duty";
}
export const COLLECTORS: Collector[] = [
  { name: "Kasun Silva", org: "Red Cross - Colombo", district: "Colombo", phone: "077 400 1001", vehicle: "Lorry WP-LB 4521", active: 3, status: "On route" },
  { name: "Ruwan Bandara", org: "Sarvodaya - Kandy", district: "Kandy", phone: "077 400 1002", vehicle: "Van CP-PH 2210", active: 1, status: "Available" },
  { name: "Tharshan Ravi", org: "FoG - Jaffna", district: "Jaffna", phone: "077 400 1003", vehicle: "Lorry NP-LG 7781", active: 0, status: "Available" },
  { name: "Ishara Fernando", org: "Red Cross - Galle", district: "Galle", phone: "077 400 1004", vehicle: "Van SP-PK 1190", active: 2, status: "On route" },
  { name: "Mohamed Nazeer", org: "District Relief - Ampara", district: "Ampara", phone: "077 400 1005", vehicle: "Tractor EP-TR 3301", active: 4, status: "On route" },
  { name: "Dilani Wickrama", org: "Sarvodaya - Badulla", district: "Badulla", phone: "077 400 1006", vehicle: "Van UP-PA 5520", active: 0, status: "Off duty" },
];
// the collector who is "logged in" to the collector portal
export const CURRENT_COLLECTOR = COLLECTORS[0];

// ---------------------------------------------------------------- limit changes & field reports
export interface LimitAdjustment {
  ds: string;
  district: string;
  item: ItemKey;
  change: number;
  reason: string;
  by: "Coordinator" | "Field report";
  time: string;
}
export const LIMIT_ADJUSTMENTS: LimitAdjustment[] = [
  { ds: "Ayagama", district: "Ratnapura", item: "food", change: 200, reason: "Collector field report - landslide-damaged homes", by: "Field report", time: "08:50" },
  { ds: "Koralai Pattu North", district: "Batticaloa", item: "books", change: 350, reason: "School re-opening; 2 schools without supplies", by: "Coordinator", time: "Yesterday" },
];

export interface FieldFeedback {
  ds: string;
  district: string;
  item: ItemKey;
  qty: number;
  urgency: "Urgent" | "Soon" | "Normal";
  note: string;
  by: string;
  time: string;
}
