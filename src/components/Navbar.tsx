import { useState, useEffect } from "react";
import { Menu, X, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage, Lang } from "@/i18n/LanguageContext";

const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: "ru", flag: "🇷🇺", label: "РУ" },
  { code: "uz", flag: "🇺🇿", label: "UZ" },
  { code: "en", flag: "🇬🇧", label: "EN" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { lang, setLang, t } = useLanguage();

  const navLinks = [
    { label: t("nav.services"), href: "#services" },
    { label: t("nav.pricing"), href: "#pricing" },
    { label: t("nav.about"), href: "#about" },
    { label: t("nav.workflow"), href: "#workflow" },
    { label: t("nav.contacts"), href: "#contact" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = (href: string) => {
    setOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  const currentLang = LANGS.find((l) => l.code === lang)!;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/90 backdrop-blur-md border-b border-border shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-4 lg:px-8">
        <a href="#" className="text-2xl font-bold tracking-tight text-foreground">
          Novum<span className="text-primary">Tech</span>
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <button
              key={l.href}
              onClick={() => handleClick(l.href)}
              className="text-base text-foreground hover:text-primary transition-colors"
            >
              {l.label}
            </button>
          ))}

          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 text-sm text-foreground/80 hover:text-foreground transition-colors px-2 py-1.5 rounded-lg border border-border hover:border-primary/40"
            >
              <Globe size={14} className="text-primary" />
              <span>{currentLang.flag}</span>
              <span className="text-xs font-medium">{currentLang.label}</span>
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 rounded-lg border border-border bg-card shadow-xl overflow-hidden min-w-[120px]">
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setLangOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-primary/5 ${
                        lang === l.code ? "text-primary font-medium bg-primary/5" : "text-foreground/80"
                      }`}
                    >
                      <span>{l.flag}</span>
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <Button size="sm" onClick={() => handleClick("#contact")}>
            {t("nav.audit")}
          </Button>
        </div>

        {/* Mobile toggle + lang */}
        <div className="md:hidden flex items-center gap-2">
          {/* Mobile language switcher */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1 text-foreground/80 p-2 rounded-lg border border-border"
            >
              <span className="text-sm">{currentLang.flag}</span>
              <span className="text-xs font-medium">{currentLang.label}</span>
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 rounded-lg border border-border bg-card shadow-xl overflow-hidden min-w-[110px]">
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setLangOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-primary/5 ${
                        lang === l.code ? "text-primary font-medium bg-primary/5" : "text-foreground/80"
                      }`}
                    >
                      <span>{l.flag}</span>
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button className="text-foreground p-2" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-background/95 backdrop-blur-md border-b border-border">
          <div className="flex flex-col px-4 pb-4 gap-3">
            {navLinks.map((l) => (
              <button
                key={l.href}
                onClick={() => handleClick(l.href)}
                className="text-left py-3 text-muted-foreground hover:text-foreground transition-colors border-b border-border last:border-0"
              >
                {l.label}
              </button>
            ))}
            <Button className="mt-2" onClick={() => handleClick("#contact")}>
              {t("nav.audit")}
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
