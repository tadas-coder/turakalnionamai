import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText, AlertTriangle, Clock, Volume2, Trash2, PawPrint, Car, Cigarette } from "lucide-react";

const rules = [
  {
    icon: Clock,
    title: "Tylos valandos",
    content: "Tylos valandos nuo 22:00 iki 7:00 darbo dienomis ir nuo 22:00 iki 9:00 savaitgaliais bei švenčių dienomis.",
  },
  {
    icon: Volume2,
    title: "Triukšmo lygis",
    content: "Remonto darbai leidžiami tik darbo dienomis nuo 9:00 iki 18:00. Savaitgaliais ir švenčių dienomis remonto darbai draudžiami.",
  },
  {
    icon: Trash2,
    title: "Atliekų tvarkymas",
    content: "Atliekos turi būti rūšiuojamos ir išmetamos į tam skirtus konteinerius. Stambiagabaritės atliekos turi būti išvežamos savarankiškai.",
  },
  {
    icon: PawPrint,
    title: "Augintiniai",
    content: "Augintiniai bendrose patalpose turi būti vedžiojami su pavadėliu. Šeimininkai privalo sutvarkyti po savo augintinių.",
  },
  {
    icon: Car,
    title: "Automobilių statymas",
    content: "Automobiliai statomi tik tam skirtose vietose. Draudžiama statyti automobilius ant žolės, prie įėjimų ar evakuacinėse zonose.",
  },
  {
    icon: Cigarette,
    title: "Rūkymas",
    content: "Rūkymas draudžiamas bendrose patalpose, laiptinėse, liftuose ir balkonuose, jei tai trukdo kaimynams.",
  },
  {
    icon: AlertTriangle,
    title: "Saugumas",
    content: "Nelaikykite durų atvirų nepažįstamiems asmenims. Apie įtartinus asmenis ar veiksmus praneškite administracijai arba policijai.",
  },
];

export default function Rules() {
  return (
    <Layout>
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
                <ScrollText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Dokumentai</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
                Vidaus tvarkos taisyklės
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Gerbiami gyventojai, prašome susipažinti su namo vidaus tvarkos taisyklėmis ir jų laikytis.
              </p>
            </div>

            <div className="space-y-4">
              {rules.map((rule, index) => {
                const Icon = rule.icon;
                return (
                  <Card key={index} className="card-elevated">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        {rule.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground pl-13">{rule.content}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="mt-8 border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center">
                  Šios taisyklės gali būti keičiamos bendrijos sprendimu. 
                  Apie pakeitimus gyventojai bus informuojami iš anksto.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </Layout>
  );
}
