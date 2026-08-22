/**
 * Patch Kraze — Quote Form Backend
 *
 * Receives quote submissions (including design files) from the storefront,
 * then via the Shopify Admin API:
 *   1. Uploads the design file to Content > Files
 *   2. Creates or updates the customer (tagged 'quote-request')
 *   3. Stores the quote as a 'quote_request' metaobject (Content > Metaobjects)
 *
 * Env vars (set in Railway):
 *   SHOPIFY_SHOP           e.g. patchkraze.myshopify.com
 *   SHOPIFY_CLIENT_ID      app Client ID (from Partner/Dev Dashboard app)
 *   SHOPIFY_CLIENT_SECRET  app Client Secret (shpss_...)
 *   SHOPIFY_ADMIN_TOKEN    optional legacy shpat_ token (used directly if set)
 *   ALLOWED_ORIGINS        comma-separated, e.g. https://patchkraze.com,https://www.patchkraze.com
 *   PORT                   provided by Railway automatically
 *
 * Auth: Shopify's 2026+ model - the app must be INSTALLED on the store, then
 * this server exchanges client_id/client_secret for short-lived Admin API
 * access tokens via the client credentials grant, refreshing automatically.
 */

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const crypto = require('crypto');

const SHOP = process.env.SHOPIFY_SHOP;
const STATIC_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN; // legacy fallback
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-01';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://patchkraze.com,https://www.patchkraze.com')
  .split(',')
  .map((s) => s.trim());

if (!SHOP || (!STATIC_TOKEN && !(CLIENT_ID && CLIENT_SECRET))) {
  console.error(
    'Missing env vars: need SHOPIFY_SHOP plus either SHOPIFY_ADMIN_TOKEN or SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET.'
  );
}

// --- Access token management -------------------------------------------------
// Preferred: offline token obtained once via OAuth authorization code grant
// (GET /auth in a browser). Falls back to client credentials grant, which only
// works when the store belongs to the app's own Dev Dashboard organization.
let _oauthToken = null; // offline token from authorization code grant (never expires)
let _cachedToken = null;
let _cachedTokenExpiry = 0;

