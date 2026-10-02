"""
XGBoost need model - normal situation (no disaster).
Predicts Food & Clothes need and Books (education) need for every DS and GN division.

Why a real target is needed
  DEPRIVATION_INDEX is a formula of the census columns, so predicting it from those columns
  only re-learns the formula. Each model is instead trained on an outside measure of need:

  Food & Clothes : DS poverty headcount 2012/13 (DCS, consumption survey) - 331 DS divisions.
                   Trained at DS level, then applied to the 14,003 GN divisions (small area
                   estimation: GN level has no poverty figure of its own).
  Books          : % of O/L 2024 candidates not qualified for A/L (Department of Examinations),
                   25 districts, with education, school attendance, distance / travel to school
                   and school census features from Book_Need_Features_Sri_Lanka.xlsx.
                   Trained at district level; DS divisions get the district prediction scaled by
                   their 2012/13 poverty relative to the district.

Validation: GroupKFold by district (no district in both train and test), compared with Ridge.
Explanations: SHAP values from XGBoost's built-in pred_contribs.

Inputs : GN_Food_Clothes_Need_Index_2024.xlsx, DS_Poverty_2012_13.csv,
         MPI_Feature_Scores_by_District (3).xlsx, Food_Insecurity_2024_by_District.xlsx,
         Book_Need_Features_Sri_Lanka.xlsx
Output : XGB_Need_Model_Results.xlsx
"""
import numpy as np
import pandas as pd
import xgboost as xgb
from scipy.stats import spearmanr
from sklearn.linear_model import RidgeCV
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import GroupKFold, LeaveOneOut
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from ds_match import match

DISTRICT_FIX = {"Rathnapura": "Ratnapura", "Moneragala": "Monaragala", "Batticoloa": "Batticaloa",
                "Vavunia": "Vavuniya", "Anuradapura": "Anuradhapura"}
HIGH, MID = 80, 50  # percentile cut-offs: High = top 20%, Medium = next 30%
SRC = "GN_Food_Clothes_Need_Index_2024.xlsx"

CENSUS = ["pct_unsafe_water", "pct_firewood_cooking", "pct_no_electricity_light", "pct_no_own_toilet",
          "pct_poor_walls", "pct_poor_floor", "pct_poor_roof"]
FOOD_X = CENSUS + ["hh_per_gn", "wfp_food_insecure", "mpi_assets", "mpi_health_access"]
BOOK_SRC = "Book_Need_Features_Sri_Lanka.xlsx"
BOOK_Y = "TARGET_OL_not_qualified_pct_2024"
BOOK_X = ["f1_pop_no_school_pct", "f2_pop_upto_grade5_pct", "f3_pop_passed_OL_pct", "f4_head_no_school_pct",
          "f5_head_upto_grade5_pct", "f6_head_passed_OL_or_above_pct", "f7_attending_5_19_pct",
          "f8_dropout_5_19_pct", "f9_never_attended_5_14_pct", "f10_school_5km_plus_pct",
          "f11_walk_to_school_pct", "f13_pct_students_national_schools", "f14_students_per_teacher",
          "f15_students_per_school", "f16_mpi_poor_pct_2019", "f17_food_insecure_pct_2024",
          "f18_disaster_affected_per_1000_2020_26"]

XGB_PARAMS = dict(n_estimators=300, learning_rate=0.03, max_depth=3, min_child_weight=5,
                  subsample=0.8, colsample_bytree=0.8, reg_lambda=2.0, random_state=42)
XGB_SMALL = dict(n_estimators=150, learning_rate=0.05, max_depth=2, min_child_weight=2,
                 subsample=0.9, colsample_bytree=0.8, reg_lambda=5.0, random_state=42)


def level(pct):
    return np.where(pct >= HIGH, "High", np.where(pct >= MID, "Medium", "Low"))


