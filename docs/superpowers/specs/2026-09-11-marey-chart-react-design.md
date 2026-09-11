# PrognosGraf – Marey's chart React-komponent: design

Källa: Spote-not `b089594e-2537-4fd1-9c31-817845c45f9b` ("PrognosGraf – Marey's chart React-arkitektur") plus brainstorming 2026-09-11. Denna spec ersätter inte noten utan preciserar y-axelns beteende, container-storlek och modulindelning inför implementation.

## Bakgrund

PrognosGraf visar ett Marey's chart för tåg: stationer på x-axeln, tid på y-axeln. Backend är .NET/Orleans, frontend React SPA. Kurvor och data uppdateras löpande med live-data.

## Beslut som redan är låsta (från tidigare not)

- **Rendering:** React äger DOM-strukturen, D3 äger uppdateringar via refs (`useEffect` + `d3.select(ref.current)`), inte re-render per datatick.
- **X-axel:** fix — varken zoombar eller pannbar. Position beräknas med en blend mellan ekvidistant och proportionell km-skala, konfigurerbar vikt `w`, plus min-pixelavstånd mellan stationer och maxandel av bredden per delsträcka. Ren, testbar funktion frikopplad från React.
- **Komponentträd:** `MareyChart` äger scales via en hook och delar dem via Context till `XAxis`, `YAxis`, `GridLines`, `TrainLayer`/`TrainLine`. `useMareyScales` memoiseras på stations+config, inte på trains.
- **Datamodell:** `TrainPoint = { time: Date; place: string }`, `Train = { id, points }`. Tåg som passerar en okänd station interpolerar rakt mellan kända punkter.
- **Övergångar mellan dataset** (t.ex. ändrad stationslista): axeln snäpper direkt, ingen animation.
- **Fallback vid prestandaproblem:** byt renderingslager till Canvas utan att ändra skala-logiken. Inget konkret tröskelvärde definierat ännu — medveten skuld.

## Nya krav och beslut (denna spec)

### Y-axel: intervall och zoom/pan

- Default synligt intervall vid öppning: **-15 min till +60 min** relativt nu (75 min totalt).
- Zoombart intervall för synlig tidsrymd: **15 min (mest inzoomat) till 6 h (mest utzoomat)**.
- Pan bakåt: **aldrig längre än nu-15 min** — samma gräns som default-minimum. Detta är en absolut bortre gräns, oavsett zoomnivå.
- Pan framåt: **upp till nu+12 h**.
- "Följer nu"-läge: så fort ett zoom/pan-event har en riktig `sourceEvent` (dvs. utlöst av användarens gest, till skillnad från en programmatisk transform som d3 sätter `sourceEvent: null` på) sätts `isFollowingNow = false`. En "återställ till nu"-kontroll sätter den till `true` och återställer domänen till default.
- Så länge `isFollowingNow` är sant glider domänen framåt i takt med klockan via en **mekanisk, glest tickande timer** (intervall konfigurerbart, t.ex. 30 s) — inte kontinuerlig animation. Detta är en öppen implementationsdetalj som får justeras empiriskt.
- Zoom implementeras endimensionellt: `d3.zoom()` binds till ytan, men bara `transform.k` och `transform.y` används — `transform.x` ignoreras. `scaleExtent` beräknas från bas-domänen (75 min vid k=1): `k ∈ [75min/6h, 75min/15min] ≈ [0.21, 5]`.
- Pan-gränserna kan inte uttryckas med d3:s statiska `translateExtent` eftersom "nu" flyttar sig. Lösning: i zoom-eventets handler räknas ny domän ut från transformen och klipps manuellt mot `[nu-15min, nu+12h]` innan den sätts som React-state.

### "Nu"-linjen

- Ska vara **live** — uppdaterar sin pixelposition kontinuerligt (t.ex. varje sekund, eller `requestAnimationFrame` strypt), frikopplad från den mekaniska domän-uppdateringen ovan.
- Implementeras som egen liten modul (`NowLine`) som uppdaterar sig imperativt via en ref, enligt samma mönster som `TrainLine`. Ska inte trigga omräkning av hela y-skalan/ticks.

### Gridlines och etiketter

- Heltimmar: heldragna horisontella streck över hela bredden.
- 10-minutersmarkeringar: streckade, mindre streck.
- Klockslag skrivs ut var 10:e minut, **på båda sidor** av grafen.
- **Öppen fråga, medvetet uppskjuten:** "var 10:e minut" ger för tät etikettsättning vid 6h-zoom (36 etiketter). Initial implementation använder d3:s inbyggda `scale.ticks()` för att välja lämpligt antal ticks/etiketter automatiskt. Det exakta "var 10:e minut"-kravet och ev. trappning av densitet vid utzoomning återkommer vi till som en separat iteration.

### Färger (passerad tid / framtid / nu-linje)

- Enligt SIOS-konvention: passerad tid mörkare än framtid. Exakt paletten är **konfigurerbar**, inte hårdkodad — motiveras av att den kan komma att behöva justeras utan att röra komponentlogik.

