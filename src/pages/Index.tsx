import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustIndicators from "@/components/TrustIndicators";
import Services from "@/components/Services";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
import ClientsMarquee from "@/components/ClientsMarquee";
import SEOHead from "@/components/SEOHead";
import { useVisitTracker } from "@/hooks/useVisitTracker";

const BASE = "https://project-novum-evolve.lovable.app";

const Index = () => {
  useVisitTracker();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Novum Tech — IT-аутсорсинг для бизнеса в Ташкенте"
        description="IT-аутсорсинг в Ташкенте. Серверы, безопасность, поддержка рабочих станций. SLA 99.9%, реакция до 30 минут."
        canonical={`${BASE}/`}
      />
      <Navbar />
      <main>
        <Hero />
        <TrustIndicators />
        <Services />
        <ClientsMarquee />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
