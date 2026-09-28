"""
Need model v2 - Living (Food & Clothes) and Education (Books) for Sri Lanka DS divisions.
Normal situation (no disaster data).

What changed from v1
  * Living is now measured directly per DS division from Census 2024 (housing, water, toilet,
    cooking fuel, lighting) - no longer a district average.
  * DS poverty 2012/13 (all 331 DS divisions, incl. North & East) replaces the 2002 map
    (150 DS divisions) for spreading district Education scores to DS divisions.
  * Scores are percentiles (0-100 = % of DS divisions with lower need), so the three needs are
    comparable. Levels: High = top 20%, Medium = next 30%, Low = bottom 50%.
  * Living is checked at DS level against 2012/13 poverty (not an input to Living).

Inputs (same folder)
  Census2024_DS_Living.xlsx            - built by build_census_ds.py from DCS Census 2024 Housing_Tables.xlsx
  DS_Poverty_2012_13.csv               - DCS "Spatial Distribution of Poverty 2012/13", Table 10
  MPI_Feature_Scores_by_District (3).xlsx
  Food_Insecurity_2024_by_District.xlsx
  Sri_Lanka_DS_Divisions (4) (2).xlsx
  FoG_Food_and_Education_Distributions.xlsx
Output: Need_Model_Results_v2.xlsx
"""
import difflib
import re
import time

import numpy as np
import pandas as pd
from scipy.optimize import linear_sum_assignment
from scipy.stats import spearmanr
from sklearn.cluster import KMeans
from sklearn.metrics import (adjusted_rand_score, calinski_harabasz_score,
                             davies_bouldin_score, silhouette_score)
from sklearn.model_selection import KFold
from sklearn.preprocessing import StandardScaler

RNG = np.random.default_rng(42)
DISTRICT_FIX = {"Rathnapura": "Ratnapura", "Moneragala": "Monaragala", "Batticoloa": "Batticaloa",
                "Vavunia": "Vavuniya", "Anuradapura": "Anuradhapura"}
LIV, EDU = "Living (Food & Clothes)", "Education (Books)"
NEEDS = [LIV, EDU]
SHORT = {LIV: "Living", EDU: "Education"}
HIGH, MID = 80, 50  # percentile cut-offs: High = top 20%, Medium = next 30%


def key(s, drop_brackets=False):
    s = str(s).lower()
    if drop_brackets:
        s = re.sub(r"\(.*?\)", "", s)
    return re.sub(r"[^a-z]", "", s)


ALIAS = {  # older / alternative spellings -> key used in the 2025 DS list
    "hanwella": "seethawaka", "srijayawardanapura": "srijayawardenapurakotte",
    "rathmalana": "ratmalana", "kaluthara": "kalutara", "mathugama": "matugama",
    "hatharaliyadda": "hatharaliyedda", "ambagamuwa": "ambagamuwakorale",
    "gallefourgravets": "gallefourgravet", "dickwella": "dikwella", "tissamaharama": "thissamaharama",
    "angunukolapelessa": "angunakolapelessa", "tangalle": "tangalla", "ehetuwewa": "ahatuwewa",
    "mahawa": "maho", "bamunukotuwa": "bamunakotuwa", "thimbirigasyasa": "thimbirigasyaya",
    "kandyfourgravetsgangawatakorale": "gangawatekorale",
    "kandyfourgravetsandgangawatakorale": "gangawatekorale",
    "mundel": "mundalama", "mandel": "mundalama", "kalmunaitamildivision": "kalmunainorth",
}


def match(src, target):
    """Map each (District, DS Division) row of src to a DS name in target (same district)."""
    tgt = {}
    for d_, g in target.groupby("District"):
        tgt[d_] = {key(n): n for n in g["DS Division"]} | {key(n, True): n for n in g["DS Division"]}
    out = []
    for d_, n in zip(src["District"], src["DS Division"]):
        cand = tgt.get(d_, {})
        hit = None
        for k in (key(n), key(n, True), ALIAS.get(key(n)), ALIAS.get(key(n, True))):
            if k and k in cand:
                hit = cand[k]; break
        if hit is None:
            close = difflib.get_close_matches(key(n, True), list(cand), 1, 0.8)
            hit = cand[close[0]] if close else None
        out.append(hit)
    return out


