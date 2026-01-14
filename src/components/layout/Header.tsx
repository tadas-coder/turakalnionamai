import { Link, useLocation } from "react-router-dom";
import { Home, Mail, Menu, X, LogIn, LogOut, Settings, ChevronDown, Vote, Newspaper, Receipt, FileText, ScrollText, User, ClipboardList, PieChart, BarChart3, CalendarDays, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadNews } from "@/hooks/useUnreadNews";
import { useUnreadTickets } from "@/hooks/useUnreadTickets";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { path: "/", label: "Pradžia", icon: Home },
  { path: "/tickets", label: "Pranešimai", icon: Mail },
];

const moreItems = [
  { path: "/voting", label: "Balsavimas", icon: Vote },
  { path: "/news", label: "Naujienos", icon: Newspaper },
  { path: "/schedules", label: "Grafikai", icon: CalendarDays },
  { path: "/payment-slips", label: "Mokėjimo lapeliai", icon: CreditCard, authRequired: true },
  { path: "/invoices", label: "Sąskaitos", icon: Receipt },
  { path: "/documents", label: "Dokumentai", icon: FileText, authRequired: true },
  { path: "/reports", label: "Ataskaitos", icon: ClipboardList },
  { path: "/financial-report", label: "Finansinė ataskaita", icon: PieChart },
  { path: "/ticket-statistics", label: "Problemų statistika", icon: BarChart3, adminOnly: true },
  { path: "/rules", label: "Taisyklės", icon: ScrollText },
];

export function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAdmin, isApproved, signOut } = useAuth();
  const { unreadCount } = useUnreadNews();
  const { unreadCount: unreadTicketsCount } = useUnreadTickets();

  const isMoreActive = moreItems.some((item) => location.pathname === item.path);

  return (
    <header className="sticky top-0 z-50 glass-effect border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/favicon.png" 
              alt="Taurakalnio Namai" 
              className="h-16 w-16 object-contain hover-scale"
            />
            <div className="hidden sm:flex flex-col">
              <h1 className="text-base font-display font-semibold tracking-wide text-foreground">DNSB Taurakalnio Namai, Vilnius</h1>
              <span className="text-xs text-muted-foreground">Gyventojų savitarnos portalas</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {user && isApproved ? (
              <>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  const isTickets = item.path === "/tickets";
                  return (
                    <Link key={item.path} to={item.path}>
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "gap-2 relative",
                          isActive && "shadow-md"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                        {isTickets && unreadTicketsCount > 0 && (
                          <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-xs px-1">
                            {unreadTicketsCount}
                          </Badge>
                        )}
                      </Button>
                    </Link>
                  );
                })}

                {isAdmin && (
                  <Link to="/admin">
                    <Button variant={location.pathname === "/admin" ? "default" : "ghost"} size="sm" className="gap-2">
                      <Settings className="h-4 w-4" />
                      Administravimas
                    </Button>
                  </Link>
                )}

                {/* More Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={isMoreActive ? "default" : "ghost"}
                      size="sm"
                      className={cn("gap-2 relative", isMoreActive && "shadow-md")}
                    >
                      Daugiau
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-xs px-1">
                          {unreadCount}
                        </Badge>
                      )}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-background border z-50">
                    {moreItems
                      .filter((item) => !item.authRequired || user)
                      .filter((item) => !item.adminOnly || isAdmin)
                      .map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        const isNewsItem = item.path === "/news";
                        return (
                          <DropdownMenuItem key={item.path} asChild>
                            <Link
                              to={item.path}
                              className={cn(
                                "flex items-center gap-2 cursor-pointer",
                                isActive && "bg-accent text-accent-foreground font-medium"
                              )}
                            >
                              <Icon className="h-4 w-4" />
                              {item.label}
                              {isNewsItem && unreadCount > 0 && (
                                <Badge variant="destructive" className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs px-1">
                                  {unreadCount}
                                </Badge>
                              )}
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Profile Dropdown with Logout */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={location.pathname === "/profile" ? "default" : "ghost"}
                      size="sm"
                      className={cn("gap-2", location.pathname === "/profile" && "shadow-md")}
                    >
                      <User className="h-4 w-4" />
                      Mano profilis
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-background border z-50">
                    <DropdownMenuItem asChild>
                      <Link
                        to="/profile"
                        className={cn(
                          "flex items-center gap-2 cursor-pointer",
                          location.pathname === "/profile" && "bg-accent text-accent-foreground font-medium"
                        )}
                      >
                        <User className="h-4 w-4" />
                        Profilio nustatymai
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={signOut}
                      className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4" />
                      Atsijungti
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : user && !isApproved ? (
              <>
                <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Atsijungti
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="default" size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Prisijungti
                </Button>
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border animate-slide-up">
            <div className="flex flex-col gap-2">
              {user && isApproved ? (
                <>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    const isTickets = item.path === "/tickets";
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Button
                          variant={isActive ? "default" : "ghost"}
                          className="w-full justify-start gap-3 relative"
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                          {isTickets && unreadTicketsCount > 0 && (
                            <Badge variant="destructive" className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs px-1">
                              {unreadTicketsCount}
                            </Badge>
                          )}
                        </Button>
                      </Link>
                    );
                  })}
                  
                  {/* More items in mobile */}
                  <div className="border-t border-border pt-2 mt-2">
                    <p className="text-xs text-muted-foreground px-4 mb-2">Daugiau</p>
                    {moreItems
                      .filter((item) => !item.adminOnly || isAdmin)
                      .filter((item) => !item.authRequired || user)
                      .map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        const isNewsItem = item.path === "/news";
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <Button
                              variant={isActive ? "default" : "ghost"}
                              className="w-full justify-start gap-3 relative"
                            >
                              <Icon className="h-4 w-4" />
                              {item.label}
                              {isNewsItem && unreadCount > 0 && (
                                <Badge variant="destructive" className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs px-1">
                                  {unreadCount}
                                </Badge>
                              )}
                            </Button>
                          </Link>
                        );
                      })}
                  </div>

                  {isAdmin && (
                    <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant={location.pathname === "/admin" ? "default" : "ghost"} className="w-full justify-start gap-3">
                        <Settings className="h-4 w-4" />
                        Administravimas
                      </Button>
                    </Link>
                  )}
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant={location.pathname === "/profile" ? "default" : "ghost"} className="w-full justify-start gap-3">
                      <User className="h-4 w-4" />
                      Mano profilis
                    </Button>
                  </Link>
                  <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => { signOut(); setMobileMenuOpen(false); }}>
                    <LogOut className="h-4 w-4" />
                    Atsijungti
                  </Button>
                </>
              ) : user && !isApproved ? (
                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => { signOut(); setMobileMenuOpen(false); }}>
                  <LogOut className="h-4 w-4" />
                  Atsijungti
                </Button>
              ) : (
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="default" className="w-full justify-start gap-3">
                    <LogIn className="h-4 w-4" />
                    Prisijungti
                  </Button>
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
