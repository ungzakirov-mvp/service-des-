import ScrollReveal from '@/components/ScrollReveal';
import { useLanguage } from '@/i18n/LanguageContext';

const partners = [
  { name: 'Microsoft', style: 'font-[600] tracking-[-0.02em]', color: '#00A4EF' },
  { name: 'DELL', style: 'font-[700] tracking-[0.08em] uppercase', color: '#007DB8' },
  { name: 'HP', style: 'font-[700] tracking-[0.04em] uppercase', color: '#0096D6' },
  { name: 'ESET', style: 'font-[800] tracking-[0.06em] uppercase', color: '#1EC26A' },
  { name: 'Xerox', style: 'font-[700] tracking-[-0.01em]', color: '#E4002B' },
  { name: 'Hitachi Vantara', style: 'font-[600] tracking-[-0.01em]', color: '#E60027' },
  { name: 'Safetica', style: 'font-[600] tracking-[0.02em]', color: '#00B4D8' },
  { name: 'Scopd', style: 'font-[700] tracking-[0.04em]', color: '#8B5CF6' },
  { name: 'Yealink', style: 'font-[600] tracking-[0.02em]', color: '#0073CF' },
  { name: 'Poly', style: 'font-[700] tracking-[0.02em]', color: '#00873C' },
  { name: 'Logitech', style: 'font-[700] tracking-[-0.01em]', color: '#00B057' },
  { name: 'VERTICA', style: 'font-[800] tracking-[0.1em] uppercase', color: '#0EA5E9' },
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
              <div className="group relative glass rounded-2xl p-6 lg:p-7 flex items-center justify-center h-24 lg:h-28 cursor-default transition-all duration-500 hover:scale-105 hover:border-primary/20 hover:shadow-[0_0_40px_-10px_hsl(217,91%,60%,0.15)]">
                <span
                  className={`text-lg lg:text-xl text-muted-foreground/60 transition-all duration-500 group-hover:opacity-100 whitespace-nowrap ${p.style}`}
                  style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    transition: 'color 0.5s, opacity 0.5s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = p.color)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '')}
                >
                  {p.name}
                </span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
