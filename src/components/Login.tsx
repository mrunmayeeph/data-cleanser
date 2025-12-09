import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../services/api_service';
import './Login&Register.css';

const Login: React.FC = () => {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            await loginUser(email, password);
            const token = localStorage.getItem('authToken');
            if (token) {
                navigate('/main');
            }
        } catch (error) {
            setError((error as Error).message);
        }
    };


    const handleRegisterRedirect = () => {
        navigate('/register'); 
    };

    return (
        <form onSubmit={handleLogin} className='login-container'>
            <h2>Login</h2>
            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete='on'
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete='on'
            />
            <button type="submit">Login</button>
            {error && <p className="error">{error}</p>}

            <p className="register-link">
                Don't have an account? <span onClick={handleRegisterRedirect}>Register here</span>
            </p>
        </form>
    );
};

export default Login;
