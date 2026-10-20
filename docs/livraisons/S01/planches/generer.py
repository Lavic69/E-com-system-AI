"""Planches vectorielles de conception S01, sans moteur de navigateur.

Ces dessins reprennent les tokens CSS et les données de la conception.
Ce ne sont pas des captures du prototype ni une preuve de responsive.
"""
from pathlib import Path
from html import escape
import re
import textwrap

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(__file__).resolve().parent
TOKENS = dict(re.findall(r"--([\w-]+):\s*(#[0-9a-fA-F]{6});", (ROOT / "prototype/styles.css").read_text()))


class Board:
    def __init__(self, width, height, screen):
        self.w, self.h, self.screen = width, height, screen
        self.mobile = width < 768
        self.sidebar = width >= 1280
        self.x = 260 if self.sidebar else (16 if self.mobile else 28)
        self.cw = width - self.x - (16 if self.mobile else 36)
        self.parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{escape(screen)} : maquette statique, données de démonstration">',
                      '<style>text{font-family:Helvetica,Arial,sans-serif} .mono{font-family:Menlo,monospace}</style>']
        self.rect(0, 0, width, height, "paper")

    def col(self, c):
        return TOKENS.get(c, c)

    def rect(self, x, y, w, h, fill="sheet", stroke=None, radius=0):
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{self.col(fill)}"'+(f' stroke="{self.col(stroke)}"' if stroke else "")+'/>')

    def line(self, x1, y1, x2, y2, color="line"):
        self.rect(min(x1, x2), min(y1, y2), max(1, abs(x2-x1)), max(1, abs(y2-y1)), color)

    def text(self, x, y, text, size=14, color="ink", weight=400, maxw=None, line=1.5, mono=False):
        capacity = max(5, int(maxw / (size * .55))) if maxw else 500
        lines = textwrap.wrap(text, capacity, break_long_words=False, break_on_hyphens=False) or [""]
        for i, txt in enumerate(lines):
            self.parts.append(f'<text x="{x}" y="{y+i*size*line}" fill="{self.col(color)}" font-size="{size}" font-weight="{weight}"'+(' class="mono"' if mono else '')+f'>{escape(txt)}</text>')
        return y + len(lines) * size * line

    def button(self, x, y, label, w=None, primary=False):
        w = w or (len(label)*6.8+28)
        self.rect(x, y, w, 44, "action" if primary else "sheet", "action" if primary else "control-border", 6)
        self.text(x+14, y+27, label, 12, "#ffffff" if primary else "ink", 600)

    def badge(self, x, y, label, kind="neutral"):
        color, fill = {"neutral": ("ink-secondary", "control"), "blue": ("action", "action-tint"), "warning": ("attention", "attention-tint"), "success": ("confirmed", "confirmed-tint")}[kind]
        self.rect(x, y, len(label)*5.8+16, 24, fill, radius=4)
        self.text(x+8, y+16, label, 10, color, 600)

    def shell(self):
        self.rect(0, 0, self.w, 44 if not self.mobile else 52, "#eaece4")
        self.text(16 if self.mobile else 24, 26, "S01", 11, "ink", 600, mono=True)
        self.text(52 if self.mobile else 64, 26, "Données de démonstration" if self.mobile else "Maquette statique · Données de démonstration", 10, "ink-secondary")
        if not self.mobile:
            self.text(self.w-172, 26, "Examiner un état  ⌄", 11, "ink-secondary")
        top = 52 if self.mobile else 44
        sx = 224 if self.sidebar else 0
        self.line(sx, top+64, self.w, top+64)
        if not self.sidebar:
            for offset in (24, 30, 36):
                self.rect(self.x, top+offset, 16, 1, "ink-secondary")
        self.text(self.x+(36 if not self.sidebar else 0), top+38, self.screen, 11, "ink-secondary")
        if not self.mobile:
            self.text(self.w-160, top+38, "Belgique · FR · EUR", 11, "ink-secondary")
        if self.sidebar:
            self.line(224, top, 224, self.h)
            self.rect(20, 76, 36, 40, "#e9ece1", "line", 8)
            self.text(30, 104, "a.", 25, "ink", 600)
            self.text(68, 91, "Atelier Démo", 15, "ink", 600)
            self.text(68, 109, "Boutique de démonstration", 9, "ink-metadata")
            entries = [("Vue d'ensemble", 156), ("COMMERCE", 212), ("Commandes", 250), ("Catalogue", 294), ("Stocks", 338), ("BOUTIQUE", 394), ("Pages & contenus", 432), ("CROISSANCE", 488), ("SEO", 526), ("Campagnes", 570), ("Expériences", 614), ("PILOTAGE", 670), ("Analyses", 708), ("Réglages", 752)]
            active = "Vue d'ensemble" if self.screen == "Vue d'ensemble" else "Commandes" if self.screen == "Commande D-1042" else "SEO"
            for label, y in entries:
                if label == active:
                    self.rect(16, y-26, 192, 40, "#e5e9de", radius=6)
                self.text(28, y, label, 10 if label.isupper() else 13, "ink-metadata" if label.isupper() else "ink-secondary", 600 if label == active or label.isupper() else 400)
            self.text(28, self.h-48, "Environnement de démonstration", 9, "ink-metadata")
        self.y = top+100

    def heading(self, eyebrow, title, subtitle):
        x, w, y = self.x, self.cw, self.y
        self.text(x, y, eyebrow.upper(), 10, "ink-metadata", 600)
        y = self.text(x, y+36, title, 26 if self.mobile else 30, "ink", 600, w)
        y = self.text(x, y+4, subtitle, 12, "ink-secondary", maxw=w)
        return y+24

    def panel(self, x, y, w, h, title, right=None):
        self.rect(x, y, w, h, "sheet", "line", 8)
        self.text(x+20, y+32, title, 16, "ink", 600)
        if right:
            self.text(x+w-120, y+32, right, 10, "ink-metadata")
        self.line(x, y+56, x+w, y+56, "line-soft")
        return y+56

    def footer(self):
        self.rect(0, self.h-28, self.w, 28, "#eaece4")
        self.text(16, self.h-10, f"PLANCHE STATIQUE · {self.w} × {self.h} · Ce dessin n'est pas une capture d'application.", 8 if self.mobile else 10, "ink-secondary")

    def save(self, name):
        self.footer()
        self.parts.append("</svg>")
        p = OUT / name
        p.write_text("\n".join(self.parts), encoding="utf-8")
        return p


