import { Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 font-display">DNSB Taurakalnio Namai</h3>
            <p className="text-primary-foreground/80 text-sm">
              Daugiabučio namo savininkų bendrija, skirta užtikrinti patogų ir saugų gyvenimą visiems gyventojams.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Kontaktai</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:taurakalnionamai@gmail.com" className="hover:underline">
                  taurakalnionamai@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Vilnius, Lietuva</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Administratorius</h4>
            <p className="text-sm text-primary-foreground/80">
              Tadas Bielskis
            </p>
            <p className="text-sm text-primary-foreground/80 mt-2">
              Darbo valandos: I-V 9:00 - 17:00
            </p>
          </div>
        </div>
        
        <div className="border-t border-primary-foreground/20 mt-8 pt-6 text-center text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} DNSB Taurakalnio Namai. Visos teisės saugomos.
        </div>
      </div>
    </footer>
  );
}
