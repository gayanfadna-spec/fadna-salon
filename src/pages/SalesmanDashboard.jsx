import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, Plus, X, Search, Store, MapPin, Phone, MessageSquare, Building, Map, Hash, User, ShieldCheck, Download, Edit3, Eye, EyeOff, CheckCircle2, CreditCard } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const API_URL = import.meta.env.VITE_API_URL || 'https://salonfadna-backend.onrender.com/api';

const SalesmanDashboard = () => {
    const loggedInUsername = localStorage.getItem('loggedInUsername');
    const [salons, setSalons] = useState([]);
    const [newSalon, setNewSalon] = useState({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: loggedInUsername || '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, activeDate: '', posmActive: false, posmDate: '', assignToCode: '' });
    const [qrCode, setQrCode] = useState(null);
    const [newCredentials, setNewCredentials] = useState(null);
    const [createdSalon, setCreatedSalon] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingSalonId, setEditingSalonId] = useState(null);
    const [expandedSalonId, setExpandedSalonId] = useState(null);
    const [formMode, setFormMode] = useState(null); // 'create' | 'assign' | 'draft' | null
    const [editFormData, setEditFormData] = useState({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, activeDate: '', posmActive: false, posmDate: '', assignToCode: '', isDraft: false });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reps, setReps] = useState([]);
    const [selectedExcelFile, setSelectedExcelFile] = useState(null);
    const [newBulkSalons, setNewBulkSalons] = useState([]);
    const [filterVisited, setFilterVisited] = useState(false);
    const navigate = useNavigate();

    const isToday = (date) => {
        if (!date) return false;
        const d = new Date(date);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    };

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
                const editedByValue = ['admin', 'superadmin'].includes(role) ? 'admin' : (username || 'salesman');
                const payload = { ...newSalon, editedBy: editedByValue };

                const res = await axios.put(`${API_URL}/salons/assign`, payload);
                if (res.data.success) {
                    alert(`Successfully assigned details to Salon Code: ${newSalon.assignToCode}`);
                    setNewSalon({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '' });
                    fetchSalons();
                    setFormMode(null);
                }
            } else {
                const res = await axios.post(`${API_URL}/salons`, { ...newSalon, isDraft: formMode === 'draft', editedBy: loggedInUsername });
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

    const handleDeleteSalon = async (id) => {
        if (!window.confirm('Are you sure you want to delete this salon?')) return;
        try {
            const res = await axios.delete(`${API_URL}/salons/${id}`);
            if (res.data.success) {
                alert('Salon deleted successfully');
                fetchSalons();
            }
        } catch (err) {
            console.error('Error deleting salon:', err);
            alert(err.response?.data?.message || 'Error deleting salon');
        }
    };

    const handleUpdateSalon = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const role = localStorage.getItem('adminRole');
            const username = localStorage.getItem('loggedInUsername');
            const editedByValue = ['admin', 'superadmin'].includes(role) ? 'admin' : username;
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
            activeDate: salon.activeDate ? salon.activeDate.split('T')[0] : '',
            posmActive: salon.posmActive || false,
            posmDate: salon.posmDate ? salon.posmDate.split('T')[0] : '',
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

    const dailyUpdates = salons.filter(salon => {
        if (salon.editedBy !== loggedInUsername) return false;
        if (filterVisited && !salon.isVisited) return false;
        return !salon.salonCode || 
               isToday(salon.createdAt) || 
               isToday(salon.visitedDate) || 
               isToday(salon.activeDate) || 
               isToday(salon.posmDate) || 
               (salon.revisitedDates && salon.revisitedDates.some(isToday));
    });

    const draftUpdatesCount = dailyUpdates.filter(s => !s.salonCode).length;

    return (
        <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
            <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src="/Fadna New Logo.png" alt="Fadna Logo" className="site-logo" style={{ maxHeight: '45px', objectFit: 'contain' }} />
                    <h1 style={{ margin: 0, fontSize: '1.8rem', background: 'linear-gradient(to right, #ec4899, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Salon Register
                    </h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <ThemeToggle />
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
                </div>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Search Bar Section - Made Prominent */}
                <section className="glass-container" style={{ padding: '1rem 2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: '1 1 250px', width: '100%' }}>
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
                        {/* Removed Visited Only Filter per request */}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {/* Removed Register New Salon per request */}
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
                                {formMode === 'assign' ? 'Close Form' : 'Enter QR'}
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
                                {editingSalonId ? <><Edit3 size={24} color="var(--accent-color)" /> Update Salon</> : (formMode === 'assign' ? <><Hash size={24} color="var(--primary-color)" /> Enter QR Code</> : (formMode === 'draft' ? <><Edit3 size={24} color="#eab308" /> Add Draft Details</> : <><Store size={24} color="var(--primary-color)" /> Enter QR</>))}
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
                                        <Hash size={18} /> Enter QR Code Details
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
                                        <Hash size={18} /> Enter QR Code (Optional)
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
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1' }}>Salon Name <span style={{ color: '#ef4444' }}>*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <Store size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                            <input type="text" placeholder="e.g. Dream Style" value={editingSalonId ? editFormData.name : newSalon.name} onChange={(e) => editingSalonId ? setEditFormData({ ...editFormData, name: e.target.value }) : setNewSalon({ ...newSalon, name: e.target.value })} required style={{ padding: '0.6rem 0.6rem 0.6rem 2.25rem', margin: 0, fontSize: '0.9rem' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1' }}>Location / City</label>
                                        <div style={{ position: 'relative' }}>
                                            <MapPin size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                            <input type="text" placeholder="e.g. Colombo 03" value={editingSalonId ? editFormData.location : newSalon.location} onChange={(e) => editingSalonId ? setEditFormData({ ...editFormData, location: e.target.value }) : setNewSalon({ ...newSalon, location: e.target.value })} style={{ padding: '0.6rem 0.6rem 0.6rem 2.25rem', margin: 0, fontSize: '0.9rem' }} />
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
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1' }}>Rep Name <span style={{ color: '#ef4444' }}>*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <User size={16} strokeWidth={2.5} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                            <select
                                                value={editingSalonId ? editFormData.repName : newSalon.repName}
                                                onChange={(e) => editingSalonId ? setEditFormData({ ...editFormData, repName: e.target.value }) : setNewSalon({ ...newSalon, repName: e.target.value })}
                                                required
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#f8fafc', fontSize: '0.95rem', fontWeight: '500', minWidth: '150px' }}>
                                            <input type="checkbox" checked={editingSalonId ? editFormData.isVisited : newSalon.isVisited} onChange={(e) => editingSalonId ? setEditFormData({ ...editFormData, isVisited: e.target.checked }) : setNewSalon({ ...newSalon, isVisited: e.target.checked })} style={{ width: '20px', height: '20px', accentColor: 'var(--primary-color)' }} />
                                            Visited Salon
                                        </label>
                                        {(editingSalonId ? editFormData.isVisited : newSalon.isVisited) && (
                                            <input
                                                type="date"
                                                value={editingSalonId ? editFormData.visitedDate : newSalon.visitedDate}
                                                onChange={(e) => editingSalonId ? setEditFormData({ ...editFormData, visitedDate: e.target.value }) : setNewSalon({ ...newSalon, visitedDate: e.target.value })}
                                                style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'white', flex: '1 1 200px' }}
                                            />
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#f8fafc', fontSize: '0.95rem', fontWeight: '500', minWidth: '150px' }}>
                                            <input type="checkbox" checked={editingSalonId ? editFormData.isActive : newSalon.isActive} onChange={(e) => editingSalonId ? setEditFormData({ ...editFormData, isActive: e.target.checked }) : setNewSalon({ ...newSalon, isActive: e.target.checked })} style={{ width: '20px', height: '20px', accentColor: 'var(--primary-color)' }} />
                                            Active Salon
                                        </label>
                                        {(editingSalonId ? editFormData.isActive : newSalon.isActive) && (
                                            <input
                                                type="date"
                                                value={editingSalonId ? editFormData.activeDate : newSalon.activeDate}
                                                onChange={(e) => editingSalonId ? setEditFormData({ ...editFormData, activeDate: e.target.value }) : setNewSalon({ ...newSalon, activeDate: e.target.value })}
                                                style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'white', flex: '1 1 200px' }}
                                            />
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#f8fafc', fontSize: '0.95rem', fontWeight: '500', minWidth: '150px' }}>
                                            <input type="checkbox" checked={editingSalonId ? editFormData.posmActive : newSalon.posmActive} onChange={(e) => editingSalonId ? setEditFormData({ ...editFormData, posmActive: e.target.checked }) : setNewSalon({ ...newSalon, posmActive: e.target.checked })} style={{ width: '20px', height: '20px', accentColor: 'var(--primary-color)' }} />
                                            POSM Active Salon
                                        </label>
                                        {(editingSalonId ? editFormData.posmActive : newSalon.posmActive) && (
                                            <input
                                                type="date"
                                                value={editingSalonId ? editFormData.posmDate : newSalon.posmDate}
                                                onChange={(e) => editingSalonId ? setEditFormData({ ...editFormData, posmDate: e.target.value }) : setNewSalon({ ...newSalon, posmDate: e.target.value })}
                                                style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'white', flex: '1 1 200px' }}
                                            />
                                        )}
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
                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                                        <input type="date" id={`revisit-date-${editingSalonId || 'new'}`} style={{ flex: '1 1 200px', padding: '0.6rem', margin: 0, borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'white' }} />
                                        <button type="button" onClick={() => {
                                            const dateVal = document.getElementById(`revisit-date-${editingSalonId || 'new'}`).value;
                                            if (dateVal) {
                                                const data = editingSalonId ? editFormData : newSalon;
                                                const newValue = [...(data.revisitedDates || []), dateVal];
                                                if (editingSalonId) setEditFormData({ ...editFormData, revisitedDates: newValue }); else setNewSalon({ ...newSalon, revisitedDates: newValue });
                                                document.getElementById(`revisit-date-${editingSalonId || 'new'}`).value = '';
                                            }
                                        }} className="btn-primary" style={{ padding: '0.6rem 1.5rem', whiteSpace: 'nowrap', flex: '0 1 auto' }}>+ Add Date</button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
                                {(editingSalonId || formMode) && (
                                    <button type="button" onClick={() => { setEditingSalonId(null); setFormMode(null); }} className="btn-primary outline" style={{ flex: '1 1 120px', padding: '0.8rem 1rem', fontSize: '1rem' }}>Cancel</button>
                                )}
                                <button type="submit" className="btn-primary" disabled={isSubmitting} style={{
                                    flex: '2 1 200px', padding: '0.8rem 1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    opacity: isSubmitting ? 0.7 : 1, justifyContent: 'center'
                                }}>
                                    {isSubmitting ? (
                                        <span>Saving...</span>
                                    ) : (
                                        editingSalonId ? <> <ShieldCheck size={20} /> Save Changes</> : (formMode === 'assign' ? <> <CheckCircle2 size={20} /> Enter QR</> : (formMode === 'draft' ? <> <CheckCircle2 size={20} /> Add Draft Details</> : <> <CheckCircle2 size={20} /> Enter QR</>))
                                    )}
                                </button>
                                {(!editingSalonId && formMode === 'draft') && (
                                    <button
                                        type="button"
                                        onClick={() => setNewSalon({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '' })}
                                        className="btn-primary outline"
                                        style={{ flex: '1 1 120px', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '0.8rem 1rem', fontSize: '1rem', display: 'flex', justifyContent: 'center' }}
                                    >
                                        Clear
                                    </button>
                                )}
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
                                        <span style={{ color: '#94a3b8', fontWeight: '500' }}>Code:</span>
                                        <code style={{ background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', borderRadius: '6px', color: '#818cf8', fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '1px', border: '1px solid rgba(255,255,255,0.1)' }}>{newCredentials.salonCode || 'N/A'}</code>

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



                {/* Global Search Section - Visible only when searching */}
                {searchTerm && (
                    <section className="glass-container animate-fade-in" style={{ marginBottom: '2.5rem', border: '1px solid rgba(129, 140, 248, 0.2)', background: 'linear-gradient(145deg, rgba(129, 140, 248, 0.05) 0%, var(--glass-bg) 100%)' }}>
                        <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', color: '#818cf8' }}>
                            <Search size={24} /> Search Results 
                            <span style={{ fontSize: '1rem', opacity: 0.6, marginLeft: '0.5rem' }}>({
                                salons.filter(s => {
                                    const term = searchTerm.toLowerCase();
                                    return (s.name || '').toLowerCase().includes(term) || (s.salonCode || '').toLowerCase().includes(term) || (s.location || '').toLowerCase().includes(term);
                                }).length
                            })</span>
                        </h2>

                        <div className="salon-grid animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {salons
                                .filter(s => {
                                    const term = searchTerm.toLowerCase();
                                    return (s.name || '').toLowerCase().includes(term) || (s.salonCode || '').toLowerCase().includes(term) || (s.location || '').toLowerCase().includes(term);
                                })
                                .map((salon) => (
                                    <div key={`search-${salon._id}`} className="salon-card glass" style={{ 
                                        position: 'relative', 
                                        padding: '1.5rem', 
                                        border: salon.editedBy === loggedInUsername ? '2px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                                        background: salon.editedBy === loggedInUsername ? 'rgba(99, 102, 241, 0.05)' : 'rgba(0,0,0,0.2)',
                                        borderRadius: '16px',
                                        transition: 'transform 0.2s, border-color 0.2s',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1rem'
                                    }}>
                                        <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => startEditing(salon)} className="icon-btn primary" title="Edit/Update"><Edit3 size={16} /></button>
                                            <button onClick={() => setExpandedSalonId(expandedSalonId === `search-${salon._id}` ? null : `search-${salon._id}`)} className="icon-btn" title="View Details">
                                                {expandedSalonId === `search-${salon._id}` ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>

                                        <div>
                                            <h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1.2rem', paddingRight: '2rem' }}>{salon.name}</h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#818cf8', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                <Hash size={14} /> {salon.salonCode || 'DRAFT'}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <MapPin size={14} color="#94a3b8" /> {salon.location || 'N/A'}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Phone size={14} color="#94a3b8" /> {salon.contactNumber1 || 'N/A'}
                                            </div>
                                        </div>

                                        {expandedSalonId === `search-${salon._id}` && (
                                            <div className="animate-fade-in" style={{ marginTop: '0.5rem', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <div><span style={{ color: '#94a3b8' }}>Contact 2:</span> {salon.contactNumber2 || '-'}</div>
                                                    <div><span style={{ color: '#94a3b8' }}>Rep Name:</span> {salon.repName || '-'}</div>
                                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', pt: '0.5rem' }}>
                                                        <span style={{ color: '#94a3b8' }}>Bank:</span> {salon.accountDetails?.bankName || '-'}
                                                    </div>
                                                    {salon.remark && <div style={{ fontStyle: 'italic', color: '#64748b' }}>"{salon.remark}"</div>}
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                {salon.isVisited && <span className="status-badge completed" style={{ fontSize: '0.7rem' }}>Visited</span>}
                                                {salon.isActive && <span className="status-badge processing" style={{ fontSize: '0.7rem' }}>Active</span>}
                                            </div>
                                            {salon.editedBy === loggedInUsername && <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: '500' }}>Your Salon</span>}
                                        </div>
                                    </div>
                                ))}
                            
                            {salons.filter(s => {
                                const term = searchTerm.toLowerCase();
                                return (s.name || '').toLowerCase().includes(term) || (s.salonCode || '').toLowerCase().includes(term) || (s.location || '').toLowerCase().includes(term);
                            }).length === 0 && (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', gridColumn: '1 / -1' }}>No salons found matching "{searchTerm}"</div>
                            )}
                        </div>
                    </section>
                )}

                {/* My Daily Updates Section - Always visible */}
                <section className="glass-container">
                    <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', color: '#4ade80' }}>
                        <Store size={24} /> My Daily Updates
                        <span style={{ fontSize: '1rem', opacity: 0.6, marginLeft: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span>({dailyUpdates.length})</span>
                            {draftUpdatesCount > 0 && (
                                <span style={{ 
                                    fontSize: '0.85rem', 
                                    color: '#eab308', 
                                    background: 'rgba(234, 179, 8, 0.1)', 
                                    padding: '0.2rem 0.6rem', 
                                    borderRadius: '12px',
                                    border: '1px solid rgba(234, 179, 8, 0.2)',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {draftUpdatesCount} Add Details Only Salons
                                </span>
                            )}
                        </span>
                    </h2>

                    <div className="table-container animate-fade-in" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden' }}>
                        <table className="styled-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>#</th>
                                    <th>Salon Name</th>
                                    <th>Code</th>
                                    <th>Location</th>
                                    <th>Contact</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dailyUpdates
                                    .map((salon, index) => (
                                        <React.Fragment key={`daily-${salon._id}`}>
                                            <tr>
                                                <td style={{ opacity: 0.5, fontSize: '0.8rem' }}>{index + 1}</td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontWeight: '600', color: '#f8fafc' }}>{salon.name}</span>
                                                        {salon.username && <small style={{ opacity: 0.4, fontSize: '0.75rem' }}>@{salon.username}</small>}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={{ 
                                                        fontFamily: 'monospace', 
                                                        background: salon.salonCode ? 'rgba(129, 140, 248, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                                                        color: salon.salonCode ? '#818cf8' : '#f87171',
                                                        padding: '0.2rem 0.5rem', 
                                                        borderRadius: '4px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 'bold',
                                                        border: `1px solid ${salon.salonCode ? 'rgba(129, 140, 248, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                                    }}>
                                                        {salon.salonCode || 'DRAFT'}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{salon.location || 'N/A'}</td>
                                                <td style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{salon.contactNumber1 || salon.contactNumber || '-'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                                        {salon.isVisited && <span className="status-badge completed" style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem' }}>Visited</span>}
                                                        {salon.isActive && <span className="status-badge processing" style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem' }}>Active</span>}
                                                        {salon.posmActive && <span className="status-badge shipped" style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem' }}>POSM</span>}
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                                        <button onClick={() => startEditing(salon)} className="icon-btn primary" title="Edit" style={{ padding: '0.4rem' }}><Edit3 size={14} /></button>
                                                        <button onClick={() => setExpandedSalonId(expandedSalonId === `daily-${salon._id}` ? null : `daily-${salon._id}`)} className="icon-btn" title="View Details" style={{ padding: '0.4rem' }}>{expandedSalonId === `daily-${salon._id}` ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                                                        <button onClick={() => handleDeleteSalon(salon._id)} className="icon-btn danger" title="Delete" style={{ padding: '0.4rem' }}><X size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedSalonId === `daily-${salon._id}` && (
                                                <tr>
                                                    <td colSpan="7" style={{ padding: '0', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <div className="animate-fade-in" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                                                                <div>
                                                                    <h4 style={{ margin: '0 0 0.75rem 0', color: '#818cf8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Full Contact Details</h4>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem' }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Phone 1:</span> <span>{salon.contactNumber1 || salon.contactNumber || '-'}</span></div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Phone 2:</span> <span>{salon.contactNumber2 || '-'}</span></div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Rep Name:</span> <span>{salon.repName || '-'}</span></div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Registered:</span> <span>{new Date(salon.createdAt).toLocaleDateString()}</span></div>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <h4 style={{ margin: '0 0 0.75rem 0', color: '#4ade80', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Account Information</h4>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem' }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Bank:</span> <span>{salon.accountDetails?.bankName || '-'}</span></div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Branch:</span> <span>{salon.accountDetails?.branch || '-'}</span></div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>A/C No:</span> <span style={{ fontFamily: 'monospace' }}>{salon.accountDetails?.accountNumber || '-'}</span></div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>A/C Name:</span> <span>{salon.accountDetails?.accountName || '-'}</span></div>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <h4 style={{ margin: '0 0 0.75rem 0', color: '#f472b6', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Login Credentials</h4>
                                                                    <div className="credential-box" style={{ marginTop: '0.5rem' }}>
                                                                        <div className="credential-row" style={{ display: 'flex', justifyContent: 'space-between' }}><span>User:</span> <span style={{ fontWeight: 'bold' }}>{salon.username || '-'}</span></div>
                                                                        <div className="credential-row" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Pass:</span> <span style={{ color: '#4ade80' }}>{salon.plainPassword || '••••••'}</span></div>
                                                                    </div>
                                                                    {salon.remark && <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}><strong>Remark:</strong> {salon.remark}</div>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                            </tbody>
                        </table>

                        {dailyUpdates.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                <Store size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                <h3>No Activity Today</h3>
                                <p>You haven't updated any salons today. Use the search bar above to find and update existing salons.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div >
    );
};

export default SalesmanDashboard;
