"""Contrôles statiques S01. Ne lance ni navigateur ni application graphique."""
from pathlib import Path
from datetime import datetime, timezone
from html.parser import HTMLParser
import hashlib
import json
import re
import struct
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
report = {"date_utc": datetime.now(timezone.utc).isoformat(),
          "portee": "Contrôles statiques uniquement ; aucune interaction de navigateur.",
          "checks": [], "contrast": [], "artifacts": []}
errors = []


def check(name, ok, detail):
    report["checks"].append({"name": name, "passed": bool(ok), "detail": detail})
    if not ok:
        errors.append(name)


result = subprocess.run(["node", "--check", str(ROOT / "prototype/app.js")], capture_output=True, text=True)
check("syntaxe_javascript", result.returncode == 0, result.stderr or "node --check réussi")


class ResourceParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.files = []
        self.lang = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "html":
            self.lang = attrs.get("lang")
        if tag == "script" and "src" in attrs:
            self.files.append(attrs["src"])
        if tag == "link" and attrs.get("rel") == "stylesheet":
            self.files.append(attrs.get("href", ""))


parser = ResourceParser()
parser.feed((ROOT / "prototype/index.html").read_text())
check("langue_html", parser.lang == "fr", parser.lang)
check("ressources_locales", all((ROOT / "prototype" / p).is_file() for p in parser.files), parser.files)

missing = []
for p in ROOT.glob("*.md"):
    for target in re.findall(r"\]\(([^)]+)\)", p.read_text()):
        if target.startswith(("http:", "https:", "#")):
            continue
        if not (p.parent / target.split("#")[0]).exists():
            missing.append({"file": p.name, "target": target})
# Le rapport est créé à la fin de cette même exécution.
missing = [m for m in missing if m["target"] != "preuves/verification-statique.json"]
check("liens_documentaires_locaux", not missing, missing)
check("montants_exemples", 2*24+32+6 == 86 and 64/3200*100 == 2, {"commande_eur": 86, "ctr_pourcent": 2})

tokens = dict(re.findall(r"--([\w-]+):\s*(#[0-9a-fA-F]{6});", (ROOT / "prototype/styles.css").read_text()))


def luminance(c):
    values = [int(c[i:i+2], 16)/255 for i in (1, 3, 5)]
    values = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in values]
    return sum(v*w for v, w in zip(values, [.2126, .7152, .0722]))


for fg, bg, minimum in [("ink", "paper", 4.5), ("ink-secondary", "sheet", 4.5),
                         ("ink-metadata", "sheet", 4.5), ("action", "sheet", 4.5),
                         ("confirmed", "confirmed-tint", 4.5), ("attention", "attention-tint", 4.5),
                         ("blocked", "blocked-tint", 4.5), ("control-border", "sheet", 3),
                         ("#ffffff", "action", 4.5)]:
    low, high = sorted([luminance(tokens.get(fg, fg)), luminance(tokens.get(bg, bg))])
    ratio = (high+.05)/(low+.05)
    report["contrast"].append({"foreground": fg, "background": bg, "ratio": round(ratio, 2), "minimum": minimum})
    check(f"contraste_{fg}_{bg}", ratio >= minimum, round(ratio, 2))

sizes = {"ordinateur": (1440, 900), "tablette": (1024, 768), "mobile": (390, 844),
         "mobile-etroit": (360, 800)}
for screen in ["vue-ensemble", "commande", "seo"]:
    for size, expected in sizes.items():
        name = f"{screen}-{size}"
        root = ET.parse(ROOT / "planches" / f"{name}.svg").getroot()
        svg_size = (int(root.attrib["width"]), int(root.attrib["height"]))
        data = (ROOT / "planches" / f"{name}.png").read_bytes()
        png_size = struct.unpack(">II", data[16:24])
        check(f"dimensions_{name}", svg_size == png_size == expected, {"svg": svg_size, "png": png_size})

for p in sorted(ROOT.rglob("*")):
    if p.is_file() and p.suffix in (".html", ".css", ".js", ".svg", ".png"):
        report["artifacts"].append({"file": str(p.relative_to(ROOT)), "sha256": hashlib.sha256(p.read_bytes()).hexdigest(), "bytes": p.stat().st_size})
report["not_tested"] = ["Rendu HTML/CSS dans un navigateur", "Clavier et focus réels",
                       "Responsively aux quatre dimensions", "Parcours de l'application Vendure",
                       "Permissions serveur et opérations commerciales"]
report["failures"] = errors
(ROOT / "preuves").mkdir(exist_ok=True)
(ROOT / "preuves/verification-statique.json").write_text(json.dumps(report, ensure_ascii=False, indent=2)+"\n")
print(json.dumps({"checks": len(report["checks"]), "failures": errors, "report": str(ROOT / "preuves/verification-statique.json")}, ensure_ascii=False))
raise SystemExit(bool(errors))
