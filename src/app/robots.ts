import type { MetadataRoute } from "next";

/** §3.3: nothing on this platform is ever indexable. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
