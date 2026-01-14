import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin, Clock, User, AlertTriangle, Wrench, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export function ContactInfo() {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleCardInteraction = (cardId: string, isEntering: boolean) => {
    if (isMobile) return;
    setExpandedCard(isEntering ? cardId : null);
  };

  const handleCardClick = (cardId: string) => {
    if (!isMobile) return;
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  const isExpanded = (cardId: string) => expandedCard === cardId;

  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-3">
            Kontaktinė informacija
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            {isMobile ? "Paspauskite ant kortelės" : "Užveskite pelę ant kortelės"}, kad pamatytumėte daugiau informacijos
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Chairman Card */}
          <Card 
            className="card-elevated cursor-pointer transition-all duration-300 hover:shadow-lg"
            onMouseEnter={() => handleCardInteraction("chairman", true)}
            onMouseLeave={() => handleCardInteraction("chairman", false)}
            onClick={() => handleCardClick("chairman")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <span>Bendrijos pirmininkas</span>
                  <p className="text-sm font-normal text-muted-foreground">Tadas Bielskis</p>
                </div>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform duration-300",
                  isExpanded("chairman") && "rotate-180"
                )} />
              </CardTitle>
            </CardHeader>
            <div className={cn(
              "overflow-hidden transition-all duration-300",
              isExpanded("chairman") ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
            )}>
              <CardContent className="space-y-3 pt-0">
                <a 
                  href="tel:+37060010584" 
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="h-4 w-4" />
                  <span>0 600 10584</span>
                </a>
                <a 
                  href="mailto:taurakalnionamai@gmail.com" 
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="h-4 w-4" />
                  <span>taurakalnionamai@gmail.com</span>
                </a>
              </CardContent>
            </div>
          </Card>

          {/* Duty Officer & Emergencies Card */}
          <Card 
            className="card-elevated cursor-pointer transition-all duration-300 hover:shadow-lg"
            onMouseEnter={() => handleCardInteraction("emergencies", true)}
            onMouseLeave={() => handleCardInteraction("emergencies", false)}
            onClick={() => handleCardClick("emergencies")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <span>Budėtojai ir avarijos</span>
                  <p className="text-sm font-normal text-muted-foreground">Skubi pagalba</p>
                </div>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform duration-300",
                  isExpanded("emergencies") && "rotate-180"
                )} />
              </CardTitle>
            </CardHeader>
            <div className={cn(
              "overflow-hidden transition-all duration-300",
              isExpanded("emergencies") ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
            )}>
              <CardContent className="space-y-4 pt-0">
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Budėtojai</p>
                  <a 
                    href="tel:+37064046200" 
                    className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                    onClick={(e) => e.stopPropagation()}
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
                    onClick={(e) => e.stopPropagation()}
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
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone className="h-4 w-4" />
                    <span>(+370) 636 00008</span>
                  </a>
                </div>
              </CardContent>
            </div>
          </Card>

          {/* Working Hours Card */}
          <Card 
            className="card-elevated cursor-pointer transition-all duration-300 hover:shadow-lg"
            onMouseEnter={() => handleCardInteraction("hours", true)}
            onMouseLeave={() => handleCardInteraction("hours", false)}
            onClick={() => handleCardClick("hours")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-secondary" />
                </div>
                <div className="flex-1">
                  <span>Darbo laikas</span>
                  <p className="text-sm font-normal text-muted-foreground">I-V: 8:00 - 17:00</p>
                </div>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform duration-300",
                  isExpanded("hours") && "rotate-180"
                )} />
              </CardTitle>
            </CardHeader>
            <div className={cn(
              "overflow-hidden transition-all duration-300",
              isExpanded("hours") ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
            )}>
              <CardContent className="space-y-4 pt-0">
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
            </div>
          </Card>

          {/* Additional Contacts Card - Full Width */}
          <Card 
            className="card-elevated lg:col-span-2 xl:col-span-3 cursor-pointer transition-all duration-300 hover:shadow-lg"
            onMouseEnter={() => handleCardInteraction("additional", true)}
            onMouseLeave={() => handleCardInteraction("additional", false)}
            onClick={() => handleCardClick("additional")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Wrench className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <span>Papildomi kontaktai</span>
                  <p className="text-sm font-normal text-muted-foreground">Komunalinės paslaugos ir avarijos</p>
                </div>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform duration-300",
                  isExpanded("additional") && "rotate-180"
                )} />
              </CardTitle>
            </CardHeader>
            <div className={cn(
              "overflow-hidden transition-all duration-300",
              isExpanded("additional") ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            )}>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <p className="text-sm font-medium text-foreground mb-1">Liftų gedimai</p>
                    <p className="text-xs text-muted-foreground mb-2">UAB „Schindler liftai"</p>
                    <a 
                      href="tel:070055966" 
                      className="flex items-center gap-2 text-primary hover:underline text-sm"
                      onClick={(e) => e.stopPropagation()}
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
                      onClick={(e) => e.stopPropagation()}
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
                      onClick={(e) => e.stopPropagation()}
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
                      onClick={(e) => e.stopPropagation()}
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
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="h-3 w-3" />
                      <span>112</span>
                    </a>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
