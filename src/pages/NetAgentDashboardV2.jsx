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
    const [products, setProducts] = useState([]);
    const [agentData, setAgentData] = useState(null);
    const netAgentUser = useMemo(() => JSON.parse(localStorage.getItem('netAgentUser')), []);

    useEffect(() => {
        if (!netAgentUser || netAgentUser.level !== 2) navigate('/login');
    }, [navigate, netAgentUser]);

    const fetchData = React.useCallback(async () => {
        try {
            const [orderRes, agentRes, prodRes] = await Promise.all([
                axios.get(`${API_URL}/net-agents/${netAgentUser._id}/my-orders`),
                axios.get(`${API_URL}/net-agents/${netAgentUser._id}`),
                axios.get(`${API_URL}/products`)
            ]);
            if (orderRes.data.success) setOrders(orderRes.data.orders);
            if (agentRes.data.success) setAgentData(agentRes.data.agent);
            if (prodRes.data.success) setProducts(prodRes.data.products.filter(p => p.isActive));
        } catch (err) { console.error(err); }
    }, [netAgentUser]);

    useEffect(() => {
        if (netAgentUser) fetchData();
    }, [fetchData, netAgentUser]);

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

    const codCount = orders.filter(o => o.status === 'COD').length;
    const paidCount = orders.filter(o => o.status === 'Paid').length;
    const completedCount = orders.filter(o => o.status === 'Completed').length;
    
    const totalCommission = orders.filter(o => o.status === 'Paid' || o.status === 'Completed').reduce((sum, o) => {
        return sum + (o.items || []).reduce((itemSum, i) => {
            let commission = i.commission || 0;
            if (agentData && agentData.parentNetAgentId && agentData.parentNetAgentId.childCommissions) {
                const override = agentData.parentNetAgentId.childCommissions.find(c => c.productId === i.productId);
                if (override) {
                    commission = override.commission;
                }
            }
            return itemSum + (commission * (i.quantity || 1));
        }, 0);
    }, 0);

    const productCounts = {};
    orders.forEach(o => {
        if (o.status !== 'Draft' && o.status !== 'Cancelled') {
            (o.items || []).forEach(item => {
                if (item.productName) {
                    productCounts[item.productName] = (productCounts[item.productName] || 0) + (item.quantity || 1);
                }
            });
        }
    });
    const sortedProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]);

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
                        <h2>Overview</h2>
                        <p style={{ opacity: 0.7 }}>Welcome, {netAgentUser.name}. Share your link to get orders!</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button className="btn-primary" onClick={() => {
                            const url = `${BASE_URL}/net-agent-order/${netAgentUser.uniqueId}`;
                            navigator.clipboard.writeText(url);
                            alert('Link copied!');
                        }}>🔗 Copy My Shop Link</button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '1.5rem', marginBottom: '2rem' }}>
                    <div className="stat-card" style={{ padding: '1.5rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', textAlign: 'center' }}>
                        <h3>Total Orders</h3>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{orders.length}</div>
                    </div>
                    <div className="stat-card" style={{ padding: '1.5rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', textAlign: 'center' }}>
                        <h3>Paid Orders</h3>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{paidCount}</div>
                    </div>
                    <div className="stat-card" style={{ padding: '1.5rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '12px', textAlign: 'center' }}>
                        <h3>COD Orders</h3>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{codCount}</div>
                    </div>
                    <div className="stat-card" style={{ padding: '1.5rem', background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: '12px', textAlign: 'center' }}>
                        <h3>Completed Orders</h3>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{completedCount}</div>
                    </div>
                    <div className="stat-card" style={{ padding: '1.5rem', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '12px', textAlign: 'center' }}>
                        <h3>Commission (Paid/Completed)</h3>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>Rs. {totalCommission.toLocaleString()}</div>
                    </div>
                </div>

                <h3 style={{ marginBottom: '1rem', marginTop: '2rem' }}>Product Wise Count</h3>
                <div className="table-container" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
                    <table className="styled-table">
                        <thead>
                            <tr>
                                <th>Product Name</th>
                                <th style={{ textAlign: 'right' }}>Total Quantity Sold</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedProducts.map(([productName, quantity], idx) => (
                                <tr key={idx}>
                                    <td style={{ fontWeight: 'bold' }}>{productName}</td>
                                    <td style={{ textAlign: 'right', fontSize: '1.1rem', color: '#4ade80' }}>{quantity}</td>
                                </tr>
                            ))}
                            {sortedProducts.length === 0 && (
                                <tr>
                                    <td colSpan="2" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>No products sold yet</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <h3 style={{ marginBottom: '1rem', marginTop: '2rem' }}>My Product Commissions</h3>
                <div className="table-container" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
                    <table className="styled-table">
                        <thead>
                            <tr>
                                <th>Product Name</th>
                                <th>Price (Rs.)</th>
                                <th style={{ textAlign: 'right' }}>My Commission (Rs.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(p => {
                                let commission = p.commission || 0;
                                if (agentData && agentData.parentNetAgentId && agentData.parentNetAgentId.childCommissions) {
                                    const override = agentData.parentNetAgentId.childCommissions.find(c => c.productId === p._id);
                                    if (override) {
                                        commission = override.commission;
                                    }
                                }
                                return (
                                    <tr key={p._id}>
                                        <td style={{ fontWeight: 'bold' }}>{p.name}</td>
                                        <td>{p.finalPrice}</td>
                                        <td style={{ textAlign: 'right', fontSize: '1.1rem', color: '#f59e0b', fontWeight: 'bold' }}>{commission}</td>
                                    </tr>
                                );
                            })}
                            {products.length === 0 && (
                                <tr>
                                    <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>No products found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>My Orders Details</h2>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
