# JuntaTribo - API & System Architecture Design

> Multi-User Travel Planning Platform  
> Version 1.0 | January 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Technology Stack](#3-technology-stack)
4. [Architecture Diagram](#4-architecture-diagram)
5. [Backend Services Architecture](#5-backend-services-architecture)
6. [Database Schema Design](#6-database-schema-design)
7. [Redis Cache Strategy](#7-redis-cache-strategy)
8. [REST API Design](#8-rest-api-design)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Third-Party Integrations](#10-third-party-integrations)
11. [Security Architecture](#11-security-architecture)
12. [Deployment Architecture](#12-deployment-architecture)

---

## 1. Executive Summary

JuntaTribo is a comprehensive multi-user travel planning platform built using modern web technologies. The application follows a Turborepo monorepo architecture, separating frontend, backend, and shared packages for optimal code organization, maintainability, and deployment flexibility.

### 1.1 Project Goals

- Enable collaborative trip planning with multi-user support
- Provide secure authentication with JWT tokens and optional 2FA
- Support media uploads (images/videos) with local filesystem storage
- Implement robust rate limiting for DDoS protection
- Deliver responsive, modern UI using Next.js and TailwindCSS

---

## 2. System Overview

### 2.1 Monorepo Structure

The project uses Turborepo for efficient build orchestration across multiple packages:

| Directory | Description |
|-----------|-------------|
| `apps/api` | NestJS Backend API (Port 8001) |
| `apps/web` | Next.js Frontend Application (Port 3003) |
| `packages/shared` | Shared TypeScript types, interfaces, and constants |

### 2.2 Core Modules

The backend API is organized into domain-specific modules following NestJS best practices:

| Module | Responsibility |
|--------|---------------|
| `IamModule` | Identity & Access Management - authentication, authorization, JWT handling |
| `UsersModule` | User profile management, email verification, API keys |
| `TripsModule` | Trip CRUD operations, status management, media handling |
| `NotesModule` | Trip notes creation and management |
| `TodosModule` | User TODO items with status tracking |
| `ExpensesModule` | Trip expense tracking with summaries |
| `DestinationModule` | Multi-destination trip support with ordering |
| `S3Module` | AWS S3 integration for cloud storage (optional) |

---

## 3. Technology Stack

### 3.1 Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| NestJS | ^10.0.0 | Backend framework |
| TypeScript | ^5.2.2 | Type-safe development |
| PostgreSQL | 15-alpine | Primary database |
| TypeORM | ^0.3.17 | ORM for database operations |
| Redis | 7-alpine | Caching & rate limiting |
| Passport.js | ^0.6.0 | Authentication middleware |
| class-validator | ^0.14.0 | DTO validation |

### 3.2 Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.5.9 | React framework with App Router |
| React | ^18.2.0 | UI library |
| TailwindCSS | ^3.3.5 | Utility-first CSS framework |
| shadcn/ui | Latest | Accessible UI components |
| NextAuth.js | 5.0.0-beta.25 | Authentication for Next.js |
| Zustand | ^4.4.6 | Lightweight state management |
| Axios | ^1.6.0 | HTTP client |

### 3.3 Infrastructure

| Component | Details |
|-----------|---------|
| Web Server | Nginx - reverse proxy, SSL termination, static file serving |
| Process Manager | PM2 - production process management with auto-restart |
| Containerization | Docker Compose for local development services |
| Build System | Turborepo for monorepo build orchestration |
| Cloud Storage | AWS S3 (optional) or local filesystem |

---

## 4. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     NGINX REVERSE PROXY (:443)                               │
│  ┌──────────────────┐  ┌────────────────┐  ┌─────────────────────────────┐  │
│  │ SSL Termination  │  │ Rate Limiting  │  │ Static File Serving         │  │
│  └──────────────────┘  └────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                                    │
        ┌───────────┴───────────┐           ┌───────────┴───────────┐
        ▼                       ▼           ▼                       ▼
┌───────────────────┐   ┌───────────────────┐               ┌───────────────┐
│  Next.js (:3003)  │   │  NestJS (:8001)   │               │    /uploads   │
│  ├─ App Router    │   │  ├─ REST API      │               │  Local Files  │
│  ├─ NextAuth      │   │  ├─ Controllers   │               └───────────────┘
│  └─ React UI      │   │  └─ Services      │
└───────────────────┘   └───────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
        ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
        │  PostgreSQL   │ │    Redis      │ │    AWS S3     │
        │   (:5435)     │ │   (:6381)     │ │  (Optional)   │
        │   Database    │ │   Cache &     │ │  Cloud Files  │
        │               │ │   Sessions    │ │               │
        └───────────────┘ └───────────────┘ └───────────────┘
```

---

## 5. Backend Services Architecture

### 5.1 Module Dependencies

```
AppModule
├── ConfigModule (Global)        # Environment configuration
├── TypeOrmModule (Database)     # PostgreSQL connection
├── CacheModule (Global)         # Redis caching
├── ThrottlerModule              # Rate limiting
├── MailerModule                 # Email service (SMTP)
├── IamModule                    # Authentication & Authorization
│   ├── AuthenticationService    # JWT, login, signup, 2FA
│   ├── PasswordService          # Reset, update passwords
│   └── Guards                   # Access, Authentication guards
├── UsersModule                  # User management
│   └── ApiKeysModule            # API key authentication
├── TripsModule                  # Trip management
│   └── MediaController          # File uploads
├── NotesModule                  # Trip notes
├── TodosModule                  # User todos
├── TripExpensesModule           # Expense tracking
├── DestinationModule            # Multi-destination support
└── S3Module / FileSystemModule  # File storage
```

### 5.2 Middleware Pipeline

Requests pass through a layered middleware system providing security and observability:

| Order | Middleware | Function |
|-------|------------|----------|
| 1 | `LoggingMiddleware` | Logs all incoming requests with timestamps |
| 2 | `BackoffStrikeMiddleware` | Checks if IP has accumulated violations |
| 3 | `IpBackoffMiddleware` | Enforces basic IP-based rate limiting |
| 4 | `ThrottlerGuard` | Fine-grained multi-tier rate limiting |

---

## 6. Database Schema Design

### 6.1 Entity Relationship Overview

```
┌─────────────┐       ┌─────────────┐       ┌─────────────────┐
│    User     │───<>──│    Trip     │───<>──│   Destination   │
└─────────────┘   1:N └─────────────┘   1:N └─────────────────┘
      │                     │                       │
      │                     │                       │
      │ 1:N                 │ 1:N                   │ 1:N
      ▼                     ▼                       ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────────┐
│  TodoItem   │       │    Note     │◄──────│     Note        │
└─────────────┘       └─────────────┘       │ (Destination)   │
      │                     │               └─────────────────┘
      │                     │
┌─────────────┐       ┌─────────────┐
│   ApiKey    │       │  MediaFile  │
└─────────────┘       └─────────────┘
                            │
                      ┌─────────────┐
                      │TripExpenses │
                      └─────────────┘
```

### 6.2 Core Entities

#### User Entity

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-incrementing primary key |
| `firstName` | VARCHAR | User's first name |
| `lastName` | VARCHAR | User's last name |
| `email` | VARCHAR UNIQUE | Unique email address for login |
| `password` | VARCHAR NULL | Bcrypt hashed password (null for OAuth) |
| `phone` | VARCHAR NULL | Optional phone number |
| `role` | ENUM | Role: Regular, Admin |
| `isTfaEnabled` | BOOLEAN | Two-factor authentication enabled flag |
| `tfaSecret` | VARCHAR NULL | TOTP secret for 2FA |
| `googleId` | VARCHAR NULL | Google OAuth identifier |
| `permissions` | JSON | Array of permission strings |
| `isVerified` | BOOLEAN | Email verification status |
| `createdAt` | TIMESTAMP | Record creation timestamp |
| `updatedAt` | TIMESTAMP | Last update timestamp |

#### Trip Entity

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-incrementing primary key |
| `slug` | UUID UNIQUE | Public URL-safe identifier |
| `title` | VARCHAR | Trip title |
| `description` | TEXT NULL | Trip description |
| `destination` | VARCHAR | Primary destination |
| `startCity` | VARCHAR | Starting city |
| `startDate` | DATE | Trip start date |
| `endDate` | DATE | Trip end date |
| `status` | ENUM | planning, confirmed, in_progress, completed, cancelled |
| `budget` | DECIMAL(10,2) | Trip budget amount |
| `participants` | JSON | Array of participant emails |
| `itinerary` | JSON | Array of itinerary items |
| `ownerId` | INTEGER FK | Foreign key to User |
| `createdAt` | TIMESTAMP | Record creation timestamp |
| `updatedAt` | TIMESTAMP | Last update timestamp |

#### TripExpenses Entity

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-incrementing primary key |
| `date` | VARCHAR | Expense date (YYYY-MM-DD) |
| `type` | ENUM | flight, lodging, transportation, meal, snack, groceries, entertainment, other |
| `memo` | VARCHAR | Short expense description |
| `comment` | TEXT NULL | Additional notes |
| `amount` | DECIMAL(10,2) | Expense amount |
| `tripId` | INTEGER FK | Foreign key to Trip |
| `paidById` | INTEGER FK | Foreign key to User (payer) |
| `createdAt` | TIMESTAMP | Record creation timestamp |
| `updatedAt` | TIMESTAMP | Last update timestamp |

#### MediaFile Entity

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-incrementing primary key |
| `key` | VARCHAR | Storage path/key |
| `url` | VARCHAR | Full accessible URL |
| `type` | ENUM | image or video |
| `originalName` | VARCHAR NULL | Original filename |
| `mimeType` | VARCHAR NULL | MIME type (image/jpeg, video/mp4) |
| `size` | BIGINT NULL | File size in bytes |
| `order` | INTEGER | Display order |
| `width` | INTEGER NULL | Image width in pixels |
| `height` | INTEGER NULL | Image height in pixels |
| `duration` | INTEGER NULL | Video duration in seconds |
| `thumbnailKey` | VARCHAR NULL | Thumbnail storage key (for videos) |
| `tripId` | INTEGER FK | Foreign key to Trip |
| `createdAt` | TIMESTAMP | Record creation timestamp |
| `updatedAt` | TIMESTAMP | Last update timestamp |

#### Destination Entity

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-incrementing primary key |
| `name` | VARCHAR | Destination name (e.g., "Paris, France") |
| `order` | INTEGER | Display/visit order |
| `arrivalDate` | DATE NULL | Arrival date |
| `departureDate` | DATE NULL | Departure date |
| `latitude` | DECIMAL | GPS latitude |
| `longitude` | DECIMAL | GPS longitude |
| `tripId` | INTEGER FK | Foreign key to Trip |
| `createdAt` | TIMESTAMP | Record creation timestamp |
| `updatedAt` | TIMESTAMP | Last update timestamp |

#### Note Entity

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | UUID primary key |
| `content` | TEXT | Note content |
| `date` | TIMESTAMP | Date associated with note |
| `tripId` | INTEGER FK | Foreign key to Trip |
| `authorId` | INTEGER FK | Foreign key to User |
| `destinationId` | INTEGER FK NULL | Optional foreign key to Destination |
| `createdAt` | TIMESTAMP | Record creation timestamp |
| `updatedAt` | TIMESTAMP | Last update timestamp |

#### TodoItem Entity

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-incrementing primary key |
| `title` | VARCHAR | Todo item title |
| `status` | ENUM | pending or completed |
| `userId` | INTEGER FK | Foreign key to User |
| `createdAt` | TIMESTAMP | Record creation timestamp |
| `updatedAt` | TIMESTAMP | Last update timestamp |

---

## 7. Redis Cache Strategy

### 7.1 Configuration

Redis is configured as a global caching layer with the following settings:

| Setting | Value | Purpose |
|---------|-------|---------|
| TTL (Default) | 2 hours | Default cache expiration |
| Max Items | 10 | Maximum items in memory |
| Host | localhost | Redis server address |
| Port | 6381 | Redis server port |

### 7.2 Rate Limiting with Redis

The system implements multi-tier rate limiting using Redis-backed throttling:

| Tier | Window | Limit | Purpose |
|------|--------|-------|---------|
| Short | 1 second | 5 requests | Burst protection (page loads) |
| Medium | 10 seconds | 30 requests | Active browsing protection |
| Long | 60 seconds | 150 requests | Sustained usage limit |

### 7.3 IP Backoff System

Additional IP-based protection with progressive penalties:

| Configuration | Value |
|---------------|-------|
| `BACKOFF_MAX_REQUESTS` | 100 requests per minute |
| `AUTH_MAX_REQUESTS` | 5 login attempts per 10 seconds |
| `BACKOFF_DURATION_MS` | 5 minutes penalty |
| `IP_WHITELIST` | Server IP, localhost, ::1 |

---

## 8. REST API Design

### 8.1 Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/authentication/sign-up` | Register new user |
| POST | `/authentication/sign-in` | User login, returns JWT tokens |
| POST | `/authentication/refresh-tokens` | Refresh access token |
| POST | `/authentication/logout` | Revoke refresh tokens |
| POST | `/authentication/2fa/generate` | Generate 2FA QR code |
| POST | `/authentication/sendResetToken` | Send password reset email |
| GET | `/authentication/validateResetToken/:token` | Validate reset token |
| POST | `/authentication/updatePassword` | Update user password |
| GET | `/authentication/altcha/key` | Get ALTCHA HMAC key for CAPTCHA |

### 8.2 Users Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | Get all users (Admin only) |
| GET | `/users/me` | Get current user profile |
| GET | `/users/:id` | Get user by ID |
| GET | `/users/by-emails?emails=...` | Get users by email list |
| POST | `/users` | Create user (Admin only) |
| POST | `/users/verify-email` | Verify email with token |
| PATCH | `/users/:id` | Update user (Admin only) |
| DELETE | `/users/:id` | Delete user (Admin only) |

### 8.3 Trips Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/trips` | Get all user trips (with optional status filter) |
| GET | `/trips/upcoming` | Get upcoming trips |
| GET | `/trips/:slug` | Get trip by slug |
| POST | `/trips` | Create new trip |
| PATCH | `/trips/:slug` | Update trip |
| DELETE | `/trips/:slug` | Delete trip |

### 8.4 Trip Notes Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/trips/:tripSlug/notes` | Get all notes for trip |
| GET | `/trips/:tripSlug/notes/:id` | Get specific note |
| POST | `/trips/:tripSlug/notes` | Create note for trip |
| PATCH | `/trips/:tripSlug/notes/:id` | Update note |
| DELETE | `/trips/:tripSlug/notes/:id` | Delete note |

### 8.5 Destinations Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/trips/:tripId/destinations` | Get all destinations for trip |
| GET | `/trips/by-slug/:tripSlug/destinations` | Get destinations by trip slug |
| POST | `/trips/:tripId/destinations` | Add destination to trip |
| PATCH | `/trips/:tripId/destinations/:id` | Update destination |
| DELETE | `/trips/:tripId/destinations/:id` | Remove destination |
| POST | `/trips/:tripId/destinations/reorder` | Reorder destinations |

### 8.6 Trip Expenses Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/trip-expenses?tripId=...` | Get all expenses for trip |
| GET | `/trip-expenses/summary?tripId=...` | Get expense summary |
| GET | `/trip-expenses/:id` | Get specific expense |
| POST | `/trip-expenses` | Create expense |
| PATCH | `/trip-expenses/:id` | Update expense |
| DELETE | `/trip-expenses/:id` | Delete expense |

### 8.7 Media Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/trips/:tripId/media/upload` | Upload media file (multipart/form-data) |
| DELETE | `/trips/:tripId/media/:mediaId` | Delete media file |

**File Upload Limits:**
- Images: 20MB maximum (after frontend compression)
- Videos: 100MB maximum (after frontend compression)
- Allowed types: `image/*`, `video/*`

### 8.8 Todos Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/todos` | Get all user todos |
| GET | `/todos/:id` | Get specific todo |
| POST | `/todos` | Create todo item |
| POST | `/todos/bulk` | Create multiple todos |
| POST | `/todos/reset` | Reset all todos to PENDING |
| PATCH | `/todos/:id` | Update todo status |
| PATCH | `/todos/:id/toggle` | Toggle todo status |
| DELETE | `/todos/:id` | Delete todo |

---

## 9. Authentication & Authorization

### 9.1 JWT Token Strategy

The system uses a dual-token JWT strategy with access and refresh tokens:

| Token Type | Lifetime | Storage |
|------------|----------|---------|
| Access Token | 1 hour (configurable) | NextAuth session / memory |
| Refresh Token | Configurable via `JWT_REFRESH_TOKEN_TTL` | HTTP-only cookie |

**JWT Payload Structure:**

```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "name": "User Name",
  "role": "Regular | Admin",
  "permissions": ["permission1", "permission2"],
  "iat": 1234567890,
  "exp": 1234571490,
  "aud": "localhost:3003",
  "iss": "localhost:3003"
}
```

### 9.2 Authentication Flow

```
┌─────────┐                  ┌─────────────┐                  ┌──────────┐
│ Browser │                  │  Next.js    │                  │  NestJS  │
└────┬────┘                  └──────┬──────┘                  └────┬─────┘
     │                              │                              │
     │  1. Login Request            │                              │
     ├─────────────────────────────>│                              │
     │                              │  2. POST /authentication/sign-in
     │                              ├─────────────────────────────>│
     │                              │                              │
     │                              │  3. JWT Tokens               │
     │                              │<─────────────────────────────┤
     │  4. Set Session Cookie       │                              │
     │<─────────────────────────────┤                              │
     │                              │                              │
     │  5. API Request + Auth Header│                              │
     ├─────────────────────────────>│                              │
     │                              │  6. Forward with Bearer Token│
     │                              ├─────────────────────────────>│
     │                              │                              │
     │                              │  7. Response                 │
     │<─────────────────────────────┤<─────────────────────────────┤
```

### 9.3 Authorization Guards

| Guard / Decorator | Purpose |
|-------------------|---------|
| `@Auth(AuthType.Bearer)` | Requires valid JWT access token |
| `@Auth(AuthType.ApiKey)` | Allows API key authentication |
| `@Auth(AuthType.None)` | Public endpoint, no auth required |
| `@Roles(Role.Admin)` | Restricts to admin users only |
| `@ActiveUser()` | Injects current user data into handler |

### 9.4 Two-Factor Authentication

Optional TOTP-based 2FA support using the `otplib` library:

1. User enables 2FA via `POST /authentication/2fa/generate`
2. Server generates TOTP secret and returns QR code (PNG)
3. User scans QR with authenticator app (Google Authenticator, etc.)
4. Secret stored in `user.tfaSecret`, `isTfaEnabled` set to `true`
5. Future logins require `tfaCode` in sign-in payload

---

## 10. Third-Party Integrations

### 10.1 Current Integrations

| Service | Provider | Purpose |
|---------|----------|---------|
| Email Service | Gmail SMTP | Transactional emails, password reset |
| Cloud Storage | AWS S3 | Optional media file storage |
| Maps | Google Maps API | Location services, map display |
| OAuth | Google OAuth | Social login authentication |
| CAPTCHA | ALTCHA | Bot protection on forms |

### 10.2 AWS S3 Configuration

Optional S3 integration for cloud-based media storage:

```env
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_BUCKET_NAME=juntatribo-default
```

### 10.3 Google Maps Integration

The frontend uses `@react-google-maps/api` for map rendering:

```env
GOOGLE_MAPS_API_KEY=your-api-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key
```

### 10.4 Email Configuration

Gmail SMTP configuration for transactional emails:

```env
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
```

### 10.5 Future AI Integration (Mastra)

The architecture supports future integration with AI services via Mastra framework. Potential integrations include:

- **Anthropic Claude API** - Trip planning suggestions, itinerary generation
- **OpenAI API** - Natural language processing for travel recommendations
- **Vector Database** - Semantic search for destinations and activities
- **RAG Pipeline** - Knowledge-augmented travel assistance

---

## 11. Security Architecture

### 11.1 Security Layers

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NGINX (Layer 1)                                  │
│  - SSL/TLS Termination (TLS 1.2/1.3)                                   │
│  - HSTS Headers                                                         │
│  - Content Security Policy                                              │
│  - Rate Limiting (connection level)                                     │
└────────────────────────────────────────────────────────────────────────┘
                                 │
┌────────────────────────────────────────────────────────────────────────┐
│                        NestJS Middleware (Layer 2)                      │
│  - IP Backoff (request-level rate limiting)                            │
│  - Backoff Strike (progressive penalties)                              │
│  - Request Logging                                                      │
└────────────────────────────────────────────────────────────────────────┘
                                 │
┌────────────────────────────────────────────────────────────────────────┐
│                        Throttler Guard (Layer 3)                        │
│  - Multi-tier rate limiting (short/medium/long)                        │
│  - Redis-backed for distributed consistency                            │
└────────────────────────────────────────────────────────────────────────┘
                                 │
┌────────────────────────────────────────────────────────────────────────┐
│                        Authentication Guard (Layer 4)                   │
│  - JWT Token Validation                                                 │
│  - API Key Validation                                                   │
│  - Session Verification                                                 │
└────────────────────────────────────────────────────────────────────────┘
                                 │
┌────────────────────────────────────────────────────────────────────────┐
│                        Authorization (Layer 5)                          │
│  - Role-based Access Control (RBAC)                                    │
│  - Resource Ownership Validation                                        │
│  - Permission Checks                                                    │
└────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Data Protection

| Protection | Implementation |
|------------|----------------|
| Password Hashing | bcrypt with configurable salt rounds |
| SQL Injection | TypeORM parameterized queries |
| XSS Prevention | Content Security Policy headers |
| CSRF Protection | SameSite cookies, origin validation |
| Input Validation | class-validator DTOs with whitelist |
| Transport Security | HTTPS only, HSTS enabled |

### 11.3 Content Security Policy

The Nginx configuration includes comprehensive CSP headers:

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://maps.googleapis.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com;
connect-src 'self' https://www.juntatribo.com blob: https://*.googleapis.com;
```

---

## 12. Deployment Architecture

### 12.1 Production Deployment

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Hostinger VPS                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                        NGINX                                  │   │
│  │    - SSL termination (Let's Encrypt)                         │   │
│  │    - Reverse proxy to Next.js (3003) and NestJS (8001)       │   │
│  │    - Static file serving (/uploads)                           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                             │                                        │
│         ┌───────────────────┼───────────────────┐                   │
│         │                   │                   │                   │
│         ▼                   ▼                   ▼                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐         │
│  │   PM2       │    │   PM2       │    │  Docker         │         │
│  │  Next.js    │    │  NestJS     │    │  PostgreSQL     │         │
│  │  (3003)     │    │  (8001)     │    │  Redis          │         │
│  └─────────────┘    └─────────────┘    └─────────────────┘         │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    /var/www/juntatribo/uploads                │   │
│  │                    Local File Storage                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 12.2 PM2 Configuration

```json
{
  "apps": [
    {
      "name": "juntatribo-api",
      "script": "npm",
      "args": "run start:prod:api",
      "env": {
        "NODE_ENV": "production",
        "PORT": "8001"
      },
      "max_memory_restart": "1G",
      "restart_delay": 4000,
      "max_restarts": 10
    },
    {
      "name": "juntatribo-web",
      "script": "npm",
      "args": "run start:prod:web",
      "env": {
        "NODE_ENV": "production",
        "PORT": "3003"
      },
      "max_memory_restart": "1G",
      "restart_delay": 4000,
      "max_restarts": 10
    }
  ]
}
```

### 12.3 Environment Variables

Critical production environment variables:

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | Set to 'production' for optimizations |
| `AUTH_URL` | NextAuth callback URL (https://domain.com) |
| `AUTH_SECRET` | NextAuth encryption secret (32+ chars) |
| `JWT_SECRET` | JWT signing secret |
| `DB_HOST/PORT/USER/PASS` | PostgreSQL connection details |
| `REDIS_HOST/PORT` | Redis connection details |
| `UPLOAD_DIR` | Local file storage path |
| `UPLOAD_BASE_URL` | Public URL for uploaded files |

### 12.4 Docker Compose (Development)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: postgres-JuntaTribo
    environment:
      POSTGRES_DB: junta_tribo
      POSTGRES_USER: juntatribo
      POSTGRES_PASSWORD: your-password
    ports:
      - "5435:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: redis-JuntaTribo
    ports:
      - "6381:6379"
    volumes:
      - redis_data:/data

  adminer:
    image: adminer
    ports:
      - "8080:8080"
    depends_on:
      - postgres

volumes:
  postgres_data:
  redis_data:
```

### 12.5 Build & Deploy Commands

```bash
# Development
npm run dev              # Start all apps in development mode

# Production Build
npm run build:prod       # Clean and build all apps

# PM2 Management
npm run pm2:start        # Start all services
npm run pm2:restart      # Restart all services
npm run pm2:list         # List running services

# Database Migrations
npm run migration:run    # Run pending migrations (dev)
npm run migration:run:prod  # Run migrations (production)
```

---

## Appendix: API Response Formats

### Success Response

```json
{
  "id": 1,
  "title": "Trip to Paris",
  "status": "planning",
  "createdAt": "2026-01-21T10:30:00Z"
}
```

### Error Response

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### Paginated Response (Future)

```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

*Document generated: January 2026*
