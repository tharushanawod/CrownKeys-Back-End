# Real Estate Backend API

A RESTful API for a real estate listing platform built with Node.js, Express, and Supabase.

## Features

- User authentication (register, login, logout)
- Property listings CRUD operations
- Agent management
- File upload for property images
- JWT-based authentication
- Input validation
- Error handling

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT, Supabase Auth
- **File Upload**: Multer
- **Validation**: Joi
- **Security**: Helmet, CORS

## Installation

1. Clone the repository

```bash
git clone <repository-url>
cd real-estate-backend
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

- Copy `.env.example` to `.env`
- Fill in your Supabase credentials and other configuration

4. Start the development server

```bash
npm run dev
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Listings

- `GET /api/listings` - Get all listings
- `GET /api/listings/:id` - Get listing by ID
- `POST /api/listings` - Create new listing (auth required)
- `PUT /api/listings/:id` - Update listing (auth required)
- `DELETE /api/listings/:id` - Delete listing (auth required)

### Agents

- `GET /api/agents` - Get all agents
- `GET /api/agents/:id` - Get agent by ID
- `POST /api/agents` - Create agent profile (auth required)
- `PUT /api/agents/:id` - Update agent profile (auth required)

## Environment Variables

```
NODE_ENV=development
PORT=3000
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.
