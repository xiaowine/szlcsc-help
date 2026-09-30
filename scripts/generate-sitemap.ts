import { existsSync, readFileSync, writeFileSync } from "node:fs";

const siteUrl = (process.env.SITE_URL ?? "").replace(/\/+$/, "");
if (!siteUrl) throw new Error("SITE_URL is required");
const dataPath = "public/coupon_details.json";
const runTimePath = "public/run_time.txt";
const categories = existsSync(dataPath)
  ? Object.keys(
      JSON.parse(readFileSync(dataPath, "utf8")) as Record<string, unknown>,
    )
  : [];
const runTime = existsSync(runTimePath)
  ? readFileSync(runTimePath, "utf8").trim().split(/\s+/, 1)[0]
  : "";
const lastmod = /^\d{4}-\d{2}-\d{2}$/.test(runTime) ? runTime : null;

const urls = [
  `${siteUrl}/`,
  ...categories.map(
    (category) => `${siteUrl}/?category=${encodeURIComponent(category)}`,
  ),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) =>
      `  <url>\n    <loc>${url}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n  </url>`,
  )
  .join("\n")}
</urlset>
`;

writeFileSync("public/sitemap.xml", sitemap);
writeFileSync(
  "public/robots.txt",
  `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
);
console.log(`Generated sitemap with ${urls.length} URLs${lastmod ? ` (${lastmod})` : ""}`);
