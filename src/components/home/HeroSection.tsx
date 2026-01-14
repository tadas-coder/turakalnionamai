import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

export function HeroSection() {
  return (
    <section className="relative text-primary-foreground py-24 md:py-32 overflow-hidden">
      {/* Elegant gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2d2d2d] via-[#3d3d3d] to-[#4a4a4a]" />
      
      {/* Subtle pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center animate-fade-in">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <img 
              src={logo} 
              alt="Taurakalnio Namai" 
              className="h-24 md:h-32 w-auto brightness-0 invert opacity-95"
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
