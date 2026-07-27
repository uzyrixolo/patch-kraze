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

// --- Access token management (client credentials grant) ---------------------
let _cachedToken = null;
let _cachedTokenExpiry = 0;

async function getAccessToken() {
  if (STATIC_TOKEN) return STATIC_TOKEN;
  if (_cachedToken && Date.now() < _cachedTokenExpiry) return _cachedToken;

  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
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
        files { id fileStatus }
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
  return created.fileCreate.files[0].id; // gid://shopify/GenericFile/... or MediaImage
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
// Routes
// ---------------------------------------------------------------------------
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'patch-kraze-quote-backend' });
});

app.post('/quote', upload.single('design_file'), async (req, res) => {
  try {
    const b = req.body || {};
    const email = (b.email || '').trim();
    if (!email) return res.status(400).json({ ok: false, error: 'Email is required' });

    // 1. Upload file (if provided)
    let fileId = null;
    if (req.file && req.file.size > 0) {
      try {
        fileId = await uploadFileToShopify(req.file);
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

    const quote = await createQuoteMetaobject({
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
      design_file: fileId,
      design_file_link: b.design_file_link,
      status: 'New',
      submitted_at: new Date().toISOString(),
    });

    res.json({ ok: true, quote: quote.handle, customer: Boolean(customerId), file: Boolean(fileId) });
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
