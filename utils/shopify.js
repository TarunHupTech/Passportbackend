const crypto = require("crypto");

// Verify a Shopify App Proxy request signature.
// Shopify signs ALL query params (except `signature`) with the app's API secret:
//   sort params by key, join as "key=value" with NO separator, HMAC-SHA256, hex.
// A valid signature proves the request genuinely came from Shopify.
function verifyAppProxySignature(query, secret) {
  if (!secret) return false;
  const { signature, ...params } = query;
  if (!signature) return false;

  const message = Object.keys(params)
    .sort()
    .map((key) => {
      const value = Array.isArray(params[key]) ? params[key].join(",") : params[key];
      return `${key}=${value}`;
    })
    .join("");

  const digest = crypto.createHmac("sha256", secret).update(message).digest("hex");

  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(String(signature), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { verifyAppProxySignature };
