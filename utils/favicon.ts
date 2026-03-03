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
 *   data:image/svg+xml,&lt;svg ...&gt;&lt;text ...&gt;🐳&lt;/text&gt;&lt;/svg&gt;
 * Returns `emoji:{char}` if found, null otherwise.
 */
function extractEmojiFromSvgDataUri(dataUri: string): string | null {
  try {
    const commaIdx = dataUri.indexOf(",");
    if (commaIdx === -1) return null;
    let raw = dataUri.slice(commaIdx + 1);

    // First decode percent-encoding if present
    try {
      raw = decodeURIComponent(raw);
    } catch {
      /* use raw */
    }

    // Then decode HTML entities (the SVG might be entity-encoded in the href)
    let svgText = decodeHtmlEntities(raw);

    // Match content inside a <text> element (handle both encoded and decoded forms)
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

/**
 * Parse favicon from HTML content directly.
 * @param html - The HTML string to parse
 * @param baseUrl - The base URL for resolving relative paths
 * @returns The favicon URL, emoji identifier, or null
 */
export function parseFaviconFromHtml(
  html: string,
  baseUrl: string,
): string | null {
  try {
    // Match all <link> tags that carry an icon rel
    const iconRegex =
      /<link[^>]+rel=["']?(?:apple-touch-icon|icon|shortcut icon)["']?[^>]*>/gi;

    const matches = html.match(iconRegex);
    if (!matches) return null;

    // Prefer http/https URLs; fall back to data URIs (incl. emoji extraction)
    let dataUriFallback: string | null = null;

    for (const tag of matches) {
      // Match href="value" or href='value' or href=value
      // Group 2 is the value for quoted, Group 1 is the value for unquoted
      const hrefMatch =
        tag.match(/href=(["'])(.*?)\1/i) || tag.match(/href=([^>'"\s]+)/i);

      if (!hrefMatch) continue;

      // For quoted match: hrefMatch[2] is value, hrefMatch[1] is quote
      // For unquoted match: hrefMatch[1] is value
      let faviconUrl = decodeHtmlEntities(
        (hrefMatch[2] ?? hrefMatch[1]).trim(),
      );

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
        const base = new URL(baseUrl);
        faviconUrl = new URL(faviconUrl, base.origin).href;
      }

      return faviconUrl;
    }

    return dataUriFallback;
  } catch {
    return null;
  }
}

/**
 * Legacy: Fetch and resolve favicon from a URL (kept for compatibility).
 * Consider using parseFaviconFromHtml if you already have the HTML.
 */
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
    return parseFaviconFromHtml(html, url);
  } catch {
    return null;
  }
}
