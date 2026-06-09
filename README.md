# Druk Shopify — E-Commerce Backend (DBS302)

A production-grade e-commerce backend built with **Node.js/Express**, **MongoDB 7.0** (3-node replica set), and **Redis 7.2** (master + 2 replicas + Sentinel). Designed for the DBS302 Database Systems assignment.

---

## Live Demo 
https://drive.google.com/file/d/1RRCoojZvjjg438shQWAt_Yok-VQBUE_3/view?usp=sharing

## System Architecture Explained
https://drive.google.com/file/d/1343dDHIjM4jonQSNhX_cBLzHGHiiN105/view?usp=drive_link

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 + Express 5 |
| Primary DB | MongoDB 7.0 (3-node replica set) |
| Cache / Store | Redis 7.2 (Master + 2 Replicas + Sentinel) |
| ODM | Mongoose 9 |
| Auth | JWT (HS256) + bcrypt (12 rounds) |
| Containerisation | Docker + Docker Compose |

---

## Project Structure

```
drukshopify/
├── src/
│   ├── app.js                  # Express app setup
│   ├── server.js               # Entry point
│   ├── config/
│   │   ├── mongo.js            # MongoDB connection
│   │   └── redis.js            # Redis connection
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── productController.js
│   │   ├── cartController.js
│   │   ├── orderController.js
│   │   ├── realtimeController.js
│   │   ├── analyticsController.js
│   │   └── reviewController.js
│   ├── middleware/
│   │   ├── auth.js             # JWT protect + optionalAuth + restrictTo
│   │   ├── rateLimiter.js      # Redis-based rate limiter
│   │   └── guestId.js          # Guest cart UUID middleware
│   ├── models/
│   │   ├── User.js
│   │   ├── Category.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   ├── Inventory.js
│   │   └── Review.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── products.js
│   │   ├── cart.js
│   │   ├── orders.js
│   │   ├── realtime.js
│   │   ├── analytics.js
│   │   └── reviews.js
│   └── services/
│       └── redisService.js     # Redis utility wrapper
├── scripts/
│   └── seed.js                 # Seed 50 products, 10 users, 20 orders
├── docker/
│   ├── mongo/
│   │   ├── keyfile             # Shared keyfile for replica set auth
│   │   └── init-replica.js
│   └── redis/
│       └── sentinel.conf       # Redis Sentinel configuration
├── docker-compose.yml
├── .env.example
├── report.md
└── package.json
```

---

## Local Setup

### Prerequisites

- Docker and Docker Compose
- Node.js 20+
- `redis-tools` (`sudo apt install redis-tools`)

### Steps

**1. Clone the repository**
```bash
git clone <your-repo-url>
cd drukshopify
```

**2. Set up environment variables**
```bash
cp .env.example .env
# Edit .env and set a strong JWT_SECRET
```

**3. Add MongoDB hostnames to /etc/hosts**
```bash
echo "127.0.0.1 mongo1 mongo2 mongo3" | sudo tee -a /etc/hosts
```

**4. Stop any local MongoDB if running**
```bash
sudo systemctl stop mongod
```

**5. Start all containers**
```bash
docker compose up -d
docker compose ps   # verify all 7 containers are Up
```

**6. Initialize the MongoDB replica set** (first time only)
```bash
docker exec mongo1 mongosh -u admin -p password --authenticationDatabase admin --eval '
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017", priority: 2 },
    { _id: 1, host: "mongo2:27017", priority: 1 },
    { _id: 2, host: "mongo3:27017", priority: 1 }
  ]
})'
```

Wait ~5 seconds, then verify:
```bash
docker exec mongo1 mongosh -u admin -p password --authenticationDatabase admin \
  --eval 'rs.status().members.map(m => ({name: m.name, state: m.stateStr}))'
# Expected: PRIMARY on mongo1, SECONDARY on mongo2 and mongo3
```

**7. Configure Redis eviction policy**
```bash
redis-cli -h localhost -p 6380 -a redispassword CONFIG SET maxmemory 256mb
redis-cli -h localhost -p 6380 -a redispassword CONFIG SET maxmemory-policy allkeys-lru
```

**8. Install Node.js dependencies**
```bash
npm install
```

