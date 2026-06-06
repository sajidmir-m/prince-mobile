export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True when the query is digits-only (4+ chars) — used for IMEI search. */
export function isImeiLikeQuery(query: string): boolean {
  const digits = query.replace(/\s/g, "");
  return /^\d{4,}$/.test(digits);
}

function scoreImeiMatch(query: string, imei?: string | null): number {
  const qDigits = query.replace(/\s/g, "");
  if (!imei || !/^\d+$/.test(qDigits)) return 0;

  const imeiDigits = imei.replace(/\s/g, "");
  if (imeiDigits === qDigits) return 99;
  if (!imeiDigits.includes(qDigits)) return 0;

  if (qDigits.length >= 10) return 97;
  if (qDigits.length >= 6) return 93;
  return 88;
}

export interface SearchableFields {
  brand?: string;
  model?: string;
  name?: string;
  sku?: string;
  imei?: string | null;
  imei2?: string | null;
  seller_name?: string;
  phone?: string;
  sale_number?: string;
}

function matchesToken(token: string, text: string): boolean {
  const t = text.toLowerCase();
  const q = token.toLowerCase();
  if (!q) return false;
  if (t === q) return true;
  if (t.startsWith(`${q} `) || t.startsWith(`${q}-`)) return true;
  const pattern = new RegExp(`(^|[\\s-])${escapeRegex(q)}([\\s-]|$)`, "i");
  return pattern.test(t);
}

function allTokensMatch(tokens: string[], ...texts: string[]): boolean {
  const combined = texts.filter(Boolean).join(" ").toLowerCase();
  return tokens.every(
    (token) =>
      texts.some((text) => text && matchesToken(token, text)) ||
      matchesToken(token, combined)
  );
}

export function scoreSearchMatch(query: string, fields: SearchableFields): number {
  const q = normalizeSearchQuery(query);
  if (!q) return 0;

  const tokens = q.split(" ").filter(Boolean);
  const brand = (fields.brand || "").trim();
  const model = (fields.model || "").trim();
  const name = (fields.name || "").trim();
  const sku = (fields.sku || "").trim();
  const fullName = name || `${brand} ${model}`.trim();
  const fullNameLower = fullName.toLowerCase();
  const modelLower = model.toLowerCase();

  if (fullNameLower === q) return 100;
  if (modelLower === q || name.toLowerCase() === q) return 98;
  if (sku.toLowerCase() === q) return 96;

  if (allTokensMatch(tokens, brand, model, name)) {
    if (tokens.length === 1 && matchesToken(tokens[0], model)) return 95;
    if (tokens.length === 1 && matchesToken(tokens[0], fullName)) return 90;
    return 85;
  }

  if (tokens.length === 1) {
    const token = tokens[0];
    if (matchesToken(token, model)) return 92;
    if (matchesToken(token, fullName)) return 88;
    if (sku && matchesToken(token, sku)) return 82;
    if (fields.seller_name && matchesToken(token, fields.seller_name)) return 70;
    if (fields.phone?.includes(token)) return 65;
    if (fields.sale_number?.toLowerCase().includes(token)) return 60;
  }

  const imeiScore = Math.max(scoreImeiMatch(q, fields.imei), scoreImeiMatch(q, fields.imei2));
  if (imeiScore > 0) return imeiScore;

  return 0;
}

const STRONG_MATCH_SCORE = 75;

export function filterAndRankSearchResults<T>(
  query: string,
  items: T[],
  getFields: (item: T) => SearchableFields
): T[] {
  const scored = items
    .map((item) => ({ item, score: scoreSearchMatch(query, getFields(item)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const strong = scored.filter((entry) => entry.score >= STRONG_MATCH_SCORE);
  const finalList = strong.length > 0 ? strong : scored;

  return finalList.map((entry) => entry.item);
}

/** Build a Supabase OR filter for product tables. IMEI is always included when enabled. */
export function buildProductOrFilter(
  query: string,
  fields: { model?: boolean; brand?: boolean; name?: boolean; sku?: boolean; imei?: boolean; seller?: boolean }
): string {
  const q = query.trim();
  const parts: string[] = [];

  if (fields.model) parts.push(`model.ilike.%${q}%`);
  if (fields.brand) parts.push(`brand.ilike.%${q}%`);
  if (fields.name) parts.push(`name.ilike.%${q}%`);
  if (fields.sku) parts.push(`sku.ilike.%${q}%`);
  if (fields.seller) parts.push(`seller_name.ilike.%${q}%`);
  if (fields.imei) {
    parts.push(`imei1.ilike.%${q}%`, `imei2.ilike.%${q}%`);
  }

  return parts.join(",");
}
