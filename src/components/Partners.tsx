import ScrollReveal from '@/components/ScrollReveal';
import { useLanguage } from '@/i18n/LanguageContext';

import microsoftLogo from '@/assets/partners/microsoft.png';
import dellLogo from '@/assets/partners/dell.png';
import hpLogo from '@/assets/partners/hp.png';
import esetLogo from '@/assets/partners/eset.png';
import xeroxLogo from '@/assets/partners/xerox.png';
import hitachiLogo from '@/assets/partners/hitachi-vantara.png';
import safeticaLogo from '@/assets/partners/safetica.png';
import scopdLogo from '@/assets/partners/scopd.png';
import yealinkLogo from '@/assets/partners/yealink.png';
import polyLogo from '@/assets/partners/poly.png';
import logitechLogo from '@/assets/partners/logitech.png';
import verticaLogo from '@/assets/partners/vertica.png';

const partners = [
  { name: 'Microsoft', logo: microsoftLogo },
  { name: 'DELL', logo: dellLogo },
  { name: 'HP', logo: hpLogo },
  { name: 'ESET', logo: esetLogo },
  { name: 'Xerox', logo: xeroxLogo },
  { name: 'Hitachi Vantara', logo: hitachiLogo },
  { name: 'Safetica', logo: safeticaLogo },
  { name: 'Scopd', logo: scopdLogo },
  { name: 'Yealink', logo: yealinkLogo },
  { name: 'Poly', logo: polyLogo },
  { name: 'Logitech', logo: logitechLogo },
  { name: 'VERTICA', logo: verticaLogo },
];

export default function Partners() {
  const { lang } = useLanguage();
  const title = lang === 'uz' ? 'Rasmiy hamkorlarimiz' : lang === 'en' ? 'Official Partners' : 'Наши официальные партнёры';

  return (
    <section className="py-16 lg:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_60%,hsl(217,91%,60%,0.04),transparent)]" />
      <div className="container mx-auto px-4 lg:px-8 relative">
        <ScrollReveal>
          <div className="text-center mb-12 lg:mb-16">
            <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-3">Partners</p>
            <h2 className="text-3xl lg:text-[2.5rem] font-bold text-foreground leading-tight">{title}</h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-5">
          {partners.map((p, i) => (
            <ScrollReveal key={p.name} delay={i * 50}>
              <div className="group flex items-center justify-center h-36 lg:h-44 cursor-default transition-all duration-500 hover:scale-110">
                <img
                  src={p.logo}
                  alt={p.name}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="h-36 lg:h-44 w-auto object-contain opacity-85 transition-all duration-500 group-hover:opacity-100"
                />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
