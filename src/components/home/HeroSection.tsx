import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useEffect, useState } from "react";

export function HeroSection() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="relative text-primary-foreground py-24 md:py-32 overflow-hidden">
      {/* Animated gradient background with parallax */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-[#2d2d2d] via-[#3d3d3d] to-[#4a4a4a]"
        style={{
          transform: `translateY(${scrollY * 0.3}px)`,
        }}
      />
      
      {/* Floating animated shapes with parallax */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute -top-20 -left-20 w-72 h-72 bg-white/[0.02] rounded-full blur-3xl animate-float-slow"
          style={{ transform: `translateY(${scrollY * 0.15}px)` }}
        />
        <div 
          className="absolute top-1/2 -right-32 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl animate-float-medium"
          style={{ transform: `translateY(${scrollY * 0.25}px)` }}
        />
        <div 
          className="absolute -bottom-32 left-1/3 w-80 h-80 bg-white/[0.015] rounded-full blur-3xl animate-float-fast"
          style={{ transform: `translateY(${scrollY * 0.2}px)` }}
        />
      </div>
      
      {/* Subtle grid pattern with parallax */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          transform: `translateY(${scrollY * 0.1}px)`,
        }}
      />
      
      <div 
        className="container mx-auto px-4 relative z-10"
        style={{
          transform: `translateY(${scrollY * 0.05}px)`,
          opacity: Math.max(0, 1 - scrollY / 500),
        }}
      >
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
