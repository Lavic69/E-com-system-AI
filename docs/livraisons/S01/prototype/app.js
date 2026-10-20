/* Prototype de conception S01. Données fixes, aucune requête métier. */
"use strict";

const paths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  orders: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 5V3h8v2M8 10h8M8 14h5"/>',
  box: '<path d="m3 7 9-4 9 4v10l-9 4-9-4Zm0 0 9 4 9-4M12 11v10M7.5 5l9 4"/>',
  layers: '<path d="m3 7 9-4 9 4-9 4Zm0 5 9 4 9-4M3 17l9 4 9-4"/>',
  page: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M8 13h8M8 17h6"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  chart: '<path d="M4 3v17h17M8 15v-4M13 15V7M18 15V4"/>',
  flag: '<path d="M4 22V3m0 0c5-4 10 4 16 0v10c-6 4-11-4-16 0"/>',
  flask: '<path d="M9 3h6M10 3v7L4 19a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2l-6-9V3M7 16h10"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  alert: '<path d="m12 3 10 18H2ZM12 9v4M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  circleCheck: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  refresh: '<path d="M20 7a9 9 0 0 0-15 0L3 10m0-6v6h6M4 17a9 9 0 0 0 15 0l2-3m0 6v-6h-6"/>',
  card: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 9h20M6 15h3"/>',
  truck: '<path d="M1 4h13v13H1ZM14 8h4l4 4v5h-8"/><circle cx="5" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  trace: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 12h2m3 0h3M8 17h8"/>',
  chat: '<path d="M21 11a9 9 0 0 1-9 9 9 9 0 0 1-4-1l-6 3 2-6a9 9 0 1 1 17-5Z"/><path d="M8 9h8M8 13h5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};
function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.info}</svg>`;
}

const screens = {
  overview: { title: "Vue d'ensemble", breadcrumb: "Vue d'ensemble" },
  order: { title: "Commande D-1042", breadcrumb: '<a href="#overview">Vue d’ensemble</a><span class="breadcrumb-separator">/</span>Commande D-1042' },
  seo: { title: "Dossier SEO-018", breadcrumb: '<a href="#overview">Vue d’ensemble</a><span class="breadcrumb-separator">/</span>SEO-018' },
};
const states = {
  normal: ["État nominal", "Données de l'exemple"],
  loading: ["Chargement", "Aucune valeur inventée"],
  empty: ["Données absentes", "Une suite adaptée au contexte"],
  denied: ["Accès refusé", "Données de l'objet masquées"],
  error: ["Erreur récupérable", "Une action pour réessayer"],
  long: ["Opération longue", "Suivi consultable après départ"],
  uncertain: ["Résultat incertain", "Vérifier avant de relancer"],
  conflict: ["Conflit", "Version ou expérience active"],
  disconnected: ["Compte non connecté", "Une source manque"],
  stale: ["Données anciennes", "Dernière collecte visible"],
  quota: ["Quota atteint", "Aucune nouvelle collecte"],
};
let route = Object.hasOwn(screens, location.hash.slice(1)) ? location.hash.slice(1) : "overview";
let scenario = new URLSearchParams(location.search).get("state") || "normal";
if (!Object.hasOwn(states, scenario)) scenario = "normal";
let filter = "all";
let approved = false;
let modalTrigger = null;
const main = document.getElementById("main");
const modal = document.getElementById("modal");
const navigationDialog = document.getElementById("navigation-dialog");
document.getElementById("menu-button").innerHTML = icon("menu");

function nav() {
  const link = (target, label, symbol) => `<li><a class="nav-link" href="#${target}" ${route === target ? 'aria-current="page"' : ""}>${icon(symbol)}${label}</a></li>`;
  const item = (label, symbol) => `<li><span class="nav-static" aria-disabled="true">${icon(symbol)}${label}<span class="nav-note">aperçu</span></span></li>`;
  return `<nav aria-label="Activités"><ul class="nav-list">
    ${link("overview", "Vue d'ensemble", "home")}
    <li class="nav-heading">Commerce</li>${link("order", "Commandes", "orders")}${item("Catalogue", "box")}${item("Stocks", "layers")}
    <li class="nav-heading">Boutique</li>${item("Pages & contenus", "page")}
    <li class="nav-heading">Croissance</li>${link("seo", "SEO", "search")}${item("Campagnes", "flag")}${item("Expériences", "flask")}
    <li class="nav-heading">Pilotage</li>${item("Analyses", "chart")}${item("Réglages", "settings")}
    </ul><p class="nav-subtle-note">Les entrées « aperçu » sont hors maquette.</p></nav>`;
}
function badge(text, kind = "") {
  return `<span class="badge ${kind}">${text}</span>`;
}
function button(text, action, style = "", symbol = "") {
  return `<button type="button" class="button ${style}" data-action="${action}">${symbol ? icon(symbol) : ""}${text}</button>`;
}
function pageHeading(eyebrow, title, subtitle, aside = "") {
  return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1 id="page-title" tabindex="-1">${title}</h1><p class="subtitle">${subtitle}</p></div>${aside ? `<div class="heading-side">${aside}</div>` : ""}</div>`;
}
function notice(title, text, kind = "", action = "") {
  return `<section class="notice ${kind}" aria-label="${title}">${icon(kind === "info" ? "info" : "alert")}<div class="notice-content"><h2>${title}</h2><p>${text}</p></div>${action}</section>`;
}
function assistantLink() {
  return `<div class="trace-strip">${icon("chat")}<span>L'assistant travaille dans le contexte de cet écran.</span><button type="button" class="inline-link" data-action="assistant">Ouvrir l'assistant ${icon("arrow")}</button></div>`;
}

