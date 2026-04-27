import { Router, type Request, type Response } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { logger } from "../lib/logger";

const router = Router();

const RXNORM_API_BASE = "https://rxnav.nlm.nih.gov/REST";
const RXNORM_SYSTEM = "http://www.nlm.nih.gov/research/umls/rxnorm";

type FhirCoding = {
  system?: string;
  code?: string;
  display?: string;
};

type FhirCodeableConcept = {
  coding?: FhirCoding[];
  text?: string;
};

type FhirQuantity = {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
};

type FhirDosage = {
  doseAndRate?: Array<{
    doseQuantity?: FhirQuantity;
    doseRange?: { low?: FhirQuantity; high?: FhirQuantity };
  }>;
  text?: string;
  route?: FhirCodeableConcept;
};

type FhirMedicationRequest = {
  resourceType: "MedicationRequest";
  id?: string;
  status?: string;
  medicationCodeableConcept?: FhirCodeableConcept;
  medicationReference?: { reference?: string; display?: string };
  dosageInstruction?: FhirDosage[];
  authoredOn?: string;
  dispenseRequest?: { validityPeriod?: { start?: string; end?: string } };
};

type FhirMedicationStatement = {
  resourceType: "MedicationStatement";
  id?: string;
  status?: string;
  medicationCodeableConcept?: FhirCodeableConcept;
  medicationReference?: { reference?: string; display?: string };
  dosage?: FhirDosage[];
  effectivePeriod?: { start?: string; end?: string };
  effectiveDateTime?: string;
};

type FhirMedicationAdministration = {
  resourceType: "MedicationAdministration";
  id?: string;
  status?: string;
  medicationCodeableConcept?: FhirCodeableConcept;
  medicationReference?: { reference?: string; display?: string };
  dosage?: {
    dose?: FhirQuantity;
    route?: FhirCodeableConcept;
    text?: string;
  };
  effectiveDateTime?: string;
  effectivePeriod?: { start?: string; end?: string };
};

type FhirResource =
  | FhirMedicationRequest
  | FhirMedicationStatement
  | FhirMedicationAdministration;

type FhirBundle = {
  resourceType: string;
  entry?: Array<{ resource?: FhirResource }>;
};

type ParsedMedication = {
  name: string;
  rxNormCode: string | null;
  dose: number | null;
  unit: string | null;
  route: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  sourceResourceType: string;
  sourceId: string | null;
};

type DrugRecord = {
  id: number | string;
  name: string;
  genericName?: string;
  drugClass?: string;
  maxDailyDose?: number;
  routeMaxDoses?: Record<string, number>;
  maxSingleDose?: number;
  unit?: string;
  notes?: string;
  rxNormCode?: string;
  roAliases?: string[];
};

type RxNormConceptGroup = {
  conceptProperties?: Array<{ rxcui?: string | number }>;
};

type RxNormSearchResponse = {
  drugGroup?: {
    conceptGroup?: RxNormConceptGroup[];
  };
};

type RxNormPropConcept = {
  propName: string;
  propValue: string;
};

type RxNormPropertiesResponse = {
  propConceptGroup?: {
    propConcept?: RxNormPropConcept[];
  };
};

async function loadDrugs(): Promise<DrugRecord[]> {
  const candidates = [
    path.resolve(process.cwd(), "percentdosegraph/data/drugs.json"),
    path.resolve(process.cwd(), "../../percentdosegraph/data/drugs.json"),
    "/home/runner/workspace/percentdosegraph/data/drugs.json",
  ];
  for (const p of candidates) {
    try {
      const data = await readFile(p, "utf8");
      return JSON.parse(data) as DrugRecord[];
    } catch {
      // try next candidate
    }
  }
  logger.warn("Could not load drugs.json from any candidate path");
  return [];
}

function extractRxNormCode(concept?: FhirCodeableConcept): string | null {
  if (!concept?.coding) return null;
  const rxCoding = concept.coding.find((c) => c.system === RXNORM_SYSTEM);
  return rxCoding?.code ?? null;
}

function extractMedicationName(
  concept?: FhirCodeableConcept,
  display?: string,
): string {
  if (concept?.text) return concept.text;
  if (concept?.coding?.length) {
    const first = concept.coding[0];
    if (first.display) return first.display;
  }
  return display ?? "Unknown medication";
}

function extractDose(
  dosages?: FhirDosage[],
): { amount: number | null; unit: string | null } {
  if (!dosages?.length) return { amount: null, unit: null };
  const dosage = dosages[0];
  const dr = dosage.doseAndRate?.[0];
  if (dr?.doseQuantity) {
    return {
      amount: dr.doseQuantity.value ?? null,
      unit: dr.doseQuantity.unit ?? dr.doseQuantity.code ?? null,
    };
  }
  if (dr?.doseRange?.high) {
    return {
      amount: dr.doseRange.high.value ?? null,
      unit: dr.doseRange.high.unit ?? null,
    };
  }
  return { amount: null, unit: null };
}