def scale(x):
    """0-100, anchored at the 99th percentile so single outliers don't flatten the rest."""
    x = pd.Series(x, dtype=float)
    lo, hi = x.min(), x.quantile(0.99)
    return ((x - lo) / (hi - lo)).clip(0, 1) * 100


def level(v):
    return "High" if v >= HIGH else "Medium" if v >= MID else "Low"


# ---------------------------------------------------------------- load
ds = pd.read_excel("Sri_Lanka_DS_Divisions (4) (2).xlsx").dropna(subset=["District", "DS Division"])
ds = ds[["District", "DS Division", "Population 2025"]].rename(columns={"Population 2025": "Population"})
ds = ds.reset_index(drop=True)

cen = pd.read_excel("Census2024_DS_Living.xlsx")
cen["District"] = cen["District"].replace(DISTRICT_FIX)
cen["DS"] = match(cen, ds)

pov = pd.read_csv("DS_Poverty_2012_13.csv")
pov["District"] = pov["District"].replace(DISTRICT_FIX)
pov["DS"] = match(pov, ds)

mpi = pd.read_excel("MPI_Feature_Scores_by_District (3).xlsx", header=1)
mpi = mpi[pd.to_numeric(mpi["MPI poor (H %)"], errors="coerce").notna()].copy()
mpi = mpi[mpi["District"].astype(str).str.len() < 30]
for c in mpi.columns[1:]:
    mpi[c] = pd.to_numeric(mpi[c], errors="coerce")
mpi = mpi.set_index("District")
H = mpi["MPI poor (H %)"]
contrib = lambda col: mpi[col] * H / 100  # share of MPI x headcount

wfp = pd.read_excel("Food_Insecurity_2024_by_District.xlsx").iloc[:, :2].dropna()
wfp.columns = ["District", "FI"]
wfp = wfp.set_index("District")["FI"].astype(float) * 100

fog = pd.read_excel("FoG_Food_and_Education_Distributions.xlsx", sheet_name="By District - Coverage vs Need")
fog = fog[fog["District"].isin(mpi.index)].set_index("District")

# ---------------------------------------------------------------- join DS-level data
census_cols = ["housing", "sanitation", "water", "cooking_fuel", "lighting"]
ds = ds.merge(cen.dropna(subset=["DS"])[["District", "DS"] + census_cols + ["Households 2024"]]
              .drop_duplicates(["District", "DS"]).rename(columns={"DS": "DS Division"}),
              on=["District", "DS Division"], how="left")
ds = ds.merge(pov.dropna(subset=["DS"])[["District", "DS", "HCI_2012_13"]]
              .groupby(["District", "DS"], as_index=False).mean().rename(columns={"DS": "DS Division"}),
              on=["District", "DS Division"], how="left")
# district poverty 2012/13 (population-weighted from DS rates)
w = ds.dropna(subset=["HCI_2012_13"])
d_hci = (w["HCI_2012_13"] * w["Population"]).groupby(w["District"]).sum() / w.groupby("District")["Population"].sum()
ds["poverty_factor"] = (ds["HCI_2012_13"] / ds["District"].map(d_hci)).clip(0.3, 3).fillna(1.0)
ds["poverty_source"] = np.where(ds["HCI_2012_13"].notna(), "DS 2012/13", "district avg")
# census gaps (if any) -> district mean
for c in census_cols:
    ds[c] = ds[c].fillna(ds.groupby("District")[c].transform("mean"))
ds["assets"] = ds["District"].map(contrib("Assets"))

