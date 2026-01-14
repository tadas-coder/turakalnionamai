import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import buildingPhoto from "@/assets/building-photo.jpg";
import logo from "@/assets/logo.png";

export function HeroSection() {
  return (
    <section className="relative text-primary-foreground py-24 md:py-32 overflow-hidden">
      {/* Background Image with blur */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url(${buildingPhoto})` }}
      />
      {/* Elegant dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-foreground/85 via-foreground/75 to-foreground/70" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center animate-fade-in">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <img 
              src={logo} 
              alt="Taurakalnio Namai" 
              className="h-32 md:h-40 w-auto brightness-0 invert opacity-95"
            />
          </div>
          
          <p className="text-lg md:text-xl text-white/80 mb-10 max-w-xl mx-auto font-light">
            Daugiabučio namo savininkų bendrijos savitarnos portalas
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/tickets">
              <Button size="xl" className="bg-white text-foreground hover:bg-white/90 w-full sm:w-auto font-medium">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Pranešti apie problemą
              </Button>
            </Link>
            <Link to="/news">
              <Button size="xl" variant="outline" className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto">
                Skaityti naujienas
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
