"""
Build DS-level living-standard deprivation (%) from Census of Population and Housing 2024
(Department of Census and Statistics, Housing_Tables.xlsx sheets A10-A16).

Deprived household / housing unit (following Sri Lanka MPI 2019 definitions as closely as the census allows):
  cooking_fuel  : firewood, kerosene, saw dust / paddy husk, other
  water         : unprotected well, spring, tank/river/stream, rain water, bowser, other
  sanitation    : shared toilet, common/public toilet, no toilet
  lighting      : kerosene lamp, other (no electricity or solar)
  housing       : wall of mud, cadjan/palmyrah, plank/metal sheet, zinc, other  -> averaged with
                  floor of mud, sand, other
Output: Census2024_DS_Living.xlsx
"""
import re
import pandas as pd

SRC = "Housing_Tables.xlsx"


def en_name(cell):
    """Last line of the tri-lingual cell is the English name."""
    s = str(cell).strip().split("\n")[-1].strip()
    return re.sub(r"\s+", " ", s)


def load(sheet, first_data_row):
    d = pd.read_excel(SRC, sheet_name=sheet, header=None)
    d = d.iloc[first_data_row:].copy()
    d = d[d[1].apply(lambda v: str(v).replace(".0", "").isdigit())]
    d["name"] = d[0].map(en_name)
    district = None
    rows = []
    for _, r in d.iterrows():
        n = r["name"]
        if "Sri Lanka" in n:
            continue
        m = re.search(r"([A-Za-z ]+?)\s+District", n)
        if m or "District" in n:
            district = (m.group(1) if m else n.replace("District", "")).strip()
            continue
        rows.append([district, n] + [pd.to_numeric(v, errors="coerce") for v in r.iloc[1:-1]])
    return pd.DataFrame(rows)


def share(df, cols, total_col=2):
    return df[cols].sum(axis=1) / df[total_col] * 100


out = {}
# A13 cooking: total, firewood, kerosene, gas, electricity, sawdust, biogas, other, not relevant
c = load("A13", 6); out["cooking_fuel"] = (c[[0, 1]], share(c, [3, 4, 7, 9]))
# A14 water: total, protected well, semi, unprotected, tube, spring, NWSDB, LA, CBO, private, tank/river, rain, bottled, RO, bowser, other
w = load("A14", 7); out["water"] = (w[[0, 1]], share(w, [5, 7, 12, 13, 16, 17]))
# A16 toilet: total, in-excl, in-shared, out-excl, out-shared, shared-other-unit, public, none
t = load("A16", 7); out["sanitation"] = (t[[0, 1]], share(t, [4, 6, 7, 8, 9]))
# A15 lighting: total, grid, kerosene, solar grid, solar alone, biogas, rural scheme, other
l = load("A15", 6); out["lighting"] = (l[[0, 1]], share(l, [4, 9]))
# A10 wall: total, brick, cement block, granite, cabook, pressed soil, mud, cadjan, plank/metal, zinc, other, n/r
wa = load("A10", 6); wall = share(wa, [8, 9, 10, 11, 12])
# A12 floor: total, cement, terrazzo/tile, concrete, mud, wood, sand, other, n/r
fl = load("A12", 6); floor = share(fl, [6, 8, 9])

base = out["cooking_fuel"][0].copy()
base.columns = ["District", "DS Division"]
res = base.copy()
res["Households 2024"] = c[2].values
for k, (names, val) in out.items():
    tmp = names.copy(); tmp.columns = ["District", "DS Division"]; tmp[k] = val.values
    res = res.merge(tmp, on=["District", "DS Division"], how="left")
hw = wa[[0, 1]].copy(); hw.columns = ["District", "DS Division"]; hw["wall"] = wall.values
hf = fl[[0, 1]].copy(); hf.columns = ["District", "DS Division"]; hf["floor"] = floor.values
res = res.merge(hw, on=["District", "DS Division"], how="left").merge(hf, on=["District", "DS Division"], how="left")
res["housing"] = res[["wall", "floor"]].mean(axis=1)
res = res.round(2)
print(res.shape, res["District"].nunique())
print(res.isna().sum().to_dict())
print(res.describe().round(1).to_string())
res.to_excel("Census2024_DS_Living.xlsx", index=False)