### Container / storlek

- Komponenten ska fylla det utrymme den ges av sidan (responsiv bredd och höjd), inte ha egna fasta mått.
- Löses med en wrapper-`<div style="width:100%; height:100%">` och en `ResizeObserver`-baserad hook (`useContainerSize`) som ger `{width, height}` vidare via context/props till SVG:n. Ingen egen storlekslogik i barnkomponenter.

## Modulindelning (uppdaterat komponentträd)

```
<MareyChart trains={trains} stations={stations} config={config}>
  ├─ useContainerSize()              ← ResizeObserver, fyller tillgängligt utrymme
  ├─ useMareyScales(dims, stations, config)
  │     ├─ xScale                    ← fix, blend-funktion (befintlig)
  │     └─ yScaleController          ← egen modul: domän, zoom/pan-klampning, "följer nu"-flagga
  ├─ <MareyChartProvider value={scales}>
  │    ├─ <XAxis />                  ← läser xScale
  │    ├─ <YAxis />                  ← läser yScale, binder d3.zoom, renderar "återställ"-kontroll
  │    ├─ <NowLine />                ← egen modul, egen snabb uppdateringstakt
  │    ├─ <GridLines />              ← heltimme/10-min, läser yScale
  │    └─ <TrainLayer trains={trains}>
  │           └─ <TrainLine key={train.id} points={train.stops} />
  └─ </MareyChartProvider>
```

`yScaleController`, `NowLine` och `GridLines` hålls som separata, oberoende testbara enheter eftersom y-axeln är den del av kravbilden som är mest sannolik att ändras (jfr. redan uppskjutna beslut ovan om etikettdensitet och mekanisk uppdateringstakt).

## Config-form

```ts
type MareyChartConfig = {
  xAxis: {
    blendWeight: number;              // 0–1, ekvidistant vs proportionell km
    minStationPixelGap: number;
    maxSegmentShare: number;          // andel av totalbredd en delsträcka max får ta
  };
  yAxis: {
    defaultPastMs: number;            // 15 min
    defaultFutureMs: number;          // 60 min
    panBackLimitMs: number;           // 15 min, absolut bortre gräns bakåt
    panForwardLimitMs: number;        // 12 h
    zoomMinDurationMs: number;        // 15 min, mest inzoomat
    zoomMaxDurationMs: number;        // 6 h, mest utzoomat
    mechanicalRefreshIntervalMs: number; // takt för domän-glidning i "följer nu"-läge
    colors: {
      past: string;
      future: string;
      nowLine: string;
    };
  };
};
```

## Teststrategi

- **Rena funktioner testas utan DOM:** x-axelns blend-funktion, och en isolerad `clampYDomain(transform, now, bounds)` för y-axelns pan/zoom-klampning. Detta är där logikfel faktiskt uppstår och billigast att testa.
- **d3:s gestigenkänning testas inte** — vi litar på `d3.zoom` för scroll/drag-tolkning. Det som testas är vad som händer efter en transform kommer in (klampning, `isFollowingNow`).
- **Komponenttester** (jsdom + testing-library, `ResizeObserver` mockad): strukturell rendering — rätt antal gridlines vid given domän, att `NowLine` och `TrainLine` renderar förväntat antal element.
- **`NowLine`-takt testas med fake timers:** verifiera att den tickar oberoende av och utan att trigga full omräkning av y-skalan.
- **Visuell verifiering i webbläsare** efter varje modul (moderkomponent → X → Y) — fidelity på diagonala linjer och axel-läsbarhet fångas inte av snapshot-tester.

## Byggordning / iterationer

Uttryckligt önskemål: små, testbara iterationer som kan brytas ner över flera sessioner. Ordning:

1. Moderkomponent: `MareyChart` + `useContainerSize` + kontext, tom SVG som fyller ytan.
2. X-axel: `useMareyScales` (x-delen), blend-funktion, `XAxis`-rendering, med statiska stationer.
3. Tåglager: `TrainLayer`/`TrainLine` med statisk/mockad data, ovanpå fast x-skala.
4. Y-axel grundflöde: `yScaleController` med fast default-domän (ingen zoom/pan än), `GridLines`, `YAxis`-rendering.
5. Y-axel interaktion: zoom/pan-bindning, klampning, "följer nu"-flagga, återställningskontroll.
6. `NowLine`: live-uppdatering, frikopplad från mekanisk domän-refresh.
7. Mekanisk domän-refresh i "följer nu"-läge.
8. Efterjustering: etikettdensitet vid utzoomning, ev. Canvas-fallback om prestanda kräver det.

Varje steg ska vara körbart och visuellt verifierbart för sig innan nästa påbörjas.

## Öppna frågor (medvetet uppskjutna)

- Exakt etikettdensitet vid olika zoomnivåer (initialt: d3:s `scale.ticks()`).
- Konkret tröskelvärde/mätpunkt för när SVG+D3 behöver eskaleras till Canvas.
- Exakt intervall för den mekaniska domän-refreshen i "följer nu"-läge — sätts empiriskt.