function normalizeRoute(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("oral") || lower.includes("po") || lower.includes("by mouth")) return "PO";
  if (lower.includes("intravenous") || lower.includes(" iv")) return "IV";
  if (lower.includes("intramuscular") || lower.includes(" im")) return "IM";
  if (lower.includes("subcutaneous") || lower.includes(" sc") || lower.includes(" sq")) return "SC";
  if (lower.includes("sublingual") || lower.includes(" sl")) return "SL";
  if (lower.includes("rectal") || lower.includes(" pr")) return "PR";
  if (lower.includes("inhal") || lower.includes("inh")) return "INH";
  if (lower.includes("transdermal") || lower.includes(" td") || lower.includes("topical")) return "TD";
  return "Other";
}

function extractRoute(dosages?: FhirDosage[]): string | null {
  if (!dosages?.length) return null;
  const route = dosages[0].route;
  if (!route) return null;
  const text =
    route.text ??
    route.coding?.[0]?.display ??
    route.coding?.[0]?.code ??
    null;
  if (!text) return null;
  return normalizeRoute(text);
}

function parseFhirBundle(bundle: FhirBundle): ParsedMedication[] {
  const results: ParsedMedication[] = [];

  for (const entry of bundle.entry ?? []) {
    const resource = entry.resource;
    if (!resource) continue;

    if (resource.resourceType === "MedicationRequest") {
      const r = resource as FhirMedicationRequest;
      const concept = r.medicationCodeableConcept;
      const refDisplay = r.medicationReference?.display;
      const name = extractMedicationName(concept, refDisplay);
      const rxNormCode = extractRxNormCode(concept);
      const { amount, unit } = extractDose(r.dosageInstruction);
      const route = extractRoute(r.dosageInstruction);
      results.push({
        name,
        rxNormCode,
        dose: amount,
        unit,
        route,
        startDate:
          r.authoredOn?.slice(0, 10) ??
          r.dispenseRequest?.validityPeriod?.start?.slice(0, 10) ??
          null,
        endDate: r.dispenseRequest?.validityPeriod?.end?.slice(0, 10) ?? null,
        status: r.status ?? "unknown",
        sourceResourceType: "MedicationRequest",
        sourceId: r.id ?? null,
      });
    } else if (resource.resourceType === "MedicationStatement") {
      const r = resource as FhirMedicationStatement;
      const concept = r.medicationCodeableConcept;
      const refDisplay = r.medicationReference?.display;
      const name = extractMedicationName(concept, refDisplay);
      const rxNormCode = extractRxNormCode(concept);
      const { amount, unit } = extractDose(r.dosage);
      const route = extractRoute(r.dosage);
      results.push({
        name,
        rxNormCode,
        dose: amount,
        unit,
        route,
        startDate:
          r.effectivePeriod?.start?.slice(0, 10) ??
          r.effectiveDateTime?.slice(0, 10) ??
          null,
        endDate: r.effectivePeriod?.end?.slice(0, 10) ?? null,
        status: r.status ?? "unknown",
        sourceResourceType: "MedicationStatement",
        sourceId: r.id ?? null,
      });
    } else if (resource.resourceType === "MedicationAdministration") {
      const r = resource as FhirMedicationAdministration;
      const concept = r.medicationCodeableConcept;
      const refDisplay = r.medicationReference?.display;
      const name = extractMedicationName(concept, refDisplay);
      const rxNormCode = extractRxNormCode(concept);
      const dose = r.dosage?.dose;
      const routeText =
        r.dosage?.route?.text ??
        r.dosage?.route?.coding?.[0]?.display ??
        null;
      results.push({
        name,
        rxNormCode,
        dose: dose?.value ?? null,
        unit: dose?.unit ?? dose?.code ?? null,
        route: routeText ? normalizeRoute(routeText) : null,
        startDate:
          r.effectivePeriod?.start?.slice(0, 10) ??
          r.effectiveDateTime?.slice(0, 10) ??
          null,
        endDate: r.effectivePeriod?.end?.slice(0, 10) ?? null,
        status: r.status ?? "unknown",
        sourceResourceType: "MedicationAdministration",
        sourceId: r.id ?? null,
      });
    }
  }

  return results;
}

function matchMedication(
  parsed: ParsedMedication,
  drugs: DrugRecord[],
): DrugRecord | null {
  const nameLower = parsed.name.toLowerCase().trim();
  const rxCode = parsed.rxNormCode;

  for (const drug of drugs) {
    if (rxCode && drug.rxNormCode === rxCode) {
      return drug;
    }
  }

  for (const drug of drugs) {
    if (drug.name.toLowerCase() === nameLower) return drug;
    if (drug.genericName?.toLowerCase() === nameLower) return drug;
  }

  for (const drug of drugs) {
    if (
      drug.name.toLowerCase().includes(nameLower) ||
      nameLower.includes(drug.name.toLowerCase())
    ) {
      return drug;
    }
    if (
      drug.genericName &&
      (drug.genericName.toLowerCase().includes(nameLower) ||
        nameLower.includes(drug.genericName.toLowerCase()))
    ) {
      return drug;
    }
    const aliases: string[] = drug.roAliases ?? [];
    if (
      aliases.some(
        (alias) =>
          alias.toLowerCase() === nameLower ||
          nameLower.includes(alias.toLowerCase()),
      )
    ) {
      return drug;
    }
  }

  return null;
}

