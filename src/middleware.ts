import { NextResponse, type NextRequest } from "next/server";
import { experiment, isVariant } from "../config/experiments";

/**
 * - "/" → "/ar" (query string preserved so UTMs/click IDs survive)
 * - "/ar" | "/en" → rewrite to "/<locale>/v/<variant>" with a sticky cookie.
 *   The visible URL stays canonical; each variant is a static page.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/ar";
    return NextResponse.redirect(url, 308);
  }

  const m = pathname.match(/^\/(ar|en)\/?$/);
  if (m) {
    const existing = req.cookies.get(experiment.cookie)?.value;
    const forced = req.nextUrl.searchParams.get("variant") ?? undefined; // QA: ?variant=B
    const variant = isVariant(forced) ? forced : isVariant(existing) ? existing : Math.random() < experiment.splitA ? experiment.variants[0] : experiment.variants[1];
    const url = new URL(`/${m[1]}/v/${variant}${search}`, req.url);
    const res = NextResponse.rewrite(url);
    if (existing !== variant) {
      res.cookies.set(experiment.cookie, variant, { maxAge: 60 * 60 * 24 * 60, path: "/", sameSite: "lax" });
    }
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/ar", "/ar/", "/en", "/en/"],
};
