import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../services/api_service';
import './Login&Register.css';

const Register: React.FC = () => {
    const [username, setUsername] = useState<string>('')
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();

    const handleRegister = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            await registerUser(username, email, password);
            const token = localStorage.getItem('authToken');
            if (token) {
                navigate('/main');
            }
        } catch (error) {
            setError((error as Error).message);
        }
    };

    const handleLoginRedirect = () => {
        navigate('/login'); 
    };


    return (
        <form onSubmit={handleRegister} className='register-container'>
        <h2>Register</h2>
          <input
                type="username"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete='on'
            />
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
            <button type='submit'>Register</button>
            {error && <p className="error">{error}</p>}
            <p className="login-link">
                Already have an account? <span onClick={handleLoginRedirect}>Login here</span>
            </p>
        </form>
    );
};

export default Register;

