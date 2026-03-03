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

/**
 * Try to extract an emoji character from an SVG data URI favicon.
 * Many sites use a pattern like:
 *   data:image/svg+xml,<svg ...><text ...>🐳</text></svg>
 * Returns `emoji:{char}` if found, null otherwise.
 */
function extractEmojiFromSvgDataUri(dataUri: string): string | null {
  try {
    const commaIdx = dataUri.indexOf(",");
    if (commaIdx === -1) return null;
    const raw = dataUri.slice(commaIdx + 1);

    // Decode percent-encoding if present, ignore errors
    let svgText = raw;
    try {
      svgText = decodeURIComponent(raw);
    } catch {
      /* use raw */
    }

    // Also decode HTML entities (href attributes often encode < and >)
    svgText = decodeHtmlEntities(svgText);

    // Match content inside a <text> element
    const textMatch = svgText.match(/<text[^>]*>([^<]+)<\/text>/i);
    if (!textMatch) return null;

    const content = textMatch[1].trim();

    // Check that content is emoji / non-ASCII (skip pure ASCII text)
    // A simple heuristic: at least one character with codepoint > 127
    const hasEmoji = [...content].some((c) => c.codePointAt(0)! > 127);
    if (!hasEmoji || content.length > 4) return null; // sanity-limit length

    return `emoji:${content}`;
  } catch {
    return null;
  }
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

    // Prefer http/https URLs; fall back to data URIs (incl. emoji extraction)
    let dataUriFallback: string | null = null;

    for (const tag of matches) {
      const hrefMatch = tag.match(
        /href=["']?([^"'<>\s]+(?:\s+[^"'<>\s]+)*)["']?/i,
      );
      if (!hrefMatch) continue;

      let faviconUrl = decodeHtmlEntities(hrefMatch[1].trim());

      if (faviconUrl.startsWith("data:")) {
        if (!dataUriFallback) {
          // Try to extract an emoji first (lightweight, renders natively)
          const emoji = extractEmojiFromSvgDataUri(faviconUrl);
          dataUriFallback = emoji ?? faviconUrl;
        }
        continue;
      }

      // Convert relative to absolute
      if (!faviconUrl.startsWith("http")) {
        const base = new URL(url);
        faviconUrl = new URL(faviconUrl, base.origin).href;
      }

      return faviconUrl;
    }

    return dataUriFallback;
  } catch (err) {
    return null;
  }
}
