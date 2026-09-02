import type { Metadata, Viewport } from "next";
import { COR_AR, COR_GRAFITE } from "@/design/tema-chrome";
import { ProvedorTema } from "@/lib/tema";
import "./globals.css";

export const metadata: Metadata = {
  title: "casal",
  description: "Gastos, cartões e contas do casal.",
  applicationName: "casal",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "casal",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: COR_AR },
    { media: "(prefers-color-scheme: dark)", color: COR_GRAFITE },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link
          rel="preload"
          href="/fontes/inter-tight-latin-600-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fontes/ibm-plex-mono-latin-500-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("casal-tema");if(t==="claro"||t==="escuro")document.documentElement.setAttribute("data-tema",t)}catch(e){}`,
          }}
        />
      </head>
      <body>
        <ProvedorTema>{children}</ProvedorTema>
      </body>
    </html>
  );
}
