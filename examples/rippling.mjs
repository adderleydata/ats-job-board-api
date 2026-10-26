// Every open posting on one Rippling job board, one JSON object per line.
//
//   node examples/rippling.mjs rippling > rippling.jsonl
//   node examples/rippling.mjs rippling --records 10
//
// Node 22 or later, nothing to install. The board name is the part after ats.rippling.com/ in
// a company's job links, and it is case-sensitive. The list gives title, department and places.
// --records N also reads the job record of the first N postings, one request each at about 85 a
// minute: the record holds the date the job was created, its employment type and its pay ranges,
// which the list does not.
//
// Endpoints, fields and limits: https://adderleydata.com/guides/rippling-job-board-api/
// Adderley Data, Melbourne (https://adderleydata.com). Licensed CC BY 4.0: reuse it with a link back.

const API = 'https://api.rippling.com/platform/api/ats';

const args = process.argv.slice(2);
const board = args.find((a) => !a.startsWith('--'));
const at = args.indexOf('--records');
const records = at === -1 ? 0 : Number(args[at + 1]);
if (!board || !Number.isInteger(records) || records < 0) {
  console.error('Usage: node examples/rippling.mjs <board> [--records N]');
  process.exit(2);
}

let requests = 0;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url) {
  requests += 1;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (res.status === 404) throw new Error(`Rippling has no job board named "${board}" (HTTP 404). Board names are case-sensitive.`);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

async function main() {
  const started = Date.now();
  const postings = [];
  for (let page = 0; ; page += 1) {
    const body = await getJson(`${API}/v2/board/${encodeURIComponent(board)}/jobs?groupJobsByLocation=true&page=${page}&pageSize=1000`);
    postings.push(...(body.items ?? []));
    if (page + 1 >= (body.totalPages ?? 1)) break;
  }

  for (const [i, job] of postings.entries()) {
    const row = {
      id: job.id,
      title: job.name,
      department: job.department?.name ?? null,
      places: (job.locations ?? []).map((l) => ({
        city: l.city ?? null,
        state: l.stateCode ?? l.state ?? null,
        country: l.countryCode ?? null,
        workplace: l.workplaceType ?? null, // ON_SITE, HYBRID or REMOTE
      })),
      url: job.url,
    };
    if (i < records) {
      await sleep(700);
      const record = await getJson(`${API}/v1/board/${encodeURIComponent(board)}/jobs/${encodeURIComponent(job.id)}`);
      row.createdOn = record.createdOn ?? null;
      row.employmentType = record.employmentType?.id ?? null; // the words; `label` holds the code
      row.pay = (record.payRangeDetails ?? []).map((p) => ({
        tier: p.location ?? null,
        currency: p.currency ?? null,
        per: p.frequency ?? null,
        from: p.rangeStart ?? null,
        to: p.rangeEnd ?? null,
      }));
    }
    console.log(JSON.stringify(row));
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.error(`${plural(postings.length, 'posting')} from ${board}, ${plural(requests, 'request')}, ${seconds} s`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
