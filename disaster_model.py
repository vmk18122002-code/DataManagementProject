"""
Disaster-mode impact model (XGBoost).

Question it answers: when an alert says <hazard> hit <these DS divisions>, how many people
(and houses) in each DS division will be affected?  The prediction is then used to rank
DS divisions for relief.

Data preparation
  1. Keep alert-type hazards: Flood, Cyclone/wind, Landslide, Heavy rain, Drought, Tsunami/coastal.
  2. Sum GN-level rows to one DS-day total.
  3. Merge daily reports of the same hazard in the same DS division into one EPISODE
     (reports <= 10 days apart). DMC situation reports are running totals, so the
     episode value is the maximum, not the sum.
  4. An ALERT = all DS episodes of the same hazard that start within the same 7-day window.

Features (only information available when the alert arrives)
  alert:   hazard, month, number of DS divisions / districts in the alert
  history: past episodes of this hazard in this DS (count, mean & max affected, days since
           last one), all-hazard episodes in the last 365 days, district history for the hazard
           -> computed only from episodes that ENDED BEFORE this one started (no leakage)
  static:  population 2025, poverty 2012/13, Census 2024 housing / water / toilet / fuel / light

Target:   log(1 + people affected)   [second model: log(1 + houses damaged + destroyed)]
Split:    train 2004-2022, test 2023-2026 (future years the model never saw)
Output:   Disaster_Model_Results.xlsx + models: disaster_xgb_priority.json (priority order inside an alert),
          disaster_xgb_people.json (people affected). The ranker and houses models are trained
          for comparison only and not saved (weaker).
"""
import difflib
import re
import time

import numpy as np
import pandas as pd
import xgboost as xgb
from scipy.stats import spearmanr
from sklearn.metrics import mean_absolute_error, r2_score

HAZARDS = ["Flood", "Cyclone / wind", "Landslide", "Heavy rain", "Drought", "Tsunami / coastal"]
EPISODE_GAP_DAYS = 10
TRAIN_END = 2022
PEOPLE, HOUSES = "People affected", "Houses affected"
DISTRICT_FIX = {"Rathnapura": "Ratnapura", "Moneragala": "Monaragala", "Batticoloa": "Batticaloa",
                "Vavunia": "Vavuniya", "Anuradapura": "Anuradhapura", "Nuwaraeliya": "Nuwara Eliya"}


# ---------------------------------------------------------------- DS name matching (same rules as need_model_v2)
def key(s, drop_brackets=False):
    s = str(s).lower()
    if drop_brackets:
        s = re.sub(r"\(.*?\)", "", s)
    return re.sub(r"[^a-z]", "", s)


ALIAS = {
    "hanwella": "seethawaka", "srijayawardanapura": "srijayawardenapurakotte", "rathmalana": "ratmalana",
    "kaluthara": "kalutara", "mathugama": "matugama", "hatharaliyadda": "hatharaliyedda",
    "ambagamuwa": "ambagamuwakorale", "gallefourgravets": "gallefourgravet", "dickwella": "dikwella",
    "tissamaharama": "thissamaharama", "angunukolapelessa": "angunakolapelessa", "tangalle": "tangalla",
    "ehetuwewa": "ahatuwewa", "mahawa": "maho", "bamunukotuwa": "bamunakotuwa",
    "thimbirigasyasa": "thimbirigasyaya", "kandyfourgravetsgangawatakorale": "gangawatekorale",
    "kandyfourgravetsandgangawatakorale": "gangawatekorale", "mundel": "mundalama", "mandel": "mundalama",
    "kalmunaitamildivision": "kalmunainorth",
}


def match(src, target):
    tgt = {}
    for d_, g in target.groupby("District"):
        tgt[d_] = {key(n): n for n in g["DS Division"]} | {key(n, True): n for n in g["DS Division"]}
    cache, out = {}, []
    for d_, n in zip(src["District"], src["DS Division"]):
        if (d_, n) not in cache:
            cand, hit = tgt.get(d_, {}), None
            for k in (key(n), key(n, True), ALIAS.get(key(n)), ALIAS.get(key(n, True))):
                if k and k in cand:
                    hit = cand[k]; break
            if hit is None:
                close = difflib.get_close_matches(key(n, True), list(cand), 1, 0.8)
                hit = cand[close[0]] if close else None
            cache[(d_, n)] = hit
        out.append(cache[(d_, n)])
    return out


