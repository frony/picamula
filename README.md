# JuntaTribo - Multi-User Travel App

A comprehensive travel planning application built with modern technologies, designed to help groups plan and organize their trips together.

## 🏗️ Architecture Overview

### Tech Stack

**Backend:**
- **NestJS** - Scalable Node.js framework with TypeScript support
- **TypeScript** - Type-safe development
- **PostgreSQL** - Reliable relational database
- **TypeORM** - Object-relational mapping with excellent TypeScript support
- **Redis** - In-memory data store for sessions and caching

**Frontend:**
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful and accessible UI components
- **Zustand** - Lightweight state management

**Monorepo:**
- **Turbo** - High-performance build system for monorepos

## 📁 Project Structure

```
junta-tribo/
├── apps/
│   ├── api/                 # NestJS Backend API
│   │   ├── src/
│   │   │   ├── auth/        # Authentication module
│   │   │   ├── users/       # User management module
│   │   │   ├── trips/       # Trip management module
│   │   │   ├── config/      # Configuration services
│   │   │   └── database/    # Database migrations
│   │   └── package.json
│   └── web/                 # Next.js Frontend
│       ├── src/
│       │   ├── app/         # App Router pages
│       │   ├── components/  # React components
│       │   ├── hooks/       # Custom React hooks
│       │   ├── lib/         # Utility libraries
│       │   └── store/       # State management
│       └── package.json
├── packages/
│   ├── shared/              # Shared types and utilities
│   │   └── src/
│   │       ├── types.ts     # TypeScript interfaces
│   │       └── constants.ts # Shared constants
│   └── ui/                  # Shared UI components (future)
├── docker-compose.yml       # Development services
├── turbo.json              # Turbo configuration
└── package.json            # Root package.json
```

## 🔐 Security Features

### Authentication & Authorization
- **JWT-based authentication** with secure token storage
- **Session management** with Redis for token validation
- **Password hashing** using bcryptjs
- **Protected routes** - All user-specific endpoints require authentication
- **User ownership validation** - Users can only access their own data

### API Security
- **CORS configuration** for frontend-backend communication
- **Input validation** using class-validator decorators
- **Error handling** with proper HTTP status codes
- **Request/Response interceptors** for consistent API behavior

## 🚀 Core Features

### User Management
- **Registration & Login** with email/password
- **Profile management** (update name, avatar)
- **Account deactivation** option
- **User session tracking** with Redis

### Trip Management (CRUD Operations)
- **Create trips** with detailed information:
  - Title, description, destination
  - Start/end dates with validation
  - Budget tracking
  - Participant management
  - Custom itinerary support
- **Read trips** with filtering and sorting:
  - View all user trips
  - Filter by status (planning, confirmed, in-progress, completed, cancelled)
  - Upcoming trips view
  - Trip statistics dashboard
- **Update trips** with partial updates supported
- **Delete trips** with proper authorization

### Trip Status Management
- **Planning** - Initial trip creation phase
- **Confirmed** - Trip details finalized
- **In Progress** - Currently traveling
- **Completed** - Trip finished
- **Cancelled** - Trip cancelled

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- npm or yarn

### Quick Start

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd junta-tribo
npm install
```

2. **Start development services:**
```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Start development servers
npm run dev
```

3. **Environment setup:**
```bash
# Backend
cp apps/api/env.example apps/api/.env
# Update database credentials in apps/api/.env

# Frontend
cp apps/web/env.example apps/web/.env
```

### Available Scripts

```bash
# Development
npm run dev          # Start all apps in development mode
npm run build        # Build all apps for production
npm run lint         # Run linting across all packages
npm run type-check   # Type checking across all packages

# Database
npm run migration:generate  # Generate new migration
npm run migration:run      # Run pending migrations
```

## 🔧 API Documentation

### Authentication Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user profile

### User Endpoints
- `GET /users` - Get all users (protected)
- `GET /users/:id` - Get user by ID (protected)
- `PATCH /users/me` - Update current user profile (protected)
- `DELETE /users/me` - Deactivate current user (protected)

### Trip Endpoints
- `GET /trips` - Get all user trips (protected)
- `GET /trips/upcoming` - Get upcoming trips (protected)
- `GET /trips/:id` - Get trip by ID (protected)
- `POST /trips` - Create new trip (protected)
- `PATCH /trips/:id` - Update trip (protected)
- `DELETE /trips/:id` - Delete trip (protected)

### API Documentation
- Swagger documentation available at `/api/docs` when running the backend
- Interactive API testing and documentation

## 🎨 Frontend Features

### Responsive Design
- **Mobile-first approach** with TailwindCSS
- **Responsive layouts** that work on all device sizes
- **Touch-friendly interfaces** for mobile users

### User Experience
- **Modern UI** with shadcn/ui components
- **Loading states** and error handling
- **Toast notifications** for user feedback
- **Form validation** with real-time feedback
- **Dashboard with statistics** and trip overview

### State Management
- **Zustand store** for authentication state
- **Persistent storage** for user sessions
- **Optimistic updates** for better UX

## 📊 Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `email` (Unique, Not Null)
- `firstName` (String, Not Null)
- `lastName` (String, Not Null)
- `password` (Hashed, Not Null)
- `avatar` (String, Optional)
- `isActive` (Boolean, Default: true)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

### Trips Table
- `id` (UUID, Primary Key)
- `title` (String, Not Null)
- `description` (Text, Optional)
- `destination` (String, Not Null)
- `startDate` (Date, Not Null)
- `endDate` (Date, Not Null)
- `status` (Enum: planning, confirmed, in_progress, completed, cancelled)
- `budget` (Decimal, Optional)
- `participants` (JSON Array, Optional)
- `itinerary` (JSON Array, Optional)
- `ownerId` (UUID, Foreign Key to Users)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

## 🚀 Deployment Considerations

### Production Setup
- Environment variables configuration
- Database migrations in production
- Redis cluster setup for scaling
- SSL/TLS certificates
- Load balancing considerations
- Monitoring and logging setup

### Scaling Strategies
- **Horizontal scaling** with multiple API instances
- **Database read replicas** for improved performance
- **Redis clustering** for session management
- **CDN integration** for static assets
- **Caching strategies** for frequently accessed data

## 🔮 Future Enhancements

### Planned Features
- **Real-time collaboration** with WebSocket support
- **File upload** for trip photos and documents
- **Trip sharing** with public links
- **Email notifications** for trip updates
- **Mobile app** with React Native
- **Third-party integrations** (Google Maps, weather APIs)
- **Advanced trip planning** with AI suggestions

### Technical Improvements
- **GraphQL API** for more flexible data fetching
- **Microservices architecture** for better scalability
- **Event-driven architecture** with message queues
- **Advanced caching** strategies
- **Performance monitoring** and analytics
- **Automated testing** suite expansion

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**JuntaTribo** - Making travel planning collaborative and fun! 🌍✈️
