import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import QRCode from 'qrcode';

const API_URL = import.meta.env.VITE_API_URL || 'https://salonfadna-backend.onrender.com/api';

const SalesmanDashboard = () => {
    const [salons, setSalons] = useState([]);
    const [newSalon, setNewSalon] = useState({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, latitude: null, longitude: null });
    const [qrCode, setQrCode] = useState(null);
    const [newCredentials, setNewCredentials] = useState(null);
    const [createdSalon, setCreatedSalon] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingSalonId, setEditingSalonId] = useState(null);
    const [expandedSalonId, setExpandedSalonId] = useState(null);
    const [showRegisterForm, setShowRegisterForm] = useState(false);
    const [editFormData, setEditFormData] = useState({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, latitude: null, longitude: null });
    const navigate = useNavigate();

    useEffect(() => {
        const storedSalesman = localStorage.getItem('salesmanUser');
        if (!storedSalesman) {
            navigate('/login');
        }
        fetchSalons();
    }, [navigate]);

    const fetchSalons = async () => {
        try {
            const res = await axios.get(`${API_URL}/salons`);
            if (res.data.success) setSalons(res.data.salons);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateSalon = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_URL}/salons`, newSalon);
            if (res.data.success) {
                setQrCode(res.data.qrCode);
                setNewSalon({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, latitude: null, longitude: null });
                fetchSalons();
                setNewCredentials(res.data.credentials);
                setCreatedSalon(res.data.salon);
            }
        } catch (err) {
            alert('Error creating salon');
            console.error(err);
        }
    };

    const handleDownloadQR = async (salon) => {
        // Simple download logic (could re-use SVG generation if needed, but for now just the basic data URL)
        const link = document.createElement('a');
        link.href = qrCode;
        link.download = `${salon.name.replace(/\s+/g, '_')}-qr.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpdateSalon = async (e) => {
        e.preventDefault();
        try {
            const role = localStorage.getItem('adminRole');
            const username = localStorage.getItem('loggedInUsername');
            const editedByValue = role === 'admin' ? 'admin' : username;
            const payload = { ...editFormData, editedBy: editedByValue };
            const res = await axios.put(`${API_URL}/salons/${editingSalonId}`, payload);
            if (res.data.success) {
                alert('Salon updated successfully');
                setEditingSalonId(null);
                fetchSalons();
            }
        } catch (err) {
            alert('Error updating salon');
            console.error(err);
        }
    };

    const captureLocation = (isEdit = false) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (isEdit) {
                        setEditFormData(prev => ({ ...prev, latitude: position.coords.latitude, longitude: position.coords.longitude }));
                    } else {
                        setNewSalon(prev => ({ ...prev, latitude: position.coords.latitude, longitude: position.coords.longitude }));
                    }
                    alert('Location captured successfully!');
                },
                (error) => {
                    console.error('Error fetching location:', error);
                    alert('Could not capture location. Please ensure location services are enabled.');
                }
            );
        } else {
            alert('Geolocation is not supported by your browser.');
        }
    };

    const startEditing = (salon) => {
        setEditingSalonId(salon._id);
        setEditFormData({
            name: salon.name,
            location: salon.location || '',
            contactNumber1: salon.contactNumber1 || salon.contactNumber || '',
            contactNumber2: salon.contactNumber2 || '',
            remark: salon.remark || '',
            accountDetails: salon.accountDetails || { bankName: '', branch: '', accountNumber: '', accountName: '' },
            latitude: salon.latitude || null,
            longitude: salon.longitude || null
        });
    };

    return (
        <div className="container animate-fade-in">
            <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src="/Fadna New Logo.png" alt="Fadna Logo" className="site-logo" style={{ maxHeight: '40px' }} />
                    <h1>Salon Register Page</h1>
                </div>
                <button
                    onClick={() => {
                        localStorage.removeItem('salesmanUser');
                        localStorage.removeItem('adminToken');
                        localStorage.removeItem('adminRole');
                        navigate('/login');
                    }}
                    className="btn-primary outline"
                    style={{ borderColor: '#ef4444', color: '#ef4444', padding: '0.5rem 1rem' }}
                >
                    Log Out
                </button>
            </header>

            <div className="admin-grid-vertical" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <section className="glass-container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showRegisterForm ? '1.5rem' : '0' }}>
                        <h2 style={{ margin: 0 }}>Register New Salon</h2>
                        <button onClick={() => setShowRegisterForm(!showRegisterForm)} className="btn-primary" style={{ padding: '0.4rem 1rem' }}>
                            {showRegisterForm ? 'Close Form' : 'Add New Salon'}
                        </button>
                    </div>
                    {showRegisterForm && (
                        <>
                            <form onSubmit={handleCreateSalon}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <input type="text" placeholder="Salon Name *" value={newSalon.name} onChange={(e) => setNewSalon({ ...newSalon, name: e.target.value })} required />
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input type="text" placeholder="Location" value={newSalon.location} onChange={(e) => setNewSalon({ ...newSalon, location: e.target.value })} style={{ flex: 1 }} />
                                        <button type="button" onClick={() => captureLocation(false)} className="btn-primary outline" style={{ padding: '0 1rem', whiteSpace: 'nowrap' }} title="Capture GPS Coordinates">
                                            📍 Get GPS
                                        </button>
                                    </div>
                                    <input type="text" placeholder="Contact Number 1" value={newSalon.contactNumber1} onChange={(e) => setNewSalon({ ...newSalon, contactNumber1: e.target.value })} />
                                    <input type="text" placeholder="Contact Number 2" value={newSalon.contactNumber2} onChange={(e) => setNewSalon({ ...newSalon, contactNumber2: e.target.value })} />
                                    <input type="text" placeholder="Remark" value={newSalon.remark} onChange={(e) => setNewSalon({ ...newSalon, remark: e.target.value })} style={{ gridColumn: '1 / -1' }} />
                                </div>
                                <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Account Details</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <input type="text" placeholder="Bank Name" value={newSalon.accountDetails.bankName} onChange={(e) => setNewSalon({ ...newSalon, accountDetails: { ...newSalon.accountDetails, bankName: e.target.value } })} />
                                    <input type="text" placeholder="Branch" value={newSalon.accountDetails.branch} onChange={(e) => setNewSalon({ ...newSalon, accountDetails: { ...newSalon.accountDetails, branch: e.target.value } })} />
                                    <input type="text" placeholder="Account Number" value={newSalon.accountDetails.accountNumber} onChange={(e) => setNewSalon({ ...newSalon, accountDetails: { ...newSalon.accountDetails, accountNumber: e.target.value } })} />
                                    <input type="text" placeholder="Account Name" value={newSalon.accountDetails.accountName} onChange={(e) => setNewSalon({ ...newSalon, accountDetails: { ...newSalon.accountDetails, accountName: e.target.value } })} />
                                </div>
                                <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                                    Generate QR Code
                                </button>
                            </form>

                            {qrCode && (
                                <div style={{ marginTop: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '1rem' }}>
                                    <h3>Salon Created Successfully!</h3>
                                    <div style={{ marginBottom: '2rem' }}>
                                        <img src={qrCode} alt="Salon QR" style={{ borderRadius: '8px', border: '5px solid white', maxWidth: '200px' }} />
                                        <div style={{ marginTop: '1rem', fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>
                                            CODE: <span style={{ color: 'var(--secondary-color)' }}>{createdSalon?.salonCode}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDownloadQR(createdSalon)}
                                            className="btn-primary"
                                            style={{ display: 'inline-block', marginTop: '1rem', cursor: 'pointer' }}
                                        >
                                            Download QR
                                        </button>
                                    </div>

                                    {newCredentials && (
                                        <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--secondary-color)' }}>
                                            <h4 style={{ color: 'var(--secondary-color)', marginTop: 0 }}>IMPORTANT CREDENTIALS</h4>
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
                        </>
                    )}
                </section>

                {editingSalonId && (
                    <section className="glass-container animate-fade-in" style={{ border: '2px solid var(--secondary-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>Update Salon Details</h2>
                            <button onClick={() => setEditingSalonId(null)} className="btn-primary outline" style={{ padding: '0.4rem 1rem' }}>Cancel</button>
                        </div>
                        <form onSubmit={handleUpdateSalon}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Salon Name</label><input type="text" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} required /></div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Location</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input type="text" value={editFormData.location} onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })} required style={{ flex: 1 }} />
                                        <button type="button" onClick={() => captureLocation(true)} className="btn-primary outline" style={{ padding: '0 1rem', whiteSpace: 'nowrap' }} title="Capture GPS Coordinates">
                                            📍 Get GPS
                                        </button>
                                    </div>
                                </div>
                                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Contact Number 1</label><input type="text" value={editFormData.contactNumber1} onChange={(e) => setEditFormData({ ...editFormData, contactNumber1: e.target.value })} /></div>
                                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Contact Number 2</label><input type="text" value={editFormData.contactNumber2} onChange={(e) => setEditFormData({ ...editFormData, contactNumber2: e.target.value })} /></div>
                                <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Remark</label><input type="text" value={editFormData.remark} onChange={(e) => setEditFormData({ ...editFormData, remark: e.target.value })} /></div>
                            </div>
                            <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Account Details</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Bank Name</label><input type="text" value={editFormData.accountDetails.bankName} onChange={(e) => setEditFormData({ ...editFormData, accountDetails: { ...editFormData.accountDetails, bankName: e.target.value } })} /></div>
                                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Branch</label><input type="text" value={editFormData.accountDetails.branch} onChange={(e) => setEditFormData({ ...editFormData, accountDetails: { ...editFormData.accountDetails, branch: e.target.value } })} /></div>
                                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Account Number</label><input type="text" value={editFormData.accountDetails.accountNumber} onChange={(e) => setEditFormData({ ...editFormData, accountDetails: { ...editFormData.accountDetails, accountNumber: e.target.value } })} /></div>
                                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Account Name</label><input type="text" value={editFormData.accountDetails.accountName} onChange={(e) => setEditFormData({ ...editFormData, accountDetails: { ...editFormData.accountDetails, accountName: e.target.value } })} /></div>
                            </div>
                            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                                Save Changes
                            </button>
                        </form>
                    </section>
                )}

                <section className="glass-container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0 }}>Your Registered Salons</h2>
                        <div style={{ display: 'flex', gap: '0.5rem', width: '300px' }}>
                            <input
                                type="text"
                                placeholder="Search by name or code..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    padding: '0.6rem 1rem',
                                    borderRadius: '8px 0 0 8px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    margin: 0,
                                    flex: 1
                                }}
                            />
                            <button
                                className="btn-primary"
                                style={{
                                    borderRadius: '0 8px 8px 0',
                                    padding: '0.6rem 1.2rem',
                                    border: 'none',
                                    fontSize: '0.9rem'
                                }}
                            >
                                Search
                            </button>
                        </div>
                    </div>
                    <div className="table-container">
                        <table className="styled-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Name</th>
                                    <th>Location</th>
                                    <th>Code</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salons
                                    .filter(salon => {
                                        if (!searchTerm) return true;
                                        const term = searchTerm.toLowerCase();
                                        return (
                                            salon.name.toLowerCase().includes(term) ||
                                            salon.salonCode.toLowerCase().includes(term) ||
                                            (salon.location || '').toLowerCase().includes(term)
                                        );
                                    })
                                    .slice(0, 20)
                                    .map(salon => (
                                        <React.Fragment key={salon._id}>
                                            <tr>
                                                <td>{new Date(salon.createdAt).toLocaleDateString()}</td>
                                                <td style={{ fontWeight: 'bold' }}>{salon.name}</td>
                                                <td>{salon.location}</td>
                                                <td style={{ color: 'var(--secondary-color)', fontWeight: 'bold' }}>{salon.salonCode}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button onClick={() => setExpandedSalonId(expandedSalonId === salon._id ? null : salon._id)} className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>
                                                            {expandedSalonId === salon._id ? 'Hide' : 'View'} Details
                                                        </button>
                                                        <button onClick={() => startEditing(salon)} className="btn-primary outline" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>
                                                            Edit
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedSalonId === salon._id && (
                                                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                                    <td colSpan="5" style={{ padding: '1rem' }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                                                            <div>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Contact 1:</strong> {salon.contactNumber1 || salon.contactNumber || 'N/A'}</p>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Contact 2:</strong> {salon.contactNumber2 || 'N/A'}</p>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Remark:</strong> {salon.remark || 'N/A'}</p>
                                                            </div>
                                                            <div>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Bank:</strong> {salon.accountDetails?.bankName || 'N/A'}</p>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Branch:</strong> {salon.accountDetails?.branch || 'N/A'}</p>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Account No:</strong> {salon.accountDetails?.accountNumber || 'N/A'}</p>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Account Name:</strong> {salon.accountDetails?.accountName || 'N/A'}</p>
                                                            </div>
                                                        </div>
                                                        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <p style={{ margin: '0.2rem 0' }}><strong>Last Edited By:</strong> {salon.editedBy || 'N/A'}</p>
                                                            {salon.latitude && salon.longitude && (
                                                                <a
                                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${salon.latitude},${salon.longitude}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="btn-primary"
                                                                    style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#3b82f6', borderColor: '#3b82f6' }}
                                                                >
                                                                    📍 Get Directions
                                                                </a>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default SalesmanDashboard;
