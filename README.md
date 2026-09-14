# MareyChart

En fristående React/D3-komponent som ritar ett [Marey-diagram](https://en.wikipedia.org/wiki/Marey%27s_train_schedule) för tåg: stationer längs x-axeln, tid längs y-axeln, och varje tåg som en linje mellan de stationer det passerar. Tänkt att användas som tågtidtabellsvy i PrognosGraf, men komponenten i sig känner inte till någon backend — den tar bara emot stationer och tåg som props.

## Vad komponenten gör

- **X-axel (fix):** stationernas positioner beräknas med en blend mellan helt ekvidistant placering och positionering proportionell mot verklig km-distans, med konfigurerbar vikt. X-axeln är varken zoombar eller pannbar.
- **Y-axel (tid, zoombar/pannbar):** visar som standard tidsintervallet -15 min till +60 min runt nu. Kan zoomas mellan 15 minuter (mest inzoomat) och 6 timmar (mest utzoomat), och pannas bakåt max till nu-15 min samt framåt till nu+12 h.
- **"Följer nu"-läge:** så länge användaren inte själv har zoomat/pannat glider det synliga tidsintervallet automatiskt framåt i takt med klockan. En återställningsknapp hoppar tillbaka till detta läge.
- **Nu-linjen:** en horisontell linje som uppdateras live och visar aktuell tid, frikopplad från övrig rendering.
- **Grenvyer (branch views):** ett chart-uppslag kan bestå av flera paneler i rad (huvudvy + upp till fem grenar) som delar samma y-axel/tidsdomän men har egna stationslistor och tåg. Används för tåg som bara tangerar huvudvyn i en enda station.
- **Responsiv:** komponenten fyller det utrymme den ges av sin container, via en `ResizeObserver`-baserad hook.

Rendering görs med React för DOM-strukturen och D3 för skalor/uppdateringar via refs — inte omrendering av hela komponentträdet per datatick.

## Struktur

Källkoden ligger i [src/marey-chart/](src/marey-chart/):

- [MareyChart.tsx](src/marey-chart/MareyChart.tsx) — rotkomponenten, tar emot `panels` + `config`, mäter containerstorlek, äger den delade y-skalan och fördelar bredd mellan paneler.
- [ChartPanel.tsx](src/marey-chart/ChartPanel.tsx) — en enskild panel (huvudvy eller gren): egen x-skala, `GridLines`, `XAxis`, `YAxis`, `TrainLayer`, `NowLine`.
- [XAxis.tsx](src/marey-chart/XAxis.tsx) / [useXForStation.ts](src/marey-chart/useXForStation.ts) — stationspositionering (blend-funktionen).
- [YAxis.tsx](src/marey-chart/YAxis.tsx) / [useYScale.ts](src/marey-chart/useYScale.ts) / [yScale.ts](src/marey-chart/yScale.ts) / [clampYDomain.ts](src/marey-chart/clampYDomain.ts) — tidsaxel, zoom/pan-klampning, "följer nu"-logik.
- [GridLines.tsx](src/marey-chart/GridLines.tsx) — timmes-/10-minuterslinjer.
- [NowLine.tsx](src/marey-chart/NowLine.tsx) — den live-uppdaterande nu-linjen.
- [TrainLayer.tsx](src/marey-chart/TrainLayer.tsx) / [TrainLine.tsx](src/marey-chart/TrainLine.tsx) — ritar tågens linjer.
- [MareyChartContext.tsx](src/marey-chart/MareyChartContext.tsx) — delar skalorna mellan huvudkomponenten och dess barn.
- [types.ts](src/marey-chart/types.ts) — datamodell (`Station`, `Train`, `TrainPoint`, `MareyChartPanel`, `MareyChartConfig`).
- [config.ts](src/marey-chart/config.ts) — standardkonfiguration.
- [index.ts](src/marey-chart/index.ts) — publikt API som exporteras från paketet.

Designbeslut och bakgrund finns dokumenterade i [docs/superpowers/specs/](docs/superpowers/specs/) och byggplaner i [docs/superpowers/plans/](docs/superpowers/plans/).

[src/main.tsx](src/main.tsx) är en dev-sandbox (inte del av det publika API:t) som visar komponenten med mockdata, inklusive flera grenpaneler och reglage för att experimentera med x-axelns layoutparametrar.

## Kom igång

```bash
npm install
npm run dev      # startar dev-sandboxen på http://localhost:5173
npm run build    # typkontroll + produktionsbygge till dist/
npm run test     # kör testsviten (vitest)
npm run lint     # kör eslint
```

Projektet byggs med Vite + TypeScript + React och testas med Vitest/Testing Library. Push till `main` bygger och publicerar dev-sandboxen till GitHub Pages via [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml).

## Användning

```tsx
import { MareyChart, defaultConfig } from './marey-chart';
import type { Station, Train } from './marey-chart';

const stations: Station[] = [
  { id: 'a', name: 'Alpha', distanceKm: 0 },
  { id: 'b', name: 'Beta', distanceKm: 10 },
];

const trains: Train[] = [
  { id: 't1', points: [
    { time: new Date(), place: 'a' },
    { time: new Date(Date.now() + 15 * 60_000), place: 'b' },
  ] },
];

<MareyChart
  panels={[{ id: 'main', stations, trains }]}
  config={defaultConfig}
/>
```

För flera paneler (huvudvy + grenar) lägger man till fler objekt i `panels`-arrayen — se `src/main.tsx` för ett komplett exempel.