def evaluate(name, X, y, groups, params, cv):
    """Out-of-fold predictions for XGBoost and Ridge; returns metric rows and OOF predictions."""
    oof = {"XGBoost": np.zeros(len(y)), "Ridge (baseline)": np.zeros(len(y))}
    for tr, te in cv.split(X, y, groups if isinstance(cv, GroupKFold) else None):
        m = xgb.XGBRegressor(**params).fit(X.iloc[tr], y.iloc[tr])
        oof["XGBoost"][te] = m.predict(X.iloc[te])
        r = make_pipeline(StandardScaler(), RidgeCV(alphas=np.logspace(-2, 3, 30))).fit(X.iloc[tr], y.iloc[tr])
        oof["Ridge (baseline)"][te] = r.predict(X.iloc[te])
    rows = []
    for model, p in oof.items():
        top_true, top_pred = y >= y.quantile(0.8), pd.Series(p, y.index) >= np.quantile(p, 0.8)
        rows += [
            {"Need": name, "Model": model, "Metric": "R2 (out-of-fold)", "Value": round(r2_score(y, p), 3)},
            {"Need": name, "Model": model, "Metric": "MAE (target units)", "Value": round(mean_absolute_error(y, p), 2)},
            {"Need": name, "Model": model, "Metric": "Spearman rank correlation", "Value": round(spearmanr(y, p)[0], 3)},
            {"Need": name, "Model": model, "Metric": "Top-20% hit rate (recall)",
             "Value": round((top_true & top_pred).sum() / top_true.sum(), 3)},
        ]
    return rows, oof["XGBoost"]


def shap_table(model, X, name):
    contrib = model.get_booster().predict(xgb.DMatrix(X), pred_contribs=True)[:, :-1]
    imp = pd.Series(np.abs(contrib).mean(0), X.columns).sort_values(ascending=False)
    return pd.DataFrame({"Need": name, "Feature": imp.index, "Mean |SHAP|": imp.round(3).values,
                         "Share %": (imp / imp.sum() * 100).round(1).values}), contrib


def top_reasons(contrib, cols, k=3):
    """The k features pushing each area's need up the most."""
    order = np.argsort(-contrib, axis=1)[:, :k]
    return [", ".join(cols[j] for j in row if contrib[i, j] > 0) for i, row in enumerate(order)]


# ---------------------------------------------------------------- load
gn = pd.read_excel(SRC, sheet_name="All GN Divisions")
dsr = pd.read_excel(SRC, sheet_name="DS Ranking")
dist = pd.read_excel(SRC, sheet_name="District Ranking")
for d_ in (gn, dsr, dist):
    d_["district"] = d_["district"].replace(DISTRICT_FIX)

mpi = pd.read_excel("MPI_Feature_Scores_by_District (3).xlsx", header=1)
mpi = mpi[pd.to_numeric(mpi["MPI poor (H %)"], errors="coerce").notna()].copy()
mpi = mpi[mpi["District"].astype(str).str.len() < 30]
for c in mpi.columns[1:]:
    mpi[c] = pd.to_numeric(mpi[c], errors="coerce")
mpi = mpi.set_index("District")
H = mpi["MPI poor (H %)"]
contrib_pct = lambda col: mpi[col] * H / 100  # share of MPI x headcount = % people deprived via that dimension

wfp = pd.read_excel("Food_Insecurity_2024_by_District.xlsx").iloc[:, :2].dropna()
wfp.columns = ["District", "FI"]
wfp = wfp.set_index("District")["FI"].astype(float) * 100

district_feats = pd.DataFrame({"wfp_food_insecure": wfp, "mpi_assets": contrib_pct("Assets"),
                               "mpi_health_access": contrib_pct("Access to Health Facilities")})

dsr["hh_per_gn"] = dsr["households"] / dsr["gn_divisions"]
dist["hh_per_gn"] = dist["households"] / dist["gn_divisions"]
gn["hh_per_gn"] = gn["households"]
for d_ in (gn, dsr, dist):
    for c in district_feats:
        d_[c] = d_["district"].map(district_feats[c])
