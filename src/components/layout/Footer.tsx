import { Mail, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";

export function Footer() {
  return (
    <footer className="bg-foreground text-background mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img 
              src={logo} 
              alt="Taurakalnio Namai" 
              className="h-10 w-auto mix-blend-screen"
              style={{ filter: 'invert(1)' }}
            />
            <span className="text-sm font-medium">DNSB Taurakalnio Namai</span>
          </div>
          
          {/* Contact Info */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-background/70">
            <a 
              href="mailto:taurakalnionamai@gmail.com" 
              className="flex items-center gap-2 hover:text-background transition-colors"
            >
              <Mail className="h-4 w-4" />
              <span>taurakalnionamai@gmail.com</span>
            </a>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>Vilnius, Lietuva</span>
            </div>
          </div>
          
          {/* Copyright */}
          <p className="text-xs text-background/50">
            © {new Date().getFullYear()} Visos teisės saugomos
          </p>
        </div>
      </div>
    </footer>
  );
}
