# Farmer Marketplace Backend

A Node.js Express backend API for a Farmer Marketplace application with MongoDB database.

## Features

- User authentication (register, login)
- JWT-based authentication
- Role-based access control (farmer, buyer, admin)
- RESTful API architecture
- Modular project structure

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **CORS**: cors middleware
- **Environment Variables**: dotenv

## Getting Started

### Prerequisites

- Node.js installed (v14 or higher)
- MongoDB installed locally or MongoDB Atlas connection

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example` (or modify the existing .env file)
4. Start the development server:
   ```bash
   npm run dev
   ```

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/farmer-marketplace
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=10
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/auth/register | Register a new user | Public |
| POST | /api/auth/login | Login user | Public |
| GET | /api/auth/me | Get current user profile | Private |
| PUT | /api/auth/updateprofile | Update user profile | Private |

### User Roles

- **farmer**: Can manage farm products and details
- **buyer**: Can browse and purchase products
- **admin**: Full access to all features

## Project Structure

```
farmer-marketplace-backend/
├── src/
│   ├── config/
│   │   └── db.js              # Database connection
│   ├── controllers/
│   │   └── userController.js  # User controller logic
│   ├── middleware/
│   │   └── authMiddleware.js  # Authentication middleware
│   ├── models/
│   │   └── User.js            # User model
│   ├── routes/
│   │   └── userRoutes.js      # User routes
│   └── app.js                 # Express app setup
├── server.js                  # Entry point
├── .env                       # Environment variables
├── package.json               # Project dependencies
└── README.md                  # Documentation
```

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

## License

ISC
