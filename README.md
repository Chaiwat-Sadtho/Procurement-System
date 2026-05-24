# Procurement & Vendor Management System

A NestJS + React + PostgreSQL procurement/vendor management app.

## Tech Stack

- **Backend**: NestJS (TypeScript)
- **Frontend**: React (TypeScript)
- **Database**: PostgreSQL 16
- **ORM**: TypeORM

## Getting Started

### Prerequisites

- Docker and Docker Compose installed

### Start Infrastructure

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on port `5432`
- **pgAdmin** on port `5050` (login: `admin@admin.com` / `admin`)

### Environment

Copy `.env.example` to `.env` and update values as needed.
