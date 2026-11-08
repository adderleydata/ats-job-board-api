// Search about 18,000 company job boards at once: one request to Apify's API runs Adderley Data's
// Career Site Jobs Scraper in search mode and prints one JSON object per matching posting.
//
//   APIFY_TOKEN=... node examples/search-every-board.mjs "data engineer" Germany --max 20
//
// Node 22 or later, nothing to install. Unlike the other examples this one needs an Apify account:
// it reads your API token from APIFY_TOKEN and sends it in a header, never in the address. The run
// is charged to your account at the Actor's price, which on 9 November 2026 was US$2.00 per 1,000
// postings saved on Apify's Free and Starter plans and US$0.00005 a run; --max is your cost cap.
//
// The search reads Adderley Data's index of the public job boards of eight systems (Greenhouse,
// Lever, Ashby, Workday, Recruitee, Personio, Pinpoint and JazzHR), refreshed by its own crawl:
// list facts only, no posting text unless you ask for it, and no names, emails or phone numbers.
//
//   node examples/search-every-board.mjs <title words> [place] [--max N] [--days N]
//                                        [--sources greenhouse,lever,...] [--remote]
//
// Separate several title keywords or places with commas: "data engineer,analytics engineer".
// A keyword matches whole words in any order, a plural counting; a place matches whole words,
// and a country also matches postings that name only a state or large city in it.
//
// Endpoint: POST https://api.apify.com/v2/acts/adderleydata~career-site-jobs-scraper/run-sync-get-dataset-items
// Actor and its input: https://apify.com/adderleydata/career-site-jobs-scraper
// Adderley Data, Melbourne (https://adderleydata.com). Licensed CC BY 4.0: reuse it with a link back.

const SYSTEMS = ['greenhouse', 'lever', 'ashby', 'workday', 'recruitee', 'personio', 'pinpoint', 'jazzhr'];
const ENDPOINT = 'https://api.apify.com/v2/acts/adderleydata~career-site-jobs-scraper/run-sync-get-dataset-items';

const usage = 'Usage: APIFY_TOKEN=... node examples/search-every-board.mjs <title words> [place] [--max N] [--days N] [--sources a,b] [--remote]';
const args = process.argv.slice(2);
const positional = [];
const options = { max: 20, days: null, sources: [], remote: false };
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--remote') options.remote = true;
  else if (arg === '--max' || arg === '--days') {
    const n = Number(args[++i]);
    if (!Number.isInteger(n) || n < 1) fail(`${arg} takes a whole number, 1 or more.`, 2);
    options[arg.slice(2)] = n;
  } else if (arg === '--sources') {
    options.sources = list(args[++i] ?? '');
    const unknown = options.sources.filter((s) => !SYSTEMS.includes(s));
    if (unknown.length > 0) fail(`--sources knows ${SYSTEMS.join(', ')}; not ${unknown.join(', ')}.`, 2);
  } else if (arg.startsWith('--')) fail(usage, 2);
  else positional.push(arg);
}
if (positional.length === 0 || positional.length > 2) fail(usage, 2);
if (options.max > 1000) fail('--max is capped at 1,000 here, because this call waits for the run; see the README for bigger runs.', 2);
const token = process.env.APIFY_TOKEN;
if (!token) fail('Set APIFY_TOKEN to your Apify API token (Apify Console: Settings, API & Integrations).', 2);

function list(text) {
  return text.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}
function fail(message, code) {
  console.error(message);
  process.exit(code);
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

async function main() {
  const input = {
    keywords: positional[0].split(',').map((s) => s.trim()).filter(Boolean),
    locations: positional[1] ? positional[1].split(',').map((s) => s.trim()).filter(Boolean) : [],
    maxResults: options.max,
  };
  if (options.days) input.postedWithinDays = options.days;
  if (options.sources.length > 0) input.sources = options.sources;
  if (options.remote) input.workArrangement = ['remote'];

  const started = Date.now();
  const res = await fetch(`${ENDPOINT}?format=json&clean=true`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (res.status === 401) throw new Error('Apify refused the token (HTTP 401): check APIFY_TOKEN.');
  if (res.status === 408) throw new Error('The run took longer than the 300 seconds this call waits (HTTP 408). It is still running: find it under Runs in Apify Console.');
  if (!res.ok) {
    const body = await res.text();
    let detail = body.slice(0, 300);
    try { detail = JSON.parse(body).error?.message ?? detail; } catch {}
    throw new Error(`HTTP ${res.status} from Apify: ${detail}`);
  }
  const rows = await res.json();

  for (const r of rows) {
    console.log(JSON.stringify({
      title: r.title,
      company: r.company?.name ?? null,
      source: r.source,
      board: r.company?.sourceCompanyId ?? null,
      city: r.location?.city ?? null,
      region: r.location?.region ?? null,
      country: r.location?.country ?? null,
      location: r.location?.raw ?? null,
      workArrangement: r.workArrangement ?? null,
      postedAt: r.postedAt ?? null,
      pay: r.salary?.raw ?? null,
      url: r.url,
    }));
  }
  const boards = new Set(rows.map((r) => `${r.source}:${r.company?.sourceCompanyId}`)).size;
  const systems = new Set(rows.map((r) => r.source)).size;
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.error(`${plural(rows.length, 'posting')} from ${plural(boards, 'board')} on ${plural(systems, 'system')}, 1 request, ${seconds} s`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
