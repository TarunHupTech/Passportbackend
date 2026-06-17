const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { verifyAppProxySignature } = require("../utils/shopify");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// Look up a customer's name + email from the Admin API (needs SHOPIFY_ADMIN_TOKEN
// with read_customers). Returns null if unavailable so callers can fall back.
async function fetchShopifyCustomer(shop, customerId) {
  const response = await fetch(
    `https://${shop}/admin/api/2025-10/graphql.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          query GetCustomer($id: ID!) {
            customer(id: $id) {
              id
              firstName
              lastName
              email
              phone
              verifiedEmail
              state
            }
          }
        `,
        variables: {
          id: `gid://shopify/Customer/${customerId}`,
        },
      }),
    }
  );

  const result = await response.json();

  if (result.errors) {
    console.error("GraphQL Errors:", result.errors);
    return null;
  }

  return result.data?.customer || null;
}

// Resolve name/email: prefer values passed by the extension, else Admin API.
async function resolveIdentity(shop, customerId, qName, qEmail) {
  let name = qName;
  let email = qEmail;
  if ((!name || !email) && process.env.SHOPIFY_ADMIN_TOKEN) {
    const customer = await fetchShopifyCustomer(shop, customerId);

    if (customer) {
      return {
        name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
        email: customer.email,
      };
    }
  }
  return { name, email };
}

// Find-or-create the user for a Shopify customer, keyed by the trusted
// customer id. Name/email (when supplied) are refreshed on every login so a
// placeholder created on the first visit gets upgraded to the real details.
async function upsertShopifyUser({ customerId, shop, email, name }) {
  const cid = String(customerId);
  const cleanEmail = email ? String(email).toLowerCase() : "";
  let user = await User.findOne({ shopifyCustomerId: cid });

  // First SSO: link to an existing email/password account if one matches.
  if (!user && cleanEmail) {
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      existing.shopifyCustomerId = cid;
      user = existing;
    }
  }

  if (!user) {
    user = new User({
      shopifyCustomerId: cid,
      email: cleanEmail || `${cid}@${shop}`,
      name: name || "Shopify Customer",
    });
  } else {
    if (cleanEmail) user.email = cleanEmail;
    if (name) user.name = name;
  }
  user.shopifyDomain = shop;
  await user.save();
  return user;
}

function redirectToApp(res, token) {
  const target = `${process.env.APP_FRONTEND_URL || "http://localhost:5173"}/sso?token=${encodeURIComponent(token)}`;
  res.set("Content-Type", "text/html");
  return res.send(
    `<!doctype html><html><head><meta charset="utf-8">` +
      `<meta http-equiv="refresh" content="0;url=${target}"></head>` +
      `<body style="font-family:Inter,system-ui,sans-serif;text-align:center;padding:48px;color:#642128">` +
      `Signing you in…<script>location.replace(${JSON.stringify(target)})</script></body></html>`
  );
}

// GET /api/shopify/proxy — App Proxy / online-store storefront link.
exports.proxyLogin = async (req, res) => {
  try {
    const secret = process.env.SHOPIFY_API_SECRET;
    if (!secret) return res.status(500).send("Shopify SSO is not configured");

    if (!verifyAppProxySignature(req.query, secret)) {
      return res.status(401).send("Invalid Shopify signature");
    }

    const shop = req.query.shop || process.env.SHOPIFY_STORE_DOMAIN || "shopify";
    const customerId = req.query.logged_in_customer_id;
    if (!customerId) return res.redirect(`https://${shop}/account/login`);

    const { name, email } = await resolveIdentity(
      shop,
      customerId,
      req.query.name,
      req.query.email
    );
    const user = await upsertShopifyUser({ customerId, shop, email, name });
    return redirectToApp(res, signToken(user._id));
  } catch (err) {
    console.error("shopify proxyLogin error:", err);
    return res.status(500).send("Sign-in failed");
  }
};

// GET /api/shopify/account-sso — Customer Account UI extension.
// The extension passes its Shopify session token (JWT signed with the app's
// client secret); we verify it and trust `sub` as the customer id.
exports.accountSso = async (req, res) => {
  try {
    const secret = process.env.SHOPIFY_API_SECRET;
    if (!secret) return res.status(500).send("Shopify SSO is not configured");

    const raw =
      req.query.token || (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!raw) return res.status(400).send("Missing session token");

    let payload;
    try {
      payload = jwt.verify(raw, secret, { algorithms: ["HS256"] });
    } catch (e) {
      const decoded = jwt.decode(raw, { complete: true });
      console.error(
        "[account-sso] verify failed:",
        e.name + " - " + e.message,
        "| token.alg:", decoded?.header?.alg,
        "| token.aud:", decoded?.payload?.aud,
        "| server.apiKey:", process.env.SHOPIFY_API_KEY || "(unset)"
      );
      return res.status(401).send(`Invalid session token (${e.name})`);
    }

    if (process.env.SHOPIFY_API_KEY && payload.aud !== process.env.SHOPIFY_API_KEY) {
      return res.status(401).send("Session token audience mismatch");
    }

    // `sub` is the customer GID (gid://shopify/Customer/123) — needs the app's
    // protected customer data access, else Shopify omits it.
    const sub = String(payload.sub || "");
    const customerId = sub.includes("/") ? sub.split("/").pop() : sub;
    if (!customerId) {
      return res
        .status(401)
        .send("No customer in session token — grant the app protected customer data access");
    }

    const shop =
      String(payload.dest || payload.iss || "")
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "") ||
      process.env.SHOPIFY_STORE_DOMAIN ||
      "shopify";

    const { name, email } = await resolveIdentity(
      shop,
      customerId,
      req.query.name,
      req.query.email
    );
    const user = await upsertShopifyUser({ customerId, shop, email, name });
    return redirectToApp(res, signToken(user._id));
  } catch (err) {
    console.error("shopify accountSso error:", err);
    return res.status(500).send("Sign-in failed");
  }
};
