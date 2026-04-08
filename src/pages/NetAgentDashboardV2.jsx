import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ThemeToggle from '../components/ThemeToggle';

const API_URL = import.meta.env.VITE_API_URL || 'https://salonfadna-backend.onrender.com/api';
const BASE_URL = 'https://www.portal.fadnals.lk';

const NetAgentDashboardV2 = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const netAgentUser = useMemo(() => JSON.parse(localStorage.getItem('netAgentUser')), []);

    useEffect(() => {
        if (!netAgentUser || netAgentUser.level !== 2) navigate('/login');
    }, [navigate, netAgentUser]);

    const fetchMyOrders = React.useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/net-agents/${netAgentUser._id}/my-orders`);
            if (res.data.success) setOrders(res.data.orders);
        } catch (err) { console.error(err); }
    }, [netAgentUser]);

    useEffect(() => {
        if (netAgentUser) fetchMyOrders();
    }, [fetchMyOrders, netAgentUser]);

    const statusColors = {
        'Draft': '#6b7280', 'COD': '#f59e0b', 'Shipped': '#3b82f6',
        'Completed': '#4ade80', 'Cancelled': '#ef4444', 'Returned': '#f97316',
        'Pending Payment': '#a855f7', 'Paid': '#4ade80', 'Payment Failed': '#ef4444'
    };

    const filteredOrders = orders.filter(o => {
        if (!searchTerm) return true;
        const t = searchTerm.toLowerCase();
        return (o.customerName || '').toLowerCase().includes(t) || (o.customerPhone || '').includes(t);
    });

    return (
        <div className="admin-container animate-fade-in">
            <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src="/Fadna New Logo.png" alt="Fadna Logo" style={{ maxHeight: '40px' }} />
                    <h1>Agent Dashboard</h1>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <ThemeToggle />
                    <button className="btn-primary outline" style={{ borderColor: '#ef4444', color: '#ef4444' }}
                        onClick={() => { localStorage.removeItem('netAgentUser'); navigate('/login'); }}>Log Out</button>
                </div>
            </header>

            <section className="glass-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <h2>My Orders</h2>
                        <p style={{ opacity: 0.7 }}>Welcome, {netAgentUser.name}. Share your link to get orders!</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button className="btn-primary" onClick={() => {
                            const url = `${BASE_URL}/net-agent-order/${netAgentUser.uniqueId}`;
                            navigator.clipboard.writeText(url);
                            alert('Link copied!');
                        }}>🔗 Copy My Shop Link</button>
                        <input type="text" placeholder="Search orders..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white' }} />
                    </div>
                </div>

                <div className="table-container">
                    <table className="styled-table">
                        <thead>
                            <tr>
                                <th>Date</th><th>Order ID</th><th>Customer</th><th>Items</th><th>City</th><th>Total</th><th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(o => (
                                <tr key={o._id}>
                                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                                    <td>{o.merchantOrderId || o._id.slice(-6).toUpperCase()}</td>
                                    <td>{o.customerName}<br /><small>{o.customerPhone}</small></td>
                                    <td>
                                        {o.items && o.items.map(i => (
                                            <div key={i._id} style={{ fontSize: '0.8rem' }}>• {i.productName} x{i.quantity}</div>
                                        ))}
                                    </td>
                                    <td>{o.city}</td>
                                    <td>Rs.{o.totalAmount}</td>
                                    <td><span className="status-badge" style={{ background: `${statusColors[o.status] || '#6b7280'}22`, color: statusColors[o.status] || '#fff', border: `1px solid ${statusColors[o.status]}` }}>{o.status}</span></td>
                                </tr>
                            ))}
                            {!filteredOrders.length && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>No orders yet. Start sharing your link!</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default NetAgentDashboardV2;
