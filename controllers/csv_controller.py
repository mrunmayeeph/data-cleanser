import pandas as pd
from flask import jsonify, send_file
import os

def clean_csv(file):
    try:
        df = pd.read_csv(file, encoding='utf-8') 
        cleaned_data = df.dropna() 

        temp_csv_path = 'temp_cleaned_data.csv'
        cleaned_data.to_csv(temp_csv_path, index=False)

        response_data = cleaned_data.to_json(orient='records')  

        return jsonify({
            'json_data': response_data,
            'csv_url': '/download_cleaned_csv'
        }), 200
    except Exception as error:
        return jsonify({'error': str(error)}), 500



def get_cleaned_csv():
    try:
        temp_csv_path = 'temp_cleaned_data.csv'
        if not os.path.exists(temp_csv_path):
            return jsonify({'error': 'File not found'}), 404

        response = send_file(
            temp_csv_path,
            as_attachment=True,
            download_name="cleaned_data.csv",
            mimetype="text/csv"
        )

        os.remove(temp_csv_path)
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500