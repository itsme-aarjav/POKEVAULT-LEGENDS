/**
 * POKÉVAULT LEGENDS — Server-Side PayPal Gateway & Payment Verification Service
 * Handles authenticated OAuth2 communication with PayPal REST API v2,
 * strict state-machine validation, currency/amount verification, and post-capture reconciliation.
 */

// Explicit Payment States
export const PAYMENT_STATES = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

export const ORDER_STATES = {
  PENDING_PAYMENT: 'pending_payment',
  RECEIVED: 'received',
  PROCESSING: 'processing',
  DISPATCHED: 'dispatched',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  FAILED: 'failed'
};

/**
 * Validates payment state transitions according to strict financial integrity rules (PV-008).
 * A completed payment is immutable. A pending or failed payment can only transition to completed
 * upon genuine server-verified capture.
 */
export function validatePaymentStateTransition(currentStatus, newStatus) {
  const current = (currentStatus || PAYMENT_STATES.PENDING).toLowerCase();
  const target = (newStatus || '').toLowerCase();

  const validStatuses = Object.values(PAYMENT_STATES);
  if (!validStatuses.includes(target)) {
    return {
      valid: false,
      error: `Invalid target payment status "${newStatus}". Must be one of: ${validStatuses.join(', ')}`
    };
  }

  // Idempotent no-op
  if (current === target) {
    return { valid: true, noop: true };
  }

  // Completed payments are immutable — cannot transition to pending or failed
  if (current === PAYMENT_STATES.COMPLETED) {
    return {
      valid: false,
      error: `Illegal state transition: Payment is already "${PAYMENT_STATES.COMPLETED}" and cannot be transitioned to "${target}".`
    };
  }

  // From pending: can move to completed or failed
  if (current === PAYMENT_STATES.PENDING) {
    if (target === PAYMENT_STATES.COMPLETED || target === PAYMENT_STATES.FAILED) {
      return { valid: true };
    }
  }

  // From failed: can transition to pending (retry) or completed (successful retry capture)
  if (current === PAYMENT_STATES.FAILED) {
    if (target === PAYMENT_STATES.PENDING || target === PAYMENT_STATES.COMPLETED) {
      return { valid: true };
    }
  }

  return {
    valid: false,
    error: `Illegal payment state transition from "${current}" to "${target}".`
  };
}

/**
 * Checks if PayPal credentials are configured
 */
export function isPayPalConfigured(clientId, clientSecret) {
  return Boolean(
    clientId &&
    typeof clientId === 'string' &&
    clientId.trim() &&
    clientSecret &&
    typeof clientSecret === 'string' &&
    clientSecret.trim() &&
    !clientId.includes('your-paypal')
  );
}

// In-memory token cache
let tokenCache = {
  token: null,
  expiresAt: 0
};

/**
 * Retrieves OAuth2 Bearer token from PayPal v1/oauth2/token (Fail-closed if unconfigured)
 */
export async function getPayPalAccessToken(options = {}) {
  const clientId = options.clientId || process.env.PAYPAL_CLIENT_ID;
  const clientSecret = options.clientSecret || process.env.PAYPAL_CLIENT_SECRET;
  const apiBaseUrl = options.apiBaseUrl || (
    (process.env.PAYPAL_ENVIRONMENT || 'sandbox').toLowerCase() === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com'
  );
  const fetchFn = options.fetchFn || globalThis.fetch;

  if (!isPayPalConfigured(clientId, clientSecret)) {
    return null; // Fail-closed
  }

  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt > now + 60000 && !options.forceRefresh) {
    return tokenCache.token;
  }

  const credentials = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');
  const res = await fetchFn(`${apiBaseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`PayPal OAuth authentication failed with HTTP ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  if (!data || !data.access_token) {
    throw new Error('PayPal OAuth response did not contain an access_token');
  }

  tokenCache = {
    token: data.access_token,
    expiresAt: now + ((data.expires_in || 3600) * 1000)
  };

  return data.access_token;
}

/**
 * Creates an authoritative PayPal order via PayPal v2 API
 */
