import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';

const API_URL = import.meta.env.VITE_API_URL || 'https://salonfadna-backend.onrender.com/api';

const AdminDashboard = () => {
    const [salons, setSalons] = useState([]);
    const [orders, setOrders] = useState([]);
    const [newSalon, setNewSalon] = useState({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '', isDraft: false });
    const [qrCode, setQrCode] = useState(null);
    const [newCredentials, setNewCredentials] = useState(null);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'orders', 'salons', 'monitor'
    const [formModeAdmin, setFormModeAdmin] = useState('create'); // 'create' or 'assign'
    const [manualVisitedCount, setManualVisitedCount] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const storedAdmin = localStorage.getItem('adminUser');
        if (!storedAdmin) {
            navigate('/admin-login');
        }
    }, [navigate]);
    const [editingSalonId, setEditingSalonId] = useState(null);
    const [expandedSalonId, setExpandedSalonId] = useState(null);
    const [salonPerformance, setSalonPerformance] = useState([]);
    const [itemPerformance, setItemPerformance] = useState([]);
    const [products, setProducts] = useState([]);
    const [newProduct, setNewProduct] = useState({ name: '', price: '', discountType: 'none', discountValue: 0 });
    const [editingProductId, setEditingProductId] = useState(null);
    const [selectedSalonId, setSelectedSalonId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [newAccount, setNewAccount] = useState({ username: '', password: '' });
    const [accounts, setAccounts] = useState([]);
    const [editingAccountId, setEditingAccountId] = useState(null);
    const [reps, setReps] = useState([]);
    const [newRepName, setNewRepName] = useState('');
    const [selectedExcelFile, setSelectedExcelFile] = useState(null);

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

    const fetchAccounts = React.useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/auth/accounts`);
            if (res.data.success) setAccounts(res.data.accounts);
        } catch (err) {
            console.error('Error fetching accounts:', err);
        }
    }, []);

    const fetchReps = React.useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/reps`);
            if (res.data.success) setReps(res.data.data);
        } catch (err) {
            console.error('Error fetching reps:', err);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'accounts') {
            fetchAccounts();
        }
    }, [activeTab, fetchAccounts]);

    useEffect(() => {
        fetchReps();
    }, [fetchReps]);

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

    const [createdSalon, setCreatedSalon] = useState(null);

    const handleCreateSalon = async (e) => {
        e.preventDefault();
        try {
            if (formModeAdmin === 'assign') {
                if (!newSalon.assignToCode || newSalon.assignToCode.trim() === '') {
                    alert('Please enter a Salon Code to assign to.');
                    return;
                }
                const role = localStorage.getItem('adminRole');
                const username = localStorage.getItem('loggedInUsername');
                const editedByValue = role === 'admin' ? 'admin' : (username || 'admin');
                const payload = { ...newSalon, editedBy: editedByValue };

                const res = await axios.put(`${API_URL}/salons/assign`, payload);
                if (res.data.success) {
                    alert(`Successfully assigned details to Salon Code: ${newSalon.assignToCode}`);
                    setNewSalon({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], nextVisitedDate: '', isActive: false, posmActive: false, assignToCode: '' });
                    fetchSalons();
                }
            } else {
                const res = await axios.post(`${API_URL}/salons`, { ...newSalon, isDraft: formModeAdmin === 'draft' });
                if (res.data.success) {
                    if (formModeAdmin === 'draft') {
                        alert('Draft salon created successfully!');
                        setNewSalon({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '', isDraft: false });
                        fetchSalons();
                    } else {
                        setQrCode(res.data.qrCode);
                        setNewSalon({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '', isDraft: false });
                        fetchSalons();

                        // Set Credentials for display
                        setNewCredentials(res.data.credentials);
                        setCreatedSalon(res.data.salon); // Save created salon to show code
                    }
                }
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error creating salon');
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
        setEditingSalonId(salon._id);
        setEditingSalonId(salon._id);
        setEditingSalonId(salon._id);
        setQrCode(null);
        setNewCredentials(null);
        setCreatedSalon(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleUpdateSalon = async (e) => {
        e.preventDefault();
        try {
            const role = localStorage.getItem('adminRole');
            const username = localStorage.getItem('loggedInUsername');
            const editedByValue = role === 'admin' ? 'admin' : username;
            const payload = { ...newSalon, editedBy: editedByValue };

            let res;
            if (newSalon.isDraft && newSalon.assignToCode && newSalon.assignToCode.trim() !== '') {
                res = await axios.put(`${API_URL}/salons/${editingSalonId}/merge`, payload);
            } else {
                res = await axios.put(`${API_URL}/salons/${editingSalonId}`, payload);
            }

            if (res.data.success) {
                setNewSalon({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '', isDraft: false });
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
        setNewSalon({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '', isDraft: false });
        setEditingSalonId(null);
    };

    const [bulkCount, setBulkCount] = useState('');
    const [newBulkSalons, setNewBulkSalons] = useState([]);
    const [selectedSalons, setSelectedSalons] = useState([]);

    const handleSelectSalon = (id) => {
        setSelectedSalons(prev => {
            if (prev.includes(id)) {
                return prev.filter(sId => sId !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleSelectAll = (filteredSalons) => {
        if (selectedSalons.length === filteredSalons.length) {
            setSelectedSalons([]);
        } else {
            setSelectedSalons(filteredSalons.map(s => s._id));
        }
    };

    const handleBulkCreate = async () => {
        try {
            if (!bulkCount || bulkCount <= 0) return;
            const res = await axios.post(`${API_URL}/salons/bulk`, { count: bulkCount });
            if (res.data.success) {
                setNewBulkSalons(res.data.salons);
                setBulkCount('');
                fetchSalons();
                alert(`${res.data.salons.length} Salons registered successfully!`);
            }
        } catch (err) {
            console.error(err);
            alert('Error creating bulk salons');
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

    const generateQRSVG = async (salon) => {
        const baseUrl = 'https://www.portal.fadnals.lk';
        const qrUrl = `${baseUrl}/order/${salon.uniqueId}`;

        // Generate SVG string
        const svgString = await QRCode.toString(qrUrl, {
            type: 'svg',
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });

        // Parse to manipulate
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, "image/svg+xml");
        const svg = doc.documentElement;

        const viewBox = svg.getAttribute('viewBox').split(' ').map(Number);
        const [vx, vy, vw, vh] = viewBox;

        // Add space for text
        const textSpace = vh * 0.15;
        const newVh = vh + textSpace;
        svg.setAttribute('viewBox', `${vx} ${vy} ${vw} ${newVh}`);

        // Add/Extend Background
        let bgRect = svg.querySelector('rect[fill="#ffffff"]');
        if (!bgRect) {
            bgRect = doc.createElementNS("http://www.w3.org/2000/svg", "rect");
            bgRect.setAttribute("fill", "#ffffff");
            svg.insertBefore(bgRect, svg.firstChild);
        }
        bgRect.setAttribute("width", "100%");
        bgRect.setAttribute("height", "100%");
        bgRect.setAttribute("x", vx);
        bgRect.setAttribute("y", vy);
        bgRect.setAttribute("width", vw);
        bgRect.setAttribute("height", newVh);

        // Add Text
        const text = doc.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", vw / 2);
        text.setAttribute("y", vh + (textSpace / 1.5));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-family", "Arial, sans-serif");
        text.setAttribute("font-size", `${vw * 0.06}`);
        text.setAttribute("font-weight", "bold");
        text.setAttribute("fill", "#000000");
        text.textContent = `Code: ${salon.salonCode || 'N/A'}`;
        svg.appendChild(text);

        const serializer = new XMLSerializer();
        return serializer.serializeToString(svg);
    };

    const handleDownloadQR = async (salon) => {
        try {
            const svgString = await generateQRSVG(salon);
            const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
            saveAs(blob, `${salon.name.replace(/\s+/g, '_')}-qr.svg`);
        } catch (err) {
            console.error('Error generating QR', err);
            alert('Failed to generate QR');
        }
    };

    const handleBatchPrint = async (salonsToPrint) => {
        if (!salonsToPrint || salonsToPrint.length === 0) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write('<html><head><title>Print QR Codes</title>');
        printWindow.document.write('<style>body{font-family: Arial, sans-serif; display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;} .qr-card{border: 1px solid #ccc; padding: 10px; text-align: center; page-break-inside: avoid; width: 200px;} svg{width: 100%; height: auto;} @media print { .no-print { display: none; } }</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write('<div class="no-print" style="width: 100%; text-align: center; margin-bottom: 20px;"><button onclick="window.print()" style="padding: 10px 20px; font-size: 16px;">PRINT NOW</button></div>');

        for (const salon of salonsToPrint) {
            try {
                const svgString = await generateQRSVG(salon);
                // Encode SVG to base64 to ensure it renders reliably in some contexts, or just embed raw SVG
                // Embedding raw SVG is better for vectors.
                printWindow.document.write(`
                    <div class="qr-card">
                        ${svgString}
                        <div style="margin-top:5px; font-weight:bold;">${salon.name}</div>
                    </div>
                `);
            } catch (e) {
                console.error(e);
            }
        }

        printWindow.document.write('</body></html>');
        printWindow.document.close();
    };

    const handleBatchDownloadZip = async (salonsToDownload) => {
        if (!salonsToDownload || salonsToDownload.length === 0) return;

        const zip = new JSZip();

        for (const salon of salonsToDownload) {
            try {
                const svgString = await generateQRSVG(salon);
                zip.file(`${salon.name.replace(/\s+/g, '_')}_${salon.salonCode}.svg`, svgString);
            } catch (err) {
                console.error("Error generating SVG for zip", err);
            }
        }

        zip.generateAsync({ type: "blob" })
            .then(function (content) {
                saveAs(content, "salons_qr_codes.zip");
            });
    };

    const handleBatchDelete = async (salonsToDelete) => {
        if (!salonsToDelete || salonsToDelete.length === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${salonsToDelete.length} salons? This cannot be undone.`)) return;

        let successCount = 0;

        for (const salon of salonsToDelete) {
            try {
                await axios.delete(`${API_URL}/salons/${salon._id}`);
                successCount++;
            } catch (err) {
                // If 404, likely already deleted, just log and continue
                if (err.response && err.response.status === 404) {
                    console.warn(`Salon ${salon.name} (${salon._id}) already deleted or not found.`);
                } else {
                    console.error(`Failed to delete salon ${salon.name}:`, err);
                }
            }
        }

        setSelectedSalons([]);
        fetchSalons();
        alert(`Batch process finished. ${successCount} salons deleted.`);
    };

    const filteredSalons = salons.filter(salon => {
        if (selectedSalonId && salon._id !== selectedSalonId) return false;
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            salon.name.toLowerCase().includes(term) ||
            (salon.location && salon.location.toLowerCase().includes(term)) ||
            (salon.username && salon.username.toLowerCase().includes(term)) ||
            (salon.salonCode && salon.salonCode.toLowerCase().includes(term))
        );
    });

    const handleExportSalons = () => {
        if (!salons.length) return alert('No salons to export');
        const headers = ['Salon ID', 'Name', 'Location', 'Code', 'Username', 'Password', 'Bank Name', 'Branch', 'Account Number', 'Account Name', 'Contact 1', 'Contact 2', 'Rep Name', 'Remark', 'Registered Date', 'Visited', 'Visited Date', 'Revisited Dates', 'Active', 'POSM Active'];
        const rows = salons.map(s => {
            const acc = s.accountDetails || {};
            return [
                s._id,
                `"${(s.name || '').replace(/"/g, '""')}"`,
                `"${(s.location || '').replace(/"/g, '""')}"`,
                s.salonCode || '',
                s.username || '',
                `"${(s.plainPassword || '').replace(/"/g, '""')}"`,
                `"${(acc.bankName || '').replace(/"/g, '""')}"`,
                `"${(acc.branch || '').replace(/"/g, '""')}"`,
                `"${(acc.accountNumber || '').replace(/"/g, '""')}"`,
                `"${(acc.accountName || '').replace(/"/g, '""')}"`,
                s.contactNumber1 || s.contactNumber || '',
                s.contactNumber2 || '',
                `"${(s.repName || '').replace(/"/g, '""')}"`,
                `"${(s.remark || '').replace(/"/g, '""')}"`,
                s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '',
                s.isVisited ? 'Yes' : 'No',
                s.visitedDate ? new Date(s.visitedDate).toLocaleDateString() : '',
                (s.revisitedDates || []).map(d => new Date(d).toLocaleDateString()).join('; '),
                s.isActive ? 'Yes' : 'No',
                s.posmActive ? 'Yes' : 'No'
            ];
        });
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, 'salons_report.csv');
    };

    const handleExportOrders = () => {
        if (!orders.length) return alert('No orders to export');
        const headers = ['Order ID', 'Merchant Order ID', 'Date', 'Salon', 'Customer Name', 'Customer Phone', 'Additional Phone', 'Address', 'City', 'Status', 'Total Amount', 'Items'];
        const rows = orders.map(o => [
            o._id,
            o.merchantOrderId || o._id.slice(-6).toUpperCase(),
            `"${new Date(o.createdAt).toLocaleString()}"`,
            `"${(o.salonName || '').replace(/"/g, '""')}"`,
            `"${(o.customerName || '').replace(/"/g, '""')}"`,
            `"${(o.customerPhone || '').replace(/"/g, '""')}"`,
            `"${(o.additionalPhone || '').replace(/"/g, '""')}"`,
            `"${(o.address || '').replace(/"/g, '""')}"`,
            `"${(o.city || '').replace(/"/g, '""')}"`,
            o.status,
            o.totalAmount,
            `"${o.items.map(i => `${i.productName} (x${i.quantity})`).join(', ').replace(/"/g, '""')}"`
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, 'orders_report.csv');
    };

    const handleExportPerformance = () => {
        if (!salonPerformance.length) return alert('No performance data');
        const headers = ['Salon', 'Valid Orders', 'Returns', 'Cancelled', 'Items Sold', 'Revenue'];
        const rows = salonPerformance.map(s => [
            `"${(s.salonName || 'Unknown').replace(/"/g, '""')}"`,
            s.totalOrders,
            s.returnedOrders || 0,
            s.cancelledOrders || 0,
            s.totalItemsSold,
            s.totalRevenue
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, 'performance_report.csv');
    };

    const activeSalonsCount = salons.filter(s => s.isActive).length;
    const posmSalonsCount = salons.filter(s => s.posmActive).length;
    const visitedSalonsFromDb = salons.filter(s => s.isVisited).length;

    const chartData = [
        { name: 'Active Salons', count: activeSalonsCount, fill: '#38bdf8' },
        { name: 'POSM Active', count: posmSalonsCount, fill: '#c084fc' },
        { name: 'Visited Salons', count: visitedSalonsFromDb + Number(manualVisitedCount || 0), fill: '#4ade80' }
    ];

    const repStats = {};
    salons.forEach(s => {
        const rep = (s.repName && s.repName.trim() !== '') ? s.repName : 'Unassigned';
        if (!repStats[rep]) {
            repStats[rep] = { name: rep, visited: 0, active: 0, posm: 0 };
        }
        if (s.isVisited) repStats[rep].visited += 1;
        if (s.isActive) repStats[rep].active += 1;
        if (s.posmActive) repStats[rep].posm += 1;
    });
    const repChartData = Object.values(repStats).sort((a, b) => a.name.localeCompare(b.name));

    const downloadChart = async () => {
        const chartElement = document.getElementById('stats-chart-container');
        if (chartElement) {
            try {
                const canvas = await html2canvas(chartElement, { backgroundColor: '#1a1a2e' });
                canvas.toBlob((blob) => {
                    saveAs(blob, 'salon_stats_chart.png');
                });
            } catch (e) {
                console.error("Error downloading chart", e);
                alert("Failed to download chart");
            }
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
                            className={`btn-primary nav-btn ${activeTab === 'overview' ? '' : 'outline'}`}
                            style={{ opacity: activeTab === 'overview' ? 1 : 0.7 }}
                            onClick={() => setActiveTab('overview')}
                        >
                            Overview
                        </button>
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
                            className={`btn-primary nav-btn ${activeTab === 'accounts' ? '' : 'outline'}`}
                            style={{ opacity: activeTab === 'accounts' ? 1 : 0.7 }}
                            onClick={() => setActiveTab('accounts')}
                        >
                            Accounts
                        </button>
                        <button
                            className={`btn-primary nav-btn ${activeTab === 'reports' ? '' : 'outline'}`}
                            style={{ opacity: activeTab === 'reports' ? 1 : 0.7 }}
                            onClick={() => setActiveTab('reports')}
                        >
                            Reports
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
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                                <button className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
                                    Search
                                </button>
                            </div>
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

            {activeTab === 'overview' && (
                <section className="glass-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <h2>Dashboard Overview</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <label style={{ color: 'white', fontWeight: 'bold' }}>Add Manual Visited Count:</label>
                            <input
                                type="number"
                                value={manualVisitedCount}
                                onChange={(e) => setManualVisitedCount(e.target.value)}
                                style={{
                                    width: '80px',
                                    padding: '0.5rem',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    background: 'rgba(255,255,255,0.1)',
                                    color: 'white',
                                    outline: 'none'
                                }}
                                min="0"
                            />
                        </div>
                    </div>

                    <div id="stats-chart-container" style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ textAlign: 'center', marginBottom: '2rem', color: '#fff' }}>Salon Status Counter</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="#fff" tick={{ fill: '#fff' }} />
                                <YAxis stroke="#fff" tick={{ fill: '#fff' }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend wrapperStyle={{ color: '#fff' }} />
                                <Bar dataKey="count" name="Salons Count" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            onClick={downloadChart}
                            className="btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem', fontSize: '1rem' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Download Overview Chart
                        </button>
                    </div>

                    <div id="rep-stats-chart-container" style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', marginTop: '2rem' }}>
                        <h3 style={{ textAlign: 'center', marginBottom: '2rem', color: '#fff' }}>Rep Wise Salon Status</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={repChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="#fff" tick={{ fill: '#fff' }} />
                                <YAxis stroke="#fff" tick={{ fill: '#fff' }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend wrapperStyle={{ color: '#fff' }} />
                                <Bar dataKey="visited" name="Visited Salons" fill="#4ade80" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="active" name="Active Salons" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="posm" name="POSM Active" fill="#c084fc" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button
                            onClick={async () => {
                                const el = document.getElementById('rep-stats-chart-container');
                                if (el) {
                                    try {
                                        const canvas = await html2canvas(el, { backgroundColor: '#1a1a2e' });
                                        canvas.toBlob((blob) => {
                                            saveAs(blob, 'rep_wise_salon_stats_chart.png');
                                        });
                                    } catch (e) {
                                        console.error("Error downloading chart", e);
                                        alert("Failed to download chart");
                                    }
                                }
                            }}
                            className="btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem', fontSize: '1rem' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Download Rep Chart
                        </button>
                    </div>
                </section>
            )}

            {activeTab === 'orders' && (
                <section className="glass-container">
                    <h2>Recent Orders</h2>
                    <div className="table-container">
                        <table className="styled-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Order ID</th>
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
                                            <td style={{ fontWeight: 'bold' }}>{order.merchantOrderId || order._id.slice(-6).toUpperCase()}</td>
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
                                                    <option style={{ color: 'black' }} value="Paid">Paid</option>
                                                    <option style={{ color: 'black' }} value="Processing">Processing</option>
                                                    <option style={{ color: 'black' }} value="Shipped">Shipped</option>
                                                    <option style={{ color: 'black' }} value="Completed">Completed</option>
                                                    <option style={{ color: 'black' }} value="Returned">Returned</option>
                                                    <option style={{ color: 'black' }} value="Cancelled">Cancelled</option>
                                                    <option style={{ color: 'black' }} value="Payment Failed">Payment Failed</option>
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <h2>{editingSalonId ? 'Edit Salon' : (formModeAdmin === 'assign' ? 'Assign to Pre-Registered QR' : 'Create New Salon')}</h2>
                                {!editingSalonId && (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => setFormModeAdmin('create')}
                                            className={`btn-primary ${formModeAdmin === 'create' ? '' : 'outline'}`}
                                            style={{ padding: '0.5rem 1rem' }}
                                        >
                                            <i className="lucide-plus"></i> Register New
                                        </button>
                                        <button
                                            onClick={() => setFormModeAdmin('assign')}
                                            className={`btn-primary ${formModeAdmin === 'assign' ? '' : 'outline'}`}
                                            style={{ padding: '0.5rem 1rem' }}
                                        >
                                            <i className="lucide-hash"></i> Assign Setup
                                        </button>
                                        <button
                                            onClick={() => setFormModeAdmin('draft')}
                                            className={`btn-primary ${formModeAdmin === 'draft' ? '' : 'outline'}`}
                                            style={{ padding: '0.5rem 1rem', border: '1px solid #eab308', color: formModeAdmin === 'draft' ? '#fff' : '#eab308', background: formModeAdmin === 'draft' ? '#eab308' : 'transparent' }}
                                        >
                                            <i className="lucide-edit-3"></i> Add Details Only
                                        </button>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={editingSalonId ? handleUpdateSalon : handleCreateSalon}>
                                {!editingSalonId && formModeAdmin === 'assign' && (
                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(56,189,248,0.5)' }}>
                                        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', background: 'none', WebkitTextFillColor: 'initial' }}>
                                            Enter Pre-Registered QR Code
                                        </h3>
                                        <p style={{ fontSize: '0.85rem', color: '#bae6fd', marginBottom: '1rem', opacity: 0.8 }}>
                                            Enter the 6-character Salon Code from a pre-registered QR to assign these details to it.
                                        </p>
                                        <input
                                            type="text"
                                            placeholder="e.g. AB1234"
                                            value={newSalon.assignToCode}
                                            onChange={(e) => setNewSalon({ ...newSalon, assignToCode: e.target.value.toUpperCase() })}
                                            required={formModeAdmin === 'assign'}
                                            style={{ margin: 0, fontSize: '1rem', letterSpacing: '1px', maxWidth: '200px', fontWeight: 'bold' }}
                                        />
                                    </div>
                                )}

                                {/* Group 0B: Assign Draft to Code (Only visible in Edit Mode of a Draft) */}
                                {editingSalonId && newSalon.isDraft && (
                                    <div style={{ background: 'rgba(56,189,248,0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(56,189,248,0.5)' }}>
                                        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', background: 'none', WebkitTextFillColor: 'initial' }}>
                                            Assign to Pre-Registered QR Code (Optional)
                                        </h3>
                                        <p style={{ fontSize: '0.85rem', color: '#bae6fd', marginBottom: '1rem', opacity: 0.8 }}>
                                            You can turn this Draft into a real Salon Record by entering a pre-registered 6-character Salon Code.
                                        </p>
                                        <input
                                            type="text"
                                            placeholder="e.g. AB1234"
                                            value={newSalon.assignToCode}
                                            onChange={(e) => setNewSalon({ ...newSalon, assignToCode: e.target.value.toUpperCase() })}
                                            style={{ margin: 0, fontSize: '1rem', letterSpacing: '1px', maxWidth: '200px', fontWeight: 'bold' }}
                                        />
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <input type="text" placeholder="Salon Name *" value={newSalon.name} onChange={(e) => setNewSalon({ ...newSalon, name: e.target.value })} required />
                                    <input type="text" placeholder="Location" value={newSalon.location} onChange={(e) => setNewSalon({ ...newSalon, location: e.target.value })} />
                                    <input type="text" placeholder="Contact Number 1" value={newSalon.contactNumber1} onChange={(e) => setNewSalon({ ...newSalon, contactNumber1: e.target.value })} />
                                    <input type="text" placeholder="Contact Number 2" value={newSalon.contactNumber2} onChange={(e) => setNewSalon({ ...newSalon, contactNumber2: e.target.value })} />
                                    <select
                                        value={newSalon.repName}
                                        onChange={(e) => setNewSalon({ ...newSalon, repName: e.target.value })}
                                        style={{
                                            padding: '0.8rem',
                                            borderRadius: '8px',
                                            border: '1px solid #ccc',
                                            width: '100%',
                                            fontFamily: 'inherit',
                                            fontSize: '1rem'
                                        }}
                                    >
                                        <option value="">Select Rep Name</option>
                                        {reps.map(rep => (
                                            <option key={rep._id} value={rep.name}>{rep.name}</option>
                                        ))}
                                    </select>
                                    <input type="text" placeholder="Remark" value={newSalon.remark} onChange={(e) => setNewSalon({ ...newSalon, remark: e.target.value })} />
                                </div>
                                <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Account Details</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <input type="text" placeholder="Bank Name" value={newSalon.accountDetails.bankName} onChange={(e) => setNewSalon({ ...newSalon, accountDetails: { ...newSalon.accountDetails, bankName: e.target.value } })} />
                                    <input type="text" placeholder="Branch" value={newSalon.accountDetails.branch} onChange={(e) => setNewSalon({ ...newSalon, accountDetails: { ...newSalon.accountDetails, branch: e.target.value } })} />
                                    <input type="text" placeholder="Account Number" value={newSalon.accountDetails.accountNumber} onChange={(e) => setNewSalon({ ...newSalon, accountDetails: { ...newSalon.accountDetails, accountNumber: e.target.value } })} />
                                    <input type="text" placeholder="Account Name" value={newSalon.accountDetails.accountName} onChange={(e) => setNewSalon({ ...newSalon, accountDetails: { ...newSalon.accountDetails, accountName: e.target.value } })} />
                                </div>
                                <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Status & Marks</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'white' }}>
                                            <input type="checkbox" checked={newSalon.isVisited} onChange={(e) => setNewSalon({ ...newSalon, isVisited: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                                            Visited Salon
                                        </label>
                                        {newSalon.isVisited && (
                                            <input
                                                type="date"
                                                value={newSalon.visitedDate}
                                                onChange={(e) => setNewSalon({ ...newSalon, visitedDate: e.target.value })}
                                                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                                            />
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'white' }}>
                                            <input type="checkbox" checked={newSalon.isActive} onChange={(e) => setNewSalon({ ...newSalon, isActive: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                                            Active Salon
                                        </label>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'white' }}>
                                            <input type="checkbox" checked={newSalon.posmActive} onChange={(e) => setNewSalon({ ...newSalon, posmActive: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                                            POSM Active Salon
                                        </label>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                    <label style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold' }}>Revisited Dates (Mark old visits here)</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {(newSalon.revisitedDates || []).map((d, index) => (
                                            <div key={index} style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', color: '#bae6fd', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {new Date(d).toLocaleDateString()}
                                                <button type="button" onClick={() => {
                                                    const newArr = [...newSalon.revisitedDates];
                                                    newArr.splice(index, 1);
                                                    setNewSalon({ ...newSalon, revisitedDates: newArr });
                                                }} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.1rem', lineHeight: 1, cursor: 'pointer', padding: 0 }}>&times;</button>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <input type="date" id={`revisit-date-${editingSalonId || 'new'}`} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                                        <button type="button" onClick={() => {
                                            const dateVal = document.getElementById(`revisit-date-${editingSalonId || 'new'}`).value;
                                            if (dateVal) {
                                                setNewSalon({ ...newSalon, revisitedDates: [...(newSalon.revisitedDates || []), dateVal] });
                                                document.getElementById(`revisit-date-${editingSalonId || 'new'}`).value = '';
                                            }
                                        }} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Add Date</button>
                                    </div>
                                </div>
                                <button type="submit" className="btn-primary" style={{ width: '100%', marginBottom: editingSalonId ? '0.5rem' : '0' }}>
                                    {editingSalonId ? 'Update Salon' : (formModeAdmin === 'assign' ? 'Assign to QR Code' : (formModeAdmin === 'draft' ? 'Save Details Only' : 'Generate Registration & QR'))}
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
                                        <div style={{ marginTop: '1rem', fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>
                                            CODE: <span style={{ color: 'var(--secondary-color)' }}>{createdSalon?.salonCode}</span>
                                        </div>
                                        <br />
                                        <button
                                            onClick={() => handleDownloadQR(createdSalon)}
                                            className="btn-primary"
                                            style={{ display: 'inline-block', marginTop: '1rem', cursor: 'pointer' }}
                                        >
                                            Download QR with Code
                                        </button>
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
                            <h2>Bulk Registration</h2>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <input
                                        type="number"
                                        placeholder="Number of Salons"
                                        value={bulkCount}
                                        onChange={(e) => setBulkCount(e.target.value)}
                                        min="1"
                                        max="50"
                                        style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', width: '150px' }}
                                    />
                                    <button
                                        onClick={handleBulkCreate}
                                        className="btn-primary"
                                        disabled={!bulkCount || bulkCount <= 0}
                                        style={{ whiteSpace: 'nowrap' }}
                                    >
                                        Register {bulkCount || 0} Salons
                                    </button>
                                </div>

                                <div style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                                    OR
                                </div>

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
                                        {newBulkSalons.some(s => s.salonCode) && (
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <button
                                                    onClick={() => handleBatchPrint(newBulkSalons)}
                                                    className="btn-primary"
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                                                >
                                                    Print All New
                                                </button>
                                                <button
                                                    onClick={() => handleBatchDownloadZip(newBulkSalons)}
                                                    className="btn-primary"
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                                                >
                                                    Download All ZIP
                                                </button>
                                                <button
                                                    onClick={() => setNewBulkSalons([])}
                                                    className="btn-primary outline"
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                                                >
                                                    Clear List
                                                </button>
                                            </div>
                                        )}
                                        {!newBulkSalons.some(s => s.salonCode) && (
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <button
                                                    onClick={() => setNewBulkSalons([])}
                                                    className="btn-primary outline"
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                                                >
                                                    Clear List
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                        <table className="styled-table" style={{ fontSize: '0.9rem' }}>
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Code</th>
                                                    <th>Username</th>
                                                    <th>Password</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {newBulkSalons.map(salon => (
                                                    <tr key={salon._id}>
                                                        <td>{salon.name}</td>
                                                        <td style={{ fontWeight: 'bold', color: 'var(--secondary-color)' }}>{salon.salonCode || 'N/A'}</td>
                                                        <td>{salon.username}</td>
                                                        <td style={{ fontFamily: 'monospace' }}>{salon.plainPassword}</td>
                                                        <td>
                                                            {salon.salonCode ? (
                                                                <button
                                                                    onClick={() => handleDownloadQR(salon)}
                                                                    className="btn-primary"
                                                                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                                                                >
                                                                    QR
                                                                </button>
                                                            ) : (
                                                                <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>No QR</span>
                                                            )}
                                                        </td>
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

                        <section className="glass-container">
                            {/* Filter salons based on search term and selectedSalonId */}
                            {/* This logic was previously inside an IIFE, now moved out for direct use */}
                            {(() => {
                                const filteredSalons = salons.filter(salon => {
                                    if (selectedSalonId && salon._id !== selectedSalonId) return false;
                                    if (!searchTerm) return true;
                                    const term = searchTerm.toLowerCase();
                                    return (
                                        salon.name.toLowerCase().includes(term) ||
                                        (salon.location && salon.location.toLowerCase().includes(term)) ||
                                        (salon.username && salon.username.toLowerCase().includes(term)) ||
                                        (salon.salonCode && salon.salonCode.toLowerCase().includes(term))
                                    );
                                });

                                return (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <h2 style={{ margin: 0 }}>Registered Salons ({filteredSalons.length})</h2>
                                                <button
                                                    onClick={() => handleSelectAll(filteredSalons)}
                                                    className="btn-primary outline"
                                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                                                >
                                                    {selectedSalons.length === filteredSalons.length && filteredSalons.length > 0 ? 'Deselect All' : 'Select All'}
                                                </button>
                                            </div>

                                            {selectedSalons.length > 0 && (
                                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                                                    <span style={{ fontSize: '0.9rem' }}>{selectedSalons.length} Selected</span>
                                                    <button
                                                        onClick={() => handleBatchPrint(salons.filter(s => selectedSalons.includes(s._id)))}
                                                        className="btn-primary"
                                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                                                    >
                                                        Print Selected
                                                    </button>
                                                    <button
                                                        onClick={() => handleBatchDownloadZip(salons.filter(s => selectedSalons.includes(s._id)))}
                                                        className="btn-primary"
                                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                                                    >
                                                        Download ZIP
                                                    </button>
                                                    <button
                                                        onClick={() => handleBatchDelete(salons.filter(s => selectedSalons.includes(s._id)))}
                                                        className="btn-primary danger"
                                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                                                    >
                                                        Delete Selected
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedSalons([])}
                                                        className="btn-primary outline"
                                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                                                    >
                                                        Clear Selection
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="salon-grid">
                                            {filteredSalons.map(salon => (

                                                <div key={salon._id} className={`salon-card ${selectedSalons.includes(salon._id) ? 'selected' : ''}`} style={{ position: 'relative', border: selectedSalons.includes(salon._id) ? '2px solid var(--secondary-color)' : 'none' }}>
                                                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedSalons.includes(salon._id)}
                                                            onChange={() => handleSelectSalon(salon._id)}
                                                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <div>
                                                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                                {salon.name}
                                                                {salon.isVisited && <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '12px', background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>Visited</span>}
                                                                {salon.isActive && <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '12px', background: 'rgba(56,189,248,0.2)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }}>Active</span>}
                                                                {salon.posmActive && <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.4rem', borderRadius: '12px', background: 'rgba(192,132,252,0.2)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.3)', whiteSpace: 'nowrap' }}>POSM</span>}
                                                                {!salon.salonCode && <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.4rem', borderRadius: '12px', background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', whiteSpace: 'nowrap' }}>DRAFT</span>}
                                                            </h3>
                                                            <div className="salon-meta" style={{ marginTop: '0.25rem' }}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                                                {salon.location || 'No Location'}
                                                            </div>
                                                            <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', opacity: 0.6 }}>
                                                                Created: {salon.createdAt ? new Date(salon.createdAt).toLocaleDateString() : 'N/A'}
                                                            </div>
                                                            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--secondary-color)', fontWeight: 'bold' }}>
                                                                Code: {salon.salonCode || 'N/A'}
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

                                                    {expandedSalonId === salon._id && (
                                                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
                                                            <p style={{ margin: '0.2rem 0' }}><strong>Contact 1:</strong> {salon.contactNumber1 || salon.contactNumber || 'N/A'}</p>
                                                            <p style={{ margin: '0.2rem 0' }}><strong>Contact 2:</strong> {salon.contactNumber2 || 'N/A'}</p>
                                                            <p style={{ margin: '0.2rem 0' }}><strong>Rep Name:</strong> {salon.repName || 'N/A'}</p>
                                                            <p style={{ margin: '0.2rem 0' }}><strong>Remark:</strong> {salon.remark || 'N/A'}</p>
                                                            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Bank:</strong> {salon.accountDetails?.bankName || 'N/A'}</p>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Branch:</strong> {salon.accountDetails?.branch || 'N/A'}</p>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Account No:</strong> {salon.accountDetails?.accountNumber || 'N/A'}</p>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Account Name:</strong> {salon.accountDetails?.accountName || 'N/A'}</p>
                                                            </div>
                                                            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Visited Salon:</strong> <span style={{ color: salon.isVisited ? '#4ade80' : '#ef4444' }}>{salon.isVisited ? 'Yes' : 'No'}</span></p>
                                                                {salon.isVisited && salon.visitedDate && (
                                                                    <p style={{ margin: '0.2rem 0' }}><strong>Visited Date:</strong> {new Date(salon.visitedDate).toLocaleDateString()}</p>
                                                                )}
                                                                {salon.revisitedDates && salon.revisitedDates.length > 0 && (
                                                                    <p style={{ margin: '0.2rem 0' }}><strong>Revisited Dates:</strong> {salon.revisitedDates.map(d => new Date(d).toLocaleDateString()).join(', ')}</p>
                                                                )}
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Active Salon:</strong> <span style={{ color: salon.isActive ? '#4ade80' : '#ef4444' }}>{salon.isActive ? 'Yes' : 'No'}</span></p>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>POSM Active Salon:</strong> <span style={{ color: salon.posmActive ? '#4ade80' : '#ef4444' }}>{salon.posmActive ? 'Yes' : 'No'}</span></p>
                                                            </div>
                                                            <p style={{ margin: '0.2rem 0', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                                <strong>Last Edited By:</strong> {salon.editedBy || 'N/A'}
                                                            </p>
                                                        </div>
                                                    )}

                                                    <div className="card-actions">
                                                        <button
                                                            onClick={() => setExpandedSalonId(expandedSalonId === salon._id ? null : salon._id)}
                                                            className="icon-btn info"
                                                            title="Toggle Details"
                                                            style={{ border: '1px solid rgba(255,255,255,0.2)' }}
                                                        >
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownloadQR(salon)}
                                                            className="icon-btn success"
                                                            title="Download QR"
                                                        >
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                                                        </button>
                                                        <a
                                                            href={`/order/${salon.uniqueId}`}
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
                                    </>
                                );
                            })()}
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

            {activeTab === 'accounts' && (
                <section className="glass-container">
                    <h2>Account Management</h2>
                    <div style={{ marginBottom: '2rem', background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>{editingAccountId ? 'Edit Account' : 'Create Salesman Account'}</h3>
                            {editingAccountId && (
                                <button onClick={() => {
                                    setEditingAccountId(null);
                                    setNewAccount({ username: '', password: '' });
                                }} className="btn-primary outline" style={{ padding: '0.4rem 1rem' }}>Cancel Edit</button>
                            )}
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                if (editingAccountId) {
                                    // Prepare payload: only send password if it's not empty
                                    const payload = { username: newAccount.username };
                                    if (newAccount.password) {
                                        payload.password = newAccount.password;
                                    }
                                    const res = await axios.put(`${API_URL}/auth/accounts/${editingAccountId}`, payload);
                                    if (res.data.success) {
                                        alert('Account Updated Successfully');
                                        setNewAccount({ username: '', password: '' });
                                        setEditingAccountId(null);
                                        fetchAccounts();
                                    }
                                } else {
                                    const res = await axios.post(`${API_URL}/auth/salesman`, newAccount);
                                    if (res.data.success) {
                                        alert('Salesman Account Created Successfully');
                                        setNewAccount({ username: '', password: '' });
                                        fetchAccounts();
                                    }
                                }
                            } catch (err) {
                                alert(err.response?.data?.error || 'Error saving account');
                            }
                        }}>
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                <input
                                    type="text"
                                    placeholder="Username"
                                    value={newAccount.username}
                                    onChange={(e) => setNewAccount({ ...newAccount, username: e.target.value })}
                                    required
                                    style={{ flex: 1 }}
                                />
                                <input
                                    type="text"
                                    placeholder={editingAccountId ? "New Password (leave blank to keep current)" : "Password"}
                                    value={newAccount.password}
                                    onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                                    required={!editingAccountId}
                                    style={{ flex: 1 }}
                                />
                            </div>
                            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                                {editingAccountId ? 'Update Account' : 'Create Account'}
                            </button>
                        </form>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '1rem' }}>
                        <h3>Current Accounts</h3>
                        <div className="table-container" style={{ marginTop: '1rem' }}>
                            <table className="styled-table">
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Role</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.map(acc => (
                                        <tr key={acc._id}>
                                            <td style={{ fontWeight: 'bold' }}>{acc.username}</td>
                                            <td>
                                                <span className={`status-badge ${acc.role === 'admin' ? 'completed' : 'processing'}`} style={{ textTransform: 'capitalize' }}>
                                                    {acc.role}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={() => {
                                                            setEditingAccountId(acc._id);
                                                            setNewAccount({ username: acc.username, password: '' });
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }}
                                                        className="icon-btn primary"
                                                        title="Edit Account"
                                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                                                    >
                                                        Edit
                                                    </button>
                                                    {acc.role !== 'admin' && (
                                                        <button
                                                            onClick={async () => {
                                                                if (window.confirm('Are you sure you want to delete this account?')) {
                                                                    try {
                                                                        const res = await axios.delete(`${API_URL}/auth/accounts/${acc._id}`);
                                                                        if (res.data.success) {
                                                                            fetchAccounts();
                                                                        }
                                                                    } catch (err) {
                                                                        alert('Error deleting account');
                                                                    }
                                                                }
                                                            }}
                                                            className="icon-btn danger"
                                                            title="Delete Account"
                                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {accounts.length === 0 && (
                                        <tr>
                                            <td colSpan="3" style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>No accounts found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '1rem', marginTop: '2rem' }}>
                        <h3>Reps Dropdown List Management</h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                const res = await axios.post(`${API_URL}/reps`, { name: newRepName });
                                if (res.data.success) {
                                    alert('Rep Created');
                                    setNewRepName('');
                                    fetchReps();
                                }
                            } catch (err) {
                                alert(err.response?.data?.error || 'Error creating rep');
                            }
                        }} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <input type="text" placeholder="Rep Name" value={newRepName} onChange={(e) => setNewRepName(e.target.value)} required style={{ flex: 1 }} />
                            <button type="submit" className="btn-primary">Add Rep</button>
                        </form>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                            {reps.map(rep => (
                                <div key={rep._id} style={{ background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>{rep.name}</span>
                                    <button onClick={async () => {
                                        if (window.confirm('Delete this rep?')) {
                                            await axios.delete(`${API_URL}/reps/${rep._id}`);
                                            fetchReps();
                                        }
                                    }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0', fontSize: '1rem', fontWeight: 'bold' }} title="Delete Rep">✕</button>
                                </div>
                            ))}
                            {reps.length === 0 && <span style={{ opacity: 0.5 }}>No Reps Found</span>}
                        </div>
                    </div>
                </section>
            )}

            {activeTab === 'reports' && (
                <section className="glass-container">
                    <h2>Reports & Export</h2>
                    <p style={{ opacity: 0.8, marginBottom: '2rem' }}>Download summary reports for data analysis and backup.</p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Salon List Report</h3>
                            <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem', flex: 1 }}>Export a complete list of all registered salons including their contact, account details, and activity-marks.</p>
                            <button onClick={handleExportSalons} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Download Salons CSV
                            </button>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Orders Report</h3>
                            <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem', flex: 1 }}>Export all recorded orders with their current statuses, customer info, and purchased items.</p>
                            <button onClick={handleExportOrders} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Download Orders CSV
                            </button>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Performance Report</h3>
                            <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem', flex: 1 }}>Export a summarized performance table showing the count of orders, returns, and total revenue per salon.</p>
                            <button onClick={handleExportPerformance} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Download Performance CSV
                            </button>
                        </div>
                    </div>
                </section>
            )}

        </div >
    );
};

export default AdminDashboard;
