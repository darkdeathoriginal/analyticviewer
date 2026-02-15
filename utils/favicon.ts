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

    const iconRegex =
      /<link[^>]+rel=["']?(?:apple-touch-icon|icon|shortcut icon)["']?[^>]*>/gi;

    const matches = html.match(iconRegex);
    if (!matches) return null;

    // Pick first (usually best)
    const hrefMatch = matches[0].match(/href=["']?([^"'>]+)["']?/i);
    if (!hrefMatch) return null;

    let faviconUrl = hrefMatch[1];

    // Convert relative to absolute
    if (!faviconUrl.startsWith("http")) {
      const base = new URL(url);
      faviconUrl = new URL(faviconUrl, base.origin).href;
    }

    return faviconUrl;
  } catch (err) {
    return null;
  }
}