// File de travail : des exceptions identifiables, suivies des propositions.
function overview() {
  const rows = [
    { type: "block", symbol: "card", color: "warning", title: "Paiement à confirmer", desc: "La réponse du prestataire est attendue depuis 09 h 42.", object: "Commande D-1042", meta: "86,00 € · Belgique", action: '<a class="inline-link" id="open-order" href="#order" aria-label="Examiner la commande D-1042">Examiner '+icon("arrow")+"</a>" },
    { type: "block", symbol: "box", color: "warning", title: "Stock indisponible", desc: "Une commande attend cette variante.", object: "SAC-SABLE", meta: "Disponibilité à vérifier", action: '<span class="outside">Hors maquette</span>' },
    { type: "task", symbol: "orders", color: "", title: "Une commande prête à préparer", desc: "Encaissement confirmé, articles disponibles.", object: "Commande D-1041", meta: "Préparation non commencée", action: '<span class="outside">Hors maquette</span>' },
    { type: "proposal", symbol: "search", color: "blue", title: "Un titre de collection à préciser", desc: "Une proposition SEO est prête à être examinée.", object: "Dossier SEO-018", meta: "Version v12 → v13", action: '<a class="inline-link" id="open-seo" href="#seo" aria-label="Comparer la proposition SEO-018">Comparer '+icon("arrow")+"</a>" },
  ];
  const selected = rows.filter(row => filter === "all" || (filter === "blocks" ? row.type === "block" : row.type === "proposal"));
  return pageHeading("Mardi 20 octobre 2026", "À traiter aujourd'hui", "Deux blocages, une commande à préparer, une proposition à examiner.", badge("2 blocages", "warning")) + `
    <section class="panel" aria-labelledby="queue-title"><div class="panel-head"><h2 id="queue-title">Votre file de travail <span class="count">${selected.length}</span></h2>
      <div class="filter-group" role="group" aria-label="Filtrer les actions">${[["all", "Tout", 4], ["blocks", "Blocages", 2], ["proposals", "Propositions", 1]].map(([key, label, count]) => `<button type="button" class="filter" id="filter-${key}" data-filter="${key}" aria-pressed="${filter === key}">${label} · ${count}</button>`).join("")}</div></div>
      <ul class="work-list">${selected.map(row => `<li class="work-row"><span class="row-symbol ${row.color}">${icon(row.symbol)}</span><div><p class="row-title">${row.title}</p><p class="row-description">${row.desc}</p></div><div class="row-object"><span class="mono">${row.object}</span><span class="metadata">${row.meta}</span></div><div class="row-action">${row.action}</div></li>`).join("")}</ul>
      <div class="panel-note">${icon("info")}Les blocages sont présentés en premier parce qu'ils empêchent le traitement d'une commande.</div>
    </section>
    <div class="overview-bottom">
      <section class="panel" aria-labelledby="agents-title"><div class="panel-head"><h2 id="agents-title">Activité des agents</h2>${badge("3 suivis")}</div>
        <ul class="activity-list">
          <li class="activity-item"><span class="activity-dot success"></span><div>Audit de la collection terminé<span class="metadata">SEO-018 · Proposition à examiner</span></div><time class="activity-time">09:30</time></li>
          <li class="activity-item"><span class="activity-dot running"></span><div>Création en cours de génération<span class="metadata">Campagne de démonstration · Coût à confirmer</span></div><time class="activity-time">09:48</time></li>
          <li class="activity-item"><span class="activity-dot"></span><div>Synchronisation en attente<span class="metadata">Catalogue de démonstration · Dernier relevé 09:00</span></div><time class="activity-time">09:52</time></li>
        </ul>
      </section>
      <section class="panel" aria-labelledby="sales-title"><div class="panel-head"><h2 id="sales-title">Encaissements</h2><span class="metadata">13 → 19 oct.</span></div>
        <dl class="metrics"><div class="metric"><dt>Commandes encaissées</dt><dd>12</dd></div><div class="metric"><dt>Montant encaissé</dt><dd>1 248<small>,00 €</small></dd></div></dl>
        <p class="metrics-note">Source : paiements de démonstration.<br>Relevé le 20 octobre à 09 h 55. Aucun effet attribué aux agents.</p>
      </section>
    </div>${assistantLink()}`;
}

