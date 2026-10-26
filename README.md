# ATS job board APIs: endpoints, fields and limits, measured

Eleven applicant tracking systems publish a company's open roles where anyone can read them: Ashby, BambooHR, Breezy HR, Greenhouse, JazzHR, Lever, Personio, Recruitee, Rippling, Workable and Workday. For each one this file gives the public endpoint with a curl that works, what a posting holds, how paging works, the limits we measured against the live endpoint, and where it stops. Every reading was taken between 22 September and 27 October 2026 on public, logged-out endpoints. Ten of the sections link to the full page on [adderleydata.com](https://adderleydata.com/guides/), which has the tables and the runs behind the numbers, and five systems have a [runnable example](#runnable-examples) in `examples/`.

## Quick reference

| ATS | Public endpoint | Key to read | Paging | Posting text | Pay |
| --- | --- | --- | --- | --- | --- |
| [Ashby](#ashby) | `GET api.ashbyhq.com/posting-api/job-board/{name}` | None | None: one response | In the list | Structured, with `includeCompensation=true` |
| [BambooHR](#bamboohr) | `GET {company}.bamboohr.com/careers/list` (undocumented) | None for the list; a key for the documented API | None: one response | Job record only | `compensation`, the company's own words, in the job record |
| [Breezy HR](#breezy-hr) | `GET {company}.breezy.hr/json` (undocumented) | None for the feed; a token for the v3 API | None: one response | Posting page only | A sentence, such as "$60,000 – $70,000 / year" |
| [Greenhouse](#greenhouse) | `GET boards-api.greenhouse.io/v1/boards/{token}/jobs` | None | None: one response | With `content=true` | In the text; structured per job with `pay_transparency=true` |
| [JazzHR](#jazzhr) | HTML page `{company}.applytojob.com/apply` | None for the page; a key for the API | None: one page | Posting page only | On some posting pages' structured data |
| [Lever](#lever) | `GET api.lever.co/v0/postings/{site}` (EU: `api.eu.lever.co`) | None | Optional `skip` and `limit` | In the list | `salaryRange`, set on 26% of 2,376 postings read |
| [Personio](#personio) | `GET {company}.jobs.personio.de/xml?language=en` (XML) | None | None: one response | In the feed, in the language asked for | `salaryInformation`, rare |
| [Recruitee](#recruitee) | `GET {company}.recruitee.com/api/offers/` | None until 10 February 2027 | None: one response | In the list | Structured `salary` |
| [Rippling](#rippling) | `GET api.rippling.com/platform/api/ats/v2/board/{slug}/jobs` | None | `pageSize` up to 1,000 | Job record only | `payRangeDetails`, in the job record |
| [Workable](#workable) | `GET www.workable.com/api/accounts/{account}?details=true` | None for this endpoint | None: one response | With `details=true` | No field; in the text |
| [Workday](#workday) | `POST {tenant}.{wd}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` | None | 20 a page, `total` capped at 2,000 | Posting record only | No field; in the text |

## Ashby

```
curl "https://api.ashbyhq.com/posting-api/job-board/ashby?includeCompensation=true"
```

- **The name** is the first part of the path in a company's Ashby links, `jobs.ashbyhq.com/{board_name}` or its `/embed`. It is not case-sensitive, but the API writes it into every `jobUrl` exactly as you sent it, so send it in lower case. An unknown name answers HTTP 404 with the plain-text body `Not Found`.
- **A posting holds** `title`, `department`, `team`, `location`, `secondaryLocations`, `address`, `workplaceType` (`OnSite`, `Remote` or `Hybrid`), `isRemote`, `employmentType` (`FullTime`, `PartTime`, `Intern`, `Contract` or `Temporary`), `descriptionHtml`, `descriptionPlain`, `publishedAt`, `jobUrl`, `applyUrl` and `isListed`, plus `compensation` with `includeCompensation=true`. The work arrangement and the employment type are fields, and pay is data rather than text.
- **No paging:** one request returns every posting with its full text.
- **Measured** on Ashby's own board: 62 postings on 6 October 2026, in one request. On 30 September it listed 67, every one with a yearly pay range, in seven currencies.
- **Where it stops:** it answers what is on the board now, not what changed since your last read. Leave out postings with `isListed` false.

Full page: [Ashby job board API, measured](https://adderleydata.com/guides/ashby-job-board-api/) · Actor: [Ashby Jobs Scraper](https://apify.com/adderleydata/ashby-jobs-scraper)

## BambooHR

```
curl -H "Accept: application/json" "https://demo.bamboohr.com/careers/list"
curl -H "Accept: application/json" "https://demo.bamboohr.com/careers/1/detail"
```

- **Not a documented API.** It is the JSON BambooHR's own careers pages load. BambooHR's [documented API](https://documentation.bamboohr.com/docs/getting-started) authenticates every request, with an API key a user creates inside that company's account or through OAuth, and lists no public job endpoint (checked 27 October 2026). `demo` is BambooHR's own demo site, with one opening.
- **The company name** is the subdomain in `{company}.bamboohr.com/careers`. A name with no account behind it answers HTTP 302 to `https://www.bamboohr.com` on every path, and an expired account answers 302 to its own `/settings/account/expired.php`, so read the redirect rather than follow it. An unknown job id answers HTTP 404 with `{"type":"not_found","title":"Resource not found.",…}`.
- **The list** answers `{"meta": {"totalCount"}, "result": […]}`, every opening with the same 10 keys: `id`, `jobOpeningName` (the title), `departmentId`, `departmentLabel`, `employmentStatusLabel` (the company's own label, such as "Full Time"), `employmentType`, `location` (`city`, `state`), `atsLocation` (`country`, `state`, `province`, `city`), `isRemote` and `locationType` (`"0"` on-site, `"1"` remote, `"2"` hybrid). No date, no pay, no text.
- **The job record**, `/careers/{id}/detail`, answers `{"meta", "result": {"jobOpening", "formFields"}}`. `jobOpening` has 17 keys, among them `datePosted` (a date, `YYYY-MM-DD`), `compensation` (the company's own words, such as "$70,000 - $100,000 per year" or "$40 per hour"), `description` as HTML, `minimumExperience` and `jobOpeningShareUrl`. No field records an edit or a closing date.
- **Measured** directly, not through Apify, on two public boards on 27 October 2026: 138 and 13 openings, 153 requests (each list plus every record), all at the first attempt, in 2 minutes 32 seconds one at a time. `isRemote` was null on all 151 and `locationType` set on all; `atsLocation` named a country on 7 of the smaller board's 13 and on none of the larger board's 138. Pay on 117 of the 151, all as written: 114 with a dollar sign and no currency code, 2 naming the code ("150,000 NZD", "$110,000 – $140,000 CAD per year") and one bare "20".
- **Where it stops:** the list is cheap and thin; the date, the pay and the text cost one request per opening, the pay is free text whose currency is often only a sign, and nothing says which openings changed.

Actor: [BambooHR Jobs Scraper](https://apify.com/adderleydata/bamboohr-jobs-scraper) · Example: [`examples/bamboohr.mjs`](examples/bamboohr.mjs)

## Breezy HR

```
curl "https://{company}.breezy.hr/json"
```

- **Two ways in.** Breezy's documented API, under `api.breezy.hr/v3`, needs a token belonging to a user of that company's account (a personal access token starts `breezy_pat_`), allows 100 requests in each 60 seconds per token, and answers HTTP 400 `missingAccessToken` without one. The career portal's `/json` feed needs no token and is not in Breezy's developer documentation (checked 12 October 2026).
- **The subdomain** is the identifier. An unknown one answers HTTP 404 with an HTML page titled "Career portal not found | Breezy HR"; a posting id the board does not have answers HTTP 302, to the portal's home page.
- **A position holds** the same 11 keys: `id`, `friendly_id`, `name`, `url`, `published_date`, `type`, `location`, `department`, `salary`, `company` and `locations`. `salary` is a sentence with the currency's sign, not its code. The primary place is the one flagged `primary: true` in `locations`, which is not always first. `remote_details` says which kind of remote: `remote`, `remote-location` or `hybrid`.
- **No posting text in the feed.** It is on `https://{company}.breezy.hr/p/{friendly_id}`, whose schema.org JobPosting block also gives the currency's ISO code where pay is stated.
- **Measured** on a public board of 69 positions on 12 October 2026: the feed in one request; the feed plus every posting page, 70 requests in 24 seconds. Posting pages refused 8 of 78 attempts with HTTP 403 from datacentre addresses; the feed answered at the first attempt.
- **Where it stops:** the feed is undocumented, so it can change without notice; the text and the currency code cost one request per position; nothing records an edit.

Full page: [Breezy HR job board API, measured](https://adderleydata.com/guides/breezy-hr-job-board-api/) · Actor: [Breezy HR Jobs Scraper](https://apify.com/adderleydata/breezy-jobs-scraper) · Example: [`examples/breezy-hr.mjs`](examples/breezy-hr.mjs)

## Greenhouse

```
curl "https://boards-api.greenhouse.io/v1/boards/greenhouse/jobs?content=true"
```

- **No key.** Greenhouse's documentation: "Job Board data is publicly available, so authentication is not required for any GET endpoints."
- **The board token** is the first part of the path in `boards.greenhouse.io/{token}`, `job-boards.greenhouse.io/{token}/jobs/{id}` and the embed `boards.greenhouse.io/embed/job_board?for={token}`. An unknown token answers HTTP 404 with `{"status":404,"error":"Job not found"}`, so a typo never reads as an empty board.
- **Endpoints**, all under `https://boards-api.greenhouse.io`: `/v1/boards/{token}/jobs` (`content=true` adds the description, departments and offices), `/v1/boards/{token}/jobs/{id}` (`questions=true` adds the application questions, `pay_transparency=true` adds `pay_input_ranges`), `/v1/boards/{token}`, and `/departments` and `/offices`.
- **A job holds** `id`, `internal_job_id`, `title`, `absolute_url`, `location.name`, `requisition_id`, `first_published` and `updated_at`. The list has no work-arrangement field, and a structured pay range costs one more request per job. `metadata` holds each company's custom fields, which can be anything.
- **Measured** on Greenhouse's own board: 19 roles on 6 October 2026 in one request, in 2 seconds. On 30 September it listed 20: a country on all 20, a city on 1, a pay range in the text on 13.

Full page: [Greenhouse job board API, measured](https://adderleydata.com/guides/greenhouse-job-board-api/) · Actor: [Greenhouse Jobs Scraper](https://apify.com/adderleydata/greenhouse-jobs-scraper)

## JazzHR

```
curl "https://{company}.applytojob.com/apply"
```

- **The documented API**, under `api.resumatorapi.com/v1`, takes the key from the company's own JazzHR account as an `apikey` parameter and returns at most 100 results a call (`/page/2` and on for more). Without a key it answers HTTP 401 `{"error":"apikey not set"}`. It reads the account itself, drafts and applicants included, so it is not a way to read another company's openings.
- **The public career page is HTML.** There is no JSON or XML feed. It lists every open posting in one response, without paging (412 on the largest of 49 boards read on 25 September): the title, a link of the form `https://{company}.applytojob.com/apply/{id}/{Slug}`, the location, and the department when set.
- **Status codes:** an unknown subdomain answers HTTP 302 to JazzHR's page for job seekers; a closed account answers HTTP 200 with a page titled "JazzHR - Inactive Career Page"; a posting no longer on the board answers HTTP 410. Two page layouts are in use (48 of 49 boards had the current one).
- **The posting's page** adds the employment type in words, the text, and on most pages a schema.org JobPosting block with `datePosted`, `employmentType`, the address's locality, region and postcode, and sometimes `baseSalary`. Its `validThrough` was exactly 90 days after `datePosted` on every block read, so it is not a closing date.
- **Measured** on a public board of 125 postings on 12 October 2026: 126 requests, the list plus one page per posting, all at the first attempt, in 1 minute 14 seconds. A JobPosting block on 118 of the 125 pages; pay on 33, 15 of them in the block.

Full page: [JazzHR job board API, measured](https://adderleydata.com/guides/jazzhr-job-board-api/) · Actor: [JazzHR Jobs Scraper](https://apify.com/adderleydata/jazzhr-jobs-scraper)

## Lever

```
curl "https://api.lever.co/v0/postings/employ?mode=json"
```

- **Two hosts.** A board on Lever's EU instance is the same path on `api.eu.lever.co`. One site name can be two different boards, one on each host, so read the host the company's own links use (`jobs.lever.co/{site}` or `jobs.eu.lever.co/{site}`). Lever documents the API in its [postings-api README on GitHub](https://github.com/lever/postings-api), which asks for a key only to submit applications.
- **Case counts:** `employ` answers and `Employ` answers HTTP 404. An unknown site answers HTTP 404 with `{"ok":false,"error":"Document not found"}`.
- **Paging is optional.** `skip` and `limit` page, but without them the largest board we tried returned all 922 postings in one response (13 MB, 3 seconds). `location`, `commitment`, `team`, `department` and `level` filter; `group` groups.
- **A posting holds** `id`, `text` (the title), `categories` (`location`, `commitment`, `team`, `department`, `allLocations`), `country`, `workplaceType`, `opening`, `description` and `descriptionBody` as HTML with plain-text twins ending in `Plain`, `lists`, `additional`, `salaryRange` (`currency`, `interval`, `min`, `max`), `salaryDescription`, `hostedUrl` and `applyUrl`.
- **What the README leaves out,** from 2,376 postings on eight boards on 23 September 2026: `createdAt`, in epoch milliseconds, is the only date, and nothing records an edit; `workplaceType` read `onsite`, without the README's hyphen; `salaryRange` was set on 26%; `descriptionPlain` can lag the HTML; no field names the company.
- **Measured** on Employ's boards (Employ is the company Lever is part of) on 6 October 2026: 4 postings on the global host and 2 different ones on the EU host, two requests, 3 seconds.

Full page: [Lever job board API, measured](https://adderleydata.com/guides/lever-job-board-api/) · Actor: [Lever Jobs Scraper](https://apify.com/adderleydata/lever-jobs-scraper)

## Personio

```
curl "https://personio.jobs.personio.de/xml?language=en"
```

- **`personio` is Personio's own job page.** Personio documents the feed for companies that list their jobs on their own website ("Integration via code" on developer.personio.de), and its help centre says the feed needs no credentials and changes as soon as a job is edited in Personio (both read 26 October 2026). The same board answers on `{company}.jobs.personio.com`; Personio's own board returned the same bytes on both hosts.
- **The company name** is the part before `.jobs.personio.de` in any of its job links; `{company}.personio.de`, without `jobs`, is the company's own sign-in. A name with no board answered HTTP 404 with an HTML "Page Not Found" page on both hosts on 26 October 2026; on 25 September the same request was redirected to personio.com, so test for both.
- **Send the language.** `language` picks the text. Without it, both boards read answered as they did with `language=de`; a code Personio does not have, `xx`, answered 200 with the same positions and no text. A position with no text in the language asked for keeps its other fields and has an empty `<jobDescriptions>`.
- **A position holds**, in the feed's order: `id`, `subcompany` (the legal entity), `office`, `additionalOffices`, `department`, `recruitingCategory`, `name` (the title), `jobDescriptions` (one `<jobDescription>` per section: `<name>` the heading, `<value>` its HTML in CDATA), `employmentType`, `seniority`, `schedule`, `yearsOfExperience`, `keywords`, `occupation`, `occupationCategory` and `createdAt` (ISO 8601 with an offset), with `salaryInformation` where the company has set it. A position's page is `/job/{id}` on the board's host.
- **No paging:** one request returns every position with its text.
- **Measured** on Personio's own job page (1 position) and a public board of 27 on 26 October 2026: 2 requests, both at the first attempt, in 2 seconds; the 27-position feed was 113,249 bytes in English. Text in English on 19 of the 27, pay on none of them.
- **Where it stops:** nothing records an edit or a closing date, remote work shows only in the free-text office label, `salaryInformation` is rare, and some companies add a section to the text naming a recruiter, with an email address and a phone number.

Full page: [Personio job board API, measured](https://adderleydata.com/guides/personio-job-board-api/) · Actor: [Personio Jobs Scraper](https://apify.com/adderleydata/personio-jobs-scraper) · Example: [`examples/personio.mjs`](examples/personio.mjs)

## Recruitee

```
curl "https://jobs.recruitee.com/api/offers/"
```

- **`jobs` is Tellent's own careers site** (Tellent makes Recruitee). The [reference](https://docs.recruitee.com/reference/offers) documents two filters, `department` and `tag`, and no paging; `/api/offers/{id}` returns one offer as `{"offer": {…}}`. An unknown name or id answers HTTP 404 with `{"error":"Not Found"}`.
- **The token deadline.** Recruitee's [authentication page](https://docs.recruitee.com/reference/authentication-1) (read 12 October 2026) gives 10 February 2027 as the date calls without a token stop working, with HTTP 401. The token goes in an `X-Careers-Sites-Token` header and is created inside the company's own Recruitee account, so reading many companies' boards would need one token from each.
- **An offer holds** the same 56 keys. The ones a table needs: `salary` as `{"min", "max", "currency", "period"}` with the amounts as strings (all null, or `"0"` and `"0"`, means none stated); `remote`, `hybrid` and `on_site` as separate booleans, more than one of which can be true; `city`, `state_name`, `postal_code`, `country_code` and `country` for the first place and `locations` for every place; `published_at`, `updated_at`, `created_at` and `close_at`, written as `2026-10-05 13:25:03 UTC` (`close_at` was null on every offer read); `description` and `requirements` as HTML; `employment_type_code`.
- **Watch for** trial accounts under big brands' names that hold only Recruitee's template offer, "Senior Marketer (Sample)", tagged `Sample`; and custom careers domains, which do not reliably lead back to a company's Recruitee name.
- **Measured** on Tellent's board: 13 offers on 12 October 2026, one request, 3 seconds; a yearly pay range in euros on all 13.

Full page: [Recruitee job board API, measured](https://adderleydata.com/guides/recruitee-job-board-api/) · Actor: [Recruitee Jobs Scraper](https://apify.com/adderleydata/recruitee-jobs-scraper) · Example: [`examples/recruitee.mjs`](examples/recruitee.mjs)

## Rippling

```
curl "https://api.rippling.com/platform/api/ats/v2/board/rippling/jobs?groupJobsByLocation=true&page=0&pageSize=1000"
curl "https://api.rippling.com/platform/api/ats/v1/board/rippling/jobs/{id}"
```

- **Two endpoints, the ones the public board calls.** Rippling's developer site has a Job Board API page, but it asks for a Rippling sign-in (checked 6 October 2026). A board lives at `ats.rippling.com/{slug}/jobs`.
- **The list** answers `{"items", "page", "pageSize", "totalItems", "totalPages"}`, each item an `id`, `name` (the title), `url`, `department.name`, `language` and `locations`, every location with a label, a country and its ISO code, a state and its code, a city and a `workplaceType` of `ON_SITE`, `HYBRID` or `REMOTE`. `pageSize` goes to 1,000; 5,000 answered HTTP 400. The older v1 list ignores paging and returns one entry per posting and location: 601 entries for 328 postings. The slug is case-sensitive, and an unknown one answers HTTP 404 with `{"error_code":"RESOURCE_NOT_FOUND","message":"Job Board not found"}`.
- **The record** has what the list lacks: `createdOn` (no field records an edit), `payRangeDetails` (up to three ranges, each with a `location` label, `currency`, `frequency`, `rangeStart`, `rangeEnd` and `isRemote`), `employmentType` (its `label` holds the code and its `id` the words), `companyName`, `department`, `workLocations` and `description` in two HTML parts.
- **Measured** on Rippling's own board: 336 postings on 6 October 2026. A full read took 337 requests, the list plus one record per posting, all at the first attempt, in 3 minutes 17 seconds at 90 requests a minute. Pay on 164; 59 of them give two or three ranges, by location tier or office.
- **Where it stops:** the date and the pay live only in the record, so every full read costs one request per posting, and nothing says which postings changed.

Full page: [Rippling job board API, measured](https://adderleydata.com/guides/rippling-job-board-api/) · Actor: [Rippling Jobs Scraper](https://apify.com/adderleydata/rippling-jobs-scraper) · Example: [`examples/rippling.mjs`](examples/rippling.mjs)

## Workable

```
curl -L "https://www.workable.com/api/accounts/careers?details=true"
```

- **`careers` is Workable's own account.** Workable documents this endpoint for companies building their own careers page, in the help-centre article [Using the Workable API to create a careers page](https://help.workable.com/hc/en-us/articles/115012771647-Using-the-Workable-API-to-create-a-careers-page), with `/locations` and `/departments` under the same address. It answers HTTP 302 to `https://apply.workable.com/api/v1/widget/accounts/{account}?details=true`, so follow the redirect. Workable's full API, under `{subdomain}.workable.com/spi/v3`, needs the account's own token.
- **The account** is the first part of the path on the careers page, `apply.workable.com/{account}/`. An unknown one answers HTTP 404 with the plain-text body `Not Found`. Each job's `url`, `apply.workable.com/j/{shortcode}`, does not name the account.
- **The rate limit.** After about eight requests in forty seconds from one address, `apply.workable.com` answered HTTP 429 with Cloudflare's one-line page `error code: 1015` in place of JSON. The help article gives no limit.
- **A job entry holds** the same 20 keys, in this order: `title`, `shortcode`, `code`, `employment_type`, `telecommuting`, `department`, `url`, `shortlink`, `application_url`, `published_on`, `created_at`, `country`, `city`, `state`, `education`, `experience`, `function`, `industry`, `locations` and `description`. A job open in several places appears once per place with the same `shortcode` (one board had 70 entries for 27 jobs); `locations` flags places the company hides from its careers page with `hidden`; `telecommuting` false means only "not remote"; there is no pay field.
- **Measured** on Workable's own board: one job on 6 October 2026, one request, 2 seconds.

Full page: [Workable job board API, measured](https://adderleydata.com/guides/workable-job-board-api/) · Actor: [Workable Jobs Scraper](https://apify.com/adderleydata/workable-jobs-scraper)

## Workday

```
curl -X POST "https://acme.wd5.myworkdayjobs.com/wday/cxs/acme/External/jobs" \
  -H "Content-Type: application/json" \
  -d '{"appliedFacets": {}, "limit": 20, "offset": 0, "searchText": ""}'
```

- **Not a published API.** It is the JSON every careers site on `myworkdayjobs.com` loads in the visitor's browser. For `https://acme.wd5.myworkdayjobs.com/External` the tenant is `acme`, the host `wd5` and the site `External`; nothing public maps a company's name to those three, so start from its careers link.
- **Limits, measured on 24 September 2026:** 20 a page (a `limit` of 21 or more answers HTTP 400); `total` only on the first page; `total` stops at 2,000 (a board whose filter counts summed to 2,616 reported 2,000), so a larger board is read filter by filter through `appliedFacets`; an offset past the end serves the first page again; the tenant is case-sensitive and the site is not; a locale segment answers 405, the wrong `wd` host or an unknown tenant 422, an unknown site 404.
- **The list is thin:** `title`, `externalPath`, `locationsText`, `postedOn` (relative, up to "Posted 30+ Days Ago"), `remoteType` and `bulletFields`. The record, `GET /wday/cxs/{tenant}/{site}{externalPath}`, holds `jobPostingInfo` with `startDate` (the only absolute date), `timeType`, `location`, `additionalLocations`, `jobRequisitionLocation.country.alpha2Code`, `jobDescription` as HTML, `jobReqId`, `remoteType` and `externalUrl`, and `hiringOrganization.name`. Neither response has a pay field.
- **Measured** on Workday's own careers site: 362 roles in 24 countries on 1 October 2026 took 381 requests, 19 list pages plus one record per role, all at the first attempt, in 4 minutes 21 seconds at 90 requests a minute. A pay range in the text on 235 of the 362.

Full page: [Workday job board API, measured](https://adderleydata.com/guides/workday-job-board-api/) · Actor: [Workday Jobs Scraper](https://apify.com/adderleydata/workday-jobs-scraper)

## Runnable examples

Five of the systems have a script in [`examples/`](examples/) that reads one board and prints one JSON object per posting, with a summary line on stderr: Node 22 or later, nothing to install, no key. Each answers a missing board with a one-line message and exit code 1, and makes its per-posting requests one at a time, at most about 85 a minute. Each was run as printed below on 27 October 2026.

| Script | Run | Requests | Read on 27 October 2026 |
| --- | --- | --- | --- |
| [`bamboohr.mjs`](examples/bamboohr.mjs) | `node examples/bamboohr.mjs demo --details 1` | 1, plus 1 a job with `--details` | BambooHR's demo site: 1 opening with its date and pay, 2 requests |
| [`breezy-hr.mjs`](examples/breezy-hr.mjs) | `node examples/breezy-hr.mjs breezy` | 1 | Breezy HR's own portal: 3 placeholder positions with pay sentences, 1 request |
| [`personio.mjs`](examples/personio.mjs) | `node examples/personio.mjs personio --text` | 1 | Personio's own job page: 1 position with 4 text sections, 1 request |
| [`recruitee.mjs`](examples/recruitee.mjs) | `node examples/recruitee.mjs jobs` | 1 | Tellent's careers site: 12 offers, each with a pay range, 1 request |
| [`rippling.mjs`](examples/rippling.mjs) | `node examples/rippling.mjs rippling --records 3` | 1 a page of 1,000, plus 1 a posting with `--records` | Rippling's own board: 379 postings, 3 with their records, 4 requests |

## Watching boards over time

Each endpoint answers what one company is advertising now. None of the eleven says which postings changed since the last read, and Lever, Rippling, Workable, Breezy HR, Personio and BambooHR record no edit time at all, so seeing a change means keeping each read and comparing it with the next. Country, city, pay and work arrangement often sit in free text, and every company is its own identifier on its own system. The Actors linked above do that work on Apify, one per system, each returning one row per posting in the same schema and, in incremental mode, returning and charging for only postings that are new, changed, back or gone. The [Career Site Jobs Scraper](https://apify.com/adderleydata/career-site-jobs-scraper) takes company names or careers links across fifteen systems and returns one table.

## How these were measured

Logged out, on public endpoints only. The measured runs went through Apify's datacentre addresses at the Actors' default pace, 4 requests at a time and 90 a minute, unless a section says otherwise. Parameters and fields are as each vendor documented them on the date given and as the live endpoint answered; where the two differ, the section says so. Every reading is dated, and the pages on adderleydata.com are the ones kept current.

**No personal data.** Job postings describe roles, and nothing here is read for people. Where a response can carry someone's details (Greenhouse's custom `metadata`, Recruitee's `mailbox_email`, a Personio text section that names a recruiter, the application forms on Recruitee offers and JazzHR posting pages), the Actors linked here never read it, and they redact email addresses and phone numbers inside posting text by default.

**Not affiliated** with, endorsed by or sponsored by any company named here. Ashby, BambooHR, Breezy HR, Greenhouse, JazzHR, Lever, Personio, Recruitee, Rippling, Workable and Workday are trade marks of their owners, used only to say which API each section describes.

Written by [Adderley Data](https://adderleydata.com), Melbourne. The text and the scripts in `examples/` are licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): reuse them with a link back.