**9. Seed the database**
```bash
npm run seed
# Creates: 3 categories, 50 products, 10 users, 20 orders
```

**10. Start the development server**
```bash
npm run dev
# Server running on http://localhost:3000
```

---

## Seeded Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@druk.com | Password123 |
| Seller | seller@druk.com | Password123 |
| Customer | karma@druk.com | Password123 |

---

## API Documentation

Base URL: `http://localhost:3000/api`

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register a new user |
| POST | `/auth/login` | No | Login (rate limited: 5/min per IP) |
| POST | `/auth/logout` | JWT | Logout (deletes Redis session) |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/profile` | JWT | Get own profile with wishlist |
| PATCH | `/users/profile` | JWT | Update name, addresses, payment prefs |
| POST | `/users/wishlist/:productId` | JWT | Add product to wishlist |
| DELETE | `/users/wishlist/:productId` | JWT | Remove product from wishlist |
| GET | `/users` | Admin | List all users |

### Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/products` | No | List products (search, filter, paginate) |
| GET | `/products/:id` | No | Get product (Redis cache-aside) |
| POST | `/products` | Seller/Admin | Create product + inventory records |
| PATCH | `/products/:id` | Seller/Admin | Update product + invalidate cache |

**Query parameters for GET /products:**
- `search` — full-text search on name, description, tags
- `category` — filter by category ObjectId
- `minPrice` / `maxPrice` — price range filter
- `sort` — e.g. `-createdAt`, `basePrice`
- `page` / `limit` — pagination

### Cart

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/cart` | Optional JWT | Get cart (user or guest) |
| POST | `/cart` | Optional JWT | Add item to cart |
| PUT | `/cart` | Optional JWT | Update item quantity |
| DELETE | `/cart` | Optional JWT | Clear entire cart |

> For guest carts, send `X-Guest-ID: <uuid>` header to persist across requests.

### Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/orders` | JWT | Place order (ACID transaction) |
| GET | `/orders/my` | JWT | Get own order history |
| PATCH | `/orders/:id/status` | Seller/Admin | Update order status |

### Real-Time Features

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/realtime/trending` | No | Top 10 trending products (Sorted Set) |
| GET | `/realtime/recently-viewed` | JWT | Last 10 viewed products (List) |
| GET | `/realtime/unique-visitors/:id` | No | Unique visitor count (HyperLogLog) |
| GET | `/realtime/leaderboard/sellers` | No | Top sellers leaderboard (Sorted Set) |

### Analytics (Admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/analytics/revenue/monthly` | Admin | Monthly revenue aggregation |
| GET | `/analytics/products/top` | Admin | Top 10 products by revenue |
| GET | `/analytics/inventory/low` | Admin | Low stock alert report |

### Reviews

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/reviews/products/:productId` | No | Get paginated reviews for a product |
| POST | `/reviews/products/:productId` | JWT | Submit a review |
| DELETE | `/reviews/:id` | JWT | Delete own review |

---

## Key Verification Commands

### MongoDB
```bash
# Replica set health
docker exec mongo1 mongosh -u admin -p password --authenticationDatabase admin \
  --eval 'rs.status().members.map(m => ({name: m.name, state: m.stateStr}))'

# List indexes on products
docker exec mongo1 mongosh -u admin -p password --authenticationDatabase admin xyzshope \
  --eval 'db.products.getIndexes()'

# Query profiling
docker exec mongo1 mongosh -u admin -p password --authenticationDatabase admin xyzshope \
  --eval 'db.products.find({ $text: { $search: "laptop" } }).explain("executionStats")'
```

### Redis
```bash
# Replication status
redis-cli -h localhost -p 6380 -a redispassword INFO replication

# Cache hit ratio
redis-cli -h localhost -p 6380 -a redispassword INFO stats | grep keyspace

# Persistence config
redis-cli -h localhost -p 6380 -a redispassword CONFIG GET appendonly
redis-cli -h localhost -p 6380 -a redispassword CONFIG GET appendfsync

# View trending leaderboard
redis-cli -h localhost -p 6380 -a redispassword ZREVRANGE trending:products 0 9 WITHSCORES

# View a user session
redis-cli -h localhost -p 6380 -a redispassword HGETALL session:<userId>
```

---

## Running Tests

```bash
npm test
```

---

## License

MIT
