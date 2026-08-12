"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY && typeof window !== "undefined") {
      try {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
          person_profiles: "identified_only",
          capture_pageview: false,
        });
      } catch (err) {
        console.warn("PostHog initialization error:", err);
      }
    }
  }, []);

  // Nếu không có API Key, render children trực tiếp để tránh lỗi fetch ngầm
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

// Bắt sự kiện chuyển trang (PageView) trong Next.js App Router
export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      try {
        let url = window.origin + pathname;
        if (searchParams?.toString()) {
          url = url + `?${searchParams.toString()}`;
        }
        posthog.capture("$pageview", {
          $current_url: url,
        });
      } catch (err) {
        console.warn("PostHog capture error:", err);
      }
    }
  }, [pathname, searchParams]);

  return null;
}
