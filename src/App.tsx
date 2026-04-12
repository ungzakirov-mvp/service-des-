import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { LanguageProvider } from "@/i18n/LanguageContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPricing from "./pages/AdminPricing";
import AdminServices from "./pages/AdminServices";
import AdminRequests from "./pages/AdminRequests";
import AdminCategories from "./pages/AdminCategories";
import AdminReviews from "./pages/AdminReviews";
import ServicesPage from "./pages/ServicesPage";
import ConstructorPage from "./pages/ConstructorPage";
import ServiceDeskPage from "./pages/ServiceDeskPage";
import PrivacyPage from "./pages/PrivacyPage";
import FAQPage from "./pages/FAQPage";
import ContactsPage from "./pages/ContactsPage";
import AboutPage from "./pages/AboutPage";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/constructor" element={<ConstructorPage />} />
            <Route path="/service-desk" element={<ServiceDeskPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/pricing" element={<AdminPricing />} />
              <Route path="/admin/categories" element={<AdminCategories />} />
              <Route path="/admin/services" element={<AdminServices />} />
              <Route path="/admin/requests" element={<AdminRequests />} />
              <Route path="/admin/reviews" element={<AdminReviews />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
