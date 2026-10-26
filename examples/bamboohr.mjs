// Every open job on one BambooHR careers site, one JSON object per line.
//
//   node examples/bamboohr.mjs acme > acme.jsonl
//   node examples/bamboohr.mjs acme --details 5
//
// Node 22 or later, nothing to install. The company name is the subdomain in its careers links,
// {company}.bamboohr.com/careers. The list is one request: title, department, employment status,
// place and location type. --details N also reads the first N jobs' own records, one request each
// at about 85 a minute: they hold the date posted and the pay as the company wrote it, which the
// list does not.
//
// Endpoints, fields and limits: the BambooHR section of this repository's README.
// Adderley Data, Melbourne (https://adderleydata.com). Licensed CC BY 4.0: reuse it with a link back.

const args = process.argv.slice(2);
const company = args.find((a) => !a.startsWith('--'));
const at = args.indexOf('--details');
const details = at === -1 ? 0 : Number(args[at + 1]);
if (!company || !Number.isInteger(details) || details < 0) {
  console.error('Usage: node examples/bamboohr.mjs <company> [--details N]');
  process.exit(2);
}

const BASE = `https://${encodeURIComponent(company)}.bamboohr.com/careers`;
const LOCATION_TYPES = { 0: 'on-site', 1: 'remote', 2: 'hybrid' };
let requests = 0;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url) {
  requests += 1;
  // A name with no careers site behind it answers a redirect to BambooHR's home page, so the
  // redirect is read here rather than followed.
  const res = await fetch(url, { headers: { accept: 'application/json' }, redirect: 'manual' });
  if (res.status >= 300 && res.status < 400) {
    const to = res.headers.get('location') ?? '';
    if (/expired/.test(to)) throw new Error(`The BambooHR account "${company}" has expired.`);
    throw new Error(`BambooHR has no careers site named "${company}" (redirected to ${to || 'another page'}).`);
  }
  if (res.status === 404) throw new Error(`Not found (HTTP 404): ${url}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

async function main() {
  const started = Date.now();
  const { result: jobs = [] } = await getJson(`${BASE}/list`);

  for (const [i, job] of jobs.entries()) {
    const ats = job.atsLocation ?? {};
    const row = {
      id: job.id,
      title: job.jobOpeningName,
      department: job.departmentLabel ?? null,
      employmentStatus: job.employmentStatusLabel ?? null,
      city: ats.city ?? job.location?.city ?? null,
      state: ats.state ?? ats.province ?? job.location?.state ?? null,
      country: ats.country ?? null,
      locationType: LOCATION_TYPES[job.locationType] ?? null,
      url: `${BASE}/${job.id}`,
    };
    if (i < details) {
      await sleep(700);
      const opening = (await getJson(`${BASE}/${encodeURIComponent(job.id)}/detail`)).result?.jobOpening ?? {};
      row.datePosted = opening.datePosted ?? null;
      row.pay = opening.compensation ?? null; // the company's own words, e.g. "$70,000 - $100,000 per year"
    }
    console.log(JSON.stringify(row));
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.error(`${plural(jobs.length, 'job')} from ${company}, ${plural(requests, 'request')}, ${seconds} s`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
