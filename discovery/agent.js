#!/usr/bin/env node
/**
 * RBSW Local Discovery Agent
 *
 * Mirrors the n8n discovery workflow locally using the Anthropic SDK tool use loop.
 * Phase 1 — Scout:    Searches the web for minority-owned businesses in a given city/category.
 * Phase 2 — Verify:   Checks each result for real ownership evidence.
 * Phase 3 — Insert:   Pushes approved and needs-review listings to Supabase as status:pending.
 *
 * Usage:
 *   node agent.js [options]
 *
 * Options:
 *   --category     Business category (default: "Food & Restaurant")
 *   --city         City to search   (default: "Atlanta")
 *   --state        State name       (default: "Georgia")
 *   --state-code   2-letter code    (default: "GA")
 *   --max-results  How many to find (default: 10)
 *   --no-verify    Skip ownership verification phase
 *   --dry-run      Skip Supabase inserts, print results only
 *
 * Example:
 *   node agent.js --category "Beauty & Personal Care" --city "Houston" --state "Texas" --state-code TX
 */

import Anthropic from '@anthropic-ai/sdk';
import { createRequire } from 'module';

// Load .env from the discovery directory
const require = createRequire(import.meta.url);
const { config } = await import('dotenv');
config({ path: new URL('.env', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1') });

// ─── Env check ────────────────────────────────────────────────────────────────

const REQUIRED_VARS = ['ANTHROPIC_API_KEY', 'SERPER_API_KEY', 'FIRECRAWL_API_KEY', 'APIFY_TOKEN'];

function checkEnv(skipInsert) {
  const missing = REQUIRED_VARS.filter(k => !process.env[k]);
  if (!skipInsert) {
    if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }
  if (missing.length) {
    console.error('Missing required environment variables:\n  ' + missing.join('\n  '));
    console.error('\nCopy .env.example to .env and fill in your keys.');
    process.exit(1);
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-6';

const CATEGORY_MAP = {
  'Food & Restaurant': 1,
  'Fashion & Apparel': 2,
  'Health & Wellness': 3,
  'Technology': 4,
  'Beauty & Personal Care': 5,
  'Art & Creative': 6,
  'Finance & Legal': 7,
  'Education & Tutoring': 8,
  'Freelancers': 9,
  'Handyman Services': 10,
  'Transportation & Logistics': 11,
};

// ─── Tool definitions ──────────────────────────────────────────────────────────

const SCOUT_TOOLS = [
  {
    name: 'serper_web_search',
    description:
      'Search Google for minority-owned business listings, directories, and news articles. ' +
      'Use one focused query per call. Returns titles, URLs, and snippets. ' +
      'Run multiple queries covering different ownership terms: Black-owned, Hispanic-owned, women-owned, Asian-owned.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Google search query for minority-owned businesses' },
      },
      required: ['query'],
    },
  },
  {
    name: 'firecrawl_scrape',
    description:
      'Scrape and extract clean text from any webpage. Use on business websites, Yelp pages, and ' +
      'directory listings to find owner names, addresses, phone numbers, hours, and minority ownership claims. ' +
      'Returns readable markdown.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Full URL to scrape for business information' },
      },
      required: ['url'],
    },
  },
  {
    name: 'apify_google_maps',
    description:
      'Search Google Maps for local businesses by keyword. Returns name, address, phone, website, ' +
      'rating, and category. Best for finding businesses with a physical map presence.',
    input_schema: {
      type: 'object',
      properties: {
        search_query: { type: 'string', description: 'Google Maps search query for minority-owned businesses' },
      },
      required: ['search_query'],
    },
  },
];

const VERIFIER_TOOLS = [
  {
    name: 'firecrawl_verify',
    description:
      'Scrape a business webpage to find ownership evidence. Look for About pages, founder bios, ' +
      'ownership statements, diversity certifications, and minority-owned claims. Returns clean markdown.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Full URL to scrape for ownership evidence' },
      },
      required: ['url'],
    },
  },
  {
    name: 'serper_verify',
    description:
      'Search Google to find news articles, directory listings, interviews, or external sources ' +
      'that confirm or deny minority ownership of a business.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query to find ownership evidence for a business' },
      },
      required: ['query'],
    },
  },
];

