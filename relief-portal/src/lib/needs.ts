/*
  Need / limit / allocation rules used by every portal.
  These mirror the models:  normal priority = need score (need_model_v2),
  disaster priority = affected areas first by Critical > High > Medium, then predicted people (disaster_model).
  In the real system the Coordinator / Relief / Disaster agents compute this server-side.
*/
import {
  AFFECTED, AffectedArea, DS_AREAS, DSArea, DisasterLevel, ITEMS, ItemKey, LimitAdjustment, Mode,
  disasterExtra, distanceKm,
} from "./data";

export interface NeedRow {
  area: DSArea;
  item: ItemKey;
  limit: number;
  used: number;
  remaining: number;
  pct: number;
  score: number;
  level: DSArea["livingLevel"];
  affected?: AffectedArea;
  adjusted: number;
}

const RANK: Record<DisasterLevel, number> = { Critical: 0, High: 1, Medium: 2 };

export function affectedFor(ds: string, district: string, mode: Mode, confirmed: Set<string>) {
  if (mode !== "disaster") return undefined;
  const a = AFFECTED.find((x) => x.ds === ds && x.district === district);
  return a && confirmed.has(`${a.district}|${a.ds}`) ? a : undefined;
}

export function needRows(item: ItemKey, mode: Mode, adjustments: LimitAdjustment[], confirmed: Set<string>): NeedRow[] {
  const needKey = ITEMS[item].need;
  const rows = DS_AREAS.map((area) => {
    const adjusted = adjustments
      .filter((a) => a.ds === area.ds && a.district === area.district && a.item === item)
      .reduce((s, a) => s + a.change, 0);
    const affected = affectedFor(area.ds, area.district, mode, confirmed);
    const limit = area.limit[item] + adjusted + (affected ? disasterExtra(affected, item) : 0);
    const used = area.used[item];
    const remaining = Math.max(0, limit - used);
    return {
      area, item, limit, used, remaining, adjusted, affected,
      pct: limit ? Math.min(100, Math.round((used / limit) * 100)) : 100,
      score: needKey === "living" ? area.living : area.education,
      level: needKey === "living" ? area.livingLevel : area.educationLevel,
    };
  });
  return rows.sort((a, b) => {
    if (a.affected && !b.affected) return -1;
    if (!a.affected && b.affected) return 1;
    if (a.affected && b.affected) {
      return RANK[a.affected.priority] - RANK[b.affected.priority] || b.affected.predicted - a.affected.predicted;
    }
    return b.score - a.score;
  });
}

export interface Suggestion {
  row: NeedRow;
  qty: number;
  km: number;
  reason: string;
}

/*
  Coordinator agent (greedy priority allocation):
  candidates = High-need or disaster-affected areas with limit left,
  ordered by priority tier, then predicted people affected (disaster areas), then distance to the
  donor, then need score.
  Fill each area up to its remaining limit; when an area is full, move to the next one.
*/
export function suggestAllocation(item: ItemKey, qty: number, donorDistrict: string, mode: Mode,
  adjustments: LimitAdjustment[], confirmed: Set<string>, maxAreas = 4): Suggestion[] {
  const rows = needRows(item, mode, adjustments, confirmed).filter(
    (r) => r.remaining > 0 && (r.affected || r.level === "High"),
  );
  const tier = (r: NeedRow) => (r.affected ? RANK[r.affected.priority] : 3);
  rows.sort((a, b) => tier(a) - tier(b)
    || (b.affected?.predicted ?? 0) - (a.affected?.predicted ?? 0)
    || distanceKm(donorDistrict, a.area.district) - distanceKm(donorDistrict, b.area.district)
    || b.score - a.score);
  const out: Suggestion[] = [];
  let left = qty;
  for (const r of rows) {
    if (left <= 0 || out.length >= maxAreas) break;
    const give = Math.min(left, r.remaining);
    const km = distanceKm(donorDistrict, r.area.district);
    const reason = r.affected
      ? `${r.affected.priority} disaster priority - ${r.affected.hazard.toLowerCase()} affected${r.affected.alreadyAffected ? `, hit again (${r.affected.prevHazard?.toLowerCase()} ${r.affected.daysSincePrev} days earlier)` : ""}`
      : `High ${ITEMS[item].need === "living" ? "living" : "education"} need (score ${r.score.toFixed(0)}), ${km} km from donor`;
    out.push({ row: r, qty: give, km, reason: give < left ? `${reason}; limit reached, remainder moved to next area` : reason });
    left -= give;
  }
  return out;
}

export const fmt = (n: number) => n.toLocaleString("en-US");
