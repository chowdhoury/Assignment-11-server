# Boimela Server

A RESTful API server for a book marketplace application built with Node.js, Express, and MongoDB.

## Live Server

**Server URL:** [Add your Vercel deployment URL here]

## Features

- 🔐 User management with role-based access
- 📚 Book CRUD operations with visibility controls
- ❤️ Wishlist functionality
- 🛒 Order management system
- 💳 Stripe payment integration
- 📄 Invoice generation and tracking

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB
- **Payment:** Stripe
- **Deployment:** Vercel

## API Endpoints

### Users

- `GET /users` - Get all users
- `GET /users/:email` - Get user by email
- `POST /users` - Create new user
- `PATCH /users/:userId` - Update user role

### Books

- `GET /books` - Get public books (optional query: `?email=seller@email.com`)
- `GET /allbooks` - Get all books including private (optional query: `?email=seller@email.com`)
- `GET /books/:id` - Get book by ID
- `POST /books` - Add new book
- `PATCH /allbooks/:id` - Update book
- `DELETE /books/:id` - Delete book

### Wishlist

- `GET /wishlist` - Get wishlist items (queries: `?userEmail=`, `?bookId=`)
- `POST /wishlist` - Add to wishlist
- `DELETE /wishlist` - Remove from wishlist (queries: `?bookId=`, `?userEmail=`)

### Orders

- `GET /orders` - Get orders (queries: `?email=buyer@email.com`, `?seller=seller@email.com`)
- `POST /orders` - Create new order
- `PATCH /orders/:id` - Update order status

### Payments

- `POST /create-checkout-session` - Create Stripe checkout session
- `POST /payment-success` - Handle successful payment callback
- `GET /invoices` - Get payment invoices (query: `?buyerEmail=`)

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
CLIENT_URL=your_client_url
STRIPE_SECURITY_KEY=your_stripe_secret_key
```

## Installation

1. Clone the repository

```bash
git clone [repository-url]
cd server
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the server

```bash
npm start
```

## Dependencies

```json
{
  "express": "^4.x.x",
  "cors": "^2.x.x",
  "mongodb": "^6.x.x",
  "stripe": "^latest",
  "dotenv": "^16.x.x"
}
```

## Database Collections

- **users** - User accounts and roles
- **books** - Book listings
- **wishlist** - User wishlists
- **orders** - Order records
- **payments** - Payment transactions

## CORS Configuration

The server is configured with CORS to accept requests from the specified CLIENT_URL with credentials enabled.

## Error Handling

All endpoints with MongoDB ObjectId parameters include validation to prevent BSON errors. Invalid IDs return a 400 status with error message.

## Payment Flow

1. Client requests checkout session via `/create-checkout-session`
2. User completes payment on Stripe
3. Stripe redirects to success/cancel URL
4. Client sends session ID to `/payment-success`
5. Server verifies payment and updates order status
6. Payment record is stored in the payments collection

## Development

```bash
# Run with nodemon for hot reload
npm run dev
```

## Deployment

This project is configured for Vercel deployment. Push to your repository and connect to Vercel for automatic deployments.

