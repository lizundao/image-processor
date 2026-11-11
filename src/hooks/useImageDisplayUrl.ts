import { useEffect, useState } from 'react';
import { resolveImageDisplayUrl } from '../utils/imageDisplayUrl';

export function useImageDisplayUrl(url: string): string {
  const [displayUrl, setDisplayUrl] = useState(() =>
    url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('http') ? url : ''
  );

  useEffect(() => {
    let cancelled = false;

    resolveImageDisplayUrl(url).then((resolved) => {
      if (!cancelled) {
        setDisplayUrl(resolved);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return displayUrl;
}
