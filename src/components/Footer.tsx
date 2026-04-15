import { Phone, Mail, Send, Instagram } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const navLinks = [
    { label: t("nav.services"), href: "/services" },
    { label: t("nav.pricing"), href: "/#pricing" },
    { label: t("nav.about"), href: "/about" },
    { label: t("nav.faq"), href: "/faq" },
    { label: t("nav.contacts"), href: "/contacts" },
    { label: t("nav.constructor"), href: "/constructor" },
    { label: t("nav.privacy"), href: "/privacy" },
  ];

  const handleClick = (href: string) => {
    if (href.startsWith("/#")) {
      navigate(href);
    } else {
      navigate(href);
    }
    window.scrollTo({ top: 0 });
  };

  return (
    <footer className="border-t border-border bg-secondary/20 py-12">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
          <div>
            <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }} className="text-xl font-bold tracking-tight">
              Novum<span className="text-primary">Tech</span>
            </a>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-xs">{t("footer.desc")}</p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t("footer.nav")}</h4>
            <ul className="space-y-2">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <button
                    onClick={() => handleClick(l.href)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t("footer.contacts")}</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone size={16} className="text-primary shrink-0" />
                +998 99 998-17-77
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} className="text-primary shrink-0" />
                support@novumtech.uz
              </li>
              <li>
                <a href="https://t.me/novumtechaza" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground transition-colors">
                  <Send size={16} className="text-primary shrink-0" />
                  @novumtechaza
                </a>
              </li>
              <li>
                <a href="https://instagram.com/novum_tech" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground transition-colors">
                  <Instagram size={16} className="text-primary shrink-0" />
                  novum_tech
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-10 pt-6 text-center text-xs text-muted-foreground">
          {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
