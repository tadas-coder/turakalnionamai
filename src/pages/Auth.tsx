import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { LogIn, UserPlus, Mail, Lock, User } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Neteisingas el. pašto formatas");
const passwordSchema = z.string().min(6, "Slaptažodis turi būti bent 6 simbolių");
const nameSchema = z.string().min(2, "Vardas turi būti bent 2 simbolių");

export default function Auth() {
  const navigate = useNavigate();
  const { user, isApproved, isAdmin, signIn, signUp, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({ email: "", password: "", fullName: "" });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (user && !loading) {
      if (isAdmin || isApproved) {
        navigate("/");
      } else {
        navigate("/pending-approval");
      }
    }
  }, [user, isApproved, isAdmin, loading, navigate]);

  const validateLogin = () => {
    const newErrors: { [key: string]: string } = {};
    
    const emailResult = emailSchema.safeParse(loginData.email);
    if (!emailResult.success) {
      newErrors.loginEmail = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(loginData.password);
    if (!passwordResult.success) {
      newErrors.loginPassword = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignup = () => {
    const newErrors: { [key: string]: string } = {};
    
    const nameResult = nameSchema.safeParse(signupData.fullName);
    if (!nameResult.success) {
      newErrors.signupName = nameResult.error.errors[0].message;
    }
    
    const emailResult = emailSchema.safeParse(signupData.email);
    if (!emailResult.success) {
      newErrors.signupEmail = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(signupData.password);
    if (!passwordResult.success) {
      newErrors.signupPassword = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;
    
    setIsSubmitting(true);
    const { error } = await signIn(loginData.email, loginData.password);
    
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Neteisingas el. paštas arba slaptažodis");
      } else {
      toast.error("Prisijungimo klaida: " + error.message);
      }
    } else {
      toast.success("Sėkmingai prisijungėte!");
    }
    setIsSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignup()) return;
    
    setIsSubmitting(true);
    const { error } = await signUp(signupData.email, signupData.password, signupData.fullName);
    
    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("Šis el. paštas jau užregistruotas");
      } else {
        toast.error("Registracijos klaida: " + error.message);
      }
    } else {
      toast.success("Registracija sėkminga! Laukite administratoriaus patvirtinimo.");
      navigate("/pending-approval");
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-12 bg-muted min-h-screen">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8 animate-fade-in">
              <h1 className="text-3xl font-bold font-display text-foreground mb-2">
                Sveiki atvykę
              </h1>
              <p className="text-muted-foreground">
                Prisijunkite prie Taurakalnio Namų portalo
              </p>
            </div>

            <Card className="card-elevated animate-slide-up">
              <Tabs defaultValue="login" className="w-full">
                <CardHeader>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login" className="gap-2">
                      <LogIn className="h-4 w-4" />
                      Prisijungti
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Registruotis
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>

                <CardContent>
                  <TabsContent value="login" className="space-y-4 mt-0">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">El. paštas</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="jonas@pavyzdys.lt"
                            className="pl-10"
                            value={loginData.email}
                            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          />
                        </div>
                        {errors.loginEmail && (
                          <p className="text-sm text-destructive">{errors.loginEmail}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="login-password">Slaptažodis</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-password"
                            type="password"
                            placeholder="••••••••"
                            className="pl-10"
                            value={loginData.password}
                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          />
                        </div>
                        {errors.loginPassword && (
                          <p className="text-sm text-destructive">{errors.loginPassword}</p>
                        )}
                      </div>

                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <LogIn className="h-4 w-4" />
                            Prisijungti
                          </>
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="space-y-4 mt-0">
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Vardas, Pavardė</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-name"
                            placeholder="Jonas Jonaitis"
                            className="pl-10"
                            value={signupData.fullName}
                            onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                          />
                        </div>
                        {errors.signupName && (
                          <p className="text-sm text-destructive">{errors.signupName}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email">El. paštas</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="jonas@pavyzdys.lt"
                            className="pl-10"
                            value={signupData.email}
                            onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                          />
                        </div>
                        {errors.signupEmail && (
                          <p className="text-sm text-destructive">{errors.signupEmail}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Slaptažodis</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="••••••••"
                            className="pl-10"
                            value={signupData.password}
                            onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                          />
                        </div>
                        {errors.signupPassword && (
                          <p className="text-sm text-destructive">{errors.signupPassword}</p>
                        )}
                      </div>

                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" />
                            Registruotis
                          </>
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