def overview(b):
    b.shell()
    x, w = b.x, b.cw
    y = b.heading("Mardi 20 octobre 2026", "À traiter aujourd'hui", "Deux blocages, une commande à préparer, une proposition à examiner.")
    rows = [
        ("Paiement à confirmer", "Réponse du prestataire attendue depuis 09 h 42.", "Commande D-1042", "86,00 € · Belgique", "Examiner →"),
        ("Stock indisponible", "Une commande attend cette variante.", "SAC-SABLE", "Disponibilité à vérifier", "Hors maquette"),
        ("Une commande prête à préparer", "Encaissement confirmé, articles disponibles.", "Commande D-1041", "Préparation non commencée", "Hors maquette"),
        ("Un titre de collection à préciser", "Une proposition SEO est prête à être examinée.", "Dossier SEO-018", "Version v12 → v13", "Comparer →"),
    ]
    if b.mobile:
        b.panel(x, y, w, 732, "Votre file de travail · 4")
        b.text(x+16, y+88, "Tout · 4    Blocages · 2    Propositions · 1", 11, "ink-secondary", 500)
        y += 112
        for i, (title, desc, obj, meta, act) in enumerate(rows):
            b.rect(x+16, y+4, 28, 28, "attention-tint" if i < 2 else "action-tint" if i == 3 else "control", radius=6)
            b.text(x+25, y+23, "!" if i < 2 else "›", 14, "attention" if i < 2 else "action", 600)
            yy = b.text(x+56, y+18, title, 13, "ink", 600, w-72)
            yy = b.text(x+56, yy+4, desc, 11, "ink-metadata", maxw=w-72)
            yy = b.text(x+56, yy+4, obj, 11, "ink", maxw=w-72)
            b.text(x+56, yy+4, act, 12, "action" if "→" in act else "ink-metadata", 600)
            y += 152
            b.line(x, y-12, x+w, y-12, "line-soft")
    else:
        b.panel(x, y, w, 360, "Votre file de travail · 4", "4 actions")
        for i, (title, desc, obj, meta, act) in enumerate(rows):
            yy = y+56+i*68
            b.rect(x+24, yy+16, 36, 36, "attention-tint" if i < 2 else "action-tint" if i == 3 else "control", radius=8)
            b.text(x+38, yy+40, "!" if i < 2 else "›", 18, "attention" if i < 2 else "action", 600)
            b.text(x+76, yy+28, title, 13, "ink", 600)
            b.text(x+76, yy+47, desc, 11, "ink-metadata")
            b.text(x+w-290, yy+28, obj, 11, "ink", mono=True)
            b.text(x+w-290, yy+47, meta, 10, "ink-metadata")
            b.text(x+w-112, yy+34, act, 11, "action" if "→" in act else "ink-metadata", 600)
            b.line(x, yy+68, x+w, yy+68, "line-soft")
        b.text(x+24, y+346, "Les blocages sont présentés en premier pour permettre le traitement des commandes.", 10, "ink-metadata")
        y += 384
        left = (w-24)*.54
        b.panel(x, y, left, 220, "Activité des agents")
        for i, (title, sub) in enumerate([("Audit de la collection terminé", "SEO-018 · Proposition à examiner"), ("Création en cours de génération", "Campagne de démonstration · Coût à confirmer"), ("Synchronisation en attente", "Catalogue de démonstration · Dernier relevé 09:00")]):
            b.rect(x+24, y+78+i*48, 6, 6, "confirmed" if i == 0 else "action" if i == 1 else "ink-metadata", radius=3)
            b.text(x+42, y+84+i*48, title, 12)
            b.text(x+42, y+102+i*48, sub, 10, "ink-metadata")
        xx = x+left+24
        ww = w-left-24
        b.panel(xx, y, ww, 220, "Encaissements", "13 → 19 oct.")
        b.text(xx+24, y+92, "Commandes encaissées", 11, "ink-secondary")
        b.text(xx+ww*.52, y+92, "Montant encaissé", 11, "ink-secondary")
        b.text(xx+24, y+136, "12", 30, "ink", 600)
        b.text(xx+ww*.52, y+136, "1 248,00 €", 28, "ink", 500)
        b.text(xx+24, y+176, "Paiements de démonstration · Relevé à 09 h 55", 10, "ink-metadata", maxw=ww-40)