missing = sorted(set(dist["district"]) - set(district_feats.dropna().index))
if missing:
    print("No MPI/WFP data for:", missing, "-> filled with national median")
for d_ in (gn, dsr, dist):
    d_[list(district_feats)] = d_[list(district_feats)].fillna(district_feats.median())

# DS poverty 2012/13 -> DS Ranking rows
pov = pd.read_csv("DS_Poverty_2012_13.csv")
pov["District"] = pov["District"].replace(DISTRICT_FIX)
tgt = dsr.rename(columns={"district": "District", "ds_division": "DS Division"})
pov["DS"] = match(pov, tgt)
pov = pov.dropna(subset=["DS"]).groupby(["District", "DS"], as_index=False)["HCI_2012_13"].mean()
dsr = dsr.merge(pov.rename(columns={"District": "district", "DS": "ds_division"}),
                on=["district", "ds_division"], how="left")
print(f"DS divisions with 2012/13 poverty target: {dsr['HCI_2012_13'].notna().sum()} / {len(dsr)}")

evals, importance = [], []

# ---------------------------------------------------------------- 1. Food & Clothes (DS -> GN)
FOOD = "Food & Clothes"
train = dsr.dropna(subset=["HCI_2012_13"]).reset_index(drop=True)
rows, oof = evaluate(FOOD, train[FOOD_X], train["HCI_2012_13"], train["district"], XGB_PARAMS, GroupKFold(5))
evals += rows
food_model = xgb.XGBRegressor(**XGB_PARAMS).fit(train[FOOD_X], train["HCI_2012_13"])
imp, _ = shap_table(food_model, train[FOOD_X], FOOD)
importance.append(imp)

# ---------------------------------------------------------------- 2. Books (district -> DS -> GN)
BOOK = "Books (Education)"
bf = pd.read_excel(BOOK_SRC, sheet_name="Model Features")
bf = bf.dropna(subset=[BOOK_Y]).reset_index(drop=True)
bf["District"] = bf["District"].replace(DISTRICT_FIX)
rows, book_oof = evaluate(BOOK, bf[BOOK_X], bf[BOOK_Y], bf["District"], XGB_SMALL, LeaveOneOut())
evals += rows
book_model = xgb.XGBRegressor(**XGB_SMALL).fit(bf[BOOK_X], bf[BOOK_Y])
imp, book_contrib = shap_table(book_model, bf[BOOK_X], BOOK)
importance.append(imp)

dist_books = bf[["District", "Province"]].copy()
dist_books["actual O/L not qualified %"] = bf[BOOK_Y]
dist_books["XGBoost pred % (out-of-fold)"] = book_oof.round(2)
dist_books["pred % (final model)"] = book_model.predict(bf[BOOK_X]).round(2)
dist_books["main reasons"] = top_reasons(book_contrib, BOOK_X)
dist_books["FoG ESSP students given"] = bf["f21_fog_essp_students_given"]
dist_books = dist_books.sort_values("pred % (final model)", ascending=False)

# Book features exist only per district, so DS divisions get the district prediction scaled by
# how much poorer the DS is than its district (2012/13 poverty), as in need_model_v2.py
w_ = dsr.dropna(subset=["HCI_2012_13"])
d_hci = (w_["HCI_2012_13"] * w_["households"]).groupby(w_["district"]).sum() / w_.groupby("district")["households"].sum()
poverty_factor = (dsr["HCI_2012_13"] / dsr["district"].map(d_hci)).clip(0.3, 3).fillna(1.0)
book_ds = dsr["district"].map(dist_books.set_index("District")["pred % (final model)"]) * poverty_factor


# ---------------------------------------------------------------- predict DS + GN
def add_need(out, name, unit, p, reasons):
    pct = pd.Series(p).rank(pct=True).values * 100
    out[f"{name} {unit}"] = np.round(p, 2)
    out[f"{name} percentile"] = pct.round(1)
    out[f"{name} level"] = level(pct)
    out[f"{name} main reasons"] = reasons


