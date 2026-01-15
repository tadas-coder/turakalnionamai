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
    <section className="relative text-foreground py-24 md:py-32 bg-background">
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
              className="h-24 md:h-32 w-auto"
            />
          </div>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto font-light">
            Daugiabučio namo savininkų bendrijos savitarnos portalas
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/tickets">
              <Button size="xl" className="w-full sm:w-auto font-medium">
                <AlertTriangle className="h-5 w-5" />
                Pranešti apie problemą
              </Button>
            </Link>
            <Link to="/news">
              <Button size="xl" variant="outline" className="w-full sm:w-auto">
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
