const { loadContentData, resolveLinkedContent } = require("../lib/content-data.js");

const content = loadContentData();

function countReports(categories) {
  return content.reports.filter((report) =>
    (report.categories || []).some((category) => categories.includes(category)) ||
    categories.includes(report.dominant_category)
  ).length;
}

function countClaims(categories) {
  return content.claims.filter((claim) => categories.includes(claim.category)).length;
}

function countEvidence(categories) {
  return content.evidence.filter((entry) => categories.includes(entry.topic)).length;
}

function withIssueStats(issue) {
  return {
    ...issue,
    stats: {
      claims: countClaims(issue.related_categories),
      reports: countReports(issue.related_categories),
      evidence: countEvidence(issue.related_categories),
    },
    links: resolveLinkedContent(issue),
  };
}

module.exports = [
  {
    order: 1,
    slug: "adildarferlid-og-hvad-er-kosid-um",
    title: "Aðildarferlið og hvað er kosið um",
    question: "Hvað er í raun verið að kjósa um 29. ágúst 2026?",
    short_answer:
      "Samkvæmt efni síðunnar snýst atkvæðið um framhald viðræðna Íslands við Evrópusambandið, ekki endanlega aðild á sama degi. Kjarnaspurningin er því hvaða umboð eigi að gefa stjórnvöldum til næstu skrefa.",
    key_points: [
      "Kosið er um hvort halda eigi viðræðum áfram, ekki um fulla aðild sama dag.",
      "Mikilvægt er að skilja hvað yrði ákveðið strax og hvað kæmi síðar í ferlinu.",
      "Önnur ágreiningsefni á síðunni ráðast að hluta af því hvernig þessi grunnspurning er túlkuð.",
    ],
    why_it_matters:
      "Mikill hluti umræðunnar fer strax í sjávarútveg, landbúnað eða fullveldi, en fyrir almenning skiptir fyrst máli að skilja sjálfa spurninguna, hvað já eða nei breytir í ferlinu og hvaða atriði kæmu síðar til mats.",
    main_disagreement:
      "Ágreiningurinn snýst um hvort atkvæðið eigi fyrst og fremst að veita umboð til að afla skýrari samningsmyndar eða hvort sjálft skrefið móti niðurstöðuna og skapi væntingar áður en endanleg mynd liggur fyrir.",
    before_you_go_deeper:
      "Haltu aðskildu því sem yrði ákveðið í þessari kosningu og því sem þyrfti síðar að semja eða kjósa um.",
    supporters_view:
      "Stuðningsfólk áframhaldandi viðræðna leggur áherslu á að þjóðin eigi að fá skýrari mynd af samningsstöðu og mögulegum niðurstöðum áður en lokaafstaða er tekin um aðild.",
    critics_view:
      "Gagnrýnendur telja að ferlið sjálft sendi pólitískt merki, kalli fram væntingar sem erfitt sé að stíga til baka frá og að mikilvæg óvissa sé þegar til staðar um hvað væri í boði.",
    editorial_synthesis:
      "Gögnin á ESBvaktinni benda til þess að ágreiningurinn snúist ekki aðeins um ESB sjálft heldur um skrefaskiptingu ferlisins: hvað er verið að fela ríkisstjórninni að gera núna og hvað yrði áfram óákveðið þar til seinna. Þess vegna er gagnlegt að byrja á þessari spurningu áður en farið er í einstaka málaflokka.",
    related_categories: ["sovereignty", "eea_eu_law"],
    linked_reports: [
      "hvers-vegna-er-umsoknin-til-evropusambandsins-fra-2009-falin",
      "engin-fordaemi-fyrir-leid-islands-i-att-ad-esb",
      "treystu-thjodinni-opid-bref-til-forsaetisradherra-islands",
    ],
    linked_claims: [
      "thjodaratkvaedagreidsla-um-aframhald-adildarvidraedna-vid-esb-er-aaetlud-29-agust-2026",
      "rikisstjornin-hefur-lagt-fram-thingalyktunartillogu-um-thjodaratkvaedagreidslu-um-framhald-adildarvidraedna-vid-esb",
      "95-percent-af-reglubokum-esb-eru-ohagganlegar-og-umsoknarriki-geta-adeins-samid-um-timalinu-innleidingar-ekki-um-undanthagur",
    ],
    linked_entities: [
      "kristrun-frostadottir",
      "thorgerdur-katrin-gunnarsdottir",
      "sjalfstaedisflokkurinn",
    ],
    linked_evidence: ["SOV-DATA-004", "SOV-DATA-005", "EEA-LEGAL-017"],
    linked_debates: ["157-516", "157-551", "157-543"],
  },
  {
    order: 2,
    slug: "fullveldi-og-lydraedi",
    title: "Fullveldi og lýðræði",
    question: "Myndi ferlið eða hugsanleg aðild færa völd frá Íslandi?",
    short_answer:
      "Þetta er eitt af stærstu ágreiningsefnunum. Umræðan skiptist milli þeirra sem líta á aðild sem pólitískt samstarf með sameiginlegum reglum og þeirra sem telja hana fela í sér of mikla tilfærslu valds, sérstaklega um auðlindir, löggjöf og stefnumótun.",
    key_points: [
      "Orðið fullveldi er notað bæði um lagaleg völd og pólitískt svigrúm.",
      "Margar fullyrðingar snúast um tiltekin valdssvið, ekki óhlutbundið sjálfstæði.",
      "Spurningin er oft hvort Ísland hafi meiri áhrif innan kerfis eða meira svigrúm utan þess.",
    ],
    why_it_matters:
      "Þetta er málaflokkurinn sem oftast tengir saman tilfinningar, stjórnarskrárspurningar og hagnýt áhrif. Fyrir almenning er mikilvægt að greina á milli almennra orða um fullveldi og þeirra tilteknu valdsviða sem gögnin fjalla um.",
    main_disagreement:
      "Ágreiningurinn snýst um hvort þátttaka í sameiginlegu kerfi auki áhrif Íslands eða hvort hún færi lykilákvarðanir lengra frá kjósendum og veikji beina stjórn á auðlindum og reglum.",
    before_you_go_deeper:
      "Ef fullyrðing talar um fullveldi skaltu spyrja hvaða vald sé í húfi og hvort verið sé að lýsa lagalegri staðreynd eða pólitísku mati.",
    supporters_view:
      "Stuðningsfólk bendir á að smáríki taki þátt í sameiginlegum stofnunum með samningsbundnum hætti og geti haft áhrif innan kerfis sem þau standa annars utan við.",
    critics_view:
      "Gagnrýnendur leggja áherslu á að ákvarðanir sem nú eru teknar hérlendis eða í gegnum EES-samstarfið gætu færst lengra frá kjósendum og að auðlindir og reglusetning verði erfiðari að stýra á eigin forsendum.",
    editorial_synthesis:
      "ESBvaktin sýnir að fullyrðingar um fullveldi eru mjög oft blanda af lagalegum staðreyndum og pólitísku mati. Næsta skref fyrir almenning er því að spyrja alltaf: hvaða vald er verið að tala um, hvaða stofnun, og hvaða heimildir styðja þá lýsingu?",
    related_categories: ["sovereignty", "eea_eu_law"],
    linked_reports: [
      "raunveruleg-svik-vid-fullveldi-thjodarinnar",
      "hvers-vegna-er-umsoknin-til-evropusambandsins-fra-2009-falin",
      "treystu-thjodinni-opid-bref-til-forsaetisradherra-islands",
    ],
    linked_claims: [
      "ekki-var-vidhaft-opid-samrad-vid-almenning-adur-en-thingsalyktunartillagan-var-logd-fram-thratt-fyrir-skyldu-samkvaemt-gildandi-rikisstjornarsamthykkt",
      "utanrikisradherra-bar-thingsalyktunartillogu-um-thjodaratkvaedagreidslu-um-esb-adildarvidraedur-ekki-undir-utanrikismalanefnd-sem-stjornarandstadan-telur-brot-a-thingskopum",
      "i-tillogum-ad-nyrri-stjornarskra-eru-tryggd-yfirrad-thjodarinnar-yfir-sameiginlegum-audlindum-lands-og-sjavar-og-akvaedi-um-ad-herskyldu-megi-aldrei-i-log-leida",
    ],
    linked_entities: [
      "sjalfstaedisflokkurinn",
      "samfylkingin",
      "utanrikisraduneytid",
    ],
    linked_evidence: ["SOV-DATA-004", "EEA-LEGAL-017", "PREC-DATA-004"],
    linked_debates: ["157-551", "157-516", "149-64"],
  },
  {
    order: 3,
    slug: "sjavarutvegur",
    title: "Sjávarútvegur",
    question: "Er sjávarútvegurinn stærsta hagsmunamálið í þessari umræðu?",
    short_answer:
      "Í núverandi gagnasafni síðunnar er sjávarútvegur eitt af allra mest áberandi ágreiningsefnunum. Þar mætast spurningar um auðlindayfirráð, kvótakerfi, aðgang að miðum og efnahagslegt vægi greinarinnar.",
    key_points: [
      "Málefnið snýst bæði um auðlindayfirráð og efnahagslegt vægi greinarinnar.",
      "Umræðan blandar oft saman lagareglum, samningssvigrúmi og pólitískri áhættu.",
      "Sjávarútvegur vegur þungt hér vegna byggða, útflutnings og stjórnar auðlindarinnar.",
    ],
    why_it_matters:
      "Sjávarútvegur snýst ekki bara um fiskveiðar heldur um byggðir, útflutningstekjur, vinnslu og stjórnun auðlindar. Þess vegna fær málaflokkurinn stærra pólitískt vægi hér en víða annars staðar.",
    main_disagreement:
      "Ágreiningurinn snýst um hvort raunverulegt samningssvigrúm og fyrirliggjandi reglur gætu varið íslensk yfirráð nægilega eða hvort áhættan fyrir miðin og kvótakerfið sé of stór til að taka skrefið áfram.",
    before_you_go_deeper:
      "Hafðu aðskilið það sem er lagalega bundið, það sem gæti orðið samningsatriði og það sem er sett fram sem pólitísk áhættusýn.",
    supporters_view:
      "Stuðningsfólk áframhaldandi viðræðna segir að mikilvægt sé að staðreyna hvað sé samningsatriði, hvað sé þegar bundið af alþjóðareglum og hvort svigrúm Íslands sé víðara en andstæðingar segja.",
    critics_view:
      "Gagnrýnendur telja að þetta sé einmitt sviðið þar sem áhættan sé mest og að óvissa um yfirráð, kvóta og aðgang annarra ríkja að miðunum sé of mikil til að taka léttvægt.",
    editorial_synthesis:
      "Á ESBvaktinni sést að margir sterkustu árekstrarnir snúast um hvað sé sennilegt, hvað sé lagalega tryggt og hvað sé pólitískt samningsatriði. Fyrir almenning er gagnlegt að halda þessum þremur lögum aðskildum þegar málflutningurinn harðnar.",
    related_categories: ["fisheries"],
    linked_reports: [
      "svarar-ekki-beint-um-undanthagur-en-segir-stodu-islands-sterka",
      "esb-og-sjavarutvegurinn-hver-a-ad-rada-hafinu-vid-island",
      "raunveruleg-svik-vid-fullveldi-thjodarinnar",
    ],
    linked_claims: [
      "eu-fleets-from-spain-france-and-portugal-would-gain-access-to-icelandic-fishing-grounds-under-eu-membership",
      "eu-membership-would-replace-iceland-s-itq-system-with-centralised-quotas-set-in-brussels",
      "fishing-and-fish-processing-account-for-over-40-percent-of-iceland-s-export-earnings",
    ],
    linked_entities: [
      "islenska-utgerdin",
      "sjalfstaedisflokkurinn",
      "thorgerdur-katrin-gunnarsdottir",
    ],
    linked_evidence: ["FISH-COMP-005", "FISH-LEGAL-004", "FISH-COMP-001"],
    linked_debates: ["140-396", "138-240", "139-291"],
  },
  {
    order: 4,
    slug: "landbunadur",
    title: "Landbúnaður",
    question: "Hvernig gæti ESB-ferlið snert íslenskan landbúnað?",
    short_answer:
      "Landbúnaður er eitt þeirra sviða þar sem rætt er um mestar og varanlegastar breytingar. Þar blandast saman innflutningsvernd, stuðningskerfi, byggðasjónarmið og samanburður við CAP-stefnu Evrópusambandsins.",
    key_points: [
      "Landbúnaður tengir saman matvælaöryggi, byggðamál, verðlag og afkomu bænda.",
      "Ágreiningurinn snýst bæði um markaðsaðgang og um hvernig stuðningskerfi myndu breytast.",
      "Samanburður við CAP segir lítið nema hann sé settur í íslenskt samhengi.",
    ],
    why_it_matters:
      "Fyrir marga kjósendur snýst þetta um matvælaöryggi, byggðamál og afkomu bænda. Fyrir aðra snýst þetta um verðlag, tollavernd og hvort ný stuðningskerfi gætu opnað önnur tækifæri.",
    main_disagreement:
      "Ágreiningurinn snýst um hvort breytingar á regluverki og vöruflæði myndu fyrst og fremst veikja íslenskan landbúnað eða hvort ný stuðningsúrræði og breiðari samanburður við Evrópu breyti myndinni.",
    before_you_go_deeper:
      "Berðu alltaf saman stuðningskerfi, markaðsaðgang og byggðasjónarmið; ein hlið málsins segir sjaldan alla söguna.",
    supporters_view:
      "Stuðningsfólk bendir á að samanburður við önnur lönd og CAP-styrki sýni að breytingar séu ekki eins einfaldar og oft er haldið fram og að sumir hlutar kerfisins gætu falið í sér ný úrræði.",
    critics_view:
      "Gagnrýnendur segja að opnara vöruflæði og breytt regluverk myndi hitta íslenskan landbúnað sérstaklega hart, bæði vegna aðstæðna hérlendis og þess hversu mikið núverandi kerfi byggir á sértækri vernd.",
    editorial_synthesis:
      "Í efni ESBvaktarinnar kemur fram að landbúnaður er ekki jaðarmál heldur kjarni í spurningunni um hvers konar aðlögun Ísland væri raunverulega tilbúið að fara í. Þess vegna er gagnlegt að skoða bæði stuðningskerfin og markaðsaðganginn samtímis.",
    related_categories: ["agriculture"],
    linked_reports: [
      "esb-adild-hefdi-veruleg-neikvaed-ahrif-a-hagsmuni-islenskra-baenda",
      "raeda-tharf-alla-kaflana-a-nyjan-leik",
      "390-000-hektarar-af-landbunadarlandi-breytast-i-skog-og-votlendi",
    ],
    linked_claims: [
      "engar-varanlegar-almennar-undanthagur-fra-sameiginlegri-landbunadarstefnu-esb-hafa-verid-veittar-eingongu-timabundnar",
      "baendasamtokin-sja-engin-serstok-taekifaeri-fyrir-heildarhagsmuni-islensks-landbunadar-med-esb-adild",
      "evropusambandid-rekur-umfangsmesta-studningskerfi-landbunadar-i-heiminum-i-gegnum-cap-og-morg-evropulond-hafa-fengid-fjarhagslegan-studning-til-ad-endurheimta-votlendi-og-draga-ur-losun",
    ],
    linked_entities: [
      "baendasamtok-islands",
      "evropuhreyfingin",
      "kristrun-frostadottir",
    ],
    linked_evidence: ["AGRI-LEGAL-004", "AGRI-DATA-001", "AGRI-COMP-001"],
    linked_debates: ["140-848", "141-340", "139-1319"],
  },
  {
    order: 5,
    slug: "ees-og-esb-loggjof",
    title: "EES og ESB-löggjöf",
    question: "Hversu mikið af reglunum væri samningsatriði og hversu mikið ekki?",
    short_answer:
      "Þessi hluti umræðunnar snýst um mörkin á milli þess sem telst fast regluverk, þess sem er hægt að semja um í aðildarferli og þess sem Ísland býr þegar við í gegnum EES. Þetta er oft tæknilegasta en jafnframt mikilvægasta spurningin fyrir skýra umræðu.",
    key_points: [
      "Spurningin snýst um mörkin á milli EES-reglna, ESB-reglna og samningssvigrúms.",
      "Stór orð um reglubók, undanþágur og blaðsíður þurfa alltaf að vera tengd við tiltekin dæmi.",
      "Þetta er tæknilegt mál en lykill að því að skilja margar stærstu fullyrðingarnar.",
    ],
    why_it_matters:
      "Margir kjósendur heyra stór orð um „100 þúsund blaðsíður“, „undanþágur“ eða „óumsemjanlegt regluverk“ án þess að sjá hvaða hlutar kerfisins er verið að ræða. Hér skiptir máli að tengja slagorð við heimildir.",
    main_disagreement:
      "Ágreiningurinn snýst um hvort aðildarferlið myndi í reynd fyrst og fremst fela í sér upptöku fyrirliggjandi regluverks eða hvort meira pólitískt samningssvigrúm sé til staðar en andstæðingar telja.",
    before_you_go_deeper:
      "Tengdu stór orð um reglubók og undanþágur við tiltekin laga- eða samningsatriði áður en þú dregur ályktanir.",
    supporters_view:
      "Stuðningsfólk segir að raunveruleg mynd sé blanda af föstum reglum, aðlögunartímabilum og pólitísku samningssvigrúmi sem þarf að skoða í samhengi, ekki aðeins með einni tölu eða einni setningu.",
    critics_view:
      "Gagnrýnendur leggja áherslu á að aðildarferlið fari fyrst og fremst út á að taka við fyrirliggjandi regluverki og að svigrúm til undanþága sé mun minna en stundum er gefið í skyn.",
    editorial_synthesis:
      "Ef almenningur ætlar að mynda sér skoðun á þessu sviði er gagnlegt að byrja á því sem gögnin geta svarað beint: hvaða lög eða reglur eru þegar í gildi í gegnum EES, hvað er sérstaklega nefnt sem samningsatriði og hvaða fullyrðingar eru enn ósannanlegar eða aðeins að hluta staðfestar.",
    related_categories: ["eea_eu_law"],
    linked_reports: [
      "engin-fordaemi-fyrir-leid-islands-i-att-ad-esb",
      "ekki-vist-hvernig-evropusambandid-bregst-vid",
      "hvers-vegna-er-umsoknin-til-evropusambandsins-fra-2009-falin",
    ],
    linked_claims: [
      "95-percent-af-reglubokum-esb-eru-ohagganlegar-og-umsoknarriki-geta-adeins-samid-um-timalinu-innleidingar-ekki-um-undanthagur",
      "regluverk-esb-acquis-telur-um-100-000-bladsidur-og-er-ekki-umsemjanlegt",
      "morg-esb-riki-hafa-fengid-serlausnir-og-undanthagur-um-malefni-sem-theim-skipta-mali",
    ],
    linked_entities: [
      "thorgerdur-katrin-gunnarsdottir",
      "utanrikisraduneytid",
      "samfylkingin",
    ],
    linked_evidence: ["EEA-LEGAL-017", "EEA-DATA-013", "SOV-DATA-004"],
    linked_debates: ["149-64", "118-87", "157-543"],
  },
  {
    order: 6,
    slug: "fordaemi-annarra-rikja",
    title: "Fordæmi annarra ríkja",
    question: "Hvað má yfirleitt læra af Noregi, Bretlandi, Danmörku og öðrum löndum?",
    short_answer:
      "Samanburður við önnur ríki er stöðugt notaður í umræðunni, en fordæmi hjálpa aðeins ef þau eru sett í rétt samhengi. Noregur, Bretland, Danmörk og ríki sem hafa gengið í ESB segja mismunandi sögur eftir því hvaða spurningu er verið að svara.",
    key_points: [
      "Fordæmi hjálpa aðeins þegar verið er að bera saman sambærileg mál og aðstæður.",
      "Sama land getur verið gagnlegt fordæmi í einum málaflokki en lélegt í öðrum.",
      "Samanburður þarf að skýra hvort verið sé að tala um markaðsaðgang, útgöngu, landbúnað eða stofnanalega stöðu.",
    ],
    why_it_matters:
      "Dæmi annarra ríkja eru oft fljótlegasta leiðin til að styðja pólitískan málstað. Fyrir almenning skiptir því máli að sjá hvort samanburðurinn snýr að markaðsaðgangi, útgönguferli, landbúnaði, sjávarútvegi eða stofnanalegri stöðu.",
    main_disagreement:
      "Ágreiningurinn snýst um hvort reynsla annarra ríkja varpi raunverulegu ljósi á stöðu Íslands eða hvort hún sé of sértæk og ólík til að draga af henni beinar pólitískar ályktanir hér.",
    before_you_go_deeper:
      "Spurðu alltaf hvaða land er borið saman við Ísland, um hvaða málaflokk og hvort aðstæður séu í raun sambærilegar.",
    supporters_view:
      "Stuðningsfólk vísar meðal annars til þess að erfitt geti verið að standa til lengdar utan sameiginlegs ákvarðanaborðs og að sum fordæmi sýni kostnað við hálfa stöðu eða útgöngu.",
    critics_view:
      "Gagnrýnendur benda á að lönd hafi ólíka hagsmuni, stærð og sérstöðu og að því sé varasamt að flytja yfir reynslu annarra ríkja beint yfir á Ísland.",
    editorial_synthesis:
      "ESBvaktin er sterkust þegar hún notar fordæmi til að afmarka hvað sé sambærilegt og hvað ekki. Bestu spurningarnar fyrir lesendur eru því: hvaða land er verið að bera saman við Ísland, um hvaða málaflokk og með hvaða gögnum?",
    related_categories: ["precedents"],
    linked_reports: [
      "raunveruleg-svik-vid-fullveldi-thjodarinnar",
      "engin-fordaemi-fyrir-leid-islands-i-att-ad-esb",
      "trump-sagdur-beita-ser-i-esb-umraedunni-her-a-landi",
    ],
    linked_claims: [
      "brexit-hafi-verid-mjog-erfitt-fyrir-breta-sem-seu-enn-ad-bita-ur-nalinni-og-thvi-se-ekki-audsott-ad-yfirgefa-esb-thegar-i-thad-er-komid",
      "donsk-stjornvold-stefna-ad-thvi-ad-breyta-390-000-hekturum-af-landbunadarlandi-250-000-ha-i-skog-140-000-ha-i-votlendi-sem-samsvarar-um-10-percent-af-raektudu-landi",
      "polish-farmers-had-to-wait-a-decade-to-receive-subsidies-under-the-eu-common-agricultural-policy",
    ],
    linked_entities: [
      "noregur",
      "bresk-stjornvold",
      "donsk-stjornvold",
    ],
    linked_evidence: ["PREC-DATA-003", "PREC-DATA-004", "PREC-DATA-001"],
    linked_debates: ["157-512", "154-186", "156-162"],
  },
].map(withIssueStats);
