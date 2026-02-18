import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustIndicators from "@/components/TrustIndicators";
import Services from "@/components/Services";
import Pricing from "@/components/Pricing";
import Calculator from "@/components/Calculator";
import About from "@/components/About";
import Workflow from "@/components/Workflow";
import FAQ from "@/components/FAQ";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    document.title = "Novum Tech — IT-аутсорсинг для бизнеса в Ташкенте";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", "Novum Tech — IT-аутсорсинг в Ташкенте. Серверы, безопасность, поддержка рабочих станций. SLA 99.9%, реакция до 30 минут.");
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Novum Tech — IT-аутсорсинг в Ташкенте. Серверы, безопасность, поддержка рабочих станций. SLA 99.9%, реакция до 30 минут.";
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <TrustIndicators />
        <Services />
        <Pricing />
        <Calculator />
        <About />
        <Workflow />
        <FAQ />
        <ContactForm />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
