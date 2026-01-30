import React, { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';

const PaymentResult = () => {
    const location = useLocation();
    const isSuccess = location.pathname.includes('success');

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

                {isSuccess ? (
                    <div style={{ marginTop: '2rem' }}>
                        <p>You can close this window now.</p>
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
