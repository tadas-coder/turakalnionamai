import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin, Clock, User } from "lucide-react";

export function ContactInfo() {
  return (
    <section className="py-16 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold font-display text-foreground mb-4">
            Kontaktinė informacija
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Susisiekite su bendrijos administracija
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                Administratorius
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold text-foreground">Tadas Bielskis</p>
                <p className="text-sm text-muted-foreground">DNSB Taurakalnio Namai pirmininkas</p>
              </div>
              
              <div className="space-y-3">
                <a 
                  href="mailto:taurakalnionamai@gmail.com" 
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  <span>taurakalnionamai@gmail.com</span>
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-secondary" />
                </div>
                Darbo laikas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pirmadienis - Penktadienis</span>
                  <span className="font-medium">9:00 - 17:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Šeštadienis</span>
                  <span className="font-medium">Nedirbama</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sekmadienis</span>
                  <span className="font-medium">Nedirbama</span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Vilnius, Lietuva</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
