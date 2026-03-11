import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, Plus, X, Search, Store, MapPin, Phone, MessageSquare, Building, Map, Hash, User, ShieldCheck, Download, Edit3, Eye, EyeOff, CheckCircle2, CreditCard } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://salonfadna-backend.onrender.com/api';

const SalesmanDashboard = () => {
    const [salons, setSalons] = useState([]);
    const [newSalon, setNewSalon] = useState({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '' });
    const [qrCode, setQrCode] = useState(null);
    const [newCredentials, setNewCredentials] = useState(null);
    const [createdSalon, setCreatedSalon] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingSalonId, setEditingSalonId] = useState(null);
    const [expandedSalonId, setExpandedSalonId] = useState(null);
    const [formMode, setFormMode] = useState(null); // 'create' | 'assign' | 'draft' | null
    const [editFormData, setEditFormData] = useState({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '', isDraft: false });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reps, setReps] = useState([]);
    const [selectedExcelFile, setSelectedExcelFile] = useState(null);
    const [newBulkSalons, setNewBulkSalons] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const storedSalesman = localStorage.getItem('salesmanUser');
        if (!storedSalesman) {
            navigate('/login');
        }
        fetchSalons();
        fetchReps();
    }, [navigate]);

    const fetchReps = async () => {
        try {
            const res = await axios.get(`${API_URL}/reps`);
            if (res.data.success) setReps(res.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchSalons = async () => {
        try {
            const res = await axios.get(`${API_URL}/salons`);
            if (res.data.success) setSalons(res.data.salons);
        } catch (err) {
            console.error(err);
        }
    };

    const handleExcelUpload = async () => {
        if (!selectedExcelFile) return;

        if (!newSalon.repName) {
            alert('Please select a Representative before uploading the Excel/CSV file.');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedExcelFile);
        formData.append('repName', newSalon.repName);

        try {
            const res = await axios.post(`${API_URL}/salons/bulk-upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (res.data.success) {
                const count = res.data.salons ? res.data.salons.length : '';
                alert(`Successfully registered ${count} salons from file!`);
                if (res.data.salons) {
                    setNewBulkSalons(res.data.salons);
                }
                setSelectedExcelFile(null);
                fetchSalons();
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert(error.response?.data?.error || error.response?.data?.message || 'Error uploading file');
        }
    };

    const handleCreateSalon = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (formMode === 'assign') {
                if (!newSalon.assignToCode || newSalon.assignToCode.trim() === '') {
                    alert('Please enter a Salon Code to assign to.');
                    setIsSubmitting(false);
                    return;
                }
                const role = localStorage.getItem('adminRole');
                const username = localStorage.getItem('loggedInUsername') || localStorage.getItem('salesmanUser');
                const editedByValue = role === 'admin' ? 'admin' : (username || 'salesman');
                const payload = { ...newSalon, editedBy: editedByValue };

                const res = await axios.put(`${API_URL}/salons/assign`, payload);
                if (res.data.success) {
                    alert(`Successfully assigned details to Salon Code: ${newSalon.assignToCode}`);
                    setNewSalon({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '' });
                    fetchSalons();
                    setFormMode(null);
                }
            } else {
                const res = await axios.post(`${API_URL}/salons`, { ...newSalon, isDraft: formMode === 'draft' });
                if (res.data.success) {
                    if (formMode === 'draft') {
                        alert('Draft details saved successfully!');
                        setNewSalon({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '' });
                        fetchSalons();
                        setFormMode(null);
                    } else {
                        setQrCode(res.data.qrCode);
                        setNewSalon({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '' });
                        fetchSalons();
                        setNewCredentials(res.data.credentials);
                        setCreatedSalon(res.data.salon);
                    }
                }
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error saving salon');
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

            let res;
            if (editFormData.isDraft && editFormData.assignToCode && editFormData.assignToCode.trim() !== '') {
                res = await axios.put(`${API_URL}/salons/${editingSalonId}/merge`, payload);
            } else {
                res = await axios.put(`${API_URL}/salons/${editingSalonId}`, payload);
            }

            if (res.data.success) {
                alert('Salon updated successfully');
                setEditingSalonId(null);
                fetchSalons();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error updating salon');
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
            repName: salon.repName || '',
            accountDetails: salon.accountDetails || { bankName: '', branch: '', accountNumber: '', accountName: '' },
            isVisited: salon.isVisited || false,
            visitedDate: salon.visitedDate ? salon.visitedDate.split('T')[0] : '',
            revisitedDates: salon.revisitedDates || [],
            isActive: salon.isActive || false,
            posmActive: salon.posmActive || false,
            isDraft: !salon.salonCode,
            assignToCode: ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetSuccessState = () => {
        setQrCode(null);
        setNewCredentials(null);
        setCreatedSalon(null);
        setFormMode(null);
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
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => {
                                    if (formMode === 'create') setFormMode(null); else setFormMode('create');
                                    setEditingSalonId(null);
                                    if (qrCode) resetSuccessState();
                                }}
                                className="btn-primary"
                                style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', borderRadius: '8px', fontSize: '0.9rem' }}
                            >
                                {formMode === 'create' ? <X size={18} /> : <Plus size={18} />}
                                {formMode === 'create' ? 'Close Form' : 'Register New Salon'}
                            </button>
                            <button
                                onClick={() => {
                                    if (formMode === 'assign') setFormMode(null); else setFormMode('assign');
                                    setEditingSalonId(null);
                                    if (qrCode) resetSuccessState();
                                }}
                                className="btn-primary outline"
                                style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid var(--primary-color)', color: 'var(--primary-color)' }}
                            >
                                {formMode === 'assign' ? <X size={18} /> : <Hash size={18} />}
                                {formMode === 'assign' ? 'Close Form' : 'Assign Setup'}
                            </button>
                            <button
                                onClick={() => {
                                    if (formMode === 'draft') setFormMode(null); else setFormMode('draft');
                                    setEditingSalonId(null);
                                    if (qrCode) resetSuccessState();
                                }}
                                className="btn-primary outline"
                                style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid #eab308', color: '#eab308' }}
                            >
                                {formMode === 'draft' ? <X size={18} /> : <Edit3 size={18} />}
                                {formMode === 'draft' ? 'Close Form' : 'Add Details Only'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* Create/Edit Form Context */}
                {(formMode || editingSalonId) && !qrCode && (
                    <section className="glass-container animate-fade-in" style={{ border: editingSalonId ? '2px solid var(--accent-color)' : '1px solid var(--glass-border)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: editingSalonId ? 'var(--accent-color)' : 'var(--primary-color)' }}></div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', background: 'none', WebkitTextFillColor: 'initial' }}>
                                {editingSalonId ? <><Edit3 size={24} color="var(--accent-color)" /> Update Salon</> : (formMode === 'assign' ? <><Hash size={24} color="var(--primary-color)" /> Assign to QR Code</> : (formMode === 'draft' ? <><Edit3 size={24} color="#eab308" /> Add Draft Details</> : <><Store size={24} color="var(--primary-color)" /> Register Salon</>))}
                            </h2>
                            {editingSalonId && (
                                <button onClick={() => setEditingSalonId(null)} className="icon-btn danger" style={{ background: 'rgba(239,68,68,0.1)', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <X size={16} /> Cancel
                                </button>
                            )}
                        </div>

                        <form onSubmit={editingSalonId ? handleUpdateSalon : handleCreateSalon}>
                            {/* Group 0: Assign Pre-Registered Code */}
                            {formMode === 'assign' && !editingSalonId && (
                                <div style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', background: 'none', WebkitTextFillColor: 'initial' }}>
                                        <Hash size={18} /> Enter Pre-Registered QR Code
                                    </h3>
                                    <p style={{ fontSize: '0.85rem', color: '#bae6fd', marginBottom: '1rem', opacity: 0.8 }}>
                                        Enter the 6-character Salon Code from the pre-printed QR card to assign these details to it.
                                    </p>
                                    <div>
                                        <div style={{ position: 'relative', maxWidth: '300px' }}>
                                            <Hash size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                            <input
                                                type="text"
                                                placeholder="e.g. AB1234"
                                                value={newSalon.assignToCode}
                                                onChange={(e) => setNewSalon({ ...newSalon, assignToCode: e.target.value.toUpperCase() })}
                                                required={formMode === 'assign'}
                                                style={{ padding: '0.6rem 0.6rem 0.6rem 2.25rem', margin: 0, fontSize: '1rem', letterSpacing: '2px', fontWeight: 'bold' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Group 0B: Assign Draft to Code (Only visible in Edit Mode of a Draft) */}
                            {editingSalonId && editFormData.isDraft && (
                                <div style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', background: 'none', WebkitTextFillColor: 'initial' }}>
                                        <Hash size={18} /> Assign to Pre-Registered QR Code (Optional)
                                    </h3>
                                    <p style={{ fontSize: '0.85rem', color: '#bae6fd', marginBottom: '1rem', opacity: 0.8 }}>
                                        You can turn this Draft into a real Salon Record by entering a pre-registered 6-character Salon Code.
                                    </p>
                                    <div>
                                        <div style={{ position: 'relative', maxWidth: '300px' }}>
                                            <Hash size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                            <input
                                                type="text"
                                                placeholder="e.g. AB1234"
                                                value={editFormData.assignToCode}
                                                onChange={(e) => setEditFormData({ ...editFormData, assignToCode: e.target.value.toUpperCase() })}
                                                style={{ padding: '0.6rem 0.6rem 0.6rem 2.25rem', margin: 0, fontSize: '1rem', letterSpacing: '2px', fontWeight: 'bold' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

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
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1' }}>Rep Name</label>
                                        <div style={{ position: 'relative' }}>
                                            <User size={16} strokeWidth={2.5} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                            <select
                                                value={editingSalonId ? editFormData.repName : newSalon.repName}
                                                onChange={(e) => editingSalonId ? setEditFormData({ ...editFormData, repName: e.target.value }) : setNewSalon({ ...newSalon, repName: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.6rem 0.6rem 0.6rem 2.25rem',
                                                    margin: 0,
                                                    fontSize: '0.9rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--glass-border)',
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    color: 'white',
                                                    appearance: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value="">Select Rep Name</option>
                                                {reps.map(rep => (
                                                    <option key={rep._id} value={rep.name}>{rep.name}</option>
                                                ))}
                                            </select>
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

                            {/* Group 3: Status & Marks */}
                            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e2e8f0', background: 'none', WebkitTextFillColor: 'initial' }}>
                                    <Store size={18} /> Status & Marks
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#cbd5e1' }}>
                                            <input type="checkbox" checked={editingSalonId ? editFormData.isVisited : newSalon.isVisited} onChange={(e) => editingSalonId ? setEditFormData({ ...editFormData, isVisited: e.target.checked }) : setNewSalon({ ...newSalon, isVisited: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                                            Visited Salon
                                        </label>
                                        {(editingSalonId ? editFormData.isVisited : newSalon.isVisited) && (
                                            <input
                                                type="date"
                                                value={editingSalonId ? editFormData.visitedDate : newSalon.visitedDate}
                                                onChange={(e) => editingSalonId ? setEditFormData({ ...editFormData, visitedDate: e.target.value }) : setNewSalon({ ...newSalon, visitedDate: e.target.value })}
                                                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                                            />
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#cbd5e1' }}>
                                            <input type="checkbox" checked={editingSalonId ? editFormData.isActive : newSalon.isActive} onChange={(e) => editingSalonId ? setEditFormData({ ...editFormData, isActive: e.target.checked }) : setNewSalon({ ...newSalon, isActive: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                                            Active Salon
                                        </label>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#cbd5e1' }}>
                                            <input type="checkbox" checked={editingSalonId ? editFormData.posmActive : newSalon.posmActive} onChange={(e) => editingSalonId ? setEditFormData({ ...editFormData, posmActive: e.target.checked }) : setNewSalon({ ...newSalon, posmActive: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                                            POSM Active Salon
                                        </label>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                    <label style={{ color: '#cbd5e1', fontSize: '1rem', fontWeight: 'bold' }}>Revisited Dates (Mark old visits here)</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {((editingSalonId ? editFormData.revisitedDates : newSalon.revisitedDates) || []).map((d, index) => (
                                            <div key={index} style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', color: '#bae6fd', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {new Date(d).toLocaleDateString()}
                                                <button type="button" onClick={() => {
                                                    const data = editingSalonId ? editFormData : newSalon;
                                                    const newArr = [...data.revisitedDates];
                                                    newArr.splice(index, 1);
                                                    if (editingSalonId) setEditFormData({ ...editFormData, revisitedDates: newArr }); else setNewSalon({ ...newSalon, revisitedDates: newArr });
                                                }} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.1rem', lineHeight: 1, cursor: 'pointer', padding: 0 }}>&times;</button>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <input type="date" id={`revisit-date-${editingSalonId || 'new'}`} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                                        <button type="button" onClick={() => {
                                            const dateVal = document.getElementById(`revisit-date-${editingSalonId || 'new'}`).value;
                                            if (dateVal) {
                                                const data = editingSalonId ? editFormData : newSalon;
                                                const newValue = [...(data.revisitedDates || []), dateVal];
                                                if (editingSalonId) setEditFormData({ ...editFormData, revisitedDates: newValue }); else setNewSalon({ ...newSalon, revisitedDates: newValue });
                                                document.getElementById(`revisit-date-${editingSalonId || 'new'}`).value = '';
                                            }
                                        }} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Add Date</button>
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
                                        editingSalonId ? <><ShieldCheck size={18} /> Save Changes</> : (formMode === 'assign' ? <><CheckCircle2 size={18} /> Assign setup</> : <><CheckCircle2 size={18} /> Register Salon</>)
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

                {/* Bulk Registration Section */}
                <section className="glass-container">
                    <h2>Bulk Registration</h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1rem' }}>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'nowrap' }}>
                            <select
                                value={newSalon.repName}
                                onChange={(e) => setNewSalon({ ...newSalon, repName: e.target.value })}
                                style={{
                                    padding: '0.8rem',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    background: 'rgba(255,255,255,0.1)',
                                    color: 'white',
                                    minWidth: '200px'
                                }}
                                required
                            >
                                <option value="" style={{ color: 'black' }}>Select Rep (Required)</option>
                                {reps.map(rep => (
                                    <option key={rep._id} value={rep.name} style={{ color: 'black' }}>{rep.name}</option>
                                ))}
                            </select>

                            <label htmlFor="excel-upload" className="btn-primary" style={{ cursor: 'pointer', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#334155', color: 'white', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                {selectedExcelFile ? selectedExcelFile.name : 'Choose Excel / CSV'}
                            </label>
                            <input
                                id="excel-upload"
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        setSelectedExcelFile(e.target.files[0]);
                                    }
                                }}
                                style={{ display: 'none' }}
                            />
                            <button
                                onClick={handleExcelUpload}
                                disabled={!selectedExcelFile}
                                className="btn-primary"
                                style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: selectedExcelFile ? '#4ade80' : '#22c55e', opacity: selectedExcelFile ? 1 : 0.5, color: '#0f172a', border: 'none', fontWeight: 'bold', whiteSpace: 'nowrap', cursor: selectedExcelFile ? 'pointer' : 'not-allowed' }}
                            >
                                Submit Upload
                            </button>
                        </div>
                    </div>

                    {newBulkSalons.length > 0 && (
                        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0 }}>Newly Registered Salons ({newBulkSalons.length})</h3>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        onClick={() => setNewBulkSalons([])}
                                        className="btn-primary outline"
                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                                    >
                                        Clear List
                                    </button>
                                </div>
                            </div>
                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                <table className="styled-table" style={{ fontSize: '0.9rem', width: '100%', borderCollapse: 'collapse', color: 'white', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
                                            <th style={{ padding: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Name</th>
                                            <th style={{ padding: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Location</th>
                                            <th style={{ padding: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Username</th>
                                            <th style={{ padding: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Password</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {newBulkSalons.map((salon, i) => (
                                            <tr key={salon._id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '0.8rem' }}>{salon.name}</td>
                                                <td style={{ padding: '0.8rem' }}>{salon.location}</td>
                                                <td style={{ padding: '0.8rem' }}>{salon.username}</td>
                                                <td style={{ padding: '0.8rem', fontFamily: 'monospace' }}>{salon.plainPassword}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#fbbf24' }}>
                                ⚠ Please save these credentials now. Passwords may not be visible later.
                            </p>
                        </div>
                    )}
                </section>

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
                                        {salon.salonCode || 'DRAFT'}
                                    </div>

                                    <div style={{ paddingRight: '4rem', marginBottom: '1rem' }}>
                                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: '#f8fafc', WebkitTextFillColor: 'initial', background: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {salon.name}
                                            {salon.isVisited && <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '12px', background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>Visited</span>}
                                            {salon.isActive && <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '12px', background: 'rgba(56,189,248,0.2)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }}>Active</span>}
                                            {salon.posmActive && <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '12px', background: 'rgba(192,132,252,0.2)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.3)' }}>POSM</span>}
                                            {!salon.salonCode && <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '12px', background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>Draft (No QR)</span>}
                                        </h3>
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
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Rep Name:</span> <span style={{ color: '#e2e8f0', textAlign: 'right' }}>{salon.repName || '-'}</span></div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Remark:</span> <span style={{ color: '#e2e8f0', textAlign: 'right' }}>{salon.remark || '-'}</span></div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Registered:</span> <span style={{ color: '#e2e8f0', textAlign: 'right' }}>{new Date(salon.createdAt).toLocaleDateString()}</span></div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Visited Salon:</span> <span style={{ color: salon.isVisited ? '#4ade80' : '#ef4444', textAlign: 'right', fontWeight: 'bold' }}>{salon.isVisited ? 'Yes' : 'No'}</span></div>
                                                        {salon.isVisited && salon.visitedDate && (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Visited Date:</span> <span style={{ color: '#e2e8f0', textAlign: 'right' }}>{new Date(salon.visitedDate).toLocaleDateString()}</span></div>
                                                        )}
                                                        {salon.revisitedDates && salon.revisitedDates.length > 0 && (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Revisited Dates:</span> <span style={{ color: '#e2e8f0', textAlign: 'right' }}>{salon.revisitedDates.map(d => new Date(d).toLocaleDateString()).join(', ')}</span></div>
                                                        )}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Active Salon:</span> <span style={{ color: salon.isActive ? '#4ade80' : '#ef4444', textAlign: 'right', fontWeight: 'bold' }}>{salon.isActive ? 'Yes' : 'No'}</span></div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>POSM Active Salon:</span> <span style={{ color: salon.posmActive ? '#4ade80' : '#ef4444', textAlign: 'right', fontWeight: 'bold' }}>{salon.posmActive ? 'Yes' : 'No'}</span></div>
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
        </div >
    );
};

export default SalesmanDashboard;
