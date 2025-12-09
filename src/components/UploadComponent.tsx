import { useState } from 'react';
import { uploadAndGetCleanedData, downloadCleanedCsv, logoutUser } from '../services/api_service';
import LogoutModal  from './LogoutModal';
import { useNavigate } from 'react-router-dom';
import './Upload&Modal.css'; 

const UploadComponent: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [jsonData, setJsonData] = useState<any[]>([]);
    const [csvUrl, setCsvUrl] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);

    const navigate = useNavigate();

    const handleLogoutClick = () => {
        setShowModal(true);
    };

    const handleLogoutConfirm = () => {
        logoutUser();
        setShowModal(false);
        navigate('/login');
    };

    const handleLogoutCancel = () => {
        setShowModal(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (file) {
            const response = await uploadAndGetCleanedData(file);

            if ('json_data' in response) {
                try {
                    const data = JSON.parse(response.json_data);
                    setJsonData(data);
                    setCsvUrl(response.csv_url); 
                    setError(null);
                    setUploadSuccess('File uploaded and cleaned successfully.');
                } catch (err) {
                    setError('Failed to parse JSON data.');
                    setUploadSuccess(null);
                }
            } else {
                setError(response.error);
                setUploadSuccess(null);
            }
        }
    };

    const handleDownload = async () => {
        if (csvUrl) {
            await downloadCleanedCsv(csvUrl);
            setDownloadSuccess('Download started successfully.');
        }
    };

    const renderTable = () => {
        if (jsonData.length === 0) return null;

        const headers = Object.keys(jsonData[0]);

        return (
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            {headers.map((header) => (
                                <th key={header}>{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {jsonData.map((row, index) => (
                            <tr key={index}>
                                {headers.map((header) => (
                                    <td key={header}>{row[header]}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="upload-component-container">
            <div className='logout-container'>
                <button onClick={handleLogoutClick}>Logout</button>
            </div>
            <LogoutModal
                show={showModal}
                onClose={handleLogoutCancel}
                onConfirm={handleLogoutConfirm}
            />
            <input type="file" onChange={handleFileChange} />
            <button onClick={handleUpload}>Upload and Clean</button>
            {uploadSuccess && <p className="success-message">{uploadSuccess}</p>}
            {error && <p className="error-message">Error: {error}</p>}
            {downloadSuccess && <p className="success-message">{downloadSuccess}</p>}
            {renderTable()}
            {csvUrl && <button onClick={handleDownload}>Download Cleaned CSV</button>}
        </div>
    );
};

export default UploadComponent;




