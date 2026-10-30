import type { ReactNode } from "react";
import "./globals.css";

/** The real <html> lives in [locale]/layout.tsx so lang/dir are set per locale. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
