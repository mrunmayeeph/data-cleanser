from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os
from models.user_model import db
from routes import init_routes
from models.BlocklistedToken import BlocklistedToken

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///user_database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
jwt = JWTManager(app)
# @jwt.token_in_blocklist_loader
# def check_if_token_in_blocklist(decrypted_token):
#     jti = decrypted_token['jti']
#     return BlocklistedToken.query.filter_by(token=jti).scalar() is not None


db.init_app(app)
init_routes(app)

if __name__ == '__main__':
    app.run(debug=True)