# ---------------------------------------------------------------- 1. need indices
# Living: DS-level census indicators + district assets, each turned into a percentile (0-1)
LIV_W = {"housing": 1, "sanitation": 1, "water": 1, "cooking_fuel": 1, "lighting": 1, "assets": 1}
pct = ds[list(LIV_W)].rank(pct=True)

# Education: district MPI dimension, spread to DS by 2012/13 poverty ratio
dnorm = pd.DataFrame({"schooling": contrib("Schooling"), "attendance": contrib("School Attendance")})
dnorm = (dnorm - dnorm.min()) / (dnorm.max() - dnorm.min())
EDU_W = {"schooling": 1, "attendance": 1}


def raw_scores(liv_w, edu_w):
    liv = sum(pct[f] * v for f, v in liv_w.items()) / sum(liv_w.values())
    edu_d = sum(dnorm[f] * v for f, v in edu_w.items()) / sum(edu_w.values())
    edu = ds["District"].map(edu_d) * ds["poverty_factor"]
    return pd.DataFrame({LIV: scale(liv), EDU: scale(edu)})


S = raw_scores(LIV_W, EDU_W)
# percentile score: 0-100 = % of DS divisions with lower need -> the three needs are comparable
S = S.rank(pct=True, method="average") * 100
out = ds[["District", "DS Division", "Population", "poverty_source", "HCI_2012_13"] + census_cols].copy()
out = out.rename(columns={c: f"{c} deprived %" for c in census_cols})
for n in NEEDS:
    out[f"{n} score"] = S[n].round(1)
    out[f"{n} rank"] = S[n].rank(ascending=False, method="min").astype(int)
    out[f"{SHORT[n]} level"] = S[n].map(level)
out["Est. MPI-poor people"] = (ds["Population"] * (ds["District"].map(H) / 100 * ds["poverty_factor"]).clip(upper=1)).round()

# ---------------------------------------------------------------- 2. K-Means
X = StandardScaler().fit_transform(S[NEEDS])
k_eval = []
for k in range(2, 9):
    m = KMeans(k, n_init=20, random_state=0).fit(X)
    k_eval.append({"k": k, "silhouette": silhouette_score(X, m.labels_),
                   "davies_bouldin": davies_bouldin_score(X, m.labels_),
                   "calinski_harabasz": calinski_harabasz_score(X, m.labels_), "inertia": m.inertia_})
k_eval = pd.DataFrame(k_eval)
K = int(k_eval[k_eval.k.between(3, 6)].sort_values("silhouette").iloc[-1]["k"])
km = KMeans(K, n_init=50, random_state=0).fit(X)
out["cluster"] = km.labels_

prof = out.groupby("cluster")[[f"{n} score" for n in NEEDS]].mean()


def group_name(row):
    hi = [SHORT[n] for n in NEEDS if row[f"{n} score"] >= HIGH]
    mid = [SHORT[n] for n in NEEDS if MID <= row[f"{n} score"] < HIGH]
    parts = (["High - " + " + ".join(hi)] if hi else []) + (["Moderate - " + " + ".join(mid)] if mid else [])
    return ", ".join(parts) if parts else "Low need (both)"


prof["Need group"] = prof.apply(group_name, axis=1)
prof["DS divisions"] = out["cluster"].value_counts().sort_index()
prof["Population"] = out.groupby("cluster")["Population"].sum()
out["Need group"] = out["cluster"].map(prof["Need group"])

# ---------------------------------------------------------------- 3. evaluation
metrics = []
add = lambda area, name, val, meaning: metrics.append({"Area": area, "Metric": name, "Value": val, "What it means": meaning})
best = k_eval[k_eval.k == K].iloc[0]
add("K-Means", "Chosen k", K, "Best silhouette among 3-6 groups")
add("K-Means", "Silhouette score", round(best.silhouette, 3), ">0.5 strong, 0.25-0.5 reasonable")
add("K-Means", "Davies-Bouldin index", round(best.davies_bouldin, 3), "Lower is better; <1 = well separated")
aris = []
for b in range(100):
    idx = RNG.choice(len(X), len(X), replace=True)
    aris.append(adjusted_rand_score(km.labels_, KMeans(K, n_init=10, random_state=b).fit(X[idx]).predict(X)))