// Commande : paiement, préparation et livraison restent trois informations.
function order() {
  return pageHeading("Commerce / Commandes", "Commande D-1042", "20 octobre 2026, 09 h 42 · Client de démonstration", '<span class="heading-amount">86,00 €</span><span class="metadata">Total TTC · EUR</span>') + `
    <div class="state-triad" aria-label="États de la commande">
      <section class="state-cell"><h2 class="label">${icon("card")}Paiement</h2><div class="state-value attention">${icon("clock")}À confirmer</div><p>Tentative de 86,00 € enregistrée</p></section>
      <section class="state-cell"><h2 class="label">${icon("box")}Préparation</h2><div class="state-value">Non commencée</div><p>0 article préparé sur 3</p></section>
      <section class="state-cell"><h2 class="label">${icon("truck")}Livraison</h2><div class="state-value">Non expédiée</div><p>Aucune prise en charge confirmée</p></section>
    </div>
    ${notice("Vérifier le paiement avant de préparer", "La tentative existe, mais son encaissement n'est pas confirmé. Consultez son état avant toute nouvelle opération.", "", scenario === "long" ? '<button type="button" class="button primary" disabled>Vérification en cours</button>' : button("Vérifier le paiement", "payment", "primary", "refresh"))}
    <div class="detail-grid"><div class="stack">
      <section class="panel" aria-labelledby="items-title"><div class="panel-head"><h2 id="items-title">Articles <span class="count">3</span></h2><span class="metadata">Prix TTC</span></div>
        <table class="order-table"><caption class="sr-only">Articles de la commande D-1042, données de démonstration</caption><thead><tr><th scope="col">Article</th><th scope="col">Qté</th><th scope="col">Prix unitaire</th><th scope="col">Total</th></tr></thead><tbody>
          <tr><td><span class="item-title">Tasse Atelier</span><small>Craie · <span class="mono">TAS-CRAIE</span></small></td><td data-label="Quantité">2</td><td data-label="Prix unitaire">24,00 €</td><td data-label="Total">48,00 €</td></tr>
          <tr><td><span class="item-title">Plateau Atelier</span><small>Petit · <span class="mono">PLA-PETIT</span></small></td><td data-label="Quantité">1</td><td data-label="Prix unitaire">32,00 €</td><td data-label="Total">32,00 €</td></tr>
        </tbody></table>
        <dl class="order-totals"><dt>Sous-total des articles</dt><dd>80,00 €</dd><dt>Livraison standard</dt><dd>6,00 €</dd><dt class="total">Total TTC</dt><dd class="total">86,00 €</dd></dl>
        <div class="panel-note">${icon("info")}Montants de démonstration. L'application utilisera les montants calculés par le moteur commercial.</div>
      </section>
      <section class="panel" aria-labelledby="history-title"><div class="panel-head"><h2 id="history-title">Historique de la commande</h2><span class="metadata">20 octobre</span></div>
        <ol class="history">
          <li><time>10:00</time><span class="history-mark"></span><div>État toujours à vérifier<p>La commande reste en attente de confirmation.</p></div></li>
          <li><time>09:43</time><span class="history-mark"></span><div>Confirmation du paiement absente<p>Aucune conclusion sur l'encaissement.</p></div></li>
          <li><time>09:42</time><span class="history-mark"></span><div>Tentative de paiement enregistrée<p><span class="mono">PAI-DEMO-1042</span> · 86,00 €</p></div></li>
        </ol>
        <div class="quiet-section"><h3>Retours et remboursements</h3><p>Aucun retour ni remboursement enregistré dans cet exemple.</p></div>
      </section>
    </div><aside class="stack" aria-label="Informations complémentaires">
      <section class="panel"><div class="panel-head"><h2>Client et destination</h2></div><div class="panel-body"><dl class="definition-list"><dt>Client</dt><dd>Client de démonstration</dd><dt>Adresse de livraison</dt><dd>Adresse de démonstration<br>Belgique</dd><dt>Marché</dt><dd>Belgique · Français · EUR</dd><dt class="separate">Livraison</dt><dd>Standard · 6,00 €</dd></dl></div></section>
      <section class="panel"><div class="panel-head"><h2>Suivi du paiement</h2></div><div class="panel-body"><dl class="definition-list"><dt>Référence de la tentative</dt><dd class="mono">PAI-DEMO-1042</dd><dt>Dernière mise à jour</dt><dd>20 octobre, 10 h 00</dd><dt>Résultat</dt><dd>Non confirmé</dd></dl><button class="inline-link" type="button" data-action="payment-trace">Consulter le dossier ${icon("arrow")}</button></div></section>
    </aside></div>${assistantLink()}`;
}

