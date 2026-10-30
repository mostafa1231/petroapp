import type { MetadataRoute } from "next";
import { site } from "@config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/ar/thank-you", "/en/thank-you", "/ar/v/", "/en/v/"] }],
    sitemap: `${site.domain}/sitemap.xml`,
  };
}