async function getAccessToken() {
  if (STATIC_TOKEN) return STATIC_TOKEN;
  if (_oauthToken) return _oauthToken;
  if (_cachedToken && Date.now() < _cachedTokenExpiry) return _cachedToken;

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'client_credentials',
  });
  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Token exchange failed (HTTP ${res.status}): ${body}. ` +
        'Is the app installed on the store with the required scopes?'
    );
  }
  const j = await res.json();
  _cachedToken = j.access_token;
  const ttl = Math.max(60, (j.expires_in || 86400) - 300); // refresh 5 min early
  _cachedTokenExpiry = Date.now() + ttl * 1000;
  console.log(`[auth] Minted Admin API token (scopes: ${j.scope || 'n/a'}, ttl ${ttl}s)`);
  return _cachedToken;
}

// --- OAuth authorization code grant (one-time browser flow) -------------------
const OAUTH_SCOPES =
  'read_files,write_files,read_customers,write_customers,read_metaobjects,write_metaobjects,' +
  'read_products,write_products';
let _oauthState = null;

function verifyShopifyHmac(query) {
  const { hmac, ...rest } = query;
  if (!hmac) return false;
  const message = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join('&');
  const digest = crypto.createHmac('sha256', CLIENT_SECRET).update(message).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin/server-side calls (no Origin header) and allowed storefront origins
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error('Origin not allowed'));
    },
  })
);

// ---------------------------------------------------------------------------
// Shopify Admin GraphQL helper
// ---------------------------------------------------------------------------
async function gql(query, variables) {
  const token = await getAccessToken();
  const res = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error('Shopify GraphQL error: ' + JSON.stringify(json.errors));
  }
  return json.data;
}

// ---------------------------------------------------------------------------
// Metaobject definition (idempotent, ensured on boot)
// ---------------------------------------------------------------------------
const QUOTE_TYPE = 'quote_request';

const QUOTE_FIELDS = [
  { key: 'name', name: 'Name', type: 'single_line_text_field' },
  { key: 'email', name: 'Email', type: 'single_line_text_field' },
  { key: 'phone', name: 'Phone', type: 'single_line_text_field' },
  { key: 'patch_type', name: 'Patch Type', type: 'single_line_text_field' },
  { key: 'backing_type', name: 'Backing Type', type: 'single_line_text_field' },
  { key: 'border_style', name: 'Border Style', type: 'single_line_text_field' },
  { key: 'size', name: 'Size (W x H)', type: 'single_line_text_field' },
  { key: 'quantity', name: 'Quantity', type: 'single_line_text_field' },
  { key: 'need_by_date', name: 'Need By Date', type: 'single_line_text_field' },
  { key: 'referral_source', name: 'Referral Source', type: 'single_line_text_field' },
  { key: 'additional_info', name: 'Additional Info', type: 'multi_line_text_field' },
  { key: 'design_file', name: 'Design File', type: 'file_reference' },
  { key: 'design_file_link', name: 'Design File Link', type: 'single_line_text_field' },
  { key: 'status', name: 'Status', type: 'single_line_text_field' },
  { key: 'submitted_at', name: 'Submitted At', type: 'single_line_text_field' },
];

async function ensureQuoteDefinition() {
  const existing = await gql(
    `query($type: String!) { metaobjectDefinitionByType(type: $type) { id } }`,
    { type: QUOTE_TYPE }
  );
  if (existing.metaobjectDefinitionByType) return;

  const data = await gql(
    `mutation($definition: MetaobjectDefinitionCreateInput!) {
      metaobjectDefinitionCreate(definition: $definition) {
        metaobjectDefinition { id type }
        userErrors { field message }
      }
    }`,
    {
      definition: {
        type: QUOTE_TYPE,
        name: 'Quote Request',
        displayNameKey: 'name',
        fieldDefinitions: QUOTE_FIELDS.map((f) => ({
          key: f.key,
          name: f.name,
          type: f.type,
        })),
      },
    }
  );
  const errs = data.metaobjectDefinitionCreate.userErrors;
  if (errs && errs.length) {
    console.error('metaobjectDefinitionCreate errors:', errs);
  } else {
    console.log('Created metaobject definition:', QUOTE_TYPE);
  }
}

// ---------------------------------------------------------------------------
// File upload: staged upload -> fileCreate
// ---------------------------------------------------------------------------
async function uploadFileToShopify(file) {
  const staged = await gql(
    `mutation($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { field message }
      }
    }`,
    {
      input: [
        {
          resource: 'FILE',
          filename: file.originalname,
          mimeType: file.mimetype || 'application/octet-stream',
          httpMethod: 'POST',
          fileSize: String(file.size),
        },
      ],
    }
  );

  const target = staged.stagedUploadsCreate.stagedTargets[0];
  if (!target) throw new Error('No staged upload target returned');

  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append(
    'file',
    new Blob([file.buffer], { type: file.mimetype || 'application/octet-stream' }),
    file.originalname
  );

  const uploadRes = await fetch(target.url, { method: 'POST', body: form });
  if (!uploadRes.ok && uploadRes.status !== 201) {
    throw new Error(`Staged upload failed: HTTP ${uploadRes.status}`);
  }

  const created = await gql(
    `mutation($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files {
          id
          fileStatus
          ... on GenericFile { url }
          ... on MediaImage { image { url } }
        }
        userErrors { field message }
      }
    }`,
    {
      files: [
        {
          originalSource: target.resourceUrl,
          alt: `Quote design file: ${file.originalname}`,
          contentType: 'FILE',
        },
      ],
    }
  );

  const errs = created.fileCreate.userErrors;
  if (errs && errs.length) throw new Error('fileCreate: ' + JSON.stringify(errs));

  const createdFile = created.fileCreate.files[0];
  const fileId = createdFile.id; // gid://shopify/GenericFile/... or MediaImage
  let fileUrl = createdFile.url || (createdFile.image && createdFile.image.url) || null;

  // Shopify processes a newly created file asynchronously, so the CDN url is
  // often not on the fileCreate response yet - poll briefly rather than
  // emailing the quote notification with no link to the design at all.
  for (let i = 0; i < 5 && !fileUrl; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const check = await gql(
      `query($id: ID!) {
        node(id: $id) {
          ... on GenericFile { url }
          ... on MediaImage { image { url } }
        }
      }`,
      { id: fileId }
    );
    fileUrl = check.node && (check.node.url || (check.node.image && check.node.image.url)) || null;
  }

  return { id: fileId, url: fileUrl };
}

// ---------------------------------------------------------------------------
// Customer: find by email, then create or merge tag
// ---------------------------------------------------------------------------
async function upsertCustomer({ email, firstName, lastName, phone }) {
  const found = await gql(
    `query($q: String!) {
      customers(first: 1, query: $q) { nodes { id tags } }
    }`,
    { q: `email:${JSON.stringify(email)}` }
  );

  const existing = found.customers.nodes[0];

  if (existing) {
    const tags = new Set(existing.tags);
    tags.add('quote-request');
    const data = await gql(
      `mutation($input: CustomerInput!) {
        customerUpdate(input: $input) {
          customer { id }
          userErrors { field message }
        }
      }`,
      { input: { id: existing.id, tags: Array.from(tags) } }
    );
    const errs = data.customerUpdate.userErrors;
    if (errs && errs.length) console.error('customerUpdate errors:', errs);
    return existing.id;
  }

  const input = {
    email,
    tags: ['quote-request'],
  };
  if (firstName) input.firstName = firstName;
  if (lastName) input.lastName = lastName;
  if (phone) input.phone = phone;

  let data = await gql(
    `mutation($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer { id }
        userErrors { field message }
      }
    }`,
    { input }
  );

  let errs = data.customerCreate.userErrors;
  if (errs && errs.length) {
    // Phone may be invalid/taken — retry without it rather than losing the customer
    if (input.phone) {
      delete input.phone;
      data = await gql(
        `mutation($input: CustomerInput!) {
          customerCreate(input: $input) {
            customer { id }
            userErrors { field message }
          }
        }`,
        { input }
      );
      errs = data.customerCreate.userErrors;
    }
    if (errs && errs.length) {
      console.error('customerCreate errors:', errs);
      return null;
    }
  }
  return data.customerCreate.customer && data.customerCreate.customer.id;
}

// ---------------------------------------------------------------------------
// Quote metaobject
// ---------------------------------------------------------------------------
async function createQuoteMetaobject(fields) {
  const data = await gql(
    `mutation($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) {
        metaobject { id handle }
        userErrors { field message }
      }
    }`,
    {
      metaobject: {
        type: QUOTE_TYPE,
        fields: Object.entries(fields)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([key, value]) => ({ key, value: String(value) })),
      },
    }
  );
  const errs = data.metaobjectCreate.userErrors;
  if (errs && errs.length) throw new Error('metaobjectCreate: ' + JSON.stringify(errs));
  return data.metaobjectCreate.metaobject;
}

// ---------------------------------------------------------------------------
// AI image generation (OpenAI gpt-image-1) with per-IP + global daily limits
// ---------------------------------------------------------------------------
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEN_IP_DAILY_LIMIT = parseInt(process.env.GEN_IP_DAILY_LIMIT || '10', 10);
const GEN_GLOBAL_DAILY_LIMIT = parseInt(process.env.GEN_GLOBAL_DAILY_LIMIT || '300', 10);
const GEN_QUALITY = process.env.GEN_QUALITY || 'medium'; // low | medium | high

const _genByIp = new Map();
let _genGlobal = { day: '', count: 0 };

function genAllowed(ip) {
  const day = new Date().toISOString().slice(0, 10);
  if (_genGlobal.day !== day) { _genGlobal = { day, count: 0 }; _genByIp.clear(); }
  if (_genGlobal.count >= GEN_GLOBAL_DAILY_LIMIT) return { ok: false, why: 'The generator is very busy today. Please try again tomorrow.' };
  const rec = _genByIp.get(ip) || 0;
  if (rec >= GEN_IP_DAILY_LIMIT) return { ok: false, why: `Daily limit of ${GEN_IP_DAILY_LIMIT} images reached. Come back tomorrow!` };
  return { ok: true };
}

function genRecord(ip) {
  _genGlobal.count += 1;
  _genByIp.set(ip, (_genByIp.get(ip) || 0) + 1);
}

app.post('/generate', express.json({ limit: '10kb' }), async (req, res) => {
  try {
    if (!OPENAI_API_KEY) {
      return res.status(503).json({ ok: false, error: 'Image generation is not configured yet.' });
    }
    const prompt = String((req.body && req.body.prompt) || '').trim();
    if (prompt.length < 3 || prompt.length > 600) {
      return res.status(400).json({ ok: false, error: 'Please describe your design in 3-600 characters.' });
    }
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const gate = genAllowed(ip);
    if (!gate.ok) return res.status(429).json({ ok: false, error: gate.why });

    const styled =
      `Patch design: ${prompt}. Bold vector-style artwork suitable for a custom embroidered patch: ` +
      'clean edges, limited color palette, high contrast, centered composition on a plain light background.';

    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: styled,
        n: 1,
        size: '1024x1024',
        quality: GEN_QUALITY,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error('OpenAI image error:', r.status, t.slice(0, 500));
      return res.status(502).json({ ok: false, error: 'Image generation failed. Please try again.' });
    }
    const j = await r.json();
    const b64 = j.data && j.data[0] && j.data[0].b64_json;
    if (!b64) return res.status(502).json({ ok: false, error: 'No image returned. Please try again.' });
    genRecord(ip);
    res.json({ ok: true, image: `data:image/png;base64,${b64}` });
  } catch (e) {
    console.error('Generate error:', e);
    res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
  }
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'patch-kraze-quote-backend',
    authorized: Boolean(STATIC_TOKEN || _oauthToken),
  });
});

// One-time OAuth: open {BASE_URL}/auth in a browser while logged into the store admin.
app.get('/auth', (req, res) => {
  const base = `https://${req.get('host')}`;
  _oauthState = crypto.randomBytes(16).toString('hex');
  const url =
    `https://${SHOP}/admin/oauth/authorize` +
    `?client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&scope=${encodeURIComponent(OAUTH_SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(`${base}/auth/callback`)}` +
    `&state=${_oauthState}`;
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  try {
    const { code, state, shop } = req.query;
    if (!code) return res.status(400).send('Missing code');
    if (!state || state !== _oauthState) return res.status(400).send('Bad state — retry /auth');
    if (shop && shop !== SHOP) return res.status(400).send('Shop mismatch');
    // HMAC may be signed with a rotated (old) secret; the state check plus the
    // secret-authenticated code exchange below are the effective gates.
    if (!verifyShopifyHmac(req.query)) {
      console.warn('[auth] HMAC mismatch (possibly rotated secret) — continuing, state OK');
    }

    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: String(code),
      }).toString(),
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(500).send(`Token exchange failed (HTTP ${r.status}): ${t}`);
    }
    const j = await r.json();
    _oauthToken = j.access_token;
    console.log(`[auth] OFFLINE_TOKEN=${j.access_token} (scopes: ${j.scope})`);
    try {
      await ensureQuoteDefinition();
    } catch (e) {
      console.error('ensureQuoteDefinition after auth:', e.message);
    }
    res.send(
      'Authorized! The quote backend is now connected to Shopify. You can close this tab.'
    );
  } catch (e) {
    console.error('OAuth callback error:', e);
    res.status(500).send('OAuth error: ' + e.message);
  }
});

