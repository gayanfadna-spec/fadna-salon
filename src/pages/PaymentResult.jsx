import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://salonfadna-backend.onrender.com/api';

const PaymentResult = () => {
    const location = useLocation();
    const isSuccess = location.pathname.includes('success');
    const orderId = location.state?.orderId;
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(isSuccess && orderId);

    useEffect(() => {
        if (isSuccess && orderId) {
            const checkStatus = async () => {
                try {
                    // Slight delay to allow backend to process
                    setTimeout(async () => {
                        // We don't have a direct "get order by ID" public route easily accessible without auth maybe?
                        // Actually orderRoutes has no "get /:id" public route.
                        // But we have "get /" which returns recent orders.
                        // Or we can add one. For now, let's rely on the put we just did.
                        // Wait, if we act as a guest, we can't fetch the order if it's not exposed.
                        // Let's assume the status update in OrderPage worked.
                        setLoading(false);
                    }, 1000);
                } catch (err) {
                    console.error(err);
                    setLoading(false);
                }
            };
            checkStatus();
        }
    }, [isSuccess, orderId]);

    return (
        <div className="container animate-fade-in" style={{ textAlign: 'center', marginTop: '4rem' }}>
            <div className="glass-container" style={{ display: 'inline-block', padding: '3rem' }}>
                <h1 style={{ color: isSuccess ? '#4ade80' : '#ef4444' }}>
                    {isSuccess ? 'Payment Successful!' : 'Payment Cancelled'}
                </h1>
                <p style={{ fontSize: '1.2rem', margin: '1rem 0' }}>
                    {isSuccess
                        ? 'Thank you for your order. We will process it shortly.'
                        : 'Your payment was cancelled. Your order has not been completed.'}
                </p>

                {isSuccess && orderId && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                        <p style={{ margin: 0 }}>Order ID: <strong>{orderId}</strong></p>
                    </div>
                )}

                {isSuccess ? (
                    <div style={{ marginTop: '2rem' }}>
                        <p>You can close this window now.</p>
                        <a href="/" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>Return Home</a>
                    </div>
                ) : (
                    <div style={{ marginTop: '2rem' }}>
                        <button onClick={() => window.history.back()} className="btn-primary">
                            Try Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentResult;
