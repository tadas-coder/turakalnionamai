import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText, Gavel, Wrench, Sparkles, PawPrint, AlertTriangle, Video } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function Rules() {
  return (
    <Layout>
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
                <ScrollText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Dokumentai</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-4">
                Daugiabučio gyvenamo namo V. Mykolaičio-Putino g. 10, Vilniuje vidaus tvarkos
              </h1>
              <p className="text-3xl md:text-4xl font-bold font-display text-primary tracking-widest">
                T A I S Y K L Ė S
              </p>
            </div>

            {/* Intro */}
            <Card className="mb-6">
              <CardContent className="pt-6 space-y-4 text-muted-foreground">
                <p>
                  Už šių taisyklių laikymosi priežiūrą ir baudų skyrimą yra atsakinga daugiabučių namų savininkų bendrija DNSB „Taurakalnio namai, Vilnius", toliau vadinama „Bendrija".
                </p>
                <p>
                  Kiekvienas su šiomis taisyklėmis susipažinęs V.Mykolaičio-Putino g. 10, Vilniuje esančią nekilnojamo turto patalpų savininkas, toliau vadinamas „Savininkas/Bendrijos narys", privalo:
                </p>
              </CardContent>
            </Card>

            {/* Rules Sections */}
            <Accordion type="multiple" defaultValue={["bendrosios"]} className="space-y-4">
              {/* BENDROSIOS TAISYKLĖS */}
              <AccordionItem value="bendrosios" className="border rounded-lg bg-card px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Gavel className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-semibold text-lg">BENDROSIOS TAISYKLĖS</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-6">
                  <p className="font-medium mb-4 text-foreground">Bendrijos narys privalo:</p>
                  <ol className="list-decimal list-outside ml-6 space-y-3 text-muted-foreground">
                    <li>Laikytis Lietuvos Respublikoje galiojančių teisės aktų ir šių taisyklių reikalavimų bei prisiimti atsakomybę ir atlyginti nuostolius.</li>
                    <li>Laikytis bendrijos įstatų, vykdyti bendrijos narių susirinkimo, bendrijos pirmininko, revizoriaus sprendimus.</li>
                    <li>Prisiimti atsakomybę už savo nepilnamečių vaikų, šeimos narių, svečių ir jų auginamų gyvūnų veiksmus, laikinųjų gyventojų ir asmenų, kurie naudojasi savininko patalpomis nuomos sutarties pagrindu, veiksmus, pavojingus aplinkinių sveikatai bei gyvybei, darančius žalą bendro naudojimo turtui.</li>
                    <li>Būstą ar kitą nekilnojamąjį turtą eksploatuoti tik pagal paskirtį, laikantis to būsto ar nekilnojamojo turto eksploatavimo taisyklių. Taip pat užtikrinti, kad šio reikalavimo laikytusi ir asmenys, kurie laikinai naudojasi savininko patalpomis nuomos sutarties pagrindu.</li>
                    <li>Nekeisti patalpų paskirties.</li>
                    <li>Saugoti ir tausoti gyvenamojo namo V.Mykolaičio-Putino g. 10, Vilniuje bendro naudojimo turtą.</li>
                    <li>Laiku ir tinkamai sumokėti Bendrijai už bendro naudojimo turto priežiūrą ir eksploataciją, susijusią su namo bendrojo naudojimo patalpų apsaugos sistemos, šildymo ir kondicionavimo sistemos eksploatavimu, garantinę priežiūrą, remontu, išlaidas, susijusias su namo bendrojo naudojimo objektų priežiūra pagal įstatymų ir kitų teisės aktų nustatytus privalomus statinių naudojimo ir priežiūros reikalavimus, namo bendrojo naudojimo patalpų valymu, taip pat su tinkamų gyvenimo ir buities sąlygų sudarymu namo gyventojams, aprūpinant juos vandeniu, elektra, telefono ryšiu, užtikrinant kitus panašaus pobūdžio darbus ir teikiant kitas komunalines paslaugas pagal sudarytas sutartis su atitinkamų komunalinių paslaugų teikėjais, taip pat išlaidas, susijusias su žemės sklypo naudojimu ir priežiūra - proporcingai jo daliai bendrojoje nuosavybėje. Taip pat apmokėti už kitas Bendrijos individualiai užsakytas ir suteiktas paslaugas (langų valymas, statybinių šiukšlių išvežimas ir kt.).</li>
                    <li>Patalpų savininkai (bendraturčiai) — tiek fiziniai, tiek juridiniai asmenys — nepriklausomai nuo to, ar jie yra, ar nėra bendrijos nariais, privalo atlikti pareigas, kylančias iš bendrosios dalinės nuosavybės teisės įgyvendinimo (mokėti privalomasias įmokas, apmokėti išlaidas, susijusias su namo bendrojo naudojimo objektų priežiūra, remontu, tvarkymu ir kt.).</li>
                    <li>Bendrijos narys neprivalo apmokėti išlaidų, kurios nėra numatytos įstatuose arba dėl kurių jis nėra davęs sutikimo ir kurios nesusijusios su įstatymų ir kitų teisės aktų nustatytais privalomais statinių naudojimo ir priežiūros reikalavimais arba dėl kurių nėra priimtas bendrijos narių susirinkimo sprendimas bendrijos įstatuose nustatyta tvarka.</li>
                    <li>Bendrijos narys privalo apie netinkamai ar nekokybiškai atliekamas paslaugas nedelsiant informuoti Bendrijos pirmininką.</li>
                    <li>Asmeninius ir svečių automobilius statyti tik savo išpirktose vietose ir iš anksto numatytose transporto priemonių parkavimo ribose.</li>
                    <li>Atsakomybę už viešosios rimties trikdymą gyvenamosiose patalpose vakaro ir nakties metu nustato ATPK 183 straipsnis.</li>
                    <li>Draudimą rūkyti bendrojo naudojimo patalpose nustato Lietuvos Respublikos tabako kontrolės įstatymo 19 straipsnis. Atsakomybė už rūkymą vietose, kuriose pagal Lietuvos Respublikos tabako kontrolės įstatymą draudžiama tai daryti, nustatyta Lietuvos Respublikos administracinių teisės pažeidimų kodekso (toliau – ATPK) 185(1) straipsnyje.</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              {/* REMONTO TAISYKLĖS */}
              <AccordionItem value="remontas" className="border rounded-lg bg-card px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <Wrench className="h-5 w-5 text-secondary" />
                    </div>
                    <span className="font-semibold text-lg">REMONTO TAISYKLĖS</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-6">
                  <p className="font-medium mb-4 text-foreground">Bendrijos narys privalo:</p>
                  <ol className="list-decimal list-outside ml-6 space-y-3 text-muted-foreground" start={14}>
                    <li>Savavališkai, be Bendrijos pirmininko ar jo įgalioto asmens leidimo nereguliuoti, nekeisti, neremontuoti namo bendrosios inžinerinės įrangos, bendrųjų konstrukcijų ir bendrojo naudojimo patalpų.</li>
                    <li>Pertvarkant ar remontuojant savo būstą, privalomai supažindinti Bendrijos pirmininką su numatomų atlikti remonto darbų projektu, kurioje būtų numatyta vykdomų darbų techninė kontrolė, statybos ar remonto darbų vykdymo laikas, atsakomybė dėl galimo bendrojo naudojimo patalpų apdailos pažeidimų ir kita. Taip pat gauti, pagal Lietuvos Respublikos teisės aktuose nustatytą tvarką, visus reikalingus kaimynų bei kitų asmenų, įmonių, įstaigų ir organizacijų sutikimus, leidimus ir/ar kitus reikalingus dokumentus bei nepabloginti kitų butų, patalpų ar bendrojo naudojimo inžinerinės įrangos ir garso izoliacijos būklės.</li>
                    <li>Pertvarkant ar remontuojant būstą — nekeisti projektinių patalpų paskirties. Norint pakeisti paskirtį — būtina gauti pagal Lietuvos Respublikos teisės aktuose nustatytą tvarką raštišką projekto autoriaus sutikimą, visus reikalingus namo gyventojų bei kitų asmenų, įmonių, įstaigų ir organizacijų sutikimus, leidimus ir/ar kitus reikalingus dokumentus bei nepabloginti kitų butų, patalpų ar bendrojo naudojimo patalpų inžinerinės įrangos ir garso izoliacijos būklės.</li>
                    <li>Pertvarkant ar remontuojant būstą lifto nenaudoti statybinių medžiagų ir šiukšlių pervežimui ir užtikrinti, kad šio reikalavimo laikytųsi statybos rangovai.</li>
                    <li>Prieš darant bet kokius priduoto eksploatuoti nekilnojamo turto, esančio V.Mykolaičio-Putino g. 10, Vilniuje, išorės ar bendrojo naudojimo patalpų pakeitimus, galinčius įtakoti jų vaizdą, gauti raštišką projekto autoriaus ir Bendrijos pirmininko sutikimą.</li>
                    <li>Patalpų savininkas (bendraturtis) privalo leisti tam tikslui paskirtiems asmenims remontuoti ar kitaip tvarkyti jo bute ir kitose patalpose esančią bendrojo naudojimo mechaninę, elektroninę ar kitokią įrangą.</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              {/* PRIEŽIŪROS TAISYKLĖS */}
              <AccordionItem value="prieziura" className="border rounded-lg bg-card px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-info" />
                    </div>
                    <span className="font-semibold text-lg">PRIEŽIŪROS TAISYKLĖS</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-6">
                  <p className="font-medium mb-4 text-foreground">Bendrijos narys privalo:</p>
                  <ol className="list-decimal list-outside ml-6 space-y-3 text-muted-foreground" start={20}>
                    <li>Reguliariai valyti ir prižiūrėti savo patalpas ir jose esančius balkonus ar terasas.</li>
                    <li>Nešiukšlinti, neteršti aplinkos, nežaloti turto V.Mykolaičio-Putino g. 10, Vilniuje.</li>
                  </ol>
                  
                  <div className="mt-6 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                    <p className="font-semibold text-destructive mb-3">
                      22. Gyvenamajame name, esančiame V.Mykolaičio-Putino g. 10, Vilniuje, YRA DRAUDŽIAMA:
                    </p>
                    <ol className="list-none space-y-2 text-muted-foreground text-sm">
                      <li><span className="font-medium">22.1</span> kaupti ir sandėliuoti šiukšles bendrojo naudojimo patalpose, laiptinėse, teritorijoje, taip pat ir savininkams priklausančiuose balkonuose ir terasose;</li>
                      <li><span className="font-medium">22.2</span> sandėliuoti, kaupti statybines ir kitas medžiagas bendrojo naudojimo patalpose, taip pat savininkams priklausančiuose balkonuose ir terasose;</li>
                      <li><span className="font-medium">22.3</span> bendrojo naudojimo patalpose, taip pat savininkams priklausančiuose balkonuose ir terasose džiauti skalbinius, valyti ar kratyti kilimus, atlikti statybos darbus;</li>
                      <li><span className="font-medium">22.4</span> užsiimti veikla, sukeliančia aplinkos užterštumą ar skatinančia parazitų ar graužikų veisimąsi;</li>
                      <li><span className="font-medium">22.5</span> žaisti sportinius žaidimus tam nepritaikytose vietose;</li>
                      <li><span className="font-medium">22.6</span> pilti atliekas, sąšlavas į tam nepritaikytus konteinerius;</li>
                      <li><span className="font-medium">22.7</span> deginti šiukšles ar atliekas, kurti grilius, taip pat kitokius atvirus ugnies židinius bendrojo naudojimo patalpose, savininkams priklausančiuose balkonuose ir terasose ir kitose tam nepritaikytose vietose (taip pat ir sklype);</li>
                      <li><span className="font-medium">22.8</span> laikyti itin degias, sprogias ar kitas pavojingas medžiagas;</li>
                      <li><span className="font-medium">22.9</span> gręžti namo fasadą balkonuose ir terasose, kabinti ant jo šviestuvus, plakatus ar kitaip gadinti ar keisti namo fasado būklę;</li>
                      <li><span className="font-medium">22.10</span> pilti vandenį, kitokius skysčius ar atliekas į terasų įlajas.</li>
                    </ol>
                  </div>
                  
                  <ol className="list-decimal list-outside ml-6 mt-4 space-y-3 text-muted-foreground" start={23}>
                    <li>Namo langai ir fasadai plaunami ir valomi centralizuotai, todėl draudžiama plauti ar valyti netinkamomis medžiagomis fasadines granito plokštes ir langus.</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              {/* GYVŪNŲ LAIKYMO TAISYKLĖS */}
              <AccordionItem value="gyvunai" className="border rounded-lg bg-card px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                      <PawPrint className="h-5 w-5 text-warning" />
                    </div>
                    <span className="font-semibold text-lg">GYVŪNŲ LAIKYMO TAISYKLĖS</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-6">
                  <ol className="list-decimal list-outside ml-6 space-y-3 text-muted-foreground" start={24}>
                    <li>Gyventojai gali laikyti naminius ir kitus ne ūkinės paskirties ir nepavojingus žmonių sveikatai ir gyvybei gyvūnus, toliau vadinami „Gyvūnai".</li>
                    <li>Gyvūnų keliamas triukšmas neturi viršyti nustatytų higienos normų. Savininkai ir Gyvūnų šeimininkai turi užtikrinti, kad gyvūnai netrikdytų viešosios rimties kasdien nuo 22 iki 8 valandos.</li>
                    <li>Gyvūnus vedžioti tik pririštus pavadėliu ir dėvinčius antsnukius. Gyvūnus draudžiama vedžioti žaidimo, sporto aikštelėse.</li>
                    <li>Draudžiama Gyvūnus laikyti ir be priežiūros palikti balkonuose, terasose ar bendrojo naudojimo patalpose.</li>
                    <li>Draudžiama laikyti kraiko dėžes balkonuose, terasose ar bendrojo naudojimo patalpose.</li>
                    <li>Gyvūnui išsituštinus jo šeimininkas nedelsiant privalo surinkti augintinio išmatas ir jas išmesti tam numatytose vietose.</li>
                    <li>Savininkai ir Gyvūnų šeimininkai privalo užtikrinti, kad Gyvūnai nekeltų pavojaus žmonių sveikatai, gyvybei, ramybei, nuosavybei, nepažeistų jų teisių ir kitų interesų.</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              {/* ATSAKOMYBĖ */}
              <AccordionItem value="atsakomybe" className="border rounded-lg bg-card px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <span className="font-semibold text-lg">ATSAKOMYBĖ UŽ ŠIŲ TAISYKLIŲ NESILAIKYMĄ</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-6">
                  <ol className="list-decimal list-outside ml-6 space-y-3 text-muted-foreground" start={31}>
                    <li>Patalpų savininkams, nusižengusiems šioms taisyklėms, taikomos LR įstatymuose ir kituose teisės aktuose numatytos sankcijos.</li>
                  </ol>
                  
                  <div className="mt-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                    <p className="font-medium text-foreground mb-3">32. Patalpų savininkai ir Gyvūnų šeimininkai, pažeidę šias taisykles:</p>
                    <ol className="list-none space-y-2 text-muted-foreground text-sm">
                      <li><span className="font-medium">32.1</span> privalo atstatyti padarytus nuostolius arba apmokėti Bendrijai žalos atitaisymo kaštus;</li>
                      <li><span className="font-medium">32.2</span> pirmą kartą — raštiški įspėjami;</li>
                      <li><span className="font-medium">32.3</span> antrąjį kartą — skiriama <span className="font-bold text-destructive">500,00 €</span> (penkių šimtų) Eurų bauda;</li>
                      <li><span className="font-medium">32.4</span> už kiekvieną sekantį pažeidimą skiriama <span className="font-bold text-destructive">800,00 €</span> (aštuonių šimtų) Eurų bauda.</li>
                    </ol>
                  </div>
                  
                  <ol className="list-decimal list-outside ml-6 mt-4 space-y-3 text-muted-foreground" start={33}>
                    <li>Patalpų savininkas paskirtas baudas privalo sumokėti pavedimu į Bendrijos sąskaitą per 30 (trisdešimt) kalendorinių dienų. Pinigai už baudas kaupiami sąskaitoje ir bus panaudoti bendriems gyvenamojo namo V.Mykolaičio-Putino g. 10, Vilniuje poreikiams.</li>
                    <li>Bendrija kiekvienam to pageidaujančiam patalpų savininkui įsipareigoja pateikti metinę ataskaitą apie gautas už baudas pinigų sumas ir jų panaudojimą.</li>
                    <li>Patalpų savininkai privalo užtikrinti, kad šių taisyklių laikytųsi šeimos nariai, svečiai, tretieji asmenys, kurie valdo ar kitaip naudojasi jo nekilnojamuoju turtu. Išvardintiems asmenims pažeidus taisykles, atsakomybė atitenka būstų savininkams.</li>
                    <li>Patalpų savininkams vengiant apmokėti bendrijai už suteiktas paslaugas, pradžioje raštiški įspėjami, po to jų skola perduodama skolas administruojančiai bendrovei.</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              {/* VAIZDO DUOMENŲ TVARKYMAS */}
              <AccordionItem value="vaizdo" className="border rounded-lg bg-card px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                      <Video className="h-5 w-5 text-info" />
                    </div>
                    <span className="font-semibold text-lg">VAIZDO DUOMENŲ TVARKYMAS</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-6 space-y-6 text-muted-foreground">
                  <p>
                    Vadovaujantis Bendrojo duomenų apsaugos reglamento (toliau vadinamas „BDAR") nuostatomis, informuojame, kad DNSB „Taurakalnio namai, Vilnius" vykdo vaizdo stebėjimą viešose erdvėse aplink V. Mykolaičio-Putino g. 10, Vilniuje, namą ir pirmo aukšto holą, o taip pat po šiuo namu esančioje požeminėje stovėjimo aikštelėje (toliau šio pastato aplinkinė teritorija ir požeminė stovėjimo aikštelė vadinama „Statiniu"). Šiame informaciniame pranešime pateikiame detalią informaciją apie vykdomą vaizdo stebėjimą, duomenų tvarkymą ir duomenų subjektų teises.
                  </p>

                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-medium text-foreground mb-2">Duomenų valdytojas:</p>
                    <p>Daugiabučių namų savininkų bendrija „Taurakalnio namai, Vilnius"</p>
                    <p>Juridinio asmens kodas: 301692533</p>
                    <p>Adresas: V. Mykolaičio-Putino g. 10, Vilnius</p>
                    <p>El. p.: taurakalnionamai@gmail.com</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Kokią informaciją renkame vaizdo stebėjimo metu?</h4>
                    <p>Vaizdo stebėjimo metu yra renkami vaizdo duomenys apie asmenis, patenkančius į vaizdo stebėjimo lauką, t.y. patalpose ir teritorijoje, kurioje yra vykdomas vaizdo stebėjimas.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Kokie yra vykdomo vaizdo stebėjimo tikslai?</h4>
                    <p className="mb-2">Vaizdo stebėjimas yra vykdomas:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>siekiant užtikrinti Statinio gyventojų asmens ir turto saugumą;</li>
                      <li>siekiant užfiksuoti ir išsaugoti nusikaltimų ir/arba kitų incidentų (turto sugadinimo, vagysčių, kitų neteisėtų veikų) įrodymus teisiniams tyrimams atlikti ateityje;</li>
                      <li>nusikaltimų prevencijai.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Koks yra vaizdo duomenų tvarkymo teisinis pagrindas?</h4>
                    <p>Vaizdo duomenys tvarkomi siekiant teisėtų Duomenų valdytojo ir Statinio gyventojų interesų (BDAR 6 str. 1 d. f punktas) apsaugoti sveikatą ir turtą, fiksuoti nusikaltimus ir/arba kitus incidentus (turto sugadinimus, vagystes, kitas neteisėtas veikas) teisiniams tyrimams atlikti ateityje bei vykdyti nusikaltimų prevenciją.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Kam ir kodėl galime perduoti užfiksuotus vaizdo duomenis?</h4>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                      <li>Vaizdo kamerų fiksuojamus vaizdo duomenis realiu laiku gali matyti Statinį saugantys budėtojai.</li>
                      <li>Vaizdo kamerų įrašytus asmens duomenis gali matyti tik Duomenų valdytojo pirmininkas. Laikantis teisės aktų reikalavimų, šie duomenys taip pat gali būti peržiūrimi ir kitų asmenų, kuriems būtina įrašus peržiūrėti dalyvaujant incidentų/įvykių tyrime.</li>
                      <li>Vaizdo duomenis taip pat gali gauti ikiteisminio tyrimo ir kitos valstybinės institucijos, teismai ir kt. institucijos, turinčios teisę gauti tokius vaizdo įrašus, jiems priskirtų įsipareigojimų vykdymui, esant teisėtam pagrindui.</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-2">Kiek laiko saugome vaizdo įrašus?</h4>
                    <p>Vaizdo įrašai yra saugomi <span className="font-bold">14 dienų</span>. Tiriant incidentą ar įvykį, įrašas gali būti išsaugomas tiek laiko, kiek vyksta tyrimas ar teisinis procesas.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Kokios yra Jūsų teisės?</h4>
                    <p className="mb-3">Jūs turite teisę prašyti leisti susipažinti su užfiksuotais Jūsų vaizdo duomenimis, prašyti juos ištaisyti ar ištrinti, arba apriboti duomenų tvarkymą, taip pat teisę nesutikti, kad Jūsų duomenys būtų tvarkomi, prašyti perkelti Jūsų duomenis.</p>
                    <p className="mb-3">Jūsų teisės įgyvendinamos tik gavus Jūsų prašymą, pagal kurį galime Jus identifikuoti ir nustačius, kad Jūsų turite teisę įgyvendinti tokį prašymą pagal BDAR reikalavimus.</p>
                    <p className="font-medium">Savo prašymą galite pateikti bendrijos pirmininkui adresu: <span className="text-foreground">M. Mironaitės g. 12-46, Vilnius</span>.</p>
                  </div>

                  <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                    <p className="text-sm">Jeigu manote, kad Jūsų teisės yra pažeidžiamos, turite teisę pateikti skundą <span className="font-medium">Valstybinei duomenų apsaugos inspekcijai</span>.</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Footer */}
            <Card className="mt-8 border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center">
                  Taisyklės patvirtintos 2020 m. gegužės 27 dienos visuotiniame Vilniaus miesto V. Mykolaičio-Putino g. 10 butų bei kitų patalpų savininkų susirinkime.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </Layout>
  );
}
