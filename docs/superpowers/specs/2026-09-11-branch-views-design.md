# Grenvyer (branch views): design

Källa: brainstorming 2026-09-11. Bygger vidare på [2026-09-11-marey-chart-react-design.md](./2026-09-11-marey-chart-react-design.md) utan att ändra dess låsta beslut om x-axel/y-axel-beteende — det här dokumentet lägger till stöd för flera diagram i rad som delar y-axel.

## Bakgrund och krav

Vissa tåg tangerar den valda huvudvyn (x-axelns stationslista) med bara en punkt — föregående och/eller efterföljande stationer i tågets resa ligger utanför huvudvyn. För att inte tappa den kontexten ska sådana tåg även kunna visas i en egen "grenvy": ett litet eget Marey-diagram med sina egna stationer, placerat i rad bredvid huvudvyn. Ett chart-uppslag kan innehålla mellan 1 (bara huvudvyn) och 6 diagram totalt (huvudvy + upp till 5 grenar).

Varje panel (huvudvy eller gren) är **standalone**: egen stationslista, egna tåg, egen datakälla. En gren kan ha 2 eller fler stationer med olika inbördes avstånd — ingen fast längd (inte nödvändigtvis exakt "föregående + tangering + nästa").

**Viktigt scope-beslut:** Vilka grenar som ska visas och vilka tåg/stationer de innehåller (tangeringsdetektering) är **inte** den här komponentens ansvar. Det beslutas av den anropande applikationen, som skickar in färdiga paneler. `MareyChart` vet ingenting om varför en panel finns — bara hur den ska läggas ut.

## Datamodell och API

```ts
export type MareyChartPanel = {
  id: string;
  stations: Station[];
  trains: Train[];
};

export type MareyChartProps = {
  panels: MareyChartPanel[]; // panels[0] = huvudvy, panels[1..] = grenar
  config?: MareyChartConfig;
};
```

`stations`/`trains`-props på `MareyChart` tas bort helt (ersätts av `panels`). Anropande kod som idag skickar en enda vy byter till `panels={[{ id: 'main', stations, trains }]}`.

`MareyChartConfig` är oförändrad i sin form och delas av samtliga paneler:
- `config.xAxis` (blendWeight, minStationPixelGap, maxSegmentShare) styr layoutkänslan i varje panels egen x-axel-beräkning, samma inställningar för alla paneler.
- `config.yAxis` styr den **enda, delade** tidsdomänen/zoom/pan för hela chart-uppslaget.

Ingen ny typ för "linje"/"gren" behövs i den här komponenten eftersom panel-innehållet redan är färdigberäknat av anroparen.

## Skalor: delad y, per-panel x

`useMareyScales` (som idag beräknar både x och y i en hook) klyvs i två:

- **`useYScale(config: MareyChartConfig['yAxis'], height: number)`** — allt som idag ligger i `useMareyScales` runt tidsdomänen: `yDomain`, `setYDomain`, `isFollowingNow`, `resetToNow`, den mekaniska "följer nu"-timern, `yScale` via `createYScale`. Instansieras **exakt en gång** i `MareyChart`, oavsett antal paneler.
- **`useXForStation(stations: Station[], config: MareyChartConfig['xAxis'], width: number)`** — ren härledning av `xForStation`-mappen (samma logik som idag: `computeBlendedPositions` + `applyPixelConstraints`). Instansieras **en gång per panel**, med den bredd som panelen tilldelats.

`useMareyScales.ts` och dess tester (`useMareyScales.test.ts`, `useMareyScales.followNow.test.ts`) tas bort och ersätts av `useYScale.ts`/`useYScale.*.test.ts` och `useXForStation.ts`/`useXForStation.test.ts`.

Varje panel renderas inuti sin egen `MareyChartProvider` vars `value` kombinerar den delade y-skalan med panelens egna `xForStation`:

```ts
{ xForStation: panelXForStation, yScale, yDomain, setYDomain, isFollowingNow, resetToNow }
```

`MareyChartContext`s form (`MareyChartScales`) är oförändrad. Befintliga leaf-komponenter (`TrainLine`, `GridLines`, `XAxis`, `NowLine`) är oförändrade — de läser bara sin context och vet inte att de sitter i en av flera paneler.

`YAxis`s zoom/pan-yta (den transparenta `rect`en med d3-zoom-bindningen) finns i **varje** panel, så en användare kan panorera/zooma oavsett vilken panel muspekaren står över. Eftersom alla paneler skriver till samma delade `setYDomain` (från den enda `useYScale`-instansen) hålls de automatiskt synkade — ingen extra synkroniseringslogik behövs.

## Layout

`MareyChart` beräknar total tillgänglig plotbredd (containerbredd minus vänster-/högermarginal för y-axel-etiketter), och fördelar den mellan paneler **proportionellt mot antal stationer i varje panel**:

```
panelWidth(i) = totalPlotWidth * panel[i].stations.length / sum(alla panels[].stations.length)
```

Det ger huvudvyn (som normalt har flest stationer) en naturligt större andel av bredden än grenarna, utan att någon panel behöver flaggas som "huvudvy" — panelerna är strukturellt likvärdiga.

Ett fast mellanrum (samma värde som dagens `X_AXIS_LABEL_MARGIN`, 28px) läggs mellan intilliggande paneler för visuell separation. Varje panel renderas i en egen `<g transform="translate(x, 0)">` inom chartets SVG, med sin egen `GridLines`, `XAxis`, `YAxis`, `TrainLayer`, `NowLine`.

### Y-axel-etiketter

`YAxis` får två nya boolean-props: `showLeftLabels`, `showRightLabels` (båda default `true`, för bakåtkompatibilitet i enpanel-fallet och i `YAxis`s egna tester). `MareyChart` sätter:
- Första panelen (`index === 0`): `showLeftLabels = true`, `showRightLabels = (panels.length === 1)`
- Sista panelen (`index === panels.length - 1`, om fler än en panel): `showRightLabels = true`, `showLeftLabels = false`
- Mellanliggande paneler: båda `false`

Vid en enda panel blir beteendet identiskt med dagens (etiketter på båda sidor).

### Återställ-knapp

`resetToNow`-knappen (som idag renderas inuti `YAxis`) visas bara i panel `panels[0]` (huvudvyn), centrerad över den panelen — precis som idag. `YAxis` får en `showResetButton`-prop (default `true`) så bara huvudpanelen sätter den till sant; övriga paneler döljer den trots att de har samma `resetToNow`-funktion tillgänglig i sin context.

## Komponentstruktur

- **`useYScale.ts`** (ny) — klyvs ut ur `useMareyScales.ts`.
- **`useXForStation.ts`** (ny) — klyvs ut ur `useMareyScales.ts`.
- **`useMareyScales.ts`** — tas bort.
- **`ChartPanel.tsx`** (ny) — kapslar det som idag ligger i `MareyChart.tsx`s `<g>`: tar `stations`, `trains`, `width`, `height`, delad y-skala (`yScale`, `yDomain`, `setYDomain`, `isFollowingNow`, `resetToNow`), `showLeftLabels`, `showRightLabels`, `showResetButton`, `config`. Beräknar sin egen `xForStation` via `useXForStation`, sätter upp `MareyChartProvider`, renderar `GridLines`/`XAxis`/`YAxis`/`TrainLayer`/`NowLine`.
- **`MareyChart.tsx`** (ändrad) — tar `panels`+`config`, mäter containerstorlek (`useContainerSize`, oförändrad), instansierar den enda `useYScale`, beräknar per-panel-bredder (stationsviktat), itererar `panels` och renderar en `ChartPanel` per panel med rätt `translate(x, 0)` och label-flaggor.
- **`MareyChartContext.tsx`** — oförändrad.
- **`YAxis.tsx`** — lägger till `showLeftLabels`, `showRightLabels`, `showResetButton` props (alla default `true`).

## Migrering av befintlig kod

- `main.tsx`: `MareyChart`-anropet byter till `panels={[{ id: 'main', stations: mockStations, trains: mockTrains }]}`. Ett andra mock-exempel läggs till med en gren (en extra station utanför huvudvyns lista + ett tåg som tangerar huvudvyn i en punkt och fortsätter till grenstationen) så flera paneler kan verifieras visuellt i sandboxen.
- `MareyChart.test.tsx`: skrivs om för `panels`-API:et; nya tester läggs till för: breddfördelning proportionell mot stationsantal, label-flaggor på rätt paneler, återställ-knapp bara på panels[0], oförändrat beteende vid en enda panel.
- `YAxis.test.tsx`: nya tester för `showLeftLabels`/`showRightLabels`/`showResetButton` (default-fallet ska matcha dagens beteende exakt).
- Nya testfiler: `useYScale.test.ts` (flyttat innehåll från `useMareyScales.test.ts`/`useMareyScales.followNow.test.ts`), `useXForStation.test.ts` (flyttat x-axel-delen), `ChartPanel.test.tsx`.

Arbetssätt: TDD (tester skrivs innan implementation) i linje med projektets befintliga teststil.

## Uttryckligen utanför scope

- Tangeringsdetektering (vilka tåg som "bara nuddar" huvudvyn) och gren-linjedefinitioner i datakällan — appens ansvar, inte den här komponentens.
- Olika `config` per panel (t.ex. andra `xAxis`-inställningar för grenar än för huvudvyn) — alla paneler delar samma `config` i denna iteration.
- Rubrik/etikett per panel för att visa vilken linje en gren representerar — inte efterfrågat, kan läggas till senare om behov uppstår.
- Canvas-fallback vid prestandaproblem med många paneler — samma öppna skuld som redan noterad i grunddesignen.