add("K-Means", "Bootstrap stability (mean ARI)", round(float(np.mean(aris)), 3), ">0.75 = stable groups")

# weight robustness
top30 = {n: set(S[n].nlargest(30).index) for n in NEEDS}
rho, keep = {n: [] for n in NEEDS}, {n: [] for n in NEEDS}
dir_ = lambda wt: dict(zip(wt, RNG.dirichlet(np.array(list(wt.values()), float) * 10)))
for _ in range(500):
    Sp = raw_scores(dir_(LIV_W), dir_(EDU_W))
    for n in NEEDS:
        rho[n].append(spearmanr(S[n], Sp[n])[0])
        keep[n].append(len(top30[n] & set(Sp[n].nlargest(30).index)) / 30)
for n in NEEDS:
    add("Index robustness", f"{SHORT[n]}: rank correlation under random weights", round(np.mean(rho[n]), 3), "1 = unchanged")
    add("Index robustness", f"{SHORT[n]}: top-30 DS kept under random weights", f"{np.mean(keep[n]):.0%}", "")


def confusion(pred, truth, universe):
    tp = len(pred & truth); fp = len(pred - truth); fn = len(truth - pred); tn = len(universe) - tp - fp - fn
    return {"N": len(universe), "TP": tp, "FP": fp, "FN": fn, "TN": tn, "Accuracy": (tp + tn) / len(universe),
            "Precision": tp / (tp + fp), "Recall": tp / (tp + fn), "F1": 2 * tp / (2 * tp + fp + fn)}


acc = []
# Education - district level vs FoG priority top-10
d_edu = (S[EDU] * ds["Population"]).groupby(ds["District"]).sum() / ds.groupby("District")["Population"].sum()
fog_top = set(fog["Education priority rank (1 = most need)"].nsmallest(10).index)
acc.append({"Need": EDU, "Level": "District (25)", "Compared with": "FoG education priority top-10",
            **confusion(set(d_edu.nlargest(10).index), fog_top, set(d_edu.index))})
r, p = spearmanr(d_edu, -fog["Education priority rank (1 = most need)"].reindex(d_edu.index))
add("External check", "Education vs FoG priority rank (Spearman, 25 districts)", round(r, 3), f"p={p:.3f}")

# Living - district level vs WFP food insecurity top-10 (independent)
d_liv = (S[LIV] * ds["Population"]).groupby(ds["District"]).sum() / ds.groupby("District")["Population"].sum()
acc.append({"Need": LIV, "Level": "District (25)", "Compared with": "WFP 2024 top-10 food-insecure",
            **confusion(set(d_liv.nlargest(10).index), set(wfp.nlargest(10).index), set(d_liv.index))})
r, p = spearmanr(d_liv, wfp.reindex(d_liv.index))
add("External check", "Living vs WFP food insecurity (Spearman, 25 districts)", round(r, 3), f"p={p:.3f}; independent")

# Living - DS level vs 2012/13 poverty (independent: poverty is not a Living input)
v = ds["HCI_2012_13"].notna()
q = int(round(v.sum() * 0.25))
liv_top = set(S.loc[v, LIV].nlargest(q).index); pov_top = set(ds.loc[v, "HCI_2012_13"].nlargest(q).index)
acc.append({"Need": LIV, "Level": f"DS division ({v.sum()})", "Compared with": "Poorest 25% of DS divisions (poverty 2012/13)",
            **confusion(liv_top, pov_top, set(ds.index[v]))})
r, p = spearmanr(S.loc[v, LIV], ds.loc[v, "HCI_2012_13"])
add("External check", f"Living vs DS poverty 2012/13 (Spearman, {v.sum()} DS)", round(r, 3), f"p={p:.4f}; independent")


