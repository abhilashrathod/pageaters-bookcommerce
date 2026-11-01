'use client';

import { Share2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button.tsx';

// The legacy Share icon button: copies the page's link and says so for a moment.
export function ShareButton() {
  const [copied, setCopied] = useState(false);
  const share = () => {
    void navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <Button variant="ghost" onClick={share} className={copied ? 'text-accent' : undefined} aria-live="polite">
      <Share2 aria-hidden />
      {copied ? 'Link Copied' : 'Share'}
    </Button>
  );
}
