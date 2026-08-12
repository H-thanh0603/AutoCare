import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";

import { Toaster } from "@/components/ui/sonner";
import { PostHogProvider, PostHogPageView } from "@/components/providers/posthog-provider";

import "./globals.css";

const sans = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AutoCare · Quản lý gara & hồ sơ sức khỏe xe",
    template: "%s · AutoCare",
  },
  description:
    "AutoCare giúp gara quản lý toàn bộ quy trình từ lịch hẹn, báo giá, sửa chữa đến bảo hành, đồng thời lưu hồ sơ sức khỏe điện tử cho từng xe.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          {children}
          <Toaster position="top-right" richColors />
        </PostHogProvider>
      </body>
    </html>
  );
}
