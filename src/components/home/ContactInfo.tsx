import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin, Clock, User, AlertTriangle, Wrench } from "lucide-react";

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

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Chairman Card */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                Bendrijos pirmininkas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold text-foreground">Tadas Bielskis</p>
              </div>
              <div className="space-y-3">
                <a 
                  href="tel:+37060010584" 
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  <span>0 600 10584</span>
                </a>
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

          {/* Duty Officer & Emergencies Card */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                Budėtojai ir avarijos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Budėtojai</p>
                <a 
                  href="tel:+37064046200" 
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  <span>0 640 46200</span>
                </a>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Sistemų avarijos (08:00 - 17:00)</p>
                <a 
                  href="tel:+37063331031" 
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  <span>(+370) 633 31031</span>
                </a>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Avarinė tarnyba (ne darbo metu)</p>
                <a 
                  href="tel:+37063600008" 
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  <span>(+370) 636 00008</span>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Working Hours Card */}
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
                  <span className="font-medium">8:00 - 17:00</span>
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

          {/* Additional Contacts Card - Full Width */}
          <Card className="card-elevated lg:col-span-2 xl:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Wrench className="h-5 w-5 text-accent-foreground" />
                </div>
                Papildomi kontaktai
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-background border border-border">
                  <p className="text-sm font-medium text-foreground mb-1">Liftų gedimai</p>
                  <p className="text-xs text-muted-foreground mb-2">UAB „Schindler liftai"</p>
                  <a 
                    href="tel:070055966" 
                    className="flex items-center gap-2 text-primary hover:underline text-sm"
                  >
                    <Phone className="h-3 w-3" />
                    <span>0 700 55966</span>
                  </a>
                </div>
                
                <div className="p-3 rounded-lg bg-background border border-border">
                  <p className="text-sm font-medium text-foreground mb-1">Atliekų išvežimas</p>
                  <p className="text-xs text-muted-foreground mb-2">UAB "VASA"</p>
                  <a 
                    href="tel:1895" 
                    className="flex items-center gap-2 text-primary hover:underline text-sm"
                  >
                    <Phone className="h-3 w-3" />
                    <span>1895</span>
                  </a>
                </div>
                
                <div className="p-3 rounded-lg bg-background border border-border">
                  <p className="text-sm font-medium text-foreground mb-1">Vandentiekio avarijos</p>
                  <p className="text-xs text-muted-foreground mb-2">UAB "Vilniaus vandenys"</p>
                  <a 
                    href="tel:080010880" 
                    className="flex items-center gap-2 text-primary hover:underline text-sm"
                  >
                    <Phone className="h-3 w-3" />
                    <span>0 800 10880</span>
                  </a>
                </div>
                
                <div className="p-3 rounded-lg bg-background border border-border">
                  <p className="text-sm font-medium text-foreground mb-1">Elektros sutrikimai</p>
                  <p className="text-xs text-muted-foreground mb-2">ESO</p>
                  <a 
                    href="tel:1852" 
                    className="flex items-center gap-2 text-primary hover:underline text-sm"
                  >
                    <Phone className="h-3 w-3" />
                    <span>1852</span>
                  </a>
                </div>
                
                <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <p className="text-sm font-medium text-destructive mb-1">Bendrasis pagalbos centras</p>
                  <p className="text-xs text-muted-foreground mb-2">Skambinti avariniais atvejais</p>
                  <a 
                    href="tel:112" 
                    className="flex items-center gap-2 text-destructive hover:underline text-sm font-bold"
                  >
                    <Phone className="h-3 w-3" />
                    <span>112</span>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
