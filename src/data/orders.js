/**
 * POKÉVAULT LEGENDS — Master Shared Orders Dataset (India Edition)
 * Provides a unified source of truth for Orders, Analytics, Customer CRM, and Indian Logistics.
 */
export const INITIAL_ORDERS = [
  {
    id: 'ord_1001',
    order_id: 'PV-IN-89412',
    customer_name: 'Aarav Sharma',
    customer_email: 'aarav.sharma@gmail.com',
    shipping_address: 'Flat 402, Sea Green Apts, Worli, Mumbai, Maharashtra 400018',
    total_amount: 14500.00,
    subtotal: 12288.14,
    discount_amount: 0.00,
    gst_amount: 2211.86,
    shipping_cost: 0.00,
    status: 'Delivered',
    payment_method: 'UPI (PhonePe)',
    payment_status: 'COMPLETED',
    tracking_number: 'BLUEDART: 7894561230',
    created_at: '2026-08-19T11:30:00.000Z',
    items: [
      { card_name: '1st Edition Shadowless Charizard Holo PSA 10', selectedSize: null, quantity: 1, unit_price: 14500.00 }
    ]
  },
  {
    id: 'ord_1002',
    order_id: 'PV-IN-89413',
    customer_name: 'Priya Patel',
    customer_email: 'priya.patel@ahmedabad.in',
    shipping_address: 'B-12 Sheetal Park, Satellite, Ahmedabad, Gujarat 380015',
    total_amount: 5499.00,
    subtotal: 4660.17,
    discount_amount: 500.00,
    gst_amount: 838.83,
    shipping_cost: 0.00,
    status: 'In Transit',
    payment_method: 'UPI (Google Pay)',
    payment_status: 'COMPLETED',
    tracking_number: 'DELHIVERY: DEL987654321',
    created_at: '2026-08-19T09:15:00.000Z',
    items: [
      { card_name: 'Pikachu Cyberpunk LED Neon Wall Artifact', selectedSize: null, quantity: 1, unit_price: 5999.00 }
    ]
  },
  {
    id: 'ord_1003',
    order_id: 'PV-IN-89414',
    customer_name: 'Rohan Verma',
    customer_email: 'rohan.v@techbengaluru.co',
    shipping_address: 'Tower 4, Prestige Palms, Whitefield, Bengaluru, Karnataka 560066',
    total_amount: 8990.00,
    subtotal: 7618.64,
    discount_amount: 0.00,
    gst_amount: 1371.36,
    shipping_cost: 0.00,
    status: 'Processing',
    payment_method: 'Razorpay (HDFC NetBanking)',
    payment_status: 'COMPLETED',
    tracking_number: 'BLUEDART: 4561237890',
    created_at: '2026-08-18T16:00:00.000Z',
    items: [
      { card_name: 'Gengar Shadow Haunt Streetwear Hoodie', selectedSize: 'XL', quantity: 2, unit_price: 4495.00 }
    ]
  },
  {
    id: 'ord_1004',
    order_id: 'PV-IN-89415',
    customer_name: 'Ananya Iyer',
    customer_email: 'ananya.iyer@chennai.org',
    shipping_address: '14/2 Karpagam Ave, R.A. Puram, Chennai, Tamil Nadu 600028',
    total_amount: 3299.00,
    subtotal: 2795.76,
    discount_amount: 0.00,
    gst_amount: 503.24,
    shipping_cost: 0.00,
    status: 'Processing',
    payment_method: 'UPI (Paytm)',
    payment_status: 'COMPLETED',
    tracking_number: null,
    created_at: '2026-08-18T14:20:00.000Z',
    items: [
      { card_name: 'Mew Radiant Glow Acrylic Crystal Lamp', selectedSize: null, quantity: 1, unit_price: 3299.00 }
    ]
  },
  {
    id: 'ord_1005',
    order_id: 'PV-IN-89416',
    customer_name: 'Vikram Malhotra',
    customer_email: 'vikram.m@delhicapital.in',
    shipping_address: 'House 88, Vasant Vihar, New Delhi, Delhi 110057',
    total_amount: 45000.00,
    subtotal: 38135.59,
    discount_amount: 0.00,
    gst_amount: 6864.41,
    shipping_cost: 0.00,
    status: 'Payment Settled',
    payment_method: 'UPI (Cred)',
    payment_status: 'COMPLETED',
    tracking_number: 'BLUEDART: 9988776655',
    created_at: '2026-08-17T18:45:00.000Z',
    items: [
      { card_name: 'Rayquaza Gold Star PSA 9 Mint 2005 EX Deoxys', selectedSize: null, quantity: 1, unit_price: 45000.00 }
    ]
  },
  {
    id: 'ord_1006',
    order_id: 'PV-IN-89417',
    customer_name: 'Sneha Kulkarni',
    customer_email: 'sneha.k@pune.co.in',
    shipping_address: '404 Koregaon Park Annex, Pune, Maharashtra 411001',
    total_amount: 2499.00,
    subtotal: 2117.80,
    discount_amount: 0.00,
    gst_amount: 381.20,
    shipping_cost: 0.00,
    status: 'Delivered',
    payment_method: 'Cash on Delivery (COD)',
    payment_status: 'COMPLETED',
    tracking_number: 'DTDC: D99881122',
    created_at: '2026-08-17T11:10:00.000Z',
    items: [
      { card_name: 'Snorlax Plush Heavyweight Sleep Companion', selectedSize: null, quantity: 1, unit_price: 2499.00 }
    ]
  },
  {
    id: 'ord_1007',
    order_id: 'PV-IN-89418',
    customer_name: 'Arjun Singhania',
    customer_email: 'arjun.s@kolkata.net',
    shipping_address: '7B Alipore Road, Kolkata, West Bengal 700027',
    total_amount: 18500.00,
    subtotal: 15677.97,
    discount_amount: 1000.00,
    gst_amount: 2822.03,
    shipping_cost: 0.00,
    status: 'Delivered',
    payment_method: 'UPI (Google Pay)',
    payment_status: 'COMPLETED',
    tracking_number: 'BLUEDART: 1122334455',
    created_at: '2026-08-16T15:30:00.000Z',
    items: [
      { card_name: 'Mewtwo Strikes Back Armored Scale Figure', selectedSize: null, quantity: 1, unit_price: 19500.00 }
    ]
  },
  {
    id: 'ord_1008',
    order_id: 'PV-IN-89419',
    customer_name: 'Kavita Reddy',
    customer_email: 'kavita.reddy@hyderabad.in',
    shipping_address: 'Villa 12, Jubilee Hills, Hyderabad, Telangana 500033',
    total_amount: 7200.00,
    subtotal: 6101.69,
    discount_amount: 0.00,
    gst_amount: 1098.31,
    shipping_cost: 0.00,
    status: 'Shipped',
    payment_method: 'UPI (PhonePe)',
    payment_status: 'COMPLETED',
    tracking_number: 'DELHIVERY: DEL554433221',
    created_at: '2026-08-16T09:40:00.000Z',
    items: [
      { card_name: 'Lucario Aura Sphere Combat Resin Diorama', selectedSize: null, quantity: 1, unit_price: 7200.00 }
    ]
  },
  {
    id: 'ord_1009',
    order_id: 'PV-IN-89420',
    customer_name: 'Aditya Roy',
    customer_email: 'aditya.roy@jaipur.co',
    shipping_address: '22 Civil Lines, Jaipur, Rajasthan 302006',
    total_amount: 4999.00,
    subtotal: 4236.44,
    discount_amount: 0.00,
    gst_amount: 762.56,
    shipping_cost: 0.00,
    status: 'Processing',
    payment_method: 'Razorpay (ICICI NetBanking)',
    payment_status: 'COMPLETED',
    tracking_number: null,
    created_at: '2026-08-15T18:00:00.000Z',
    items: [
      { card_name: 'Umbreon Moonlight Heavy Embroidered Bomber Jacket', selectedSize: 'L', quantity: 1, unit_price: 4999.00 }
    ]
  },
  {
    id: 'ord_1010',
    order_id: 'PV-IN-89421',
    customer_name: 'Tanvi Deshmukh',
    customer_email: 'tanvi.d@nagpur.in',
    shipping_address: 'Plot 55, Ramdaspeth, Nagpur, Maharashtra 440010',
    total_amount: 3499.00,
    subtotal: 2965.25,
    discount_amount: 0.00,
    gst_amount: 533.75,
    shipping_cost: 0.00,
    status: 'Delivered',
    payment_method: 'UPI (Paytm)',
    payment_status: 'COMPLETED',
    tracking_number: 'BLUEDART: 6677889900',
    created_at: '2026-08-15T12:15:00.000Z',
    items: [
      { card_name: 'Eevee Evolution Collector Stainless Steel Tumbler', selectedSize: null, quantity: 1, unit_price: 3499.00 }
    ]
  },
  {
    id: 'ord_1011',
    order_id: 'PV-IN-89422',
    customer_name: 'Nikhil Chawla',
    customer_email: 'nikhil.c@chandigarh.org',
    shipping_address: 'House 1204, Sector 8-C, Chandigarh 160009',
    total_amount: 12500.00,
    subtotal: 10593.22,
    discount_amount: 0.00,
    gst_amount: 1906.78,
    shipping_cost: 0.00,
    status: 'Delivered',
    payment_method: 'UPI (Google Pay)',
    payment_status: 'COMPLETED',
    tracking_number: 'DELHIVERY: DEL112244668',
    created_at: '2026-08-14T17:00:00.000Z',
    items: [
      { card_name: 'Gengar Heavyweight Ghost Shadow Tapestry Blanket', selectedSize: null, quantity: 1, unit_price: 12500.00 }
    ]
  },
  {
    id: 'ord_1012',
    order_id: 'PV-IN-89423',
    customer_name: 'Meera Nambiar',
    customer_email: 'meera.nambiar@kochi.in',
    shipping_address: 'Flat 3A, Marine Drive, Kochi, Kerala 682011',
    total_amount: 6890.00,
    subtotal: 5838.98,
    discount_amount: 0.00,
    gst_amount: 1051.02,
    shipping_cost: 0.00,
    status: 'Delivered',
    payment_method: 'UPI (PhonePe)',
    payment_status: 'COMPLETED',
    tracking_number: 'SPEEDPOST: SP99887766IN',
    created_at: '2026-08-14T10:30:00.000Z',
    items: [
      { card_name: 'Charizard Flame Burst Backpack', selectedSize: null, quantity: 1, unit_price: 6890.00 }
    ]
  }
];
