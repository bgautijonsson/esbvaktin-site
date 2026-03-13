---
layout: base.njk
title: Aðferðafræði
description: Aðferðafræði ESB Vaktarinnar — hvernig fullyrðingar eru metnar og greiningar framkvæmdar.
---

# Aðferðafræði

## Yfirlit

ESB Vaktin er sjálfvirkt greiningarkerfi sem fylgist stöðugt með opinberri umræðu um þjóðaratkvæðagreiðsluna um Evrópusambandið. Kerfið skannar fréttamiðla og aðrar heimildir, dregur út fullyrðingar, metur þær á móti staðreyndagrunni og birtir niðurstöður á þessari vefsíðu.

Verkefnið er byggt á spjallmenninu Claude frá Anthropic. Claude skrifar allan texta á síðunni — greiningar, samantektir og vikuyfirlit. Brynjólfur Gauti Guðrúnar Jónsson, tölfræðingur, hannar aðferðafræðina, sér um staðreyndagrunn og fer yfir niðurstöður sem ritstjóri.

## Leiðin frá frétt til mats

### 1. Vöktun

Fréttasöfnunarkerfi skannar íslenska fjölmiðla á hálfrar klukkustundar fresti — meðal annars RÚV, Morgunblaðið, Vísi, DV, Heimildin og Nútímann. Einnig er efni sótt af vefsíðum stjórnmálaflokka og hagsmunahópa. Kerfið greinir sjálfkrafa greinar sem varða ESB-umræðuna og skráir þær í gagnagrunn.

Að auki eru skoðaðar umræður á Alþingi frá 1991 til dagsins í dag og panelþættir eins og Silfrið, Víkulokin og Spursmál.

### 2. Útdráttur fullyrðinga

Claude les hverja grein og dregur kerfisbundið út fullyrðingar sem hægt er að meta á móti gögnum — staðhæfingar um lög, tölur, fordæmi eða afstöðu. Hver fullyrðing er skráð með upprunalegri tilvitnun, efnisflokki og nafni ræðumanns þar sem við á.

Fullyrðingar eru bornar saman við fullyrðingabanka — safn áður metinna fullyrðinga. Ef sama fullyrðingin hefur þegar verið metin er fyrra mat endurnýtt, sem tryggir samræmi og sparar vinnu.

### 3. Staðreyndagrunnur

Greiningar byggjast á staðreyndagrunni með yfir 350 heimildum í 13 efnisflokkum:

- **Lagaákvæði** — EES-samningurinn, ESB-sáttmálar, Lissabon-sáttmálinn, stjórnarskrárákvæði
- **Efnahagsgögn** — Hagstofa Íslands, Eurostat, OECD, Seðlabanki Íslands
- **Alþjóðleg fordæmi** — reynsla annarra ríkja af ESB-aðild, úrsögn (Brexit) og aðildarferlum
- **Afstaða samtaka** — opinber afstaða stjórnmálaflokka og hagsmunaaðila
- **Þingræður** — ræður á Alþingi um Evrópumál
- **Fræðigreinar** — ritrýndar rannsóknir og sérfræðigreiningar

Þegar heimildanúmer (t.d. FISH-DATA-001) birtist í greiningu er hægt að smella á það til að skoða upprunagögnin.

Kerfið notar merkingarleit (*semantic search*) til að finna viðeigandi heimildir fyrir hverja fullyrðingu sjálfkrafa, í stað þess að reiða sig á handvirka tengingu.

### 4. Mat

Claude ber hverja fullyrðingu saman við viðeigandi heimildir og metur hversu vel gögn styðja hana. Samhliða er greind umfjöllun greinarinnar í heild — hvað er sagt, hverju er sleppt, og hvort sjónarhorn hallar á aðra hlið.

Fullyrðingum er skipt í fimm trúverðugleikaflokka:

