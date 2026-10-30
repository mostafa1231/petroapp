import type { MetadataRoute } from "next";
import { site } from "@config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const alternates = { languages: { "ar-EG": `${site.domain}/ar`, "en-EG": `${site.domain}/en` } };
  return [
    { url: `${site.domain}/ar`, changeFrequency: "weekly", priority: 1, alternates },
    { url: `${site.domain}/en`, changeFrequency: "weekly", priority: 0.8, alternates },
  ];
}
