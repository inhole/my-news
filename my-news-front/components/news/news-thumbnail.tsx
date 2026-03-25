'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';

interface NewsThumbnailProps {
  src?: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  fill?: boolean;
  className?: string;
  fallbackClassName?: string;
}

const FALLBACK_IMAGE_SRC = '/news-fallback.svg';

export function NewsThumbnail({
  src,
  alt,
  sizes,
  priority = false,
  fill = true,
  className = 'object-cover object-center',
  fallbackClassName = 'absolute inset-0 object-cover object-center',
}: NewsThumbnailProps) {
  const normalizedSrc = useMemo(() => {
    const trimmed = src?.trim();
    return trimmed ? trimmed : null;
  }, [src]);
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = !hasError && normalizedSrc ? normalizedSrc : FALLBACK_IMAGE_SRC;

  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      fill={fill}
      priority={priority}
      sizes={sizes}
      className={resolvedSrc === FALLBACK_IMAGE_SRC ? fallbackClassName : className}
      onError={() => {
        if (resolvedSrc !== FALLBACK_IMAGE_SRC) {
          setHasError(true);
        }
      }}
    />
  );
}
