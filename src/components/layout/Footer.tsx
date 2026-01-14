import { Mail, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";

export function Footer() {
  return (
    <footer className="bg-foreground text-background mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <img 
              src={logo} 
              alt="Taurakalnio Namai" 
              className="h-16 w-auto mb-4 mix-blend-screen"
              style={{ filter: 'invert(1)' }}
            />
            <p className="text-background/70 text-sm leading-relaxed">
              Daugiabučio namo savininkų bendrija, skirta užtikrinti patogų ir saugų gyvenimą visiems gyventojams.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-4 text-sm uppercase tracking-wider">Kontaktai</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-background/50" />
                <a href="mailto:taurakalnionamai@gmail.com" className="hover:text-background/80 transition-colors text-background/70">
                  taurakalnionamai@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-background/50" />
                <span className="text-background/70">Vilnius, Lietuva</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-4 text-sm uppercase tracking-wider">Administratorius</h4>
            <p className="text-sm text-background/70">
              Tadas Bielskis
            </p>
            <p className="text-sm text-background/70 mt-2">
              Darbo valandos: I-V 9:00 - 17:00
            </p>
          </div>
        </div>
        
        <div className="border-t border-background/10 mt-10 pt-6 text-center text-xs text-background/50">
          © {new Date().getFullYear()} DNSB Taurakalnio Namai. Visos teisės saugomos.
        </div>
      </div>
    </footer>
  );
}
