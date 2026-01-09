import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { QuickActions } from "@/components/home/QuickActions";
import { ContactInfo } from "@/components/home/ContactInfo";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <QuickActions />
      <ContactInfo />
    </Layout>
  );
};

export default Index;
