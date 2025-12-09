
from flask import request, jsonify
from controllers.csv_controller import clean_csv, get_cleaned_csv
from controllers.user_controller import register, login
from flask_jwt_extended import jwt_required

def init_routes(app):

    @app.route('/register', methods=['POST'])
    def register_route():
        return register()

    @app.route('/login', methods=['POST'])
    def login_route():
        return login()
    
    # @app.route('/logout', methods=['POST'])
    # @jwt_required()
    # def logout_route():
    #     return logout()

    
    @app.route('/clean_csv', methods=['POST'])
    @jwt_required()
    def clean_csv_route():
        file = request.files.get('file')
        if not file:
            return jsonify({'error': 'No file uploaded'}), 400

        return clean_csv(file)

    @app.route('/download_cleaned_csv', methods=['GET'])
    @jwt_required()
    def download_cleaned_csv_route():
        return get_cleaned_csv()
