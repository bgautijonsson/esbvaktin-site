(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.ESBvaktinTaxonomy = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  return {
    verdictLabels: {
      factual: {
        supported: "Staðfest",
        partially_supported: "Að hluta staðfest",
        unsupported: "Óstutt",
        misleading: "Þarfnast samhengis",
        unverifiable: "Heimildir vantar",
      },
      prediction: {
        supported: "Víðtæk samstaða",
        partially_supported: "Nokkur stoð",
        unsupported: "Órökstudd",
        misleading: "Ofeinföldun",
        unverifiable: "Heimildir vantar",
      },
      counterfactual: {
        supported: "Víðtæk samstaða",
        partially_supported: "Nokkur stoð",
        unsupported: "Órökstudd",
        misleading: "Ofeinföldun",
        unverifiable: "Heimildir vantar",
      },
      hearsay: {
        unverifiable: "Óstaðfest heimild",
      },
    },
    epistemicTypeLabels: {
      factual: "Staðreynd",
      prediction: "Spá",
      counterfactual: "Tilgáta",
      hearsay: "Orðsögn",
    },
    // Flat access helper for backward compatibility
    verdictLabel: function (verdict, epistemicType) {
      var type = epistemicType || "factual";
      var labels = this.verdictLabels[type] || this.verdictLabels.factual;
      return labels[verdict] || verdict;
    },
    verdictDescriptions: {
      factual: {
        supported: "Heimildir styðja þessa fullyrðingu",
        partially_supported:
          "Heimildir styðja hluta fullyrðingarinnar en ekki alla",
        unsupported: "Heimildir sem við höfum styðja ekki þessa fullyrðingu",
        misleading:
          "Fullyrðingin er ekki röng í sjálfu sér en heimildir sýna mikilvægt samhengi sem vantar",
        unverifiable:
          "Við höfum ekki enn heimildir til að meta þessa fullyrðingu",
      },
      prediction: {
        supported: "Heimildir og sérfræðingar styðja víðtækt þessa spá",
        partially_supported:
          "Heimildir styðja spána að hluta en ekki alla þætti hennar",
        unsupported: "Heimildir sem við höfum styðja ekki rökfærslu spárinnar",
        misleading:
          "Spáin einfaldar of mikið — heimildir sýna mikilvægt samhengi sem vantar",
        unverifiable: "Við höfum ekki enn heimildir til að meta þessa spá",
      },
      counterfactual: {
        supported: "Heimildir og sérfræðingar styðja víðtækt þessa tilgátu",
        partially_supported:
          "Heimildir styðja tilgátuna að hluta en ekki alla þætti hennar",
        unsupported:
          "Heimildir sem við höfum styðja ekki rökfærslu tilgátunnar",
        misleading:
          "Tilgátan einfaldar of mikið — heimildir sýna mikilvægt samhengi sem vantar",
        unverifiable: "Við höfum ekki enn heimildir til að meta þessa tilgátu",
      },
      hearsay: {
        unverifiable:
          "Fullyrðing byggð á ónafngreindum heimildum sem ekki er hægt að staðfesta",
      },
    },
    // Flat access helper — returns description for verdict + epistemic type
    verdictDescription: function (verdict, epistemicType) {
      var type = epistemicType || "factual";
      var descs =
        this.verdictDescriptions[type] || this.verdictDescriptions.factual;
      return descs[verdict] || this.verdictDescriptions.factual[verdict] || "";
    },
    epistemicTypeDescriptions: {
      factual: "Fullyrðing um staðreyndir sem hægt er að bera saman við gögn",
      prediction:
        "Spá um framtíðina — mat byggir á gæðum rökfærslu og samstöðu heimilda",
      counterfactual: "Tilgáta um hvað hefði gerst ef aðstæður væru öðruvísi",
      hearsay: "Fullyrðing sem byggir á ónafngreindum heimildum",
    },
    verdictClasses: {
      supported: "verdict-supported",
      partially_supported: "verdict-partial",
      unsupported: "verdict-unsupported",
      misleading: "verdict-misleading",
      unverifiable: "verdict-unverifiable",
    },
    categoryLabels: {
      fisheries: "Sjávarútvegur",
      trade: "Viðskipti",
      sovereignty: "Fullveldi",
      agriculture: "Landbúnaður",
      labour: "Vinnumarkaður",
      currency: "Gjaldmiðill",
      precedents: "Fordæmi",
      eea_eu_law: "EES/ESB-löggjöf",
      housing: "Húsnæðismál",
      polling: "Kannanir",
      party_positions: "Flokkastefnur",
      org_positions: "Samtakastefnur",
      energy: "Orkumál",
      other: "Annað",
    },
    evidenceSourceTypeLabels: {
      official_statistics: "Opinber tölfræði",
      legal_text: "Lagalegur texti",
      academic_paper: "Fræðigrein",
      expert_analysis: "Sérfræðigreining",
      international_org: "Alþjóðastofnun",
      parliamentary_record: "Þingskjal",
    },
    claimSourceTypeLabels: {
      news: "Frétt",
      opinion: "Skoðun",
      althingi: "Alþingi",
      interview: "Viðtal",
      analysis: "Greining",
      other: "Annað",
    },
    domainLabels: {
      legal: "Lögfræðilegt",
      economic: "Efnahagslegt",
      political: "Stjórnmálalegt",
      precedent: "Fordæmi",
    },
    confidenceLabels: {
      high: "Há",
      medium: "Miðlungs",
      low: "Lág",
    },
    entityTypeLabels: {
      party: "Stjórnmálaflokkur",
      institution: "Samtök/stofnun",
      individual: "Einstaklingur",
      union: "Stéttarfélag",
    },
    entityTypeFilterLabels: {
      party: "Stjórnmálaflokkar",
      politician: "Stjórnmálafólk",
      media: "Fjölmiðlar",
      institution: "Samtök og stofnanir",
      individual: "Einstaklingar",
    },
    stanceFilterLabels: {
      pro_eu: "ESB-jákvæð",
      anti_eu: "ESB-gagnrýnin",
      mixed: "Blandað/hlutlaus",
      insufficient_data: "Of fá gögn",
    },
    maturityLabels: {
      first_assessment: "Fyrsta mat",
      corroborated: "Staðfest",
      contested: "Umdeilanlegt",
    },
    maturityDescriptions: {
      first_assessment: "Einungis eitt mat á þessari fullyrðingu",
      corroborated: "Fleiri en ein heimild styðja þetta mat",
      contested: "Heimildir meta þessa fullyrðingu á mismunandi veg",
    },
    attributionLabels: {
      quoted: "Tilvitnað",
      asserted: "Fullyrt",
      paraphrased: "Umorðað",
      mentioned: "Nefnt",
    },
    partyClasses: {
      Sjálfstæðisflokkur: "party-xd",
      Samfylkingin: "party-s",
      Framsóknarflokkur: "party-b",
      Miðflokkurinn: "party-m",
      Viðreisn: "party-c",
      "Vinstrihreyfingin - grænt framboð": "party-v",
      Píratar: "party-p",
      "Flokkur fólksins": "party-f",
      Hreyfingin: "party-hr",
    },
    partyShortLabels: {
      Sjálfstæðisflokkur: "xD",
      Samfylkingin: "Sam",
      Framsóknarflokkur: "Fram",
      Miðflokkurinn: "Miðfl",
      Viðreisn: "Viðr",
      "Vinstrihreyfingin - grænt framboð": "VG",
      Píratar: "Pír",
      "Flokkur fólksins": "FF",
      Hreyfingin: "Hreyfing",
    },
  };
});
