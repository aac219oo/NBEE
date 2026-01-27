"use server";

// Google Map link 轉 iframe
export async function resolveGoogleMapShortUrl(shortUrl: string) {
  try {
    let targetUrl = shortUrl;

    const response = await fetch(shortUrl, {
      method: "HEAD",
      redirect: "manual",
    });
    const location = response.headers.get("location");
    if (location) {
      targetUrl = location;
    }
    const pageResponse = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    const html = await pageResponse.text();

    const embedMatch = html.match(
      /https:\/\/www\.google\.com\/maps\/embed\?pb=[^"'\\]+/,
    );
    if (embedMatch?.[0]) {
      return embedMatch[0];
    }

    return targetUrl;
  } catch (error) {
    console.error("Error resolving short URL:", error);
    return null;
  }
}
