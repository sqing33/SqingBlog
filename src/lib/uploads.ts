export type UploadImageFolder = "news" | "avatars";

function tryParseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function getConfiguredSiteOrigin() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const url = tryParseUrl(siteUrl);
  return url ? url.origin : null;
}

function isInternalUrl(url: URL) {
  const siteOrigin = getConfiguredSiteOrigin();
  if (siteOrigin && url.origin === siteOrigin) return true;
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;
  return false;
}

function stripUrlOrigin(input: string) {
  const value = (input || "").trim();
  if (!value) return "";

  const url = tryParseUrl(value);
  if (!url) return value;
  if (!isInternalUrl(url)) return value;
  return url.pathname;
}

function stripQueryAndHash(input: string) {
  return (input || "").split(/[?#]/)[0] || "";
}

function normalizeSlashes(input: string) {
  return (input || "").replaceAll("\\", "/");
}

export function extractUploadFilename(input: string | null | undefined) {
  const raw = String(input || "").trim();
  if (!raw) return null;

  const url = tryParseUrl(raw);
  if (url && !isInternalUrl(url)) {
    const cleaned = stripQueryAndHash(raw);
    return cleaned || null;
  }

  const normalized = normalizeSlashes(stripQueryAndHash(stripUrlOrigin(raw)));
  if (!normalized) return null;

  const parts = normalized.split("/").filter(Boolean);
  const base = parts.at(-1);
  return base || null;
}

export function resolveUploadImageUrl(
  value: string | null | undefined,
  folder: UploadImageFolder
) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const url = tryParseUrl(raw);
  if (url && !isInternalUrl(url)) {
    return raw;
  }

  const normalized = normalizeSlashes(stripQueryAndHash(stripUrlOrigin(raw)));
  if (!normalized) return null;

  if (normalized.includes("/")) {
    return normalized.startsWith("/") ? normalized : `/${normalized}`;
  }

  return `/uploads/images/${folder}/${normalized}`;
}
