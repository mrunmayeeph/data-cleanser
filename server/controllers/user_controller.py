# server/controllers/user_controller.py
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta
from functools import wraps
import os
import re

user_bp = Blueprint('user', __name__)

# Import models (assuming SQLAlchemy setup)
from server.models.user_model import User
from server.models.token_model import BlacklistedToken
from server.extensions import db

SECRET_KEY = os.getenv('SECRET_KEY')
TOKEN_EXPIRY_HOURS = 24

def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password: str) -> tuple[bool, str]:
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    return True, ""

def token_required(f):
    """JWT authentication decorator"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token.split(" ")[1]
            
            # Check if token is blacklisted
            blacklisted = BlacklistedToken.query.filter_by(token=token).first()
            if blacklisted:
                return jsonify({'error': 'Token has been revoked'}), 401
            
            # Decode token
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])
            
            if not current_user:
                return jsonify({'error': 'User not found'}), 401
            
            request.current_user = current_user
            
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        except Exception as e:
            return jsonify({'error': f'Authentication failed: {str(e)}'}), 401
        
        return f(*args, **kwargs)
    
    return decorated

@user_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    
    # Validate required fields
    email = data.get('email', '').strip()
    password = data.get('password', '')
    username = data.get('username', '').strip()
    
    if not email or not password or not username:
        return jsonify({'error': 'Email, username, and password are required'}), 400
    
    # Validate email format
    if not validate_email(email):
        return jsonify({'error': 'Invalid email format'}), 400
    
    # Validate password strength
    is_valid, error_msg = validate_password(password)
    if not is_valid:
        return jsonify({'error': error_msg}), 400
    
    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409
    
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already taken'}), 409
    
    try:
        # Create new user
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        new_user = User(
            email=email,
            username=username,
            password=hashed_password,
            created_at=datetime.utcnow()
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'message': 'User registered successfully',
            'user': {
                'id': new_user.id,
                'email': new_user.email,
                'username': new_user.username
            }
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@user_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token"""
    data = request.get_json()
    
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    try:
        # Find user
        user = User.query.filter_by(email=email).first()
        
        if not user or not check_password_hash(user.password, password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Generate JWT token
        token_payload = {
            'user_id': user.id,
            'email': user.email,
            'exp': datetime.utcnow() + timedelta(hours=TOKEN_EXPIRY_HOURS),
            'iat': datetime.utcnow()
        }
        
        token = jwt.encode(token_payload, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username
            },
            'expires_in': TOKEN_EXPIRY_HOURS * 3600  # seconds
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500

@user_bp.route('/logout', methods=['POST'])
@token_required
def logout():
    """Logout user and blacklist token"""
    token = request.headers.get('Authorization')
    
    if token.startswith('Bearer '):
        token = token.split(" ")[1]
    
    try:
        # Decode to get expiration time
        decoded = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        exp_timestamp = decoded['exp']
        
        # Add token to blacklist
        blacklisted_token = BlacklistedToken(
            token=token,
            blacklisted_on=datetime.utcnow(),
            expires_at=datetime.fromtimestamp(exp_timestamp)
        )
        
        db.session.add(blacklisted_token)
        db.session.commit()
        
        return jsonify({'message': 'Logout successful'}), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Logout failed: {str(e)}'}), 500

@user_bp.route('/refresh-token', methods=['POST'])
@token_required
def refresh_token():
    """Refresh JWT token"""
    try:
        user = request.current_user
        
        # Generate new token
        token_payload = {
            'user_id': user.id,
            'email': user.email,
            'exp': datetime.utcnow() + timedelta(hours=TOKEN_EXPIRY_HOURS),
            'iat': datetime.utcnow()
        }
        
        new_token = jwt.encode(token_payload, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            'message': 'Token refreshed successfully',
            'token': new_token,
            'expires_in': TOKEN_EXPIRY_HOURS * 3600
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Token refresh failed: {str(e)}'}), 500

@user_bp.route('/profile', methods=['GET'])
@token_required
def get_profile():
    """Get current user profile"""
    user = request.current_user
    
    return jsonify({
        'user': {
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'created_at': user.created_at.isoformat(),
            'last_login': user.last_login.isoformat() if user.last_login else None
        }
    }), 200

@user_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile():
    """Update user profile"""
    user = request.current_user
    data = request.get_json()
    
    try:
        if 'username' in data:
            username = data['username'].strip()
            if username != user.username:
                # Check if username is already taken
                existing = User.query.filter_by(username=username).first()
                if existing:
                    return jsonify({'error': 'Username already taken'}), 409
                user.username = username
        
        if 'email' in data:
            email = data['email'].strip()
            if not validate_email(email):
                return jsonify({'error': 'Invalid email format'}), 400
            if email != user.email:
                # Check if email is already registered
                existing = User.query.filter_by(email=email).first()
                if existing:
                    return jsonify({'error': 'Email already registered'}), 409
                user.email = email
        
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username
            }
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Update failed: {str(e)}'}), 500

@user_bp.route('/change-password', methods=['POST'])
@token_required
def change_password():
    """Change user password"""
    user = request.current_user
    data = request.get_json()
    
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    
    if not current_password or not new_password:
        return jsonify({'error': 'Current and new password are required'}), 400
    
    # Verify current password
    if not check_password_hash(user.password, current_password):
        return jsonify({'error': 'Current password is incorrect'}), 401
    
    # Validate new password
    is_valid, error_msg = validate_password(new_password)
    if not is_valid:
        return jsonify({'error': error_msg}), 400
    
    try:
        user.password = generate_password_hash(new_password, method='pbkdf2:sha256')
        db.session.commit()
        
        return jsonify({'message': 'Password changed successfully'}), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Password change failed: {str(e)}'}), 500