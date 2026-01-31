import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'https://salonfadna-backend.onrender.com/api';

const AdminForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const res = await axios.post(`${API_URL}/auth/forgot-password`, { email });
            setMessage(res.data.data || 'Email sent successfully');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send email');
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
                <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Forgot Password</h2>
                <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#666' }}>
                    Enter your email to reset your password
                </p>

                {message && <div style={{ color: '#10b981', marginBottom: '1rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>{message}</div>}
                {error && <div style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Admin Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.8rem', marginBottom: '1.5rem', borderRadius: '8px', border: '1px solid #ccc' }}
                    />
                    <button type="submit" className="btn-primary" style={{ width: '100%', marginBottom: '1rem' }} disabled={loading}>
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                    <div style={{ textAlign: 'center' }}>
                        <Link to="/admin-login" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Back to Login</Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminForgotPasswordPage;