# ---------------------------------------------------------------- static DS data
ds_list = pd.read_excel("Sri_Lanka_DS_Divisions (4) (2).xlsx").dropna(subset=["District", "DS Division"])
ds_list = ds_list[["District", "DS Division", "Population 2025"]].rename(columns={"Population 2025": "population"})

cen = pd.read_excel("Census2024_DS_Living.xlsx")
cen["District"] = cen["District"].replace(DISTRICT_FIX)
cen["DS Division"] = match(cen, ds_list)
pov = pd.read_csv("DS_Poverty_2012_13.csv")
pov["District"] = pov["District"].replace(DISTRICT_FIX)
pov["DS Division"] = match(pov, ds_list)

census_cols = ["housing", "sanitation", "water", "cooking_fuel", "lighting"]
static = (ds_list
          .merge(cen.dropna(subset=["DS Division"]).drop_duplicates(["District", "DS Division"])
                 [["District", "DS Division"] + census_cols], on=["District", "DS Division"], how="left")
          .merge(pov.dropna(subset=["DS Division"]).groupby(["District", "DS Division"], as_index=False)
                 ["HCI_2012_13"].mean(), on=["District", "DS Division"], how="left"))
static["log_population"] = np.log1p(static["population"])
static["HCI_2012_13"] = static["HCI_2012_13"].fillna(static.groupby("District")["HCI_2012_13"].transform("mean"))

# ---------------------------------------------------------------- 1. episodes
raw = pd.read_excel("Sri_Lanka_Disaster_Records_2004_2026.xlsx")
raw = raw[raw["Hazard group"].isin(HAZARDS)].dropna(subset=["DS Division", "District"]).copy()
raw["District"] = raw["District"].str.strip().replace(DISTRICT_FIX)
raw["Date"] = pd.to_datetime(raw["Date"], errors="coerce")
raw = raw.dropna(subset=["Date"])
raw[HOUSES] = raw["Houses destroyed / fully damaged"].fillna(0) + raw["Houses damaged / partially damaged"].fillna(0)
raw["DS"] = match(raw, ds_list)
match_rate = raw["DS"].notna().mean()
raw = raw.dropna(subset=["DS"])  # drop "whole district" rows and names not in the DS list

daily = (raw.groupby(["District", "DS", "Hazard group", "Date"], as_index=False)
         [[PEOPLE, HOUSES]].sum().sort_values(["District", "DS", "Hazard group", "Date"]))
gap = daily.groupby(["District", "DS", "Hazard group"])["Date"].diff().dt.days
daily["episode"] = (gap.isna() | (gap > EPISODE_GAP_DAYS)).cumsum()
ep = daily.groupby("episode").agg(
    District=("District", "first"), DS=("DS", "first"), hazard=("Hazard group", "first"),
    start=("Date", "min"), end=("Date", "max"), people=(PEOPLE, "max"), houses=(HOUSES, "max")).reset_index()
ep = ep.sort_values("start").reset_index(drop=True)

# alerts: same hazard, starts chained within 7 days
ep = ep.sort_values(["hazard", "start"]).reset_index(drop=True)
alert_id, aid, anchor, prev_h = [], 0, None, None
for h, s_ in zip(ep["hazard"], ep["start"]):
    if h != prev_h or (s_ - anchor).days > 7:
        aid += 1; anchor, prev_h = s_, h
    alert_id.append(aid)
ep["alert"] = alert_id
ep["n_ds_in_alert"] = ep.groupby("alert")["DS"].transform("count")
ep["n_districts_in_alert"] = ep.groupby("alert")["District"].transform("nunique")
ep["month"] = ep["start"].dt.month
ep["year"] = ep["start"].dt.year
ep["y_people"] = np.log1p(ep["people"])
ep["y_houses"] = np.log1p(ep["houses"])