# K-Means held-out
fold = []
for seed in range(20):
    for tr, te in KFold(5, shuffle=True, random_state=seed).split(X):
        pred = KMeans(K, n_init=10, random_state=seed).fit(X[tr]).predict(X[te])
        cm = pd.crosstab(pred, km.labels_[te]).reindex(index=range(K), columns=range(K), fill_value=0).values
        r_, c_ = linear_sum_assignment(-cm)
        fold.append(cm[r_, c_].sum() / len(te))
acc.append({"Need": "K-Means need groups", "Level": f"DS division ({len(X)})",
            "Compared with": "Held-out DS divisions (5-fold x 20)", "Accuracy": float(np.mean(fold))})
accuracy = pd.DataFrame(acc)
for _, a in accuracy.dropna(subset=["Accuracy"]).iterrows():
    add("ACCURACY", f"{SHORT.get(a.Need, a.Need)} - {a.Level} vs {a['Compared with']}", f"{a.Accuracy:.0%}", "")

add("Data", "DS divisions with own Census 2024 living data", f"{cen['DS'].notna().sum()}/{len(ds)}", "")
add("Data", "DS divisions with own 2012/13 poverty rate", f"{(ds.poverty_source == 'DS 2012/13').sum()}/{len(ds)}",
    "Rest (new DS divisions created after 2013) use district average")
metrics = pd.DataFrame(metrics)

# FoG gaps
gap = out.copy()
gap["FoG food packs (district)"] = gap["District"].map(fog["Food packs (as listed)"])
gap["FoG ESSP students (district)"] = gap["District"].map(fog["ESSP students"])
gap = gap[((gap["Living level"] == "High") & (gap["FoG food packs (district)"] < 500)) |
          ((gap["Education level"] == "High") & (gap["FoG ESSP students (district)"] < 150))].sort_values(f"{LIV} rank")

# ---------------------------------------------------------------- save


def free_name(path):
    try:
        open(path, "a").close(); return path
    except PermissionError:
        stem, ext = path.rsplit(".", 1); return f"{stem}_{time.strftime('%H%M%S')}.{ext}"


XLSX = free_name("Need_Model_Results_v2.xlsx")
district = pd.DataFrame({SHORT[LIV]: d_liv, SHORT[EDU]: d_edu,
                         "WFP food insecure %": wfp, "Poverty 2012/13 %": d_hci}).round(1)
with pd.ExcelWriter(XLSX) as xw:
    accuracy.round(3).to_excel(xw, sheet_name="Accuracy", index=False)
    metrics.to_excel(xw, sheet_name="Evaluation", index=False)
    out.sort_values(f"{LIV} rank").to_excel(xw, sheet_name="DS Need Scores", index=False)
    prof.reset_index().round(1).to_excel(xw, sheet_name="Need Groups", index=False)
    district.sort_values(SHORT[LIV], ascending=False).reset_index(names="District").to_excel(xw, sheet_name="District Scores", index=False)
    gap.to_excel(xw, sheet_name="Gaps vs FoG", index=False)
    k_eval.round(3).to_excel(xw, sheet_name="Choosing k", index=False)
print("Saved:", XLSX)

pd.set_option("display.width", 220, "display.max_colwidth", 80)
print("\nUnmatched census DS:", cen.loc[cen["DS"].isna(), ["District", "DS Division"]].values.tolist())
print("Unmatched 2012/13 DS:", pov.loc[pov["DS"].isna(), ["District", "DS Division"]].values.tolist())
print("\n", metrics.to_string(index=False))
print("\n", accuracy.round(3).to_string(index=False))
print("\n", prof.round(1).to_string())
print("\nLevels:\n", pd.DataFrame({SHORT[n]: out[f"{SHORT[n]} level"].value_counts() for n in NEEDS}))
for n in NEEDS:
    print(f"\nTop 8 {n}:\n", out.nsmallest(8, f"{n} rank")[["District", "DS Division", f"{n} score"]].to_string(index=False))
print("\nDistrict:\n", district.sort_values(SHORT[LIV], ascending=False).to_string())
