import https from 'node:https';

const agent = new https.Agent({ keepAlive: true, maxSockets: 50, rejectUnauthorized: false });
const STOREFRONT_URL = 'https://k8s-pokevaul-pokevaul-e701e7b82d-2093600175.us-east-1.elb.amazonaws.com';
const DURATION_MS = 180 * 1000; // 3 minutes

const END_TIME = Date.now() + DURATION_MS;
const endpoints = [
  '/api/products?trending=true',
  '/api/products/charizard-base-1st',
  '/api/products?category=vintage',
  '/api/products?category=modern',
  '/api/auth/verify',
  '/health',
  '/'
];

let totalRequests = 0;
let errors = 0;

function sendRequest() {
  if (Date.now() >= END_TIME) return;
  const path = endpoints[Math.floor(Math.random() * endpoints.length)];
  const req = https.get(`${STOREFRONT_URL}${path}`, { agent, timeout: 5000 }, (res) => {
    res.resume();
    totalRequests++;
    setTimeout(sendRequest, 30);
  });
  req.on('error', () => {
    errors++;
    setTimeout(sendRequest, 50);
  });
}

function sendOrder() {
  if (Date.now() >= END_TIME) return;
  const postData = JSON.stringify({
    customerName: "Storm Collector",
    customerEmail: "storm@pokevault.com",
    items: [{ id: "charizard-base-1st", name: "Charizard", price: 4850, qty: 1 }]
  });

  const req = https.request(`${STOREFRONT_URL}/api/orders`, {
    method: 'POST',
    agent,
    timeout: 5000,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, (res) => {
    res.resume();
    totalRequests++;
    setTimeout(sendOrder, 1500);
  });
  req.on('error', () => {
    setTimeout(sendOrder, 2000);
  });
  req.write(postData);
  req.end();
}

console.log("⚡ STARTING HIGH-EFFICIENCY NODE LOAD TEST (3 MINUTES)...");
// 30 parallel concurrent persistent connections
for (let i = 0; i < 30; i++) {
  sendRequest();
}
// 3 parallel continuous order creators
for (let i = 0; i < 3; i++) {
  sendOrder();
}

const interval = setInterval(() => {
  const remaining = Math.max(0, Math.round((END_TIME - Date.now()) / 1000));
  console.log(`[TRAFFIC RUNNING] Sent: ${totalRequests} requests | Errors: ${errors} | Remaining: ${remaining}s`);
  if (Date.now() >= END_TIME) {
    clearInterval(interval);
    console.log("✅ Load test successfully finished.");
  }
}, 5000);
