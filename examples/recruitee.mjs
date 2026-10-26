// Every published offer on one Recruitee careers site, one JSON object per line.
//
//   node examples/recruitee.mjs jobs > jobs.jsonl
//
// Node 22 or later, nothing to install. The company name is the part before .recruitee.com in its
// careers links ("jobs" is the careers site of Tellent, which makes Recruitee). One request returns
// every offer with its text. Recruitee says calls without a token answer HTTP 401 from 10 February
// 2027; the token is made inside the company's own Recruitee account, and this script sends it when
// RECRUITEE_TOKEN is set. Template offers tagged "Sample" are left out and counted.
//
// Endpoint, fields and limits: https://adderleydata.com/guides/recruitee-job-board-api/
// Adderley Data, Melbourne (https://adderleydata.com). Licensed CC BY 4.0: reuse it with a link back.

const company = process.argv[2];
if (!company || company.startsWith('--')) {
  console.error('Usage: node examples/recruitee.mjs <company>');
  process.exit(2);
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "2026-10-05 13:25:03 UTC" → "2026-10-05T13:25:03Z". */
const iso = (value) => (typeof value === 'string' ? value.replace(/^(\d{4}-\d\d-\d\d) (\d\d:\d\d:\d\d) UTC$/, '$1T$2Z') : null);

/** Recruitee writes no pay as nulls, or as "0" and "0". */
function pay(salary) {
  if (!salary) return null;
  const min = Number(salary.min) || null;
  const max = Number(salary.max) || null;
  if (min == null && max == null) return null;
  return { min, max, currency: salary.currency ?? null, per: salary.period ?? null };
}

async function main() {
  const started = Date.now();
  const url = `https://${company}.recruitee.com/api/offers/`;
  const headers = { accept: 'application/json' };
  if (process.env.RECRUITEE_TOKEN) headers['X-Careers-Sites-Token'] = process.env.RECRUITEE_TOKEN;
  const res = await fetch(url, { headers });
  if (res.status === 404) throw new Error(`Recruitee has no careers site named "${company}" (HTTP 404).`);
  if (res.status === 401) throw new Error(`Recruitee asked for a token (HTTP 401): set RECRUITEE_TOKEN to the company's careers site token.`);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  const { offers = [] } = await res.json();

  let samples = 0;
  for (const offer of offers) {
    if ((offer.tags ?? []).includes('Sample')) {
      samples += 1;
      continue;
    }
    const arrangement = [offer.remote && 'remote', offer.hybrid && 'hybrid', offer.on_site && 'on-site'].filter(Boolean);
    console.log(JSON.stringify({
      id: offer.id,
      title: offer.title,
      department: offer.department ?? null,
      city: offer.city ?? null,
      country: offer.country_code ?? null,
      places: (offer.locations ?? []).map((l) => ({ city: l.city ?? null, country: l.country_code ?? null })),
      arrangement, // more than one can be true
      employmentType: offer.employment_type_code ?? null,
      publishedAt: iso(offer.published_at),
      updatedAt: iso(offer.updated_at),
      pay: pay(offer.salary),
      url: offer.careers_url ?? null,
    }));
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.error(`${plural(offers.length - samples, 'offer')} from ${company} (${plural(samples, 'sample offer')} left out), 1 request, ${seconds} s`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
