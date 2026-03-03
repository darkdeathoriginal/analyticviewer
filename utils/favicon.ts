/** Decode HTML entities commonly found in href attributes */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'");
}

export async function resolveFavicon(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const html = await response.text();

    // Match all <link> tags that carry an icon rel
    const iconRegex =
      /<link[^>]+rel=["']?(?:apple-touch-icon|icon|shortcut icon)["']?[^>]*>/gi;

    const matches = html.match(iconRegex);
    if (!matches) return null;

    // Try each match in order, prefer non-SVG-data URIs first so we get a
    // real image URL when one exists, but fall back to data URIs.
    let dataUriFallback: string | null = null;

    for (const tag of matches) {
      // Pull the raw href value (may contain HTML entities)
      const hrefMatch = tag.match(
        /href=["']?([^"'<>\s]+(?:\s+[^"'<>\s]+)*)["']?/i,
      );
      if (!hrefMatch) continue;

      // Decode HTML entities (e.g. &lt; → <, &gt; → >)
      let faviconUrl = decodeHtmlEntities(hrefMatch[1].trim());

      if (faviconUrl.startsWith("data:")) {
        // Keep as fallback; don't resolve against origin
        if (!dataUriFallback) dataUriFallback = faviconUrl;
        continue;
      }

      // Convert relative to absolute
      if (!faviconUrl.startsWith("http")) {
        const base = new URL(url);
        faviconUrl = new URL(faviconUrl, base.origin).href;
      }

      return faviconUrl;
    }

    // Return the data URI if that's all we found
    return dataUriFallback;
  } catch (err) {
    return null;
  }
}
