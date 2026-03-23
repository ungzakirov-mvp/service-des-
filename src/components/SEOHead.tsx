import { useEffect } from 'react';

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  jsonLd?: Record<string, any>;
}

export default function SEOHead({ title, description, canonical, jsonLd }: SEOHeadProps) {
  useEffect(() => {
    document.title = title;

    const setMeta = (name: string, content: string, attr = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (el) {
        el.setAttribute('content', content);
      } else {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        el.content = content;
        document.head.appendChild(el);
      }
    };

    setMeta('description', description);
    setMeta('og:title', title, 'property');
    setMeta('og:description', description, 'property');
    if (canonical) {
      setMeta('og:url', canonical, 'property');
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (link) {
        link.href = canonical;
      } else {
        link = document.createElement('link');
        link.rel = 'canonical';
        link.href = canonical;
        document.head.appendChild(link);
      }
    }

    // JSON-LD
    const existingLd = document.querySelector('script[data-seo-jsonld]');
    if (existingLd) existingLd.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-jsonld', 'true');
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      const ld = document.querySelector('script[data-seo-jsonld]');
      if (ld) ld.remove();
    };
  }, [title, description, canonical, jsonLd]);

  return null;
}
