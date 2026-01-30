import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminLoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await axios.post(`${API_URL}/auth/login`, { username, password });
            if (res.data.success) {
                localStorage.setItem('adminUser', 'true'); // Keeping this for simple checks
                localStorage.setItem('adminToken', res.data.token); // Store JWT
                navigate('/admin');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div className="glass-container" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
                <div className="logo-container">
                    <img src="/Fadna New Logo.png" alt="Fadna Logo" className="site-logo" />
                </div>
                <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Admin Login</h2>
                {error && <div style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>{error}</div>}
                <form onSubmit={handleLogin}>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', borderRadius: '8px', border: '1px solid #ccc' }}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', borderRadius: '8px', border: '1px solid #ccc' }}
                    />
                    <div style={{ textAlign: 'right', marginBottom: '2rem' }}>
                        <Link to="/admin/forgot-password" style={{ color: '#cbd5e1', fontSize: '0.9rem', textDecoration: 'none' }}>Forgot Password?</Link>
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLoginPage;
