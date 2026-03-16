# Sage Nest Frontend --- Authentication Module

## Login & Register Pages (Milestone 1)

------------------------------------------------------------------------

# Project Frontend Stack

**Framework** - React.js

**Styling** - TailwindCSS

**State / Forms** - React Hooks - Controlled Forms

**API Communication** - Axios / Fetch API

**Design Goal** Modern, clean, premium UI with calm **sage‑green
branding** matching the Sage Nest logo.

------------------------------------------------------------------------

# Brand Theme (Derived From Logo)

Primary Brand Color

    Sage Green
    HEX: #445446
    RGB: 74, 89, 75

Supporting Colors

  Purpose            Color
  ------------------ ---------
  Primary            #445446
  Hover              #3F4E41
  Light Background   #F5F7F5
  Border             #E4E7E4
  Text Dark          #1F2933

------------------------------------------------------------------------

# Logo Usage

Logo file location:

    /public/assets/images/Sage-Nest_Final.png

Example usage:

``` jsx
<img 
 src="/assets/images/Sage-Nest_Final.png"
 alt="Sage Nest"
 className="w-32 mx-auto mb-6"
/>
```

------------------------------------------------------------------------

# Project Structure

    frontend
    │
    ├── public
    │   └── assets
    │       └── images
    │           └── Sage-Nest_Final.png
    │
    ├── src
    │
    │   ├── api
    │   │   └── authApi.js
    │
    │   ├── pages
    │   │   └── auth
    │   │       ├── Login.jsx
    │   │       └── Register.jsx
    │
    │   ├── components
    │   │   └── auth
    │   │       └── AuthLayout.jsx
    │
    │   ├── hooks
    │   │   └── useAuthForm.js
    │
    │   ├── utils
    │   │   └── validation.js
    │
    │   └── App.jsx

------------------------------------------------------------------------

# Install React Project

Recommended: **Vite (fast modern setup)**

    npm create vite@latest frontend
    cd frontend
    npm install

Run project

    npm run dev

------------------------------------------------------------------------

# Install TailwindCSS

Install dependencies

    npm install -D tailwindcss postcss autoprefixer
    npx tailwindcss init -p

------------------------------------------------------------------------

# Configure Tailwind

Edit:

    tailwind.config.js

    content: [
     "./index.html",
     "./src/**/*.{js,ts,jsx,tsx}"
    ]

------------------------------------------------------------------------

# Tailwind Global Styles

Edit:

    src/index.css

    @tailwind base;
    @tailwind components;
    @tailwind utilities;

------------------------------------------------------------------------

# Authentication Pages

We will build two pages:

1️⃣ Login Page\
2️⃣ Register Page

Both will use:

-   Tailwind UI
-   Form validation
-   Backend API integration

------------------------------------------------------------------------

# Login Page UI Structure

File:

    src/pages/auth/Login.jsx

Layout:

    Centered Card Layout
     ├── Logo
     ├── Heading
     ├── Email Field
     ├── Password Field
     ├── Login Button
     └── Register Redirect

UI Style Goals

-   Minimalist
-   Large spacing
-   Soft rounded corners
-   Calm green accent
-   Shadow card design

------------------------------------------------------------------------

# Login Form Fields

  Field      Type       Validation
  ---------- ---------- ------------------------
  Email      email      required + valid email
  Password   password   required

------------------------------------------------------------------------

# Login API

Endpoint

    POST /auth/login

Payload

    {
     email: string
     password: string
    }

Success Response

    {
     token: string,
     user: {...}
    }

------------------------------------------------------------------------

# Register Page UI

File

    src/pages/auth/Register.jsx

Layout

    Centered Card Layout
     ├── Logo
     ├── Heading
     ├── Name
     ├── Email
     ├── Password
     ├── Confirm Password
     ├── Register Button
     └── Login Redirect

------------------------------------------------------------------------

# Register Fields

  Field              Type       Validation
  ------------------ ---------- -------------
  Name               text       required
  Email              email      required
  Password           password   min 6 chars
  Confirm Password   password   must match

------------------------------------------------------------------------

# Register API

Endpoint

    POST /auth/register

Payload

    {
     name: string,
     email: string,
     password: string
    }

------------------------------------------------------------------------

# Validation Handling

Validation handled via:

    utils/validation.js

Example rules

    email → required + valid format
    password → minimum 6 characters
    confirmPassword → must match password

------------------------------------------------------------------------

# Form Handling Strategy

Use controlled components:

    const [form,setForm] = useState({
     email:"",
     password:""
    })

On change

    setForm({
     ...form,
     [e.target.name]:e.target.value
    })

------------------------------------------------------------------------

# API Layer

File

    src/api/authApi.js

Example

    export const loginUser = async (data)=>{
     return fetch("/auth/login",{
      method:"POST",
      headers:{ "Content-Type":"application/json"},
      body: JSON.stringify(data)
     })
    }

------------------------------------------------------------------------

# Premium UI Design Rules

Authentication pages should follow:

• Large whitespace\
• Clean typography\
• Smooth hover effects\
• Subtle shadows\
• Soft rounded inputs\
• Clear CTA button

Example Button Style

    bg-[#445446]
    hover:bg-[#3F4E41]
    text-white
    rounded-lg
    py-3
    font-medium
    transition

------------------------------------------------------------------------

# Authentication Flow

    Register
     → Create account
     → Redirect to login

    Login
     → API call
     → Store JWT
     → Redirect to dashboard

------------------------------------------------------------------------

# Milestone 1 Frontend Goal

By the end of this step:

✅ Login page UI complete\
✅ Register page UI complete\
✅ Tailwind styling working\
✅ Backend APIs connected\
✅ Validation implemented

Next steps after this:

-   Expert Dashboard
-   Services CRUD UI
-   Availability rules UI
-   Stripe Connect UI
-   Admin panel

------------------------------------------------------------------------

**End of Authentication Module Specification**
