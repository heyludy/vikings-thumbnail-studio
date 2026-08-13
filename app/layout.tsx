import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://vikings.ludia0602.workers.dev"),
  title: "Seoul Vikings Thumbnail Studio",
  description: "서울 바이킹스 경기 썸네일을 빠르게 만들어보세요.",
  applicationName: "Vikings Thumbnail Studio",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "Vikings Thumbnail Studio",
    title: "Seoul Vikings Thumbnail Studio",
    description: "서울 바이킹스 경기 썸네일을 빠르게 만들어보세요.",
    images: [
      {
        url: "/og-v2.png",
        width: 1200,
        height: 630,
        alt: "Seoul Vikings Thumbnail Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Seoul Vikings Thumbnail Studio",
    description: "서울 바이킹스 경기 썸네일을 빠르게 만들어보세요.",
    images: ["/og-v2.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* 썸네일 글자를 그리는 데 바로 필요한 폰트라 미리 받아둔다. */}
        <link
          rel="preload"
          href="/assets/fonts/pretendard-black.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
