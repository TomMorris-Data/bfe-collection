import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BFE Farm Health",
  description: "Belmont Farm & Equine Vets — Farm Health Check-In",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
