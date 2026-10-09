# Services Directory

This directory contains the source code for all microservices in the PokeVault application.

---

## Service Overview

| Service | Technology | Port | Purpose |
| :--- | :--- | :--- | :--- |
| `frontend` | Nginx, HTML5, CSS3, JavaScript | 80 | Web store interface and reverse proxy for backend APIs |
| `auth-service` | Node.js, Express | 5001 | Admin login, authentication, and token verification |
| `catalog-service` | Node.js, Express, Redis | 5002 | Product listings, card details, and inventory search with Redis caching |
| `order-service` | Node.js, Express, MySQL | 5003 | Cart checkout, verified inter-service pricing, and saving orders to MySQL |
| `db` | MySQL 8.0 Schema | 3306 | Database table definitions and seed schema for MySQL |

---

## Service Communication

1. The user opens the web store in their browser through the Nginx frontend.
2. The frontend forwards requests:
   * `/api/auth/*` requests go to `auth-service:5001`
   * `/api/products` requests go to `catalog-service:5002`
   * `/api/orders` requests go to `order-service:5003`
3. The catalog service checks Redis first. If the item is cached, it returns instantly. If not, it reads from MySQL and saves to Redis for future requests.
4. The order service writes completed purchases directly into MySQL.

---

## Container Security Standards

Every service follows basic container security practices:
* **Minimal Base Images:** Built with Alpine Linux to keep image sizes small.
* **Non-Root User:** Containers run as regular users (`USER node` or `USER appuser`) instead of root.
* **Health Checks:** Each container has a health check probing `/health` so Kubernetes knows when the service is ready.
