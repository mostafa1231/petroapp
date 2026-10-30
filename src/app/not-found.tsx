import Link from "next/link";

/** Fallback for paths outside /ar and /en (localized 404 lives in [locale]). */
export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <main style={{ textAlign: "center", padding: 24 }}>
          <h1>الصفحة دي مش موجودة · Page not found</h1>
          <p>
            <Link href="/ar">الصفحة الرئيسية</Link> · <Link href="/en">Home</Link>
          </p>
        </main>
      </body>
    </html>
  );
}
