import sanitizeHtml from "sanitize-html";

// Allowlist covers typical email HTML: structure, inline formatting, links, images.
// style/script/iframe and event handlers are stripped by default.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "b", "i", "u", "s", "strong", "em",
    "a", "img",
    "table", "thead", "tbody", "tr", "th", "td",
    "div", "span",
  ],
  allowedAttributes: {
    a:   ["href", "title", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    "*": ["style"],
  },
  allowedStyles: {
    "*": {
      color:            [/.*/],
      "background-color": [/.*/],
      "font-size":      [/.*/],
      "font-weight":    [/.*/],
      "text-align":     [/.*/],
      "text-decoration":[/.*/],
    },
  },
  // Force external links to open safely
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        rel: "noopener noreferrer",
        ...(attribs["href"]?.startsWith("http") ? { target: "_blank" } : {}),
      },
    }),
  },
};

export function sanitizeBodyHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