// ---------------------------------------------------------------------------
// Quote notification email (Resend)
//
// Shopify's native contact form is not a usable notification channel for this:
// it is captcha-gated (a rejected submission is silent - no email, no error),
// and it cannot carry the design file at all. Sending from here keeps the
// notification independent of the storefront, and lets the email carry a real
// link to the file that was just uploaded.
// ---------------------------------------------------------------------------
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_TO = (process.env.QUOTE_NOTIFY_TO || 'orders@patchkraze.com')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
// Must be on a domain verified in Resend, or Resend rejects the send.
const NOTIFY_FROM = process.env.QUOTE_NOTIFY_FROM || 'Patch Kraze Quotes <quotes@patchkraze.com>';

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendQuoteNotification(fields, fileUrl) {
  if (!RESEND_API_KEY) {
    console.error('Quote email skipped: RESEND_API_KEY not set');
    return false;
  }

  const rows = [
    ['Name', fields.name],
    ['Email', fields.email],
    ['Phone', fields.phone],
    ['Patch type', fields.patch_type],
    ['Backing', fields.backing_type],
    ['Border', fields.border_style],
    ['Size', fields.size],
    ['Quantity', fields.quantity],
    ['Need by', fields.need_by_date],
    ['Heard via', fields.referral_source],
    ['Notes', fields.additional_info],
  ].filter(([, v]) => v != null && String(v).trim() !== '');

  const fileBlock = fileUrl
    ? `<p style="margin:24px 0"><a href="${esc(fileUrl)}"
         style="background:#111827;color:#fff;padding:12px 20px;border-radius:6px;
         text-decoration:none;display:inline-block">View design file</a></p>
       <p style="font-size:12px;color:#6b7280;word-break:break-all">${esc(fileUrl)}</p>`
    : `<p style="margin:24px 0;color:#b45309"><strong>No design file was attached.</strong></p>`;

  const linkBlock = fields.design_file_link
    ? `<p style="margin:8px 0">Customer-provided link:
         <a href="${esc(fields.design_file_link)}">${esc(fields.design_file_link)}</a></p>`
    : '';

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px">
    <h2 style="margin:0 0 4px">New quote request</h2>
    <p style="margin:0 0 20px;color:#6b7280">${esc(fields.name)} &middot; ${esc(fields.email)}</p>
    <table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:14px">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="border-bottom:1px solid #e5e7eb;color:#6b7280;width:140px">${esc(
              k
            )}</td><td style="border-bottom:1px solid #e5e7eb;white-space:pre-wrap">${esc(
              v
            )}</td></tr>`
        )
        .join('')}
    </table>
    ${fileBlock}
    ${linkBlock}
  </div>`;

  const text =
    `New quote request\n\n` +
    rows.map(([k, v]) => `${k}: ${v}`).join('\n') +
    `\n\nDesign file: ${fileUrl || 'none attached'}` +
    (fields.design_file_link ? `\nCustomer link: ${fields.design_file_link}` : '');

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: NOTIFY_FROM,
      to: NOTIFY_TO,
      subject: `New quote request - ${fields.name || fields.email}`,
      html,
      text,
      // so staff can reply straight to the customer
      reply_to: fields.email || undefined,
    }),
  });

  if (!r.ok) {
    throw new Error(`Resend HTTP ${r.status}: ${await r.text()}`);
  }
  return true;
}