// ─── API helpers ───────────────────────────────────────────────────────────────

async function serperSearch(query) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num: 10, gl: 'us', hl: 'en' }),
  });
  if (!res.ok) throw new Error(`Serper ${res.status}: ${await res.text()}`);
  return res.json();
}

async function firecrawlScrape(url) {
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true, waitFor: 1500 }),
  });
  if (!res.ok) throw new Error(`Firecrawl ${res.status}: ${await res.text()}`);
  return res.json();
}

async function apifyGoogleMaps(searchQuery) {
  const url =
    `https://api.apify.com/v2/acts/compass~google-maps-scraper/run-sync-get-dataset-items` +
    `?token=${process.env.APIFY_TOKEN}&timeout=120`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      searchStringsArray: [searchQuery],
      maxCrawledPlacesPerSearch: 15,
      language: 'en',
      countryCode: 'us',
    }),
    signal: AbortSignal.timeout(130_000),
  });
  if (!res.ok) throw new Error(`Apify ${res.status}: ${await res.text()}`);
  return res.json();
}

async function insertToSupabase(row) {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/businesses`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
}

// ─── Tool dispatch ─────────────────────────────────────────────────────────────

function dispatchScoutTool(name, input) {
  switch (name) {
    case 'serper_web_search':  return serperSearch(input.query);
    case 'firecrawl_scrape':   return firecrawlScrape(input.url);
    case 'apify_google_maps':  return apifyGoogleMaps(input.search_query);
    default: throw new Error(`Unknown scout tool: ${name}`);
  }
}

function dispatchVerifyTool(name, input) {
  switch (name) {
    case 'firecrawl_verify': return firecrawlScrape(input.url);
    case 'serper_verify':    return serperSearch(input.query);
    default: throw new Error(`Unknown verify tool: ${name}`);
  }
}

// ─── Agentic loop ──────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function runAgentLoop({ systemMessage, prompt, tools, dispatchTool, maxIterations = 20 }) {
  const messages = [{ role: 'user', content: prompt }];

  for (let i = 0; i < maxIterations; i++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      // Cache the system message — it's static and reused across verifier iterations
      system: [{ type: 'text', text: systemMessage, cache_control: { type: 'ephemeral' } }],
      tools,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      const block = response.content.find(b => b.type === 'text');
      return block?.text ?? '';
    }

    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter(b => b.type === 'tool_use');

      // Run tool calls in parallel when there are multiple
      const results = await Promise.all(
        toolUses.map(async (tu) => {
          process.stdout.write(`  [tool] ${tu.name}  ${JSON.stringify(tu.input).slice(0, 72)}\n`);
          try {
            const result = await dispatchTool(tu.name, tu.input);
            // Truncate large responses to avoid overflowing the context window
            const content = JSON.stringify(result);
            return {
              type: 'tool_result',
              tool_use_id: tu.id,
              content: content.length > 20_000 ? content.slice(0, 20_000) + '\n...[truncated]' : content,
            };
          } catch (err) {
            return {
              type: 'tool_result',
              tool_use_id: tu.id,
              content: `Error: ${err.message}`,
              is_error: true,
            };
          }
        })
      );

      messages.push({ role: 'user', content: results });
    }
  }

  throw new Error('Agent reached max iterations without completing.');
}

// ─── Scout phase ───────────────────────────────────────────────────────────────

async function runScout({ category, state, stateCode, city, maxResults }) {
  const queries = [
    `Black owned ${category} ${city} ${state}`,
    `minority owned ${category} ${city} ${state}`,
    `Hispanic owned ${category} ${city} ${state}`,
    `women owned ${category} ${city} ${state}`,
    `Asian owned ${category} ${city} ${state}`,
    `BIPOC owned ${category} business ${city}`,
    `minority business directory ${category} ${state}`,
    `site:yelp.com ${category} minority owned ${city} ${state}`,
  ];

  const queriesList = queries.map((q, i) => `   ${i + 1}. "${q}"`).join('\n');

  const prompt =
    `You are a business researcher for Real Black Wall Street, a nationwide minority-owned business directory.\n\n` +
    `TASK: Find ${maxResults} real minority-owned businesses in the [${category}] industry in ${city}, ${state} (${stateCode}).\n\n` +
    `STEP 1 — Run ALL of these searches using serper_web_search (one call per query):\n${queriesList}\n\n` +
    `STEP 2 — For each promising business website or directory page, use firecrawl_scrape to extract contact and ownership info.\n\n` +
    `STEP 3 — Use apify_google_maps with query: "minority owned ${category} ${city} ${state}"\n\n` +
    `STEP 4 — Return a JSON array. Each object must include:\n` +
    `  - name (string, REQUIRED)\n` +
    `  - owner_name (string)\n` +
    `  - address (string, full street address)\n` +
    `  - city ("${city}")\n` +
    `  - state_code ("${stateCode}")\n` +
    `  - phone (string)\n` +
    `  - email (string)\n` +
    `  - website (string, REQUIRED — domain only, no http://)\n` +
    `  - description (2-3 sentences)\n` +
    `  - category ("${category}")\n` +
    `  - price_range ($ | $$ | $$$ | $$$$)\n` +
    `  - hours (string)\n` +
    `  - minority_type (Black | Hispanic | Asian | Women | Indigenous | Other)\n` +
    `  - ownership_signal (brief text — what phrase or evidence indicates minority ownership)\n` +
    `  - lat (number if from Maps)\n` +
    `  - lng (number if from Maps)\n\n` +
    `RULES: Only real businesses. Only in ${city}, ${state}. Must have name + website. No duplicates. Return ONLY a valid JSON array.`;

  const output = await runAgentLoop({
    systemMessage:
      'You are an expert business researcher and web intelligence agent for Real Black Wall Street — ' +
      'a nationwide minority-owned business directory. You systematically search, scrape, and extract ' +
      'structured data about real minority-owned businesses. Complete every assigned search query before ' +
      'returning results. Return only valid JSON arrays.',
    prompt,
    tools: SCOUT_TOOLS,
    dispatchTool: dispatchScoutTool,
    maxIterations: 20,
  });

  let businesses = [];
  try {
    const match = output.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    businesses = JSON.parse(match ? match[0] : output.trim());
  } catch {
    console.error('[scout] Failed to parse agent output:\n', output.slice(0, 500));
    return [];
  }

  if (!Array.isArray(businesses)) return [];

  // Deduplicate by website domain and shape into DB rows
  const seen = new Set();
  return businesses.filter(biz => {
    if (!biz.name || !biz.website) return false;
    const key = String(biz.website).toLowerCase()
      .replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(biz => {
    const slug =
      (biz.name || '').toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 48) +
      '-' + Math.random().toString(36).slice(2, 7);
    const website = String(biz.website || '')
      .replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    const sc = String(biz.state_code || stateCode).toUpperCase().slice(0, 2);
    return {
      slug,
      name:             biz.name,
      category_id:      CATEGORY_MAP[biz.category] ?? CATEGORY_MAP[category] ?? 1,
      category_label:   biz.category || category,
      owner_name:       biz.owner_name      || null,
      city:             biz.city            || city,
      state_code:       sc,
      location:         `${biz.city || city}, ${sc}`,
      address:          biz.address         || null,
      phone:            biz.phone           || null,
      email:            biz.email           || null,
      website:          website             || null,
      hours:            biz.hours           || null,
      price_range:      ['$', '$$', '$$$', '$$$$'].includes(biz.price_range) ? biz.price_range : '$$',
      rating:           0,
      review_count:     0,
      description:      biz.description     || null,
      image_url:        null,
      image_alt:        null,
      featured:         false,
      status:           'pending',
      lat:              typeof biz.lat === 'number' ? biz.lat : null,
      lng:              typeof biz.lng === 'number' ? biz.lng : null,
      minority_type:    biz.minority_type   || null,
      ownership_signal: biz.ownership_signal || null,
    };
  });
}

// ─── Verify phase ──────────────────────────────────────────────────────────────

async function verifyBusiness(biz) {
  const websiteUrl = biz.website ? `https://${biz.website}` : null;

  const scrapeSteps = websiteUrl
    ? `1. Use firecrawl_verify to scrape ${websiteUrl} — look for: About page, founder story, ownership statements, diversity certifications, minority-owned claims.\n` +
      `2. Use firecrawl_verify to scrape ${websiteUrl}/about for ownership details.\n`
    : `1. No website available — skip scraping.\n`;

  const prompt =
    `VERIFY whether this business is genuinely minority-owned:\n\n` +
    `Business:               ${biz.name}\n` +
    `Category:               ${biz.category_label}\n` +
    `Location:               ${biz.address || biz.location}\n` +
    `Owner:                  ${biz.owner_name || 'unknown'}\n` +
    `Website:                ${websiteUrl || 'none'}\n` +
    `Minority Type Claimed:  ${biz.minority_type || 'not specified'}\n` +
    `Ownership Signal:       ${biz.ownership_signal || 'none'}\n` +
    `Description:            ${biz.description || 'none'}\n\n` +
    `VERIFICATION STEPS:\n` +
    scrapeSteps +
    `3. Use serper_verify to search: "${biz.name} ${biz.city || ''} minority owned"\n` +
    `4. Use serper_verify to search: "${biz.name} Black owned" OR "${biz.name} Hispanic owned" OR "${biz.name} women owned"\n\n` +
    `Respond with ONLY a valid JSON object:\n` +
    `{\n` +
    `  "verified": true or false,\n` +
    `  "confidence": number from 0 to 100,\n` +
    `  "minority_type": "Black | Hispanic | Asian | Women | Indigenous | Other | Unknown",\n` +
    `  "certification": "NMSDC | WBENC | SBA 8a | State Certified | Self-Identified | None",\n` +
    `  "evidence": "1-2 sentences describing what evidence confirms or denies minority ownership",\n` +
    `  "verdict": "APPROVE | REJECT | NEEDS_REVIEW"\n` +
    `}\n\n` +
    `Verdict guide:\n` +
    `- APPROVE:       verified=true,  confidence >= 65\n` +
    `- NEEDS_REVIEW:  confidence 35-64\n` +
    `- REJECT:        verified=false, confidence < 35\n\n` +
    `Return ONLY the JSON object. No markdown, no explanation.`;

  const output = await runAgentLoop({
    systemMessage:
      'You are a strict minority business ownership verification agent for Real Black Wall Street. ' +
      'Verify whether a business is genuinely minority-owned using web evidence. ' +
      'Be conservative — when in doubt, return NEEDS_REVIEW rather than APPROVE. ' +
      'Always return only a valid JSON object with no markdown.',
    prompt,
    tools: VERIFIER_TOOLS,
    dispatchTool: dispatchVerifyTool,
    maxIterations: 8,
  });

  let verdict = {};
  try {
    const match = output.match(/\{[\s\S]*?\}/);
    verdict = JSON.parse(match ? match[0] : output.trim());
  } catch {
    verdict = {
      verified: false, confidence: 0, verdict: 'NEEDS_REVIEW',
      evidence: 'Could not parse verifier output.',
      minority_type: biz.minority_type || 'Unknown',
      certification: 'None',
    };
  }

  const finalMinorityType = verdict.minority_type || biz.minority_type || 'Unknown';
  const prefix = finalMinorityType !== 'Unknown' ? `[${finalMinorityType}-owned] ` : '';
  const desc = prefix + (biz.description || '');

  return {
    ...biz,
    verified:      verdict.verified      ?? false,
    confidence:    verdict.confidence    ?? 0,
    verdict:       verdict.verdict       ?? 'NEEDS_REVIEW',
    evidence:      verdict.evidence      ?? '',
    certification: verdict.certification ?? 'None',
    minority_type: finalMinorityType,
    short_desc:    desc.slice(0, 220) || null,
    description:   desc || null,
  };
}

// ─── CLI args ──────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = flag => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
  return {
    category:   get('--category')   ?? 'Food & Restaurant',
    city:       get('--city')       ?? 'Atlanta',
    state:      get('--state')      ?? 'Georgia',
    stateCode:  get('--state-code') ?? 'GA',
    maxResults: parseInt(get('--max-results') ?? '10', 10),
    noVerify:   args.includes('--no-verify'),
    dryRun:     args.includes('--dry-run'),
  };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const cfg = parseArgs();
  checkEnv(cfg.dryRun);

  console.log('\nRBSW Local Discovery Agent');
  console.log('══════════════════════════');
  console.log(`Category:    ${cfg.category}`);
  console.log(`Location:    ${cfg.city}, ${cfg.state} (${cfg.stateCode})`);
  console.log(`Max results: ${cfg.maxResults}`);
  console.log(`Verify:      ${cfg.noVerify ? 'no' : 'yes'}`);
  console.log(`Dry run:     ${cfg.dryRun ? 'yes — skipping Supabase inserts' : 'no'}\n`);

  // ── Phase 1: Scout ────────────────────────────────────────────────────────
  console.log('[phase 1] Scouting for businesses...\n');
  const businesses = await runScout(cfg);
  console.log(`\n[phase 1] Found ${businesses.length} candidate business${businesses.length !== 1 ? 'es' : ''}\n`);

  if (!businesses.length) {
    console.log('Nothing found. Try a different category or city.');
    return;
  }

  // ── Phase 2: Verify ───────────────────────────────────────────────────────
  const results = { approved: [], needsReview: [], rejected: [] };

  if (cfg.noVerify) {
    // Skip verification — treat everything as NEEDS_REVIEW
    for (const biz of businesses) {
      results.needsReview.push({ ...biz, verdict: 'NEEDS_REVIEW', confidence: 0, evidence: 'Verification skipped.' });
    }
  } else {
    console.log('[phase 2] Verifying ownership...\n');
    for (const biz of businesses) {
      process.stdout.write(`[verify]  ${biz.name}  (${biz.website})\n`);
      const verified = await verifyBusiness(biz);
      console.log(`          → ${verified.verdict}  ${verified.confidence}%  ${verified.minority_type}`);
      if (verified.verdict === 'APPROVE')       results.approved.push(verified);
      else if (verified.verdict === 'NEEDS_REVIEW') results.needsReview.push(verified);
      else                                      results.rejected.push(verified);
    }
  }

  // ── Phase 3: Insert ───────────────────────────────────────────────────────
  const toInsert = [...results.approved, ...results.needsReview];

  if (!cfg.dryRun && toInsert.length) {
    console.log('\n[phase 3] Inserting to Supabase...\n');
    for (const biz of toInsert) {
      // Strip agent-only fields before inserting
      const { verdict, evidence, confidence, ownership_signal, category_label, ...row } = biz;
      try {
        await insertToSupabase({ ...row, status: 'pending' });
        console.log(`[insert]  ✓ ${biz.name}`);
      } catch (err) {
        console.error(`[insert]  ✗ ${biz.name}: ${err.message}`);
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════');
  console.log('Discovery Summary');
  console.log('══════════════════════════');
  console.log(`✅  Approved (pending admin sign-off):  ${results.approved.length}`);
  console.log(`🔍  Needs human review:                 ${results.needsReview.length}`);
  console.log(`❌  Rejected:                           ${results.rejected.length}`);

  if (results.approved.length) {
    console.log('\nApproved:');
    for (const b of results.approved)
      console.log(`  • ${b.name} — ${b.minority_type} — ${b.confidence}% confidence`);
  }
  if (results.needsReview.length) {
    console.log('\nNeeds Review:');
    for (const b of results.needsReview)
      console.log(`  • ${b.name} — ${b.minority_type} — ${b.confidence}% confidence`);
  }

  if (cfg.dryRun) console.log('\n[dry-run] No records were inserted.');
}

main().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
