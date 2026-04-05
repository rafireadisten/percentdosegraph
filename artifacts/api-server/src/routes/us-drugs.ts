import { Router, type Request } from 'express';
import type { Logger } from 'pino';
import logger from '../lib/logger.js';

type LoggedRequest = Request & { log?: Logger };

type OpenFdaNdcRecord = {
  product_ndc?: string;
  product_id?: string;
  spl_id?: string;
  brand_name?: string;
  generic_name?: string;
  dosage_form?: string;
  route?: string[];
  listing_expiration_date?: string;
  marketing_category?: string;
};

const router = Router();
const openFdaBaseUrl = 'https://api.fda.gov/drug/ndc.json';

function getLogger(req: Request) {
  return (req as LoggedRequest).log ?? logger;
}

router.get('/us-drugs/search', async (req, res) => {
  try {
    const query = String(req.query.q ?? '').trim();
    const limit = clampLimit(req.query.limit);

    if (query.length < 2) {
      res.json({ results: [] });
      return;
    }

    const payload = await searchOpenFdaNdc(query, limit);
    res.json({ results: payload });
  } catch (err) {
    getLogger(req).error({ err }, 'Failed to search U.S. drug catalog');
    res.status(502).json({ error: 'Failed to search U.S. drug catalog' });
  }
});

async function searchOpenFdaNdc(query: string, limit: number) {
  const params = new URLSearchParams({
    search: buildSearchQuery(query),
    limit: String(limit),
  });

  if (process.env.OPENFDA_API_KEY) {
    params.set('api_key', process.env.OPENFDA_API_KEY);
  }

  const response = await fetch(`${openFdaBaseUrl}?${params.toString()}`, {
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`openFDA request failed with status ${response.status}`);
  }

  const data = (await response.json()) as { results?: OpenFdaNdcRecord[] };
  return dedupeProducts(data.results ?? []).map(normalizeOpenFdaRecord);
}

function buildSearchQuery(query: string) {
  const token = normalizeSearchToken(query);
  return `finished:true AND (brand_name:${token} OR generic_name:${token} OR brand_name_base:${token})`;
}

function normalizeSearchToken(query: string) {
  const trimmed = query.trim().replace(/"/g, '');

  if (trimmed.includes(' ')) {
    return `"${trimmed}"`;
  }

  return `${trimmed}*`;
}

function dedupeProducts(records: OpenFdaNdcRecord[]) {
  const seen = new Set<string>();

  return records.filter(record => {
    const key = record.product_ndc ?? record.product_id ?? record.spl_id;
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeOpenFdaRecord(record: OpenFdaNdcRecord) {
  const id = record.product_ndc ?? record.product_id ?? record.spl_id ?? crypto.randomUUID();
  const name = record.brand_name || record.generic_name || 'Unnamed FDA listing';

  return {
    id: `fda:${id}`,
    name,
    brandName: record.brand_name ?? name,
    genericName: record.generic_name ?? '',
    dosageForm: record.dosage_form ?? '',
    route: Array.isArray(record.route) ? record.route.join(', ') : '',
    listingExpirationDate: record.listing_expiration_date ?? '',
    marketingCategory: record.marketing_category ?? '',
    source: 'openFDA NDC',
  };
}

function clampLimit(value: unknown) {
  const parsed = Number.parseInt(String(value ?? '20'), 10);

  if (Number.isNaN(parsed)) {
    return 20;
  }

  return Math.min(50, Math.max(1, parsed));
}

export default router;