def order(b):
    b.shell()
    x, w = b.x, b.cw
    y = b.heading("Commerce / Commandes", "Commande D-1042", "20 octobre, 09 h 42 · Client de démonstration · Total 86,00 € TTC")
    states = [("Paiement", "À confirmer", "Tentative de 86,00 € enregistrée"), ("Préparation", "Non commencée", "0 article préparé sur 3"), ("Livraison", "Non expédiée", "Aucune prise en charge confirmée")]
    sh = 192 if b.mobile else 104
    b.rect(x, y, w, sh, "sheet", "line", 8)
    for i, (label, value, desc) in enumerate(states):
        xx, yy = (x, y+i*64) if b.mobile else (x+i*w/3, y)
        if b.mobile:
            b.text(xx+16, yy+28, label.upper(), 9, "ink-metadata", 600)
            b.text(xx+120, yy+28, value, 13, "attention" if i == 0 else "ink", 600)
            b.text(xx+120, yy+47, desc, 9, "ink-metadata", maxw=w-132)
            if i:
                b.line(xx, yy, xx+w, yy, "line-soft")
        else:
            b.text(xx+24, yy+28, label.upper(), 10, "ink-metadata", 600)
            b.text(xx+24, yy+58, value, 16, "attention" if i == 0 else "ink", 600)
            b.text(xx+24, yy+82, desc, 11, "ink-metadata")
            if i:
                b.line(xx, yy, xx, yy+sh)
    y += sh+20
    nh = 176 if b.mobile else 100
    b.rect(x, y, w, nh, "attention-tint", "#e6d4b9", 8)
    b.text(x+20, y+28, "Vérifier le paiement avant de préparer", 13, "attention", 600, maxw=w-40)
    end = b.text(x+20, y+(64 if b.mobile else 52), "La tentative existe, mais son encaissement n'est pas confirmé.", 11, "attention", maxw=w-40 if b.mobile else w-260)
    b.button(x+20 if b.mobile else x+w-204, end+12 if b.mobile else y+28, "Vérifier le paiement", 184, True)
    y += nh+24
    mainw = w if b.mobile else w-312
    b.panel(x, y, mainw, 300, "Articles · 3")
    if b.mobile:
        b.text(x+16, y+86, "Tasse Atelier", 13, weight=600)
        b.text(x+16, y+106, "Craie · TAS-CRAIE", 10, "ink-metadata")
        for xx, label, value in [(x+16, "Quantité", "2"), (x+116, "Prix unitaire", "24,00 €"), (x+228, "Total", "48,00 €")]:
            b.text(xx, y+134, label, 9, "ink-metadata")
            b.text(xx, y+155, value, 12)
        b.line(x, y+176, x+w, y+176, "line-soft")
        b.text(x+16, y+206, "Plateau Atelier", 13, weight=600)
        b.text(x+16, y+226, "Petit · PLA-PETIT", 10, "ink-metadata")
    else:
        for i, (name, variant, qty, price, total) in enumerate([("Tasse Atelier", "Craie · TAS-CRAIE", "2", "24,00 €", "48,00 €"), ("Plateau Atelier", "Petit · PLA-PETIT", "1", "32,00 €", "32,00 €")]):
            yy = y+88+i*68
            b.text(x+24, yy, name, 13, weight=600)
            b.text(x+24, yy+20, variant, 10, "ink-metadata")
            b.text(x+mainw-240, yy, "Qté "+qty, 12)
            b.text(x+mainw-160, yy, price, 12)
            b.text(x+mainw-84, yy, total, 12)
            b.line(x, yy+40, x+mainw, yy+40, "line-soft")
        b.text(x+24, y+240, "Livraison standard", 12, "ink-secondary")
        b.text(x+mainw-84, y+240, "6,00 €", 12)
        b.text(x+24, y+278, "Total TTC", 15, weight=600)
        b.text(x+mainw-92, y+278, "86,00 €", 15, weight=600)
        xx = x+mainw+24
        b.panel(xx, y, 288, 300, "Client et destination")
        for i, (label, value) in enumerate([("CLIENT", "Client de démonstration"), ("ADRESSE", "Adresse de démonstration, Belgique"), ("MARCHÉ", "Belgique · Français · EUR")]):
            b.text(xx+24, y+86+i*68, label, 10, "ink-metadata")
            b.text(xx+24, y+108+i*68, value, 12, maxw=240)
        y += 324
        b.panel(x, y, w, 220, "Historique de la commande")
        b.text(x+24, y+88, "10:00   État toujours à vérifier", 12)
        b.text(x+24, y+126, "09:43   Confirmation du paiement absente", 12)
        b.text(x+24, y+164, "09:42   Tentative PAI-DEMO-1042 enregistrée · 86,00 €", 12)


