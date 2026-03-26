import { Link } from "react-router-dom";

interface SeoTextBlockProps {
  children: React.ReactNode;
}

/**
 * Минималистичный SEO-текстовый блок внизу страницы.
 * Визуально нейтральный, мелкий шрифт, не мешает пользователю.
 */
export default function SeoTextBlock({ children }: SeoTextBlockProps) {
  return (
    <section className="border-t border-border bg-secondary/10 py-10">
      <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
        <div className="text-xs text-muted-foreground/70 leading-relaxed space-y-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-muted-foreground [&_h2]:mb-2 [&_h2]:mt-4 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-muted-foreground/80 [&_h3]:mb-1 [&_h3]:mt-3 [&_a]:text-primary/70 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary">
          {children}
        </div>
      </div>
    </section>
  );
}

export function SeoLink({ to, children }: { to: string; children: React.ReactNode }) {
  return <Link to={to}>{children}</Link>;
}