async function lookupRxNorm(
  name: string,
  rxNormCode: string | null,
): Promise<Partial<DrugRecord> | null> {
  try {
    let rxcui: string | null = rxNormCode;

    if (!rxcui) {
      const searchUrl = `${RXNORM_API_BASE}/drugs.json?name=${encodeURIComponent(name)}`;
      const searchRes = await fetch(searchUrl, {
        signal: AbortSignal.timeout(5000),
      });
      if (!searchRes.ok) return null;
      const searchData = (await searchRes.json()) as RxNormSearchResponse;
      const groups = searchData.drugGroup?.conceptGroup ?? [];
      for (const group of groups) {
        const concept = group.conceptProperties?.[0];
        if (concept?.rxcui) {
          rxcui = String(concept.rxcui);
          break;
        }
      }
    }

    if (!rxcui) return null;

    const propUrl = `${RXNORM_API_BASE}/rxcui/${rxcui}/allProperties.json?prop=all`;
    const propRes = await fetch(propUrl, { signal: AbortSignal.timeout(5000) });
    if (!propRes.ok) return null;
    const propData = (await propRes.json()) as RxNormPropertiesResponse;
    const props: RxNormPropConcept[] = propData.propConceptGroup?.propConcept ?? [];

    const getprop = (propName: string) =>
      props.find((p) => p.propName === propName)?.propValue ?? null;

    return {
      name: getprop("RxNorm Name") ?? name,
      genericName: getprop("RxNorm Name") ?? name,
      notes: `Auto-created from RxNorm lookup (rxcui: ${rxcui}). Max dose not yet verified.`,
      unit: "mg",
      maxDailyDose: 100,
    };
  } catch {
    return null;
  }
}

router.post("/fhir/import", async (req: Request, res: Response) => {
  try {
    const bundle = req.body as FhirBundle;

    if (!bundle || bundle.resourceType !== "Bundle") {
      res.status(400).json({
        error: "Request body must be a FHIR Bundle resource.",
      });
      return;
    }

    const parsed = parseFhirBundle(bundle);

    if (!parsed.length) {
      res.json({
        matched: [],
        unmatched: [],
        autoCreated: [],
        totalParsed: 0,
        totalMatched: 0,
        totalUnmatched: 0,
        message:
          "No MedicationRequest, MedicationStatement, or MedicationAdministration resources found in the bundle.",
      });
      return;
    }

    const drugs = await loadDrugs();
    const autoCreated: DrugRecord[] = [];

    type MatchResult = {
      parsed: ParsedMedication;
      drug: DrugRecord | null;
      isNew: boolean;
    };

    const matchResults: MatchResult[] = [];
    let autoIdCounter = 900000;

    for (const med of parsed) {
      const drug = matchMedication(med, drugs);
      if (drug) {
        matchResults.push({ parsed: med, drug, isNew: false });
      } else {
        logger.info(
          { name: med.name, rxNormCode: med.rxNormCode },
          "Unmatched FHIR medication — looking up via RxNorm",
        );
        const rxInfo = await lookupRxNorm(med.name, med.rxNormCode);
        if (rxInfo) {
          const newDrug: DrugRecord = {
            id: autoIdCounter++,
            name: rxInfo.name ?? med.name,
            genericName: rxInfo.genericName ?? med.name,
            unit: rxInfo.unit ?? med.unit ?? "mg",
            maxDailyDose: rxInfo.maxDailyDose ?? 100,
            notes: rxInfo.notes ?? "",
          };
          drugs.push(newDrug);
          autoCreated.push(newDrug);
          matchResults.push({ parsed: med, drug: newDrug, isNew: true });
        } else {
          matchResults.push({ parsed: med, drug: null, isNew: false });
        }
      }
    }

    const matched = matchResults
      .filter((r) => r.drug !== null)
      .map((r) => ({
        parsedMedication: r.parsed,
        drug: r.drug,
        isNewDrug: r.isNew,
      }));

    const unmatched = matchResults
      .filter((r) => r.drug === null)
      .map((r) => r.parsed);

    res.json({
      matched,
      unmatched,
      autoCreated,
      totalParsed: parsed.length,
      totalMatched: matched.length,
      totalUnmatched: unmatched.length,
    });
  } catch (err) {
    logger.error({ err }, "FHIR import failed");
    res.status(500).json({ error: "Failed to process FHIR Bundle." });
  }
});

export default router;