def predict_food(df, id_cols):
    out = df[id_cols].copy()
    c = food_model.get_booster().predict(xgb.DMatrix(df[FOOD_X]), pred_contribs=True)[:, :-1]
    add_need(out, FOOD, "pred poverty %", food_model.predict(df[FOOD_X]), top_reasons(c, FOOD_X))
    return out


book_reason = dist_books.set_index("District")["main reasons"]
ds_out = predict_food(dsr, ["province", "district", "ds_division", "gn_divisions", "households"])
ds_out.insert(5, "actual poverty 2012/13 %", dsr["HCI_2012_13"])
add_need(ds_out, BOOK, "need score", book_ds.values, dsr["district"].map(book_reason).values)
ds_out = ds_out.sort_values(f"{FOOD} percentile", ascending=False)

gn_out = predict_food(gn, ["province", "district", "ds_division", "gn_division", "gn_number", "gn_code",
                           "households", "small_gn_flag"])
book_cols = [c for c in ds_out.columns if c.startswith(BOOK)]
gn_out = gn_out.merge(ds_out[["district", "ds_division"] + book_cols], on=["district", "ds_division"], how="left")
gn_out = gn_out.sort_values(f"{FOOD} percentile", ascending=False)

notes = pd.DataFrame([
    ("Food & Clothes target", "DS poverty headcount 2012/13 (DCS). Trained on DS divisions, applied to GN divisions."),
    ("Books target", "% of O/L 2024 candidates not qualified for A/L, by district (Department of Examinations), "
                     f"from {BOOK_SRC}. 25 rows only."),
    ("Food features", ", ".join(FOOD_X)),
    ("Books features", ", ".join(BOOK_X)),
    ("Books features left out", "f20 O/L failed all (part of the same exam result as the target - leakage); "
                                "f21 FoG packs given (shows where FoG works, not need); "
                                "f12 students, f19 population (district size, not need)."),
    ("Books at DS / GN", "Book features exist only per district. DS score = district prediction x "
                         "(DS poverty 2012/13 / district poverty). GN divisions take their DS score."),
    ("Validation", "GroupKFold by district (Food) / leave-one-district-out (Books). "
                   "Ridge regression shown as baseline: XGBoost is only worth using if it beats it."),
    ("Levels", "High = top 20% of predicted need, Medium = next 30%, Low = bottom 50%."),
    ("Main reasons", "Top 3 features with the largest positive SHAP value for that area."),
    ("Limitations", "Poverty target is from 2012/13, features from Census 2024. GN predictions for "
                    "small GNs (small_gn_flag) are less reliable. District-level features are the same "
                    "for every GN in a district."),
], columns=["Item", "Explanation"])

with pd.ExcelWriter("XGB_Need_Model_Results.xlsx") as w:
    pd.DataFrame(evals).to_excel(w, sheet_name="Evaluation", index=False)
    pd.concat(importance).to_excel(w, sheet_name="Feature Importance (SHAP)", index=False)
    dist_books.to_excel(w, sheet_name="District Books", index=False)
    ds_out.to_excel(w, sheet_name="DS Predictions", index=False)
    gn_out.to_excel(w, sheet_name="GN Predictions", index=False)
    notes.to_excel(w, sheet_name="Notes", index=False)
food_model.save_model("xgb_food_clothes.json")
book_model.save_model("xgb_books.json")

print(pd.DataFrame(evals).pivot_table(index=["Need", "Metric"], columns="Model", values="Value").to_string())
print(pd.concat(importance).to_string(index=False))
print("\nDistrict books:")
print(dist_books.to_string(index=False))
print("\nTop 10 DS - Books:")
print(ds_out.sort_values(f"{BOOK} percentile", ascending=False).head(10)[
    ["district", "ds_division", f"{BOOK} need score"]].to_string(index=False))
print("\nSaved XGB_Need_Model_Results.xlsx, xgb_food_clothes.json, xgb_books.json")
