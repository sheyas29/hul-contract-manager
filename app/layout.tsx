import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HUL Contract Manager",
  description: "Loading & Unloading Operations Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
