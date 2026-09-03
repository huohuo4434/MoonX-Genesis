"use client";

import { useEffect } from "react";
import {
  ATTRIBUTION_FIRST_TOUCH_KEY,
  ATTRIBUTION_LAST_TOUCH_KEY,
  buildSignupAttributionTouch,
  readStoredSignupAttribution,
} from "@/lib/analytics/signup-attribution-core";

export function AttributionCapture() {
  useEffect(() => {
    const touch = buildSignupAttributionTouch(window.location.href, document.referrer);
    if (!touch) return;
    try {
      const serialized = JSON.stringify(touch);
      if (!readStoredSignupAttribution(window.localStorage.getItem(ATTRIBUTION_FIRST_TOUCH_KEY))) {
        window.localStorage.setItem(ATTRIBUTION_FIRST_TOUCH_KEY, serialized);
      }
      window.localStorage.setItem(ATTRIBUTION_LAST_TOUCH_KEY, serialized);
    } catch {
      // Attribution is optional and must never block the site.
    }
  }, []);
  return null;
}
