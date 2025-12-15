"""Utility script to create database tables"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from server.app import app, db
from server.models.user_model import User
from server.models.token_model import BlacklistedToken

def create_tables():
    """Create all database tables"""
    with app.app_context():
        print("Creating database tables...")
        db.create_all()
        print("✓ Database tables created successfully!")
        
        # Print table names
        print("\nTables created:")
        for table in db.metadata.tables.keys():
            print(f"  - {table}")

if __name__ == '__main__':
    create_tables()