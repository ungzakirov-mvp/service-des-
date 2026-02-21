import { Phone, Mail } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  const navLinks = [
    { label: t("nav.services"), href: "#services" },
    { label: t("nav.about"), href: "#about" },
    { label: t("nav.workflow"), href: "#workflow" },
    { label: t("nav.contacts"), href: "#contact" },
  ];

  const scrollTo = (href: string) => document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });

  return (
    <footer className="border-t border-border bg-secondary/20 py-12">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
          <div>
            <a href="#" className="text-xl font-bold tracking-tight">
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
                    onClick={() => scrollTo(l.href)}
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