# ---------------------------------------------------------------- 2. history features (strictly past)
ep = ep.sort_values("start").reset_index(drop=True)
hist_cols = ["past_n_same", "past_mean_same", "past_max_same", "days_since_same",
             "past_n_all_365", "past_n_all", "district_mean_same", "district_n_same",
             "past_n_same_5y", "past_mean_same_5y"]
H = {c: np.full(len(ep), np.nan) for c in hist_cols}
by_ds_haz, by_ds, by_dist_haz = {}, {}, {}
starts = ep["start"].values
order_end = ep.sort_values("end")[["end", "District", "DS", "hazard", "y_people"]].values
j = 0
for i, r in ep.iterrows():
    # add every episode that finished before this one started
    while j < len(order_end) and order_end[j][0] < r["start"]:
        e_end, e_dist, e_ds, e_haz, e_y = order_end[j]
        by_ds_haz.setdefault((e_dist, e_ds, e_haz), []).append((e_end, e_y))
        by_ds.setdefault((e_dist, e_ds), []).append(e_end)
        by_dist_haz.setdefault((e_dist, e_haz), []).append(e_y)
        j += 1
    same = by_ds_haz.get((r["District"], r["DS"], r["hazard"]), [])
    allh = by_ds.get((r["District"], r["DS"]), [])
    dist = by_dist_haz.get((r["District"], r["hazard"]), [])
    H["past_n_same"][i] = len(same)
    if same:
        ys = [y for _, y in same]
        H["past_mean_same"][i] = np.mean(ys)
        H["past_max_same"][i] = np.max(ys)
        H["days_since_same"][i] = (r["start"] - max(e for e, _ in same)).days
        recent = [y for e, y in same if (r["start"] - e).days <= 5 * 365]
        H["past_n_same_5y"][i] = len(recent)
        if recent:
            H["past_mean_same_5y"][i] = np.mean(recent)
    else:
        H["past_n_same_5y"][i] = 0
    H["past_n_all"][i] = len(allh)
    H["past_n_all_365"][i] = sum((r["start"] - e).days <= 365 for e in allh)
    H["district_n_same"][i] = len(dist)
    if dist:
        H["district_mean_same"][i] = np.mean(dist)
for c in hist_cols:
    ep[c] = H[c]
ep["days_since_same"] = ep["days_since_same"].fillna(9999).clip(upper=9999)

ep = ep.merge(static.rename(columns={"DS Division": "DS"}), on=["District", "DS"], how="left")
ep["hazard_code"] = pd.Categorical(ep["hazard"], categories=HAZARDS).codes
ep["district_code"] = pd.Categorical(ep["District"], categories=sorted(static["District"].unique())).codes

# relative features: where this DS division stands among the OTHER DS divisions in the same alert
REL_BASE = ["past_mean_same", "past_mean_same_5y", "past_max_same", "past_n_same", "past_n_same_5y",
            "district_mean_same", "log_population", "HCI_2012_13", "days_since_same"] + census_cols
for c in REL_BASE:
    ep[f"{c}_rank_in_alert"] = ep.groupby("alert")[c].rank(pct=True)
REL_COLS = [f"{c}_rank_in_alert" for c in REL_BASE]

FEATURES = (["hazard_code", "district_code", "month", "n_ds_in_alert", "n_districts_in_alert"] + hist_cols
            + ["log_population", "HCI_2012_13"] + census_cols + REL_COLS)

# relative target: how much harder/lighter this DS was hit than the average DS in its alert
ep["y_rel"] = ep["y_people"] - ep.groupby("alert")["y_people"].transform("mean")

train = ep[ep["year"] <= TRAIN_END].copy()
test = ep[ep["year"] > TRAIN_END].copy()

# ---------------------------------------------------------------- 3. train XGBoost
PARAMS = dict(n_estimators=2000, learning_rate=0.03, max_depth=6, min_child_weight=5, subsample=0.8,
              colsample_bytree=0.8, reg_lambda=1.0, objective="reg:squarederror", tree_method="hist",
              early_stopping_rounds=100, random_state=42)


