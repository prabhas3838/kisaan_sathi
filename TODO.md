# Farmer Marketplace Backend - Project Structure Setup

## Project Structure:
```
farmer-marketplace-backend/
├── src/
│   ├── config/
│   │   └── db.js              # Database connection configuration
│   ├── models/
│   │   └── User.js            # User model with authentication
│   ├── routes/
│   │   └── userRoutes.js      # User authentication routes
│   ├── controllers/
│   │   └── userController.js  # User controller logic
│   ├── middleware/
│   │   └── authMiddleware.js  # JWT authentication middleware
│   └── app.js                 # Main Express application file
├── server.js                  # Entry point for the application
├── .env                       # Environment variables
├── package.json               # Project dependencies
└── README.md                  # Documentation
```

## ✅ Completed Tasks:
- [x] 1. Create directory structure (src/config, src/models, src/routes, src/controllers, src/middleware)
- [x] 2. Create src/config/db.js - Database connection configuration
- [x] 3. Create src/app.js - Main Express application file
- [x] 4. Create server.js - Entry point for the application
- [x] 5. Create .env - Environment variables template
- [x] 6. Update package.json - Add proper scripts and main entry
- [x] 7. Create User model with role support (farmer, buyer, admin)
- [x] 8. Create user routes with auth endpoints
- [x] 9. Create user controller with register, login, profile operations
- [x] 10. Create auth middleware with JWT verification and role-based access
- [x] 11. Create README.md with documentation

## Usage:
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## API Endpoints:
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login user
- GET /api/auth/me - Get current user (private)
- PUT /api/auth/updateprofile - Update profile (private)
