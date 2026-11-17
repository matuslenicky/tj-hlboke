// Statický generátor webu TJ Družstevník Hlboké: data/ + src/ -> dist/   (node build.js; TODAY=2026-11-17 prepíše dnešný dátum)
// Zostavuje ho kluby-siet/engine/assemble.py zo spoločného jadra v2 a tohto súboru (vzhľad, úvod, stránka Klub).
// Kostra „Noviny“: hlavička ako novinový titul s menom v strede a menu medzi dvojitými linkami, úvod ako titulná
// strana: hlavný článok o poslednom zápase áčka (skóre, strelci, diváci), vpravo najbližší zápas a výrez tabuľky,
// pod tým tri stĺpce oddelené linkami. Novinový papier, čierna tlač, modrá z erbu len v odkazoch.
// Písmo Newsreader (titulky aj text) a IBM Plex Mono (čísla a tabuľky).
const SKIN = {
  nav: 'mast', theme: '#1a1916', brand: 'TJ Družstevník Hlboké', brandSub: `Futbal od roku ${club.futbalOd} · ročník ${SEASON}`,
  fonts: ['newsreader-400.woff', 'newsreader-700.woff', 'ibm-plex-mono-500.woff'],
  sources: 'História podľa kroniky na bývalom webe klubu, týždenníka Záhorák a Wikipédie.',
  adminHero: `Futbal v Hlbokom od roku ${club.futbalOd}`,
  adminFacts: club.historia.map((h) => ({ k: h.rok, t: h.text })),
  links: [[club.obecUrl, 'Web obce Hlboké'], [club.staryWeb, 'Archív bývalého webu klubu']],
};
const NAV = [['zapasy/', 'Zápasy'], ['tabulky/', 'Tabuľky'], ['timy/', 'Tímy'], ['klub/', 'Klub'], ['kontakt/', 'Kontakt']];
const DESC = `${club.nazov} – futbal v Hlbokom od roku ${club.futbalOd}. Zápasy, výsledky, tabuľky a súpisky áčka (${A.leagueName}) a mládeže, kronika klubu a odchovanci.`;

// strelci jedného tímu v zápase: „Marek Šustek 23’, 67’ (11 m)“
const scorersOf = (m, side) => {
  const by = new Map();
  for (const g of (m.goals || []).filter((x) => x.side === side)) { const k = g.player || 'neuvedený'; if (!by.has(k)) by.set(k, []); by.get(k).push(`${g.min}’${g.kind === 'penalty' ? ' (11 m)' : g.kind === 'own' ? ' (vl.)' : ''}`); }
  return [...by].map(([p, mins]) => `${esc(p)} ${mins.join(', ')}`).join(', ');
};

