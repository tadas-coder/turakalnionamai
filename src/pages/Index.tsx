import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { LatestNews } from "@/components/home/LatestNews";
import { ContactInfo } from "@/components/home/ContactInfo";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <LatestNews />
      <ContactInfo />
    </Layout>
  );
};

export default Index;
