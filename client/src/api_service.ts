// client/src/api_service.ts
import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface User {
  id: number;
  email: string;
  username: string;
  created_at?: string;  // Added this field
  last_login?: string;  // Added this field
}

interface LoginResponse {
  message: string;
  token: string;
  user: User;
  expires_in: number;
}

interface RegisterResponse {
  message: string;
  user: User;
}
interface PreprocessResponse {
  message: string;
  task_id: string;
  status: string;
  estimated_time?: string;
}

interface CSVUploadResponse {
  message: string;
  file_id: string;
  preview: Array<Record<string, any>>;
  quality_report: QualityReport;
  is_large_file?: boolean;  // Add this
  file_size_mb?: number;    // Add this
}

interface QualityReport {
  total_rows: number;
  total_columns: number;
  total_cells: number;
  missing_cells: number;
  missing_percentage: number;
  column_analysis: Record<string, ColumnAnalysis>;
  duplicate_rows: number;
  memory_usage: number;
  is_large_file?: boolean;
  file_size_mb?: number;
}

interface ColumnAnalysis {
  dtype: string;
  missing_count: number;
  missing_percentage: number;
  unique_values: number | string;
  sample_values: any[];
}

interface PreprocessOptions {
  remove_duplicates?: boolean;
  handle_missing?: 'drop' | 'fill_mean' | 'fill_median' | 'fill_mode';
  standardize_columns?: boolean;
  trim_whitespace?: boolean;
  convert_types?: boolean;
}

interface TaskStatusResponse {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  result?: {
    status: string;
    output_path?: string;
    rows_processed?: number;
    columns?: string[];
    error?: string;
  }
  error?: string;
  progress?: number;
  rows_processed?: number;
}

class ApiService {
  private api: AxiosInstance;
  private refreshing: boolean = false;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 600000,
      // Increase max content length to 100MB
      maxContentLength: 100 * 1024 * 1024,
      maxBodyLength: 100 * 1024 * 1024,
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for handling token expiration
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.refreshing) {
            return Promise.reject(error);
          }

          originalRequest._retry = true;
          this.refreshing = true;

          try {
            const newToken = await this.refreshToken();
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              this.refreshing = false;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            this.refreshing = false;
            this.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Token management
  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  private removeToken(): void {
    localStorage.removeItem('auth_token');
  }

  // Auth methods
  async register(email: string, username: string, password: string): Promise<RegisterResponse> {
    const response = await this.api.post<RegisterResponse>('/user/register', {
      email,
      username,
      password,
    });
    return response.data;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.api.post<LoginResponse>('/user/login', {
      email,
      password,
    });
    
    if (response.data.token) {
      this.setToken(response.data.token);
    }
    
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/user/logout');
    } finally {
      this.removeToken();
    }
  }

  async refreshToken(): Promise<string | null> {
    try {
      const response = await this.api.post('/user/refresh-token');
      const newToken = response.data.token;
      this.setToken(newToken);
      return newToken;
    } catch (error) {
      return null;
    }
  }

  async getProfile(): Promise<{ user: User }> {
    const response = await this.api.get('/user/profile');
    return response.data;
  }

  async updateProfile(data: { username?: string; email?: string }): Promise<{ message: string; user: User }> {
    const response = await this.api.put('/user/profile', data);
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await this.api.post('/user/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  }

  // CSV methods
  async uploadCSV(file: File, onProgress?: (progress: number) => void): Promise<CSVUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > 100) {
      throw new Error('File size exceeds 100MB limit');
    }
    const response = await this.api.post<CSVUploadResponse>('/csv/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 600000,
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });

    return response.data;
  }

  
  async preprocessCSV(fileId: string, options: PreprocessOptions): Promise<PreprocessResponse> {
    const response = await this.api.post<PreprocessResponse>('/csv/preprocess', {
      file_id: fileId,
      options,
    }, {
      timeout: 60000,
    });
    return response.data;
  }

  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const response = await this.api.get<TaskStatusResponse>(`/csv/task-status/${taskId}`,{
      timeout: 30000,
    });
    return response.data;
  }

  async pollTaskStatus(
    taskId: string,
    onUpdate: (status: TaskStatusResponse) => void,
    interval: number = 3000,
    maxAttempts: number = 600
  ): Promise<TaskStatusResponse> {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const poll = async () => {
        try {
          attempts++;
          
          if (attempts > maxAttempts) {
            reject(new Error('Processing timeout - maximum wait time exceeded'));
            return;
          }

          const status = await this.getTaskStatus(taskId);
          onUpdate(status);

          if (status.status === 'completed' || status.status === 'failed') {
            resolve(status);
          } else {
            setTimeout(poll, interval);
          }
        } catch (error) {
          // If it's a network error, retry a few times
          if (attempts < 3) {
            setTimeout(poll, interval * 2);
          } else {
            reject(error);
          }
        }
      };

      poll();
    });
  }

  async analyzeCSV(fileId: string): Promise<QualityReport> {
    const response = await this.api.get<QualityReport>(`/csv/analyze/${fileId}`,{
      timeout: 120000,
    });
    return response.data;
  }

  async downloadProcessedCSV(fileId: string): Promise<Blob> {
    const response = await this.api.get(`/csv/download/${fileId}`, {
      responseType: 'blob',
      timeout: 600000,
    });
    return response.data;
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  handleError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return 'Request timeout. The file is too large or processing is taking too long. Please try with a smaller file.';
      }
      
      if (error.response?.data?.error) {
        return error.response.data.error;
      }
      
      if (error.response?.status === 413) {
        return 'File is too large. Maximum size is 100MB.';
      }
      
      if (error.response?.status === 401) {
        return 'Authentication failed. Please login again.';
      }
      if (error.response?.status === 403) {
        return 'You do not have permission to perform this action.';
      }
      if (error.response?.status === 404) {
        return 'Resource not found.';
      }
      // Fixed: Added type guard for status check
      if (error.response && error.response.status >= 500) {
        return 'Server error. Please try again later.';
      }
      return error.message;
    }
    return 'An unexpected error occurred.';
  }
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// Fixed: Export instance assigned to variable
const apiService = new ApiService();

export default apiService;
export type {
  User,
  LoginResponse,
  RegisterResponse,
  CSVUploadResponse,
  QualityReport,
  ColumnAnalysis,
  PreprocessResponse,
  PreprocessOptions,
  TaskStatusResponse,
};