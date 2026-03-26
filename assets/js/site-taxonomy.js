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
    verdictLabel: function(verdict, epistemicType) {
      var type = epistemicType || "factual";
      var labels = this.verdictLabels[type] || this.verdictLabels.factual;
      return labels[verdict] || verdict;
    },
    verdictDescriptions: {
      supported: "Heimildir styðja þessa fullyrðingu",
      partially_supported: "Heimildir styðja hluta fullyrðingarinnar en ekki alla",
      unsupported: "Heimildir sem við höfum styðja ekki þessa fullyrðingu",
      misleading: "Fullyrðingin er ekki röng í sjálfu sér en heimildir sýna mikilvægt samhengi sem vantar",
      unverifiable: "Við höfum ekki enn heimildir til að meta þessa fullyrðingu",
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
    },
    attributionLabels: {
      quoted: "Tilvitnað",
      asserted: "Fullyrt",
      paraphrased: "Umorðað",
      mentioned: "Nefnt",
    },
    partyClasses: {
      "Sjálfstæðisflokkur": "party-xd",
      "Samfylkingin": "party-s",
      "Framsóknarflokkur": "party-b",
      "Miðflokkurinn": "party-m",
      "Viðreisn": "party-c",
      "Vinstrihreyfingin - grænt framboð": "party-v",
      "Píratar": "party-p",
      "Flokkur fólksins": "party-f",
      "Hreyfingin": "party-hr",
    },
    partyShortLabels: {
      "Sjálfstæðisflokkur": "xD",
      "Samfylkingin": "Sam",
      "Framsóknarflokkur": "Fram",
      "Miðflokkurinn": "Miðfl",
      "Viðreisn": "Viðr",
      "Vinstrihreyfingin - grænt framboð": "VG",
      "Píratar": "Pír",
      "Flokkur fólksins": "FF",
      "Hreyfingin": "Hreyfing",
    },
  };
});
