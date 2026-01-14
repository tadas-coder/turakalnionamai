import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { ContactInfo } from "@/components/home/ContactInfo";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect admins to admin page
    if (!loading && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [isAdmin, loading, navigate]);

  // If admin, show loading while redirecting
  if (!loading && isAdmin) {
    return null;
  }

  return (
    <Layout>
      <HeroSection />
      <ContactInfo />
    </Layout>
  );
};

export default Index;
