# TJ Družstevník Hlboké – návrh webu

Návrh nového webu futbalového klubu TJ Družstevník Hlboké (okres Senica). **Nie je to oficiálna stránka klubu.** Ukážka má v hlavičke pás s týmto upozornením a vyhľadávače ju neindexujú (`noindex`).

Ukážka: https://matuslenicky.github.io/tj-hlboke/ · administrácia (ukážka bez ukladania): https://matuslenicky.github.io/tj-hlboke/admin/

## Vzhľad

**„Hlbocké noviny“.** V Hlbokom sa v roku 1843 Štúr, Hurban a Hodža dohodli na spisovnej slovenčine a erb obce, ktorý je aj v erbe klubu, nesie otvorenú knihu. Web preto vyzerá ako noviny:

- titul novín s dátumovým riadkom (sezóna a číslo = počet odohraných zápasov áčka), pod ním rubriky medzi dvojitými linkami,
- titulná strana: hlavný článok o zápase áčka, krátke správy z ostatných tímov, výrez tabuľky, iniciály na začiatku textov,
- zápasová karta ako **otvorená kniha** (dve strany, chrbát v strede),
- výňatky z **kroniky klubu** (zápis kronikára z apríla 1945), osobnosti (odchovanec Jaroslav Masrna), Hlboké 1843,
- papierový podklad, tiráž v päte; na telefóne menu „Obsah čísla“ s bodkovanými vodiacimi čiarami v paneli zľava,
- písmo **Playfair Display** (titulky) a **Libre Franklin** (text), farby z erbu klubu (modrá, žltá).

## Obsah a zdroje

- Zápasy, výsledky, strelci, karty, počty divákov, zostavy dospelých, tabuľky a súpisky 5 tímov zo Sportnetu (Futbalnet), verejné API súťaží (`scripts/sportnet.mjs` → `data/sportnet.json`). Vek hráčov sa neukladá, zostavy len pri dospelých.
- Údaje o klube v `data/klub.json`, každá časť s uvedeným zdrojom: kronika (1932 – 1972), ihriská v Krčažnom a na Lúčkach, osobnosti Jaroslav Masrna a Emil Morávek a sídlo z archívu doterajšieho webu tjhlboke.sk (doména zanikla), sezóna 2024/25 a derby so Senicou z denníka Záhorák, Peter Kumančík z Wikipédie a NaZáhorí.sk, obec a rok 1843 z Wikipédie, e-mail klubu zo Sportnetu. Telefóny výboru zo starého webu (2016) sa zámerne neuvádzajú.
- Erb TJ Hlboké a erby súperov zo Sportnetu (`scripts/logos.py`). Patria príslušným klubom.
- Písmo Playfair Display a Libre Franklin, licencia SIL Open Font License 1.1 (`scripts/fonts.py`).

## Zostavenie

Statický generátor bez závislostí (Node 20+, Python 3 s Pillow na erby):

```
node scripts/sportnet.mjs        # zápasy, tabuľky a súpisky (FULL=1 stiahne znova aj detaily zápasov)
python -I scripts/logos.py       # erby súperov a náš erb do src/img (FORCE=1 stiahne znova)
node build.js                    # data/ + src/ -> dist/ (TODAY=2026-11-17 prepíše dnešný dátum)
node scripts/serve.mjs dist 5350 # náhľad na http://127.0.0.1:5350/ (?nolr = bez obnovovania, s CSP)
node scripts/deploy.mjs          # nasadenie dist/ na vetvu gh-pages (GitHub Pages)
```

Výsledky sa po zápasoch aktualizujú samé cez GitHub Actions (`.github/workflows/sportnet.yml`).
