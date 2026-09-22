import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="home-eyebrow">{eyebrow}</p> : null}
        <h2 className="home-section-title">{title}</h2>
        {description ? <p className="home-section-description">{description}</p> : null}
      </div>
      {href && linkLabel ? (
        <Link href={href} className="home-inline-link">
          <span>{linkLabel}</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}
