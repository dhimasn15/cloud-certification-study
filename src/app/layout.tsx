import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lattice | Cloud certification study",
  description: "Review and understand your cloud certification exams.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