def fit(target):
    # hold out the last two training years to pick the number of trees, then refit on all training years
    tr, va = train[train["year"] <= TRAIN_END - 2], train[train["year"] > TRAIN_END - 2]
    m = xgb.XGBRegressor(**PARAMS).fit(tr[FEATURES], tr[target], eval_set=[(va[FEATURES], va[target])], verbose=False)
    n = m.best_iteration + 1
    final = xgb.XGBRegressor(**{**PARAMS, "n_estimators": n, "early_stopping_rounds": None})
    return final.fit(train[FEATURES], train[target]), n


m_people, n_people = fit("y_people")
m_rel, n_rel = fit("y_rel")  # PRIORITY model: order inside an alert
test["rel_score"] = m_rel.predict(test[FEATURES])

# ranking model: learns the ORDER of DS divisions inside each alert (what priority needs)
tr_r = train.sort_values("alert")
ranker = xgb.XGBRanker(objective="rank:pairwise", n_estimators=400, learning_rate=0.05, max_depth=5,
                       min_child_weight=5, subsample=0.8, colsample_bytree=0.8, tree_method="hist",
                       random_state=42)
ranker.fit(tr_r[FEATURES], tr_r["y_people"], qid=tr_r["alert"])
test["rank_score"] = ranker.predict(test[FEATURES])
m_houses, n_houses = fit("y_houses")
test["pred_people"] = np.expm1(m_people.predict(test[FEATURES])).clip(0)
test["pred_houses"] = np.expm1(m_houses.predict(test[FEATURES])).clip(0)
test["p_log"] = m_people.predict(test[FEATURES])

# baseline: "same as this DS division's past average for this hazard" (district / overall as fallback)
glob = train["y_people"].mean()
test["base_log"] = test["past_mean_same"].fillna(test["district_mean_same"]).fillna(glob)
test["base_people"] = np.expm1(test["base_log"])


# ---------------------------------------------------------------- 4. evaluation
def band(s):
    """Priority level inside one alert: High = top 20%, Medium = next 30%, Low = rest."""
    p = s.rank(pct=True, method="average")
    return np.where(p > 0.8, "High", np.where(p > 0.5, "Medium", "Low"))


rows = []
test["rank_people"] = test["rank_score"]  # ranker gives an order, not a count
alert_total = test.groupby("alert")["people"].transform("sum")
MODELS = [("XGBoost priority model (relative)", None, "rel_score"),
          ("XGBoost ranker", None, "rank_people"),
          ("XGBoost count model", "p_log", "pred_people"),
          ("Baseline (past average)", "base_log", "base_people")]
for scope, sub in [("All alerts", test), ("Major alerts (>=1,000 people)", test[alert_total >= 1000])]:
  for name, pl, pp in MODELS:
    r = {"Scope": scope, "Model": name,
         "MAE (people)": mean_absolute_error(sub["people"], sub[pp]) if pl else np.nan,
         "Median abs error (people)": float(np.median(np.abs(sub["people"] - sub[pp]))) if pl else np.nan,
         "R2 (log scale)": r2_score(sub["y_people"], sub[pl]) if pl else np.nan,
         "Spearman (all test episodes)": spearmanr(sub["people"], sub[pp])[0]}
    # ranking inside each alert - this is what decides priority
    rho, hit, lvl, lvl1 = [], [], [], []
    for _, g in sub.groupby("alert"):
        if len(g) < 5 or g["people"].nunique() < 3:
            continue
        rho.append(spearmanr(g["people"], g[pp])[0])
        k = max(1, int(round(len(g) * 0.2)))
        hit.append(len(set(g.nlargest(k, "people").index) & set(g.nlargest(k, pp).index)) / k)
        a, p = band(g["people"]), band(g[pp])
        lvl.append((a == p).mean())
        rank = {"Low": 0, "Medium": 1, "High": 2}
        lvl1.append((np.abs(np.vectorize(rank.get)(a) - np.vectorize(rank.get)(p)) <= 1).mean())
    r.update({"Alerts evaluated (>=5 DS)": len(rho),
              "Within-alert rank correlation": np.nanmean(rho),
              "Top-20% hit rate (worst-hit DS found)": np.mean(hit),
              "Priority level accuracy (High/Med/Low)": np.mean(lvl),
              "Priority level within one level": np.mean(lvl1)})
    rows.append(r)
