// client/src/components/CSVUpload.tsx
import React, { useState, useCallback } from 'react';
import ApiService, { CSVUploadResponse, PreprocessOptions, TaskStatusResponse } from '../api_service';
import './CSVUpload.css';

interface ProcessedFile {
  id: string;
  filename: string;
  uploadDate: string;
  status: 'completed' | 'failed';
  rowsProcessed?: number;
  fileSize?: number;
}

interface CSVUploadProps {
  onUploadSuccess?: (data: CSVUploadResponse) => void;
}

const CSVUpload: React.FC<CSVUploadProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedData, setUploadedData] = useState<CSVUploadResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [taskStatus, setTaskStatus] = useState<TaskStatusResponse | null>(null);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentFileId, setCurrentFileId] = useState<string>('');
  const [isLargeFile, setIsLargeFile] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  
  const [preprocessOptions, setPreprocessOptions] = useState<PreprocessOptions>({
    remove_duplicates: false,
    handle_missing: undefined,
    standardize_columns: false,
    trim_whitespace: false,
    convert_types: false,
  });

  // Constants
  const MAX_FILE_SIZE_MB = 100;
  const LARGE_FILE_THRESHOLD_MB = 50;

  // Load processing history from localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem('processedFiles');
    if (saved) {
      setProcessedFiles(JSON.parse(saved));
    }
  }, []);

  const saveToHistory = (
    fileId: string, 
    filename: string, 
    status: 'completed' | 'failed', 
    rowsProcessed?: number,
    fileSize?: number
  ) => {
    const newFile: ProcessedFile = {
      id: fileId,
      filename,
      uploadDate: new Date().toISOString(),
      status,
      rowsProcessed,
      fileSize
    };
    const updated = [newFile, ...processedFiles].slice(0, 10); // Keep last 10
    setProcessedFiles(updated);
    localStorage.setItem('processedFiles', JSON.stringify(updated));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const estimateProcessingTime = (fileSizeMB: number): string => {
    if (fileSizeMB < 10) return '~30 seconds';
    if (fileSizeMB < 25) return '~1 minute';
    if (fileSizeMB < 50) return '~2 minutes';
    if (fileSizeMB < 75) return '~3-4 minutes';
    return '~5-7 minutes';
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const selectedFile = e.target.files?.[0];
    
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      
      // Check file size
      const fileSizeMB = selectedFile.size / 1024 / 1024;
      
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        setError(`File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum limit of ${MAX_FILE_SIZE_MB}MB`);
        return;
      }
      
      // Check if it's a large file
      const isLarge = fileSizeMB >= LARGE_FILE_THRESHOLD_MB;
      setIsLargeFile(isLarge);
      
      if (isLarge) {
        const time = estimateProcessingTime(fileSizeMB);
        setEstimatedTime(time);
      }
      
      setFile(selectedFile);
      setUploadedData(null);
      setTaskStatus(null);
    }
  }, []);

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      const response = await ApiService.uploadCSV(file, (progress) => {
        setUploadProgress(progress);
      });
      
      setUploadedData(response);
      setCurrentFileId(response.file_id);
      setIsLargeFile(response.is_large_file || false);
      
      if (onUploadSuccess) {
        onUploadSuccess(response);
      }
    } catch (err) {
      setError(ApiService.handleError(err));
    } finally {
      setUploading(false);
    }
  };

  const handlePreprocess = async () => {
    if (!uploadedData) return;

    // Warning for large files with remove_duplicates
    if (isLargeFile && preprocessOptions.remove_duplicates) {
      const confirmed = window.confirm(
        'Warning: Removing duplicates from large files may take significant time and memory. ' +
        'Consider processing without this option first. Continue anyway?'
      );
      if (!confirmed) return;
    }

    setProcessing(true);
    setError('');
    setTaskStatus({ status: 'queued' });

    try {
      const response = await ApiService.preprocessCSV(uploadedData.file_id, preprocessOptions);
      
      if (response.estimated_time) {
        setEstimatedTime(response.estimated_time);
      }
      
      await ApiService.pollTaskStatus(response.task_id, (status) => {
        setTaskStatus(status);
        
        if (status.status === 'completed') {
          saveToHistory(
            uploadedData.file_id,
            file?.name || 'unknown.csv',
            'completed',
            status.result?.rows_processed,
            file?.size
          );
        } else if (status.status === 'failed') {
          saveToHistory(
            uploadedData.file_id,
            file?.name || 'unknown.csv',
            'failed',
            undefined,
            file?.size
          );
        }
      });
      
      setProcessing(false);
    } catch (err) {
      setError(ApiService.handleError(err));
      setProcessing(false);
      if (file) {
        saveToHistory(uploadedData.file_id, file.name, 'failed', undefined, file?.size);
      }
    }
  };

  const handleDownload = async (fileId?: string) => {
    const downloadFileId = fileId || uploadedData?.file_id;
    if (!downloadFileId) return;

    try {
      const blob = await ApiService.downloadProcessedCSV(downloadFileId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed_${file?.name || 'data.csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(ApiService.handleError(err));
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadedData(null);
    setTaskStatus(null);
    setError('');
    setUploadProgress(0);
    setProcessing(false);
    setIsLargeFile(false);
    setEstimatedTime('');
    const input = document.getElementById('csv-file') as HTMLInputElement;
    if (input) input.value = '';
  };

  return (
    <div className="csv-upload-wrapper">
      {error && (
        <div className="alert alert-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
            <line x1="15" y1="9" x2="9" y2="15" strokeWidth="2"/>
            <line x1="9" y1="9" x2="15" y2="15" strokeWidth="2"/>
          </svg>
          {error}
          <button onClick={() => setError('')} className="close-btn">×</button>
        </div>
      )}

      {/* Large File Warning */}
      {isLargeFile && !uploadedData && (
        <div className="alert alert-warning">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeWidth="2"/>
            <line x1="12" y1="9" x2="12" y2="13" strokeWidth="2"/>
            <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2"/>
          </svg>
          <div>
            <strong>Large File Detected</strong>
            <p>This file is {formatFileSize(file?.size || 0)}. Processing may take {estimatedTime}.</p>
          </div>
        </div>
      )}

      <div className="main-grid">
        {/* Upload Section */}
        <div className="card upload-card">
          <div className="card-header">
            <h2>Upload CSV File</h2>
            <button className="btn-icon" onClick={() => setShowHistory(!showHistory)} title="View History">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                <polyline points="12 6 12 12 16 14" strokeWidth="2"/>
              </svg>
            </button>
          </div>
          
          <div className="upload-area">
            <input
              type="file"
              id="csv-file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={uploading}
              className="file-input"
            />
            <label htmlFor="csv-file" className="file-label">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeWidth="2"/>
              </svg>
              <span className="upload-text">
                {file ? file.name : 'Click to browse or drag & drop CSV file'}
              </span>
              {file && (
                <span className="file-size">
                  {formatFileSize(file.size)}
                  {isLargeFile && <span className="large-badge">Large File</span>}
                </span>
              )}
              <span className="file-limit">Maximum file size: {MAX_FILE_SIZE_MB}MB</span>
            </label>
          </div>

          {uploading && (
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }}>
                  {uploadProgress}%
                </div>
              </div>
              <p className="progress-text">
                Uploading... {uploadProgress < 100 ? 'Please wait' : 'Processing file'}
              </p>
            </div>
          )}

          <div className="button-group">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="btn btn-primary"
            >
              {uploading ? 'Uploading...' : 'Upload & Analyze'}
            </button>
            {uploadedData && (
              <button onClick={resetUpload} className="btn btn-secondary">
                Upload New File
              </button>
            )}
          </div>
        </div>

        {/* Quality Report */}
        {uploadedData && (
          <div className="card quality-card">
            <div className="card-header">
              <h2>Data Quality Report</h2>
              {uploadedData.is_large_file && (
                <span className="large-file-badge">Large File Mode</span>
              )}
            </div>
            
            <div className="stats-grid">
              <div className="stat-box stat-primary">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <span className="stat-value">{uploadedData.quality_report.total_rows.toLocaleString()}</span>
                  <span className="stat-label">Total Rows</span>
                </div>
              </div>
              <div className="stat-box stat-success">
                <div className="stat-icon">📋</div>
                <div className="stat-content">
                  <span className="stat-value">{uploadedData.quality_report.total_columns}</span>
                  <span className="stat-label">Columns</span>
                </div>
              </div>
              <div className="stat-box stat-warning">
                <div className="stat-icon">⚠️</div>
                <div className="stat-content">
                  <span className="stat-value">{uploadedData.quality_report.missing_percentage.toFixed(2)}%</span>
                  <span className="stat-label">Missing Data</span>
                </div>
              </div>
              <div className="stat-box stat-danger">
                <div className="stat-icon">🔄</div>
                <div className="stat-content">
                  <span className="stat-value">{uploadedData.quality_report.duplicate_rows}</span>
                  <span className="stat-label">Duplicates{uploadedData.is_large_file ? '*' : ''}</span>
                </div>
              </div>
            </div>

            {uploadedData.is_large_file && (
              <div className="info-box">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                  <line x1="12" y1="16" x2="12" y2="12" strokeWidth="2"/>
                  <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth="2"/>
                </svg>
                <small>
                  *Analysis based on sample for large files. Duplicate count is estimated. 
                  File size: {(uploadedData.file_size_mb ?? 0).toFixed(2)}MB
                </small>
              </div>
            )}

            <div className="column-analysis">
              <h3>Column Analysis</h3>
              <div className="columns-grid">
                {Object.entries(uploadedData.quality_report.column_analysis).map(([col, analysis]) => (
                  <div key={col} className="column-item">
                    <div className="column-header">
                      <strong>{col}</strong>
                      <span className="column-type">{analysis.dtype}</span>
                    </div>
                    <div className="column-stats">
                      <span>Missing: {analysis.missing_percentage.toFixed(1)}%</span>
                      <span>Unique: {analysis.unique_values}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Preprocessing Options */}
        {uploadedData && (
          <div className="card preprocess-card">
            <div className="card-header">
              <h2>Preprocessing Options</h2>
            </div>
            
            <div className="options-list">
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={preprocessOptions.remove_duplicates}
                  onChange={(e) => setPreprocessOptions({
                    ...preprocessOptions,
                    remove_duplicates: e.target.checked
                  })}
                />
                <div className="option-content">
                  <strong>Remove Duplicate Rows</strong>
                  <small>
                    Delete identical rows from the dataset
                    {isLargeFile && ' (May be slow for large files)'}
                  </small>
                </div>
              </label>

              <label className="option-item">
                <input
                  type="checkbox"
                  checked={preprocessOptions.standardize_columns}
                  onChange={(e) => setPreprocessOptions({
                    ...preprocessOptions,
                    standardize_columns: e.target.checked
                  })}
                />
                <div className="option-content">
                  <strong>Standardize Column Names</strong>
                  <small>Convert to lowercase and replace spaces with underscores</small>
                </div>
              </label>

              <label className="option-item">
                <input
                  type="checkbox"
                  checked={preprocessOptions.trim_whitespace}
                  onChange={(e) => setPreprocessOptions({
                    ...preprocessOptions,
                    trim_whitespace: e.target.checked
                  })}
                />
                <div className="option-content">
                  <strong>Trim Whitespace</strong>
                  <small>Remove leading and trailing spaces from text</small>
                </div>
              </label>
              
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={preprocessOptions.convert_types}
                  onChange={(e) => setPreprocessOptions({
                    ...preprocessOptions,
                    convert_types: e.target.checked
                  })}
                />
                <div className="option-content">
                  <strong>Auto-convert Data Types</strong>
                  <small>Automatically detect and convert column types</small>
                </div>
              </label>

              <div className="select-option">
                <label>Handle Missing Values:</label>
                <select
                  value={preprocessOptions.handle_missing || ''}
                  onChange={(e) => setPreprocessOptions({
                    ...preprocessOptions,
                    handle_missing: e.target.value as any || undefined
                  })}
                  className="select-input"
                >
                  <option value="">None</option>
                  <option value="drop">Drop rows with missing values</option>
                  <option value="fill_mean">Fill with mean (numeric only)</option>
                  <option value="fill_median">Fill with median (numeric only)</option>
                  <option value="fill_mode">Fill with mode (most frequent)</option>
                </select>
              </div>
            </div>

            {isLargeFile && estimatedTime && (
              <div className="info-box">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                  <polyline points="12 6 12 12 16 14" strokeWidth="2"/>
                </svg>
                <small>Estimated processing time: {estimatedTime}</small>
              </div>
            )}

            <button
              onClick={handlePreprocess}
              disabled={processing || taskStatus?.status === 'completed'}
              className="btn btn-process"
            >
              {processing ? 'Processing...' : taskStatus?.status === 'completed' ? 'Completed' : 'Start Preprocessing'}
            </button>
          </div>
        )}

        {/* Processing Status */}
        {taskStatus && (
          <div className="card status-card">
            <div className="card-header">
              <h2>Processing Status</h2>
            </div>
            
            <div className="status-content">
              {taskStatus.status === 'queued' && (
                <div className="status-item status-queued">
                  <div className="spinner-small"></div>
                  <span>Queued - Waiting to start...</span>
                </div>
              )}
              
              {taskStatus.status === 'processing' && (
                <div className="status-item status-processing">
                  <div className="spinner-small"></div>
                  <div>
                    <span>Processing your data...</span>
                    {taskStatus.rows_processed && (
                      <p className="progress-detail">
                        Processed {taskStatus.rows_processed.toLocaleString()} rows
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {taskStatus.status === 'completed' && (
                <div className="status-item status-completed">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeWidth="2"/>
                    <polyline points="22 4 12 14.01 9 11.01" strokeWidth="2"/>
                  </svg>
                  <div>
                    <strong>Processing Completed!</strong>
                    <p>Processed {taskStatus.result?.rows_processed?.toLocaleString() || 0} rows successfully</p>
                  </div>
                </div>
              )}
              
              {taskStatus.status === 'failed' && (
                <div className="status-item status-failed">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                    <line x1="15" y1="9" x2="9" y2="15" strokeWidth="2"/>
                    <line x1="9" y1="9" x2="15" y2="15" strokeWidth="2"/>
                  </svg>
                  <div>
                    <strong>Processing Failed</strong>
                    <p>{taskStatus.error || 'An error occurred during processing'}</p>
                  </div>
                </div>
              )}

              {taskStatus.status === 'completed' && (
                <button onClick={() => handleDownload()} className="btn btn-download">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeWidth="2"/>
                  </svg>
                  Download Processed CSV
                </button>
              )}
            </div>
          </div>
        )}

        {/* Preview Section */}
        {uploadedData && (
          <div className="card preview-card full-width">
            <div className="card-header">
              <h2>Data Preview (First 10 rows)</h2>
            </div>
            
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    {uploadedData.preview.length > 0 && 
                      Object.keys(uploadedData.preview[0]).map((key) => (
                        <th key={key}>{key}</th>
                      ))
                    }
                  </tr>
                </thead>
                <tbody>
                  {uploadedData.preview.map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((value, cellIdx) => (
                        <td key={cellIdx}>{String(value)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Processing History</h2>
              <button onClick={() => setShowHistory(false)} className="close-btn">×</button>
            </div>
            
            <div className="history-list">
              {processedFiles.length === 0 ? (
                <div className="empty-state">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 3h6l3 3v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6l3-3z" strokeWidth="2"/>
                    <path d="M9 3v3h6" strokeWidth="2"/>
                  </svg>
                  <p>No processing history yet</p>
                </div>
              ) : (
                processedFiles.map((file) => (
                  <div key={file.id} className="history-item">
                    <div className="history-info">
                      <strong>{file.filename}</strong>
                      <small>{new Date(file.uploadDate).toLocaleString()}</small>
                      <div className="history-meta">
                        {file.rowsProcessed && (
                          <span className="history-stat">
                            📊 {file.rowsProcessed.toLocaleString()} rows
                          </span>
                        )}
                        {file.fileSize && (
                          <span className="history-stat">
                            💾 {formatFileSize(file.fileSize)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="history-actions">
                      <span className={`status-badge status-${file.status}`}>
                        {file.status}
                      </span>
                      {file.status === 'completed' && (
                        <button
                          onClick={() => handleDownload(file.id)}
                          className="btn-icon btn-download-small"
                          title="Download"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeWidth="2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CSVUpload;