// Le dossier SEO relie la preuve, le changement, la décision et son résultat.
function seo() {
  const conflict = scenario === "conflict";
  const uncertain = scenario === "uncertain";
  const decisionBlocked = conflict || ["stale", "long", "uncertain"].includes(scenario);
  const blockingReason = conflict ? "Conflit avec EXP-007. L’expérience doit être examinée avant de poursuivre." : scenario === "stale" ? "Actualiser les sources avant de décider." : scenario === "uncertain" ? "Vérifier l'application existante avant toute nouvelle action." : "Attendre le résultat des contrôles en cours.";
  const status = conflict ? badge("Modification bloquée", "danger") : approved ? badge("Approuvée · Démonstration", "success") : badge("À examiner", "blue");
  return pageHeading("Croissance / SEO / Dossier SEO-018", "Préciser le titre de la collection", "Tasses en céramique · Belgique · Français · Version courante v12", status) + `
    <nav class="section-nav" aria-label="Sections du dossier">${[["sources", "Sources"], ["proposal", "Proposition"], ["checks", "Contrôles"], ["decision", "Décision"], ["result", "Résultat"]].map(([id, label], i) => `<a href="#${id}" data-section="${id}"><span class="step-number">0${i + 1}</span>${label}</a>`).join("")}</nav>
    <div class="seo-grid"><div class="stack">
      <section class="panel section-target" id="sources" tabindex="-1" aria-labelledby="sources-title"><div class="panel-head"><h2 id="sources-title">01 <span class="muted">/</span> Sources</h2><span class="metadata">Relevé du 20 octobre</span></div>
        <p class="seo-intro">Le titre « Notre collection » décrit peu le contenu. La proposition s'appuie sur les produits et la page existante.</p>
        <div class="source-list">
          <div class="source-row"><div class="source-title"><span>Catalogue de la boutique</span>${badge("Vérifié", "success")}</div><p>8 produits de type tasse en céramique.</p><span class="metadata">Jeu de démonstration · 20 octobre, 09 h 00</span></div>
          <div class="source-row"><div class="source-title"><span>Search Console</span><button type="button" class="inline-link" data-action="source">Voir le relevé ${icon("arrow")}</button></div><p><strong>3 200</strong> impressions · <strong>64</strong> clics · <strong>2,0 %</strong> de CTR</p><span class="metadata">22 sept. → 19 oct. · Collecté le 20 oct. à 09 h 10 · Données fictives</span></div>
          <div class="source-row"><div class="source-title"><span>Lecture de la page</span><span class="mono metadata">v12</span></div><p>Titre relevé : « Notre collection ».</p><span class="metadata">20 octobre, 09 h 12 · Version de démonstration</span></div>
          <div class="source-row"><div class="source-title"><span>DataForSEO</span>${badge("Non connecté")}</div><p>Aucun volume ni score disponible. Cette source n'a pas été utilisée.</p></div>
        </div>
      </section>
      <section class="panel section-target" id="proposal" tabindex="-1" aria-labelledby="proposal-title"><div class="panel-head"><h2 id="proposal-title">02 <span class="muted">/</span> Proposition</h2><span class="metadata">2 champs modifiés</span></div>
        <div class="comparison">
          <div class="comparison-side"><div class="comparison-label"><span>Actuel</span><span class="mono">v12</span></div><p class="field-label">Titre SEO</p><p class="comparison-copy">Notre collection</p><p class="field-label">Description SEO</p><p class="comparison-description">Découvrez notre collection.</p></div>
          <div class="comparison-side proposed"><div class="comparison-label"><span>Proposé</span><span class="mono">v13</span></div><p class="field-label">Titre SEO</p><p class="comparison-copy">Tasses en céramique · Atelier Démo</p><p class="field-label">Description SEO</p><p class="comparison-description">Découvrez les tasses en céramique Atelier Démo, leurs formats et les coloris disponibles.</p><span class="change-tag">${icon("plus")}Texte de remplacement</span></div>
        </div>
        <div class="panel-note">${icon("lock")}URL, prix et stock inchangés. L'affichage réel dans Google n'est pas garanti.</div>
      </section>
      <section class="panel section-target" id="checks" tabindex="-1" aria-labelledby="checks-title"><div class="panel-head"><h2 id="checks-title">03 <span class="muted">/</span> Contrôles</h2>${badge(conflict ? "1 conflit" : "À revérifier à l'application", conflict ? "danger" : "")}</div>
        <ul class="controls-list">
          <li>${icon("circleCheck")}<div>La proposition cible la version v12<p>La version devra être vérifiée à nouveau lors de l'application.</p></div></li>
          <li>${conflict ? '<span class="conflict-icon">'+icon("alert")+"</span>" : icon("circleCheck")}<div>${conflict ? "EXP-007 utilise le titre de cette collection" : "Aucune expérience active sur ces champs"}<p>${conflict ? "Modification bloquée. Examiner l'expérience avant de préparer une nouvelle proposition." : "Contrôle fictif de l'instantané du 20 octobre, 09 h 20."}</p></div></li>
          <li>${icon("circleCheck")}<div>Les caractéristiques viennent du catalogue<p>Aucune promesse commerciale ajoutée.</p></div></li>
        </ul>
      </section>
    </div>
    <aside class="panel decision-panel section-target" id="decision" tabindex="-1" aria-labelledby="decision-title"><div class="panel-head"><h2 id="decision-title">04 / Décision</h2>${icon("trace")}</div><div class="panel-body">
      ${badge("Validation requise", "blue")}<p class="decision-context">Une page, deux champs.<br>Proposition <span class="mono">v13</span> basée sur <span class="mono">v12</span>.</p>
      <dl class="budget"><div><dt>Coût connu</dt><dd>0,08 €</dd></div><div><dt>Montant réservé</dt><dd>0,12 €</dd></div><div class="limit"><dt>Plafond de l'action</dt><dd>1,00 €</dd></div></dl>
      ${decisionBlocked ? '<button type="button" class="button primary" disabled>Validation indisponible</button><p class="decision-disclaimer">'+blockingReason+'</p>' : approved ? '<div class="notice info" style="padding:12px;margin-bottom:0"><div class="notice-content"><h3>Proposition approuvée</h3><p>État de démonstration. Aucune application ni publication.</p></div></div>' : button("Examiner la validation", "approve", "primary")}
      <p class="decision-disclaimer">Coûts fictifs. L'approbation ne vaut ni application ni publication.</p>
      <button type="button" class="inline-link" data-action="assistant">Examiner avec l'assistant ${icon("arrow")}</button>
    </div></aside>
      <section class="panel section-target" id="result" tabindex="-1" aria-labelledby="result-title"><div class="panel-head"><h2 id="result-title">05 <span class="muted">/</span> Résultat</h2>${badge(uncertain ? "Application à vérifier" : "Non appliquée", uncertain ? "warning" : "")}</div>
        <div class="result-summary">${icon("chart")}<div><h3>${uncertain ? "Résultat de l'application inconnu" : "Aucun résultat mesuré"}</h3><p>${uncertain ? "Vérifier l'opération existante. Son absence de confirmation ne justifie pas une nouvelle application." : "La proposition n'est pas appliquée. L'observation pourra commencer après publication confirmée."}</p><p style="margin-top:12px">Période proposée : 28 jours. Une évolution observée ne prouvera pas, à elle seule, l'effet de cette modification.</p></div></div>
      </section>
    </div>`;
}

