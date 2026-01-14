import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { ContactInfo } from "@/components/home/ContactInfo";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <ContactInfo />
    </Layout>
  );
};

export default Index;
