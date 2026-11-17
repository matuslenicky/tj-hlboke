// Statický generátor webu TJ Družstevník Hlboké: data/ + src/ -> dist/   (node build.js; TODAY=2026-11-17 prepíše dnešný dátum)
// Obsah: zápasy, tabuľky a súpisky zo Sportnetu (data/sportnet.json, scripts/sportnet.mjs), údaje o klube z data/klub.json
// (len zo zverejnených zdrojov: kronika a osobnosti z archívu doterajšieho webu tjhlboke.sk, Wikipédia, Záhorák, Sportnet).
// Podpis vzhľadu „Hlbocké noviny“: v Hlbokom sa v roku 1843 Štúr, Hurban a Hodža dohodli na spisovnej slovenčine a erb obce
// v erbe klubu nesie otvorenú knihu. Web je ako noviny: titul s dátumovým riadkom, rubriky medzi dvojitými linkami, hlavný
// článok o zápase áčka, krátke správy z ostatných tímov, výňatky z kroniky, zápasová karta ako otvorená kniha, tiráž v päte.
// Na telefóne menu „Obsah čísla“ v paneli zľava. Písmo Playfair Display (titulky) a Libre Franklin (text).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'dist');
const rd = (f, def) => { const p = path.join(ROOT, 'data', f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : def; };
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const club = rd('klub.json');
const sn = rd('sportnet.json');
const SPACE = config.sportnet.appSpace;

// ---- pomocné -------------------------------------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const local = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Bratislava', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
const todayISO = () => local.format(new Date()).slice(0, 10);
const TODAY = process.env.TODAY || todayISO();
const DAYS = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];
const DAYS_S = ['ne', 'po', 'ut', 'st', 'št', 'pi', 'so'];
const MONTHS = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december'];
const MONTHS_G = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'];
const dObj = (iso) => new Date(iso + 'T12:00:00Z');
const dShort = (iso) => { const d = dObj(iso); return `${d.getUTCDate()}. ${d.getUTCMonth() + 1}.`; };
const dDay = (iso) => DAYS_S[dObj(iso).getUTCDay()];
const DAYS_ACC = ['v nedeľu', 'v pondelok', 'v utorok', 'v stredu', 'vo štvrtok', 'v piatok', 'v sobotu'];
const dWhen = (iso) => { const d = dObj(iso); return `${DAYS_ACC[d.getUTCDay()]} ${d.getUTCDate()}. ${MONTHS_G[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const dLong = (iso) => { const d = dObj(iso); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()}. ${MONTHS_G[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const dDate = (iso) => { const d = dObj(iso); return `${d.getUTCDate()}. ${MONTHS_G[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const dFull = (iso) => { const d = dObj(iso); return `${d.getUTCDate()}. ${d.getUTCMonth() + 1}. ${d.getUTCFullYear()}`; };
const monthKey = (iso) => iso.slice(0, 7);
const monthName = (key) => { const [y, m] = key.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };
// okamih výkopu s posunom časového pásma (letný čas) pre odpočet v prehliadači
function isoLocal(date, time = '12:00') {
  const [y, mo, d] = date.split('-').map(Number), [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const [ld, lt] = local.format(new Date(guess)).split(' ');
  const shown = Date.UTC(...ld.split('-').map((x, i) => Number(x) - (i === 1 ? 1 : 0)), ...lt.split(':').map(Number));
  const off = (shown - guess) / 6e4;
  return `${date}T${time}:00+${String(Math.floor(off / 60)).padStart(2, '0')}:${String(off % 60).padStart(2, '0')}`;
}
const acc = (league) => league.replace(/\bliga\b/, 'ligu'); // 4. pád: hrajú IV. ligu
const vLige = (league) => `${/^IV\./.test(league) ? 'vo' : 'v'} ${esc(league.replace(/\bliga\b/, 'lige'))}`; // 6. pád: vo IV. lige, v VII. lige
const SEASON = sn.season.replace(/^(\d{4})\/\d\d(\d\d)$/, '$1/$2');
const plural = (n, a, b, c) => `${n} ${n === 1 ? a : n >= 2 && n <= 4 ? b : c}`;
const zo = (n) => `${/^(4|6|7|1[467]|[467]\d)$/.test(String(n)) ? 'zo' : 'z'} ${n}`; // „zo 16“, „z 11“ (podľa výslovnosti čísla)
const num = (n) => Number(n).toLocaleString('sk-SK');
// čitateľný názov súpera (úradné názvy a veľké písmená zo Sportnetu); „Futbalový klub Senica B“ v zozname chýbal -> „FK Senica B“
const nazov = (n) => club.nazvy?.[n] || String(n).replace(/^Futbalový klub\b/, 'FK');

// ---- súťaže, tímy, zápasy ------------------------------------------------------------------------
const compName = (name) => club.sutaze[name] || club.sutaze[name.replace(/\s+/g, ' ').trim()] || name.replace(/\s+/g, ' ').replace(/-ObFZ TN/, ' ObFZ Trenčín').replace(/\s*Macron \| yoursport\s*/, ' ').replace(/-/g, ' ').trim();
const ROUND = (r) => (/^\d+$/.test(r) ? `${r}. kolo` : String(r || '').replace(/\.\s*kolo/i, '. kolo').replace(/Kolo/, 'kolo'));
const teams = sn.teams.map((t) => {
  const league = t.competitions.find((c) => !c.cup);
  // tabuľka prípraviek bez zapísaných výsledkov (všetci 0:0, body len za účasť) by klamala, preto sa neukazuje
  const raw = league ? sn.tables[league.key] : null;
  const table = raw && raw.rows.some((r) => r.gf || r.ga) ? raw : null;
  const pos = table?.rows.find((r) => r.our);
  return {
    ...t, url: `timy/${t.slug}/`, code: t.adult ? t.slug[0] : norm(t.short).replace(/-/g, ''),
    full: t.adult ? t.short : `${t.short} ${t.sub}`,
    leagueName: league ? compName(league.name) : '', leagueKey: league?.key || '', table, pos: pos?.pos || null, of: table?.rows.length || 0,
  };
});
// tímy bez zápasu v sezóne (napr. prihlásený tím bez súťaže) sa na webe neukazujú
for (let i = teams.length - 1; i >= 0; i--) if (!sn.matches.some((m) => m.team === teams[i].slug)) teams.splice(i, 1);
const bySlug = Object.fromEntries(teams.map((t) => [t.slug, t]));
// kolo bez súpera (voľno) vedie Sportnet ako zápas s prázdnym súperom: na webe by z neho bol riadok bez mena
const matches = sn.matches.filter((m) => String(m.opponent || '').trim() && bySlug[m.team]).map((m) => {
  const t = bySlug[m.team];
  const past = m.played || m.date < TODAY;
  let gf = null, ga = null, res = null;
  // prípravky (U11 a mladší) výsledok nezapisujú, Sportnet pri nich dáva 0:0 bez gólov
  if (m.score === '0:0' && !(m.goals || []).length && /^U(\d|1[01])\b/.test(t.short)) m = { ...m, score: null };
  if (m.score) { const [h, a] = m.score.split(':').map(Number); [gf, ga] = m.home ? [h, a] : [a, h]; res = gf > ga ? 'w' : gf < ga ? 'l' : 'd'; }
  const opponent = nazov(m.opponent);
  const slug = `${m.date}-${t.code}-${norm(opponent)}`;
  return { ...m, opponent, past, gf, ga, res, slug, url: `zapasy/${slug}/`, comp: compName(m.competition), roundName: ROUND(m.round), teamObj: t, cup: /cup|pohár/i.test(m.competition) };
});
const teamMatches = (slug) => matches.filter((m) => m.team === slug);
const upcoming = matches.filter((m) => !m.past);
const results = matches.filter((m) => m.past).reverse();
const RES = { w: 'Výhra', d: 'Remíza', l: 'Prehra' };
const RES_S = { w: 'V', d: 'R', l: 'P' };
const noScore = (m) => (m.teamObj.adult ? 'Sportnet výsledok neuvádza' : 'Výsledky prípraviek sa nezapisujú');

// strelci tímu v sezóne (vlastné góly sa nerátajú)
function scorers(slug) {
  const c = new Map();
  for (const m of teamMatches(slug)) for (const g of m.goals || []) if (g.side === 'our' && g.kind !== 'own' && g.player) c.set(g.player, (c.get(g.player) || 0) + 1);
  const sur = (n) => n.split(' ').at(-1); // pri rovnakom počte gólov podľa priezviska
  return [...c].sort((a, b) => b[1] - a[1] || sur(a[0]).localeCompare(sur(b[0]), 'sk') || a[0].localeCompare(b[0], 'sk'));
}
function record(slug, filter = () => true) {
  const r = { w: 0, d: 0, l: 0, gf: 0, ga: 0, n: 0 };
  for (const m of teamMatches(slug)) if (m.res && filter(m)) { r[m.res]++; r.gf += m.gf; r.ga += m.ga; r.n++; }
  return r;
}

// ---- erby ----------------------------------------------------------------------------------------
const CREST_R = 480 / 620; // erb je štít, vyšší než široký
const logoFile = (space) => space && fs.existsSync(path.join(SRC, 'img', 'kluby', `${space}.webp`));
const initials = (name) => String(name).replace(/^(TJ|OŠK|OFK|ŠK|FK|FC|MFK|MŠK|PFK|TFK|PŠK|ZFC|OTJ|AFC|TTS|Telovýchovná jednota)\s+/i, '').split(/[\s-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
function logo(space, name, R, size = 40, eager = false) {
  if (space === SPACE) return `<img class="logo" src="${R}img/erb-128.webp" alt="" width="${Math.round(size * CREST_R)}" height="${size}"${eager ? '' : ' loading="lazy"'} decoding="async">`;
  if (logoFile(space)) return `<img class="logo" src="${R}img/kluby/${space}.webp" alt="" width="${size}" height="${size}"${eager ? '' : ' loading="lazy"'} decoding="async">`;
  return `<span class="logo logo--txt" aria-hidden="true">${esc(initials(name))}</span>`;
}

// ---- ikony (Lucide, ISC) -------------------------------------------------------------------------
const ico = (p, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const I = {
  mail: ico('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>'),
  phone: ico('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
  pin: ico('<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'),
  route: ico('<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>'),
  cal: ico('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  ext: ico('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
  arrow: ico('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  menu: ico('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  close: ico('<path d="M18 6 6 18M6 6l12 12"/>'),
  ball: ico('<circle cx="12" cy="12" r="10"/><path d="m12 7 4.2 3-1.6 5H9.4L7.8 10z"/><path d="M12 2v5M21.5 9.5 16.2 10M18 20l-3.4-5M6 20l3.4-5M2.5 9.5l5.3.5"/>'),
  trophy: ico('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1 1.2C7.8 18.8 7 20.2 7 22M14 14.7V17c0 .6.5 1 1 1.2 1.2.6 2 2 2 3.8M18 2H6v7a6 6 0 0 0 12 0z"/>'),
  music: ico('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  users: ico('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
};

// ---- CSP a rozloženie ----------------------------------------------------------------------------
// GitHub Pages nedovolí hlavičky, preto <meta>: skripty len z webu, jediný inline skript HEAD_JS povolený hashom.
// .flt: zoznam zápasov s filtrom v adrese (?tim=, ?kde=) je neviditeľný, kým ho site.mjs nevyfiltruje (inak skáče);
// pri zlyhaní site.mjs ho odkryje udalosť load
const HEAD_JS = `var d=document.documentElement;d.classList.add('js');if(/[?&](tim|kde)=/.test(location.search)){d.classList.add('flt');addEventListener('load',function(){d.classList.remove('flt')})}`;
const sha256 = (s) => `'sha256-${crypto.createHash('sha256').update(s, 'utf8').digest('base64')}'`;
const CONNECT = ["'self'", ...(config.supabase?.url ? [new URL(config.supabase.url).origin] : [])];
const CSP = [
  "default-src 'none'", `script-src 'self' ${sha256(HEAD_JS)}`, "style-src 'self'", "img-src 'self' data:", "font-src 'self'",
  `connect-src ${CONNECT.join(' ')}`, "base-uri 'none'", "form-action 'none'", "object-src 'none'", "manifest-src 'self'",
].join('; ');

// otvorená kniha z erbu obce (vlastná kresba, farba podľa currentColor)
const book = (cls = 'book') => `<svg class="${cls}" viewBox="0 0 64 44" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M32 9C24 3 12 3 4 6v32c8-3 20-3 28 3 8-6 20-6 28-3V6C52 3 40 3 32 9z"/><path d="M32 9v32"/><path d="M10 13c6-1.5 12-1 17 2M10 20c6-1.5 12-1 17 2M10 27c6-1.5 12-1 17 2M37 15c5-3 11-3.5 17-2M37 22c5-3 11-3.5 17-2M37 29c5-3 11-3.5 17-2" stroke-width="1.6"/></svg>`;
const fleuron = '<span class="fleuron" aria-hidden="true">❦</span>';

// menu: na počítači rubriky medzi dvojitými linkami pod titulom, na telefóne „Obsah čísla“ v paneli zľava (<dialog>)
const NAV = [['zapasy/', 'Zápasy'], ['tabulky/', 'Tabuľky'], ['timy/', 'Tímy'], ['mladez/', 'Mládež'], ['klub/', 'Klub'], ['ihrisko/', 'Ihrisko'], ['kontakt/', 'Kontakt']];
const IH = club.ihrisko;
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${IH.geo.join(',')}`;
const mapyUrl = `https://mapy.com/fnc/v1/showmap?mapset=basic&amp;center=${IH.geo[1]},${IH.geo[0]}&amp;zoom=16&amp;marker=true`; // mapy.com/s/?q= vracia 404
const A = teams[0];
const ligaG = A.leagueName.replace(/^([IVX]+\.) liga\b.*/, '$1 ligy'); // „V. liga Severozápad“ -> „V. ligy“
const DESC = `${club.nazov} – futbal v Hlbokom od roku ${club.futbalOd}. Zápasy, výsledky, tabuľky a súpisky áčka (${A.leagueName}) aj mládeže, kronika klubu a ihrisko na Lúčkach.`;
const nextHome = upcoming.find((m) => m.home && m.team === A.slug);
// obsah čísla: rubriky s počtom položiek (namiesto čísel strán)
const TOC = {
  'zapasy/': plural(matches.length, 'zápas', 'zápasy', 'zápasov'),
  'tabulky/': plural(teams.filter((t) => t.table).length, 'tabuľka', 'tabuľky', 'tabuliek'),
  'timy/': plural(teams.length, 'tím', 'tímy', 'tímov'),
  'mladez/': plural(teams.filter((t) => !t.adult).length, 'tím', 'tímy', 'tímov'),
  'klub/': `od roku ${club.futbalOd}`,
  'ihrisko/': 'na Lúčkach',
  'kontakt/': 'e-mail, adresa',
};
const played = matches.filter((m) => m.team === A.slug && m.score).length;

function layout({ route, title, desc, body, active, bodyClass = '' }) {
  const depth = route.split('/').filter(Boolean).length;
  const R = depth ? '../'.repeat(depth) : './';
  const cur = (u) => (active && active === u ? ' aria-current="page"' : '');
  const fullTitle = (config.ukazka ? 'Návrh webu – ' : '') + (route ? `${title} | ${club.nazov}` : `${club.nazov} – ${title}`);
  const canon = config.siteUrl ? `${config.siteUrl}${route}` : '';
  const ld = route ? '' : `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'SportsClub', name: club.nazov, legalName: club.pravnyNazov, sport: 'Futbal', foundingDate: String(club.zalozenie),
    email: club.kontakt.email,
    address: { '@type': 'PostalAddress', streetAddress: club.adresa[0], postalCode: club.adresa[1].slice(0, 6), addressLocality: club.mesto, addressCountry: 'SK' },
    location: { '@type': 'StadiumOrArena', name: IH.nazov, geo: { '@type': 'GeoCoordinates', latitude: IH.geo[0], longitude: IH.geo[1] } },
    sameAs: [club.sportnetUrl, club.obecUrl],
  }).replace(/</g, '\\u003c')}</script>`;
  const li = ([u, t]) => `<li><a href="${R}${u}"${cur(u)}>${t}</a></li>`;
  const toc = ([u, t]) => `<li><a href="${R}${u}"${cur(u)}><span class="toc-t">${t}</span><span class="toc-dots" aria-hidden="true"></span><span class="toc-n">${TOC[u]}</span></a></li>`;
  return `<!doctype html>
<html lang="sk" data-root="${R}"${config.ukazka ? ' class="has-demo"' : ''}>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc || DESC)}">
${config.noindex ? '<meta name="robots" content="noindex">\n' : ''}${canon ? `<link rel="canonical" href="${canon}">\n` : ''}<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="sk_SK">
<meta name="theme-color" content="#f5f0e3">
<link rel="icon" type="image/png" href="${R}img/favicon.png">
<link rel="apple-touch-icon" href="${R}img/apple-touch-icon.png">
<link rel="preload" href="${R}fonts/playfair-display-900.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="${R}fonts/playfair-display-700.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="${R}fonts/libre-franklin-400.woff" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="${R}css/site.css">
<script>${HEAD_JS}</script>
<script type="module" src="${R}js/site.mjs"></script>
${ld}</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
<a class="skip" href="#obsah">Preskočiť na obsah</a>
${config.ukazka ? '<p class="demo">Návrh webu · nie je to oficiálna stránka klubu</p>' : ''}
<header class="mast">
  <div class="wrap">
    <p class="mast-line"><span>Futbal od roku ${club.futbalOd}</span><span class="mast-mid">Hlboké, okres Senica</span><span>Sezóna ${SEASON} · číslo ${played}</span></p>
    <div class="mast-in">
      ${route ? '' : '<h1 class="mast-h1">'}<a class="mast-name" href="${R}"${route ? '' : ' aria-current="page"'}><img src="${R}img/erb-128.webp" alt="" width="40" height="52"><span>${esc(club.nazov)}</span><span class="sr">, úvod</span></a>${route ? '' : '</h1>'}
      <button class="menu-btn" type="button" aria-haspopup="dialog" aria-controls="menu">${I.menu}<span>Obsah</span></button>
    </div>
    <p class="mast-motto">Futbalové noviny z obce, kde sa v roku 1843 dohodli na spisovnej slovenčine</p>
  </div>
  <nav class="nav" aria-label="Hlavné menu"><div class="wrap"><ul><li><a href="${R}"${route ? '' : ' aria-current="page"'}>Titulná strana</a></li>${NAV.map(li).join('')}</ul></div></nav>
</header>
<dialog class="menu" id="menu" aria-label="Obsah čísla">
  <div class="menu-top"><span class="menu-name">Obsah čísla</span><button class="menu-x" type="button" data-close>${I.close}<span>Zavrieť</span></button></div>
  <nav aria-label="Menu na telefóne"><ul class="toc-list"><li><a href="${R}"${route ? '' : ' aria-current="page"'}><span class="toc-t">Titulná strana</span><span class="toc-dots" aria-hidden="true"></span><span class="toc-n">${SEASON}</span></a></li>${NAV.map(toc).join('')}</ul></nav>
  <p class="menu-foot">${book('book book--s')}<a href="mailto:${club.kontakt.email}">${esc(club.kontakt.email)}</a></p>
</dialog>
<main id="obsah">
${body}
</main>
<footer class="ftr">
  <div class="wrap">
    <div class="ftr-grid">
      <div class="ftr-club">
        <img src="${R}img/erb-240.webp" alt="" width="70" height="90" loading="lazy">
        <div><p class="ftr-name">${esc(club.nazov)}</p><p class="ftr-motto">Futbal v Hlbokom od roku ${club.futbalOd}, na Lúčkach od roku 1952.</p></div>
      </div>
      <div><h2 class="ftr-h">Ihrisko</h2><p>${esc(IH.nazov)}<br>${IH.adresa.map(esc).join(', ')}</p><p><a href="${mapsUrl}" rel="noopener">Navigovať na ihrisko</a></p>${nextHome ? `<p>Najbližšie doma: <a href="${R}${nextHome.url}">${dShort(nextHome.date)} o ${esc(nextHome.time || '')} proti ${esc(nextHome.opponent)}</a></p>` : ''}</div>
      <div><h2 class="ftr-h">Redakcia</h2><p>${esc(club.pravnyNazov)}<br>${club.adresa.map(esc).join(', ')}<br><a href="mailto:${club.kontakt.email}">${esc(club.kontakt.email)}</a></p></div>
      <div><h2 class="ftr-h">Pramene</h2><p>Výsledky zo Sportnetu (Futbalnet), aktualizované ${dFull(sn.updated.slice(0, 10))}. Kronika a osobnosti z doterajšieho webu klubu.</p><p><a href="${club.sportnetUrl}" rel="noopener">Klub na Sportnete</a></p></div>
    </div>
  </div>
  <div class="ftr-bar"><div class="wrap ftr-bar-in"><span>© ${new Date().getFullYear()} ${esc(club.pravnyNazov)}</span><a href="${R}ochrana-sukromia/">Ochrana súkromia</a>${config.adminDemo ? `<a href="${R}admin/">Administrácia (ukážka)</a>` : ''}</div></div>
</footer>
</body>
</html>
`;
}

// ---- spoločné bloky ------------------------------------------------------------------------------
// hlavička podstránky: titulok článku na papieri, pod ním dvojitá linka (CSS)
const pageHead = ({ title, sub = '', crumbs = [], R, aside = '' }) => `<section class="phead"><div class="wrap phead-in">
  <div>${crumbs.length ? `<nav class="crumbs" aria-label="Omrvinky"><a href="${R}">Úvod</a>${crumbs.map(([u, t]) => u ? `<a href="${R}${u}">${esc(t)}</a>` : `<span aria-current="page">${esc(t)}</span>`).join('')}</nav>` : ''}
  <h1 class="h1">${esc(title)}</h1>${sub ? `<p class="phead-sub">${sub}</p>` : ''}</div>${aside}
</div></section>`;
const secHead = (h, id, moreLink = '', eyebrow = '') => `<div class="sec-head"><div>${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<h2 class="h2" id="${id}">${h}</h2></div>${moreLink}</div>`;
const more = (href, t) => `<a class="more" href="${href}">${t}${I.arrow}</a>`;
const venueName = (v) => v.replace(/\s+/g, ' ').trim();

// zápasová karta: otvorená kniha (dve strany a chrbát v strede), výsledok na chrbte
function card(m, R, { big = false, label = '', self = false } = {}) {
  const ourName = m.teamObj.adult ? club.nazov : `${club.nazov} ${m.teamObj.short}`;
  const us = { name: ourName, space: SPACE }, them = { name: m.opponent, space: m.oppSpace };
  const [h, a] = m.home ? [us, them] : [them, us];
  const lbl = label || (m.score || m.past ? 'Posledný zápas' : 'Najbližší zápas');
  const side = (t, role) => `<div class="mp-side${t.space === SPACE ? ' is-us' : ''}"><span class="mp-crest">${logo(t.space, t.name, R, big ? 56 : 44, big)}</span><span class="mp-name">${esc(t.name)}</span><span class="mp-role">${role}</span></div>`;
  let mid, note = '';
  if (m.score) { mid = `<span class="sr">Výsledok </span>${esc(m.score).replace(':', '<span class="mp-colon">:</span>')}`; note = `<span class="mp-res mp-res--${m.res}">${RES[m.res]}</span>${m.half ? `<span>polčas ${esc(m.half)}</span>` : ''}`; }
  else if (m.past) { mid = '<span aria-hidden="true">–</span>'; note = `<span>${noScore(m)}</span>`; }
  else { mid = `<span class="mp-time"><span class="sr">Výkop o </span>${esc(m.time || '–')}</span>`; note = `<span class="cd" data-kickoff="${isoLocal(m.date, m.time)}" hidden></span>`; }
  const links = [];
  if (m.score && m.detail && !self) links.push(`<a class="mp-a" href="${R}${m.url}">Priebeh a zostavy${I.arrow}</a>`);
  // na stránke zápasu je pod kartou tlačidlo „Pridať do kalendára“, odkaz v karte by bol druhý na ten istý súbor
  if (!m.past && !self) links.push(`<a class="mp-a" href="${R}kalendar/zapas-${m.id}.ics" download>${I.cal}Do kalendára</a>`);
  const meta = [esc(m.comp) + (m.roundName ? `, ${esc(m.roundName)}` : ''), m.venue ? esc(venueName(m.venue)) : '', m.audience ? plural(m.audience, 'divák', 'diváci', 'divákov') : ''].filter(Boolean);
  // skóre s 3 a viac číslicami (prípravky: „1:27“) zúži strany karty a „Družstevník“ by sa na telefóne lámal uprostred
  const wide = m.score && m.score.replace(/\D/g, '').length >= 3;
  return `<article class="mp${big ? ' mp--big' : ''}${wide ? ' mp--wide' : ''}">
  <p class="mp-top"><span class="mp-label">${esc(lbl)}</span><span>${esc(m.teamObj.full)}</span></p>
  <p class="mp-when"><time datetime="${m.date}">${dLong(m.date)}</time></p>
  <div class="mp-row">${side(h, 'domáci')}<p class="mp-score">${mid}</p>${side(a, 'hostia')}</div>
  <p class="mp-note">${note}</p>
  <p class="mp-meta">${meta.join('<span aria-hidden="true">&nbsp;· </span>')}</p>
  ${links.length ? `<p class="mp-links">${links.join('')}</p>` : ''}
</article>`;
}

// riadok zápasu ako v novinách: program ako televízny program (čas, bodkovaná čiara, zápas), výsledky ako výsledkový servis
// (domáci – hostia, bodkovaná čiara, skóre tučne); bez erbov, tímy a súťaž kapitálkami
function matchRow(m, R, { showTeam = true } = {}) {
  const us = m.teamObj.adult ? club.kratky : `${club.kratky} ${m.teamObj.short}`;
  const [h, a] = m.home ? [us, m.opponent] : [m.opponent, us];
  const title = `${m.home ? `<b>${esc(h)}</b>` : esc(h)} – ${m.home ? esc(a) : `<b>${esc(a)}</b>`}`;
  const href = m.detail || !m.past ? ` href="${R}${m.url}"` : '';
  const tag = href ? 'a' : 'div';
  const kick = `${showTeam ? `${esc(m.teamObj.short)}&nbsp;· ` : ''}${m.home ? 'doma' : 'vonku'}&nbsp;· ${esc(m.cup ? m.comp : m.roundName || m.comp)}`;
  if (!m.past) {
    return `<li class="mrow mrow--tv" data-team="${m.team}" data-where="${m.home ? 'doma' : 'vonku'}"><${tag} class="tv"${href}>
  <span class="tv-t"><span class="tv-d">${dDay(m.date)} ${dShort(m.date)}</span><time datetime="${isoLocal(m.date, m.time)}">${esc(m.time || '–')}</time></span>
  <span class="tv-b"><span class="tv-h">${title}</span><span class="tv-k">${kick}</span></span>
</${tag}></li>`;
  }
  const score = m.score
    ? `<span class="rs-s"><span class="sr">${RES[m.res]}, </span>${esc(m.score)}<sup class="rs-r rs-r--${m.res}" aria-hidden="true">${RES_S[m.res]}</sup></span>`
    : `<span class="rs-s rs-s--none">${m.teamObj.adult ? 'bez výsledku' : 'bez zápisu'}</span>`;
  return `<li class="mrow mrow--rs" data-team="${m.team}" data-where="${m.home ? 'doma' : 'vonku'}"><${tag} class="rs"${href}>
  <span class="rs-k"><time datetime="${m.date}">${dDay(m.date)} ${dShort(m.date)}</time>&nbsp;· ${kick}</span>
  <span class="rs-l"><span class="rs-h">${title}</span><span class="rs-dots" aria-hidden="true"></span>${score}</span>
</${tag}></li>`;
}
const matchList = (list, R, opts) => `<ol class="mlist">${list.map((m) => matchRow(m, R, opts)).join('')}</ol>`;

function tableHtml(tb, R, { compact = false, caption = '' } = {}) {
  let rows = tb.rows;
  if (compact) { const i = rows.findIndex((r) => r.our); const from = Math.max(0, Math.min(i - 2, rows.length - 5)); rows = rows.slice(from, from + 5); }
  return `<div class="tbl-wrap"><table class="tbl">${caption ? `<caption>${caption}</caption>` : ''}
  <thead><tr><th scope="col"><abbr title="Poradie">#</abbr></th><th scope="col" class="tl">Tím</th><th scope="col"><abbr title="Zápasy">Z</abbr></th><th scope="col" class="hm"><abbr title="Výhry">V</abbr></th><th scope="col" class="hm"><abbr title="Remízy">R</abbr></th><th scope="col" class="hm"><abbr title="Prehry">P</abbr></th><th scope="col">Skóre</th><th scope="col"><abbr title="Body">B</abbr></th></tr></thead>
  <tbody>${rows.map((r) => `<tr${r.our ? ' class="our"' : ''}><td class="pos">${r.pos}</td><th scope="row" class="tl"><span class="tteam">${logo(r.space, r.name, R, 24)}<span>${esc(nazov(r.name))}</span></span></th><td>${r.played}</td><td class="hm">${r.won}</td><td class="hm">${r.draw}</td><td class="hm">${r.lost}</td><td class="nw">${r.gf}:${r.ga}</td><td><b>${r.pts}</b></td></tr>`).join('')}</tbody>
</table></div>`;
}
const formHtml = (slug, n = 5) => {
  const last = teamMatches(slug).filter((m) => m.res).slice(-n);
  return last.length ? `<ol class="form" aria-label="Forma: ${last.length === 1 ? 'posledný zápas' : last.length <= 4 ? `posledné ${last.length} zápasy` : `posledných ${last.length} zápasov`}">${last.map((m) => `<li class="res-bg--${m.res}" title="${dShort(m.date)} ${esc(m.opponent)} ${m.score}"><span aria-hidden="true">${RES_S[m.res]}</span><span class="sr">${RES[m.res]} ${esc(m.opponent)} ${m.score}</span></li>`).join('')}</ol>` : '';
};

// kalendár zápasov (.ics): odber cez webcal/Google doplní site.mjs, inak stiahnutie
const calBox = (file, R, id) => `<details class="cal" data-cal id="${id}">
  <summary class="btn btn--line">${I.cal}<span>Zápasy do kalendára</span></summary>
  <div class="cal-pop">
    <a class="cal-o" data-webcal href="${R}kalendar/${file}" hidden><b>Odoberať v telefóne</b><span>iPhone, Mac, Outlook – rozpis sa sám aktualizuje</span></a>
    <a class="cal-o" data-gcal href="${R}kalendar/${file}" rel="noopener" hidden><b>Pridať do Google Kalendára</b><span>aj pre Android</span></a>
    <a class="cal-o" data-ics href="${R}kalendar/${file}" download><b>Stiahnuť súbor .ics</b><span>jednorazovo, bez aktualizácií</span></a>
  </div>
</details>`;

// výber zápasu: zápas v najbližších 7 dňoch, inak posledný odohraný (zimná prestávka), inak najbližší
function cardPick(slug) {
  const list = teamMatches(slug);
  const next = list.find((m) => !m.past);
  const last = [...list].reverse().find((m) => m.past && (m.score || !m.teamObj.adult));
  const soon = next && (dObj(next.date) - dObj(TODAY)) / 864e5 <= 7;
  return soon ? next : last || next;
}

// krátke správy: posledný výsledok alebo najbližší zápas každého tímu ako novinová správička
function telegrams(R, list) {
  return `<ul class="tg">${list.map((t) => {
    const m = cardPick(t.slug);
    if (!m) return '';
    const href = m.detail || !m.past ? `${R}${m.url}` : `${R}${t.url}`;
    const right = m.score
      ? `<span class="tg-score res-bg--${m.res}"><span class="sr">${RES[m.res]} </span>${esc(m.score)}</span>`
      : m.past ? '<span class="tg-score tg-score--none">bez výsl.</span>' : `<span class="tg-score tg-score--time">${esc(m.time || '')}</span>`;
    return `<li><a class="tg-row" href="${href}">
    <span class="tg-k">${esc(t.short)}&nbsp;· ${m.past ? 'posledný' : 'najbližší'}&nbsp;· ${dDay(m.date)} ${dShort(m.date)}</span>
    <span class="tg-h">${m.home ? 'doma' : 'vonku'}: ${esc(m.opponent)}</span>
    ${right}
  </a></li>`;
  }).join('')}</ul>`;
}

// hlavný článok titulnej strany: posledný (alebo najbližší) zápas áčka
function leadStory(R, m) {
  if (!m) return '';
  const us = club.kratky, [h, a] = m.home ? [us, m.opponent] : [m.opponent, us];
  const ours = (m.goals || []).filter((g) => g.side === 'our' && g.player);
  const theirs = (m.goals || []).filter((g) => g.side === 'opp' && g.player);
  // góly jedného hráča spolu: „Bakary Jatta (17., 70.)“ namiesto dvoch záznamov s tým istým menom
  const gl = (l) => {
    const by = new Map();
    for (const g of l) { if (!by.has(g.player)) by.set(g.player, []); by.get(g.player).push(`${esc(g.min)}.${g.kind === 'penalty' ? ' z penalty' : g.kind === 'own' ? ' vlastný' : ''}`); }
    return [...by].map(([p, mins]) => `${esc(p)} (${mins.join(', ')})`).join(', ');
  };
  const kicker = `${m.score ? 'Posledný zápas áčka' : 'Najbližší zápas áčka'} · ${esc(m.comp)}${m.roundName ? `, ${esc(m.roundName)}` : ''}`;
  const dek = m.score
    ? [ours.length ? `Góly Hlbokého: ${gl(ours)}.` : 'Hlboké tentoraz neskórovalo.', theirs.length ? `Za súpera: ${gl(theirs)}.` : ''].filter(Boolean).join(' ')
    : `${dWhen(m.date)}${m.time ? ` o ${esc(m.time)}` : ''}, ${m.home ? 'doma na Lúčkach' : `na ihrisku súpera${m.venue ? ` (${esc(venueName(m.venue))})` : ''}`}.`;
  return `<article class="lead">
  <p class="kicker">${kicker}</p>
  <h2 class="lead-h"><a href="${R}${m.url}">${esc(h)} – ${esc(a)}${m.score ? ` <span class="nw">${esc(m.score.replace(':', ' : '))}</span>` : ''}</a></h2>
  <p class="lead-dek">${dek}</p>
  <p class="lead-meta"><time datetime="${m.date}">${dLong(m.date)}</time>${m.venue ? ` · ${esc(venueName(m.venue))}` : ''}${m.audience ? ` · ${plural(m.audience, 'divák', 'diváci', 'divákov')}` : ''}</p>
</article>`;
}

// výňatok z kroniky: zápis kronikára z apríla 1945
const chronicle = (cls = '') => `<figure class="chron${cls ? ` ${cls}` : ''}">${fleuron}<blockquote><p>„${esc(club.kronika.citat)}“</p></blockquote><figcaption>${esc(club.kronika.autor)}</figcaption></figure>`;

// Hlboké 1843: otvorená kniha z erbu obce, Štúr, Hurban a Hodža
function box1843(R, full = false) {
  const o = club.obec;
  return `<aside class="b1843" aria-labelledby="b1843-h">
  ${book()}
  <p class="kicker">Hlboké 1843</p>
  <h2 class="b1843-h" id="b1843-h">Otvorená kniha v erbe</h2>
  <p>${esc(o.text)} Otvorená kniha v erbe obce je aj v spodnej časti erbu klubu.</p>
  ${full ? `<ul class="people">${o.osobnosti.map((p) => `<li><b>${esc(p.meno)}</b><span>${esc(p.text)}</span></li>`).join('')}</ul><p>${esc(o.pamiatky)}</p>` : ''}
  <p class="src">Zdroj: Wikipédia (Hlboké).${full ? '' : ` <a href="${R}klub/#obec">O obci</a>`}</p>
</aside>`;
}

// tímy podľa vekových skupín
const GROUPS = [['Muži', (t) => t.adult], ['Dorast', (t) => /dorast/i.test(t.sub)], ['Žiaci', (t) => /žiaci/i.test(t.sub)], ['Prípravka', (t) => /prípravka/i.test(t.sub)]];
function teamGrid(R, only = () => true) {
  return '<div class="tgroups">' + GROUPS.map(([g, f]) => [g, teams.filter((t) => f(t) && only(t))]).filter(([, l]) => l.length).map(([g, l]) => `<section class="tgroup" aria-label="${g}"><h3 class="tgroup-h">${g}</h3><ul class="tgrid">${l.map((t) => `<li class="tcard${t.adult ? ' tcard--a' : ''}"><a href="${R}${t.url}">
  <span class="tcard-n">${esc(t.short)}</span>
  <span class="tcard-s">${esc(t.adult ? 'Muži' : t.sub)}</span>
  <span class="tcard-l">${esc(t.leagueName)}</span>
  ${t.pos ? `<span class="tcard-p"><b>${t.pos}.</b> ${zo(t.of)}</span>` : '<span class="tcard-p">bez tabuľky</span>'}
  ${coachOf(t) ? `<span class="tcard-k">tréner ${esc(coachOf(t))}</span>` : ''}
</a></li>`).join('')}</ul></section>`).join('') + '</div>';
}

// ---- stránky -----------------------------------------------------------------------------------
const pages = [];
const add = (route, opts) => pages.push({ route, ...opts });
const crewRole = { coach: 'Tréner', assist_coach: 'Asistent trénera', coach_goalkeepers: 'Tréner brankárov', manager: 'Vedúci mužstva', doctor: 'Lekár', physiotherapist: 'Fyzioterapeut', masseur: 'Masér', club_representative: 'Zástupca klubu', security_manager: 'Hlavný usporiadateľ', other: 'Člen realizačného tímu' };
const POS = [['goalkeeper', 'Brankári'], ['defender', 'Obrancovia'], ['midfielder', 'Stredopoliari'], ['forward', 'Útočníci'], ['', 'Hráči']];
const coachOf = (t) => t.squad.crew.find((c) => c.role === 'coach')?.name || '';

// úvod = titulná strana
add('', {
  title: `futbal v Hlbokom od roku ${club.futbalOd}`, active: '', bodyClass: 'home',
  body: (R) => {
    const nextAll = upcoming.slice(0, 6);
    const lastAll = results.filter((m) => m.score).slice(0, 6);
    const lg = record(A.slug, (m) => !m.cup);
    const top = scorers(A.slug);
    // traja hráči so 4 gólmi: „Najlepším strelcom je Adam Zubák“ by klamalo, pri zhode sa vymenujú všetci
    const lead = top.filter(([, g]) => g === top[0]?.[1]), lg2 = top[0] ? plural(top[0][1], 'gól', 'góly', 'gólov') : '';
    const names = lead.map(([n]) => esc(n)), andList = names.length > 1 ? `${names.slice(0, -1).join(', ')} a ${names.at(-1)}` : names[0];
    const topText = !lead.length ? '' : lead.length === 1 ? `Najlepším strelcom je ${andList} (${lg2}).`
      : lead.length <= 3 ? `Najlepšími strelcami sú ${andList}, každý má ${lg2}.`
      : `Najviac gólov (${top[0][1]}) ${lead.length <= 4 ? 'majú' : 'má'} ${plural(lead.length, 'hráč', 'hráči', 'hráčov')}.`;
    const row = A.table?.rows.find((r) => r.our);
    const winterNext = upcoming[0];
    const aNext = upcoming.find((m) => m.team === A.slug);
    const winter = winterNext && (dObj(winterNext.date) - dObj(TODAY)) / 864e5 > 14;
    const winterText = !winterNext ? '' : aNext && aNext.date === winterNext.date
      ? `Jar sa začína ${dWhen(winterNext.date)}, áčko v ten deň hrá ${aNext.home ? 'doma proti' : 'vonku na ihrisku'} ${esc(aNext.opponent)}.`
      : `Prvé jarné zápasy sú ${dWhen(winterNext.date)} (${esc(winterNext.teamObj.full)})${aNext ? `, áčko začína ${dWhen(aNext.date)} ${aNext.home ? 'doma proti' : 'vonku na ihrisku'} ${esc(aNext.opponent)}` : ''}.`;
    const aPick = cardPick(A.slug);
    const others = teams.filter((t) => t !== A);
    const keyYears = club.historia.filter((h) => ['1932', '1934', '1952', '1972'].includes(h.rok));
    const masrna = club.odchovanci.zoznam[0];
    return `<section class="front" aria-label="Titulná strana"><div class="wrap front-grid">
  <div class="front-main">
    ${leadStory(R, aPick)}
    ${aPick ? card(aPick, R, { big: true }) : ''}
    <p class="dropcap">Áčko hrá ${esc(acc(A.leagueName))} ako nováčik. ${row ? `${winter ? 'Po jeseni' : `Po ${lg.n} zápasoch`} je na ${A.pos}. mieste ${zo(A.of)} s ${plural(row.pts, 'bodom', 'bodmi', 'bodmi')}: ${plural(lg.w, 'výhra', 'výhry', 'výhier')}, ${plural(lg.d, 'remíza', 'remízy', 'remíz')}, ${plural(lg.l, 'prehra', 'prehry', 'prehier')}, skóre ${lg.gf}:${lg.ga}.` : ''} ${topText} Na záhorácke derby nováčikov v Senici prišlo v auguste 850 divákov.</p>
    <p class="btns"><a class="btn btn--ink" href="${R}zapasy/">Program a výsledky</a><a class="btn btn--line" href="${R}tabulky/#${A.slug}">Tabuľka ${esc(ligaG)}</a></p>
  </div>
  <aside class="front-side">
    <h2 class="col-h">Správy z tímov</h2>
    ${telegrams(R, others)}
    ${A.table ? `<h2 class="col-h">Tabuľka ${esc(ligaG)}</h2>${tableHtml(A.table, R, { compact: true, caption: '<span class="sr">Výrez tabuľky okolo TJ Družstevník Hlboké</span>' })}${more(`${R}tabulky/#${A.slug}`, 'Celá tabuľka')}` : ''}
  </aside>
</div></section>
${winterText && winter ? `<section class="pause"><div class="wrap"><p><b>Zimná prestávka.</b> ${winterText}</p></div></section>` : ''}
<section class="sec" aria-labelledby="prog-h"><div class="wrap">
  ${secHead('Program a výsledky', 'prog-h', more(`${R}zapasy/`, 'Všetky zápasy'))}
  <div class="cols2 cols2--rule">
    <div><h3 class="h3">Najbližšie</h3>${matchList(nextAll, R)}</div>
    <div><h3 class="h3">Posledné výsledky</h3>${matchList(lastAll, R)}</div>
  </div>
</div></section>
<section class="sec sec--paper2" aria-labelledby="kron-h"><div class="wrap kron">
  <div>
    ${secHead('Z kroniky', 'kron-h', more(`${R}klub/`, 'Celá kronika'), `Od roku ${club.futbalOd}`)}
    <ol class="years">${keyYears.map((h) => `<li><b>${esc(h.rok)}</b><span>${esc(h.text.split('. ')[0].replace(/\.$/, ''))}.</span></li>`).join('')}</ol>
  </div>
  ${chronicle()}
</div></section>
<section class="sec" aria-labelledby="odch-h"><div class="wrap feat">
  <article class="profile">
    <p class="kicker">Odchovanec</p>
    <h2 class="h2" id="odch-h">${esc(masrna.meno)}</h2>
    <p class="profile-y">${esc(masrna.roky)}, Hlboké</p>
    <p class="dropcap">${esc(masrna.text)}</p>
    <p class="src">Zdroj: doterajší web klubu (Osobnosti). ${more(`${R}klub/#osobnosti`, 'Osobnosti klubu')}</p>
  </article>
  ${box1843(R)}
</div></section>
<section class="sec sec--paper2" aria-labelledby="timy-h"><div class="wrap">
  ${secHead(`${plural(teams.length, 'tím', 'tímy', 'tímov')} v sezóne ${SEASON}`, 'timy-h', more(`${R}timy/`, 'Súpisky a zápasy'))}
  ${teamGrid(R)}
</div></section>
<section class="sec" aria-labelledby="ih-h"><div class="wrap ih">
  <div>
    ${secHead(esc(IH.nazov), 'ih-h', '', 'Ihrisko')}
    <p class="dropcap">${esc(IH.pribeh)}</p>
    <p class="btns"><a class="btn btn--ink" href="${mapsUrl}" rel="noopener">${I.route}Navigovať</a><a class="btn btn--line" href="${R}ihrisko/">O ihrisku</a></p>
  </div>
  <ol class="build">${IH.stavby.map((s) => `<li><b>${esc(s.rok)}</b><span>${esc(s.text)}</span></li>`).join('')}</ol>
</div></section>`;
  },
});

// zápasy
add('zapasy/', {
  title: 'Zápasy a výsledky', active: 'zapasy/', desc: `Program a výsledky všetkých tímov ${club.nazov} v sezóne ${SEASON}.`,
  body: (R) => {
    const grp = (list) => {
      const months = new Map();
      for (const m of list) { const k = monthKey(m.date); if (!months.has(k)) months.set(k, []); months.get(k).push(m); }
      return [...months].map(([k, l]) => `<section class="month" data-month><h3 class="month-h">${monthName(k)}</h3>${matchList(l, R)}</section>`).join('');
    };
    return `${pageHead({ title: 'Zápasy a výsledky', sub: `Sezóna ${SEASON}, všetky tímy. Výsledky, góly a karty preberáme zo Sportnetu.`, R, crumbs: [[null, 'Zápasy']] })}
<section class="sec sec--first"><div class="wrap">
  <div class="filters" data-filters>
    <div class="chips" role="group" aria-label="Tím"><button type="button" class="chip" data-f-team="" aria-pressed="true">Všetky</button>${teams.map((t) => `<button type="button" class="chip" data-f-team="${t.slug}" aria-pressed="false">${esc(t.short)}</button>`).join('')}</div>
    <div class="chips" role="group" aria-label="Miesto"><button type="button" class="chip" data-f-where="" aria-pressed="true">Doma aj vonku</button><button type="button" class="chip" data-f-where="doma" aria-pressed="false">Doma</button><button type="button" class="chip" data-f-where="vonku" aria-pressed="false">Vonku</button></div>
  </div>
  <div class="cols2 cols2--list">
    <section aria-labelledby="z-prog"><h2 class="h2" id="z-prog">Program</h2>${upcoming.length ? grp(upcoming) : '<p>Ďalšie zápasy zatiaľ nie sú vyžrebované.</p>'}<p class="empty" data-empty hidden>Pre tento výber nie je naplánovaný žiadny zápas.</p></section>
    <section aria-labelledby="z-vys"><h2 class="h2" id="z-vys">Výsledky</h2>${grp(results)}<p class="empty" data-empty hidden>Pre tento výber zatiaľ nie je žiadny výsledok.</p></section>
  </div>
  <div class="cal-row">${calBox('vsetky.ics', R, 'cal-vsetky')}</div>
</div></section>`;
  },
});

// detail zápasu
function lineupHtml(l, title) {
  if (!l || (!l.start.length && !l.subs.length)) return '';
  const li = (p) => `<li><span class="ln-nr">${esc(p.nr)}</span><span>${esc(p.name)}${p.c ? ' <abbr class="cap" title="kapitán">C</abbr>' : ''}</span></li>`;
  return `<div class="lineup"><h3 class="h4">${esc(title)}</h3><ol class="ln">${l.start.map(li).join('')}</ol>${l.subs.length ? `<p class="ln-h">Náhradníci</p><ol class="ln ln--subs">${l.subs.map(li).join('')}</ol>` : ''}${l.coach ? `<p class="ln-coach">Tréner: ${esc(l.coach)}</p>` : ''}</div>`;
}
for (const m of matches) {
  if (m.past && !m.detail) continue;
  const name = m.home ? `${club.nazov} – ${m.opponent}` : `${m.opponent} – ${club.nazov}`;
  add(m.url, {
    title: `${name}${m.score ? ` ${m.score}` : ''}`, active: 'zapasy/',
    desc: `${m.teamObj.full}, ${m.comp}, ${dLong(m.date)}.`,
    body: (R) => {
      const ev = [...(m.goals || []).map((g) => ({ ...g, t: 'goal' })), ...(m.cards || []).map((c) => ({ ...c, t: 'card' })), ...((m.lineups?.subs) || []).map((s) => ({ ...s, t: 'sub' }))]
        .sort((a, b) => (parseInt(a.min, 10) || 0) - (parseInt(b.min, 10) || 0));
      const evIcon = (e) => e.t === 'goal' ? `<span class="ev-i ev-goal" aria-hidden="true">${I.ball}</span>` : e.t === 'card' ? `<span class="ev-i ev-card ev-card--${e.kind}" aria-hidden="true"></span>` : '<span class="ev-i ev-sub" aria-hidden="true">⇄</span>';
      const evText = (e) => e.t === 'goal' ? `Gól: ${esc(e.player)}${e.kind === 'penalty' ? ' (z penalty)' : e.kind === 'own' ? ' (vlastný)' : ''}` : e.t === 'card' ? `${e.kind === 'yellow' ? 'Žltá karta' : e.kind === 'red' ? 'Červená karta' : 'Druhá žltá a červená'}: ${esc(e.player)}` : `Striedanie: prichádza ${esc(e.in)}, odchádza ${esc(e.out)}`; // bez „za“ + meno, ktoré by sa muselo skloňovať
      const evSide = (e) => ((e.side === 'our') === m.home ? 'h' : 'a');
      const evTeam = (e) => (e.side === 'our' ? club.nazov : m.opponent);
      const prevMeet = matches.filter((x) => x.oppSpace === m.oppSpace && x.id !== m.id && x.team === m.team && x.score);
      const snUrl = sn.matches.find((x) => x.id === m.id)?.url;
      return `${pageHead({ title: name, sub: `${esc(m.teamObj.full)}, ${esc(m.comp)}${m.roundName ? `, ${esc(m.roundName)}` : ''}`, R, crumbs: [['zapasy/', 'Zápasy'], [null, dShort(m.date) + ' ' + m.opponent]] })}
<section class="sec sec--first"><div class="wrap match">
  <div class="match-card">${card(m, R, { big: true, self: true, label: m.score ? 'Konečný výsledok' : 'Zápas' })}</div>
  <div class="match-info">
    ${ev.length ? `<h2 class="h3">Priebeh zápasu</h2><ol class="evs">${ev.map((e) => `<li class="ev ev--${evSide(e)}"><span class="ev-min">${esc(e.min)}′</span>${evIcon(e)}<span>${evText(e)}<small>${esc(evTeam(e))}</small></span></li>`).join('')}</ol>` : m.score ? '<p>Zápis o stretnutí neobsahuje góly ani karty.</p>' : ''}
    <dl class="facts">
      <div><dt>Dátum</dt><dd>${dLong(m.date)}${m.time ? `, ${esc(m.time)}` : ''}</dd></div>
      ${m.venue ? `<div><dt>Ihrisko</dt><dd>${esc(venueName(m.venue))}</dd></div>` : ''}
      ${m.audience ? `<div><dt>Diváci</dt><dd>${num(m.audience)}</dd></div>` : ''}
      ${m.referee ? `<div><dt>Rozhodca</dt><dd>${esc(m.referee)}</dd></div>` : ''}
    </dl>
    <p class="btns">${m.score && snUrl ? `<a class="btn btn--line" href="${snUrl}" rel="noopener">${I.ext}Zápis na Sportnete</a>` : ''}${!m.past ? `<a class="btn btn--dark" href="${R}kalendar/zapas-${m.id}.ics" download>${I.cal}Pridať do kalendára</a>${m.home ? `<a class="btn btn--line" href="${mapsUrl}" rel="noopener">${I.route}Navigovať na ihrisko</a>` : ''}` : ''}</p>
  </div>
  ${m.lineups ? `<div class="lineups"><h2 class="h3 lineups-h">Zostavy</h2>${lineupHtml(m.home ? m.lineups.our : m.lineups.opp, m.home ? club.nazov : m.opponent)}${lineupHtml(m.home ? m.lineups.opp : m.lineups.our, m.home ? m.opponent : club.nazov)}</div>` : ''}
  ${prevMeet.length ? `<div class="meet"><h2 class="h3">Ďalšie zápasy s týmto súperom v sezóne</h2>${matchList(prevMeet, R, { showTeam: false })}</div>` : ''}
</div></section>`;
    },
  });
}

// tabuľky
add('tabulky/', {
  title: 'Tabuľky', active: 'tabulky/', desc: `Tabuľky súťaží, v ktorých hrajú tímy ${club.nazov} v sezóne ${SEASON}.`,
  body: (R) => `${pageHead({ title: 'Tabuľky', sub: `Sezóna ${SEASON}. Poradie podľa Sportnetu, náš tím je zvýraznený.`, R, crumbs: [[null, 'Tabuľky']] })}
<section class="sec sec--first"><div class="wrap">
  <nav class="toc" aria-label="Tabuľky tímov">${teams.filter((t) => t.table).map((t) => `<a href="#${t.slug}">${esc(t.short)}</a>`).join('')}</nav>
  ${teams.filter((t) => t.table).map((t) => `<section class="tsec" id="${t.slug}" aria-labelledby="h-${t.slug}">
    <div class="sec-head"><h2 class="h2" id="h-${t.slug}">${esc(t.full)}</h2>${more(`${R}${t.url}`, 'Stránka tímu')}</div>
    <p class="tsec-l">${esc(t.leagueName)}</p>
    ${tableHtml(t.table, R)}
  </section>`).join('')}
  ${teams.some((t) => !t.table) ? `<p class="note">${teams.filter((t) => !t.table).map((t) => esc(t.short)).join(', ')}: prípravky hrajú bez tabuľky.</p>` : ''}
</div></section>`,
});

// tímy
add('timy/', {
  title: 'Tímy', active: 'timy/', desc: `Všetky tímy ${club.nazov}: muži, dorast, žiaci a prípravka v sezóne ${SEASON}.`,
  body: (R) => `${pageHead({ title: 'Tímy', sub: `${plural(teams.length, 'tím', 'tímy', 'tímov')} v sezóne ${SEASON}, od prípravky U9 po A-mužstvo.`, R, crumbs: [[null, 'Tímy']] })}
<section class="sec sec--first"><div class="wrap">${teamGrid(R)}
</div></section>`,
});

for (const t of teams) {
  add(t.url, {
    title: t.full, active: 'timy/', desc: `${club.nazov} – ${t.full}: ${t.leagueName}, zápasy, tabuľka a súpiska v sezóne ${SEASON}.`,
    body: (R) => {
      const list = teamMatches(t.slug);
      const nx = list.filter((m) => !m.past), rs = list.filter((m) => m.past).reverse();
      const pick = cardPick(t.slug);
      const rec = record(t.slug);
      const sc = scorers(t.slug);
      const groups = POS.map(([k, h]) => [h, t.squad.athletes.filter((a) => (k ? a.pos === k : !POS.some(([x]) => x && x === a.pos)))]).filter(([, l]) => l.length);
      const nrCount = new Map(); for (const a of t.squad.athletes) nrCount.set(a.nr, (nrCount.get(a.nr) || 0) + 1);
      const nr = (a) => (a.nr !== '' && nrCount.get(a.nr) === 1 ? a.nr : '');
      return `${pageHead({ title: t.full, sub: `${esc(t.leagueName)}${t.pos ? `, <b>${t.pos}. miesto</b> ${zo(t.of)}` : ''}`, R, crumbs: [['timy/', 'Tímy'], [null, t.short]] })}
<section class="sec sec--first"><div class="wrap team-top">
  ${pick ? `<div>${card(pick, R, { big: true })}</div>` : ''}
  <div class="team-side">
    ${rec.n ? `<p class="stat"><span class="stat-n">${rec.w}–${rec.d}–${rec.l}</span><span class="stat-l">výhry, remízy a prehry vo všetkých súťažiach, skóre ${rec.gf}:${rec.ga}</span></p><div class="liga-row"><h2 class="h4">Forma</h2>${formHtml(t.slug)}</div>` : '<p>Prípravky hrajú bez výsledkov a bez tabuľky. Rozpis zápasov je nižšie.</p>'}
    ${sc.length && t.adult ? `<div class="liga-row liga-row--list"><h2 class="h4">Strelci v sezóne</h2><ol class="scorers">${sc.slice(0, 5).map(([n, g]) => `<li><span>${esc(n)}</span><b>${g}</b></li>`).join('')}</ol></div>` : ''}
    ${calBox(`${t.slug}.ics`, R, `cal-${t.slug}`)}
  </div>
</div></section>
<section class="sec" aria-labelledby="tz-h"><div class="wrap">
  ${secHead('Zápasy', 'tz-h')}
  <div class="cols2">
    <div><h3 class="h3">Program</h3>${nx.length ? matchList(nx, R, { showTeam: false }) : '<p>Ďalšie zápasy zatiaľ nie sú vyžrebované.</p>'}</div>
    <div><h3 class="h3">Výsledky</h3>${rs.length ? matchList(rs, R, { showTeam: false }) : '<p>Tím v tejto sezóne ešte nehral.</p>'}</div>
  </div>
</div></section>
${t.table ? `<section class="sec sec--paper2" aria-labelledby="tt-h"><div class="wrap">${secHead('Tabuľka', 'tt-h')}<p class="tsec-l">${esc(t.leagueName)}</p>${tableHtml(t.table, R)}</div></section>` : ''}
${t.squad.athletes.length || t.squad.crew.length ? `<section class="sec" aria-labelledby="ts-h"><div class="wrap">
  ${secHead('Súpiska', 'ts-h')}
  <p class="note">Hráči, ktorí v kalendárnom roku ${sn.updated.slice(0, 4)} nastúpili alebo boli v nominácii na zápas (podľa Sportnetu).${t.adult ? '' : ' Pri mládeži uvádzame len mená.'}</p>
  ${groups.map(([h, l]) => `<h3 class="h4 sq-h">${h}</h3><ul class="squad">${l.sort((a, b) => a.name.split(' ').at(-1).localeCompare(b.name.split(' ').at(-1), 'sk')).map((a) => `<li class="pl"><span class="pl-nr" aria-hidden="true">${esc(nr(a)) || '<span class="pl-dot"></span>'}</span><span class="pl-name">${esc(a.name)}${a.captain && t.adult ? ' <abbr class="cap" title="kapitán">C</abbr>' : ''}</span>${nr(a) ? `<span class="sr">, číslo ${nr(a)}</span>` : ''}</li>`).join('')}</ul>`).join('')}
  ${t.squad.crew.length ? `<h3 class="h4 sq-h">Realizačný tím</h3><ul class="crew">${t.squad.crew.map((c) => `<li><span class="crew-r">${esc(crewRole[c.role] || crewRole.other)}</span><span>${esc(c.name)}</span></li>`).join('')}</ul>` : ''}
</div></section>` : ''}`;
    },
  });
}

// mládež a nábor
add('mladez/', {
  title: 'Mládež a nábor', active: 'mladez/', desc: `Mládež ${club.nazov}: prípravky U9 a U11, mladší žiaci U13 a dorast U19. Tréneri, súťaže a nábor.`,
  body: (R) => {
    const youth = teams.filter((t) => !t.adult);
    return `${pageHead({ title: 'Mládež a nábor', sub: `${plural(youth.length, 'mládežnícky tím', 'mládežnícke tímy', 'mládežníckych tímov')} v sezóne ${SEASON}, od prípravky U9 po dorast U19.`, R, crumbs: [[null, 'Mládež']] })}
<section class="sec sec--first"><div class="wrap youth-top">
  <div>
    <p class="dropcap">Prípravky a žiaci hrajú súťaže Oblastného futbalového zväzu Senica, dorast U19 hrá IV. ligu Západoslovenského zväzu. Futbal sa v Hlbokom učili hrať deti už v tridsiatych rokoch na strniskách po žatve, dnes trénujú na ihrisku na Lúčkach.</p>
    <ul class="coaches">${youth.map((t) => `<li><a href="${R}${t.url}"><b>${esc(t.short)}</b><span>${esc(t.sub)} · ${esc(t.leagueName)}</span>${coachOf(t) ? `<small>tréner ${esc(coachOf(t))}</small>` : ''}</a></li>`).join('')}</ul>
    <p class="src">Tréneri a súťaže podľa Sportnetu, sezóna ${SEASON}.</p>
  </div>
  <aside class="join">
    <p class="kicker">Nábor</p>
    <h2 class="h3">Prvý tréning</h2>
    <p>Chce vaše dieťa hrať futbal? Opýtajte sa klubu e-mailom, kedy trénuje jeho veková kategória, a príďte na ihrisko na Lúčkach.</p>
    <p class="btns"><a class="btn btn--ink" href="mailto:${club.kontakt.email}?subject=${encodeURIComponent('Nábor do mládeže')}">${I.mail}${esc(club.kontakt.email)}</a></p>
  </aside>
</div></section>
<section class="sec sec--paper2" aria-labelledby="ymt-h"><div class="wrap">
  ${secHead('Mládežnícke tímy', 'ymt-h', more(`${R}tabulky/`, 'Tabuľky'))}
  ${teamGrid(R, (t) => !t.adult)}
</div></section>
<section class="sec" aria-labelledby="ynext-h"><div class="wrap">
  ${secHead('Najbližšie zápasy mládeže', 'ynext-h', more(`${R}zapasy/`, 'Všetky zápasy'))}
  ${matchList(upcoming.filter((m) => !m.teamObj.adult).slice(0, 8), R)}
</div></section>`;
  },
});

// kronika: riadok aktuálnej sezóny zo Sportnetu; ak už kronika v klub.json má zápis tejto sezóny, doplní sa k nemu
// (inak by sa rok 2026/27 ukázal dvakrát pod sebou)
function annals() {
  const aWinter = upcoming.some((m) => m.team === A.slug && (dObj(m.date) - dObj(TODAY)) / 864e5 > 14);
  const teamsTxt = `V klube hrá ${plural(teams.length, 'tím', 'tímy', 'tímov')} od prípravky U9 po mužov.`;
  const row = (rok, text, zdroj, now) => `<li${now ? ' class="annals-now"' : ''}><p class="annals-y">${esc(rok)}</p><div><p>${text}</p><small>${esc(zdroj)}</small></div></li>`;
  const cur = club.historia.find((x) => x.rok === SEASON);
  const rows = club.historia.map((x) => x !== cur ? row(x.rok, esc(x.text), x.zdroj)
    : row(x.rok, `${esc(x.text)}${A.pos ? ` ${aWinter ? 'Po jeseni je áčko' : 'Áčko je'} na ${A.pos}. mieste ${zo(A.of)}.` : ''} ${teamsTxt}`, /Sportnet/.test(x.zdroj) ? x.zdroj : `${x.zdroj}; Sportnet`, true));
  if (!cur) rows.push(row(SEASON, `Áčko hrá ${esc(acc(A.leagueName))}${A.pos ? ` a ${aWinter ? 'po jeseni ' : ''}je na ${A.pos}. mieste` : ''}. ${teamsTxt}`, 'Sportnet', true));
  return rows.join('');
}

// klub a kronika
add('klub/', {
  title: 'Klub a kronika', active: 'klub/', desc: `${club.nazov}: kronika od roku ${club.futbalOd}, AC Sparta Hlboké, ihrisko v Krčažnom, postup do krajskej súťaže 1972, odchovanec Jaroslav Masrna a obec Hlboké.`,
  body: (R) => `${pageHead({ title: 'Klub a kronika', sub: `${esc(club.pravnyNazov)}. Futbal od roku ${club.futbalOd}, klub od roku ${club.zalozenie}.`, R, crumbs: [[null, 'Klub']] })}
<section class="sec sec--first" id="historia" aria-labelledby="hist-h"><div class="wrap klub-grid">
  <div>
    <h2 class="h2" id="hist-h">Kronika</h2>
    <ol class="annals">${annals()}</ol>
  </div>
  <aside class="klub-aside">
    <img src="${R}img/erb-480.webp" alt="${esc(club.erbAlt)}" width="200" height="258" loading="lazy">
    <p class="note">${esc(club.erbAlt.replace(/^Erb TJ Hlboké: /, 'Erb klubu: '))}.</p>
    ${chronicle('chron--side')}
  </aside>
</div></section>
<section class="sec sec--paper2" id="osobnosti" aria-labelledby="os-h"><div class="wrap">
  ${secHead('Osobnosti', 'os-h', '', 'Z Hlbokého')}
  <div class="people-grid">${club.odchovanci.zoznam.map((o) => `<article class="person"><h3 class="h3">${esc(o.meno)}</h3><p class="profile-y">${esc(o.roky)}</p><p>${esc(o.text)}</p></article>`).join('')}</div>
  <p class="src">Zdroj: doterajší web klubu (Osobnosti), Wikipédia (Peter Kumančík), Záhorák.</p>
</div></section>
<section class="sec" id="obec" aria-labelledby="b1843-h"><div class="wrap">
  ${box1843(R, true)}
</div></section>`,
});

// ihrisko
add('ihrisko/', {
  title: 'Ihrisko na Lúčkach', active: 'ihrisko/', desc: `${IH.nazov} v Hlbokom: od roku 1952 domov TJ Družstevník Hlboké, tribúna, história a navigácia. Prvé ihrisko bolo v Krčažnom (1934).`,
  body: (R) => {
    const home = upcoming.filter((m) => m.home).slice(0, 6);
    return `${pageHead({ title: IH.nazov, sub: `${IH.adresa.map(esc).join(', ')}. Domov klubu od roku 1952.`, R, crumbs: [[null, 'Ihrisko']] })}
<section class="sec sec--first"><div class="wrap stad">
  <div>
    <p class="dropcap">${esc(IH.pribeh)}</p>
    <p>${esc(IH.tribuna)}</p>
    <ol class="build">${IH.stavby.map((s) => `<li><b>${esc(s.rok)}</b><span>${esc(s.text)}</span></li>`).join('')}</ol>
    <p class="btns"><a class="btn btn--ink" href="${mapsUrl}" rel="noopener">${I.route}Navigovať (Google Mapy)</a><a class="btn btn--line" href="${mapyUrl}" rel="noopener">${I.pin}Mapy.com</a></p>
    <p class="src">Zdroje: kronika na doterajšom webe klubu, poloha zo Sportnetu. Kapacitu ihriska Sportnet neuvádza.</p>
  </div>
  <div>
    <aside class="old">
      <p class="kicker">Prvé ihrisko</p>
      <h2 class="h3">Krčažné, 1933 – 1934</h2>
      <p>${esc(IH.krcazne)}</p>
    </aside>
    ${home.length ? `<h2 class="h3">Najbližšie zápasy doma</h2>${matchList(home, R)}` : ''}
  </div>
</div></section>`;
  },
});

// kontakt
add('kontakt/', {
  title: 'Kontakt', active: 'kontakt/', desc: `Kontakt na ${club.nazov}: e-mail, sídlo klubu a ihrisko na Lúčkach.`,
  body: (R) => `${pageHead({ title: 'Kontakt', sub: 'Zápasy, nábor do mládeže, partnerstvo a spolupráca.', R, crumbs: [[null, 'Kontakt']] })}
<section class="sec sec--first"><div class="wrap contact">
  <div class="ccard">
    <p class="kicker">Napíšte redakcii</p>
    <p class="ccard-n">${esc(club.nazov)}</p>
    <p class="btns"><a class="btn btn--ink" href="mailto:${club.kontakt.email}">${I.mail}<span>${esc(club.kontakt.email).replace('@', '<wbr>@')}</span></a></p>
    <p class="note">E-mail klubu podľa Sportnetu. Telefónne čísla klub verejne neuvádza.</p>
  </div>
  <dl class="facts">
    <div><dt>Názov</dt><dd>${esc(club.pravnyNazov)}</dd></div>
    <div><dt>Sídlo</dt><dd>${club.adresa.map(esc).join(', ')}</dd></div>
    <div><dt>Ihrisko</dt><dd>${esc(IH.nazov)}, ${IH.adresa.map(esc).join(', ')}</dd></div>
    <div><dt>Farby</dt><dd>${esc(club.farby)}</dd></div>
  </dl>
  <div>
    <h2 class="h3">Klub na webe</h2>
    <ul class="docs">
      <li><a href="${club.sportnetUrl}" rel="noopener">${I.ext}<span>Profil klubu na Sportnete</span><small>zápisy o stretnutí, súpisky, prestupy</small></a></li>
      <li><a href="${club.obecUrl}" rel="noopener">${I.ext}<span>Obec Hlboké</span><small>obechlboke.sk</small></a></li>
      <li><a href="${club.staryWeb}" rel="noopener">${I.ext}<span>Doterajší web klubu v archíve</span><small>tjhlboke.sk, kronika klubu</small></a></li>
    </ul>
    <p class="src">Facebook ani Instagram klubu sme nenašli. Tréneri tímov sú na stránkach <a href="${R}timy/">tímov</a>.</p>
  </div>
</div></section>`,
});

add('ochrana-sukromia/', {
  title: 'Ochrana súkromia', desc: `Ako web ${club.nazov} pracuje s údajmi.`,
  body: (R) => `${pageHead({ title: 'Ochrana súkromia', R, crumbs: [[null, 'Ochrana súkromia']] })}
<section class="sec sec--first"><div class="wrap prose">
  <p>Web nepoužíva cookies, analytiku ani reklamné nástroje a nenačítava nič z iných serverov. Všetky súbory vrátane písma a erbov sú uložené priamo na webe. Odkazy na Sportnet, web obce a mapy sú obyčajné odkazy.</p>
  <p>Mená hráčov, trénerov a rozhodcov, výsledky, strelcov, karty a počty divákov preberáme z verejného systému Sportnet (Futbalnet), kam ich zapisujú kluby a zväzy pri zápasoch. Vek hráčov nezverejňujeme, pri mládeži uvádzame len mená a zostavy zápasov len pri dospelých.</p>
  <p>Ak chcete niečo opraviť alebo odstrániť, napíšte na <a href="mailto:${club.kontakt.email}">${esc(club.kontakt.email)}</a>.</p>
</div></section>`,
});

add('404/', {
  title: 'Stránka sa nenašla',
  body: (R) => `${pageHead({ title: 'Stránka sa nenašla', sub: 'Táto strana v čísle chýba. Adresa je chybná alebo sa stránka presunula.', R })}
<section class="sec sec--first"><div class="wrap"><p class="btns"><a class="btn btn--ink" href="${R}">Na titulnú stranu</a><a class="btn btn--line" href="${R}zapasy/">Zápasy a výsledky</a></p></div></section>`,
});


// ---- kalendár (.ics, RFC 5545) ----------------------------------------------------------------
const icsEsc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsFold = (line) => {
  const out = []; let cur = '';
  for (const ch of line) { if (Buffer.byteLength(cur + ch) > 74) { out.push(cur); cur = ' ' + ch; } else cur += ch; }
  out.push(cur);
  return out.join('\r\n');
};
const VTZ = ['BEGIN:VTIMEZONE', 'TZID:Europe/Bratislava',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE'];
function ics(list, calName) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const events = list.map((m) => {
    const us = m.teamObj.adult ? club.nazov : `${club.nazov} ${m.teamObj.short}`;
    const [h, a] = m.home ? [us, m.opponent] : [m.opponent, us];
    const d = m.date.replace(/-/g, '');
    const t = (m.time || '').slice(0, 5);
    const when = t ? [`DTSTART;TZID=Europe/Bratislava:${d}T${t.replace(':', '')}00`, 'DURATION:PT2H'] : [`DTSTART;VALUE=DATE:${d}`];
    const desc = [m.comp + (m.roundName ? `, ${m.roundName}` : ''), m.home ? 'Domáci zápas' : 'Zápas vonku'].join('\n');
    return ['BEGIN:VEVENT', `UID:zapas-${m.id}@${config.sportnet.club}.sportnet`, `DTSTAMP:${stamp}`, ...when,
      `SUMMARY:${icsEsc(`${m.teamObj.short}: ${h} – ${a}${m.score ? ` ${m.score}` : ''}`)}`,
      `DESCRIPTION:${icsEsc(desc)}`, m.venue && `LOCATION:${icsEsc(venueName(m.venue))}`, 'END:VEVENT'].filter(Boolean);
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${club.nazov}//Zapasy//SK`, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEsc(calName)}`, 'X-WR-TIMEZONE:Europe/Bratislava', ...VTZ, ...events.flat(), 'END:VCALENDAR'].map(icsFold).join('\r\n') + '\r\n';
}

// ---- ukážka administrácie (dist/admin/demo.json pre src/admin/admin.js) ------------------------------
function writeAdminDemo() {
  // rovnaký tvar dát ako administrácia OK Častkovce (src/admin/admin.js je spoločný základ)
  const R = '../';
  const snById = Object.fromEntries(sn.matches.map((m) => [m.id, m]));
  const people = (t) => t.squad.athletes.map((a) => ({ name: a.name, number: a.nr === '' ? '' : String(a.nr), role: '', photo: null }));
  const demo = {
    club: { nazov: club.nazov, crest: `${R}img/erb-128.webp` },
    updated: sn.updated, season: sn.season,
    teams: teams.map((t) => ({ slug: t.slug, short: t.short, sub: t.adult ? 'Muži' : t.sub })),
    matches: matches.map((m) => ({
      id: m.id, team: m.team, date: m.date, time: m.time, home: m.home, opponent: m.opponent, competition: m.comp, part: '',
      round: (/\d+/.exec(m.round) || [''])[0], played: m.past, score: m.score, goals: m.goals || [], cards: m.cards || [],
      venue: venueName(m.venue || ''), url: snById[m.id]?.url || null, gallery: null, video: null,
    })),
    rosters: Object.fromEntries(teams.map((t) => [t.slug, people(t).map(({ name, number, photo }) => ({ name, number, photo }))])),
    news: [],
    info: {
      nazov: club.nazov, pravnyNazov: club.pravnyNazov, adresa: club.adresa, osoba: '', telefon: '', email: club.kontakt.email,
      facebook: '', ico: '', ucet: '', stadion: { nazov: IH.nazov, kapacita: '', rozmery: '', vip: '' },
    },
    allTeams: teams.map((t) => ({
      slug: t.slug, short: t.short, sub: t.adult ? 'Muži' : t.sub, league: t.leagueName, url: t.url, photo: null,
      groups: [{ title: 'Hráči', people: people(t) }, { title: 'Realizačný tím', people: t.squad.crew.map((c) => ({ name: c.name, number: '', role: crewRole[c.role] || crewRole.other, photo: null })) }],
    })),
    coaches: [],
    pages: {
      historia: { title: 'História', url: 'klub/', html: `<ul>${club.historia.map((h) => `<li><b>${esc(h.rok)}</b> – ${esc(h.text)}</li>`).join('')}</ul>` },
      kronika: { title: 'Kronika', url: 'klub/', html: `<blockquote><p>${esc(club.kronika.citat)}</p></blockquote><p>${esc(club.kronika.autor)}</p>` },
      'ochrana-sukromia': { title: 'Ochrana súkromia', url: 'ochrana-sukromia/', html: '<p>Web nepoužíva cookies, analytiku ani reklamné nástroje.</p>' },
    },
    home: {
      heroTitle: club.nazov, heroText: `Futbal v Hlbokom od roku ${club.futbalOd}. Áčko hrá ${acc(A.leagueName)}.`, hero: null,
      stadion: { title: IH.nazov, text: IH.pribeh },
    },
    galleries: [], videos: [], fanshop: { pozn: '', email: club.kontakt.email, produkty: [] }, partners: [],
  };
  fs.writeFileSync(path.join(OUT, 'admin', 'demo.json'), JSON.stringify(demo));
}

// ---- zápis -------------------------------------------------------------------------------------
// obsah dist/ sa maže po súboroch: koreň môže držať náhľadový server (fs.watch) alebo otvorený terminál
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, f), { recursive: true, force: true });
const copy = (from, to) => { if (fs.existsSync(from)) fs.cpSync(from, to, { recursive: true }); };
copy(path.join(SRC, 'img'), path.join(OUT, 'img'));
copy(path.join(SRC, 'fonts'), path.join(OUT, 'fonts'));
copy(path.join(SRC, 'js'), path.join(OUT, 'js'));
copy(path.join(ROOT, 'media', 'foto-web'), path.join(OUT, 'foto'));
if (config.adminDemo !== false && fs.existsSync(path.join(SRC, 'admin', 'index.html'))) { copy(path.join(SRC, 'admin'), path.join(OUT, 'admin')); writeAdminDemo(); }
fs.rmSync(path.join(OUT, 'fonts', 'fonts.css'), { force: true });
fs.mkdirSync(path.join(OUT, 'css'), { recursive: true });
const fontsCss = fs.readFileSync(path.join(SRC, 'fonts', 'fonts.css'), 'utf8').replace(/url\(([^)]+)\)/g, 'url(../fonts/$1)');
fs.writeFileSync(path.join(OUT, 'css', 'site.css'), fontsCss + fs.readFileSync(path.join(SRC, 'css', 'site.css'), 'utf8'));

// slovenská sadzba v texte stránok (nie v <script>, <style> ani v atribútoch): jednopísmenová predložka alebo spojka
// nezostane na konci riadka („v Trenčíne“), skóre „1 : 0“, čísla „2 730“, dátumy, „V. liga“ a „1. miesto“ sa nerozdelia
const NB = ' ';
const typo = (html) => html.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>)/).map((part, i) => (i % 2 ? part : part.replace(/>([^<]+)</g, (m, t) => '>' + t
  .replace(/(?<=^|[\s(„])([AaIiKkOoSsUuVvZz])[ \t]+(?=\S)/g, `$1${NB}`)
  .replace(/(\d) : (\d)/g, `$1${NB}:${NB}$2`)
  .replace(/(\d\.) (?=(?:kol[oae]|miest[oea])\b)/g, `$1${NB}`)
  .replace(/\b(\d{1,2}\.) (?=(?:\d{1,2}\.|januára|februára|marca|apríla|mája|júna|júla|augusta|septembra|októbra|novembra|decembra)(?!\d))/g, `$1${NB}`) // „7. marca“, „15. 11.“
  .replace(/\b([IVX]{1,4}\.) (?=lig)/g, `$1${NB}`) // „V. liga“
  .replace(/(?<![\p{L}\d.,:/])(\d{1,3}) (?=\p{Ll})/gu, `$1${NB}`) // počet a počítaný predmet: „2 výhry“, „850 divákov“, „5 tímov“
  .replace(/\b(\d{3}) (\d{2})\b/g, `$1${NB}$2`) // PSČ 913 11
  .replace(/(\d) (\d{3})(?!\d)/g, `$1${NB}$2`) + '<'))).join('');
for (const p of pages) {
  const depth = p.route.split('/').filter(Boolean).length;
  const R = depth ? '../'.repeat(depth) : './';
  const html = typo(layout({ ...p, body: p.body(R) }));
  const file = path.join(OUT, p.route, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}
// GitHub Pages: 404 v koreni (absolútne cesty, lebo sa zobrazuje na ľubovoľnej adrese)
const BASE = process.env.BASE_PATH || config.basePath || '/';
const notFound = fs.readFileSync(path.join(OUT, '404', 'index.html'), 'utf8').replace(/(href|src|data-root)="(\.\.\/)+/g, `$1="${BASE}`);
fs.writeFileSync(path.join(OUT, '404.html'), notFound);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
fs.writeFileSync(path.join(OUT, '.gitattributes'), '*.ics -text\n'); // RFC 5545 chce CRLF, git na Windowse by ho zmenil

// kalendáre .ics: každý tím, všetky zápasy a jednotlivé budúce zápasy
fs.mkdirSync(path.join(OUT, 'kalendar'), { recursive: true });
for (const t of teams) fs.writeFileSync(path.join(OUT, 'kalendar', `${t.slug}.ics`), ics(teamMatches(t.slug), `${club.nazov} – ${t.full}`));
fs.writeFileSync(path.join(OUT, 'kalendar', 'vsetky.ics'), ics(matches, `${club.nazov} – všetky zápasy`));
for (const m of upcoming) fs.writeFileSync(path.join(OUT, 'kalendar', `zapas-${m.id}.ics`), ics([m], `${club.nazov} – ${m.teamObj.full}`));
console.log(`Hotovo: ${pages.length} stránok -> dist/ (dnes = ${TODAY})`);
