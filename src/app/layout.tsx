import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const khTeka = localFont({
  src: "../fonts/KHTeka-Light.otf",
  variable: "--font-kh-teka",
  display: "swap",
  weight: "300",
});

export const metadata: Metadata = {
  title: "sky vase",
  description:
    "Custom anodised titanium vases encoding a date and location into a unique colour gradient.",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${khTeka.variable} antialiased`}>
      <body className="m-0 overflow-hidden bg-black">{children}</body>
    </html>
  );
}
