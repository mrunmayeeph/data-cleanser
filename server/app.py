from flask import Flask
from flask_cors import CORS
from server.extensions import db
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///data_cleanser.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 16MB max file size

app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
# Enable CORS
CORS(
    app,
    resources={r"/api/*": {"origins": "http://localhost:3000"}},
    supports_credentials=True
)


# Initialize SQLAlchemy
db.init_app(app)

# Import and register routes
from server.routes import register_routes
register_routes(app)

@app.errorhandler(413)
def request_entity_too_large(error):
    return {'error': 'File too large. Maximum size is 100MB'}, 413


@app.errorhandler(504)
def gateway_timeout(error):
    return {'error': 'Request timeout. File processing is taking longer than expected.'}, 504

if __name__ == '__main__':
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
    
    # Run the app
    app.run(
        debug=os.getenv('FLASK_DEBUG', 'True') == 'True',
        host='0.0.0.0',
        port=5000
    )