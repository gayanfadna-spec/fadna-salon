import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ThemeToggle from '../components/ThemeToggle';
import { Users, Store, Edit, Trash2 } from 'lucide-react';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const API_URL = import.meta.env.VITE_API_URL || 'https://salonfadna-backend.onrender.com/api';
const BASE_URL = 'https://www.portal.fadnals.lk';

const NetAgentDashboard = () => {
    const navigate = useNavigate();
    const loggedInUsername = localStorage.getItem('loggedInUsername');

    const isSameDay = (date1, date2) => {
        if (!date1 || !date2) return false;
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return d1.toDateString() === d2.toDateString();
    };

    const [selectedUpdateDate, setSelectedUpdateDate] = useState(new Date().toISOString().split('T')[0]);
    const [agents, setAgents] = useState([]);
    const [orders, setOrders] = useState([]);
    const adminRole = localStorage.getItem('adminRole');
    const [products, setProducts] = useState([]);
    const [reps, setReps] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [qrCode, setQrCode] = useState(null);
    const [newCredentials, setNewCredentials] = useState(null);
    const [createdAgent, setCreatedAgent] = useState(null);
    const [editingAgentId, setEditingAgentId] = useState(null);
    const [bulkCount, setBulkCount] = useState('');
    const [selectedAgents, setSelectedAgents] = useState([]);
    const [selectedExcelFile, setSelectedExcelFile] = useState(null);
    const [formMode, setFormMode] = useState('create'); // 'create' | 'assign'
    const [reportStartDate, setReportStartDate] = useState('');
    const [reportEndDate, setReportEndDate] = useState('');
    const [reportHistory, setReportHistory] = useState([]);

    const emptyForm = {
        name: '', location: '', contactNumber1: '', contactNumber2: '',
        remark: '', repName: '',
        username: '', password: '',
        accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' },
        isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, activeDate: '', posmActive: false, posmDate: '',
        assignToCode: '', isDraft: false
    };
    const [form, setForm] = useState(emptyForm);

    // --- Auth Guard ---
    useEffect(() => {
        if (!localStorage.getItem('adminUser')) navigate('/admin-login');
    }, [navigate]);

    // --- Fetch helpers ---
    const fetchAgents = React.useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/net-agents`);
            if (res.data.success) setAgents(res.data.agents);
        } catch (err) { console.error(err); }
    }, []);

    const fetchOrders = React.useCallback(async () => {
        try {
            const params = selectedAgentId ? { agentId: selectedAgentId } : {};
            const res = await axios.get(`${API_URL}/orders`, { params });
            if (res.data.success) {
                // Show COD and Paid orders that came from net agents
                setOrders(res.data.orders.filter(o => (o.paymentMethod === 'Cash on Delivery' || o.status === 'Paid') && o.agentId));
            }
        } catch (err) { console.error(err); }
    }, [selectedAgentId]);

    const fetchProducts = React.useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/products`);
            if (res.data.success) {
                setProducts(res.data.products.filter(p => !p.target || p.target === 'both' || p.target === 'salon'));
            }
        } catch (err) { console.error(err); }
    }, []);

    const fetchReps = React.useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/reps`);
            if (res.data.success) setReps(res.data.data);
        } catch (err) { console.error(err); }
    }, []);

    const fetchReportHistory = React.useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/reports/history`);
            if (res.data.success) setReportHistory(res.data.history);
        } catch (err) { console.error(err); }
    }, []);

    const logReportHistory = async (reportType, recordCount) => {
        try {
            const adminUser = JSON.parse(localStorage.getItem('adminUser'));
            const downloadedBy = adminUser ? adminUser.username : 'Admin';
            const dateRange = (reportStartDate || reportEndDate)
                ? `${reportStartDate || 'Start'} to ${reportEndDate || 'End'}`
                : 'All Time';

            await axios.post(`${API_URL}/reports/history`, {
                reportType,
                downloadedBy,
                recordCount,
                dateRange
            });
            fetchReportHistory();
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchAgents(); fetchOrders(); fetchProducts(); fetchReps(); fetchReportHistory();
    }, [fetchAgents, fetchOrders, fetchProducts, fetchReps, fetchReportHistory]);

    // --- Agent CRUD ---
    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            if (formMode === 'assign') {
                if (!form.assignToCode.trim()) { alert('Please enter an Agent Code.'); return; }
                const username = localStorage.getItem('loggedInUsername') || 'admin';
                const res = await axios.put(`${API_URL}/net-agents/assign`, { ...form, editedBy: username });
                if (res.data.success) {
                    alert(`Assigned to Net.Agent Code: ${form.assignToCode}`);
                    setForm(emptyForm); fetchAgents();
                }
            } else {
                const username = loggedInUsername || 'admin';
                const res = await axios.post(`${API_URL}/net-agents`, { ...form, isDraft: formMode === 'draft', editedBy: username });
                if (res.data.success) {
                    if (formMode === 'draft') {
                        alert('Draft Net.Agent created!');
                        setForm(emptyForm); fetchAgents();
                    } else {
                        setQrCode(res.data.qrCode);
                        setNewCredentials(res.data.credentials);
                        setCreatedAgent(res.data.agent);
                        setForm(emptyForm); fetchAgents();
                    }
                }
            }
        } catch (err) { alert(err.response?.data?.message || 'Error creating agent'); }
    };

    const dailyUpdates = agents.filter(agent => {
        if (agent.editedBy !== loggedInUsername) return false;
        
        return isSameDay(agent.createdAt, selectedUpdateDate) || 
               isSameDay(agent.visitedDate, selectedUpdateDate) || 
               isSameDay(agent.activeDate, selectedUpdateDate) || 
               isSameDay(agent.posmDate, selectedUpdateDate) || 
               (agent.revisitedDates && agent.revisitedDates.some(d => isSameDay(d, selectedUpdateDate)));
    });

    const draftUpdatesCount = dailyUpdates.filter(a => !a.agentCode).length;

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const username = localStorage.getItem('loggedInUsername') || 'admin';
            const res = await axios.put(`${API_URL}/net-agents/${editingAgentId}`, { ...form, editedBy: username });
            if (res.data.success) {
                setForm(emptyForm); setEditingAgentId(null); fetchAgents();
                alert('Net.Agent updated!');
            }
        } catch (err) { alert('Error updating agent'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this Net.Agent?')) return;
        try {
            await axios.delete(`${API_URL}/net-agents/${id}`);
            fetchAgents();
        } catch (err) { alert('Error deleting'); }
    };

    const handleEditClick = (agent) => {
        setForm({
            name: agent.name || '', location: agent.location || '',
            contactNumber1: agent.contactNumber1 || '', contactNumber2: agent.contactNumber2 || '',
            remark: agent.remark || '', repName: agent.repName || '',
            username: agent.username || '', password: agent.plainPassword || '',
            accountDetails: agent.accountDetails || { bankName: '', branch: '', accountNumber: '', accountName: '' },
            isVisited: agent.isVisited || false,
            visitedDate: agent.visitedDate ? agent.visitedDate.split('T')[0] : '',
            revisitedDates: agent.revisitedDates || [],
            isActive: agent.isActive || false,
            activeDate: agent.activeDate ? agent.activeDate.split('T')[0] : '',
            posmActive: agent.posmActive || false,
            posmDate: agent.posmDate ? agent.posmDate.split('T')[0] : '',
            assignToCode: '', isDraft: !agent.agentCode
        });
        setEditingAgentId(agent._id);
        setQrCode(null); setNewCredentials(null); setCreatedAgent(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- QR helpers ---
    const generateQRSVG = async (agent) => {
        const qrUrl = `${BASE_URL}/net-agent-order/${agent.uniqueId}`;
        const svgString = await QRCode.toString(qrUrl, { type: 'svg', margin: 2 });
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const svg = doc.documentElement;
        const [vx, vy, vw, vh] = svg.getAttribute('viewBox').split(' ').map(Number);
        // Add space for text (Code + Name)
        const textSpace = vh * 0.25;
        svg.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh + textSpace}`);

        const bg = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('fill', '#ffffff');
        bg.setAttribute('x', vx); bg.setAttribute('y', vy);
        bg.setAttribute('width', vw); bg.setAttribute('height', vh + textSpace);
        svg.insertBefore(bg, svg.firstChild);

        // Add Agent Name
        const nameText = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
        nameText.setAttribute('x', vw / 2);
        nameText.setAttribute('y', vh + textSpace / 2.5);
        nameText.setAttribute('text-anchor', 'middle');
        nameText.setAttribute('font-family', 'Arial, sans-serif');
        nameText.setAttribute('font-size', `${vw * 0.055}`);
        nameText.setAttribute('font-weight', 'bold');
        nameText.setAttribute('fill', '#000000');
        nameText.textContent = agent.name;
        svg.appendChild(nameText);

        // Add Agent Code
        const codeText = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
        codeText.setAttribute('x', vw / 2);
        codeText.setAttribute('y', vh + textSpace / 1.3);
        codeText.setAttribute('text-anchor', 'middle');
        codeText.setAttribute('font-family', 'Arial, sans-serif');
        codeText.setAttribute('font-size', `${vw * 0.045}`);
        codeText.setAttribute('font-weight', 'normal');
        codeText.setAttribute('fill', '#444444');
        codeText.textContent = `Code: ${agent.agentCode || 'N/A'}`;
        svg.appendChild(codeText);

        return new XMLSerializer().serializeToString(svg);
    };

    const handleDownloadQR = async (agent) => {
        try {
            const svg = await generateQRSVG(agent);
            saveAs(new Blob([svg], { type: 'image/svg+xml' }), `${agent.name.replace(/\s+/g, '_')}-qr.svg`);
        } catch (err) { alert('Failed to generate QR'); }
    };

    const handleDownloadJPG = async (agent) => {
        try {
            const svgString = await generateQRSVG(agent);
            const fileName = `${agent.name.replace(/\s+/g, '_')}-qr.jpg`;

            const img = new Image();
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = 3;
                canvas.width = 300 * scale;
                canvas.height = (300 * (img.height / img.width)) * scale;
                const ctx = canvas.getContext('2d');

                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    saveAs(blob, fileName);
                    URL.revokeObjectURL(url);
                }, 'image/jpeg', 0.95);
            };
            img.src = url;
        } catch (err) {
            console.error('Error generating JPG', err);
            alert('Failed to generate JPG');
        }
    };

    const handleBatchPrint = async (agentsToPrint) => {
        if (!agentsToPrint.length) return;
        const pw = window.open('', '_blank');
        pw.document.write('<html><head><title>Print QR Codes</title>');
        pw.document.write('<style>body{font-family:Arial,sans-serif;display:flex;flex-wrap:wrap;gap:20px;justify-content:center;} .qr-card{border:1px solid #ccc;padding:10px;text-align:center;page-break-inside:avoid;width:200px;} svg{width:100%;height:auto;}</style></head><body>');
        pw.document.write('<div style="width:100%;text-align:center;margin-bottom:20px;"><button onclick="window.print()" style="padding:10px 20px;font-size:16px;">PRINT NOW</button></div>');
        for (const agent of agentsToPrint) {
            const svg = await generateQRSVG(agent);
            pw.document.write(`<div class="qr-card">${svg}<div style="margin-top:5px;font-weight:bold;">${agent.name}</div></div>`);
        }
        pw.document.write('</body></html>');
        pw.document.close();
    };

    const handleBatchDownloadZip = async (agentsToDownload, format = 'svg') => {
        const zip = new JSZip();
        for (const agent of agentsToDownload) {
            try {
                const svgString = await generateQRSVG(agent);
                const safeName = agent.name.replace(/\s+/g, '_');
                const code = agent.agentCode || 'DRAFT';

                if (format === 'svg') {
                    zip.file(`${safeName}_${code}.svg`, svgString);
                } else {
                    const blob = await new Promise((resolve) => {
                        const img = new Image();
                        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                        const url = URL.createObjectURL(svgBlob);
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const scale = 2.5;
                            canvas.width = 300 * scale;
                            canvas.height = (300 * (img.height / img.width)) * scale;
                            const ctx = canvas.getContext('2d');
                            ctx.fillStyle = 'white';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            canvas.toBlob((b) => {
                                URL.revokeObjectURL(url);
                                resolve(b);
                            }, 'image/jpeg', 0.9);
                        };
                        img.src = url;
                    });
                    zip.file(`${safeName}_${code}.jpg`, blob);
                }
            } catch (err) {
                console.error(`Error adding ${format} to zip`, err);
            }
        }
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `net_agents_qr_codes_${format}.zip`);
    };

    const handleBulkCreate = async () => {
        if (!bulkCount || bulkCount <= 0) return;
        try {
            const res = await axios.post(`${API_URL}/net-agents/bulk`, { count: bulkCount });
            if (res.data.success) { setBulkCount(''); fetchAgents(); alert(`${res.data.agents.length} Net.Agents created!`); }
        } catch (err) { alert('Bulk create error'); }
    };

    const handleExcelUpload = async () => {
        if (!selectedExcelFile) return;
        const fd = new FormData();
        fd.append('file', selectedExcelFile);
        if (form.repName) fd.append('repName', form.repName);
        try {
            const res = await axios.post(`${API_URL}/net-agents/bulk-upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (res.data.success) { alert(res.data.message); setSelectedExcelFile(null); fetchAgents(); }
        } catch (err) { alert(err.response?.data?.error || 'Upload error'); }
    };

    const handleExportOrders = async () => {
        const filteredOrders = adminRole === 'admin' ? orders.filter(o => o.status === 'COD' || o.status === 'Paid') : orders;
        if (!filteredOrders.length) return alert('No orders');
        const headers = ['Date', 'Order ID', 'Net Agent 1', 'Net Agent 2', 'Customer', 'Phone', 'Additional Phone', 'Address', 'City', 'Items', 'Total', 'Status', 'Payment'];
        const rows = filteredOrders.map(o => [
            new Date(o.createdAt).toLocaleString(),
            o.merchantOrderId || o._id.slice(-6).toUpperCase(),
            `"${agents.find(a => a._id === o.netAgent1Id)?.name || o.agentName || ''}"`,
            `"${agents.find(a => a._id === o.netAgent2Id)?.name || ''}"`,
            `"${(o.customerName || '').replace(/"/g, '""')}"`,
            o.customerPhone || '',
            o.additionalPhone || '',
            `"${(o.address || '').replace(/"/g, '""')}"`,
            o.city || '',
            `"${o.items.map(i => `${i.productName}(x${i.quantity})`).join(', ').replace(/"/g, '""')}"`,
            o.totalAmount,
            o.status,
            o.paymentMethod
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        saveAs(blob, 'net_agent_orders.csv');

        try {
            await axios.post(`${API_URL}/orders/mark-downloaded`, { orderIds: filteredOrders.map(o => o._id) });
            fetchOrders();
            logReportHistory('Net Agent Orders', filteredOrders.length);
        } catch (err) {
            console.error('Failed to mark downloaded status', err);
        }
    };

    const handleExportAgents = () => {
        if (!agents.length) return alert('No agents');
        const headers = ['Name', 'Code', 'Username', 'Password', 'Location', 'Phone 1', 'Phone 2', 'Rep', 'Visited', 'Visited Date', 'Active', 'Active Date', 'POSM Active', 'POSM Date'];
        const rows = agents.map(a => [
            `"${a.name}"`, a.agentCode || '', a.username || '',
            `"${a.plainPassword || ''}"`, `"${a.location || ''}"`,
            a.contactNumber1 || '', a.contactNumber2 || '',
            `"${a.repName || ''}"`, 
            a.isVisited ? 'Yes' : 'No',
            a.visitedDate ? new Date(a.visitedDate).toLocaleDateString() : '',
            a.isActive ? 'Yes' : 'No',
            a.activeDate ? new Date(a.activeDate).toLocaleDateString() : '',
            a.posmActive ? 'Yes' : 'No',
            a.posmDate ? new Date(a.posmDate).toLocaleDateString() : ''
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        saveAs(new Blob([csv], { type: 'text/csv' }), 'net_agents_list.csv');
    };

    // --- Derived stats ---
    const filteredAgents = agents.filter(a => {
        if (selectedAgentId && a._id !== selectedAgentId) return false;
        if (!searchTerm) return true;
        const t = searchTerm.toLowerCase();
        return (a.name || '').toLowerCase().includes(t) ||
            (a.location || '').toLowerCase().includes(t) ||
            (a.agentCode || '').toLowerCase().includes(t);
    });

    const activeCount = agents.filter(a => a.isActive).length;
    const visitedCount = agents.filter(a => a.isVisited).length;
    
    // Updated order counts
    const trueCodCount = orders.filter(o => o.status === 'COD').length;
    const paidCount = orders.filter(o => o.status === 'Paid').length;
    const returnedCount = orders.filter(o => o.status === 'Returned').length;
    const completedCount = orders.filter(o => o.status === 'Completed').length;
    
    const totalRevenue = orders.filter(o => ['COD', 'Paid', 'Shipped', 'Completed'].includes(o.status))
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        
    // Product wise count
    const productCounts = {};
    orders.filter(o => o.status !== 'Draft' && o.status !== 'Cancelled').forEach(o => {
        (o.items || []).forEach(item => {
            if (item.productName) {
                productCounts[item.productName] = (productCounts[item.productName] || 0) + item.quantity;
            }
        });
    });
    const sortedProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]);

    const updateStatus = async (orderId, status) => {
        try {
            await axios.put(`${API_URL}/orders/${orderId}/status`, { status });
            fetchOrders();
        } catch (err) { alert('Failed to update status'); }
    };

    const statusColors = {
        'Draft': '#6b7280', 'COD': '#f59e0b', 'Shipped': '#3b82f6',
        'Completed': '#4ade80', 'Cancelled': '#ef4444', 'Returned': '#f97316',
        'Pending Payment': '#a855f7', 'Paid': '#4ade80', 'Payment Failed': '#ef4444'
    };

    const navBtn = (tab, label) => (
        <button
            className="btn-primary nav-btn"
            style={{ opacity: activeTab === tab ? 1 : 0.65, padding: '0.5rem 1rem' }}
            onClick={() => setActiveTab(tab)}
        >{label}</button>
    );

    return (
        <div className="admin-container animate-fade-in">
            {/* Header - Logo and External Links */}
            <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src="/Fadna New Logo.png" alt="Fadna Logo" style={{ maxHeight: '40px' }} />
                    <div>
                        <h1 style={{ margin: 0 }}>Net.Agent Dashboard</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                            <span style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', borderRadius: '12px', padding: '0.2rem 0.75rem', fontSize: '0.75rem', fontWeight: 'bold' }}>🚚 Satiny COD</span>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <ThemeToggle />
                    <button className="btn-primary outline" style={{ padding: '0.5rem 1rem', opacity: 0.8 }} onClick={() => navigate('/admin')}>Salon Dashboard</button>
                    <button className="btn-primary outline" style={{ padding: '0.5rem 1rem', opacity: 0.8 }} onClick={() => navigate('/agent-admin')}>Agent Dashboard</button>
                    <button className="btn-primary" style={{ padding: '0.5rem 1rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }} onClick={() => navigate('/qr-generator')}>🔲 Scan Dashboard</button>
                    <button className="btn-primary outline" style={{ borderColor: '#ef4444', color: '#ef4444', padding: '0.5rem 1rem' }}
                        onClick={() => { localStorage.removeItem('adminUser'); navigate('/admin-login'); }}>Log Out</button>
                </div>
            </header>

            {/* Main Navigation Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="tabs-container" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {navBtn('overview', 'Overview')}
                    {(adminRole === 'admin' || adminRole === 'superadmin') && navBtn('orders', 'Orders')}
                    {(adminRole !== 'admin') && navBtn('agents', 'Agents')}
                    {(adminRole === 'admin' || adminRole === 'superadmin') && navBtn('reports', 'Reports')}
                </div>

                {/* Contextual Filters */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {(activeTab === 'orders' || activeTab === 'agents') && (
                        <input type="text" placeholder="Search..." value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none', transition: 'all 0.3s ease' }} />
                    )}
                    <select value={selectedAgentId} onChange={e => setSelectedAgentId(e.target.value)}
                        style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'white', transition: 'all 0.3s ease' }}>
                        <option value="" >All Agents</option>
                        {agents.map(a => <option key={a._id} value={a._id} >{a.level === 2 ? `[L2] ${a.name}` : a.name}</option>)}
                    </select>
                </div>
            </div>

            {/* ========== OVERVIEW ========== */}
            {activeTab === 'overview' && (
                <section className="glass-container animate-fade-in">
                    <h2 style={{ marginBottom: '1.5rem' }}>Dashboard Overview</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        {[
                            { label: 'Total Net.Agents', value: agents.length, color: '#38bdf8' },
                            { label: 'Active Agents', value: activeCount, color: '#4ade80' },
                            { label: 'Visited Agents', value: visitedCount, color: '#c084fc' },
                            { label: 'Revenue (Confirmed)', value: `Rs.${totalRevenue.toLocaleString()}`, color: '#4ade80' },
                            { label: 'COD Orders', value: trueCodCount, color: '#f59e0b' },
                            { label: 'Paid Orders', value: paidCount, color: '#10b981' },
                            { label: 'Completed Orders', value: completedCount, color: '#0ea5e9' },
                            { label: 'Returned Orders', value: returnedCount, color: '#f43f5e' },
                        ].map((stat, i) => (
                            <div key={i} style={{ background: `${stat.color}18`, border: `1px solid ${stat.color}44`, borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
                                <h3 style={{ color: stat.color, fontSize: '0.95rem', marginBottom: '0.5rem' }}>{stat.label}</h3>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stat.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Product Wise Count Table */}
                    <h3 style={{ marginBottom: '1rem', marginTop: '2rem' }}>Product Wise Count</h3>
                    <div className="table-container" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)' }}>
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

                    {/* My Daily Updates Section */}
                    <div style={{ marginTop: '3rem' }}>
                        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#4ade80', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1' }}>
                                <Users size={24} /> My Daily Updates
                                <span style={{ fontSize: '1.1rem', opacity: 0.6, marginLeft: '0.5rem' }}>({dailyUpdates.length})</span>
                                {draftUpdatesCount > 0 && (
                                    <span style={{ 
                                        fontSize: '0.85rem', 
                                        color: '#eab308', 
                                        background: 'rgba(234, 179, 8, 0.1)', 
                                        padding: '0.2rem 0.6rem', 
                                        borderRadius: '12px',
                                        border: '1px solid rgba(234, 179, 8, 0.2)',
                                        whiteSpace: 'nowrap',
                                        fontWeight: 'normal',
                                        marginLeft: '0.5rem'
                                    }}>
                                        {draftUpdatesCount} Add Details Only Agents
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <input 
                                    type="date" 
                                    value={selectedUpdateDate} 
                                    onChange={(e) => setSelectedUpdateDate(e.target.value)}
                                    style={{ 
                                        padding: '0.5rem 1rem', 
                                        borderRadius: '8px', 
                                        border: '1px solid rgba(255,255,255,0.1)', 
                                        background: 'rgba(0,0,0,0.2)', 
                                        color: 'white',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                            </div>
                        </h2>

                        <div className="table-container" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <table className="styled-table">
                                <thead>
                                    <tr>
                                        <th>Agent Name</th>
                                        <th>Code</th>
                                        <th>Location</th>
                                        <th>Contact</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dailyUpdates.map(agent => (
                                        <tr key={agent._id}>
                                            <td style={{ fontWeight: 'bold' }}>{agent.name}</td>
                                            <td>
                                                <span style={{ 
                                                    fontFamily: 'monospace', 
                                                    background: agent.agentCode ? 'rgba(129, 140, 248, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                                                    color: agent.agentCode ? '#818cf8' : '#f87171',
                                                    padding: '0.2rem 0.5rem', 
                                                    borderRadius: '4px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 'bold',
                                                    border: `1px solid ${agent.agentCode ? 'rgba(129, 140, 248, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                                }}>
                                                    {agent.agentCode || 'DRAFT'}
                                                </span>
                                            </td>
                                            <td>{agent.location}</td>
                                            <td>{agent.contactNumber1}</td>
                                            <td>
                                                <span className={`status-badge ${agent.isVisited ? 'visited' : ''}`} style={{ fontSize: '0.75rem' }}>
                                                    {agent.isVisited ? 'Visited' : 'Pending'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button 
                                                    onClick={() => handleEditClick(agent)}
                                                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', marginRight: '0.5rem' }}
                                                >
                                                    <Edit size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {dailyUpdates.length === 0 && (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                                No updates today.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            )}

            {/* ========== ORDERS ========== */}
            {(adminRole === 'admin' || adminRole === 'superadmin') && activeTab === 'orders' && (
                <section className="glass-container animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <h2>COD & Paid Orders</h2>
                        <button className="btn-primary" onClick={handleExportOrders} style={{ padding: '0.5rem 1rem' }}>📥 Export CSV</button>
                    </div>
                    <div className="table-container">
                        <table className="styled-table">
                            <thead>
                                <tr>
                                    <th>Date</th><th>Order ID</th><th>Agent/Salon</th><th>Customer</th>
                                    <th>Phone</th><th>Address</th><th>Items</th><th>Total</th><th>Status</th><th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                    {orders.filter(o => {
                                        if (adminRole === 'admin' && o.status !== 'COD' && o.status !== 'Paid') return false;
                                    if (!searchTerm) return true;
                                    const t = searchTerm.toLowerCase();
                                    return (o.customerName || '').toLowerCase().includes(t) ||
                                        (o.customerPhone || '').includes(t) ||
                                        (o.agentName || '').toLowerCase().includes(t);
                                }).map(o => (
                                    <tr key={o._id} style={{ backgroundColor: o.isDownloaded ? 'rgba(220, 38, 38, 0.15)' : 'transparent' }}>
                                        <td style={{ whiteSpace: 'nowrap' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                                        <td>{o.merchantOrderId || o._id.slice(-6).toUpperCase()}</td>
                                        <td>{o.salonName || o.agentName || '—'}</td>
                                        <td>{o.customerName}</td>
                                        <td>{o.customerPhone}<br /><span style={{ opacity: 0.6, fontSize: '0.8rem' }}>{o.additionalPhone}</span></td>
                                        <td>{o.address}, {o.city}</td>
                                        <td>{o.items.map(i => `${i.productName} ×${i.quantity}`).join(', ')}</td>
                                        <td>Rs.{o.totalAmount}</td>
                                        <td><span className="status-badge" style={{ background: `${statusColors[o.status] || '#6b7280'}22`, color: statusColors[o.status] || '#fff', border: `1px solid ${statusColors[o.status] || '#6b7280'}` }}>{o.status}</span></td>
                                        <td>
                                            <select value={o.status} disabled={adminRole === 'admin'} onChange={e => updateStatus(o._id, e.target.value)}
                                                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '0.3rem', fontSize: '0.8rem' }}>
                                                {['COD', 'Paid', 'Shipped', 'Completed', 'Cancelled', 'Returned'].map(s => <option key={s} value={s} >{s}</option>)}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                                {!orders.length && <tr><td colSpan="10" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>No COD or Paid orders yet</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* ========== AGENTS ========== */}
            {activeTab === 'agents' && (
                <section className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Create / Edit Form */}
                    <div className="glass-container">
                        <h2>{editingAgentId ? 'Edit Net.Agent' : 'Register Net.Agent'}</h2>

                        {/* Mode tabs */}
                        {!editingAgentId && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                {[['create', 'Create New'], ['assign', 'Assign to Code'], ['draft', 'Save as Draft']].map(([mode, label]) => (
                                    <button key={mode} onClick={() => setFormMode(mode)}
                                        className={`btn-primary ${formMode === mode ? '' : 'outline'}`}
                                        style={{ padding: '0.4rem 1rem', opacity: formMode === mode ? 1 : 0.65 }}>{label}</button>
                                ))}
                            </div>
                        )}

                        <form onSubmit={editingAgentId ? handleUpdate : handleCreate}>
                            {formMode === 'assign' && !editingAgentId && (
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(56,189,248,0.5)' }}>
                                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', background: 'none', WebkitTextFillColor: 'initial' }}>
                                        Enter Pre-Registered QR Code
                                    </h3>
                                    <input placeholder="Net.Agent Code (e.g. NAA1B234)" value={form.assignToCode}
                                        onChange={e => setForm({ ...form, assignToCode: e.target.value })}
                                        style={{ width: '100%', margin: 0 }} />
                                </div>
                            )}
                            <div className="form-grid">
                                <div className="input-group">
                                    <label>Full Name *</label>
                                    <input placeholder="e.g. John Doe" value={form.name} required onChange={e => setForm({ ...form, name: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label>Location</label>
                                    <input placeholder="e.g. Colombo 05" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label>Phone 1</label>
                                    <input placeholder="Phone 1" value={form.contactNumber1} onChange={e => setForm({ ...form, contactNumber1: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label>Phone 2</label>
                                    <input placeholder="Phone 2" value={form.contactNumber2} onChange={e => setForm({ ...form, contactNumber2: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label>Representative Name</label>
                                    <select value={form.repName} onChange={e => setForm({ ...form, repName: e.target.value })}>
                                        <option value="" >Select Rep</option>
                                        {reps.map(r => <option key={r._id} value={r.name} >{r.name}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Remark</label>
                                    <input placeholder="Remark" value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label>Username (Optional)</label>
                                    <input placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label>Password (Optional)</label>
                                    <input placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                                </div>
                            </div>

                            <h3 className="section-title">Status</h3>
                             <div className="form-grid" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                 <div className="input-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                                     <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', color: 'white', fontSize: '1rem', minWidth: '150px' }}>
                                         <input type="checkbox" checked={form.isVisited} onChange={e => setForm({ ...form, isVisited: e.target.checked })} style={{ width: '22px', height: '22px', margin: 0 }} />
                                         Visited
                                     </label>
                                     {form.isVisited && (
                                         <input type="date" value={form.visitedDate} onChange={e => setForm({ ...form, visitedDate: e.target.value })} style={{ flex: '1 1 200px', marginTop: 0 }} />
                                     )}
                                 </div>
                                 <div className="input-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                                     <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', color: 'white', fontSize: '1rem', minWidth: '150px' }}>
                                         <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} style={{ width: '22px', height: '22px', margin: 0 }} />
                                         Active
                                     </label>
                                     {form.isActive && (
                                         <input type="date" value={form.activeDate} onChange={e => setForm({ ...form, activeDate: e.target.value })} style={{ flex: '1 1 200px', marginTop: 0 }} />
                                     )}
                                 </div>
                                 <div className="input-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                                     <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', color: 'white', fontSize: '1rem', minWidth: '150px' }}>
                                         <input type="checkbox" checked={form.posmActive} onChange={e => setForm({ ...form, posmActive: e.target.checked })} style={{ width: '22px', height: '22px', margin: 0 }} />
                                         POSM Active
                                     </label>
                                     {form.posmActive && (
                                         <input type="date" value={form.posmDate} onChange={e => setForm({ ...form, posmDate: e.target.value })} style={{ flex: '1 1 200px', marginTop: 0 }} />
                                     )}
                                 </div>
                             </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                                    {editingAgentId ? 'Update Agent' : formMode === 'assign' ? 'Assign Details' : 'Register Net.Agent'}
                                </button>
                                {editingAgentId && (
                                    <button type="button" onClick={() => { setForm(emptyForm); setEditingAgentId(null); }}
                                        className="btn-primary outline" style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444' }}>Cancel</button>
                                )}
                            </div>
                        </form>

                        {/* QR Result after create */}
                        {qrCode && createdAgent && (
                            <div style={{ marginTop: '2rem', textAlign: 'center', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                                <h3 style={{ color: '#4ade80' }}>✅ Net.Agent Created!</h3>
                                <p><strong>Code:</strong> {createdAgent.agentCode}</p>
                                <p><strong>Name:</strong> {createdAgent.name}</p>
                                {newCredentials && <p><strong>Username:</strong> {newCredentials.username} | <strong>Password:</strong> {newCredentials.password}</p>}
                                <img src={qrCode} alt="QR Code" style={{ width: '200px', margin: '1rem auto', display: 'block', borderRadius: '8px' }} />
                                <p style={{ opacity: 0.7, fontSize: '0.85rem', wordBreak: 'break-all' }}>
                                    {BASE_URL}/net-agent-order/{createdAgent.uniqueId}
                                </p>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
                                    <button className="btn-primary" onClick={() => handleDownloadQR(createdAgent)}>⬇ SVG</button>
                                    <button className="btn-primary" onClick={() => handleDownloadJPG(createdAgent)} style={{ background: '#eab308', borderColor: '#eab308', color: '#000' }}>⬇ JPG</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bulk Tools */}
                    <div className="glass-container">
                        <h3 style={{ marginBottom: '1rem' }}>Bulk Tools</h3>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.7, fontSize: '0.85rem' }}>Bulk Register (count)</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input type="number" min="1" max="100" placeholder="Count" value={bulkCount}
                                        onChange={e => setBulkCount(e.target.value)}
                                        style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #ccc', width: '100px' }} />
                                    <button className="btn-primary" onClick={handleBulkCreate} style={{ padding: '0.6rem 1rem' }}>Create</button>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.7, fontSize: '0.85rem' }}>Upload Excel/CSV</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input type="file" accept=".xlsx,.csv" onChange={e => setSelectedExcelFile(e.target.files[0])}
                                        style={{ padding: '0.4rem' }} />
                                    <button className="btn-primary" onClick={handleExcelUpload} style={{ padding: '0.6rem 1rem' }}>Upload</button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button className="btn-primary" onClick={() => handleBatchPrint(filteredAgents.filter(a => a.agentCode))} style={{ padding: '0.6rem 1rem' }}>🖨 Print QRs</button>
                                <button className="btn-primary" onClick={() => handleBatchDownloadZip(filteredAgents.filter(a => a.agentCode), 'svg')} style={{ padding: '0.6rem 1rem' }}>📦 Download ZIP (SVG)</button>
                                <button className="btn-primary" onClick={() => handleBatchDownloadZip(filteredAgents.filter(a => a.agentCode), 'jpg')} style={{ padding: '0.6rem 1rem', background: '#eab308', borderColor: '#eab308', color: '#000' }}>📦 Download ZIP (JPG)</button>
                                <button className="btn-primary" onClick={handleExportAgents} style={{ padding: '0.6rem 1rem' }}>📥 Export CSV</button>
                            </div>
                        </div>
                    </div>

                    {/* Agents Table */}
                    <div className="glass-container">
                        <h3 style={{ marginBottom: '1rem' }}>Net.Agents ({filteredAgents.length})</h3>
                        <div className="table-container">
                            <table className="styled-table">
                                <thead>
                                    <tr>
                                        <th><input type="checkbox"
                                            checked={selectedAgents.length === filteredAgents.length && filteredAgents.length > 0}
                                            onChange={() => setSelectedAgents(selectedAgents.length === filteredAgents.length ? [] : filteredAgents.map(a => a._id))} /></th>
                                        <th>Code</th><th>Name</th><th>Level</th><th>Parent</th><th>Credentials</th><th>Location</th><th>Rep</th>
                                        <th>Visited</th><th>Active</th><th>QR Link</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAgents.map(a => (
                                        <tr key={a._id}>
                                            <td><input type="checkbox" checked={selectedAgents.includes(a._id)}
                                                onChange={() => setSelectedAgents(prev => prev.includes(a._id) ? prev.filter(id => id !== a._id) : [...prev, a._id])} /></td>
                                            <td><span style={{ fontFamily: 'monospace', background: 'rgba(245,158,11,0.2)', padding: '2px 8px', borderRadius: '4px', color: '#f59e0b' }}>{a.agentCode || 'Draft'}</span></td>
                                            <td><div style={{ fontWeight: 'bold' }}>{a.name}</div></td>
                                            <td><span style={{ fontSize: '0.85rem', background: a.level === 2 ? 'rgba(168,85,247,0.2)' : 'rgba(56,189,248,0.2)', padding: '2px 8px', borderRadius: '4px', color: a.level === 2 ? '#a855f7' : '#38bdf8' }}>L{a.level || 1}</span></td>
                                            <td><div style={{ fontSize: '0.85rem', opacity: 0.7 }}>{agents.find(p => p._id === a.parentNetAgentId)?.name || '—'}</div></td>
                                            <td>
                                                <div style={{ fontSize: '0.85rem', color: '#38bdf8' }}>{a.username}</div>
                                                <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#4ade80' }}>{a.plainPassword || '••••••'}</div>
                                            </td>
                                            <td>{a.location || '—'}</td>
                                            <td>{a.repName || '—'}</td>
                                            <td><span style={{ color: a.isVisited ? '#4ade80' : '#6b7280' }}>{a.isVisited ? '✓' : '✗'}</span></td>
                                            <td><span style={{ color: a.isActive ? '#4ade80' : '#6b7280' }}>{a.isActive ? '✓' : '✗'}</span></td>
                                            <td>
                                                {a.agentCode ? (
                                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                        <button
                                                            onClick={() => handleDownloadQR(a)}
                                                            className="btn-primary"
                                                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                                                            title="Download SVG"
                                                        >
                                                            SVG
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownloadJPG(a)}
                                                            className="btn-primary"
                                                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', background: '#eab308', border: 'none', color: '#000' }}
                                                            title="Download JPG"
                                                        >
                                                            JPG
                                                        </button>
                                                    </div>
                                                ) : '—'}
                                            </td>
                                            <td style={{ display: 'flex', gap: '0.4rem' }}>
                                                <a href={`/net-agent-order/${a.uniqueId}`} target="_blank" rel="noopener noreferrer"
                                                    className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: '#10b981', textDecoration: 'none' }}>
                                                    👁️ Scan
                                                </a>
                                                <button className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: '#3b82f6' }}
                                                    onClick={() => {
                                                        const url = `${BASE_URL}/net-agent-order/${a.uniqueId}`;
                                                        navigator.clipboard.writeText(url);
                                                        alert('Link copied to clipboard!');
                                                    }}>🔗 Copy</button>
                                                <button className="btn-primary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
                                                    onClick={() => handleEditClick(a)}>Edit</button>
                                                <button onClick={() => handleDelete(a._id)}
                                                    style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', borderRadius: '6px', cursor: 'pointer' }}>Del</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {!filteredAgents.length && (
                                        <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>No Net.Agents registered yet</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {selectedAgents.length > 0 && (
                            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ opacity: 0.7 }}>{selectedAgents.length} selected:</span>
                                <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                    onClick={() => handleBatchPrint(agents.filter(a => selectedAgents.includes(a._id) && a.agentCode))}>🖨 Print Selected</button>
                                <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                    onClick={() => handleBatchDownloadZip(agents.filter(a => selectedAgents.includes(a._id) && a.agentCode))}>📦 Download Selected</button>
                                <button onClick={async () => {
                                    if (!window.confirm(`Delete ${selectedAgents.length} agents?`)) return;
                                    for (const id of selectedAgents) { try { await axios.delete(`${API_URL}/net-agents/${id}`); } catch (e) { } }
                                    setSelectedAgents([]); fetchAgents();
                                }} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', borderRadius: '6px', cursor: 'pointer' }}>🗑 Delete Selected</button>
                            </div>
                        )}
                    </div>
                </section>
            )}
            {activeTab === 'reports' && (
                <section className="glass-container animate-fade-in">
                    <h2>Reports & Export</h2>
                    <p style={{ opacity: 0.8, marginBottom: '2rem' }}>Download and track report history.</p>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Start Date</label>
                            <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)}
                                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'white', colorScheme: 'dark' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>End Date</label>
                            <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)}
                                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'white', colorScheme: 'dark' }} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Net Agents List</h3>
                            <button onClick={handleExportAgents} className="btn-primary">Download CSV</button>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h3 style={{ margin: 0 }}>COD & Paid Orders Detail</h3>
                            <button onClick={handleExportOrders} className="btn-primary">Download CSV</button>
                        </div>
                    </div>

                    <div style={{ marginTop: '3rem' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Download History</h2>
                        <div className="table-container">
                            <table className="styled-table">
                                <thead>
                                    <tr>
                                        <th>Date & Time</th>
                                        <th>Type</th>
                                        <th>User</th>
                                        <th>Records</th>
                                        <th>Filter</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportHistory.map(log => (
                                        <tr key={log._id}>
                                            <td>{new Date(log.createdAt).toLocaleString()}</td>
                                            <td style={{ fontWeight: 'bold' }}>{log.reportType}</td>
                                            <td>{log.downloadedBy}</td>
                                            <td>{log.recordCount}</td>
                                            <td style={{ opacity: 0.7, fontSize: '0.9rem' }}>{log.dateRange}</td>
                                        </tr>
                                    ))}
                                    {!reportHistory.length && <tr><td colSpan="5" style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>No history found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default NetAgentDashboard;
