import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'https://salonfadna-backend.onrender.com/api';

const SalonDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [stats, setStats] = useState(null);
    const [itemPerformance, setItemPerformance] = useState([]);
    const [salon, setSalon] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Check authentication
        const storedSalon = localStorage.getItem('salonUser');
        if (!storedSalon) {
            console.log("SalonDashboard: No user found, redirecting to salon-login");
            navigate('/salon-login');
            return;
        }
        const user = JSON.parse(storedSalon);
        setSalon(user);

        const fetchData = async (salonId) => {
            try {
                // Fetch Orders
                const ordersRes = await axios.get(`${API_URL}/orders`, { params: { salonId } });
                if (ordersRes.data.success) setOrders(ordersRes.data.orders);

                // Fetch Stats
                const statsRes = await axios.get(`${API_URL}/analytics/salon-performance`, { params: { salonId } });
                if (statsRes.data.success && statsRes.data.stats.length > 0) {
                    setStats(statsRes.data.stats[0]);
                }

                // Fetch Item Performance
                const itemRes = await axios.get(`${API_URL}/analytics/item-performance`, { params: { salonId } });
                if (itemRes.data.success) setItemPerformance(itemRes.data.stats);
            } catch (err) {
                console.error(err);
            }
        };

        fetchData(user._id);
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('salonUser');
        navigate('/salon-login');
    };

    if (!salon) return null;

    return (
        <div className="container animate-fade-in">
            <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src="/Fadna New Logo.png" alt="Fadna Logo" className="site-logo" style={{ maxHeight: '40px' }} />
                    <div>
                        <h1 style={{ margin: 0 }}>{salon.name} Dashboard</h1>
                        <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>{salon.location}</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="btn-primary outline"
                    style={{ borderColor: '#ef4444', color: '#ef4444' }}
                >
                    Log Out
                </button>
            </header>

            {/* Quick Stats */}
            <div className="admin-grid" style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="glass-container" style={{ textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', opacity: 0.7 }}>Valid Orders</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--secondary-color)' }}>
                        {stats ? stats.totalOrders : 0}
                    </div>
                </div>
                <div className="glass-container" style={{ textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', opacity: 0.7 }}>Returns</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#94a3b8' }}>
                        {stats ? (stats.returnedOrders || 0) : 0}
                    </div>
                </div>
                <div className="glass-container" style={{ textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', opacity: 0.7 }}>Cancelled</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ef4444' }}>
                        {stats ? (stats.cancelledOrders || 0) : 0}
                    </div>
                </div>
                <div className="glass-container" style={{ textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', opacity: 0.7 }}>Total Items Sold</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#60a5fa' }}>
                        {stats ? stats.totalItemsSold : 0}
                    </div>
                </div>
                <div className="glass-container" style={{ textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', opacity: 0.7 }}>Total Revenue</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#4ade80' }}>
                        Rs.{stats ? stats.totalRevenue : 0}
                    </div>
                </div>
            </div>

            {/* Product Performance */}
            <section className="glass-container" style={{ marginBottom: '2rem' }}>
                <h2>Product Sales</h2>
                <div className="table-container">
                    <table className="styled-table">
                        <thead>
                            <tr>
                                <th>Product Name</th>
                                <th>Qty Sold</th>
                                <th>Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itemPerformance.map(item => (
                                <tr key={item._id}>
                                    <td>{item._id}</td>
                                    <td>{item.totalQuantity}</td>
                                    <td>Rs.{item.totalRevenue}</td>
                                </tr>
                            ))}
                            {itemPerformance.length === 0 && (
                                <tr>
                                    <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
                                        No sales data yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Orders Table */}
            <section className="glass-container">
                <h2>My Orders</h2>
                <div className="table-container">
                    <table className="styled-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order._id}>
                                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                                    <td style={{ fontWeight: 'bold' }}>{order.merchantOrderId || order._id.slice(-6).toUpperCase()}</td>
                                    <td>
                                        {order.customerName}<br />
                                        <small style={{ opacity: 0.7 }}>{order.customerPhone}</small><br />
                                        <small style={{ opacity: 0.7 }}>{order.address}, {order.city}</small>
                                    </td>
                                    <td>
                                        {order.items.map(i => (
                                            <div key={i._id}>{i.productName} <span style={{ opacity: 0.7 }}>x{i.quantity}</span></div>
                                        ))}
                                    </td>
                                    <td>Rs.{order.totalAmount}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                                            <span className={`status-badge ${order.status.toLowerCase().replace(' ', '')}`}>
                                                {order.status}
                                            </span>
                                            {(order.status === 'Returned' || order.status === 'Cancelled') && (order.statusDate || order.returnedAt || order.cancelledAt) && (
                                                <small style={{ opacity: 0.7, fontSize: '0.8rem' }}>
                                                    on {new Date(order.statusDate || order.returnedAt || order.cancelledAt).toLocaleDateString()}
                                                </small>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
                                        No orders found yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section >
        </div >
    );
};

export default SalonDashboard;