function stateView() {
  if (scenario === "normal") return "";
  const reset = button("Revenir à l'état nominal", "reset-state", "subtle");
  const full = (symbol, title, text, extra = "") => `<section class="empty-state"><span class="state-symbol">${icon(symbol)}</span><h2>${title}</h2><p>${text}</p>${extra}${reset}</section>`;
  if (scenario === "loading") return full("clock", "Chargement des données…", "Les informations de cet écran sont en cours de récupération. Aucun montant ni compteur ne peut encore être affiché.", '<div class="loading-lines" aria-hidden="true"><span></span><span></span><span></span></div>');
  if (scenario === "denied") return full("lock", "Vous n'avez pas accès à cet objet", "Les données ne sont pas affichées. Un membre habilité peut examiner votre accès. La navigation reste disponible.");
  if (scenario === "empty") {
    const texts = {
      overview: ["Votre boutique n'a pas encore de commandes", "Vérifiez le catalogue, les prix et le moyen de paiement en mode test, puis préparez une commande de test."],
      order: ["Commande introuvable", "Cette commande n'est pas disponible dans le contexte de boutique courant. Revenez à la vue d'ensemble pour retrouver vos objets."],
      seo: ["Aucune proposition disponible", "Un audit doit d'abord identifier une page et des sources suffisantes. Aucune métrique égale à zéro n'est déduite de cette absence."],
    };
    return full("box", ...texts[route]);
  }
  if (scenario === "error") return full("alert", "Les données n'ont pas pu être chargées", "La tentative a échoué. Vous pouvez réessayer sans lancer d'opération commerciale. Les autres écrans restent accessibles.", button("Réessayer", "retry", "primary", "refresh"));
  if (scenario === "long") return notice("Opération en cours", route === "order" ? "Vérification de PAI-DEMO-1042 en cours. Dernière mise à jour à 10 h 00. Vous pouvez quitter cet écran et retrouver le suivi." : "Vérification des sources en cours. Dernière mise à jour à 10 h 00. La durée restante n'est pas connue ; vous pouvez quitter cet écran.", "info", button("Consulter le suivi", "progress", "subtle"));
  if (scenario === "uncertain") return notice("Résultat toujours incertain", route === "order" ? "La consultation de PAI-DEMO-1042 n'a pas permis de confirmer l'encaissement. Aucun nouveau débit ne doit être lancé sur cette seule base." : "L'opération n'a pas retourné de confirmation. Conservez sa référence et vérifiez son état avant d'envisager une relance.", "", button("Vérifier l'état", "progress", "subtle", "refresh"));
  if (scenario === "conflict") return notice(route === "seo" ? "Une expérience protège ce titre" : "L'objet a changé pendant votre examen", route === "seo" ? "EXP-007 utilise le titre de la collection. La proposition reste consultable, mais sa validation est bloquée." : "Une version plus récente est disponible. Actualisez les données et relisez le récapitulatif avant de confirmer.", "danger");
  if (scenario === "disconnected") return notice("Compte DataForSEO non connecté", "Aucune collecte n'est disponible pour cette source. Le catalogue et les sources déjà recueillies restent consultables.", "info");
  if (scenario === "stale") return notice("Les données Search Console sont anciennes", "Dernière collecte dans cette variante : 20 septembre 2026. Une nouvelle collecte est nécessaire avant de décider à partir de ces données.", "");
  if (scenario === "quota") return notice("Quota de collecte atteint", "Aucune nouvelle collecte n'a été lancée. La date de reprise n'est pas connue. Les données déjà recueillies restent consultables et datées.", "");
  return "";
}

