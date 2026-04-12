import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  jsonLd?: Record<string, any>;
}

export default function SEOHead({ title, description, canonical, jsonLd }: SEOHeadProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {canonical && <link rel="canonical" href={canonical} />}
      {canonical && <meta property="og:url" content={canonical} />}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
