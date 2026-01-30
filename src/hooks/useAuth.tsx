import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isApproved: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  checkApprovalStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchUserRole = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();
        
        if (!isMounted) return;
        
        const isAdminUser = !!data && !error;
        setIsAdmin(isAdminUser);
        
        // Admins are always approved
        if (isAdminUser) {
          setIsApproved(true);
        }
      } catch (error) {
        console.error("Error checking admin role:", error);
      }
    };

    const fetchApprovalStatus = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("approved")
          .eq("id", userId)
          .single();
        
        if (!isMounted) return;
        
        if (!error && data) {
          setIsApproved(data.approved);
        }
      } catch (error) {
        console.error("Error checking approval status:", error);
      }
    };

    // Listener for ONGOING auth changes (does NOT control loading state)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fire and forget for ongoing changes
          fetchUserRole(session.user.id);
          fetchApprovalStatus(session.user.id);
        } else {
          setIsAdmin(false);
          setIsApproved(false);
        }
      }
    );

    // INITIAL load - controls loading state
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch roles BEFORE setting loading to false
        if (session?.user) {
          await Promise.all([
            fetchUserRole(session.user.id),
            fetchApprovalStatus(session.user.id)
          ]);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkAdminRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    
    const isAdminUser = !!data && !error;
    setIsAdmin(isAdminUser);
    
    // Admins are always approved
    if (isAdminUser) {
      setIsApproved(true);
    }
  };

  const checkApproval = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("approved")
      .eq("id", userId)
      .single();
    
    if (!error && data) {
      setIsApproved(data.approved);
    }
  };

  const checkApprovalStatus = async (): Promise<boolean> => {
    if (!user?.id) return false;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("approved")
      .eq("id", user.id)
      .single();
    
    if (!error && data) {
      setIsApproved(data.approved);
      return data.approved;
    }
    return false;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setIsApproved(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isApproved, loading, signIn, signUp, signOut, checkApprovalStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
