from server.controllers.user_controller import user_bp
from server.controllers.csv_controller import csv_bp

def register_routes(app):
    """Register all blueprints with the Flask app"""
    app.register_blueprint(user_bp, url_prefix='/api/user')
    app.register_blueprint(csv_bp, url_prefix='/api/csv')
    
    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return {'status': 'healthy', 'message': 'API is running'}, 200