function render({ focus = false } = {}) {
  document.title = `${screens[route].title} · Maquette S01`;
  document.getElementById("side-nav").innerHTML = nav();
  document.getElementById("breadcrumb").innerHTML = screens[route].breadcrumb;
  const fullState = ["loading", "denied", "empty", "error"].includes(scenario);
  if (fullState) {
    main.innerHTML = pageHeading("Maquette S01", screens[route].title, `État examiné : ${states[scenario][0]}`) + stateView();
  } else {
    const html = route === "order" ? order() : route === "seo" ? seo() : overview();
    main.innerHTML = html;
    if (scenario !== "normal") main.querySelector(".page-heading").insertAdjacentHTML("afterend", stateView());
    if (scenario === "stale") {
      const row = [...main.querySelectorAll(".source-row")].find(node => node.textContent.includes("Search Console"));
      if (row) row.innerHTML = '<div class="source-title"><span>Search Console</span>'+badge("Données anciennes", "warning")+'</div><p>Dernier relevé : 20 septembre 2026. Les valeurs de cet ancien relevé ne sont pas utilisées pour décider.</p>';
    }
  }
  if (focus) {
    window.scrollTo(0, 0);
    document.getElementById("page-title").focus({ preventScroll: true });
  }
}

function announce(message) {
  document.getElementById("announcement").textContent = message;
}
function setScenario(value) {
  scenario = Object.hasOwn(states, value) ? value : "normal";
  approved = false;
  const url = new URL(location.href);
  if (scenario === "normal") url.searchParams.delete("state");
  else url.searchParams.set("state", scenario);
  history.replaceState(null, "", url);
  render({ focus: true });
  announce(`État de démonstration : ${states[scenario][0]}.`);
}
function showModal(title, content, actions = "", className = "") {
  modalTrigger = document.activeElement;
  modal.className = className;
  modal.innerHTML = `<div class="dialog-header"><h2 id="modal-title" tabindex="-1">${title}</h2><button class="icon-button" type="button" data-action="close-modal" aria-label="Fermer la fenêtre">${icon("close")}</button></div><div class="dialog-body">${content}</div>${actions ? `<div class="dialog-actions">${actions}</div>` : ""}`;
  modal.showModal();
  modal.querySelector("#modal-title").focus();
}
function closeModal() {
  modal.close();
}
modal.addEventListener("close", () => {
  if (modalTrigger?.isConnected) modalTrigger.focus({ preventScroll: true });
});
function scenarioModal() {
  const choices = Object.entries(states).filter(([key]) => route === "seo" || !["disconnected", "stale", "quota"].includes(key));
  showModal("Examiner un état", `<p>Choisissez une variante de la maquette. Ces états utilisent uniquement les données de démonstration.</p><div class="scenario-list">${choices.map(([key, [title, caption]]) => `<button type="button" class="scenario-choice" data-scenario="${key}" aria-pressed="${scenario === key}">${title}<span class="scenario-caption">${caption}</span></button>`).join("")}</div>`);
}
function action(name) {
  if (name === "close-modal") return closeModal();
  if (name === "reset-state" || name === "retry") return setScenario("normal");
  if (name === "payment") return showModal("Vérifier le paiement", `<p>Consulter la tentative existante pour la commande <strong>D-1042</strong>.</p><dl class="definition-list"><dt>Référence</dt><dd class="mono">PAI-DEMO-1042</dd><dt>Montant attendu</dt><dd>86,00 €</dd><dt>État connu</dt><dd>Confirmation attendue</dd></dl><div class="demo-note">Maquette : aucun prestataire n'est interrogé et aucun débit n'est créé. Le bouton suivant montre la variante sans confirmation.</div>`, button("Fermer", "close-modal", "subtle") + button("Voir le résultat incertain", "payment-uncertain", "primary"));
  if (name === "payment-uncertain") {
    closeModal();
    return setScenario("uncertain");
  }
  if (name === "payment-trace") return showModal("Dossier du paiement", `<p>Le dossier conserve l'objet, la demande et la dernière preuve connue.</p><dl class="definition-list"><dt>Objet</dt><dd>Commande D-1042 · 86,00 €</dd><dt>Source</dt><dd>Historique de démonstration</dd><dt>Opération</dt><dd>Tentative PAI-DEMO-1042 enregistrée à 09 h 42</dd><dt>Confirmation</dt><dd>Absente au relevé de 10 h 00</dd><dt>Suite</dt><dd>Consulter la tentative existante avant toute nouvelle opération.</dd></dl><div class="demo-note">Dossier fictif. Aucune donnée de prestataire réelle.</div>`, button("Fermer", "close-modal", "subtle"));
  if (name === "source") return showModal("Relevé Search Console", `<p>Données de démonstration associées à la collection « Tasses en céramique ».</p><dl class="definition-list"><dt>Périmètre</dt><dd>Page de collection · Belgique · Français · Appareils agrégés</dd><dt>Période</dt><dd>22 septembre au 19 octobre 2026</dd><dt>Collecte</dt><dd>20 octobre 2026, 09 h 10 · Europe/Brussels</dd><dt>Valeurs</dt><dd>3 200 impressions · 64 clics · CTR 2,0 %</dd><dt>Limite</dt><dd>Ces observations ne prouvent aucun effet de la proposition.</dd></dl>`, button("Fermer", "close-modal", "subtle"));
  if (name === "approve") return showModal("Examiner la validation", `<p>La validation concerne cette proposition précise.</p><dl class="definition-list"><dt>Objet et marché</dt><dd>Collection « Tasses en céramique » · Belgique · Français</dd><dt>Version</dt><dd>Proposition v13 basée sur v12</dd><dt>Changements</dt><dd>Titre SEO et description SEO. URL, prix et stock inchangés.</dd><dt>Coûts de démonstration</dt><dd>Connu 0,08 € · Réservé 0,12 € · Plafond 1,00 €</dd><dt>Effet de l'accord</dt><dd>Approuver la proposition. L'application et la publication restent des étapes distinctes.</dd></dl><div class="demo-note">Simulation locale : aucune modification de page ni publication. Cet état disparaît au rechargement de la maquette.</div>`, button("Revenir à la comparaison", "close-modal", "subtle") + button("Approuver la proposition", "approve-demo", "primary"));
  if (name === "approve-demo") {
    approved = true;
    closeModal();
    render();
    const target = document.getElementById("decision");
    target.scrollIntoView({ block: "center" });
    target.focus({ preventScroll: true });
    return announce("État de démonstration : proposition approuvée. Aucune application ni publication.");
  }
  if (name === "progress") return showModal("Suivi de l'opération", `<p>Dernier état de démonstration : <strong>${scenario === "long" ? "en cours" : "confirmation absente"}</strong>.</p><dl class="definition-list"><dt>Référence</dt><dd class="mono">${route === "order" ? "PAI-DEMO-1042" : "ACTION-DEMO-018"}</dd><dt>Dernière mise à jour</dt><dd>20 octobre 2026, 10 h 00</dd><dt>Suite</dt><dd>La consultation doit porter sur cette référence. Aucune relance n'est déclenchée par la fermeture de ce panneau.</dd></dl><div class="demo-note">Cette maquette ne possède pas de worker. L'état est choisi pour la revue de conception.</div>`, button("Fermer le suivi", "close-modal", "subtle"));
  if (name === "assistant") return showModal("Assistant", `<p>Le contexte reste lié à l'objet que vous consultez.</p><div class="assistant-context"><strong>${screens[route].title}</strong><p>Boutique Atelier Démo<br>Belgique · Français · EUR</p></div>${badge("Mode : recommandation", "blue")}<p style="margin-top:20px">L'assistant peut expliquer les informations disponibles et préparer une proposition à examiner.</p><p>Il ne dispose pas ici d'une autorisation d'encaissement, de modification de page ou de publication.</p><div class="demo-note">Panneau de conception. Aucun modèle n'est connecté. Les données de démonstration ne sont envoyées à aucun service.</div>`, button("Fermer l'assistant", "close-modal", "subtle"), "assistant-dialog");
}

