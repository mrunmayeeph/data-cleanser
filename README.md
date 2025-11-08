# Data Fixer - CSV Cleaner

**Data Fixer** is a web application that automatically cleans CSV files by removing missing values. It's designed to be simple yet effective, allowing users to upload a CSV file, clean the data, and download the cleaned CSV file.

<p align="center">
  <img src="./client/public/pic1.png?raw=true" width="300" height="420">
  <img src="./client/public/pic2.png?raw=true" width="300" height="420">
</p>

<p align="center">
  <img src="./client/public/pic3.png?raw=true" width="500" height="350">
</p>


<p align="center">
  <img src="./client/public/pic4.png?raw=true" width="400" height="450">
  <img src="./client/public/pic5.png?raw=true" width="400" height="450">
</p>

## Features

- **CSV Upload**: Upload a CSV file from your computer.
- **Automatic Cleaning**: The app automatically removes rows with missing values from the CSV file.
- **Download Cleaned Data**: Download the cleaned CSV file for further use.
- **Secure Authentication**: Users must log in to use the service, ensuring secure access.

## Tech Stack

### Client (Frontend)

<p align-"left"> 
<img src="https://img.shields.io/badge/typescript-037acb?style=for-the-badge&logo=typescript&logoColor=white">
<img src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB">
<img src="https://img.shields.io/badge/css-254bdd?style=for-the-badge&logo=css3&logoColor=white">
</p>

- **TypeScript**: A typed superset of JavaScript that helps catch errors at compile time.
- **React**: JavaScript library for building user interfaces.
- **CSS**: Styling language used to design the look and feel of the application.


### Server (Backend)
<p align-"left"> 
<img src="https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=white">
<img src="https://img.shields.io/badge/flask-%23000.svg?style=for-the-badge&logo=flask&logoColor=white">
<img src="https://img.shields.io/badge/sqlite-67bbe7?style=for-the-badge&logo=sqlite&logoColor=white">
<img src="https://img.shields.io/badge/sqlAlchemy-c22820?style=for-the-badge&logo=sqlalchemy&logoColor=white">
</p>


- **Flask**: A lightweight WSGI web application framework for Python.
- **SQLite**: A C library that provides a lightweight, disk-based database.
- **SQLAlchemy**: A SQL toolkit and Object-Relational Mapping (ORM) library for Python.

## Project Structure

```bash
data-fixer/
│
├── client/                      # React frontend
│   ├── .gitignore               # Git ignore file for client
│   ├── src/                     # Source files
│   │   ├── components/          # React components
│   │   ├── api_service.ts       # API service for making requests to the backend
│   │   ├── App.tsx              # Main React component
│   │   ├── index.tsx            # Entry point for the React app
│   │   └── ...                  # Other frontend files
│   └── public/                  # Public assets
│
├── server/                      # Flask backend
│   ├── .gitignore               # Git ignore file for server
│   ├── app.py                   # Flask app entry point and configuration
│   ├── models/                  # Database models (SQLAlchemy)
│   │   ├── user_model.py        # User model
│   │   └── token_model.py       # Blacklisted token model
│   ├── controllers/             # Controllers for handling routes
│   │   ├── csv_controller.py    # Controller for CSV cleaning operations
│   │   └── user_controller.py   # Controller for user operations (register, login, logout)
│   ├── routes.py                # Route definitions
│   ├── utils/                   # Utility scripts
│   │   └── create_tables.py     # Script to create tables if they don't exist
│   └── ...                      # Other backend files
│
├── requirements.txt             # Python dependencies
└── README.md                    # Project documentation

```


## Getting Started

### 🔵 Prerequisites

- **Node.js**: Make sure you have Node.js installed (for the frontend).
- **Python**: Ensure Python 3.x is installed (for the backend).
- **SQLite**: No need for a separate installation; SQLite is built into Python.

### 🔵 Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/data-fixer.git
cd data-fixer
```

#### 2. Install Frontend Dependencies
```bash
cd client
npm install 
```
#### 3. Install Backend Dependencies
```bash
cd ../server

# Create a virtual environment
python -m venv your_venv

# Activate it
source your_venv/bin/activate # on macOS/Linux
venv\Scripts\activate # on Windows

# NOTE: You should see (venv) prefixed to your command prompt, indicating that the virtual environment is active.

# Install the backend dependencies:
pip install -r requirements.txt
```
#### 4. Set Up the Database

The database configuration is already handled within the `app.py` file. By default, it uses SQLite and stores the database in the project directory.

To create the database tables, simply run the following command:
```bash
python server/utils/create_tables.py
```
This script will initialize the database and create the necessary tables based on your SQLAlchemy models.

You only need to run this script once, or whenever you modify your database models and need to update the schema.

### 5. Configure Environment Variables
Create a `.env` file in the server directory to store your **JWT secret key**. You can generate a JWT secret key using the following command in the Terminal:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Save the generated key in your `.env` file like this:
```bash
JWT_SECRET_KEY=your_generated_secret_key
```


**🚨IMPORTANT NOTE🚨:**
Make sure that the database file (e.g., `your_database.db`), the virtual environment directory (e.g., `venv`), and the `.env` file are ignored by Git to prevent them from being tracked in version control. These entries should be included in your **.gitignore** file.


### 🔵 Running the Application
#### 1. Start the Backend Server
```bash
cd server
flask run
```

#### 2. Start the Frontend Development Server
```bash
cd client
npm start
```
### 🔵 Usage
1. **Register/Login**: Use the registration and login features to authenticate.
2. **Upload CSV**: Navigate to the upload section and select your CSV file.
3. **Clean CSV**: Click on the "Clean" button to automatically remove rows with missing values.
4. **Download Cleaned CSV**: After the cleaning process, download the cleaned CSV file.
### 🔵 API Endpoints
- `POST /register`: Register a new user.
- `POST /login`: Log in and receive a JWT token.
- `POST /clean_csv`: Upload and clean a CSV file (removes missing values).
- `GET /download_cleaned_csv`: Download the cleaned CSV file.