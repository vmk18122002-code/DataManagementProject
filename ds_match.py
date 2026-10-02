"""DS-name matching helpers (copied from need_model_v2.py so other scripts can import them)."""
import difflib
import re


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

