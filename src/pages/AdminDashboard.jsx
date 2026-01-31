import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import QRCode from 'qrcode';

const API_URL = import.meta.env.VITE_API_URL || 'https://salonfadna-backend.onrender.com/api';

const AdminDashboard = () => {
    const [salons, setSalons] = useState([]);
    const [orders, setOrders] = useState([]);
    const [newSalon, setNewSalon] = useState({ name: '', location: '', contactNumber: '' });
    const [qrCode, setQrCode] = useState(null);
    const [newCredentials, setNewCredentials] = useState(null);
    const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'salons', 'monitor'
    const navigate = useNavigate();

    useEffect(() => {
        const storedAdmin = localStorage.getItem('adminUser');
        if (!storedAdmin) {
            navigate('/admin-login');
        }
    }, [navigate]);
    const [editingSalonId, setEditingSalonId] = useState(null);
    const [salonPerformance, setSalonPerformance] = useState([]);
    const [itemPerformance, setItemPerformance] = useState([]);
    const [products, setProducts] = useState([]);
    const [newProduct, setNewProduct] = useState({ name: '', price: '', discountType: 'none', discountValue: 0 });
    const [editingProductId, setEditingProductId] = useState(null);
    const [selectedSalonId, setSelectedSalonId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchOrders = React.useCallback(async () => {
        try {
            const params = selectedSalonId ? { salonId: selectedSalonId } : {};
            const res = await axios.get(`${API_URL}/orders`, { params });
            if (res.data.success) setOrders(res.data.orders);
        } catch (err) {
            console.error(err);
        }
    }, [selectedSalonId]);

    const fetchSalons = React.useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/salons`);
            if (res.data.success) setSalons(res.data.salons);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchAnalytics = React.useCallback(async () => {
        try {
            const params = selectedSalonId ? { salonId: selectedSalonId } : {};

            const salonRes = await axios.get(`${API_URL}/analytics/salon-performance`, { params });
            if (salonRes.data.success) setSalonPerformance(salonRes.data.stats);

            const itemRes = await axios.get(`${API_URL}/analytics/item-performance`, { params });
            if (itemRes.data.success) setItemPerformance(itemRes.data.stats);

        } catch (err) {
            console.error(err);
        }
    }, [selectedSalonId]);

    const fetchProducts = React.useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/products`);
            if (res.data.success) setProducts(res.data.products);
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        fetchAnalytics();
        fetchProducts();
    }, [fetchOrders, fetchAnalytics, fetchProducts]);

    useEffect(() => {
        fetchSalons();
    }, [fetchSalons]);

    const handleProductSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingProductId) {
                await axios.put(`${API_URL}/products/${editingProductId}`, newProduct);
                alert('Product Updated');
            } else {
                await axios.post(`${API_URL}/products`, newProduct);
                alert('Product Created');
            }
            setNewProduct({ name: '', price: '', discountType: 'none', discountValue: 0 });
            setEditingProductId(null);
            fetchProducts();
        } catch (err) {
            alert('Error saving product');
        }
    };
    //fuck rtrtr
    const handleEditProduct = (product) => {
        setNewProduct({
            name: product.name,
            price: product.price,
            discountType: product.discountType,
            discountValue: product.discountValue
        });
        setEditingProductId(product._id);
        setActiveTab('products');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteProduct = async (id) => {
        if (!window.confirm('Delete this product?')) return;
        try {
            await axios.delete(`${API_URL}/products/${id}`);
            fetchProducts();
        } catch (err) {
            alert('Error deleting product');
        }
    };

    const handleCreateSalon = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_URL}/salons`, newSalon);
            if (res.data.success) {
                setQrCode(res.data.qrCode);
                setNewSalon({ name: '', location: '', contactNumber: '' });
                fetchSalons();

                // Set Credentials for display
                setNewCredentials(res.data.credentials);
            }
        } catch (err) {
            alert('Error creating salon');
            console.error(err);
        }
    };

    const handleDeleteSalon = async (id) => {
        if (!window.confirm('Are you sure you want to delete this salon?')) return;
        try {
            const res = await axios.delete(`${API_URL}/salons/${id}`);
            if (res.data.success) {
                fetchSalons();
                alert('Salon Deleted Successfully');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting salon');
        }
    };

    const handleEditClick = (salon) => {
        setNewSalon({
            name: salon.name,
            location: salon.location,
            contactNumber: salon.contactNumber
        });
        setEditingSalonId(salon._id);
        setEditingSalonId(salon._id);
        setQrCode(null);
        setNewCredentials(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleUpdateSalon = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.put(`${API_URL}/salons/${editingSalonId}`, newSalon);
            if (res.data.success) {
                setNewSalon({ name: '', location: '', contactNumber: '' });
                setEditingSalonId(null);
                fetchSalons();
                alert('Salon Updated Successfully!');
            }
        } catch (err) {
            console.error(err);
            alert('Error updating salon');
        }
    };

    const handleCancelEdit = () => {
        setNewSalon({ name: '', location: '', contactNumber: '' });
        setEditingSalonId(null);
    };

    const handleDownloadQR = async (salon) => {
        try {
            // Force production URL for QR codes regardless of environment
            const baseUrl = 'https://fadna-salon.onrender.com';
            const qrUrl = `${baseUrl}/order/${salon._id}`;
            const qrDataUrl = await QRCode.toDataURL(qrUrl);

            const link = document.createElement('a');
            link.href = qrDataUrl;
            link.download = `${salon.name.replace(/\s+/g, '_')}-qr.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Error generating QR', err);
            alert('Failed to generate QR');
        }
    };

    return (
        <div className="container animate-fade-in">
            <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src="/Fadna New Logo.png" alt="Fadna Logo" className="site-logo" style={{ maxHeight: '40px' }} />
                    <h1>Admin Dashboard</h1>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem', flex: 1 }}>
                    {/* Top Row: Navigation Buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button
                            className={`btn-primary nav-btn ${activeTab === 'orders' ? '' : 'outline'}`}
                            style={{ opacity: activeTab === 'orders' ? 1 : 0.7 }}
                            onClick={() => setActiveTab('orders')}
                        >
                            Orders
                        </button>
                        <button
                            className={`btn-primary nav-btn ${activeTab === 'salons' ? '' : 'outline'}`}
                            style={{ opacity: activeTab === 'salons' ? 1 : 0.7 }}
                            onClick={() => setActiveTab('salons')}
                        >
                            Salons
                        </button>
                        <button
                            className={`btn-primary nav-btn ${activeTab === 'products' ? '' : 'outline'}`}
                            style={{ opacity: activeTab === 'products' ? 1 : 0.7 }}
                            onClick={() => setActiveTab('products')}
                        >
                            Products
                        </button>
                        <button
                            className={`btn-primary nav-btn ${activeTab === 'monitor' ? '' : 'outline'}`}
                            style={{ opacity: activeTab === 'monitor' ? 1 : 0.7 }}
                            onClick={() => setActiveTab('monitor')}
                        >
                            Monitor
                        </button>
                        <button
                            onClick={() => {
                                localStorage.removeItem('adminUser');
                                navigate('/admin-login');
                            }}
                            className="btn-primary outline"
                            style={{ borderColor: '#ef4444', color: '#ef4444', padding: '0.5rem 1rem' }}
                        >
                            Log Out
                        </button>
                    </div>

                    {/* Bottom Row: Search and Filters */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'flex-end', width: '100%' }}>
                        {(activeTab === 'orders' || activeTab === 'monitor' || activeTab === 'salons') && (
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="header-control"
                                style={{
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    background: 'rgba(255,255,255,0.1)',
                                    color: 'white',
                                    outline: 'none',
                                    maxWidth: '300px'
                                }}
                            />
                        )}
                        <select
                            className="header-control"
                            style={{
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(255,255,255,0.1)',
                                color: 'white',
                                outline: 'none'
                            }}
                            value={selectedSalonId}
                            onChange={(e) => setSelectedSalonId(e.target.value)}
                        >
                            <option value="" style={{ color: 'black' }}>All Salons</option>
                            {salons.map(salon => (
                                <option key={salon._id} value={salon._id} style={{ color: 'black' }}>
                                    {salon.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            {activeTab === 'orders' && (
                <section className="glass-container">
                    <h2>Recent Orders</h2>
                    <div className="table-container">
                        <table className="styled-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Salon</th>
                                    <th>Customer</th>
                                    <th>Items</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders
                                    .filter(order => {
                                        if (!searchTerm) return true;
                                        const term = searchTerm.toLowerCase();
                                        return (
                                            (order.salonName || '').toLowerCase().includes(term) ||
                                            (order.customerName || '').toLowerCase().includes(term) ||
                                            (order.customerPhone || '').toLowerCase().includes(term) ||
                                            (order.additionalPhone || '').toLowerCase().includes(term) ||
                                            (order.items || []).some(item => (item.productName || '').toLowerCase().includes(term))
                                        );
                                    })
                                    .map(order => (
                                        <tr key={order._id}>
                                            <td>{new Date(order.createdAt).toLocaleString()}</td>
                                            <td>{order.salonName}</td>
                                            <td>
                                                <div style={{ fontWeight: 'bold' }}>{order.customerName}</div>
                                                <small style={{ opacity: 0.7 }}>{order.customerPhone}</small><br />
                                                <small style={{ opacity: 0.5 }}>{order.address}, {order.city}</small>
                                            </td>
                                            <td>
                                                {order.items.map(i => (
                                                    <div key={i._id} style={{ fontSize: '0.9rem' }}>• {i.productName} <span style={{ opacity: 0.5 }}>x{i.quantity}</span></div>
                                                ))}
                                            </td>
                                            <td style={{ fontWeight: 'bold', color: 'var(--secondary-color)' }}>Rs.{order.totalAmount}</td>
                                            <td>
                                                <select
                                                    value={order.status}
                                                    onChange={async (e) => {
                                                        try {
                                                            const newStatus = e.target.value;
                                                            await axios.put(`${API_URL}/orders/${order._id}/status`, { status: newStatus });
                                                            fetchOrders();
                                                        } catch (err) {
                                                            console.error('Failed to update status', err);
                                                            alert('Failed to update status');
                                                        }
                                                    }}
                                                    className={`status-badge ${order.status.toLowerCase().replace(' ', '')}`}
                                                    style={{
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        outline: 'none',
                                                        appearance: 'none',
                                                        paddingRight: '1rem',
                                                        textAlign: 'center'
                                                    }}
                                                >
                                                    <option style={{ color: 'black' }} value="Pending Payment">Pending</option>
                                                    <option style={{ color: 'black' }} value="Processing">Processing</option>
                                                    <option style={{ color: 'black' }} value="Shipped">Shipped</option>
                                                    <option style={{ color: 'black' }} value="Completed">Completed</option>
                                                    <option style={{ color: 'black' }} value="Returned">Returned</option>
                                                    <option style={{ color: 'black' }} value="Cancelled">Cancelled</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )
            }

            {
                activeTab === 'salons' && (
                    <div className="admin-grid-vertical" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <section className="glass-container">
                            <h2>{editingSalonId ? 'Edit Salon' : 'Create New Salon'}</h2>
                            <form onSubmit={editingSalonId ? handleUpdateSalon : handleCreateSalon}>
                                <input
                                    type="text"
                                    placeholder="Salon Name"
                                    value={newSalon.name}
                                    onChange={(e) => setNewSalon({ ...newSalon, name: e.target.value })}
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Location"
                                    value={newSalon.location}
                                    onChange={(e) => setNewSalon({ ...newSalon, location: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="Contact Number"
                                    value={newSalon.contactNumber}
                                    onChange={(e) => setNewSalon({ ...newSalon, contactNumber: e.target.value })}
                                />
                                <button type="submit" className="btn-primary" style={{ width: '100%', marginBottom: editingSalonId ? '0.5rem' : '0' }}>
                                    {editingSalonId ? 'Update Salon' : 'Generate QR Code'}
                                </button>
                                {editingSalonId && (
                                    <button
                                        type="button"
                                        className="btn-primary outline"
                                        style={{ width: '100%' }}
                                        onClick={handleCancelEdit}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </form>


                            {qrCode && (
                                <div style={{ marginTop: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '1rem' }}>
                                    <h3>Salon Created Successfully!</h3>

                                    <div style={{ marginBottom: '2rem' }}>
                                        <img src={qrCode} alt="Salon QR" style={{ borderRadius: '8px', border: '5px solid white', maxWidth: '200px' }} />
                                        <br />
                                        <a href={qrCode} download={`salon-qr.png`} style={{ color: 'var(--secondary-color)', marginTop: '1rem', display: 'inline-block' }}>Download QR</a>
                                    </div>

                                    {newCredentials && (
                                        <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--secondary-color)' }}>
                                            <h4 style={{ color: 'var(--secondary-color)', marginTop: 0 }}>IMPORTANT CREDENTIALS</h4>
                                            <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', opacity: 0.8 }}>Please save these credentials to share with the salon owner. The password will not be shown again.</p>

                                            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 'bold' }}>Username:</span>
                                                <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{newCredentials.username}</code>

                                                <span style={{ fontWeight: 'bold' }}>Password:</span>
                                                <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{newCredentials.password}</code>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        <section className="glass-container">
                            <h2>Registered Salons</h2>
                            <div className="salon-grid">
                                {salons
                                    .filter(salon => {
                                        if (selectedSalonId && salon._id !== selectedSalonId) return false;
                                        if (!searchTerm) return true;
                                        const term = searchTerm.toLowerCase();
                                        return (
                                            salon.name.toLowerCase().includes(term) ||
                                            (salon.location && salon.location.toLowerCase().includes(term)) ||
                                            (salon.username && salon.username.toLowerCase().includes(term))
                                        );
                                    })
                                    .map(salon => (
                                        <div key={salon._id} className="salon-card">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'white' }}>{salon.name}</h3>
                                                    <div className="salon-meta" style={{ marginTop: '0.25rem' }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                                        {salon.location || 'No Location'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="credential-box">
                                                <div className="credential-row">
                                                    <span style={{ opacity: 0.6 }}>User:</span>
                                                    <span className="mono-text">{salon.username}</span>
                                                </div>
                                                <div className="credential-row">
                                                    <span style={{ opacity: 0.6 }}>Pass:</span>
                                                    <span className="mono-text" style={{ color: salon.plainPassword ? '#4ade80' : 'inherit' }}>
                                                        {salon.plainPassword || '••••••'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="card-actions">
                                                <button
                                                    onClick={() => handleDownloadQR(salon)}
                                                    className="icon-btn success"
                                                    title="Download QR"
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                                                </button>
                                                <a
                                                    href={`/order/${salon._id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="icon-btn primary"
                                                    title="Visit Shop"
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                                </a>
                                                <button
                                                    onClick={() => handleEditClick(salon)}
                                                    className="icon-btn primary"
                                                    title="Edit Salon"
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSalon(salon._id)}
                                                    className="icon-btn danger"
                                                    title="Delete Salon"
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </section>
                    </div>
                )
            }

            {activeTab === 'products' && (
                <div style={{ display: 'flex', gap: '2rem', flexDirection: 'column' }}>
                    <section className="glass-container">
                        <h2>{editingProductId ? 'Edit Product' : 'Add New Product'}</h2>
                        <form onSubmit={handleProductSubmit}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <input
                                    type="text"
                                    placeholder="Product Name"
                                    value={newProduct.name}
                                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                    required
                                    style={{ flex: 2 }}
                                />
                                <input
                                    type="number"
                                    placeholder="Price (LKR)"
                                    value={newProduct.price}
                                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                                    required
                                    style={{ flex: 1 }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
                                <select
                                    value={newProduct.discountType}
                                    onChange={(e) => setNewProduct({ ...newProduct, discountType: e.target.value })}
                                    style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', flex: 1 }}
                                >
                                    <option value="none">No Discount</option>
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="amount">Fixed Amount (LKR)</option>
                                </select>
                                {newProduct.discountType !== 'none' && (
                                    <input
                                        type="number"
                                        placeholder="Discount Value"
                                        value={newProduct.discountValue}
                                        onChange={(e) => setNewProduct({ ...newProduct, discountValue: e.target.value })}
                                        required
                                        style={{ flex: 1 }}
                                    />
                                )}
                            </div>

                            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                                    {editingProductId ? 'Update Product' : 'Add Product'}
                                </button>
                                {editingProductId && (
                                    <button
                                        type="button"
                                        className="btn-primary outline"
                                        style={{ flex: 1 }}
                                        onClick={() => {
                                            setNewProduct({ name: '', price: '', discountType: 'none', discountValue: 0 });
                                            setEditingProductId(null);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </section>

                    <section className="glass-container">
                        <h2>Product List</h2>
                        <div className="salon-grid" style={{ marginTop: '1rem' }}>
                            {products.map(p => (
                                <div key={p._id} className="salon-card" style={{ gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{p.name}</h3>
                                        <span className={`status-badge ${p.discountType !== 'none' ? 'cancelled' : 'returned'}`}>
                                            Rs.{p.finalPrice}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                                        Base: Rs.{p.price}
                                        {p.discountType !== 'none' && (
                                            <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>
                                                ({p.discountType === 'percentage' ? `${p.discountValue}%` : `Rs.${p.discountValue}`} OFF)
                                            </span>
                                        )}
                                    </div>

                                    <div className="card-actions" style={{ marginTop: '1rem' }}>
                                        <button
                                            onClick={() => handleEditProduct(p)}
                                            className="icon-btn primary"
                                            title="Edit Product"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteProduct(p._id)}
                                            className="icon-btn danger"
                                            title="Delete Product"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            )}

            {
                activeTab === 'monitor' && (
                    <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <section className="glass-container">
                            <h2>Salon Performance</h2>
                            <div className="table-container">
                                <table className="styled-table">
                                    <thead>
                                        <tr>
                                            <th>Salon</th>
                                            <th>Valid Orders</th>
                                            <th>Returns</th>
                                            <th>Cancelled</th>
                                            <th>Items Sold</th>
                                            <th>Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {salonPerformance
                                            .filter(stat => {
                                                if (!searchTerm) return true;
                                                return (stat.salonName || '').toLowerCase().includes(searchTerm.toLowerCase());
                                            })
                                            .map(stat => (
                                                <tr key={stat._id}>
                                                    <td>{stat.salonName || 'Unknown'}</td>
                                                    <td>{stat.totalOrders}</td>
                                                    <td style={{ color: '#94a3b8' }}>{stat.returnedOrders || 0}</td>
                                                    <td style={{ color: '#ef4444' }}>{stat.cancelledOrders || 0}</td>
                                                    <td>{stat.totalItemsSold}</td>
                                                    <td>Rs.{stat.totalRevenue}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="glass-container">
                            <h2>Item Performance</h2>
                            <div className="table-container">
                                <table className="styled-table">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Qty Sold</th>
                                            <th>Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {itemPerformance
                                            .filter(stat => {
                                                if (!searchTerm) return true;
                                                return (stat._id || '').toLowerCase().includes(searchTerm.toLowerCase());
                                            })
                                            .map(stat => (
                                                <tr key={stat._id}>
                                                    <td>{stat._id}</td>
                                                    <td>{stat.totalQuantity}</td>
                                                    <td>Rs.{stat.totalRevenue}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                )
            }

        </div >
    );
};

export default AdminDashboard;