def seo(b, comparison_only=False):
    b.shell()
    x, w = b.x, b.cw
    y = b.heading("Croissance / SEO / SEO-018", "Préciser le titre de la collection", "Tasses en céramique · Belgique · Français · Version v12")
    b.text(x, y, "01 Sources    02 Proposition    03 Contrôles" if b.mobile else "01 Sources        02 Proposition        03 Contrôles        04 Décision        05 Résultat", 11, "ink-secondary")
    y += 24
    mw = w if b.mobile else w-304
    if not comparison_only:
        h = 400 if b.mobile else 328
        b.panel(x, y, mw, h, "01 / Sources")
        entries = [
            ("Catalogue de la boutique", "8 produits de type tasse en céramique.", "20 octobre, 09 h 00 · Données de démonstration"),
            ("Search Console", "3 200 impressions · 64 clics · CTR 2,0 %", "22 sept. → 19 oct. · Relevé le 20 oct. à 09 h 10"),
            ("Lecture de la page · v12", "Titre actuel : « Notre collection ».", "20 octobre, 09 h 12"),
            ("DataForSEO · Non connecté", "Aucun volume ni score disponible.", "Cette source n'a pas été utilisée."),
        ]
        step = 84 if b.mobile else 64
        for i, (label, content, meta) in enumerate(entries):
            yy = y+82+i*step
            b.text(x+20, yy, label, 12, weight=600, maxw=mw-40)
            b.text(x+20, yy+22, content, 11, "ink-secondary", maxw=mw-40)
            b.text(x+20, yy+(56 if b.mobile and i == 1 else 40), meta, 9, "ink-metadata", maxw=mw-40)
        if not b.mobile:
            xx = x+mw+24
            b.panel(xx, y, 280, 332, "04 / Décision")
            b.badge(xx+20, y+76, "Validation requise", "blue")
            b.text(xx+20, y+128, "Une page, deux champs.", 12)
            b.text(xx+20, y+149, "v13 proposée sur la base de v12", 11, "ink-secondary")
            for i, (label, value) in enumerate([("Coût connu", "0,08 €"), ("Montant réservé", "0,12 €"), ("Plafond de l'action", "1,00 €")]):
                b.text(xx+20, y+184+i*28, label, 11, "ink-secondary")
                b.text(xx+208, y+184+i*28, value, 11, weight=600)
            b.button(xx+20, y+266, "Examiner la validation", 240, True)
            b.text(xx+20, y+354, "Coûts fictifs. Approuver ne publie rien.", 10, "ink-metadata", maxw=240)
        y += h+24
    else:
        b.badge(x, y, "Vue de la section Proposition", "blue")
        y += 44
    ph = 396 if b.mobile else 260
    b.panel(x, y, mw, ph, "02 / Proposition")
    pw = mw-32 if b.mobile else (mw-48)/2
    for i, (label, version, title, desc) in enumerate([("Actuel", "v12", "Notre collection", "Découvrez notre collection."), ("Proposé", "v13", "Tasses en céramique · Atelier Démo", "Découvrez les tasses en céramique Atelier Démo, leurs formats et les coloris disponibles.")]):
        xx = x+16 if b.mobile else x+16+i*(pw+16)
        yy = y+72+i*152 if b.mobile else y+72
        b.rect(xx, yy, pw, 144 if b.mobile and i == 0 else 168 if b.mobile else 168, "paper" if i == 0 else "action-tint", "line", 6)
        b.text(xx+16, yy+24, f"{label} · {version}", 11, weight=600)
        end = b.text(xx+16, yy+56, title, 14, weight=600, maxw=pw-32)
        b.text(xx+16, end+12, desc, 11, "ink-secondary", maxw=pw-32)
    if b.mobile and comparison_only:
        y += ph+24
        b.rect(x, y, w, 116, "sheet", "line", 8)
        b.text(x+16, y+28, "Résultat · Non appliquée", 13, weight=600)
        b.text(x+16, y+54, "Aucun résultat mesuré. L'observation commence après publication confirmée.", 11, "ink-secondary", maxw=w-32)


if __name__ == "__main__":
    for width, height, label in [(1440, 900, "ordinateur"), (1024, 768, "tablette"), (390, 844, "mobile"), (360, 800, "mobile-etroit")]:
        for key, title, draw in [("vue-ensemble", "Vue d'ensemble", overview), ("commande", "Commande D-1042", order), ("seo", "Dossier SEO-018", seo)]:
            board = Board(width, height, title)
            draw(board)
            print(board.save(f"{key}-{label}.svg").name)
    board = Board(390, 1000, "Dossier SEO-018")
    seo(board, comparison_only=True)
    print(board.save("seo-comparaison-mobile.svg").name)
