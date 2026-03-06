import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Lock, User, AlertCircle } from 'lucide-react';
import styles from './Login.module.css';
import { API_URL } from '../config';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: username, password, role: 'admin' })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                navigate('/users');
            } else {
                setError(data.error || 'Login failed. Please check your credentials.');
            }
        } catch (err) {
            setError('Could not connect to the server. Please check if the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.loginContainer}>
            <div className={styles.loginCard}>
                <div className={styles.header}>
                    <div className={styles.logoWrapper}>
                        <MapPin size={32} />
                    </div>
                    <h1>Saleng Admin</h1>
                    <p>Management Portal</p>
                </div>

                <form onSubmit={handleLogin} className={styles.form}>
                    {error && (
                        <div className={styles.errorBanner}>
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <label>Username</label>
                        <div className={styles.inputWrapper}>
                            <User size={18} />
                            <input
                                type="text"
                                placeholder="Enter username..."
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Password</label>
                        <div className={styles.inputWrapper}>
                            <Lock size={18} />
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={styles.loginButton}
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Sign In'}
                    </button>
                </form>

                <div className={styles.footer}>
                    &copy; 2026 SalengMan. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default Login;
