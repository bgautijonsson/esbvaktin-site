---
layout: base.njk
title: Aðferðafræði
description: Aðferðafræði ESBvaktinar — hvernig fullyrðingar eru metnar og greiningar framkvæmdar.
---

# Aðferðafræði

## Fullyrðingamat

Fullyrðingar í ESB-umræðunni eru metnar á fimm stiga kvarða:

- **Staðfest** — fullyrðingin er studd af áreiðanlegum gögnum og heimildum
- **Að hluta staðfest** — kjarninn er réttur en orðalag eða samhengi er ónákvæmt
- **Óstutt** — engin áreiðanleg gögn styðja fullyrðinguna
- **Villandi** — fullyrðingin notar rétt gögn á villandi hátt eða sleppir mikilvægu samhengi
- **Ósannanlegt** — ekki er hægt að sannreyna fullyrðinguna með tiltækum gögnum

## Gagnasöfn

Greiningar byggjast á gagnagrunni sem inniheldur:

- **Lagaákvæði** — EES-samningurinn, ESB-sáttmálar, stjórnarskrárákvæði
- **Efnahagsgögn** — Hagstofa, Eurostat, OECD, Seðlabanki
- **Alþjóðleg fordæmi** — reynsla annarra ríkja af ESB-aðild og úrsögn
- **Afstaða samtaka** — opinber afstaða stjórnmálaflokka og hagsmunaaðila
- **Fræðigreinar** — ritrýndar rannsóknir og sérfræðigreiningar

## Gagnsæi

Allar forsendur og heimildir eru birtar með hverri greiningu. Aðferðafræðin er opin til skoðunar og gagnrýni.

## Tæknilegar upplýsingar

Fullyrðingavaktin notar [DuckDB-WASM](https://duckdb.org/docs/api/wasm/overview) til að keyra gagnagreiningar beint í vafranum. Engin gögn eru send til netþjóns — öll leit og síun fer fram á tölvu notandans.
