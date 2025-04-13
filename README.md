# 📊 GSC Report Builder

A comprehensive Next.js application designed to interact with Google Search Console (GSC) data. This platform allows users to connect their Google account, fetch GSC data for their sites, generate reports, analyze search query intents using the Gemini API, and export findings to Google Sheets.

## ✨ Live Demo

[https://gsc-task.vercel.app/](https://gsc-task.vercel.app/)

## 🎥 Demo Video

[Watch Demo Video](https://youtu.be/-u-gBFsnxpc)

## 🔗 GitHub Repository

[https://github.com/naman-makkar/gsc-task](https://github.com/naman-makkar/gsc-task)

## ✨ Features

🔐 **Authentication**

- Secure Google OAuth 2.0 integration.
- Session management using JWT.
- User profile display (name, email, avatar).

📈 **GSC Data Integration**

- List accessible sites from Google Search Console.
- Fetch Search Analytics data (queries, clicks, impressions, CTR, position) based on selected site, date range, metrics, and dimensions.
- Caching mechanism for fetched GSC data (via `reports_data` table).
- User setting to store the currently selected site.

📄 **Report Generation & Management**

- Generate reports based on fetched GSC data.
- Save generated reports to the database (`reports_data` table).
- View a list of previously saved reports.
- Retrieve specific saved reports by ID.

🧠 **AI-Powered Intent Analysis**

- Analyze search queries using Google's Gemini API to determine:
  - User Intent (Informational, Navigational, Transactional, etc.)
  - Topic Category
  - Marketing Funnel Stage
  - Main Keywords/Entities
- Cache analyzed intents (`report_intents` table) to reduce API calls.
- Associate analyzed intents with specific saved reports.
- Fetch existing intents for a report or specific queries.

📤 **Google Sheets Export**

- Export generated and analyzed report data directly to a new Google Sheet in the user's Google Drive.

🔧 **User Interface**

- Interactive tables for displaying GSC data using TanStack Table.
- Date range selection.
- Drag-and-drop interface elements using dnd-kit.
- Clean UI built with Tailwind CSS and Headless UI.

## 🔌 API Endpoints

🔒 **Authentication (`/api/auth`)**

- `GET /google`: Initiates the Google OAuth flow by returning the authorization URL.
- `GET /callback/google`: Handles the redirect from Google after user authorization. Exchanges the code for tokens, creates/updates the user in the database, stores tokens, and sets a session JWT cookie.
- `GET /logout`: Clears the session JWT cookie and redirects the user to the homepage.

👤 **User (`/api/user`)**

- `GET /profile`: Retrieves the authenticated user's profile information (email, name, avatar).

📈 **Google Search Console (`/api/gsc`)**

- `GET /sites`: Lists all websites accessible by the authenticated user in their GSC account.
- `POST /fetchData`: Fetches Search Analytics data from GSC for a specified site, date range, metrics, and dimensions. Includes caching logic.
- `POST /generate-report`: Generates a report by fetching GSC data.
- `GET /selected-site`: Retrieves the user's currently selected default site from settings.
- `POST /selected-site`: Updates the user's default selected site.

📄 **Reports (`/api/reports`)**

- `POST /save`: Saves the data of a generated report to the database, associating it with the user and generating a cache key.
- `GET /get`: Retrieves a list of all saved reports for the user, or fetches the data for a specific report if `reportId` is provided.

🧠 **Gemini AI (`/api/gemini`)**

- `POST /analyze-intents`: Analyzes a list of search queries using the Gemini API. Checks for cached results first, then calls the API for new queries, and stores the analysis associated with a `reportId`.
- `GET /report-intents`: Retrieves all cached intent analyses associated with a specific `reportId`.
- `POST /existing-intents`: Checks the cache for existing intent analyses for a given list of queries without triggering new Gemini calls.

📤 **Google Sheets (`/api/sheets`)**

- `POST /export`: Creates a new Google Sheet in the user's account and populates it with the provided report data (headers and rows).

## 🛠️ Technologies Used

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Headless UI, Framer Motion, Lucide Icons, Shadcn UI
- **Tables:** TanStack Table (@tanstack/react-table)
- **Drag & Drop:** dnd-kit
- **State Management:** React Context API / Zustand
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Google OAuth 2.0, JWT (jose, jsonwebtoken)
- **APIs:** Google Search Console API (googleapis), Gemini API (@google/generative-ai), Google Sheets API (googleapis)
- **Date Handling:** date-fns, react-date-range
- **Linting/Formatting:** ESLint

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (Version 20 or later recommended)
- npm or yarn or pnpm
- Supabase Account & Project
- Google Cloud Project with OAuth Credentials & Enabled APIs (Search Console API, Google Sheets API)
- Gemini API Key (from Google AI Studio)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/naman-makkar/gsc-task.git
    cd gsc-report-builder
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Set up Supabase:**

    - Create a new project on [Supabase](https://supabase.com/).
    - In the SQL Editor, run the contents of the files in `supabase/migrations` (`20240602_create_reports_data.sql`, `20240603_create_report_intents.sql`) to create the necessary tables. You will also need the `users`, `tokens`, and `user_settings` tables (schemas described above - create them manually or infer from application logic if migrations are missing).
    - Get your Project URL and Anon Key from Project Settings > API.
    - Get your Service Role Key from Project Settings > API (keep this secret!).

4.  **Set up Google Cloud Project:**

    - Create a project on [Google Cloud Console](https://console.cloud.google.com/).
    - Enable the "Google Search Console API" and "Google Sheets API".
    - Go to APIs & Services > Credentials.
    - Create OAuth 2.0 Client IDs credentials (Type: Web application).
    - Add `http://localhost:3000` to "Authorized JavaScript origins".
    - Add `http://localhost:3000/api/auth/callback/google` to "Authorized redirect URIs".
    - Note your Client ID and Client Secret.

5.  **Get Gemini API Key:**

    - Visit [Google AI Studio](https://aistudio.google.com/app/apikey) and create an API key.

6.  **Configure environment variables:**
    Create a `.env.local` file in the root of the project and add the following variables:

    ```plaintext
    # Google OAuth (from Google Cloud Console)
    GOOGLE_CLIENT_ID=<Your Google Client ID>
    GOOGLE_CLIENT_SECRET=<Your Google Client Secret>
    GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google

    # Supabase (from Supabase Project Settings)
    NEXT_PUBLIC_SUPABASE_URL=<Your Supabase Project URL>
    NEXT_PUBLIC_SUPABASE_ANON_KEY=<Your Supabase Anon Key>
    SUPABASE_SERVICE_ROLE_KEY=<Your Supabase Service Role Key>

    # Auth (Generate a secure random string for JWT)
    JWT_SECRET=<Your Secure JWT Secret - e.g., openssl rand -hex 32>
    COOKIE_NAME=gsc_auth_token # Or your preferred cookie name

    # Gemini API Key (from Google AI Studio)
    GEMINI_API_KEY=<Your Gemini API Key>
    ```

    **Important:** The `scripts/check-env.js` script ensures required variables are set before running `dev` or `build` commands.

7.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📜 Available Scripts

- `npm run dev`: Runs the app in development mode.
- `npm run build`: Builds the app for production.
- `npm run start`: Starts the production server (requires `build` first).
- `npm run lint`: Lints the project files.
- `npm run check-env`: Checks if required environment variables are set.

## 🌐 Deployment

The easiest way to deploy this Next.js application is using the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Ensure you configure the environment variables in your Vercel project settings.

## 🙏 Acknowledgements

- thank you :)
