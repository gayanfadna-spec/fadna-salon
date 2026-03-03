import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, Plus, X, Search, Store, MapPin, Phone, MessageSquare, Building, Map, Hash, User, ShieldCheck, Download, Edit3, Eye, EyeOff, CheckCircle2, CreditCard } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://salonfadna-backend.onrender.com/api';

const SalesmanDashboard = () => {
    const [salons, setSalons] = useState([]);
    const [newSalon, setNewSalon] = useState({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' } });
    const [qrCode, setQrCode] = useState(null);
    const [newCredentials, setNewCredentials] = useState(null);
    const [createdSalon, setCreatedSalon] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingSalonId, setEditingSalonId] = useState(null);
    const [expandedSalonId, setExpandedSalonId] = useState(null);
    const [showRegisterForm, setShowRegisterForm] = useState(false);
    const [editFormData, setEditFormData] = useState({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' } });
    const [isSubmitting, setIsSubmitting] = useState(false);
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
        setIsSubmitting(true);
        try {
            const res = await axios.post(`${API_URL}/salons`, newSalon);
            if (res.data.success) {
                setQrCode(res.data.qrCode);
                setNewSalon({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' } });
                fetchSalons();
                setNewCredentials(res.data.credentials);
                setCreatedSalon(res.data.salon);
            }
        } catch (err) {
            alert('Error creating salon');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownloadQR = async (salon) => {
        const link = document.createElement('a');
        link.href = qrCode;
        link.download = `${salon.name.replace(/\s+/g, '_')}-qr.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpdateSalon = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
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
        } finally {
            setIsSubmitting(false);
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
            accountDetails: salon.accountDetails || { bankName: '', branch: '', accountNumber: '', accountName: '' }
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetSuccessState = () => {
        setQrCode(null);
        setNewCredentials(null);
        setCreatedSalon(null);
        setShowRegisterForm(false);
    };

    return (
        <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
            <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src="/Fadna New Logo.png" alt="Fadna Logo" className="site-logo" style={{ maxHeight: '45px', objectFit: 'contain' }} />
                    <h1 style={{ margin: 0, fontSize: '1.8rem', background: 'linear-gradient(to right, #ec4899, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Salon Register
                    </h1>
                </div>
                <button
                    onClick={() => {
                        localStorage.removeItem('salesmanUser');
                        localStorage.removeItem('adminToken');
                        localStorage.removeItem('adminRole');
                        navigate('/login');
                    }}
                    className="btn-primary"
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                >
                    <LogOut size={16} /> Log Out
                </button>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Search Bar Section - Made Prominent */}
                <section className="glass-container" style={{ padding: '1rem 2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder="Search salons by name, code or location..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(0,0,0,0.2)',
                                    color: 'white',
                                    fontSize: '0.95rem',
                                    margin: 0,
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>
                        <button
                            onClick={() => {
                                setShowRegisterForm(!showRegisterForm);
                                setEditingSalonId(null);
                                if (qrCode) resetSuccessState();
                            }}
                            className="btn-primary"
                            style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', borderRadius: '8px', fontSize: '0.9rem' }}
                        >
                            {showRegisterForm ? <X size={18} /> : <Plus size={18} />}
                            {showRegisterForm ? 'Close Form' : 'Register New Salon'}
                        </button>
                    </div>
                </section>

                {/* Create/Edit Form Context */}
                {(showRegisterForm || editingSalonId) && !qrCode && (
                    <section className="glass-container animate-fade-in" style={{ border: editingSalonId ? '2px solid var(--accent-color)' : '1px solid var(--glass-border)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: editingSalonId ? 'var(--accent-color)' : 'var(--primary-color)' }}></div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', background: 'none', WebkitTextFillColor: 'initial' }}>
                                {editingSalonId ? <><Edit3 size={24} color="var(--accent-color)" /> Update Salon</> : <><Store size={24} color="var(--primary-color)" /> Register Salon</>}
                            </h2>
                            {editingSalonId && (
                                <button onClick={() => setEditingSalonId(null)} className="icon-btn danger" style={{ background: 'rgba(239,68,68,0.1)', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <X size={16} /> Cancel
                                </button>
                            )}
                        </div>

                        <form onSubmit={editingSalonId ? handleUpdateSalon : handleCreateSalon}>
                            {/* Group 1: Basic Information */}
                            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e2e8f0', background: 'none', WebkitTextFillColor: 'initial' }}>
                                    <Store size={18} /> Basic Information
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1' }}>Salon Name <span style={{ color: '#ef4444' }}>*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <Store size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                            <input type="text" placeholder="e.g. Dream Style" value={editingSalonId ? editFormData.name : newSalon.name} onChange={(e) => editingSalonId ? setEditFormData({ ...editFormData, name: e.target.value }) : setNewSalon({ ...newSalon, name: e.target.value })} required style={{ padding: '0.6rem 0.6rem 0.6rem 2.25rem', margin: 0, fontSize: '0.9rem' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1' }}>Location / City <span style={{ color: '#ef4444' }}>*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <MapPin size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                            <input type="text" placeholder="e.g. Colombo 03" value={editingSalonId ? editFormData.location : newSalon.location} onChange={(e) => editingSalonId ? setEditFormData({ ...editFormData, location: e.target.value }) : setNewSalon({ ...newSalon, location: e.target.value })} required style={{ padding: '0.6rem 0.6rem 0.6rem 2.25rem', margin: 0, fontSize: '0.9rem' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1' }}>Contact No. 1</label>
                                        <div style={{ position: 'relative' }}>
                                            <Phone size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                            <input type="text" placeholder="077..." value={editingSalonId ? editFormData.contactNumber1 : newSalon.contactNumber1} onChange={(e) => editingSalonId ? setEditFormData({ ...editFormData, contactNumber1: e.target.value }) : setNewSalon({ ...newSalon, contactNumber1: e.target.value })} style={{ padding: '0.6rem 0.6rem 0.6rem 2.25rem', margin: 0, fontSize: '0.9rem' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1' }}>Contact No. 2</label>
                                        <div style={{ position: 'relative' }}>
                                            <Phone size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                            <input type="text" placeholder="Optional" value={editingSalonId ? editFormData.contactNumber2 : newSalon.contactNumber2} onChange={(e) => editingSalonId ? setEditFormData({ ...editFormData, contactNumber2: e.target.value }) : setNewSalon({ ...newSalon, contactNumber2: e.target.value })} style={{ padding: '0.6rem 0.6rem 0.6rem 2.25rem', margin: 0, fontSize: '0.9rem' }} />
                                        </div>
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1' }}>Remarks</label>
                                        <div style={{ position: 'relative' }}>
                                            <MessageSquare size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.65rem', color: '#64748b' }} />
                                            <textarea
                                                placeholder="..."
                                                value={editingSalonId ? editFormData.remark : newSalon.remark}
                                                onChange={(e) => editingSalonId ? setEditFormData({ ...editFormData, remark: e.target.value }) : setNewSalon({ ...newSalon, remark: e.target.value })}
                                                style={{
                                                    width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.25rem', borderRadius: '8px',
                                                    border: '1px solid var(--glass-border)', background: 'rgba(255, 255, 255, 0.05)',
                                                    color: 'white', minHeight: '38px', height: '38px', fontFamily: 'inherit', resize: 'vertical', fontSize: '0.9rem'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Group 2: Account Details */}
                            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e2e8f0', background: 'none', WebkitTextFillColor: 'initial' }}>
                                    <CreditCard size={18} /> Financial Details
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1' }}>Bank Name</label>
                                        <div style={{ position: 'relative' }}>
                                            <Building size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                            <input type="text" placeholder="e.g. Commercial" value={editingSalonId ? editFormData.accountDetails.bankName : newSalon.accountDetails.bankName} onChange={(e) => { const path = editingSalonId ? setEditFormData : setNewSalon; const data = editingSalonId ? editFormData : newSalon; path({ ...data, accountDetails: { ...data.accountDetails, bankName: e.target.value } }) }} style={{ padding: '0.6rem 0.6rem 0.6rem 2.25rem', margin: 0, fontSize: '0.9rem' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1' }}>Branch</label>
                                        <div style={{ position: 'relative' }}>
                                            <Map size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                            <input type="text" placeholder="e.g. Col 03" value={editingSalonId ? editFormData.accountDetails.branch : newSalon.accountDetails.branch} onChange={(e) => { const path = editingSalonId ? setEditFormData : setNewSalon; const data = editingSalonId ? editFormData : newSalon; path({ ...data, accountDetails: { ...data.accountDetails, branch: e.target.value } }) }} style={{ padding: '0.6rem 0.6rem 0.6rem 2.25rem', margin: 0, fontSize: '0.9rem' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1' }}>A/C Number</label>
                                        <div style={{ position: 'relative' }}>
                                            <Hash size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                            <input type="text" placeholder="..." value={editingSalonId ? editFormData.accountDetails.accountNumber : newSalon.accountDetails.accountNumber} onChange={(e) => { const path = editingSalonId ? setEditFormData : setNewSalon; const data = editingSalonId ? editFormData : newSalon; path({ ...data, accountDetails: { ...data.accountDetails, accountNumber: e.target.value } }) }} style={{ padding: '0.6rem 0.6rem 0.6rem 2.25rem', margin: 0, fontSize: '0.9rem' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1' }}>A/C Name</label>
                                        <div style={{ position: 'relative' }}>
                                            <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                            <input type="text" placeholder="e.g. John Doe" value={editingSalonId ? editFormData.accountDetails.accountName : newSalon.accountDetails.accountName} onChange={(e) => { const path = editingSalonId ? setEditFormData : setNewSalon; const data = editingSalonId ? editFormData : newSalon; path({ ...data, accountDetails: { ...data.accountDetails, accountName: e.target.value } }) }} style={{ padding: '0.6rem 0.6rem 0.6rem 2.25rem', margin: 0, fontSize: '0.9rem' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                {editingSalonId && (
                                    <button type="button" onClick={() => setEditingSalonId(null)} className="btn-primary" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '0.6rem 1rem', fontSize: '0.9rem' }}>Cancel</button>
                                )}
                                <button type="submit" className="btn-primary" disabled={isSubmitting} style={{
                                    padding: '0.6rem 1.25rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    opacity: isSubmitting ? 0.7 : 1, width: editingSalonId ? 'auto' : '100%', justifyContent: 'center'
                                }}>
                                    {isSubmitting ? (
                                        <span>Saving...</span>
                                    ) : (
                                        editingSalonId ? <><ShieldCheck size={18} /> Save Changes</> : <><CheckCircle2 size={18} /> Register Salon</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </section>
                )}

                {/* Success View for Registration */}
                {qrCode && (
                    <section className="glass-container animate-fade-in" style={{
                        border: '2px solid #4ade80', background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(0,0,0,0.4))',
                        textAlign: 'center', position: 'relative', overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(74,222,128,0.2) 0%, transparent 70%)', pointerEvents: 'none' }}></div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
                            <div style={{ background: 'rgba(74,222,128,0.2)', padding: '1rem', borderRadius: '50%', display: 'inline-flex', marginBottom: '-1rem' }}>
                                <CheckCircle2 size={48} color="#4ade80" />
                            </div>
                            <h2 style={{ color: '#4ade80', margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.5)', WebkitTextFillColor: 'initial', background: 'none' }}>
                                Salon Registered Successfully!
                            </h2>
                            <p style={{ color: '#cbd5e1', fontSize: '1.1rem', margin: 0 }}>The salon has been added and credentials generated.</p>

                            <div style={{ background: 'white', padding: '1rem', borderRadius: '16px', display: 'inline-block', marginTop: '1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                                <img src={qrCode} alt="Salon QR" style={{ width: '200px', height: '200px', display: 'block' }} />
                            </div>

                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', letterSpacing: '2px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.3)', padding: '0.75rem 2rem', borderRadius: '8px' }}>
                                CODE: <span style={{ color: '#4ade80' }}>{createdSalon?.salonCode}</span>
                            </div>

                            <button onClick={() => handleDownloadQR(createdSalon)} className="btn-primary" style={{ background: '#4ade80', color: '#064e3b', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontWeight: 'bold' }}>
                                <Download size={20} /> Download QR Image
                            </button>

                            {newCredentials && (
                                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: '500px', marginTop: '1rem', textAlign: 'left' }}>
                                    <h4 style={{ color: '#e2e8f0', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                                        <ShieldCheck size={20} color="#4ade80" /> Important Credentials
                                    </h4>
                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1rem', alignItems: 'center' }}>
                                        <span style={{ color: '#94a3b8', fontWeight: '500' }}>Username:</span>
                                        <code style={{ background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', borderRadius: '6px', color: '#f8fafc', fontSize: '1.1rem', letterSpacing: '1px', border: '1px solid rgba(255,255,255,0.1)' }}>{newCredentials.username}</code>

                                        <span style={{ color: '#94a3b8', fontWeight: '500' }}>Password:</span>
                                        <code style={{ background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', borderRadius: '6px', color: '#f8fafc', fontSize: '1.1rem', letterSpacing: '1px', border: '1px solid rgba(255,255,255,0.1)' }}>{newCredentials.password}</code>
                                    </div>
                                    <p style={{ color: '#fbbf24', fontSize: '0.85rem', margin: '1rem 0 0 0', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                        ⚠️ Please securely share these details with the salon.
                                    </p>
                                </div>
                            )}

                            <button onClick={resetSuccessState} className="btn-primary" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', marginTop: '1rem' }}>
                                Done & Return
                            </button>
                        </div>
                    </section>
                )}

                {/* Salon List Section */}
                <section className="glass-container">
                    <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem' }}>
                        <Store size={24} /> Registered Salons ({salons.length})
                    </h2>

                    <div className="salon-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
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
                            .slice(0, 30) // Show up to 30 matching for perf
                            .map(salon => (
                                <div key={salon._id} className="salon-card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: 0, right: 0, padding: '0.5rem 1rem', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', fontWeight: 'bold', borderBottomLeftRadius: '12px', fontSize: '0.9rem', letterSpacing: '1px' }}>
                                        {salon.salonCode}
                                    </div>

                                    <div style={{ paddingRight: '4rem', marginBottom: '1rem' }}>
                                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: '#f8fafc', WebkitTextFillColor: 'initial', background: 'none' }}>{salon.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                                            <MapPin size={14} /> {salon.location || 'Location Not Set'}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#cbd5e1', fontSize: '0.9rem' }}>
                                            <Phone size={14} color="#64748b" /> {salon.contactNumber1 || salon.contactNumber || 'No Contact Info'}
                                        </div>
                                    </div>

                                    {/* Action Buttons Container */}
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                                        <button
                                            onClick={() => setExpandedSalonId(expandedSalonId === salon._id ? null : salon._id)}
                                            className="icon-btn"
                                            style={{ flex: 1, padding: '0.6rem', background: expandedSalonId === salon._id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)', color: '#e2e8f0', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                                        >
                                            {expandedSalonId === salon._id ? <><EyeOff size={16} /> Hide</> : <><Eye size={16} /> Details</>}
                                        </button>
                                        <button
                                            onClick={() => startEditing(salon)}
                                            className="icon-btn primary"
                                            style={{ flex: 1, padding: '0.6rem', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                                        >
                                            <Edit3 size={16} /> Edit
                                        </button>
                                    </div>

                                    {/* Expanded Details Panel */}
                                    {expandedSalonId === salon._id && (
                                        <div className="animate-fade-in" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', fontSize: '0.9rem' }}>
                                                {/* More Contact & Info */}
                                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
                                                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Additional Info</h4>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Contact 2:</span> <span style={{ color: '#e2e8f0', textAlign: 'right' }}>{salon.contactNumber2 || '-'}</span></div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Remark:</span> <span style={{ color: '#e2e8f0', textAlign: 'right' }}>{salon.remark || '-'}</span></div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Registered:</span> <span style={{ color: '#e2e8f0', textAlign: 'right' }}>{new Date(salon.createdAt).toLocaleDateString()}</span></div>
                                                    </div>
                                                </div>

                                                {/* Account Details View */}
                                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
                                                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Account Details</h4>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Bank:</span> <span style={{ color: '#e2e8f0', textAlign: 'right' }}>{salon.accountDetails?.bankName || '-'}</span></div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Branch:</span> <span style={{ color: '#e2e8f0', textAlign: 'right' }}>{salon.accountDetails?.branch || '-'}</span></div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>A/C No:</span> <span style={{ color: '#e2e8f0', textAlign: 'right', fontFamily: 'monospace' }}>{salon.accountDetails?.accountNumber || '-'}</span></div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>A/C Name:</span> <span style={{ color: '#e2e8f0', textAlign: 'right' }}>{salon.accountDetails?.accountName || '-'}</span></div>
                                                    </div>
                                                </div>

                                                {/* Edit Info */}
                                                {salon.editedBy && (
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', marginTop: '0.5rem' }}>
                                                        Last edited by: {salon.editedBy}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                        {salons.length === 0 && (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                <Store size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                <h3>No Salons Found</h3>
                                <p>No salons match your search or you haven't registered any yet.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default SalesmanDashboard;
