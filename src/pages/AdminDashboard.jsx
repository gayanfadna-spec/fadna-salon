import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, AreaChart, Area
} from 'recharts';
import ThemeToggle from '../components/ThemeToggle';

const API_URL = import.meta.env.VITE_API_URL || 'https://salonfadna-backend.onrender.com/api';

const AdminDashboard = () => {
    const [salons, setSalons] = useState([]);
    const [orders, setOrders] = useState([]);
    const [newSalon, setNewSalon] = useState({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', username: '', password: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '', isDraft: false });
    const [qrCode, setQrCode] = useState(null);
    const [newCredentials, setNewCredentials] = useState(null);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'orders', 'salons', 'monitor'
    const [formModeAdmin, setFormModeAdmin] = useState('create'); // 'create' or 'assign'
    const navigate = useNavigate();
    const adminRole = localStorage.getItem('adminRole');

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
    const [newProduct, setNewProduct] = useState({ name: '', price: '', discountType: 'none', discountValue: 0, target: 'both', commission: 0 });
    const [editingProductId, setEditingProductId] = useState(null);
    const [selectedSalonId, setSelectedSalonId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [newAccount, setNewAccount] = useState({ username: '', password: '', role: 'salesman' });
    const [accounts, setAccounts] = useState([]);
    const [editingAccountId, setEditingAccountId] = useState(null);
    const [reps, setReps] = useState([]);
    const [newRepName, setNewRepName] = useState('');
    const [selectedExcelFile, setSelectedExcelFile] = useState(null);
    const [reportStartDate, setReportStartDate] = useState('');
    const [reportEndDate, setReportEndDate] = useState('');
    const [reportHistory, setReportHistory] = useState([]);
    const [selectedRep, setSelectedRep] = useState('');
    const [filterDetailedVisited, setFilterDetailedVisited] = useState(false);
    const [filterDetailedActive, setFilterDetailedActive] = useState(false);
    const [filterDetailedPOSM, setFilterDetailedPOSM] = useState(false);
    const [visibleCount, setVisibleCount] = useState(50);
    const [repActivityData, setRepActivityData] = useState([]);
    const [totalRepActivityData, setTotalRepActivityData] = useState([]);
    const [orderSummaryData, setOrderSummaryData] = useState([]);
    const [loadingOrderSummary, setLoadingOrderSummary] = useState(false);

    const [detailedFilterRep, setDetailedFilterRep] = useState('');
    const [detailedFilterStartDate, setDetailedFilterStartDate] = useState('');
    const [detailedFilterEndDate, setDetailedFilterEndDate] = useState('');

    const filteredSalons = React.useMemo(() => {
        return salons.filter(salon => {
            const rep = (salon.repName && salon.repName.trim() !== '') ? salon.repName : 'Unassigned';
            if (selectedRep && rep !== selectedRep) return false;
            if (selectedSalonId && salon._id !== selectedSalonId) return false;

            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return (
                (salon.name || '').toLowerCase().includes(term) ||
                (salon.location || '').toLowerCase().includes(term) ||
                (salon.username || '').toLowerCase().includes(term) ||
                (salon.salonCode || '').toLowerCase().includes(term) ||
                (salon.repName || '').toLowerCase().includes(term)
            );
        });
    }, [salons, selectedRep, searchTerm, selectedSalonId]);

    const detailedFilteredSalons = React.useMemo(() => {
        const filterRep = detailedFilterRep || selectedRep;
        // If no rep is selected and no dates are provided, we could show all or nothing.
        // But usually, detailed list is for a specific rep.
        
        return salons.filter(s => {
            const rep = (s.repName && s.repName.trim() !== '') ? s.repName : 'Unassigned';
            
            // 1. Rep Filter
            if (filterRep && rep !== filterRep) return false;

            // 2. Status Filters
            if (filterDetailedVisited && !s.isVisited) return false;
            if (filterDetailedActive && !s.isActive) return false;
            if (filterDetailedPOSM && !s.posmActive) return false;

            // 3. Date Range Filter (Activity Based)
            if (detailedFilterStartDate || detailedFilterEndDate) {
                const start = detailedFilterStartDate ? new Date(detailedFilterStartDate) : null;
                const end = detailedFilterEndDate ? new Date(detailedFilterEndDate) : null;
                if (end) end.setHours(23, 59, 59, 999);

                const checkDateInRange = (date) => {
                    if (!date) return false;
                    const d = new Date(date);
                    if (start && d < start) return false;
                    if (end && d > end) return false;
                    return true;
                };

                const hasVisitedInRange = checkDateInRange(s.visitedDate);
                const hasActiveInRange = checkDateInRange(s.activeDate);
                const hasPOSMInRange = checkDateInRange(s.posmDate);
                const hasRevisitInRange = (s.revisitedDates || []).some(d => checkDateInRange(d));

                if (!(hasVisitedInRange || hasActiveInRange || hasPOSMInRange || hasRevisitInRange)) return false;
            }

            // 4. Search Filter
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return (
                    (s.name || '').toLowerCase().includes(term) ||
                    (s.location || '').toLowerCase().includes(term) ||
                    (s.salonCode || '').toLowerCase().includes(term)
                );
            }
            return true;
        });
    }, [salons, selectedRep, detailedFilterRep, searchTerm, filterDetailedVisited, filterDetailedActive, filterDetailedPOSM, detailedFilterStartDate, detailedFilterEndDate]);

    const detailedFilteredSalonsCount = detailedFilteredSalons.length;

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
            if (reportStartDate) params.startDate = reportStartDate;
            if (reportEndDate) params.endDate = reportEndDate;

            const salonRes = await axios.get(`${API_URL}/analytics/salon-performance`, { params });
            if (salonRes.data.success) setSalonPerformance(salonRes.data.stats);

            const itemRes = await axios.get(`${API_URL}/analytics/item-performance`, { params });
            if (itemRes.data.success) setItemPerformance(itemRes.data.stats);

            // Fetch Rep Activity (Periodic/Filtered)
            const repRes = await axios.get(`${API_URL}/analytics/rep-activity`, { params });
            if (repRes.data.success) setRepActivityData(repRes.data.stats || []);

            // Fetch Total Rep Activity (No date filter)
            const totalRepRes = await axios.get(`${API_URL}/analytics/rep-activity`);
            if (totalRepRes.data.success) setTotalRepActivityData(totalRepRes.data.stats || []);

        } catch (err) {
            console.error(err);
        }
    }, [selectedSalonId, reportStartDate, reportEndDate]);

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

    useEffect(() => {
        setVisibleCount(50);
    }, [selectedRep, searchTerm, selectedSalonId]);

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

    const fetchReportHistory = React.useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/reports/history`);
            if (res.data.success) setReportHistory(res.data.history);
        } catch (err) {
            console.error('Error fetching report history:', err);
        }
    }, []);

    const fetchOrderSummary = React.useCallback(async () => {
        setLoadingOrderSummary(true);
        try {
            const res = await axios.get(`${API_URL}/analytics/rep-order-summary`, {
                params: {
                    startDate: reportStartDate,
                    endDate: reportEndDate
                }
            });
            if (res.data.success) {
                setOrderSummaryData(res.data.stats);
            }
        } catch (error) {
            console.error('Error fetching order summary:', error);
        } finally {
            setLoadingOrderSummary(false);
        }
    }, [reportStartDate, reportEndDate]);

    useEffect(() => {
        if (activeTab === 'order-analytics') {
            fetchOrderSummary();
        }
    }, [activeTab, fetchOrderSummary]);

    const handleExportOrderSummaryExcel = () => {
        if (!orderSummaryData.length) return alert('No data to export');
        
        const exportData = [];
        orderSummaryData.forEach(item => {
            item.products.forEach(p => {
                exportData.push({
                    'Month': item.monthName,
                    'Representative': item._id.repName,
                    'Product': p.name,
                    'Quantity Sold': p.quantity,
                    'Total Rep Items': item.totalItems,
                    'Total Rep Orders': item.uniqueOrders
                });
            });
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "QR Order Summary");
        XLSX.writeFile(wb, `QR_Order_Summary_${new Date().toLocaleDateString()}.xlsx`);
    };

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
        } catch (err) {
            console.error('Error logging report history:', err);
        }
    };

    useEffect(() => {
        if (activeTab === 'accounts') {
            fetchAccounts();
        }
    }, [activeTab, fetchAccounts]);

    useEffect(() => {
        fetchReps();
        fetchReportHistory();
    }, [fetchReps, fetchReportHistory]);

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
            setNewProduct({ name: '', price: '', discountType: 'none', discountValue: 0, target: 'both', commission: 0 });
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
            discountValue: product.discountValue,
            target: product.target || 'both',
            commission: product.commission || 0
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
                const editedByValue = ['admin', 'superadmin'].includes(role) ? 'admin' : (username || 'admin');
                const payload = { ...newSalon, editedBy: editedByValue };

                const res = await axios.put(`${API_URL}/salons/assign`, payload);
                if (res.data.success) {
                    alert(`Successfully assigned details to Salon Code: ${newSalon.assignToCode}`);
                    setNewSalon({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', username: '', password: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], nextVisitedDate: '', isActive: false, posmActive: false, assignToCode: '' });
                    fetchSalons();
                }
            } else {
                const res = await axios.post(`${API_URL}/salons`, { ...newSalon, isDraft: formModeAdmin === 'draft' });
                if (res.data.success) {
                    if (formModeAdmin === 'draft') {
                        alert('Draft salon created successfully!');
                        setNewSalon({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', username: '', password: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '', isDraft: false });
                        fetchSalons();
                    } else {
                        setQrCode(res.data.qrCode);
                        setNewSalon({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', username: '', password: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '', isDraft: false });
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
            username: salon.username || '',
            password: salon.plainPassword || '',
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
            const editedByValue = ['admin', 'superadmin'].includes(role) ? 'admin' : username;
            const payload = { ...newSalon, editedBy: editedByValue };

            let res;
            if (newSalon.isDraft && newSalon.assignToCode && newSalon.assignToCode.trim() !== '') {
                res = await axios.put(`${API_URL}/salons/${editingSalonId}/merge`, payload);
            } else {
                res = await axios.put(`${API_URL}/salons/${editingSalonId}`, payload);
            }

            if (res.data.success) {
                setNewSalon({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', username: '', password: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '', isDraft: false });
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
        setNewSalon({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', username: '', password: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '', isDraft: false });
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

    const handleToggleMark = async (salon) => {
        try {
            const updatedMark = !salon.oneSalonMark;
            const res = await axios.put(`${API_URL}/salons/${salon._id}/toggle-mark`, { oneSalonMark: updatedMark });
            if (res.data.success) {
                setSalons(prev => prev.map(s => s._id === salon._id ? { ...s, oneSalonMark: updatedMark } : s));
            }
        } catch (err) {
            console.error('Error updating mark status', err);
            alert('Failed to update mark status');
        }
    };

    const handleToggleStatus = async (salon, field) => {
        try {
            const newValue = !salon[field];
            const payload = { ...salon, [field]: newValue };
            // backend/routes/salonRoutes.js PUT /:id handles the logic for dates and revisits
            const res = await axios.put(`${API_URL}/salons/${salon._id}`, payload);
            if (res.data.success) {
                fetchSalons(); // Refresh to get updated dates/revisited array from backend
                fetchAnalytics(); // Refresh summary tables
            }
        } catch (err) {
            console.error(`Error toggling ${field}`, err);
            alert(`Failed to update ${field}`);
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

        // Add space for text (Code + Name)
        const textSpace = vh * 0.25;
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

        // Add Salon Name
        const nameText = doc.createElementNS("http://www.w3.org/2000/svg", "text");
        nameText.setAttribute("x", vw / 2);
        nameText.setAttribute("y", vh + (textSpace / 2.5));
        nameText.setAttribute("text-anchor", "middle");
        nameText.setAttribute("font-family", "Arial, sans-serif");
        nameText.setAttribute("font-size", `${vw * 0.055}`);
        nameText.setAttribute("font-weight", "bold");
        nameText.setAttribute("fill", "#000000");
        nameText.textContent = salon.name;
        svg.appendChild(nameText);

        // Add Salon Code
        const codeText = doc.createElementNS("http://www.w3.org/2000/svg", "text");
        codeText.setAttribute("x", vw / 2);
        codeText.setAttribute("y", vh + (textSpace / 1.3));
        codeText.setAttribute("text-anchor", "middle");
        codeText.setAttribute("font-family", "Arial, sans-serif");
        codeText.setAttribute("font-size", `${vw * 0.045}`);
        codeText.setAttribute("font-weight", "normal");
        codeText.setAttribute("fill", "#444444");
        codeText.textContent = `Code: ${salon.salonCode || 'N/A'}`;
        svg.appendChild(codeText);

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

    const handleDownloadJPG = async (salon) => {
        try {
            const svgString = await generateQRSVG(salon);
            const fileName = `${salon.name.replace(/\s+/g, '_')}-qr.jpg`;

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

    const handleBatchExcelExport = (salonsToExport) => {
        if (!salonsToExport || salonsToExport.length === 0) return;

        const baseUrl = 'https://www.portal.fadnals.lk';
        const data = salonsToExport.map(salon => ({
            'Salon Name': salon.name,
            'Salon Code': salon.salonCode || 'N/A',
            'Order Link': `${baseUrl}/order/${salon.uniqueId || salon._id}`
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Selected Salons");

        // Set column widths
        const wscols = [
            { wch: 30 }, // Salon Name
            { wch: 15 }, // Salon Code
            { wch: 60 }  // Order Link
        ];
        worksheet['!cols'] = wscols;

        XLSX.writeFile(workbook, "selected_salons_links.xlsx");
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

    // Duplicate declaration removed and moved to top useMemo for performance

    const handleExportSalons = () => {
        let itemsToExport = salons;
        if (reportStartDate) itemsToExport = itemsToExport.filter(s => new Date(s.createdAt) >= new Date(reportStartDate));
        if (reportEndDate) {
            const end = new Date(reportEndDate + 'T23:59:59.999Z');
            itemsToExport = itemsToExport.filter(s => new Date(s.createdAt) <= end);
        }
        if (!itemsToExport.length) return alert('No salons to export for this date range');
        const headers = ['Salon ID', 'Name', 'Location', 'Code', 'Username', 'Password', 'Bank Name', 'Branch', 'Account Number', 'Account Name', 'Contact 1', 'Contact 2', 'Rep Name', 'Remark', 'Registered Date', 'Visited', 'Visited Date', 'Revisited Dates', 'Active', 'POSM Active'];
        const rows = itemsToExport.map(s => {
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
        logReportHistory('Salons List', itemsToExport.length);
    };

    const handleExportOrders = async () => {
        let filteredOrders = adminRole === 'admin' ? orders.filter(o => o.status === 'Processing' || o.status === 'Paid') : orders;
        if (reportStartDate) filteredOrders = filteredOrders.filter(o => new Date(o.createdAt) >= new Date(reportStartDate));
        if (reportEndDate) {
            const end = new Date(reportEndDate + 'T23:59:59.999Z');
            filteredOrders = filteredOrders.filter(o => new Date(o.createdAt) <= end);
        }
        if (!filteredOrders.length) return alert('No orders to export');
        const headers = ['Order ID', 'Merchant Order ID', 'Date', 'Salon', 'Customer Name', 'Customer Phone', 'Additional Phone', 'Address', 'City', 'Status', 'Total Amount', 'Items'];
        const rows = filteredOrders.map(o => [
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

        try {
            await axios.post(`${API_URL}/orders/mark-downloaded`, { orderIds: filteredOrders.map(o => o._id) });
            fetchOrders();
            logReportHistory('Orders Detail', filteredOrders.length);
        } catch (err) {
            console.error('Failed to mark downloaded status', err);
        }
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
        logReportHistory('Performance Summary', salonPerformance.length);
    };
    const handleExportCombinedExcel = () => {
        if (!repActivityData.length) return alert('No performance data to export');

        // Table 1: Salon Visit (Periodic)
        const periodicData = [
            { 'NAME': 'Date Range:', 'NEW VISITED': reportStartDate || 'All Time', 'RE.Visit': reportEndDate || '', 'ACTIVE': '', 'ACTIVE %': '', 'QR': '' },
            { 'NAME': '', 'NEW VISITED': '', 'RE.Visit': '', 'ACTIVE': '', 'ACTIVE %': '', 'QR': '' } // Empty spacer row
        ];

        repActivityData.forEach(rep => {
            const activePercent = calculatePeriodicActivePercentage(rep.active, rep.visited, rep.revisited);
            periodicData.push({
                'NAME': rep.repName,
                'NEW VISITED': rep.visited,
                'RE.Visit': rep.revisited,
                'ACTIVE': rep.active,
                'ACTIVE %': `${Math.round(activePercent)}%`,
                'QR': rep.posm
            });
        });

        // Calculate Periodic Totals
        const pTotalVisited = repActivityData.reduce((acc, curr) => acc + curr.visited, 0);
        const pTotalActive = repActivityData.reduce((acc, curr) => acc + curr.active, 0);
        const pTotalRevisited = repActivityData.reduce((acc, curr) => acc + curr.revisited, 0);
        const pTotalPOSM = repActivityData.reduce((acc, curr) => acc + curr.posm, 0);
        const pTotalActivePercent = calculatePeriodicActivePercentage(pTotalActive, pTotalVisited, pTotalRevisited);

        periodicData.push({
            'NAME': 'Total',
            'NEW VISITED': pTotalVisited,
            'RE.Visit': pTotalRevisited,
            'ACTIVE': pTotalActive,
            'ACTIVE %': `${Math.round(pTotalActivePercent)}%`,
            'QR': pTotalPOSM
        });

        // Table 2: Total Salon Visit (All Time)
        const totalData = totalRepActivityData.map(rep => {
            const activePercent = calculateTotalActivePercentage(rep.active, rep.visited);

            return {
                'NAME': rep.repName,
                'NEW VISITED': rep.visited,
                'RE.Visit': rep.revisited,
                'ACTIVE': rep.active,
                'ACTIVE %': `${Math.round(activePercent)}%`,
                'QR': rep.posm
            };
        });

        // Calculate Total Totals
        const tTotalVisited = totalRepActivityData.reduce((acc, curr) => acc + curr.visited, 0);
        const tTotalActive = totalRepActivityData.reduce((acc, curr) => acc + curr.active, 0);
        const tTotalRevisited = totalRepActivityData.reduce((acc, curr) => acc + curr.revisited, 0);
        const tTotalPOSM = totalRepActivityData.reduce((acc, curr) => acc + curr.posm, 0);
        const tTotalActivePercent = calculateTotalActivePercentage(tTotalActive, tTotalVisited);

        totalData.push({
            'NAME': 'Total',
            'NEW VISITED': tTotalVisited,
            'RE.Visit': tTotalRevisited,
            'ACTIVE': tTotalActive,
            'ACTIVE %': `${Math.round(tTotalActivePercent)}%`,
            'QR': tTotalPOSM
        });

        const workbook = XLSX.utils.book_new();

        // Sheet 1: Periodic
        const wsPeriodic = XLSX.utils.json_to_sheet([]);
        XLSX.utils.sheet_add_aoa(wsPeriodic, [["Salon Visit"]], { origin: "A1" });
        XLSX.utils.sheet_add_aoa(wsPeriodic, [[`${reportStartDate || 'Start'} To ${reportEndDate || 'End'}`]], { origin: "A3" });
        XLSX.utils.sheet_add_json(wsPeriodic, periodicData, { origin: "A5", skipHeader: false });
        XLSX.utils.book_append_sheet(workbook, wsPeriodic, "Periodic Activity");

        // Sheet 2: Total
        const wsTotal = XLSX.utils.json_to_sheet([]);
        XLSX.utils.sheet_add_aoa(wsTotal, [["Total Salon Visit"]], { origin: "A1" });
        XLSX.utils.sheet_add_json(wsTotal, totalData, { origin: "A3", skipHeader: false });
        XLSX.utils.book_append_sheet(workbook, wsTotal, "Total Activity");

        const fileName = `Performance_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        logReportHistory('Combined Performance Excel', repActivityData.length);
    };

    const activeSalonsCount = React.useMemo(() => {
        const start = reportStartDate ? new Date(reportStartDate) : null;
        const end = reportEndDate ? new Date(reportEndDate + 'T23:59:59.999Z') : null;

        return salons.filter(s => {
            const rep = (s.repName && s.repName.trim() !== '') ? s.repName : 'Unassigned';
            if (selectedRep && rep !== selectedRep) return false;
            if (!s.isActive) return false;
            
            if (start || end) {
                // Check if visited in range
                const hasVisitedInRange = s.visitedDate && new Date(s.visitedDate) >= start && (!end || new Date(s.visitedDate) <= end);
                // Check if any revisit in range
                const hasRevisitInRange = (s.revisitedDates || []).some(d => {
                    const date = new Date(d);
                    return date >= start && (!end || date <= end);
                });
                return hasVisitedInRange || hasRevisitInRange;
            }
            return true;
        }).length;
    }, [salons, selectedRep, reportStartDate, reportEndDate]);

    const posmSalonsCount = React.useMemo(() => {
        const start = reportStartDate ? new Date(reportStartDate) : null;
        const end = reportEndDate ? new Date(reportEndDate + 'T23:59:59.999Z') : null;

        return salons.filter(s => {
            const rep = (s.repName && s.repName.trim() !== '') ? s.repName : 'Unassigned';
            if (selectedRep && rep !== selectedRep) return false;
            if (!s.posmActive) return false;
            
            if (start || end) {
                const hasVisitedInRange = s.visitedDate && new Date(s.visitedDate) >= start && (!end || new Date(s.visitedDate) <= end);
                const hasRevisitInRange = (s.revisitedDates || []).some(d => {
                    const date = new Date(d);
                    return date >= start && (!end || date <= end);
                });
                return hasVisitedInRange || hasRevisitInRange;
            }
            return true;
        }).length;
    }, [salons, selectedRep, reportStartDate, reportEndDate]);

    const visitedSalonsFromDb = React.useMemo(() => {
        const start = reportStartDate ? new Date(reportStartDate) : null;
        const end = reportEndDate ? new Date(reportEndDate + 'T23:59:59.999Z') : null;

        return salons.filter(s => {
            const rep = (s.repName && s.repName.trim() !== '') ? s.repName : 'Unassigned';
            if (selectedRep && rep !== selectedRep) return false;
            if (!s.isVisited) return false;
            if (start || end) {
                if (!s.visitedDate) return false;
                const d = new Date(s.visitedDate);
                if (start && d < start) return false;
                if (end && d > end) return false;
            }
            return true;
        }).length;
    }, [salons, selectedRep, reportStartDate, reportEndDate]);

    const revisitedCount = React.useMemo(() => {
        const start = reportStartDate ? new Date(reportStartDate) : null;
        const end = reportEndDate ? new Date(reportEndDate + 'T23:59:59.999Z') : null;

        return salons.reduce((acc, s) => {
            const rep = (s.repName && s.repName.trim() !== '') ? s.repName : 'Unassigned';
            if (selectedRep && rep !== selectedRep) return acc;
            
            const eventsInRange = (s.revisitedDates || []).filter(d => {
                const date = new Date(d);
                if (start && date < start) return false;
                if (end && date > end) return false;
                return true;
            });
            return acc + eventsInRange.length;
        }, 0);
    }, [salons, selectedRep, reportStartDate, reportEndDate]);

    const activeRate = React.useMemo(() => {
        const totalVisits = (reportStartDate || reportEndDate) 
            ? (visitedSalonsFromDb + revisitedCount) 
            : visitedSalonsFromDb;
        
        if (totalVisits === 0) return "0.0";
        return ((activeSalonsCount / totalVisits) * 100).toFixed(1);
    }, [activeSalonsCount, visitedSalonsFromDb, revisitedCount, reportStartDate, reportEndDate]);

    const calculatePeriodicActivePercentage = (active, visited, revisited) => {
        const totalVisits = (visited || 0) + (revisited || 0);
        if (totalVisits === 0) return "0.0";
        return ((active / totalVisits) * 100).toFixed(1);
    };

    const calculateTotalActivePercentage = (active, visited) => {
        if (!visited || visited === 0) return "0.0";
        return ((active / visited) * 100).toFixed(1);
    };

    // Periodic Table Totals
    const pTotalVisited = React.useMemo(() => repActivityData.reduce((acc, curr) => acc + curr.visited, 0), [repActivityData]);
    const pTotalActive = React.useMemo(() => repActivityData.reduce((acc, curr) => acc + curr.active, 0), [repActivityData]);
    const pTotalRevisited = React.useMemo(() => repActivityData.reduce((acc, curr) => acc + curr.revisited, 0), [repActivityData]);
    const pTotalPOSM = React.useMemo(() => repActivityData.reduce((acc, curr) => acc + curr.posm, 0), [repActivityData]);
    const pTotalActivePercent = React.useMemo(() => calculatePeriodicActivePercentage(pTotalActive, pTotalVisited, pTotalRevisited), [pTotalActive, pTotalVisited, pTotalRevisited]);

    // Total Table Totals
    const tTotalVisited = React.useMemo(() => totalRepActivityData.reduce((acc, curr) => acc + curr.visited, 0), [totalRepActivityData]);
    const tTotalActive = React.useMemo(() => totalRepActivityData.reduce((acc, curr) => acc + curr.active, 0), [totalRepActivityData]);
    const tTotalRevisited = React.useMemo(() => totalRepActivityData.reduce((acc, curr) => acc + curr.revisited, 0), [totalRepActivityData]);
    const tTotalPOSM = React.useMemo(() => totalRepActivityData.reduce((acc, curr) => acc + curr.posm, 0), [totalRepActivityData]);
    const tTotalActivePercent = React.useMemo(() => calculateTotalActivePercentage(tTotalActive, tTotalVisited), [tTotalActive, tTotalVisited]);

    const repChartData = React.useMemo(() => {
        const stats = {};
        const start = reportStartDate ? new Date(reportStartDate) : null;
        const end = reportEndDate ? new Date(reportEndDate + 'T23:59:59.999Z') : null;

        salons.forEach(s => {
            const rep = (s.repName && s.repName.trim() !== '') ? s.repName : 'Unassigned';
            if (selectedRep && rep !== selectedRep) return;

            if (!stats[rep]) {
                stats[rep] = { name: rep, visited: 0, active: 0, posm: 0, revisited: 0 };
            }

            const checkRange = (date) => {
                if (!date) return false;
                const d = new Date(date);
                if (start && d < start) return false;
                if (end && d > end) return false;
                return true;
            };

            const hasVisitInRange = checkRange(s.visitedDate);
            const revisitInRange = (s.revisitedDates || []).filter(checkRange);

            if (s.isVisited && hasVisitInRange) stats[rep].visited += 1;
            stats[rep].revisited += revisitInRange.length;

            // NEW LOGIC: Active/POSM are counted if the salon is active AND had activity in range
            if (s.isActive && (hasVisitInRange || revisitInRange.length > 0)) {
                stats[rep].active += 1;
            }
            if (s.posmActive && (hasVisitInRange || revisitInRange.length > 0)) {
                stats[rep].posm += 1;
            }
        });

        const sorted = Object.values(stats).sort((a, b) => a.name.localeCompare(b.name));
        return sorted;
    }, [salons, selectedRep, reportStartDate, reportEndDate]);

    const repActiveTrendData = React.useMemo(() => {
        const monthMap = {};
        const repsSet = new Set();
        
        salons.forEach(s => {
            if (!s.isActive) return;
            const rep = (s.repName && s.repName.trim() !== '') ? s.repName : 'Unassigned';
            repsSet.add(rep);
            
            const date = s.activeDate || s.visitedDate || s.createdAt;
            if (!date) return;
            const d = new Date(date);
            if (isNaN(d.getTime())) return;
            const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthMap[mKey]) monthMap[mKey] = {};
            if (!monthMap[mKey][rep]) monthMap[mKey][rep] = 0;
            monthMap[mKey][rep]++;
        });

        const sortedMonths = Object.keys(monthMap).sort();
        const data = [];
        const cumulative = {};
        const activeReps = Array.from(repsSet).filter(r => {
            // Only show reps who have at least 1 active salon to keep chart clean
            return salons.some(s => s.repName === r && s.isActive);
        });

        activeReps.forEach(r => cumulative[r] = 0);

        sortedMonths.forEach(mKey => {
            const d = new Date(mKey + '-01');
            const point = {
                month: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
                key: mKey
            };
            activeReps.forEach(r => {
                point[r] = (monthMap[mKey][r] || 0);
            });
            data.push(point);
        });

        // Limit to top 10 reps based on total activations in the displayed months
        const topReps = activeReps
            .map(r => ({ 
                name: r, 
                total: data.reduce((sum, p) => sum + (p[r] || 0), 0) 
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10)
            .map(r => r.name);

        const colors = [
            '#38bdf8', '#4ade80', '#f472b6', '#c084fc', '#fbbf24', 
            '#f87171', '#2dd4bf', '#818cf8', '#a78bfa', '#fb923c'
        ];

        return { data, reps: topReps, colors };
    }, [salons]);

    const monthPerformanceData = React.useMemo(() => {
        const months = {};
        salons.forEach(s => {
            const rep = (s.repName && s.repName.trim() !== '') ? s.repName : 'Unassigned';
            if (selectedRep && rep !== selectedRep) return;

            const date = s.visitedDate || s.createdAt;
            if (!date) return;
            const d = new Date(date);
            if (isNaN(d.getTime())) return;
            const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!months[mKey]) {
                months[mKey] = {
                    key: mKey,
                    month: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
                    visited: 0,
                    active: 0
                };
            }
            if (s.isVisited) months[mKey].visited++;
            if (s.isActive) months[mKey].active++;
        });
        return Object.values(months).sort((a, b) => a.key.localeCompare(b.key));
    }, [salons, selectedRep]);

    return (
        <div className="admin-container animate-fade-in">
            {/* Header - Logo and External Links */}
            <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src="/Fadna New Logo.png" alt="Fadna Logo" className="site-logo" style={{ maxHeight: '40px' }} />
                    <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <ThemeToggle />
                    <button className="btn-primary outline" style={{ padding: '0.5rem 1rem', opacity: 0.8 }} onClick={() => navigate('/agent-admin')}>Agents Dashboard</button>
                    <button className="btn-primary outline" style={{ padding: '0.5rem 1rem', opacity: 0.8 }} onClick={() => navigate('/net-agent-admin')}>Net.Agents Dashboard</button>
                    <button className="btn-primary" style={{ padding: '0.5rem 1rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }} onClick={() => navigate('/qr-generator')}>🔲 Scan Dashboard</button>
                    <button className="btn-primary outline" style={{ borderColor: '#ef4444', color: '#ef4444', padding: '0.5rem 1rem' }}
                        onClick={() => { localStorage.removeItem('adminUser'); navigate('/admin-login'); }}>Log Out</button>
                </div>
            </header>

            {/* Main Navigation Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="tabs-container" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    <button className={`btn-primary nav-btn ${activeTab === 'overview' ? '' : 'outline'}`} style={{ opacity: activeTab === 'overview' ? 1 : 0.7 }} onClick={() => setActiveTab('overview')}>Overview</button>
                    {(adminRole === 'admin' || adminRole === 'superadmin') && (
                        <button className={`btn-primary nav-btn ${activeTab === 'orders' ? '' : 'outline'}`} style={{ opacity: activeTab === 'orders' ? 1 : 0.7 }} onClick={() => setActiveTab('orders')}>Orders</button>
                    )}
                    {(adminRole !== 'admin') && (
                        <>
                            <button className={`btn-primary nav-btn ${activeTab === 'salons' ? '' : 'outline'}`} style={{ opacity: activeTab === 'salons' ? 1 : 0.7 }} onClick={() => setActiveTab('salons')}>Salons</button>
                            <button className={`btn-primary nav-btn ${activeTab === 'products' ? '' : 'outline'}`} style={{ opacity: activeTab === 'products' ? 1 : 0.7 }} onClick={() => setActiveTab('products')}>Products</button>
                            <button className={`btn-primary nav-btn ${activeTab === 'monitor' ? '' : 'outline'}`} style={{ opacity: activeTab === 'monitor' ? 1 : 0.7 }} onClick={() => setActiveTab('monitor')}>Monitor</button>
                            <button className={`btn-primary nav-btn ${activeTab === 'accounts' ? '' : 'outline'}`} style={{ opacity: activeTab === 'accounts' ? 1 : 0.7 }} onClick={() => setActiveTab('accounts')}>Accounts</button>
                        </>
                    )}
                    {(adminRole === 'admin' || adminRole === 'superadmin') && (
                        <button className={`btn-primary nav-btn ${activeTab === 'order-analytics' ? '' : 'outline'}`} style={{ opacity: activeTab === 'order-analytics' ? 1 : 0.7 }} onClick={() => setActiveTab('order-analytics')}>Order Analytics</button>
                    )}
                    {(adminRole === 'admin' || adminRole === 'superadmin') && (
                        <button className={`btn-primary nav-btn ${activeTab === 'reports' ? '' : 'outline'}`} style={{ opacity: activeTab === 'reports' ? 1 : 0.7 }} onClick={() => setActiveTab('reports')}>Reports</button>
                    )}
                </div>

                {/* Contextual Filters */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {(activeTab === 'orders' || activeTab === 'monitor' || activeTab === 'salons' || activeTab === 'overview') && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="text" placeholder="Search..." value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none', transition: 'all 0.3s ease' }} />
                            <button className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Search</button>
                        </div>
                    )}
                    <select value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)}
                        style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'white', transition: 'all 0.3s ease' }}>
                        <option value="" >All Reps</option>
                        {reps.map(rep => <option key={rep._id} value={rep.name} >{rep.name}</option>)}
                        <option value="Unassigned" >Unassigned</option>
                    </select>

                    <select value={selectedSalonId} onChange={(e) => setSelectedSalonId(e.target.value)}
                        style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'white', transition: 'all 0.3s ease' }}>
                        <option value="" >All Salons</option>
                        {salons.map(salon => <option key={salon._id} value={salon._id} >{salon.name}</option>)}
                    </select>
                </div>
            </div>

            {activeTab === 'order-analytics' && (
                <section className="glass-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h2 style={{ margin: 0 }}>QR Order Analytics</h2>
                            <p style={{ opacity: 0.6, fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>Product-wise performance breakdown by Representative and Month</p>
                        </div>
                        <button onClick={handleExportOrderSummaryExcel} className="btn-primary" style={{ padding: '0.8rem 1.5rem', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', border: 'none' }}>
                            📊 Export QR Order Summary
                        </button>
                    </div>

                    {loadingOrderSummary ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: '#6366f1' }}>
                            <div className="loader" style={{ marginBottom: '1rem' }}></div>
                            Loading Analytics...
                        </div>
                    ) : orderSummaryData.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
                            {orderSummaryData.map((item, idx) => (
                                <div key={idx} className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem' }}>
                                        <div>
                                            <h4 style={{ margin: 0, color: '#bae6fd', fontSize: '1.1rem' }}>{item._id.repName}</h4>
                                            <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 'bold', textTransform: 'uppercase' }}>{item.monthName}</span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{item.uniqueOrders}</div>
                                            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>ORDERS</div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                        {item.products.map((p, pIdx) => (
                                            <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                                                <span style={{ opacity: 0.8 }}>{p.name}</span>
                                                <span style={{ fontWeight: 'bold', background: 'rgba(56,189,248,0.2)', padding: '2px 8px', borderRadius: '4px', color: '#38bdf8' }}>{p.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <span style={{ opacity: 0.6 }}>Total Items Sold:</span>
                                        <span style={{ fontWeight: 'bold', color: '#4ade80' }}>{item.totalItems}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: '4rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                            <h3>No Order Data Found</h3>
                            <p style={{ opacity: 0.6 }}>Try adjusting your date filters or representative selection.</p>
                        </div>
                    )}
                </section>
            )}

            {activeTab === 'overview' && (
                <section className="glass-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <h2>Dashboard Overview</h2>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <button onClick={handleExportCombinedExcel} className="btn-primary" style={{ padding: '0.8rem 1.5rem', background: 'linear-gradient(135deg, #4ade80, #22c55e)', border: 'none', boxShadow: '0 4px 12px rgba(74,222,128,0.2)' }}>
                                📥 Download Performance Report
                            </button>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.8rem 1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>From:</label>
                                <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)}
                                    style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'white', colorScheme: 'dark', fontSize: '0.9rem' }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>To:</label>
                                <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)}
                                    style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'white', colorScheme: 'dark', fontSize: '0.9rem' }} />
                            </div>
                            <button onClick={fetchAnalytics} className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>Apply Filters</button>
                        </div>
                    </div>
                </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
                            <h3 style={{ color: '#4ade80', marginBottom: '0.5rem', fontSize: '1rem' }}>Total Visited</h3>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>{visitedSalonsFromDb}</div>
                        </div>
                        <div style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
                            <h3 style={{ color: '#38bdf8', marginBottom: '0.5rem', fontSize: '1rem' }}>Active Salons</h3>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>{activeSalonsCount}</div>
                        </div>
                        <div style={{ background: 'rgba(244,114,182,0.1)', border: '1px solid rgba(244,114,182,0.3)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
                            <h3 style={{ color: '#f472b6', marginBottom: '0.5rem', fontSize: '1rem' }}>Revisited</h3>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>{revisitedCount}</div>
                        </div>
                        <div style={{ background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.3)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
                            <h3 style={{ color: '#c084fc', marginBottom: '0.5rem', fontSize: '1rem' }}>POSM Active</h3>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>{posmSalonsCount}</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(0,0,0,0.2))', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.2)' }}>
                            <div style={{ fontSize: '0.9rem', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Market Active Rate</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{activeRate}%</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Active / Visited Salons</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '2rem' }}>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0, color: '#fff' }}>Rep-wise Active Salon Trend</h3>
                                <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Monthly Active Salon Counts (Top 10 Reps)</div>
                            </div>
                            <div style={{ width: '100%', height: 400 }}>
                                <ResponsiveContainer>
                                    <LineChart data={repActiveTrendData.data}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                                        <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                                        <Legend />
                                        {repActiveTrendData.reps.map((rep, idx) => (
                                            <Line 
                                                key={rep} 
                                                type="monotone" 
                                                dataKey={rep} 
                                                name={rep} 
                                                stroke={repActiveTrendData.colors[idx % repActiveTrendData.colors.length]} 
                                                strokeWidth={2}
                                                dot={{ r: 4 }}
                                                activeDot={{ r: 6 }}
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <h3 style={{ marginBottom: '1.5rem', color: '#fff' }}>Visited vs QR vs Active per Rep</h3>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <BarChart data={repChartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                                        <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                                        <Legend />
                                        <Bar dataKey="visited" name="Visited" fill="#4ade80" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="active" name="Active" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <h3 style={{ margin: 0, color: '#fff' }}>Salon Visit (Periodic Summary)</h3>
                            <div style={{ fontSize: '0.85rem', opacity: 0.7, color: '#bae6fd' }}>
                                {reportStartDate || reportEndDate ? `${reportStartDate || 'Start'} to ${reportEndDate || 'End'}` : 'All Time'}
                            </div>
                        </div>
                        <div className="table-container">
                            <table className="styled-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '1rem' }}>NAME</th>
                                        <th style={{ textAlign: 'center', padding: '1rem' }}>NEW VISITED</th>
                                        <th style={{ textAlign: 'center', padding: '1rem' }}>RE.Visit</th>
                                        <th style={{ textAlign: 'center', padding: '1rem' }}>ACTIVE</th>
                                        <th style={{ textAlign: 'center', padding: '1rem', color: '#38bdf8' }}>ACTIVE %</th>
                                        <th style={{ textAlign: 'center', padding: '1rem' }}>QR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {repActivityData.length > 0 ? (
                                        repActivityData.map((rep, index) => (
                                            <tr key={index}>
                                                <td style={{ fontWeight: 'bold', color: '#bae6fd' }}>{rep.repName}</td>
                                                <td style={{ textAlign: 'center' }}>{rep.visited}</td>
                                                <td style={{ textAlign: 'center' }}>{rep.revisited}</td>
                                                <td style={{ textAlign: 'center', color: '#4ade80' }}>{rep.active}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#38bdf8' }}>
                                                    {Math.round(calculatePeriodicActivePercentage(rep.active, rep.visited, rep.revisited))}%
                                                </td>
                                                <td style={{ textAlign: 'center' }}>{rep.posm}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'gray' }}>No activity data found for selected range</td>
                                        </tr>
                                    )}
                                </tbody>
                                {repActivityData.length > 0 && (
                                    <tfoot>
                                        <tr style={{ background: 'rgba(56,189,248,0.1)', fontWeight: 'bold' }}>
                                            <td>Total</td>
                                            <td style={{ textAlign: 'center' }}>{pTotalVisited}</td>
                                            <td style={{ textAlign: 'center' }}>{pTotalRevisited}</td>
                                            <td style={{ textAlign: 'center' }}>{pTotalActive}</td>
                                            <td style={{ textAlign: 'center', color: '#38bdf8' }}>
                                                {Math.round(pTotalActivePercent)}%
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{pTotalPOSM}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <h3 style={{ margin: 0, color: '#fff' }}>Total Salon Visit (All Time)</h3>
                        </div>
                        <div className="table-container">
                            <table className="styled-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '1rem' }}>NAME</th>
                                        <th style={{ textAlign: 'center', padding: '1rem' }}>NEW VISITED</th>
                                        <th style={{ textAlign: 'center', padding: '1rem' }}>RE.Visit</th>
                                        <th style={{ textAlign: 'center', padding: '1rem' }}>ACTIVE</th>
                                        <th style={{ textAlign: 'center', padding: '1rem', color: '#38bdf8' }}>ACTIVE %</th>
                                        <th style={{ textAlign: 'center', padding: '1rem' }}>QR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {totalRepActivityData.length > 0 ? (
                                        totalRepActivityData.map((rep, index) => (
                                            <tr key={index}>
                                                <td style={{ fontWeight: 'bold', color: '#bae6fd' }}>{rep.repName}</td>
                                                <td style={{ textAlign: 'center' }}>{rep.visited}</td>
                                                <td style={{ textAlign: 'center' }}>{rep.revisited}</td>
                                                <td style={{ textAlign: 'center', color: '#4ade80' }}>{rep.active}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#38bdf8' }}>
                                                    {Math.round(calculateTotalActivePercentage(rep.active, rep.visited))}%
                                                </td>
                                                <td style={{ textAlign: 'center' }}>{rep.posm}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'gray' }}>No data found</td>
                                        </tr>
                                    )}
                                </tbody>
                                {totalRepActivityData.length > 0 && (
                                    <tfoot>
                                        <tr style={{ background: 'rgba(56,189,248,0.1)', fontWeight: 'bold' }}>
                                            <td>Total</td>
                                            <td style={{ textAlign: 'center' }}>{tTotalVisited}</td>
                                            <td style={{ textAlign: 'center' }}>{tTotalRevisited}</td>
                                            <td style={{ textAlign: 'center' }}>{tTotalActive}</td>
                                            <td style={{ textAlign: 'center', color: '#38bdf8' }}>
                                                {Math.round(tTotalActivePercent)}%
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{tTotalPOSM}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                <h3 style={{ margin: 0, color: '#fff' }}>Detailed Rep Salon Activity List</h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => {
                                            setDetailedFilterRep('');
                                            setDetailedFilterStartDate('');
                                            setDetailedFilterEndDate('');
                                            setFilterDetailedVisited(false);
                                            setFilterDetailedActive(false);
                                            setFilterDetailedPOSM(false);
                                            setSearchTerm('');
                                        }}
                                        className="btn-primary outline"
                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                    >
                                        Reset Filters
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!detailedFilteredSalons.length) return alert('No data to export');
                                            const data = detailedFilteredSalons.map(s => ({
                                                'Salon Name': s.name,
                                                'Salon Code': s.salonCode || 'N/A',
                                                'Rep Name': s.repName || 'Unassigned',
                                                'Location': s.location,
                                                'Contact': s.contactNumber1 || s.contactNumber || 'N/A',
                                                'Visited': s.isVisited ? 'Yes' : 'No',
                                                'Visited Date': s.visitedDate ? new Date(s.visitedDate).toLocaleDateString() : 'N/A',
                                                'Active': s.isActive ? 'Yes' : 'No',
                                                'Active Date': s.activeDate ? new Date(s.activeDate).toLocaleDateString() : 'N/A',
                                                'POSM': s.posmActive ? 'Yes' : 'No',
                                                'POSM Date': s.posmDate ? new Date(s.posmDate).toLocaleDateString() : 'N/A',
                                                'Revisits': (s.revisitedDates || []).length
                                            }));
                                            const worksheet = XLSX.utils.json_to_sheet(data);
                                            const workbook = XLSX.utils.book_new();
                                            XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Salons");
                                            XLSX.writeFile(workbook, `Filtered_Salons_Activity_${new Date().toISOString().split('T')[0]}.xlsx`);
                                        }}
                                        className="btn-primary"
                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: '#10b981', border: 'none' }}
                                    >
                                        Export Filtered List
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div className="input-group">
                                    <label style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.3rem', display: 'block' }}>Select Representative</label>
                                    <select
                                        value={detailedFilterRep || selectedRep}
                                        onChange={(e) => setDetailedFilterRep(e.target.value)}
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                                    >
                                        <option value="" >All Representatives</option>
                                        {reps.map(rep => (
                                            <option key={rep._id} value={rep.name} >{rep.name}</option>
                                        ))}
                                        <option value="Unassigned" >Unassigned</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.3rem', display: 'block' }}>Activity Start Date</label>
                                    <input
                                        type="date"
                                        value={detailedFilterStartDate}
                                        onChange={(e) => setDetailedFilterStartDate(e.target.value)}
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'white', colorScheme: 'dark' }}
                                    />
                                </div>
                                <div className="input-group">
                                    <label style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.3rem', display: 'block' }}>Activity End Date</label>
                                    <input
                                        type="date"
                                        value={detailedFilterEndDate}
                                        onChange={(e) => setDetailedFilterEndDate(e.target.value)}
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'white', colorScheme: 'dark' }}
                                    />
                                </div>
                                <div className="input-group">
                                    <label style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.3rem', display: 'block' }}>Status Filters</label>
                                    <div style={{ display: 'flex', gap: '0.8rem', height: '100%', alignItems: 'center' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', opacity: filterDetailedVisited ? 1 : 0.6 }}>
                                            <input type="checkbox" checked={filterDetailedVisited} onChange={(e) => setFilterDetailedVisited(e.target.checked)} />
                                            Visited
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', opacity: filterDetailedActive ? 1 : 0.6 }}>
                                            <input type="checkbox" checked={filterDetailedActive} onChange={(e) => setFilterDetailedActive(e.target.checked)} />
                                            Active
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', opacity: filterDetailedPOSM ? 1 : 0.6 }}>
                                            <input type="checkbox" checked={filterDetailedPOSM} onChange={(e) => setFilterDetailedPOSM(e.target.checked)} />
                                            POSM
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '1rem', opacity: 0.8, fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Showing {detailedFilteredSalonsCount} salons meeting activity criteria</span>
                            {(detailedFilterRep || detailedFilterStartDate || detailedFilterEndDate) && (
                                <span style={{ color: '#38bdf8', fontSize: '0.8rem' }}>
                                    Filters Active: {detailedFilterRep && `Rep: ${detailedFilterRep}`} {detailedFilterStartDate && `From: ${detailedFilterStartDate}`} {detailedFilterEndDate && `To: ${detailedFilterEndDate}`}
                                </span>
                            )}
                        </div>

                        {detailedFilteredSalons.length > 0 ? (
                            <div className="table-container">
                                <table className="styled-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            <th>Salon Name</th>
                                            <th>Phone Number</th>
                                            <th>Address</th>
                                            <th style={{ textAlign: 'center' }}>Mark</th>
                                            <th style={{ textAlign: 'center' }}>Visited</th>
                                            <th style={{ textAlign: 'center' }}>Active</th>
                                            <th style={{ textAlign: 'center' }}>POSM</th>
                                            <th style={{ textAlign: 'center' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detailedFilteredSalons.map((s, idx) => (
                                            <tr key={idx} style={{ backgroundColor: s.oneSalonMark ? 'rgba(74, 222, 128, 0.2)' : 'transparent', transition: 'background-color 0.3s' }}>
                                                <td style={{ fontWeight: 'bold', color: '#bae6fd' }}>{s.name}</td>
                                                <td>{s.contactNumber1}{s.contactNumber2 ? `, ${s.contactNumber2}` : ''}</td>
                                                <td style={{ fontSize: '0.9rem', opacity: 0.8 }}>{s.location}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={s.oneSalonMark || false}
                                                        onChange={() => handleToggleMark(s)}
                                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                    />
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span
                                                        onClick={() => handleToggleStatus(s, 'isVisited')}
                                                        style={{ cursor: 'pointer', fontSize: '1.2rem', color: s.isVisited ? '#4ade80' : '#ef4444', transition: 'transform 0.2s' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                        title="Click to toggle Visited status"
                                                    >
                                                        {s.isVisited ? '✓' : '✗'}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span
                                                        onClick={() => handleToggleStatus(s, 'isActive')}
                                                        style={{ cursor: 'pointer', fontSize: '1.2rem', color: s.isActive ? '#4ade80' : '#ef4444', transition: 'transform 0.2s' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                        title="Click to toggle Active status"
                                                    >
                                                        {s.isActive ? '✓' : '✗'}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span
                                                        onClick={() => handleToggleStatus(s, 'posmActive')}
                                                        style={{ cursor: 'pointer', fontSize: '1.2rem', color: s.posmActive ? '#4ade80' : '#ef4444', transition: 'transform 0.2s' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                        title="Click to toggle POSM status"
                                                    >
                                                        {s.posmActive ? '✓' : '✗'}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                        <button
                                                            onClick={() => { handleEditClick(s); setActiveTab('salons'); }}
                                                            className="btn-primary outline"
                                                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteSalon(s._id)}
                                                            className="btn-primary danger"
                                                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {detailedFilteredSalons.length === 0 && (
                                            <tr>
                                                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>No salons found matching your criteria</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}
                    </div>
                </section >
            )}

            {
                (adminRole === 'admin' || adminRole === 'superadmin') && activeTab === 'orders' && (
                    <section className="glass-container">
                        <h2>Recent Orders</h2>
                        <div className="table-container">
                            <table className="styled-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Order ID</th>
                                        <th>Agent/Salon</th>
                                        <th>Customer</th>
                                        <th>Items</th>
                                        <th>Total</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders
                                        .filter(order => {
                                            const orderSalon = salons.find(s => s._id === order.salonId);
                                            const orderRep = (orderSalon && orderSalon.repName && orderSalon.repName.trim() !== '') ? orderSalon.repName : 'Unassigned';

                                            if (selectedRep && orderRep !== selectedRep) return false;
                                            if (adminRole === 'admin' && order.status !== 'Processing' && order.status !== 'Paid') return false;
                                            if (!searchTerm) return true;
                                            const term = searchTerm.toLowerCase();
                                            return (
                                                (order.salonName || '').toLowerCase().includes(term) ||
                                                (order.customerName || '').toLowerCase().includes(term) ||
                                                (order.customerPhone || '').toLowerCase().includes(term) ||
                                                (order.additionalPhone || '').toLowerCase().includes(term) ||
                                                (orderRep || '').toLowerCase().includes(term) ||
                                                (order.items || []).some(item => (item.productName || '').toLowerCase().includes(term))
                                            );
                                        })
                                        .map(order => (
                                            <tr key={order._id} style={{ backgroundColor: order.isDownloaded ? 'rgba(220, 38, 38, 0.15)' : 'transparent' }}>
                                                <td>{new Date(order.createdAt).toLocaleString()}</td>
                                                <td style={{ fontWeight: 'bold' }}>{order.merchantOrderId || order._id.slice(-6).toUpperCase()}</td>
                                                <td>{order.salonName || order.agentName || '—'}</td>
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
                                                        disabled={adminRole === 'admin'}
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
                                                        <option value="Pending Payment">Pending</option>
                                                        <option value="Paid">Paid</option>
                                                        <option value="Processing">Processing</option>
                                                        <option value="Shipped">Shipped</option>
                                                        <option value="Completed">Completed</option>
                                                        <option value="Returned">Returned</option>
                                                        <option value="Cancelled">Cancelled</option>
                                                        <option value="Payment Failed">Payment Failed</option>
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

                                <div className="form-grid">
                                    <div className="input-group">
                                        <label>Salon Name *</label>
                                        <input type="text" placeholder="e.g. Elegant Hair" value={newSalon.name} onChange={(e) => setNewSalon({ ...newSalon, name: e.target.value })} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Location</label>
                                        <input type="text" placeholder="e.g. Colombo 03" value={newSalon.location} onChange={(e) => setNewSalon({ ...newSalon, location: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Contact Number 1</label>
                                        <input type="text" placeholder="Phone 1" value={newSalon.contactNumber1} onChange={(e) => setNewSalon({ ...newSalon, contactNumber1: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Contact Number 2</label>
                                        <input type="text" placeholder="Phone 2" value={newSalon.contactNumber2} onChange={(e) => setNewSalon({ ...newSalon, contactNumber2: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Representative Name *</label>
                                        <select value={newSalon.repName} onChange={(e) => setNewSalon({ ...newSalon, repName: e.target.value })} required>
                                            <option value="" >Select Rep Name</option>
                                            {reps.map(rep => (
                                                <option key={rep._id} value={rep.name} >{rep.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Remark</label>
                                        <input type="text" placeholder="Any notes..." value={newSalon.remark} onChange={(e) => setNewSalon({ ...newSalon, remark: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Username (Optional)</label>
                                        <input type="text" placeholder="Custom Username" value={newSalon.username} onChange={(e) => setNewSalon({ ...newSalon, username: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Password (Optional)</label>
                                        <input type="text" placeholder="Custom Password" value={newSalon.password} onChange={(e) => setNewSalon({ ...newSalon, password: e.target.value })} />
                                    </div>
                                </div>

                                <h3 className="section-title">Account Details</h3>
                                <div className="form-grid">
                                    <div className="input-group">
                                        <label>Bank Name</label>
                                        <input type="text" placeholder="e.g. BOC" value={newSalon.accountDetails.bankName} onChange={(e) => setNewSalon({ ...newSalon, accountDetails: { ...newSalon.accountDetails, bankName: e.target.value } })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Branch</label>
                                        <input type="text" placeholder="e.g. City Branch" value={newSalon.accountDetails.branch} onChange={(e) => setNewSalon({ ...newSalon, accountDetails: { ...newSalon.accountDetails, branch: e.target.value } })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Account Number</label>
                                        <input type="text" placeholder="e.g. 123456789" value={newSalon.accountDetails.accountNumber} onChange={(e) => setNewSalon({ ...newSalon, accountDetails: { ...newSalon.accountDetails, accountNumber: e.target.value } })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Account Name</label>
                                        <input type="text" placeholder="e.g. John Doe" value={newSalon.accountDetails.accountName} onChange={(e) => setNewSalon({ ...newSalon, accountDetails: { ...newSalon.accountDetails, accountName: e.target.value } })} />
                                    </div>
                                </div>

                                <h3 className="section-title">Status & Marks</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#f8fafc', fontSize: '0.95rem', fontWeight: '500' }}>
                                            <input type="checkbox" checked={newSalon.isVisited} onChange={(e) => setNewSalon({ ...newSalon, isVisited: e.target.checked })} style={{ width: '20px', height: '20px', accentColor: 'var(--primary-color)', margin: 0 }} />
                                            Visited Salon
                                        </label>
                                        {newSalon.isVisited && (
                                            <input
                                                type="date"
                                                value={newSalon.visitedDate}
                                                onChange={(e) => setNewSalon({ ...newSalon, visitedDate: e.target.value })}
                                                style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'white', marginTop: 0 }}
                                            />
                                        )}
                                    </div>
                                    <label style={{ display: 'inline-flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', color: '#f8fafc', fontSize: '0.95rem', fontWeight: '500' }}>
                                        <input type="checkbox" checked={newSalon.isActive} onChange={(e) => setNewSalon({ ...newSalon, isActive: e.target.checked })} style={{ width: '20px', height: '20px', accentColor: 'var(--primary-color)', margin: 0 }} />
                                        Active Salon
                                    </label>
                                    <label style={{ display: 'inline-flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', color: '#f8fafc', fontSize: '0.95rem', fontWeight: '500' }}>
                                        <input type="checkbox" checked={newSalon.posmActive} onChange={(e) => setNewSalon({ ...newSalon, posmActive: e.target.checked })} style={{ width: '20px', height: '20px', accentColor: 'var(--primary-color)', margin: 0 }} />
                                        POSM Active Salon
                                    </label>
                                </div>

                                <div className="input-group" style={{ marginBottom: '2rem' }}>
                                    <label style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold' }}>Revisited Dates (Mark old visits here)</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '30px' }}>
                                        {(newSalon.revisitedDates || []).map((d, index) => (
                                            <div key={index} style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', color: '#bae6fd', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {new Date(d).toLocaleDateString()}
                                                <button type="button" onClick={() => {
                                                    const newArr = [...newSalon.revisitedDates];
                                                    newArr.splice(index, 1);
                                                    setNewSalon({ ...newSalon, revisitedDates: newArr });
                                                }} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.2rem', lineHeight: 1, cursor: 'pointer', padding: 0, fontWeight: 'bold' }}>&times;</button>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                                        <input type="date" id={`revisit-date-${editingSalonId || 'new'}`} style={{ flex: '1 1 200px', padding: '0.6rem', margin: 0, borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'white' }} />
                                        <button type="button" onClick={() => {
                                            const dateVal = document.getElementById(`revisit-date-${editingSalonId || 'new'}`).value;
                                            if (dateVal) {
                                                setNewSalon({ ...newSalon, revisitedDates: [...(newSalon.revisitedDates || []), dateVal] });
                                                document.getElementById(`revisit-date-${editingSalonId || 'new'}`).value = '';
                                            }
                                        }} className="btn-primary" style={{ padding: '0.6rem 1.5rem', whiteSpace: 'nowrap', flex: '0 1 auto' }}>+ Add Date</button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
                                    {editingSalonId && (
                                        <button type="button" onClick={handleCancelEdit} className="btn-primary outline" style={{ flex: '1 1 120px', padding: '0.8rem 1rem', fontSize: '1rem' }}>Cancel</button>
                                    )}
                                    <button type="submit" className="btn-primary" style={{
                                        flex: '2 1 200px', padding: '0.8rem 1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center'
                                    }}>
                                        {editingSalonId ? 'Update Salon' : (formModeAdmin === 'assign' ? 'Assign to QR Code' : (formModeAdmin === 'draft' ? 'Save Details Only' : 'Generate Registration & QR'))}
                                    </button>
                                    {(!editingSalonId && formModeAdmin === 'draft') && (
                                        <button
                                            type="button"
                                            className="btn-primary outline"
                                            onClick={handleCancelEdit}
                                            style={{ flex: '1 1 120px', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '0.8rem 1rem', fontSize: '1rem', display: 'flex', justifyContent: 'center' }}
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </form>


                            {qrCode && (
                                <div style={{ marginTop: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '1rem' }}>
                                    <h3>Salon Created Successfully!</h3>

                                    <div style={{ marginBottom: '2rem' }}>
                                        <img src={qrCode} alt="Salon QR" style={{ borderRadius: '8px', border: '5px solid white', maxWidth: '200px' }} />
                                        <div style={{ marginTop: '1rem', fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>
                                            CODE: <span style={{ color: 'var(--secondary-color)' }}>{createdSalon?.salonCode}</span>
                                        </div>
                                        <div style={{ marginTop: '0.5rem', fontSize: '1.1rem', color: 'white', opacity: 0.9 }}>
                                            NAME: {createdSalon?.name}
                                        </div>
                                        <br />
                                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                                            <button
                                                onClick={() => handleDownloadQR(createdSalon)}
                                                className="btn-primary"
                                                style={{ cursor: 'pointer' }}
                                            >
                                                Download SVG
                                            </button>
                                            <button
                                                onClick={() => handleDownloadJPG(createdSalon)}
                                                className="btn-primary"
                                                style={{ cursor: 'pointer', background: '#eab308', borderColor: '#eab308', color: '#000' }}
                                            >
                                                Download JPG
                                            </button>
                                        </div>
                                    </div>

                                    {newCredentials && (
                                        <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--secondary-color)' }}>
                                            <h4 style={{ color: 'var(--secondary-color)', marginTop: 0 }}>IMPORTANT CREDENTIALS</h4>
                                            <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', opacity: 0.8 }}>Please save these credentials to share with the salon owner. The password will not be shown again.</p>

                                            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 'bold', color: 'var(--secondary-color)' }}>Code:</span>
                                                <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>{newCredentials.salonCode || 'N/A'}</code>

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
                                        <option value="" >Select Rep (Required)</option>
                                        {reps.map(rep => (
                                            <option key={rep._id} value={rep.name} >{rep.name}</option>
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
                                            onClick={() => handleBatchDownloadZip(salons.filter(s => selectedSalons.includes(s._id)), 'svg')}
                                            className="btn-primary"
                                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                                        >
                                            ZIP (SVG)
                                        </button>
                                        <button
                                            onClick={() => handleBatchDownloadZip(salons.filter(s => selectedSalons.includes(s._id)), 'jpg')}
                                            className="btn-primary"
                                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#eab308', borderColor: '#eab308', color: '#000' }}
                                        >
                                            ZIP (JPG)
                                        </button>
                                        <button
                                            onClick={() => handleBatchExcelExport(salons.filter(s => selectedSalons.includes(s._id)))}
                                            className="btn-primary"
                                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#10b981', borderColor: '#10b981' }}
                                        >
                                            Excel Export
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
                                {filteredSalons.slice(0, visibleCount).map(salon => (
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
                                                title="Download SVG"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDownloadJPG(salon)}
                                                className="icon-btn success"
                                                title="Download JPG"
                                                style={{ backgroundColor: '#eab308', color: '#000' }}
                                            >
                                                <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>JPG</span>
                                            </button>
                                            <a
                                                href={`/order/${salon.uniqueId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="icon-btn primary"
                                                title="Visit Shop"
                                                style={{ backgroundColor: '#10b981' }}
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

                            {visibleCount < filteredSalons.length && (
                                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                                    <button
                                        onClick={() => setVisibleCount(prev => prev + 50)}
                                        className="btn-primary"
                                        style={{ padding: '0.8rem 2rem' }}
                                    >
                                        Load More Salons ({filteredSalons.length - visibleCount} remaining)
                                    </button>
                                </div>
                            )}
                        </section>
                    </div>
                )
            }

            {
                activeTab === 'products' && (
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
                                    <select
                                        value={newProduct.target}
                                        onChange={(e) => setNewProduct({ ...newProduct, target: e.target.value })}
                                        style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', flex: 1 }}
                                    >
                                        <option value="both">Both</option>
                                        <option value="salon">Salon Only</option>
                                        <option value="agent">Agent Only</option>
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
                                    <input
                                        type="number"
                                        placeholder="Commission (LKR)"
                                        value={newProduct.commission}
                                        onChange={(e) => setNewProduct({ ...newProduct, commission: e.target.value })}
                                        style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }}
                                    />
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
                                                setNewProduct({ name: '', price: '', discountType: 'none', discountValue: 0, target: 'both', commission: 0 });
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
                                            <div style={{ marginTop: '0.2rem', color: '#38bdf8' }}>
                                                For: {p.target === 'salon' ? 'Salon Only' : p.target === 'agent' ? 'Agent Only' : 'Both'}
                                            </div>
                                            <div style={{ marginTop: '0.2rem', color: '#4ade80', fontWeight: 'bold' }}>
                                                Commission: Rs.{p.commission || 0}
                                            </div>
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
                )
            }

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

            {
                activeTab === 'accounts' && (
                    <section className="glass-container">
                        <h2>Account Management</h2>
                        <div style={{ marginBottom: '2rem', background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0 }}>{editingAccountId ? 'Edit Account' : 'Create Salesman Account'}</h3>
                                {editingAccountId && (
                                    <button onClick={() => {
                                        setEditingAccountId(null);
                                        setNewAccount({ username: '', password: '', role: 'salesman' });
                                    }} className="btn-primary outline" style={{ padding: '0.4rem 1rem' }}>Cancel Edit</button>
                                )}
                            </div>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    if (editingAccountId) {
                                        // Prepare payload: only send password if it's not empty
                                        const payload = { username: newAccount.username, role: newAccount.role };
                                        if (newAccount.password) {
                                            payload.password = newAccount.password;
                                        }
                                        const res = await axios.put(`${API_URL}/auth/accounts/${editingAccountId}`, payload);
                                        if (res.data.success) {
                                            alert('Account Updated Successfully');
                                            setNewAccount({ username: '', password: '', role: 'salesman' });
                                            setEditingAccountId(null);
                                            fetchAccounts();
                                        }
                                    } else {
                                        const res = await axios.post(`${API_URL}/auth/salesman`, newAccount);
                                        if (res.data.success) {
                                            alert('Account Created Successfully');
                                            setNewAccount({ username: '', password: '', role: 'salesman' });
                                            fetchAccounts();
                                        }
                                    }
                                } catch (err) {
                                    alert(err.response?.data?.error || 'Error saving account');
                                }
                            }}>
                                <div className="form-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                                    <div className="input-group">
                                        <label>Username</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. jdoe123"
                                            value={newAccount.username}
                                            onChange={(e) => setNewAccount({ ...newAccount, username: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Account Role</label>
                                        <select
                                            value={newAccount.role}
                                            onChange={(e) => setNewAccount({ ...newAccount, role: e.target.value })}
                                            required
                                        >
                                            <option value="salesman" >Salesman</option>
                                            <option value="admin" >Admin</option>
                                            <option value="superadmin" >Super Admin</option>
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Password</label>
                                        <input
                                            type="text"
                                            placeholder={editingAccountId ? "Leave blank to keep current" : "Enter a secure PIN/Password"}
                                            value={newAccount.password}
                                            onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                                            required={!editingAccountId}
                                        />
                                    </div>
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
                                                    <span className={`status-badge ${['admin', 'superadmin'].includes(acc.role) ? 'completed' : 'processing'}`} style={{ textTransform: 'capitalize' }}>
                                                        {acc.role}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            onClick={() => {
                                                                setEditingAccountId(acc._id);
                                                                setNewAccount({ username: acc.username, password: '', role: acc.role || 'salesman' });
                                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                                            }}
                                                            className="icon-btn primary"
                                                            title="Edit Account"
                                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                                                        >
                                                            Edit
                                                        </button>
                                                        {!['admin', 'superadmin'].includes(acc.role) && (
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
                )
            }

            {
                (adminRole === 'admin' || adminRole === 'superadmin') && activeTab === 'reports' && (
                    <section className="glass-container">
                        <h2>Reports & Export</h2>
                        <p style={{ opacity: 0.8, marginBottom: '2rem' }}>Download summary reports for data analysis and backup.</p>

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
                            <div style={{ alignSelf: 'flex-end' }}>
                                <button onClick={fetchAnalytics} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Apply Filters</button>
                            </div>
                        </div>

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

                            <div style={{ background: 'rgba(56,189,248,0.05)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(56,189,248,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                                <h3 style={{ margin: 0, color: '#38bdf8' }}>Combined Performance Excel</h3>
                                <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem', flex: 1 }}>Export a detailed Excel report with New Visited, Active, Re-visit, and POSM metrics including total summary and date ranges.</p>
                                <button onClick={handleExportCombinedExcel} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #0d9488, #0f766e)', border: 'none' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    Export Performance Excel
                                </button>
                            </div>
                        </div>

                        <div style={{ marginTop: '3rem' }}>
                            <h2 style={{ marginBottom: '1.5rem' }}>Download History</h2>
                            <div className="table-container shadow-sm">
                                <table className="styled-table">
                                    <thead>
                                        <tr>
                                            <th>Date & Time</th>
                                            <th>Report Type</th>
                                            <th>Downloaded By</th>
                                            <th>Records</th>
                                            <th>Date Range Filter</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportHistory.map((log) => (
                                            <tr key={log._id}>
                                                <td>{new Date(log.createdAt).toLocaleString()}</td>
                                                <td style={{ fontWeight: 'bold' }}>{log.reportType}</td>
                                                <td>{log.downloadedBy}</td>
                                                <td>{log.recordCount}</td>
                                                <td style={{ opacity: 0.7, fontSize: '0.9rem' }}>{log.dateRange}</td>
                                            </tr>
                                        ))}
                                        {reportHistory.length === 0 && (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>No download history yet</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                )
            }

        </div >
    );
};

export default AdminDashboard;
