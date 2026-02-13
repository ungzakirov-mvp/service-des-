import { Phone, Mail, MapPin } from "lucide-react";

const navLinks = [
  { label: "Услуги", href: "#services" },
  { label: "О нас", href: "#about" },
  { label: "Как мы работаем", href: "#workflow" },
  { label: "Контакты", href: "#contact" },
];

const Footer = () => {
  const scrollTo = (href: string) => document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });

  return (
    <footer className="border-t border-border bg-secondary/20 py-12">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <a href="#" className="text-xl font-bold tracking-tight">
              Novum<span className="text-primary">Tech</span>
            </a>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-xs">
              IT-аутсорсинг для среднего бизнеса в Ташкенте. Стабильность, безопасность и прозрачность.
            </p>
          </div>

          {/* Nav */}
          <div>
            <h4 className="font-semibold mb-4">Навигация</h4>
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

          {/* Contacts */}
          <div>
            <h4 className="font-semibold mb-4">Контакты</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone size={16} className="text-primary shrink-0" />
                +998 71 200-00-00
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} className="text-primary shrink-0" />
                info@novumtech.uz
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={16} className="text-primary shrink-0 mt-0.5" />
                г. Ташкент, ул. Амира Темура, 100
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-10 pt-6 text-center text-xs text-muted-foreground">
          © 2026 Novum Tech. Все права защищены.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
