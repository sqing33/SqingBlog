import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

export function isProbablyHtml(value?: string | null) {
  return /<\/?[a-z][\s\S]*>/i.test(value || "");
}

export function rewriteLegacyAssetHosts(value: string, opts?: { siteUrl?: string }) {
  const input = value || "";

  // Common legacy values in the Doraemon DB: http://localhost:3000/uploads/...
  const withoutLocalhost = input.replaceAll("http://localhost:3000", "");

  // If the project is deployed under a different origin but legacy content still stores it,
  // we can optionally strip the configured siteUrl as well.
  const siteUrl = opts?.siteUrl;
  if (!siteUrl) return withoutLocalhost;
  return withoutLocalhost.replaceAll(siteUrl, "");
}

export function toSafeHtml(raw: string) {
  // Always parse as Markdown (it can include raw HTML blocks as well).
  // This avoids mis-detecting mixed Markdown+HTML content as "pure HTML" and leaving Markdown unrendered.
  const html = marked.parse(raw || "", { async: false });

  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "span",
      "section",
      "article",
      "figure",
      "figcaption",
      "pre",
      "code",
      "blockquote",
      "hr",
    ]),
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "data-href", "style"],
      "*": ["class", "style"],
    },
    allowedSchemes: ["http", "https", "data"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
    },
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-f]+$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i],
        "text-align": [/^(left|right|center|justify)$/],
        "font-weight": [/^(normal|bold|bolder|lighter|\d{3})$/],
      },
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
    },
  });
}
