export type UploadImageFolder = "news" | "avatars";

function stripUrlOrigin(input: string) {
  const value = (input || "").trim();
  if (!value) return "";

  try {
    return new URL(value).pathname;
  } catch {
    return value;
  }
}

function stripQueryAndHash(input: string) {
  return (input || "").split(/[?#]/)[0] || "";
}

function normalizeSlashes(input: string) {
  return (input || "").replaceAll("\\", "/");
}

export function extractUploadFilename(input: string | null | undefined) {
  const normalized = normalizeSlashes(stripQueryAndHash(stripUrlOrigin(String(input || ""))));
  if (!normalized) return null;

  const parts = normalized.split("/").filter(Boolean);
  const base = parts.at(-1);
  return base || null;
}

export function resolveUploadImageUrl(
  value: string | null | undefined,
  folder: UploadImageFolder
) {
  const normalized = normalizeSlashes(stripQueryAndHash(stripUrlOrigin(String(value || ""))));
  if (!normalized) return null;

  if (normalized.includes("/")) {
    return normalized.startsWith("/") ? normalized : `/${normalized}`;
  }

  return `/uploads/images/${folder}/${normalized}`;
}