res = pd.DataFrame(rows)

houses = {"MAE (houses)": mean_absolute_error(test["houses"], test["pred_houses"]),
          "R2 (log scale)": r2_score(test["y_houses"], m_houses.predict(test[FEATURES])),
          "Spearman": spearmanr(test["houses"], test["pred_houses"])[0]}

by_haz = (test.groupby("hazard")
          .apply(lambda g: pd.Series({"Test episodes": len(g),
                                      "R2 (log)": r2_score(g["y_people"], g["p_log"]) if len(g) > 2 else np.nan,
                                      "Spearman": spearmanr(g["people"], g["pred_people"])[0] if len(g) > 2 else np.nan}))
          .reset_index())
imp = (pd.Series(m_people.get_booster().get_score(importance_type="gain"))
       .reindex(FEATURES).fillna(0).sort_values(ascending=False))
imp = (imp / imp.sum() * 100).round(1).rename("Importance %").reset_index().rename(columns={"index": "Feature"})

# biggest recent alert as a worked example
big = test.groupby("alert")["people"].sum().idxmax()
ex = (test[test["alert"] == big].sort_values("pred_people", ascending=False)
      [["hazard", "start", "District", "DS", "pred_people", "people", "pred_houses", "houses"]].head(20))
ex["Predicted level"] = band(test.loc[test["alert"] == big, "pred_people"]).tolist()[:0] or None
g = test[test["alert"] == big]
lv = pd.Series(band(g["pred_people"]), index=g.index)
la = pd.Series(band(g["people"]), index=g.index)
ex["Predicted level"] = lv.reindex(ex.index).values
ex["Actual level"] = la.reindex(ex.index).values

summary = pd.DataFrame([
    ("Records used (alert-type hazards)", len(raw)),
    ("DS names matched to DS list", f"{match_rate:.1%}"),
    ("DS episodes after merging daily reports", len(ep)),
    ("Alerts (hazard events)", ep["alert"].nunique()),
    ("Training episodes (2004-2022)", len(train)),
    ("Test episodes (2023-2026)", len(test)),
    ("Trees - people model", n_people), ("Trees - priority model", n_rel), ("Trees - houses model", n_houses),
], columns=["Item", "Value"])

# ---------------------------------------------------------------- save
m_people.save_model("disaster_xgb_people.json")
m_rel.save_model("disaster_xgb_priority.json")


def free_name(path):
    try:
        open(path, "a").close(); return path
    except PermissionError:
        stem, ext = path.rsplit(".", 1); return f"{stem}_{time.strftime('%H%M%S')}.{ext}"


XLSX = free_name("Disaster_Model_Results.xlsx")
with pd.ExcelWriter(XLSX) as xw:
    res.round(3).to_excel(xw, sheet_name="Accuracy", index=False)
    pd.DataFrame([houses]).round(3).to_excel(xw, sheet_name="Houses model", index=False)
    by_haz.round(3).to_excel(xw, sheet_name="By hazard", index=False)
    imp.to_excel(xw, sheet_name="Feature importance", index=False)
    ex.round(0).to_excel(xw, sheet_name="Example alert", index=False)
    summary.to_excel(xw, sheet_name="Training data", index=False)
    test[["alert", "hazard", "start", "District", "DS", "people", "pred_people", "houses", "pred_houses"]] \
        .round(0).to_excel(xw, sheet_name="Test predictions", index=False)

pd.set_option("display.width", 220, "display.max_columns", 20)
print("Saved:", XLSX)
print(summary.to_string(index=False))
print("\n", res.round(3).T.to_string())
print("\nHouses:", {k: round(v, 3) for k, v in houses.items()})
print("\n", by_haz.round(3).to_string(index=False))
print("\n", imp.head(10).to_string(index=False))
print("\nExample alert:\n", ex.round(0).to_string(index=False))
