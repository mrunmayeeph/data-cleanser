import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import UploadComponent from './components/UploadComponent';
import './App.css';

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('authToken'));

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        setIsAuthenticated(!!token);
    }, []);

    return (
        <Router>
            <div className="App">
                <h1>DataFixer - CSV Cleaner</h1>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/main" element={isAuthenticated ? <UploadComponent /> : <Navigate to="/login" />} />
                    <Route path="*" element={<Navigate to={isAuthenticated ? "/main" : "/login"} />} />
                </Routes>
            </div>
        </Router>
    );
};

export default App;





