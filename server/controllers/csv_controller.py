# server/controllers/csv_controller.py
# ✅ FIXED: Added numpy import to handle array conversions
from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
import pandas as pd
import numpy as np  # ✅ NEW: Added for numpy type handling
import os
from functools import wraps
import jwt
from datetime import datetime
import redis
from rq import Queue
from typing import Dict, Any
import json


csv_bp = Blueprint('csv', __name__)

# Redis connection for async task queue
redis_conn = redis.Redis(host='localhost', port=6379, db=0)
task_queue = Queue(connection=redis_conn)

# Configuration
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
ALLOWED_EXTENSIONS = {'csv'}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB max file size
CHUNK_SIZE = 10000  # Process 10000 rows at a time

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def token_required(f):
    """JWT authentication decorator"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            token = token.split(" ")[1]
            data = jwt.decode(token, os.getenv('SECRET_KEY', 'dev-secret'), algorithms=['HS256'])
            request.user_id = int(data['user_id'])
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    
    return decorated

def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ✅ FIXED: Added safe conversion helper function
def safe_convert_value(value):
    """Safely convert numpy/pandas values to JSON-serializable Python types"""
    if pd.isna(value):
        return None
    elif isinstance(value, (np.integer, np.int64, np.int32, np.int16, np.int8)):
        return int(value)
    elif isinstance(value, (np.floating, np.float64, np.float32, np.float16)):
        return float(value)
    elif isinstance(value, np.ndarray):
        return value.tolist()
    elif isinstance(value, (np.bool_, bool)):
        return bool(value)
    else:
        return str(value)

def analyze_csv_quality_chunked(file_path: str, sample_size: int = 10000) -> Dict[str, Any]:
    """Analyze CSV data quality using chunked reading for large files"""
    try:
        # ✅ FIXED: Added low_memory=False and dtype=str to avoid type inference issues
        first_chunk = pd.read_csv(file_path, nrows=1000, dtype=str, low_memory=False)
        columns = list(first_chunk.columns)
        
        # ✅ FIXED: Safe dtype detection
        dtypes = {}
        for col in columns:
            try:
                dtypes[col] = str(first_chunk[col].dtype)
            except:
                dtypes[col] = 'object'
        
        # Second pass: Count total rows and collect statistics
        total_rows = 0
        missing_counts = {col: 0 for col in columns}
        unique_trackers = {col: [] for col in columns}
        sample_values = {col: [] for col in columns}
        
        # ✅ FIXED: Process in chunks with safe type handling
        chunk_iterator = pd.read_csv(file_path, chunksize=CHUNK_SIZE, dtype=str, low_memory=False)
        
        for i, chunk in enumerate(chunk_iterator):
            total_rows += len(chunk)
            
            # Track missing values
            for col in columns:
                try:
                    missing_counts[col] += int(chunk[col].isnull().sum())
                except:
                    pass
                
                # ✅ FIXED: Safe unique value tracking
                if i < 3 and len(unique_trackers[col]) < 1000:
                    try:
                        unique_vals = chunk[col].dropna().unique()
                        # Convert numpy array to list of strings safely
                        for val in unique_vals[:100]:
                            val_safe = safe_convert_value(val)
                            if val_safe not in unique_trackers[col]:
                                unique_trackers[col].append(val_safe)

                    except Exception as e:
                        pass  # Skip if conversion fails
                
                # ✅ FIXED: Safe sample value collection
                if len(sample_values[col]) < 3:
                    try:
                        samples = chunk[col].dropna().head(3)
                        for val in samples:
                            if len(sample_values[col]) < 3:
                                sample_values[col].append(safe_convert_value(val))
                    except Exception as e:
                        pass  # Skip if conversion fails
        
        total_columns = len(columns)
        total_cells = total_rows * total_columns
        total_missing = sum(missing_counts.values())
        
        # ✅ FIXED: Safe duplicate check
        try:
            sample_df = pd.read_csv(file_path, nrows=min(sample_size, total_rows), dtype=str, low_memory=False,engine="python", on_bad_lines="skip")
            duplicate_estimate = int(sample_df.duplicated().sum() * (total_rows / max(len(sample_df), 1)))
        except:
            duplicate_estimate = 0
        
        quality_report = {
            'total_rows': int(total_rows),
            'total_columns': int(total_columns),
            'total_cells': int(total_cells),
            'missing_cells': int(total_missing),
            'missing_percentage': round(float(total_missing / total_cells * 100), 2) if total_cells > 0 else 0.0,
            'column_analysis': {},
            'duplicate_rows': int(duplicate_estimate),
            'memory_usage': round(float(os.path.getsize(file_path) / 1024 / 1024), 2),
            'is_large_file': bool(total_rows > 50000)
        }
        
        # ✅ FIXED: Safe column analysis
        for col in columns:
            try:
                unique_count = len(unique_trackers[col])
                quality_report['column_analysis'][col] = {
                    'dtype': dtypes.get(col, 'object'),
                    'missing_count': int(missing_counts[col]),
                    'missing_percentage': round(float(missing_counts[col] / total_rows * 100), 2) if total_rows > 0 else 0.0,
                    'unique_values': int(unique_count) if unique_count < 1000 else '1000+',
                    'sample_values': sample_values[col][:3]
                }
            except Exception as e:
                # Provide minimal info if analysis fails
                quality_report['column_analysis'][col] = {
                    'dtype': 'unknown',
                    'missing_count': 0,
                    'missing_percentage': 0.0,
                    'unique_values': 0,
                    'sample_values': []
                }
        
        return quality_report
        
    except Exception as e:
        raise Exception(f"Error analyzing CSV: {str(e)}")

def preprocess_csv_task_chunked(file_path: str, options: Dict[str, Any]) -> Dict[str, Any]:
    """Background task for heavy preprocessing operations using chunked processing"""
    try:
        output_path = file_path.replace('.csv', '_processed.csv')
        total_rows_processed = 0
        is_first_chunk = True
        
        # Get column info first
        first_chunk = pd.read_csv(file_path, nrows=100, low_memory=False)
        columns = list(first_chunk.columns)
        
        # Standardize column names if requested
        if options.get('standardize_columns'):
            columns = [col.strip().lower().replace(' ', '_') for col in columns]
        
        # For operations that need full data (like remove_duplicates), we need a different approach
        if options.get('remove_duplicates'):
            print("Processing duplicates - loading full file...")
            df = pd.read_csv(file_path, low_memory=False)
            original_rows = len(df)
            df = df.drop_duplicates()
            total_rows_processed = len(df)
            
            # Apply other preprocessing
            df = apply_preprocessing_options(df, options)
            
            # Save
            df.to_csv(output_path, index=False)
            
            return {
                'status': 'success',
                'output_path': output_path,
                'rows_processed': int(total_rows_processed),
                'rows_removed': int(original_rows - total_rows_processed),
                'columns': list(df.columns)
            }
        
        # Process in chunks for other operations
        chunk_iterator = pd.read_csv(file_path, chunksize=CHUNK_SIZE, low_memory=False)
        
        for chunk_num, chunk in enumerate(chunk_iterator):
            # Rename columns if needed
            if options.get('standardize_columns'):
                chunk.columns = columns
            
            # Apply preprocessing
            chunk = apply_preprocessing_options(chunk, options)
            
            # Write to output file
            if is_first_chunk:
                chunk.to_csv(output_path, index=False, mode='w')
                is_first_chunk = False
            else:
                chunk.to_csv(output_path, index=False, mode='a', header=False)
            
            total_rows_processed += len(chunk)
            
            # Update progress
            redis_conn.setex(
                f"progress:{file_path}",
                300,
                json.dumps({'rows_processed': int(total_rows_processed)})
            )
        
        return {
            'status': 'success',
            'output_path': output_path,
            'rows_processed': int(total_rows_processed),
            'columns': columns
        }
    
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e)
        }

def apply_preprocessing_options(df: pd.DataFrame, options: Dict[str, Any]) -> pd.DataFrame:
    """Apply preprocessing options to a DataFrame chunk"""
    
    # Handle missing values
    if options.get('handle_missing') == 'drop':
        df = df.dropna()
    elif options.get('handle_missing') == 'fill_mean':
        numeric_cols = df.select_dtypes(include=['number']).columns
        for col in numeric_cols:
            df[col] = df[col].fillna(df[col].mean())
    elif options.get('handle_missing') == 'fill_median':
        numeric_cols = df.select_dtypes(include=['number']).columns
        for col in numeric_cols:
            df[col] = df[col].fillna(df[col].median())
    elif options.get('handle_missing') == 'fill_mode':
        for col in df.columns:
            if df[col].isnull().any():
                mode_value = df[col].mode()
                if len(mode_value) > 0:
                    df[col].fillna(mode_value[0], inplace=True)
    
    # Trim whitespace
    if options.get('trim_whitespace'):
        for col in df.select_dtypes(include=['object']).columns:
            df[col] = df[col].astype(str).str.strip()
    
    # Convert types
    if options.get('convert_types'):
        for col in df.columns:
            try:
                df[col] = pd.to_numeric(df[col])
            except (ValueError, TypeError):
                pass
    
    return df

@csv_bp.route('/upload', methods=['POST'])
@token_required
def upload_csv():
    """Upload and analyze CSV file - optimized for large files"""
    file_path = None
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Only CSV files are allowed'}), 400
    
    try:
        # Save file
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{request.user_id}_{timestamp}_{filename}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(file_path)
        
        # Check file size
        file_size = os.path.getsize(file_path)
        if file_size > MAX_FILE_SIZE:
            os.remove(file_path)
            return jsonify({'error': f'File size exceeds {MAX_FILE_SIZE / 1024 / 1024}MB limit'}), 400
        
        # ✅ FIXED: Read preview with safe type handling
        try:
            preview_df = pd.read_csv(
                file_path,
                nrows=10,
                engine="python",
                on_bad_lines="skip"
            )
        except Exception:
            preview_df = pd.DataFrame()

        
        # ✅ FIXED: Convert preview to safe JSON format
        preview_records = []
        for _, row in preview_df.iterrows():
            record = {}
            for col in preview_df.columns:
                record[col] = safe_convert_value(row[col])
            preview_records.append(record)
        
        # Analyze quality using chunked reading
        quality_report = analyze_csv_quality_chunked(file_path)
        
        # Store file metadata in Redis
        file_metadata = {
            'original_filename': filename,
            'file_path': file_path,
            'uploaded_at': datetime.now().isoformat(),
            'user_id': request.user_id,
            'file_size': file_size
        }
        redis_conn.setex(
            f"csv_file:{unique_filename}",
            7200,
            json.dumps(file_metadata, default=str)
        )
        
        return jsonify({
            'message': 'File uploaded successfully',
            'file_id': unique_filename,
            'file_size_mb': round(file_size / 1024 / 1024, 2),
            'preview': preview_records,
            'quality_report': quality_report,
            'is_large_file': quality_report.get('is_large_file', False)
        }), 200
    
    except pd.errors.EmptyDataError:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        return jsonify({'error': 'CSV file is empty'}), 400
    except pd.errors.ParserError as e:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        return jsonify({'error': f'Invalid CSV format: {str(e)}'}), 400
    except Exception as e:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

@csv_bp.route('/preprocess', methods=['POST'])
@token_required
def preprocess_csv():
    """Start async preprocessing task - optimized for large files"""
    data = request.get_json()
    file_id = data.get('file_id')
    options = data.get('options', {})
    
    if not file_id:
        return jsonify({'error': 'File ID is required'}), 400
    
    file_data = redis_conn.get(f"csv_file:{file_id}")
    if not file_data:
        return jsonify({'error': 'File not found or expired'}), 404
    
    file_metadata = json.loads(file_data)
    file_path = file_metadata['file_path']
    
    job = task_queue.enqueue(
        preprocess_csv_task_chunked,
        file_path,
        options,
        job_timeout='30m',
        result_ttl=3600
    )
    
    return jsonify({
        'message': 'Preprocessing started',
        'task_id': job.id,
        'status': 'queued',
        'estimated_time': 'This may take several minutes for large files'
    }), 202

@csv_bp.route('/task-status/<task_id>', methods=['GET'])
@token_required
def get_task_status(task_id):
    """Check status of async preprocessing task"""
    from rq.job import Job
    
    try:
        job = Job.fetch(task_id, connection=redis_conn)
        
        if job.is_finished:
            result = job.result
            return jsonify({
                'status': 'completed',
                'result': result
            }), 200
        elif job.is_failed:
            return jsonify({
                'status': 'failed',
                'error': str(job.exc_info)
            }), 200
        else:
            progress_data = redis_conn.get(f"progress:{job.args[0]}")
            progress_info = json.loads(progress_data) if progress_data else {}
            
            return jsonify({
                'status': 'processing',
                'progress': job.meta.get('progress', 0),
                'rows_processed': progress_info.get('rows_processed', 0)
            }), 200
    
    except Exception as e:
        return jsonify({'error': f'Task not found: {str(e)}'}), 404

@csv_bp.route('/download/<file_id>', methods=['GET'])
@token_required
def download_processed_csv(file_id):
    """Download processed CSV file"""
    file_data = redis_conn.get(f"csv_file:{file_id}")
    if not file_data:
        return jsonify({'error': 'File not found or expired'}), 404
    
    file_metadata = json.loads(file_data)
    file_path = file_metadata['file_path'].replace('.csv', '_processed.csv')
    
    if not os.path.exists(file_path):
        return jsonify({'error': 'Processed file not found'}), 404
    
    return send_file(
        file_path,
        mimetype='text/csv',
        as_attachment=True,
        download_name=f"processed_{file_metadata['original_filename']}"
    )

@csv_bp.route('/analyze/<file_id>', methods=['GET'])
@token_required
def analyze_csv(file_id):
    """Get detailed analysis of CSV file"""
    file_data = redis_conn.get(f"csv_file:{file_id}")
    if not file_data:
        return jsonify({'error': 'File not found or expired'}), 404
    
    file_metadata = json.loads(file_data)
    file_path = file_metadata['file_path']
    
    try:
        quality_report = analyze_csv_quality_chunked(file_path)
        
        # ✅ FIXED: Safe statistical analysis
        try:
            sample_df = pd.read_csv(file_path, nrows=10000, low_memory=False)
            numeric_cols = sample_df.select_dtypes(include=['number']).columns
            stats = {}
            
            for col in numeric_cols:
                try:
                    stats[col] = {
                        'mean': float(sample_df[col].mean()),
                        'median': float(sample_df[col].median()),
                        'std': float(sample_df[col].std()),
                        'min': float(sample_df[col].min()),
                        'max': float(sample_df[col].max())
                    }
                except:
                    pass
            
            quality_report['statistics'] = stats
        except:
            quality_report['statistics'] = {}
        
        return jsonify(quality_report), 200
    
    except Exception as e:
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500