add('', {
  title: `futbal od roku ${club.futbalOd}`, active: '', bodyClass: 'home',
  body: (R) => {
    const m = lastA;
    const n = nextA;
    const row = A.table?.rows.find((r) => r.our);
    const ours = m ? scorersOf(m, 'our') : '';
    const theirs = m ? scorersOf(m, 'opp') : '';
    // skóre nezostane samo na poslednom riadku titulku, skratka klubu („FK“) sa neodtrhne od mena
    const head = m ? (m.home ? `Hlboké${NB}– ${glueAbbr(esc(m.opponent))}${NB}${m.score}` : `${glueAbbr(esc(m.opponent))}${NB}– Hlboké${NB}${m.score}`) : esc(club.nazov);
    const verb = m ? { w: m.home ? 'vyhralo doma' : 'vyhralo vonku', d: m.home ? 'remizovalo doma' : 'remizovalo vonku', l: m.home ? 'prehralo doma' : 'prehralo vonku' }[m.res] : '';
    return `<section class="front"><div class="wrap front-in">
  <article class="lead" aria-labelledby="lead-h">
    ${m ? `<p class="kicker">${esc(A.leagueName)}${m.roundName ? `, ${esc(m.roundName)}` : ''} · <time datetime="${m.date}">${dDate(m.date)}</time></p>
    <h1 class="lead-h" id="lead-h">${head}</h1>
    <p class="lead-deck">Áčko ${verb} ${m.gf}:${m.ga}${m.half ? `, polčas ${esc(m.half)}` : ''}.${m.audience ? ` Zápas videlo ${plural(m.audience, 'divák', 'diváci', 'divákov')}.` : ''}</p>
    <dl class="lead-goals">${ours ? `<div><dt>Góly Hlbokého</dt><dd>${ours}</dd></div>` : ''}${theirs ? `<div><dt>Góly súpera</dt><dd>${theirs}</dd></div>` : ''}</dl>
    ${m.detail ? `<p>${more(`${R}${m.url}`, 'Zostavy a priebeh')}</p>` : ''}` : `<h1 class="lead-h" id="lead-h">${esc(club.nazov)}</h1>`}
  </article>
  <aside class="rail" aria-label="Najbližší zápas a tabuľka">
    ${n ? `<div class="box"><p class="box-k">${winterNow ? 'Prvý zápas po zimnej prestávke' : 'Najbližší zápas'}</p><p class="box-o">${n.home ? `Hlboké${NB}– ` : ''}${glueAbbr(esc(n.opponent))}${n.home ? '' : `${NB}– Hlboké`}</p><p class="box-d"><time datetime="${n.date}">${dLong(n.date)}</time>, ${esc(n.time || '')}</p>${winterNow ? '' : `<p class="box-cd"><span class="cd" data-kickoff="${isoLocal(n.date, n.time)}" hidden></span></p>`}<a class="more" href="${R}kalendar/zapas-${n.id}.ics" download>${I.cal}Do kalendára</a></div>` : ''}
    ${A.table ? `<div class="box"><p class="box-k">${esc(A.leagueName)}${row ? ` · ${A.pos}. miesto` : ''}</p>${tableHtml(A.table, R, { compact: true, caption: '<span class="sr">Výrez tabuľky</span>' })}${more(`${R}tabulky/`, 'Celá tabuľka')}</div>` : ''}
  </aside>
</div></section>
<section class="cols3-sec"><div class="wrap cols3">
  <section aria-labelledby="prog-h"><h2 class="h3" id="prog-h">Program</h2>${homeUp(5).length ? fxList(homeUp(5), R) : '<p>Ďalšie zápasy zatiaľ nie sú vyžrebované.</p>'}${more(`${R}zapasy/`, 'Všetky zápasy')}</section>
  <section aria-labelledby="res-h"><h2 class="h3" id="res-h">Výsledky</h2>${fxList(homeRes(5), R)}${more(`${R}zapasy/#z-vys`, 'Všetky výsledky')}</section>
  <section aria-labelledby="kr-h"><h2 class="h3" id="kr-h">Z kroniky, apríl 1945</h2><blockquote class="cite"><p>„${esc(club.kronika.citat)}“</p><footer>${esc(club.kronika.autor)}</footer></blockquote>${more(`${R}klub/`, 'História klubu')}</section>
</div></section>`;
  },
});

add('klub/', {
  title: 'Klub', active: 'klub/', desc: `${club.nazov}: futbal od roku ${club.futbalOd}, kronika, odchovanci Jaroslav Masrna a Emil Morávek, ihrisko na Lúčkach a obec Hlboké.`,
  body: (R) => `${pageHead({ title: 'Z kroniky klubu', sub: `${esc(club.pravnyNazov)}, futbal od roku ${club.futbalOd}. Farby ${esc(club.farby)}.`, R, crumbs: [[null, 'Klub']] })}
<section class="sec sec--first"><div class="wrap">
  <div class="annals">${club.historia.map((h) => `<p><b>${esc(h.rok)}</b> ${esc(h.text)}</p>`).join('')}</div>
</div></section>
<section class="sec sec--rule" aria-labelledby="od-h"><div class="wrap">
  <h2 class="h2" id="od-h">Odchovanci a osobnosti</h2>
  <div class="profiles">${club.odchovanci.zoznam.map((o) => `<article class="profile"><h3 class="h3">${esc(o.meno)}</h3><p class="profile-k">${esc(o.roky)}</p><p>${esc(o.text)}</p></article>`).join('')}</div>
</div></section>
<section class="sec sec--rule" aria-labelledby="ih-h"><div class="wrap cols3 cols3--2">
  <section><h2 class="h2" id="ih-h">${esc(club.ihrisko.nazov)}</h2><p>${esc(club.ihrisko.pribeh)}</p></section>
  <section><h3 class="h3">Ako rástol areál</h3><ol class="build">${club.ihrisko.stavby.map((s) => `<li><b>${esc(s.rok)}</b> ${esc(s.text)}</li>`).join('')}</ol></section>
</div></section>
<section class="sec sec--rule" aria-labelledby="ob-h"><div class="wrap cols3 cols3--2">
  <section><h2 class="h2" id="ob-h">Hlboké</h2><p>${esc(club.obec.text)}</p>${club.obec.pamiatky ? `<p>${esc(club.obec.pamiatky)}</p>` : ''}</section>
  <section><h3 class="h3">Osobnosti obce</h3><ul class="build">${club.obec.osobnosti.map((o) => `<li><b>${esc(o.meno)}</b> ${esc(o.text)}</li>`).join('')}</ul>
  <p class="note">Zdroje: kronika na bývalom webe klubu, týždenník Záhorák, Wikipédia, Sportnet.</p></section>
</div></section>`,
});
