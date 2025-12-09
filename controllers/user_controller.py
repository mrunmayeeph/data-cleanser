from flask import request, jsonify
from models.user_model import db, User
from models.BlocklistedToken import BlocklistedToken
from flask_jwt_extended import create_access_token, get_jwt_identity, get_jwt


def register():
    try:
        data = request.json
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')

        if not username or not password or not email:
            return jsonify({'message': 'Username, email, and password are required'}), 400

        if User.query.filter_by(username=username).first():
            return jsonify({'message': 'User already exists'}), 400

        new_user = User(username=username, email=email)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()

        return jsonify({'message': 'User registered successfully'}), 201
    except Exception as error:
        return jsonify({'error': str(error)}), 500


def login():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')

        print(f"Login attempt: email={email}, password={password}")

        if not email or not password:
            print("Missing email or password")
            return jsonify({'message': 'Email and password are required'}), 400

        user = User.query.filter_by(email=email).first()
        print(f"User found: {user}")

        if not user:
            print("No user found with that email")
        else:
            print(f"Checking password for user: {user.username}")
            if not user.check_password(password):
                print("Password check failed")

        if not user or not user.check_password(password):
            return jsonify({'message': 'Invalid email or password'}), 401

        access_token = create_access_token(identity=user.id)
        print("Login successful")
        return jsonify(access_token=access_token), 200
    except Exception as error:
        print(f"Exception during login: {error}")
        return jsonify({'error': str(error)}), 500


def logout():
     try:
         identity = get_jwt_identity()
         jti = get_jwt()['jti']
        
         blacklisted_token = BlocklistedToken(token=jti)
         db.session.add(blacklisted_token)
         db.session.commit()
        
         return jsonify({'message': 'Successfully logged out'}), 200
     except Exception as error:
         return jsonify({'error': str(error)}), 500