document.addEventListener("click", event => {
  const target = event.target.closest("button, a");
  if (!target) return;
  if (target.dataset.action) {
    action(target.dataset.action);
  } else if (target.dataset.filter) {
    filter = target.dataset.filter;
    render();
    document.getElementById(`filter-${filter}`).focus({ preventScroll: true });
    announce(`${filter === "blocks" ? 2 : filter === "proposals" ? 1 : 4} actions affichées.`);
  } else if (target.dataset.scenario) {
    closeModal();
    setScenario(target.dataset.scenario);
  } else if (target.dataset.section) {
    event.preventDefault();
    const section = document.getElementById(target.dataset.section);
    section.scrollIntoView({ block: "start" });
    section.focus({ preventScroll: true });
  } else if (target.classList.contains("skip-link")) {
    event.preventDefault();
    main.focus();
    main.scrollIntoView({ block: "start" });
  } else if (target.getAttribute("href")?.startsWith("#") && Object.hasOwn(screens, target.getAttribute("href").slice(1))) {
    if (navigationDialog.open) navigationDialog.close();
    if (target.getAttribute("href") === `#${route}`) {
      event.preventDefault();
      render({ focus: true });
    }
  }
});
document.getElementById("scenario-button").addEventListener("click", scenarioModal);
document.getElementById("menu-button").addEventListener("click", () => {
  navigationDialog.innerHTML = `<div class="dialog-header"><h2 id="navigation-title">Atelier Démo</h2><button type="button" class="icon-button" id="close-navigation" aria-label="Fermer la navigation">${icon("close")}</button></div><div class="dialog-body">${nav()}</div>`;
  navigationDialog.showModal();
  navigationDialog.querySelector("#close-navigation").addEventListener("click", () => navigationDialog.close());
});
navigationDialog.addEventListener("close", () => {
  document.getElementById("menu-button").focus({ preventScroll: true });
});
window.addEventListener("hashchange", () => {
  const value = location.hash.slice(1);
  if (!Object.hasOwn(screens, value)) return;
  route = value;
  scenario = "normal";
  const url = new URL(location.href);
  url.searchParams.delete("state");
  history.replaceState(null, "", url);
  render({ focus: true });
});
render();
