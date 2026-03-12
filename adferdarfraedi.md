---
layout: base.njk
title: Aðferðafræði
description: Aðferðafræði ESB Vaktarinnar — hvernig fullyrðingar eru metnar og greiningar framkvæmdar.
---

# Aðferðafræði

## Yfirlit

ESB Vaktin safnar fullyrðingum úr opinberri umræðu um hugsanlega ESB-aðild Íslands, skráir þær í gagnagrunn og metur þær á móti staðreyndagögnum. Verkefnið notar spjallmennið Claude til að greina og flokka fullyrðingar, undir umsjón og ritstjórn Brynjólfs Gauta Guðrúnar Jónssonar.

## Leiðin frá fullyrðingu til mats

### 1. Söfnun

Fullyrðingar eru lesnar úr fjölmiðlaumfjöllun, ræðum á Alþingi, viðtölum og opinberri umræðu. Claude skannar greinar og dregur út fullyrðingar sem hægt er að meta á móti gögnum.

### 2. Staðreyndagrunnur

Greiningar byggjast á staðreyndagrunni sem inniheldur heimildir í 13 efnisflokkum:

- **Lagaákvæði** — EES-samningurinn, ESB-sáttmálar, Lissabon-sáttmálinn, stjórnarskrárákvæði
- **Efnahagsgögn** — Hagstofa Íslands, Eurostat, OECD, Seðlabanki Íslands
- **Alþjóðleg fordæmi** — reynsla annarra ríkja af ESB-aðild, úrsögn (Brexit), og aðildarferlum
- **Afstaða samtaka** — opinber afstaða stjórnmálaflokka og hagsmunaaðila
- **Fræðigreinar** — ritrýndar rannsóknir og sérfræðigreiningar

Þegar heimildanúmer (t.d. FISH-DATA-001) birtist í greiningu er hægt að smella á það til að skoða upprunagögnin.

### 3. Greining

Claude ber hverja fullyrðingu saman við viðeigandi heimildir í staðreyndagrunni. Greiningin tekur tillit til samhengis, orðalags, og hvort gögn styðji fullyrðinguna að fullu, að hluta, eða alls ekki.

### 4. Flokkun

Fullyrðingum er skipt í fimm trúverðugleikaflokka:

- **Staðfest** — fullyrðingin er studd af áreiðanlegum gögnum og heimildum
- **Að hluta staðfest** — kjarninn er réttur en orðalag eða samhengi er ónákvæmt
- **Óstutt** — engin áreiðanleg gögn styðja fullyrðinguna
- **Villandi** — fullyrðingin notar rétt gögn á villandi hátt eða sleppir mikilvægu samhengi
- **Ósannanlegt** — ekki er hægt að sannreyna fullyrðinguna með tiltækum gögnum

### 5. Yfirferð

Brynjólfur Gauti Guðrúnar Jónsson, tölfræðingur, fer yfir greiningar og ber ábyrgð á endanlegum niðurstöðum. Aðferðafræðileg umgjörð verkefnisins er hönnuð til að tryggja samræmi og gagnsæi í mati.

## Jafnvægi

Fullyrðingamatið gildir jafnt um ESB-jákvæðar og ESB-gagnrýnar fullyrðingar. Sami fimm stiga kvarðinn er notaður hvort sem fullyrðingin kemur frá stuðningsmönnum eða andstæðingum aðildar. Markmið ESB Vaktarinnar er ekki að taka afstöðu heldur að meta hvort fullyrðingar standist skoðun gagnvart áreiðanlegum heimildum.

## Gagnsæi

Allar forsendur og heimildir eru birtar með hverri greiningu. Hægt er að rekja hverja niðurstöðu til ákveðinna heimilda í staðreyndagrunni. Aðferðafræðin er opin til skoðunar og gagnrýni.

## Hlutverk Claude

Claude er notað sem verkfæri í þrennu tilliti:

1. **Söfnun** — Claude les greinar og dregur út fullyrðingar sem hægt er að meta
2. **Greining** — Claude ber fullyrðingar saman við staðreyndagrunn og metur samræmi
3. **Textavinnsla** — Claude skrifar drög að greiningum á íslensku

Claude tekur ekki endanlegar ákvarðanir um flokkun fullyrðinga. Það er hlutverk ritstjóra.

## Tæknilegar upplýsingar

Vefsíðan er kyrrstæð (*static site*) sem er byggð með [Eleventy](https://www.11ty.dev/). Gagnasöfn síðunnar eru birt sem kyrrstæð JSON-gögn sem eru sótt og síuð í vafranum. Parquet/DuckDB-WASM er hugsanleg framtíðarleið ef gagnamagnið kallar á það, en er ekki notað í núverandi útgáfu.
