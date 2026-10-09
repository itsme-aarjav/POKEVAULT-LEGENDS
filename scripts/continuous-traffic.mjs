import https from 'node:https';

const agent = new https.Agent({ keepAlive: true, maxSockets: 60, rejectUnauthorized: false });
const STOREFRONT_URL = 'https://k8s-pokevaul-pokevaul-e701e7b82d-2093600175.us-east-1.elb.amazonaws.com';

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
let isRunning = true;

process.on('SIGINT', () => { isRunning = false; process.exit(0); });
process.on('SIGTERM', () => { isRunning = false; process.exit(0); });

function sendRequest() {
  if (!isRunning) return;
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
  if (!isRunning) return;
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

console.log("⚡ LAUNCHING CONTINUOUS INDEFINITE TRAFFIC STORM (WILL RUN UNTIL STOPPED)...");

// 35 concurrent request workers
for (let i = 0; i < 35; i++) {
  sendRequest();
}
// 3 concurrent order creators
for (let i = 0; i < 3; i++) {
  sendOrder();
}

setInterval(() => {
  if (!isRunning) return;
  console.log(`[CONTINUOUS TRAFFIC ACTIVE] Sent: ${totalRequests} requests | Errors: ${errors} | Rate: ~100 req/sec`);
}, 5000);
