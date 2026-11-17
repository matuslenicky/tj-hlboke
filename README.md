# TJ Družstevník Hlboké – návrh webu

Návrh nového webu futbalového klubu TJ Družstevník Hlboké (okres Senica). **Nie je to oficiálna stránka klubu.** Ukážka má v hlavičke pás s týmto upozornením a vyhľadávače ju neindexujú (`noindex`).

Ukážka: https://matuslenicky.github.io/tj-hlboke/ · administrácia (ukážka bez ukladania): https://matuslenicky.github.io/tj-hlboke/admin/

## Vzhľad

**„Noviny“ (dizajn v2, 17. 11. 2026).** Novinový papier, čierna tlač, modrá z erbu len v odkazoch. Písmo Newsreader (titulky aj text) a IBM Plex Mono (čísla a tabuľky).

- hlavička ako novinový titul s menom klubu v strede a menu medzi dvojitými linkami,
- úvod ako titulná strana: hlavný článok o poslednom zápase áčka (skóre, strelci, diváci), vpravo najbližší zápas a výrez tabuľky, pod tým tri stĺpce Program, Výsledky a citát z kroniky 1945,
- stránka Klub: kronika v dvoch novinových stĺpcoch, odchovanci, ihrisko na Lúčkach a obec,
- menu na telefóne je papierová plocha cez celú obrazovku.

Web sa skladá zo spoločného jadra v2 (`kluby-siet/engine`: `python assemble.py <web>`), vlastný je `src/site.js` (úvod, Klub, nastavenia) a `src/css/skin.css`.

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
