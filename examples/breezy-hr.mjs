// Every position on one Breezy HR career portal, one JSON object per line.
//
//   node examples/breezy-hr.mjs acme > acme.jsonl
//
// Node 22 or later, nothing to install. The company name is the subdomain of its career portal,
// {company}.breezy.hr. The portal's /json feed needs no token, returns every position in one
// response and is not in Breezy's developer documentation, so it can change without notice. It has
// no posting text: that is on each position's own page, one request each.
//
// Endpoint, fields and limits: https://adderleydata.com/guides/breezy-hr-job-board-api/
// Adderley Data, Melbourne (https://adderleydata.com). Licensed CC BY 4.0: reuse it with a link back.

const company = process.argv[2];
if (!company || company.startsWith('--')) {
  console.error('Usage: node examples/breezy-hr.mjs <company>');
  process.exit(2);
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** One place: city, state, country, and which kind of remote ("remote", "remote-location" or "hybrid"). */
const place = (l) => ({
  city: l.city ?? null,
  state: l.state?.id ?? null,
  country: l.country?.id ?? null,
  remote: l.is_remote ? (l.remote_details?.value ?? 'remote') : null,
});

async function main() {
  const started = Date.now();
  const url = `https://${company}.breezy.hr/json`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (res.status === 404) throw new Error(`Breezy HR has no career portal named "${company}" (HTTP 404).`);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  const positions = await res.json();

  for (const p of positions) {
    const places = (p.locations ?? []).length > 0 ? p.locations : [p.location].filter(Boolean);
    // The primary place is the one flagged primary, which is not always the first.
    const primary = places.find((l) => l.primary) ?? places[0] ?? null;
    console.log(JSON.stringify({
      id: p.id,
      title: p.name,
      type: p.type?.name ?? null,
      department: p.department ?? null,
      place: primary ? place(primary) : null,
      otherPlaces: places.filter((l) => l !== primary).map(place),
      publishedAt: p.published_date ?? null,
      pay: p.salary || null, // a sentence with the currency's sign, as the company wrote it
      url: p.url,
    }));
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.error(`${plural(positions.length, 'position')} from ${company}, 1 request, ${seconds} s`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
