const DEFAULT_API_URLS = [
  "https://api.pixhost.to/images",
  "http://pt-nexus-proxy.sqing33.dpdns.org/https://api.pixhost.to/images",
  "http://pt-nexus-proxy.1395251710.workers.dev/https://api.pixhost.to/images",
] as const;

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";

type PixhostApiResponse = {
  show_url?: unknown;
};

const PIXHOST_SHOW_URL_RE =
  /^https?:\/\/(?:www\.)?pixhost\.to\/show\/(\d+)\/([^?#]+)(?:[?#].*)?$/i;

function withTimeout(timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(id),
  };
}

export function isPixhostUrl(value: string) {
  const input = (value || "").trim();
  if (!input) return false;
  try {
    const url = new URL(input);
    return url.hostname === "pixhost.to" || url.hostname.endsWith(".pixhost.to");
  } catch {
    return false;
  }
}

export function toPixhostDirectImageUrl(value: string) {
  const input = (value || "").trim();
  if (!input) return input;

  const match = input.match(PIXHOST_SHOW_URL_RE);
  if (!match) return input;

  const folder = match[1];
  const filename = match[2];
  if (!folder || !filename) return input;

  return `https://img1.pixhost.to/images/${folder}/${filename}`;
}

export async function uploadToPixhost(opts: {
  file: Blob;
  filename: string;
  apiUrls?: readonly string[];
  timeoutMs?: number;
  userAgent?: string;
}): Promise<string | null> {
  const apiUrls = opts.apiUrls ?? DEFAULT_API_URLS;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const userAgent = opts.userAgent ?? DEFAULT_USER_AGENT;

  for (const apiUrl of apiUrls) {
    const form = new FormData();
    form.append("content_type", "0");
    form.append("img", opts.file, opts.filename);

    const timeout = withTimeout(timeoutMs);
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        body: form,
        headers: {
          "user-agent": userAgent,
          accept: "application/json",
        },
        signal: timeout.signal,
      });

      if (!res.ok) continue;

      const data = (await res.json().catch(() => null)) as PixhostApiResponse | null;
      const showUrl = data?.show_url;
      if (typeof showUrl === "string" && showUrl.trim()) {
        return toPixhostDirectImageUrl(showUrl.trim());
      }
    } catch {
      // Try next endpoint.
    } finally {
      timeout.clear();
    }
  }

  return null;
}
