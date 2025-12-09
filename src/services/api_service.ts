import { CleanedDataResponse, ErrorResponse } from './api_types';

const API_BASE_URL = 'http://127.0.0.1:5000';


// ------------------------- AUTH HEADERS
const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        throw new Error('No auth token found');
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
};


// ------------------------- UPLOAD & CLEAN
export const uploadAndGetCleanedData = async (file: File): Promise<CleanedDataResponse | ErrorResponse> => {
    const formData = new FormData();
    formData.append('file', file);


    try {
        const response = await fetch(`${API_BASE_URL}/clean_csv`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `${getAuthHeaders().Authorization}`,
            },
        });


        if (!response.ok) {
            const errorResponse: ErrorResponse = await response.json();
            throw new Error(errorResponse.error);
        }

        const data: CleanedDataResponse = await response.json();

        if ('csv_url' in data) {
            return data;
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('API request failed:', error);
        return { error: (error as Error).message };
    }
};

// ------------------------- DOWNLOAD
export const downloadCleanedCsv = async (csvUrl: string): Promise<void> => {
    try {
        const response = await fetch(csvUrl, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to download CSV');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'cleaned_data.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Download failed:', error);
    }
};

// ------------------------- REGISTER
export const registerUser = async (username: string, email: string, password: string): Promise<void> => {
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password }),
        });

        if (!response.ok) {
            const errorResponse: ErrorResponse = await response.json();
            throw new Error(errorResponse.error || 'Registration failed');
        }

        const data = await response.json();
        localStorage.setItem('authToken', data.access_token || '');  
    } catch (error) {
        console.error('Registration failed:', error);
        throw new Error((error as Error).message);
    }
};


// ------------------------- LOGIN
export const loginUser = async (email: string, password: string): Promise<void> => {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const errorResponse: ErrorResponse = await response.json();
            throw new Error(errorResponse.error || 'Login failed');
        }

        const data = await response.json();
        localStorage.setItem('authToken', data.access_token || '');  
    } catch (error) {
        console.error('Login failed:', error);
        throw new Error((error as Error).message);
    }
};


// ------------------------- LOGOUT
export const logoutUser = (): void => {
    localStorage.removeItem('authToken');
};
