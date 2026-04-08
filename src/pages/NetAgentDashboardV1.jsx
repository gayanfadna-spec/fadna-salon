import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ThemeToggle from '../components/ThemeToggle';
import QRCode from 'qrcode';
import { saveAs } from 'file-saver';

const API_URL = import.meta.env.VITE_API_URL || 'https://salonfadna-backend.onrender.com/api';
const BASE_URL = 'https://www.portal.fadnals.lk';

const NetAgentDashboardV1 = () => {
    const navigate = useNavigate();
    const [myAgents, setMyAgents] = useState([]);
    const [orders, setOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [qrCode, setQrCode] = useState(null);
    const [createdAgent, setCreatedAgent] = useState(null);
    const [newCredentials, setNewCredentials] = useState(null);
    const [editingAgent, setEditingAgent] = useState(null);

    const netAgentUser = useMemo(() => JSON.parse(localStorage.getItem('netAgentUser')), []);

    const emptyForm = {
        name: '', location: '', contactNumber1: '', contactNumber2: '',
        remark: '', username: '', password: '',
        accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' },
        isVisited: true, visitedDate: new Date().toISOString().split('T')[0], isActive: true
    };
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        if (!netAgentUser || netAgentUser.level !== 1) navigate('/login');
    }, [navigate, netAgentUser]);

    const fetchMyAgents = React.useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/net-agents`, {
                params: { parentNetAgentId: netAgentUser._id, level: 2 }
            });
            if (res.data.success) setMyAgents(res.data.agents);
        } catch (err) { console.error(err); }
    }, [netAgentUser]);

    const fetchOrders = React.useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/net-agents/${netAgentUser._id}/child-orders`);
            if (res.data.success) setOrders(res.data.orders);
        } catch (err) { console.error(err); }
    }, [netAgentUser]);

    useEffect(() => {
        if (netAgentUser) {
            fetchMyAgents();
            fetchOrders();
        }
    }, [fetchMyAgents, fetchOrders, netAgentUser]);

    const handleCreateAgent = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_URL}/net-agents`, {
                ...form,
                parentNetAgentId: netAgentUser._id,
                level: 2
            });
            if (res.data.success) {
                setQrCode(res.data.qrCode);
                setNewCredentials(res.data.credentials);
                setCreatedAgent(res.data.agent);
                setForm(emptyForm);
                fetchMyAgents();
                alert('2nd Level Net Agent created!');
            }
        } catch (err) { alert(err.response?.data?.message || 'Error creating agent'); }
    };

    const handleUpdateAgent = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.put(`${API_URL}/net-agents/${editingAgent._id}`, editingAgent);
            if (res.data.success) {
                setEditingAgent(null);
                fetchMyAgents();
                alert('Agent updated successfully');
            }
        } catch (err) { alert(err.response?.data?.message || 'Error updating agent'); }
    };

    const handleDeleteAgent = async (id) => {
        if (!window.confirm('Are you sure you want to delete this agent?')) return;
        try {
            const res = await axios.delete(`${API_URL}/net-agents/${id}`);
            if (res.data.success) {
                fetchMyAgents();
                alert('Agent deleted');
            }
        } catch (err) { alert(err.response?.data?.message || 'Error deleting agent'); }
    };

    const handleDownloadQR = async (agent) => {
        const qrUrl = `${BASE_URL}/net-agent-order/${agent.uniqueId}`;
        const dataUrl = await QRCode.toDataURL(qrUrl);
        saveAs(dataUrl, `${agent.name}-qr.png`);
    };

    const statusColors = {
        'Draft': '#6b7280', 'Processing': '#f59e0b', 'Shipped': '#3b82f6',
        'Completed': '#4ade80', 'Cancelled': '#ef4444', 'Returned': '#f97316',
        'Pending Payment': '#a855f7', 'Paid': '#4ade80', 'Payment Failed': '#ef4444'
    };

    const filteredOrders = orders.filter(o => {
        if (selectedAgentId && o.netAgent2Id !== selectedAgentId) return false;
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

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button className={`btn-primary ${activeTab === 'overview' ? '' : 'outline'}`} onClick={() => setActiveTab('overview')}>Overview</button>
                <button className={`btn-primary ${activeTab === 'orders' ? '' : 'outline'}`} onClick={() => setActiveTab('orders')}>Orders (Child-wise)</button>
                <button className={`btn-primary ${activeTab === 'agents' ? '' : 'outline'}`} onClick={() => setActiveTab('agents')}>My Agents (2nd Level)</button>
            </div>

            {activeTab === 'overview' && (
                <section className="glass-container">
                    <h2>Welcome, {netAgentUser.name}</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
                        <div className="stat-card" style={{ padding: '1.5rem', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '12px', textAlign: 'center' }}>
                            <h3>My Agents</h3>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{myAgents.length}</div>
                        </div>
                        <div className="stat-card" style={{ padding: '1.5rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', textAlign: 'center' }}>
                            <h3>Total Orders</h3>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{orders.length}</div>
                        </div>
                    </div>
                </section>
            )}

            {activeTab === 'orders' && (
                <section className="glass-container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2>Orders Monitoring</h2>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <select value={selectedAgentId} onChange={e => setSelectedAgentId(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white' }}>
                                <option value="">All My Agents</option>
                                {myAgents.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                            </select>
                            <input type="text" placeholder="Search orders..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white' }} />
                        </div>
                    </div>
                    <div className="table-container">
                        <table className="styled-table">
                            <thead>
                                <tr>
                                    <th>Date</th><th>Order ID</th><th>Agent (2nd)</th><th>Customer</th><th>Items</th><th>City / Total</th><th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map(o => {
                                    const childAgent = myAgents.find(a => a._id === o.netAgent2Id);
                                    return (
                                        <tr key={o._id}>
                                            <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                                            <td>{o.merchantOrderId || o._id.slice(-6).toUpperCase()}</td>
                                            <td>
                                                {childAgent ? childAgent.name : 'Direct / Other'}
                                                {childAgent && <br />}
                                                {childAgent && <small>{childAgent.agentCode}</small>}
                                            </td>
                                            <td>
                                                {o.customerName}<br />
                                                <small>{o.customerPhone}</small>
                                            </td>
                                            <td>
                                                {o.items && o.items.map(i => (
                                                    <div key={i._id} style={{ fontSize: '0.8rem' }}>• {i.productName} x{i.quantity}</div>
                                                ))}
                                            </td>
                                            <td>
                                                {o.city}<br />
                                                <span style={{ fontWeight: 'bold' }}>Rs.{o.totalAmount}</span>
                                            </td>
                                            <td><span className="status-badge" style={{ background: `${statusColors[o.status] || '#6b7280'}22`, color: statusColors[o.status] || '#fff', border: `1px solid ${statusColors[o.status]}` }}>{o.status}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {activeTab === 'agents' && (
                <section>
                    <div className="glass-container" style={{ marginBottom: '2rem' }}>
                        <h2>Create 2nd Level Net Agent</h2>
                        <form onSubmit={handleCreateAgent} className="form-grid" style={{ marginTop: '1.5rem' }}>
                            <div className="input-group">
                                <label>Agent Name *</label>
                                <input value={form.name} required onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label>Location</label>
                                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label>Phone</label>
                                <input value={form.contactNumber1} onChange={e => setForm({ ...form, contactNumber1: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label>Username</label>
                                <input placeholder="Optional" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label>Password</label>
                                <input placeholder="Optional" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                            </div>
                            <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                                <button type="submit" className="btn-primary" style={{ width: '100%' }}>Register Child Agent</button>
                            </div>
                        </form>

                        {qrCode && createdAgent && (
                            <div style={{ marginTop: '2rem', textAlign: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                                <h3 style={{ color: '#4ade80' }}>✅ Child Agent Created!</h3>
                                <p><strong>Code:</strong> {createdAgent.agentCode}</p>
                                {newCredentials && <p><strong>User:</strong> {newCredentials.username} | <strong>Pass:</strong> {newCredentials.password}</p>}
                                <img src={qrCode} alt="QR" style={{ width: '150px', margin: '1rem auto', display: 'block' }} />
                                <button className="btn-primary" onClick={() => handleDownloadQR(createdAgent)}>Download QR Link</button>
                            </div>
                        )}
                    </div>

                    <div className="glass-container">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2>My 2nd Level Agents</h2>
                        </div>
                        <div className="table-container">
                            <table className="styled-table">
                                <thead>
                                    <tr>
                                        <th>Code</th><th>Name</th><th>Location</th><th>Phone</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {myAgents.map(a => (
                                        <tr key={a._id}>
                                            <td>{a.agentCode}</td>
                                            <td>{a.name}</td>
                                            <td>{a.location}</td>
                                            <td>{a.contactNumber1}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                                                        onClick={() => {
                                                            const url = `${BASE_URL}/net-agent-order/${a.uniqueId}`;
                                                            navigator.clipboard.writeText(url);
                                                            alert('Link copied!');
                                                        }}>Link</button>
                                                    <button className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#3b82f6' }}
                                                        onClick={() => setEditingAgent(a)}>Edit</button>
                                                    <button className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#ef4444' }}
                                                        onClick={() => handleDeleteAgent(a._id)}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {editingAgent && (
                        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                            <div className="glass-container" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                                <h2>Edit Agent: {editingAgent.name}</h2>
                                <form onSubmit={handleUpdateAgent} className="form-grid" style={{ marginTop: '1.5rem' }}>
                                    <div className="input-group">
                                        <label>Agent Name</label>
                                        <input value={editingAgent.name} required onChange={e => setEditingAgent({ ...editingAgent, name: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Location</label>
                                        <input value={editingAgent.location} onChange={e => setEditingAgent({ ...editingAgent, location: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Phone</label>
                                        <input value={editingAgent.contactNumber1} onChange={e => setEditingAgent({ ...editingAgent, contactNumber1: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Username</label>
                                        <input value={editingAgent.username} onChange={e => setEditingAgent({ ...editingAgent, username: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Password (New)</label>
                                        <input placeholder="Leave blank to keep same" type="password" onChange={e => setEditingAgent({ ...editingAgent, password: e.target.value })} />
                                    </div>
                                    <div style={{ gridColumn: '1 / -1', marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                                        <button type="submit" className="btn-primary" style={{ flex: 1 }}>Update Agent</button>
                                        <button type="button" className="btn-primary outline" style={{ flex: 1 }} onClick={() => setEditingAgent(null)}>Cancel</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};

export default NetAgentDashboardV1;
