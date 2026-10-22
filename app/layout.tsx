import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Setu",
  description: "Voice agent backend for elderly Indian parents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