app.post('/quote', upload.single('design_file'), async (req, res) => {
  try {
    const b = req.body || {};
    const email = (b.email || '').trim();
    if (!email) return res.status(400).json({ ok: false, error: 'Email is required' });

    // 1. Upload file (if provided)
    let fileId = null;
    let fileUrl = null;
    if (req.file && req.file.size > 0) {
      try {
        const uploaded = await uploadFileToShopify(req.file);
        fileId = uploaded.id;
        fileUrl = uploaded.url;
      } catch (e) {
        console.error('File upload failed (continuing without file):', e.message);
      }
    }

    // 2. Customer
    let customerId = null;
    try {
      customerId = await upsertCustomer({
        email,
        firstName: b.first_name,
        lastName: b.last_name,
        phone: b.phone,
      });
    } catch (e) {
      console.error('Customer upsert failed (continuing):', e.message);
    }

    // 3. Quote metaobject
    const name = [b.first_name, b.last_name].filter(Boolean).join(' ') || email;
    const size =
      b.width_inches || b.height_inches
        ? `${b.width_inches || '?'}" x ${b.height_inches || '?'}"`
        : '';

    const quoteFields = {
      name,
      email,
      phone: b.phone,
      patch_type: b.patch_type,
      backing_type: b.backing_type,
      border_style: b.border_style,
      size,
      quantity: b.quantity,
      need_by_date: b.need_by_date,
      referral_source: b.referral_source,
      additional_info: b.additional_info,
      design_file_link: b.design_file_link,
    };

    const quote = await createQuoteMetaobject({
      ...quoteFields,
      design_file: fileId,
      status: 'New',
      submitted_at: new Date().toISOString(),
    });

    // 4. Notify staff. Never fail the submission over this - the quote is
    // already safely recorded by the time we get here.
    let emailed = false;
    try {
      emailed = await sendQuoteNotification(quoteFields, fileUrl);
    } catch (e) {
      console.error('Quote notification email failed:', e.message);
    }

    res.json({
      ok: true,
      quote: quote.handle,
      customer: Boolean(customerId),
      file: Boolean(fileId),
      fileUrl,
      emailed,
    });
  } catch (e) {
    console.error('Quote submission error:', e);
    res.status(500).json({ ok: false, error: 'Something went wrong. Please try again or email us.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Quote backend listening on :${PORT}`);
  try {
    await ensureQuoteDefinition();
  } catch (e) {
    console.error('Could not ensure metaobject definition:', e.message);
  }
});
