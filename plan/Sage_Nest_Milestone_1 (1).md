# Sage Nest --- Milestone 1 Development Plan

## Expert Onboarding & Stripe Connection

------------------------------------------------------------------------

## Architecture Decision

We are using a **separated frontend + backend architecture**

Frontend → React\
Backend → Node.js (Express)

This means:

-   Frontend and backend will be in **separate folders**
-   They run independently
-   They communicate via APIs

Recommended structure:

    project-root/
    │
    ├── backend/
    └── frontend/

This is the industry standard approach and is best for scalability,
deployment, and maintenance.
We are already in project-root folder and backend and frontend folders are already created. 

------------------------------------------------------------------------

## Tech Stack

### Backend

-   Node.js
-   Express.js
-   PostgreSQL
-   Prisma ORM

### Frontend

-   React

### Payments

-   Stripe Connect Express

------------------------------------------------------------------------

## Objective of Milestone

Build the foundation of the platform including authentication, expert
onboarding, services, availability, Stripe connection, and admin
approval system.

------------------------------------------------------------------------

## Phase 1 --- Project Setup


### Step 1 --- Initialize Backend

Go Inside backend folder:

    npm init -y
    npm install express cors dotenv bcrypt jsonwebtoken stripe
    npm install prisma @prisma/client
    npm install class-validator
    npm install --save-dev nodemon

Create base server file.

------------------------------------------------------------------------

### Step 2 --- Initialize Frontend

Go Inside frontend folder:

    npx create-react-app .

(or Vite if preferred)

------------------------------------------------------------------------

### Step 3 --- Configure Database

-   Install PostgreSQL
-   Create database
-   Configure Prisma connection
-   Run initial migration

------------------------------------------------------------------------

## Phase 2 --- Database Schema Design

### Tables

#### Users

-   id
-   email
-   password_hash
-   role
-   created_at

#### Experts

-   id
-   user_id
-   bio
-   profile_image
-   expertise
-   stripe_account_id
-   is_approved

#### Services

-   id
-   expert_id
-   title
-   duration_minutes
-   price
-   is_active

#### Availability

-   id
-   expert_id
-   day_of_week
-   start_time
-   end_time

------------------------------------------------------------------------

## Phase 3 --- Authentication System

Endpoints: - POST /auth/register - POST /auth/login

Features: - JWT authentication - Password hashing - Role-based
middleware

------------------------------------------------------------------------

## Phase 4 --- Expert Profile

Features: - Create profile - Update profile - Upload profile image -
View own profile

------------------------------------------------------------------------

## Phase 5 --- Services Module

Features: - Create service - Edit service - Delete service - List
services

------------------------------------------------------------------------

## Phase 6 --- Availability Module

Features: - Add weekly availability - View availability - Remove
availability

------------------------------------------------------------------------

## Phase 7 --- Stripe Connect Integration

Flow: 1. Expert clicks connect 2. Backend creates Stripe onboarding link
3. Redirect to Stripe 4. Stripe returns to platform 5. Save Stripe
account ID securely

Requirements: - Store account ID - Verify onboarding completion

------------------------------------------------------------------------

## Phase 8 --- Admin Approval

Admin abilities: - Approve expert - Reject expert - Toggle bookable
state

Restriction: Expert cannot be booked until approved.

------------------------------------------------------------------------

## Completion Criteria

Milestone is complete when:

-   Expert can register and login
-   Expert profile can be created
-   Services can be added
-   Availability can be added
-   Stripe account connects successfully
-   Admin approval works
-   Payment split test succeeds (20% platform / 80% expert)

------------------------------------------------------------------------

## Development Order (Strict)

1.  Setup project structure
2.  Initialize backend
3.  Configure database
4.  Build schema
5.  Setup auth
6.  Build expert profile
7.  Build services
8.  Build availability
9.  Integrate Stripe
10. Build admin approval

------------------------------------------------------------------------

## Notes

-   Always test backend APIs before connecting frontend
-   Use Stripe test mode first
-   Keep schema normalized and clean
-   Log Stripe events for debugging

------------------------------------------------------------------------

**Milestone 1 Goal = Solid backend foundation + working APIs**