- **Staðfest** — fullyrðingin er studd af áreiðanlegum gögnum og heimildum
- **Að hluta staðfest** — kjarninn er réttur en orðalag eða samhengi er ónákvæmt
- **Óstutt** — engin áreiðanleg gögn styðja fullyrðinguna
- **Villandi** — fullyrðingin notar rétt gögn á villandi hátt eða sleppir mikilvægu samhengi
- **Ósannanlegt** — ekki er hægt að sannreyna fullyrðinguna með tiltækum gögnum


## Sjálfbatnandi kerfi

Eitt af lykileinkennum ESB Vaktarinnar er að kerfið batnar sjálft með tímanum:

- **Vaxandi staðreyndagrunnur** — eftir því sem fleiri heimildir bætast við getur kerfið metið fullyrðingar sem áður voru ósannanlegar. Reglulegar endurskoðanir finna þessar fullyrðingar og uppfæra mat þeirra.
- **Fullyrðingabanki** — þegar fullyrðing hefur verið metin einu sinni er matið endurnýtt hvenær sem sama fullyrðingin birtist í nýrri grein eða umræðu. Þetta tryggir samræmi og gerir umfjöllun skilvirkari.

## Jafnvægi

Fullyrðingamatið gildir jafnt um ESB-jákvæðar og ESB-gagnrýnar fullyrðingar. Sami fimm stiga kvarðinn er notaður hvort sem fullyrðingin kemur frá stuðningsmönnum eða andstæðingum aðildar. Markmið ESB Vaktarinnar er ekki að taka afstöðu heldur að meta hvort fullyrðingar standist skoðun gagnvart áreiðanlegum heimildum.

## Leiðréttingar og endurskoðun

Allt mat er endurskoðanlegt. Ef ný gögn koma fram sem breyta forsendum mats er fullyrðingin endurmetin og niðurstaðan uppfærð. Kerfið leitar reglulega að fullyrðingum sem áður voru flokkaðar sem ósannanlegar en gætu nú verið metanlegar vegna nýrra heimilda. Allar breytingar á mati eru raktar í gagnagrunni.

Ef þú telur að mat sé rangt eða heimildir vanti, sendu athugasemd á [info@esbvaktin.is](mailto:info@esbvaktin.is).

## Gagnsæi

Allar forsendur og heimildir eru birtar með hverri greiningu. Hægt er að rekja hverja niðurstöðu til ákveðinna heimilda í staðreyndagrunni. Aðferðafræðin er opin til skoðunar og gagnrýni.

## Hlutverk gervigreindar

ESB Vaktin notar Claude (Anthropic) sem kjarna greiningarkerfisins. Mismunandi útgáfur af Claude sjá um mismunandi verkefni:

- **Fréttaskönnun** — Claude greinir sjálfkrafa hvaða greinar varða ESB-umræðuna
- **Útdráttur fullyrðinga** — Claude les greinar og dregur kerfisbundið út matshæfar fullyrðingar
- **Greining og mat** — Claude ber fullyrðingar saman við heimildir og metur samræmi
- **Vanefnisgreining** — Claude greinir hvað greinar sleppa og hvort sjónarhorn hallar á aðra hlið
- **Textavinnsla** — Claude skrifar allar greiningar, samantektir og vikuyfirlit á íslensku

Brynjólfur Gauti starfar sem ritstjóri og verkefnastjóri: hann hannar aðferðafræðina, sér um heimildagrunn, ákveður hvaða efni er greint og fer yfir niðurstöður. Claude framkvæmir greiningarnar innan þess ramma.

## Tæknilegar upplýsingar

Vefsíðan er kyrrstæð (*static site*) og er byggð með [Eleventy](https://www.11ty.dev/). Gagnasöfn síðunnar eru birt sem kyrrstæð JSON-gögn sem eru sótt og síuð í vafranum. Greiningarkerfið notar PostgreSQL gagnagrunn með merkingarleitarvísitölu (*semantic search*) til að tengja fullyrðingar við heimildir.
