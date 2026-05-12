export function storeWebsiteHost(url?: string) {
  if (!url) return "";

  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
}

export function storeWebsiteHref(url?: string) {
  if (!url) return "";
  return url.startsWith("http") ? url : `https://${url}`;
}
