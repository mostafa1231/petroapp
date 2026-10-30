// Renders public/og/og-{ar,en}.png (1200×630). Run: node scripts/og/render.cjs
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const copy = {
  ar: { dir: "rtl", h: "وقّف هدر البنزين والسولار في أسطولك — ووفّر لحد 20%", s: "شريحة NFC لكل عربية · فواتير إلكترونية معتمدة · +600 محطة في مصر" },
  en: { dir: "ltr", h: "Stop fuel waste in your fleet — save up to 20%", s: "NFC chip per vehicle · Certified e-invoices · 600+ stations in Egypt" },
};
(async () => {
  const root = path.resolve(__dirname, "../..");
  const logo = "data:image/png;base64," + fs.readFileSync(path.join(root, "public/brand/petroapp-logo-white.png")).toString("base64");
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  for (const [lang, c] of Object.entries(copy)) {
    await p.goto("file://" + path.join(__dirname, "og.html"));
    await p.evaluate(({ lang, c, logo }) => {
      document.body.lang = lang; document.documentElement.dir = c.dir;
      document.getElementById("h").textContent = c.h; document.getElementById("s").textContent = c.s;
      document.getElementById("logo").src = logo;
    }, { lang, c, logo });
    await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(root, `public/og/og-${lang}.png`) });
  }
  await b.close();
})();
