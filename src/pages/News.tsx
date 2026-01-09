import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Newspaper, Calendar, User, Pin } from "lucide-react";

// Mock data - will be replaced with Cloud data
const newsItems = [
  {
    id: 1,
    title: "Svarbu: Vandentiekio remonto darbai",
    excerpt: "Informuojame, kad š.m. vasario 5 d. nuo 9:00 iki 15:00 val. bus atliekami vandentiekio remonto darbai. Prašome pasirūpinti vandens atsargomis.",
    content: "Gerbiami gyventojai, informuojame, kad š.m. vasario 5 d. nuo 9:00 iki 15:00 val. bus atliekami vandentiekio remonto darbai pagrindiniame vandentiekio vamzdyne. Prašome pasirūpinti vandens atsargomis. Atsiprašome už nepatogumus.",
    author: "Tadas Bielskis",
    date: "2024-01-25",
    isPinned: true,
    category: "Svarbu",
  },
  {
    id: 2,
    title: "Metinis susirinkimas",
    excerpt: "Kviečiame visus gyventojus į metinį bendrijos susirinkimą, kuris vyks 2024 m. kovo 15 d. 18:00 val.",
    content: "Gerbiami bendrijos nariai, maloniai kviečiame į metinį bendrijos susirinkimą, kuris vyks 2024 m. kovo 15 d. 18:00 val. namo bendrose patalpose. Darbotvarkė: 1) Praėjusių metų ataskaita, 2) Finansinė ataskaita, 3) 2024 m. planai, 4) Kiti klausimai.",
    author: "Tadas Bielskis",
    date: "2024-01-20",
    isPinned: false,
    category: "Susirinkimas",
  },
  {
    id: 3,
    title: "Nauja šiukšlių rūšiavimo tvarka",
    excerpt: "Nuo vasario 1 d. įsigalioja nauja šiukšlių rūšiavimo tvarka. Prašome susipažinti su pakeitimais.",
    content: "Informuojame, kad nuo 2024 m. vasario 1 d. įsigalioja nauja šiukšlių rūšiavimo tvarka. Prašome atkreipti dėmesį į naujus konteinerius ir tinkamai rūšiuoti atliekas. Daugiau informacijos rasite prie konteinerių esančiuose informaciniuose stenduose.",
    author: "Tadas Bielskis",
    date: "2024-01-15",
    isPinned: false,
    category: "Informacija",
  },
  {
    id: 4,
    title: "Lifto techninis aptarnavimas",
    excerpt: "Primename, kad lifto techninis aptarnavimas atliekamas kiekvieno mėnesio pirmą antradienį.",
    content: "Gerbiami gyventojai, primename, kad lifto techninis aptarnavimas atliekamas kiekvieno mėnesio pirmą antradienį nuo 10:00 iki 12:00 val. Šiuo metu liftas neveiks. Atsiprašome už nepatogumus.",
    author: "Tadas Bielskis",
    date: "2024-01-10",
    isPinned: false,
    category: "Informacija",
  },
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case "Svarbu":
      return "bg-destructive text-destructive-foreground";
    case "Susirinkimas":
      return "bg-secondary text-secondary-foreground";
    default:
      return "bg-primary text-primary-foreground";
  }
};

export default function News() {
  return (
    <Layout>
      <div className="py-12 bg-muted min-h-screen">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-info/10 text-info px-4 py-2 rounded-full mb-4">
                <Newspaper className="h-4 w-4" />
                <span className="text-sm font-medium">Naujienos</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
                Bendrijos naujienos
              </h1>
              <p className="text-muted-foreground">
                Svarbiausi pranešimai ir naujienos gyventojams
              </p>
            </div>

            <div className="space-y-6">
              {newsItems.map((news, index) => (
                <Card 
                  key={news.id} 
                  className={`card-elevated animate-slide-up ${news.isPinned ? 'border-primary/30 bg-primary/5' : ''}`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      {news.isPinned && (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Pin className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge className={getCategoryColor(news.category)}>
                            {news.category}
                          </Badge>
                          {news.isPinned && (
                            <Badge variant="outline">Prisegta</Badge>
                          )}
                        </div>
                        <CardTitle className="text-xl">{news.title}</CardTitle>
                        <CardDescription className="mt-2">
                          {news.excerpt}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground/80 leading-relaxed">
                      {news.content}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{news.author}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{news.date}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