export async function createPayPalServerOrder({
  totalAmount,
  subtotal,
  insuranceCost,
  discountAmount,
  currency = 'USD',
  options = {}
}) {
  let token;
  try {
    token = await getPayPalAccessToken(options);
  } catch (authErr) {
    return {
      success: false,
      status: 502,
      error: `PayPal gateway authorization error: ${authErr.message}`
    };
  }

  if (!token) {
    return {
      success: false,
      unconfigured: true,
      error: 'PayPal credentials not configured on server'
    };
  }


  const apiBaseUrl = options.apiBaseUrl || (
    (process.env.PAYPAL_ENVIRONMENT || 'sandbox').toLowerCase() === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com'
  );
  const fetchFn = options.fetchFn || globalThis.fetch;

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: `PV-${Date.now()}`,
        description: 'PokéVault Legends Collectibles Order',
        amount: {
          currency_code: currency,
          value: Number(totalAmount).toFixed(2),
          breakdown: {
            item_total: { currency_code: currency, value: Number(subtotal).toFixed(2) },
            shipping: { currency_code: currency, value: Number(insuranceCost).toFixed(2) },
            discount: { currency_code: currency, value: Number(discountAmount).toFixed(2) }
          }
        }
      }
    ]
  };

  const res = await fetchFn(`${apiBaseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      status: res.status,
      error: data.message || 'PayPal order creation rejected'
    };
  }

  return {
    success: true,
    orderId: data.id,
    status: data.status
  };
}

/**
 * Captures an authorized PayPal order via PayPal v2 API
 */
export async function capturePayPalServerOrder({
  paypalOrderId,
  options = {}
}) {
  if (!paypalOrderId || typeof paypalOrderId !== 'string') {
    return { success: false, error: 'Invalid PayPal order identifier' };
  }

  let token;
  try {
    token = await getPayPalAccessToken(options);
  } catch (authErr) {
    return {
      success: false,
      status: 502,
      error: `PayPal gateway authorization error: ${authErr.message}`
    };
  }

  if (!token) {
    return {
      success: false,
      unconfigured: true,
      error: 'PayPal credentials not configured on server'
    };
  }

  const apiBaseUrl = options.apiBaseUrl || (
    (process.env.PAYPAL_ENVIRONMENT || 'sandbox').toLowerCase() === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com'
  );
  const fetchFn = options.fetchFn || globalThis.fetch;

  const res = await fetchFn(`${apiBaseUrl}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      status: res.status,
      error: data.details?.[0]?.description || data.message || 'PayPal capture failed',
      raw: data
    };
  }


  return {
    success: true,
    data
  };
}

/**
 * Fetches order details from PayPal for verification or reconciliation
 */
export async function fetchPayPalOrderDetails({
  paypalOrderId,
  options = {}
}) {
  if (!paypalOrderId || typeof paypalOrderId !== 'string') {
    return { success: false, error: 'Invalid PayPal order identifier' };
  }

  let token;
  try {
    token = await getPayPalAccessToken(options);
  } catch (authErr) {
    return {
      success: false,
      status: 502,
      error: `PayPal gateway authorization error: ${authErr.message}`
    };
  }

  if (!token) {
    return {
      success: false,
      unconfigured: true,
      error: 'PayPal credentials not configured on server'
    };
  }


  const apiBaseUrl = options.apiBaseUrl || (
    (process.env.PAYPAL_ENVIRONMENT || 'sandbox').toLowerCase() === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com'
  );
  const fetchFn = options.fetchFn || globalThis.fetch;

  const res = await fetchFn(`${apiBaseUrl}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      status: res.status,
      error: data.message || 'Failed to fetch PayPal order details'
    };
  }

  return {
    success: true,
    data
  };
}

/**
 * Authoritatively verifies captured payment details against intended order financial totals (PV-008).
 * Never trusts client claims. Verifies capture status === 'COMPLETED', currency === 'USD', and amount.
 */
export function verifyPayPalCapture({
  captureResponse,
  expectedTotalAmount,
  expectedCurrency = 'USD'
}) {
  if (!captureResponse || typeof captureResponse !== 'object') {
    return { verified: false, reason: 'Invalid or missing capture response object' };
  }

  // PayPal capture object may be in purchase_units[0].payments.captures[0] or top-level capture
  let capture = null;
  const purchaseUnit = captureResponse.purchase_units?.[0];
  if (purchaseUnit?.payments?.captures?.length > 0) {
    capture = purchaseUnit.payments.captures[0];
  } else if (captureResponse.id && captureResponse.status) {
    capture = captureResponse;
  }

  if (!capture) {
    return {
      verified: false,
      reason: 'No completed capture record found in provider response'
    };
  }

  const captureStatus = (capture.status || '').toUpperCase();
  if (captureStatus !== 'COMPLETED') {
    return {
      verified: false,
      reason: `Provider capture status is "${captureStatus}", expected "COMPLETED"`,
      captureStatus
    };
  }

  const currency = capture.amount?.currency_code || '';
  if (currency.toUpperCase() !== expectedCurrency.toUpperCase()) {
    return {
      verified: false,
      reason: `Provider currency mismatch: captured "${currency}", expected "${expectedCurrency}"`,
      currency
    };
  }

  const capturedVal = Number(capture.amount?.value);
  const expectedVal = Number(expectedTotalAmount);
  if (!Number.isFinite(capturedVal) || !Number.isFinite(expectedVal)) {
    return {
      verified: false,
      reason: 'Invalid captured or expected financial amount value'
    };
  }

  // Floating point precision check: difference must be < 1 cent
  if (Math.abs(capturedVal - expectedVal) >= 0.01) {
    return {
      verified: false,
      reason: `Captured amount mismatch: provider captured $${capturedVal.toFixed(2)}, expected $${expectedVal.toFixed(2)}`,
      capturedAmount: capturedVal,
      expectedAmount: expectedVal
    };
  }

  return {
    verified: true,
    captureId: capture.id,
    status: 'COMPLETED',
    amount: capturedVal,
    currency
  };
}
