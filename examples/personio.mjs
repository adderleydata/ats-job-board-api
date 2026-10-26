// Every open position on one Personio job page, one JSON object per line.
//
//   node examples/personio.mjs personio > personio.jsonl
//   node examples/personio.mjs personio --language de --text
//
// Node 22 or later, nothing to install. The company name is the part before .jobs.personio.de in
// its job links ({company}.personio.de, without "jobs", is its sign-in page). The feed is one XML
// document holding every position and its text. Send the language: without it the text comes back
// in German, and a position with no text in the language asked for has none. --text adds each
// position's text sections (heading and HTML) to its line.
//
// Endpoint, fields and limits: https://adderleydata.com/guides/personio-job-board-api/
// Adderley Data, Melbourne (https://adderleydata.com). Licensed CC BY 4.0: reuse it with a link back.

const args = process.argv.slice(2);
const company = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--language');
const at = args.indexOf('--language');
const language = at === -1 ? 'en' : args[at + 1];
const withText = args.includes('--text');
if (!company || !/^[a-z]{2}$/i.test(language ?? '')) {
  console.error('Usage: node examples/personio.mjs <company> [--language en] [--text]');
  process.exit(2);
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Text of an XML element's content: CDATA kept as written, entities decoded. */
function text(xml) {
  if (xml == null) return null;
  const cdata = xml.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  if (cdata) return cdata[1].trim();
  const out = xml
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => ENTITIES[e])
    .trim();
  return out === '' ? null : out;
}

/** Every <tag>…</tag> directly in `xml`, in order. Personio's elements do not nest in themselves. */
const all = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1]);
const one = (xml, tag) => all(xml, tag)[0] ?? null;

async function main() {
  const started = Date.now();
  const url = `https://${company}.jobs.personio.de/xml?language=${language.toLowerCase()}`;
  const res = await fetch(url);
  if (res.status === 404) throw new Error(`Personio has no job page named "${company}" (HTTP 404).`);
  if (res.redirected && !new URL(res.url).hostname.endsWith('.jobs.personio.de')) {
    throw new Error(`Personio has no job page named "${company}" (redirected to ${res.url}).`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  const xml = await res.text();

  const positions = all(xml, 'position');
  for (const position of positions) {
    // The text and the further offices hold <name> and <office> elements of their own; read the
    // position's own fields with those blocks taken out.
    const sections = one(position, 'jobDescriptions') ?? '';
    const further = one(position, 'additionalOffices') ?? '';
    const own = position.replace(/<jobDescriptions>[\s\S]*?<\/jobDescriptions>/, '').replace(/<additionalOffices>[\s\S]*?<\/additionalOffices>/, '');
    const salary = one(own, 'salaryInformation');
    const id = text(one(own, 'id'));
    const row = {
      id,
      title: text(one(own, 'name')),
      entity: text(one(own, 'subcompany')),
      office: text(one(own, 'office')),
      furtherOffices: all(further, 'office').map(text).filter(Boolean),
      department: text(one(own, 'department')),
      employmentType: text(one(own, 'employmentType')),
      schedule: text(one(own, 'schedule')),
      createdAt: text(one(own, 'createdAt')),
      pay: salary
        ? { min: text(one(salary, 'min')), max: text(one(salary, 'max')), currency: text(one(salary, 'currencyCode')), per: text(one(salary, 'type')) }
        : null,
      url: `https://${company}.jobs.personio.de/job/${id}`,
    };
    if (withText) {
      row.text = all(sections, 'jobDescription').map((s) => ({ heading: text(one(s, 'name')), html: text(one(s, 'value')) }));
    }
    console.log(JSON.stringify(row));
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.error(`${plural(positions.length, 'position')} from ${company} in ${language.toLowerCase()}, 1 request, ${seconds} s`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
