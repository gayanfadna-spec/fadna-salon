import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SalonLoginPage = () => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_URL}/salons/login`, formData);
            if (res.data.success) {
                // Save salon details to storage
                localStorage.setItem('salonUser', JSON.stringify(res.data.salon));
                // Redirect to dashboard
                navigate('/salon-dashboard');
            }
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Login Failed');
        }
    };

    return (
        <div className="container animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div className="glass-container" style={{ width: '400px', padding: '3rem 2rem' }}>
                <div className="logo-container">
                    <img src="/Fadna New Logo.png" alt="Fadna Logo" className="site-logo" />
                </div>
                <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2rem' }}>Salon Portal</h1>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Username</label>
                        <input
                            type="text"
                            placeholder="Enter your username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            required
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Password</label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn-primary"
                        style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
                    >
                        Log In
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SalonLoginPage;
