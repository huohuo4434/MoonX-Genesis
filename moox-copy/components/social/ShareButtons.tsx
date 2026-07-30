"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import {
  buildTelegramShareUrl,
  buildXShareUrl,
  buildSocialShareText,
} from "@/lib/social-cards/share";

type ShareButtonsProps = {
  /** Absolute or site-relative path, e.g. `/forecasts/daily`. */
  url: string;
  forecastDate?: string;
  assetName?: string;
  direction?: string;
  summary?: string;
  className?: string;
};

function resolveAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).toString();
}

export function ShareButtons({
  url,
  forecastDate,
  assetName,
  direction,
  summary,
  className = "",
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [absoluteUrl, setAbsoluteUrl] = useState(url);

  useEffect(() => {
    setAbsoluteUrl(resolveAbsoluteUrl(url));
  }, [url]);

  const text = buildSocialShareText({
    forecastDate: forecastDate ?? "",
    assetName,
    direction,
    summary,
  });
  const xUrl = buildXShareUrl(absoluteUrl, text);
  const tgUrl = buildTelegramShareUrl(absoluteUrl, text);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(resolveAbsoluteUrl(url));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Button asChild variant="outline" size="sm">
        <a href={xUrl} target="_blank" rel="noopener noreferrer">
          Share on X
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={tgUrl} target="_blank" rel="noopener noreferrer">
          Share on Telegram
        </a>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={copyLink}>
        {copied ? "已复制" : "复制链接"}
      </Button>
    </div>
  );
}
