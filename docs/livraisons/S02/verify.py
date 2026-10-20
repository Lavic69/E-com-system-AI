#!/usr/bin/env python3
"""Vérifie les exemples S02, sans serveur, réseau ou effet métier."""
import copy
import hashlib
import json
import os
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path
import re
import sys

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[2]
CONTRACTS = PROJECT / "packages/contracts"
FORMATS = FormatChecker()


@FORMATS.checks("date-time")
def is_utc_datetime(value):
    # jsonschema peut être installé sans sa dépendance optionnelle RFC3339.
    if not isinstance(value, str):
        return True
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z", value):
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
        return True
    except ValueError:
        return False


def load(name):
    return json.loads((CONTRACTS / name).read_text())


def instant(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def semantic_errors(contract, value, markets):
    """Cohérence des données seules ; aucune simulation d'un service applicatif."""
    errors = []
    scope = value.get("scope", value.get("context", {}).get("scope"))
    shop = value.get("shopId") or (scope or {}).get("shopId")
    currency = (scope or {}).get("currencyCode")
    if contract == "BudgetReservation":
        currency = value["ceiling"]["currency"]

    for node in walk(value):
        if "shopId" in node and shop and node["shopId"] != shop:
            errors.append("Référence hors boutique")
        if {"marketId", "channelId", "languageCode", "currencyCode"} <= node.keys():
            market = next((m for m in markets if m["shopId"] == node["shopId"]
                           and m["marketId"] == node["marketId"]), None)
            if not market or node["channelId"] != market["channelId"]:
                errors.append("Liaison marché/canal invalide")
            elif (node["currencyCode"] not in market["currencies"]
                  or node["languageCode"] not in market["languages"]):
                errors.append("Langue ou devise non autorisée sur le marché")
        if {"minor", "currency", "scale"} <= node.keys() and currency:
            if node["currency"] != currency:
                errors.append("Mélange de devises")
        for start, end in (
            ("calculatedAt", "validUntil"), ("observedAt", "validUntil"),
            ("evaluatedAt", "validUntil"), ("effectiveAt", "validUntil"),
            ("issuedAt", "expiresAt"), ("acquiredAt", "expiresAt"),
            ("createdAt", "expiresAt"), ("periodStart", "periodEnd"),
            ("validFrom", "validUntil"),
        ):
            if node.get(start) and node.get(end) and instant(node[start]) >= instant(node[end]):
                errors.append(f"Intervalle invalide : {start}/{end}")

    if contract == "Quote":
        if value["netMinor"] + value["taxMinor"] != value["total"]["minor"]:
            errors.append("Total différent de net + taxes")
    elif contract == "Action":
        auth = value["authorization"]
        if auth and value["state"] not in ("prepared", "awaiting_approval", "cancelled"):
            if auth["bindingDigest"] != value["proposal"]["bindingDigest"]:
                errors.append("Approbation liée à une autre proposition")
            if auth["policyVersion"] != value["context"]["policyVersion"]:
                errors.append("Autorité liée à une autre politique")
        operations = value["operations"]
        if len({op["operationId"] for op in operations}) != len(operations):
            errors.append("Opération dupliquée dans le dossier")
        if value["state"] == "succeeded" and any(op["state"] != "succeeded" for op in operations):
            errors.append("Dossier réussi avec opération inachevée")
    elif contract == "BudgetReservation":
        state = value["state"]
        if state in ("held", "uncertain") and value["held"] != value["ceiling"]:
            errors.append("Réserve ouverte différente du plafond")
        if state in ("reconciled", "released") and value["held"]["minor"] != 0:
            errors.append("Réserve non soldée")
        if state == "released" and value["knownCost"]["minor"] != 0:
            errors.append("Libération avec coût non nul")
        # Un dépassement constaté doit pouvoir être enregistré, puis signalé en incident.
    elif contract == "Publication":
        cache = value["cache"]
        expected = {
            "scope": value["scope"], "publicationId": value["id"],
            "artifactId": value["artifact"]["id"], "pageId": value["page"]["id"],
            "pageVersion": value["page"]["version"],
        }
        if any(cache[k] != v for k, v in expected.items()):
            errors.append("Cache incohérent avec la publication")
    elif contract == "Event":
        if instant(value["recordedAt"]) < instant(value["receivedAt"]):
            errors.append("Persistance antérieure à la réception")
    return errors


def verify():
    schema = load("contracts.schema.json")
    fixtures = load("examples.json")
    Draft202012Validator.check_schema(schema)
    definitions = schema["$defs"]
    validators = {
        name: Draft202012Validator(
            {"$ref": f"#/$defs/{name}", "$defs": definitions},
            format_checker=FORMATS,
        )
        for name in definitions
    }
    root_validator = Draft202012Validator(schema, format_checker=FORMATS)
    results = []

    def check(name, condition, details=None):
        results.append({"name": name, "passed": bool(condition), "details": details})

    def errors(contract, value):
        structural = list(validators[contract].iter_errors(value))
        if structural:
            return "schema", [e.message for e in structural]
        semantic = semantic_errors(contract, value, fixtures["marketRegistry"])
        return ("semantic", semantic) if semantic else (None, [])

    check("schema_2020_12", True)
    cases = {case["id"]: case for case in fixtures["cases"]}
    check("unique_example_ids", len(cases) == len(fixtures["cases"]))
    public = {entry["$ref"].split("/")[-1] for entry in schema["oneOf"]}
    check("all_public_contracts_have_examples",
          public <= {c["contract"] for c in cases.values()})

    for case in cases.values():
        layer, issues = errors(case["contract"], case["value"])
        root_issues = list(root_validator.iter_errors(case["value"]))
        check("example:" + case["id"], not issues and not root_issues,
              issues + [e.message for e in root_issues] or None)

    for negative in fixtures["negativeCases"]:
        case = cases[negative["baseCase"]]
        value = copy.deepcopy(case["value"])
        node = value
        for key in negative["path"][:-1]:
            node = node[key]
        node[negative["path"][-1]] = negative["value"]
        layer, issues = errors(case["contract"], value)
        check("reject:" + negative["id"], layer == negative["expectedLayer"],
              {"expected": negative["expectedLayer"], "actual": layer, "reasons": issues})

    def value(name):
        return cases[name]["value"]

    payment = value("payment_unknown")
    reservation = value("reservation_uncertain")
    quote = value("quote_be")
    check("payment_reservation_references",
          payment["reservationId"] == reservation["id"]
          and reservation["paymentAttemptId"] == payment["id"]
          and payment["order"] == reservation["order"] == quote["order"])
    check("payment_quote_amount", payment["amount"] == quote["total"])
    connection = value("connection_media")
    budget = value("budget_uncertain")
    operation = value("operation_uncertain")
    check("operation_connection_budget_references",
          operation["connectionId"] == budget["connectionId"] == connection["id"]
          and operation["budgetReservationId"] == budget["id"]
          and operation["operationId"] == budget["operationId"]
          and operation["capability"] in [c["code"] for c in connection["capabilities"]]
          and budget["ceiling"] == connection["perOperationCeiling"])
    check("payment_connection_reference",
          payment["connectionId"] == value("connection_payment")["id"])
    exposure = value("exposure_b")
    publication = value("publication_home")
    check("rendered_version_references",
          exposure["page"] == publication["page"] == value("lease_experiment")["target"]
          and exposure["artifactId"] == publication["artifact"]["id"]
          and exposure["page"]["version"] == value("content_home")["version"]
          and all(exposure[k] == publication["cache"][k]
                  for k in ("experimentId", "experimentVersion", "variantId")))
    event = value("event_settled")
    duplicate = value("event_settled_duplicate")
    ignored = {"receivedAt", "recordedAt"}
    check("duplicate_same_business_content",
          {k: v for k, v in event.items() if k not in ignored}
          == {k: v for k, v in duplicate.items() if k not in ignored})
    late = value("event_authorized_late")
    check("late_event_fixture",
          late["aggregate"] == event["aggregate"]
          and late["sequence"] < event["sequence"]
          and instant(late["receivedAt"]) > instant(duplicate["receivedAt"]))

    for document in sorted(ROOT.glob("*.md")):
        missing = []
        for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", document.read_text()):
            if re.match(r"^[a-z]+://", target) or target.startswith("#"):
                continue
            local = target.split("#", 1)[0]
            if not (document.parent / local).exists():
                missing.append(target)
        check("local_links:" + document.name, not missing, missing or None)

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "scope": "Validation documentaire et cohérence de données synthétiques uniquement",
        "python": sys.version.split()[0], "jsonschema": version("jsonschema"),
        "publicContracts": len(public), "positiveExamples": len(cases),
        "negativeExamples": len(fixtures["negativeCases"]),
        "passed": sum(result["passed"] for result in results), "total": len(results),
        "files": {
            str(path.relative_to(PROJECT)): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in sorted([*ROOT.iterdir(), *CONTRACTS.iterdir()])
            if path.is_file() and path.name != "verification.json"
        },
        "notTested": [
            "Transactions et crash", "Concurrence PostgreSQL", "Permissions serveur",
            "Fournisseurs et webhooks", "Envoi de messages", "Cache et interface rendue",
            "Scénarios SC01 à SC08 sur une application",
        ],
        "checks": results,
    }
    output = Path(os.environ.get("ECOM_CONTRACT_REPORT", str(PROJECT / ".data/contracts-verification.json")))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(f'{report["passed"]}/{report["total"]} contrôles documentaires réussis ; '
          f'{len(cases)} exemples et {report["negativeExamples"]} contre-exemples.')
    for result in results:
        if not result["passed"]:
            print(json.dumps(result, ensure_ascii=False))
    return 0 if report["passed"] == report["total"] else 1


if __name__ == "__main__":
    raise SystemExit(verify())
