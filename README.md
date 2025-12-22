# Data cleanser - CSV Cleaner

**Data cleanser** is a web application that automatically cleans CSV files by removing missing values. It's designed to be simple yet effective, allowing users to upload a CSV file, clean the data, and download the cleaned CSV file.

## Features

Secure Authentication -JWT-based login, protected routes, profile management, and password updates.
Scalable CSV Upload -Upload CSV files up to 100MB with real-time progress tracking and large-file detection.
Data Quality Analysis -Automatic insights on rows, columns, missing values, duplicates, and column-wise statistics.
Configurable Preprocessing -User-controlled cleaning options including duplicate removal, column standardization, whitespace trimming, type conversion, and missing-value handling.
Asynchronous Processing -Background preprocessing using Redis + RQ with live status updates and progress polling.
Preview & Export -Preview sample rows and download the processed CSV.
Processing History -Tracks recent jobs with file metadata, row counts, and processing status.

## Tech Stack

🎨 Client (Frontend)

React (TypeScript) – Component-based UI with type safety
React Router – Protected and public route handling
Axios – API communication with progress tracking
CSS (Custom + Responsive) – Clean dashboard UI with sidebar navigation and modular styling
LocalStorage – Persist user session data and processing history

⚙️ Server (Backend)

Flask (Python) – RESTful API development
Flask-SQLAlchemy – ORM-based database interactions
SQLite – Lightweight relational database
JWT (PyJWT) – Secure token-based authentication
Pandas & NumPy – Efficient CSV parsing, analysis, and preprocessing
Redis + RQ – Asynchronous background task execution for large files

🔧 Infrastructure & Utilities

dotenv – Environment variable management
Werkzeug – Secure file handling and request processing

## Project Structure

```bash
datacleanser/
│
├── client/                     # Frontend (React + TypeScript)
│   └── src/
│       ├── components/         # Core UI components
│       │   ├── CSVUpload.tsx   # Upload, analysis & preprocessing UI
│       │   ├── Dashboard.tsx   # Main dashboard
│       │   ├── DataVisualisation.tsx
│       │   ├── Login.tsx
│       │   └── ThemeToggle.tsx
│       │
│       ├── api_service.ts      # Axios API abstraction
│       └── App.tsx             # Routing & protected routes
│
├── server/                     # Backend (Flask)
│   ├── controllers/            # REST API controllers
│   │   ├── csv_controller.py   # CSV upload, analysis, preprocessing
│   │   └── user_controller.py  # Authentication & user management
│   │
│   ├── models/                 # Database models
│   │   ├── user_model.py
│   │   └── token_model.py
│   │
│   ├── app.py                  # Flask app entry point
│   ├── routes.py               # API route registration
│   └── extensions.py           # DB & JWT configuration
│
├── README.md
└── requirements.txt



```





