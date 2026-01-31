import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'https://salonfadna-backend.onrender.com/api';

const LoginPage = () => {
    const [loginType, setLoginType] = useState('salon'); // 'salon' or 'admin'
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (loginType === 'salon') {
                const res = await axios.post(`${API_URL}/salons/login`, formData);
                if (res.data.success) {
                    localStorage.setItem('salonUser', JSON.stringify(res.data.salon));
                    navigate('/salon-dashboard');
                }
            } else {
                const res = await axios.post(`${API_URL}/auth/login`, formData);
                if (res.data.success) {
                    localStorage.setItem('adminUser', 'true');
                    localStorage.setItem('adminToken', res.data.token);
                    navigate('/admin');
                }
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || err.response?.data?.error || 'Login Failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div className="glass-container" style={{ width: '400px', padding: '3rem 2rem' }}>
                <div className="logo-container">
                    <img src="/Fadna New Logo.png" alt="Fadna Logo" className="site-logo" />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem', gap: '1rem' }}>
                    <button
                        onClick={() => { setLoginType('salon'); setError(''); setFormData({ username: '', password: '' }); }}
                        style={{
                            background: loginType === 'salon' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            padding: '0.5rem 1.5rem',
                            borderRadius: '20px',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: loginType === 'salon' ? 'bold' : 'normal',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        Salon
                    </button>
                    <button
                        onClick={() => { setLoginType('admin'); setError(''); setFormData({ username: '', password: '' }); }}
                        style={{
                            background: loginType === 'admin' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            padding: '0.5rem 1.5rem',
                            borderRadius: '20px',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: loginType === 'admin' ? 'bold' : 'normal',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        Admin
                    </button>
                </div>

                <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.8rem' }}>
                    {loginType === 'salon' ? 'Salon Portal' : 'Admin Portal'}
                </h1>

                {error && (
                    <div style={{
                        color: '#ff6b6b',
                        marginBottom: '1rem',
                        textAlign: 'center',
                        background: 'rgba(255, 107, 107, 0.1)',
                        padding: '0.8rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 107, 107, 0.2)'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Username</label>
                        <input
                            type="text"
                            name="username"
                            placeholder="Enter your username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'white',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Password</label>
                        <input
                            type="password"
                            name="password"
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'white',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {loginType === 'admin' && (
                        <div style={{ textAlign: 'right', marginBottom: '1.5rem', marginTop: '-1rem' }}>
                            <Link to="/admin/forgot-password" style={{ color: '#cbd5e1', fontSize: '0.9rem', textDecoration: 'none', opacity: 0.8 }}>Forgot Password?</Link>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary"
                        style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Log In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
