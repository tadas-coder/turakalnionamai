import { Button } from "@/components/ui/button";
import { ArrowRight, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import buildingPhoto from "@/assets/building-photo.jpg";

export function HeroSection() {
  return (
    <section className="relative text-primary-foreground py-20 md:py-28 overflow-hidden">
      {/* Background Image with blur */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 blur-[2px]"
        style={{ backgroundImage: `url(${buildingPhoto})` }}
      />
      {/* Lighter gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/70 via-primary/60 to-primary/50" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
            <Building2 className="h-4 w-4" />
            <span className="text-sm font-medium">Gyventojų savitarnos portalas</span>
          </div>
          
          
          <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Sveiki atvykę į mūsų bendruomenės portalą. Čia galite pranešti apie problemas, 
            balsuoti, skaityti naujienas ir tvarkyti sąskaitas.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/tickets">
              <Button size="xl" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary w-full sm:w-auto">
                Pranešti apie problemą
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/news">
              <Button size="xl" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 w-full sm:w-auto">
                Skaityti naujienas
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
