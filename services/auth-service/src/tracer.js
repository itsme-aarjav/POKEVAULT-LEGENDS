// OpenTelemetry distributed tracing and W3C context propagation

import crypto from 'crypto';

const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://tempo.monitoring.svc.cluster.local:4318/v1/traces';
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'auth-service';

const spanBuffer = [];
let flushTimer = null;

function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

function parseTraceparent(header) {
  if (!header || typeof header !== 'string') return null;
  const parts = header.trim().split('-');
  if (parts.length === 4 && parts[0] === '00' && parts[1].length === 32 && parts[2].length === 16) {
    return {
      traceId: parts[1],
      parentSpanId: parts[2],
      traceFlags: parts[3]
    };
  }
  return null;
}

function formatTraceparent(traceId, spanId) {
  return `00-${traceId}-${spanId}-01`;
}

function toUnixNano(date = new Date()) {
  const ms = date.getTime();
  return (BigInt(ms) * 1000000n).toString();
}

export function traceMiddleware(service = SERVICE_NAME) {
  return (req, res, next) => {
    const incoming = parseTraceparent(req.headers['traceparent']);
    const traceId = incoming ? incoming.traceId : randomHex(16);
    const parentSpanId = incoming ? incoming.parentSpanId : undefined;
    const spanId = randomHex(8);
    const startTime = new Date();
    const startNano = toUnixNano(startTime);

    req.traceId = traceId;
    req.spanId = spanId;
    req.traceparent = formatTraceparent(traceId, spanId);

    res.setHeader('traceparent', req.traceparent);
    res.setHeader('x-trace-id', traceId);

    res.on('finish', () => {
      const endNano = toUnixNano(new Date());
      const route = req.route ? req.route.path : req.path;
      const isError = res.statusCode >= 500;

      const span = {
        traceId,
        spanId,
        ...(parentSpanId ? { parentSpanId } : {}),
        name: `${req.method} ${route}`,
        kind: 2, // SPAN_KIND_SERVER
        startTimeUnixNano: startNano,
        endTimeUnixNano: endNano,
        attributes: [
          { key: 'http.method', value: { stringValue: req.method } },
          { key: 'http.target', value: { stringValue: req.originalUrl || req.url } },
          { key: 'http.route', value: { stringValue: route } },
          { key: 'http.status_code', value: { intValue: res.statusCode } },
          { key: 'service.name', value: { stringValue: service } }
        ],
        status: {
          code: isError ? 2 : 1,
          message: isError ? `HTTP ${res.statusCode}` : 'OK'
        }
      };

      queueSpan(span, service);
    });

    next();
  };
}

export function createChildSpan(parentReq, name, kind = 1, attributes = []) {
  const traceId = parentReq?.traceId || randomHex(16);
  const parentSpanId = parentReq?.spanId;
  const spanId = randomHex(8);
  const startNano = toUnixNano(new Date());

  return {
    traceId,
    spanId,
    traceparent: formatTraceparent(traceId, spanId),
    end: (statusOk = true, extraAttrs = []) => {
      const endNano = toUnixNano(new Date());
      const span = {
        traceId,
        spanId,
        ...(parentSpanId ? { parentSpanId } : {}),
        name,
        kind, // 1: INTERNAL, 3: CLIENT
        startTimeUnixNano: startNano,
        endTimeUnixNano: endNano,
        attributes: [
          ...attributes.map(a => ({ key: a.key, value: typeof a.value === 'number' ? { intValue: a.value } : { stringValue: String(a.value) } })),
          ...extraAttrs.map(a => ({ key: a.key, value: typeof a.value === 'number' ? { intValue: a.value } : { stringValue: String(a.value) } }))
        ],
        status: { code: statusOk ? 1 : 2 }
      };
      queueSpan(span, SERVICE_NAME);
    }
  };
}

function queueSpan(span, service) {
  spanBuffer.push({ span, service });
  if (spanBuffer.length >= 10) {
    flushSpans();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flushSpans, 1500);
  }
}

export async function flushSpans() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (spanBuffer.length === 0) return;

  const toSend = spanBuffer.splice(0, spanBuffer.length);
  const grouped = {};
  for (const item of toSend) {
    const s = item.service || SERVICE_NAME;
    if (!grouped[s]) grouped[s] = [];
    grouped[s].push(item.span);
  }

  for (const [service, spans] of Object.entries(grouped)) {
    const payload = {
      resourceSpans: [
        {
          resource: {
            attributes: [
              { key: 'service.name', value: { stringValue: service } },
              { key: 'telemetry.sdk.name', value: { stringValue: 'opentelemetry' } },
              { key: 'telemetry.sdk.language', value: { stringValue: 'nodejs' } }
            ]
          },
          scopeSpans: [
            {
              scope: { name: service, version: '1.0.0' },
              spans
            }
          ]
        }
      ]
    };

    try {
      await fetch(OTEL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3000)
      });
    } catch {
      // Non-blocking telemetry delivery
    }
  }
}
