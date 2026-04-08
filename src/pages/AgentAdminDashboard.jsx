import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ThemeToggle from '../components/ThemeToggle';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const API_URL = import.meta.env.VITE_API_URL || 'https://salonfadna-backend.onrender.com/api';

const AgentAdminDashboard = () => {
    const [agents, setAgents] = useState([]);
    const [orders, setOrders] = useState([]);
    const [newAgent, setNewAgent] = useState({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', username: '', password: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '', isDraft: false });
    const [qrCode, setQrCode] = useState(null);
    const [newCredentials, setNewCredentials] = useState(null);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'orders', 'agents', 'monitor'
    const [formModeAdmin, setFormModeAdmin] = useState('create'); // 'create' or 'assign'
    const navigate = useNavigate();
    const adminRole = localStorage.getItem('adminRole');

    useEffect(() => {
        const storedAdmin = localStorage.getItem('adminUser');
        if (!storedAdmin) {
            navigate('/admin-login');
        }
    }, [navigate]);
    const [editingAgentId, setEditingAgentId] = useState(null);
    const [expandedAgentId, setExpandedAgentId] = useState(null);
    const [agentPerformance, setAgentPerformance] = useState([]);
    const [itemPerformance, setItemPerformance] = useState([]);
    const [products, setProducts] = useState([]);
    const [newProduct, setNewProduct] = useState({ name: '', price: '', discountType: 'none', discountValue: 0, target: 'both', commission: 0 });
    const [editingProductId, setEditingProductId] = useState(null);
    const [selectedAgentId, setSelectedAgentId] = useState('');
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

    const fetchOrders = React.useCallback(async () => {
        try {
            const params = selectedAgentId ? { agentId: selectedAgentId } : {};
            const res = await axios.get(`${API_URL}/orders`, { params });
            if (res.data.success) setOrders(res.data.orders);
        } catch (err) {
            console.error(err);
        }
    }, [selectedAgentId]);

    const fetchAgents = React.useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/agents`);
            if (res.data.success) setAgents(res.data.agents);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchAnalytics = React.useCallback(async () => {
        try {
            const params = selectedAgentId ? { agentId: selectedAgentId } : {};
            if (reportStartDate) params.startDate = reportStartDate;
            if (reportEndDate) params.endDate = reportEndDate;

            const agentRes = await axios.get(`${API_URL}/analytics/agent-performance`, { params });
            if (agentRes.data.success) setAgentPerformance(agentRes.data.stats);

            const itemRes = await axios.get(`${API_URL}/analytics/item-performance`, { params });
            if (itemRes.data.success) setItemPerformance(itemRes.data.stats);

        } catch (err) {
            console.error(err);
        }
    }, [selectedAgentId, reportStartDate, reportEndDate]);

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
        fetchAgents();
    }, [fetchAgents]);

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

    const [createdAgent, setCreatedAgent] = useState(null);

    const handleCreateAgent = async (e) => {
        e.preventDefault();
        try {
            if (formModeAdmin === 'assign') {
                if (!newAgent.assignToCode || newAgent.assignToCode.trim() === '') {
                    alert('Please enter a Agent Code to assign to.');
                    return;
                }
                const role = localStorage.getItem('adminRole');
                const username = localStorage.getItem('loggedInUsername');
                const editedByValue = ['admin', 'superadmin'].includes(role) ? 'admin' : (username || 'admin');
                const payload = { ...newAgent, editedBy: editedByValue };

                const res = await axios.put(`${API_URL}/agents/assign`, payload);
                if (res.data.success) {
                    alert(`Successfully assigned details to Agent Code: ${newAgent.assignToCode}`);
                    setNewAgent({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', username: '', password: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], nextVisitedDate: '', isActive: false, posmActive: false, assignToCode: '' });
                    fetchAgents();
                }
            } else {
                const res = await axios.post(`${API_URL}/agents`, { ...newAgent, isDraft: formModeAdmin === 'draft' });
                if (res.data.success) {
                    if (formModeAdmin === 'draft') {
                        alert('Draft agent created successfully!');
                        setNewAgent({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', username: '', password: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '', isDraft: false });
                        fetchAgents();
                    } else {
                        setQrCode(res.data.qrCode);
                        setNewAgent({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', username: '', password: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '', isDraft: false });
                        fetchAgents();

                        // Set Credentials for display
                        setNewCredentials(res.data.credentials);
                        setCreatedAgent(res.data.agent); // Save created agent to show code
                    }
                }
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error creating agent');
            console.error(err);
        }
    };

    const handleDeleteAgent = async (id) => {
        if (!window.confirm('Are you sure you want to delete this agent?')) return;
        try {
            const res = await axios.delete(`${API_URL}/agents/${id}`);
            if (res.data.success) {
                fetchAgents();
                alert('Agent Deleted Successfully');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting agent');
        }
    };

    const handleEditClick = (agent) => {
        setNewAgent({
            name: agent.name,
            location: agent.location || '',
            contactNumber1: agent.contactNumber1 || agent.contactNumber || '',
            contactNumber2: agent.contactNumber2 || '',
            remark: agent.remark || '',
            repName: agent.repName || '',
            username: agent.username || '',
            password: agent.plainPassword || '',
            accountDetails: agent.accountDetails || { bankName: '', branch: '', accountNumber: '', accountName: '' },
            isVisited: agent.isVisited || false,
            visitedDate: agent.visitedDate ? agent.visitedDate.split('T')[0] : '',
            revisitedDates: agent.revisitedDates || [],
            isActive: agent.isActive || false,
            posmActive: agent.posmActive || false,
            isDraft: !agent.agentCode,
            assignToCode: ''
        });
        setEditingAgentId(agent._id);
        setEditingAgentId(agent._id);
        setEditingAgentId(agent._id);
        setQrCode(null);
        setNewCredentials(null);
        setCreatedAgent(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleUpdateAgent = async (e) => {
        e.preventDefault();
        try {
            const role = localStorage.getItem('adminRole');
            const username = localStorage.getItem('loggedInUsername');
            const editedByValue = ['admin', 'superadmin'].includes(role) ? 'admin' : username;
            const payload = { ...newAgent, editedBy: editedByValue };

            let res;
            if (newAgent.isDraft && newAgent.assignToCode && newAgent.assignToCode.trim() !== '') {
                res = await axios.put(`${API_URL}/agents/${editingAgentId}/merge`, payload);
            } else {
                res = await axios.put(`${API_URL}/agents/${editingAgentId}`, payload);
            }

            if (res.data.success) {
                setNewAgent({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', username: '', password: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '', isDraft: false });
                setEditingAgentId(null);
                fetchAgents();
                alert('Agent Updated Successfully!');
            }
        } catch (err) {
            console.error(err);
            alert('Error updating agent');
        }
    };

    const handleCancelEdit = () => {
        setNewAgent({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', repName: '', username: '', password: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' }, isVisited: false, visitedDate: '', revisitedDates: [], isActive: false, posmActive: false, assignToCode: '', isDraft: false });
        setEditingAgentId(null);
    };

    const [bulkCount, setBulkCount] = useState('');
    const [newBulkAgents, setNewBulkAgents] = useState([]);
    const [selectedAgents, setSelectedAgents] = useState([]);

    const handleSelectAgent = (id) => {
        setSelectedAgents(prev => {
            if (prev.includes(id)) {
                return prev.filter(sId => sId !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleSelectAll = (filteredAgents) => {
        if (selectedAgents.length === filteredAgents.length) {
            setSelectedAgents([]);
        } else {
            setSelectedAgents(filteredAgents.map(s => s._id));
        }
    };

    const handleBulkCreate = async () => {
        try {
            if (!bulkCount || bulkCount <= 0) return;
            const res = await axios.post(`${API_URL}/agents/bulk`, { count: bulkCount });
            if (res.data.success) {
                setNewBulkAgents(res.data.agents);
                setBulkCount('');
                fetchAgents();
                alert(`${res.data.agents.length} Agents registered successfully!`);
            }
        } catch (err) {
            console.error(err);
            alert('Error creating bulk agents');
        }
    };

    const handleExcelUpload = async () => {
        if (!selectedExcelFile) return;

        if (!newAgent.repName) {
            alert('Please select a Representative before uploading the Excel/CSV file.');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedExcelFile);
        formData.append('repName', newAgent.repName);

        try {
            const res = await axios.post(`${API_URL}/agents/bulk-upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (res.data.success) {
                const count = res.data.agents ? res.data.agents.length : '';
                alert(`Successfully registered ${count} agents from file!`);
                if (res.data.agents) {
                    setNewBulkAgents(res.data.agents);
                }
                setSelectedExcelFile(null);
                fetchAgents();
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert(error.response?.data?.error || error.response?.data?.message || 'Error uploading file');
        }
    };

    const generateQRSVG = async (agent) => {
        const baseUrl = 'https://www.portal.fadnals.lk';
        const qrUrl = `${baseUrl}/agent-order/${agent.uniqueId}`;

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

        // Add Agent Name
        const nameText = doc.createElementNS("http://www.w3.org/2000/svg", "text");
        nameText.setAttribute("x", vw / 2);
        nameText.setAttribute("y", vh + (textSpace / 2.5));
        nameText.setAttribute("text-anchor", "middle");
        nameText.setAttribute("font-family", "Arial, sans-serif");
        nameText.setAttribute("font-size", `${vw * 0.055}`);
        nameText.setAttribute("font-weight", "bold");
        nameText.setAttribute("fill", "#000000");
        nameText.textContent = agent.name;
        svg.appendChild(nameText);

        // Add Agent Code
        const codeText = doc.createElementNS("http://www.w3.org/2000/svg", "text");
        codeText.setAttribute("x", vw / 2);
        codeText.setAttribute("y", vh + (textSpace / 1.3));
        codeText.setAttribute("text-anchor", "middle");
        codeText.setAttribute("font-family", "Arial, sans-serif");
        codeText.setAttribute("font-size", `${vw * 0.045}`);
        codeText.setAttribute("font-weight", "normal");
        codeText.setAttribute("fill", "#444444");
        codeText.textContent = `Code: ${agent.agentCode || 'N/A'}`;
        svg.appendChild(codeText);

        const serializer = new XMLSerializer();
        return serializer.serializeToString(svg);
    };

    const handleDownloadQR = async (agent) => {
        try {
            const svgString = await generateQRSVG(agent);
            const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
            saveAs(blob, `${agent.name.replace(/\s+/g, '_')}-qr.svg`);
        } catch (err) {
            console.error('Error generating QR', err);
            alert('Failed to generate QR');
        }
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
                const scale = 3; // Higher quality
                canvas.width = 300 * scale; // Set fixed base width for consistency
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
        if (!agentsToPrint || agentsToPrint.length === 0) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write('<html><head><title>Print QR Codes</title>');
        printWindow.document.write('<style>body{font-family: Arial, sans-serif; display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;} .qr-card{border: 1px solid #ccc; padding: 10px; text-align: center; page-break-inside: avoid; width: 200px;} svg{width: 100%; height: auto;} @media print { .no-print { display: none; } }</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write('<div class="no-print" style="width: 100%; text-align: center; margin-bottom: 20px;"><button onclick="window.print()" style="padding: 10px 20px; font-size: 16px;">PRINT NOW</button></div>');

        for (const agent of agentsToPrint) {
            try {
                const svgString = await generateQRSVG(agent);
                // Encode SVG to base64 to ensure it renders reliably in some contexts, or just embed raw SVG
                // Embedding raw SVG is better for vectors.
                printWindow.document.write(`
                    <div class="qr-card">
                        ${svgString}
                        <div style="margin-top:5px; font-weight:bold;">${agent.name}</div>
                    </div>
                `);
            } catch (e) {
                console.error(e);
            }
        }

        printWindow.document.write('</body></html>');
        printWindow.document.close();
    };

    const handleBatchDownloadZip = async (agentsToDownload, format = 'svg') => {
        if (!agentsToDownload || agentsToDownload.length === 0) return;

        const zip = new JSZip();

        for (const agent of agentsToDownload) {
            try {
                const svgString = await generateQRSVG(agent);
                const safeName = agent.name.replace(/\s+/g, '_');
                const code = agent.agentCode || 'DRAFT';

                if (format === 'svg') {
                    zip.file(`${safeName}_${code}.svg`, svgString);
                } else {
                    // Convert to JPG blob for ZIP
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
                console.error(`Error generating ${format} for zip`, err);
            }
        }

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `agents_qr_codes_${format}.zip`);
    };

    const handleBatchDelete = async (agentsToDelete) => {
        if (!agentsToDelete || agentsToDelete.length === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${agentsToDelete.length} agents? This cannot be undone.`)) return;

        let successCount = 0;

        for (const agent of agentsToDelete) {
            try {
                await axios.delete(`${API_URL}/agents/${agent._id}`);
                successCount++;
            } catch (err) {
                // If 404, likely already deleted, just log and continue
                if (err.response && err.response.status === 404) {
                    console.warn(`Agent ${agent.name} (${agent._id}) already deleted or not found.`);
                } else {
                    console.error(`Failed to delete agent ${agent.name}:`, err);
                }
            }
        }

        setSelectedAgents([]);
        fetchAgents();
        alert(`Batch process finished. ${successCount} agents deleted.`);
    };

    const filteredAgents = agents.filter(agent => {
        const rep = (agent.repName && agent.repName.trim() !== '') ? agent.repName : 'Unassigned';
        if (selectedRep && rep !== selectedRep) return false;
        if (selectedAgentId && agent._id !== selectedAgentId) return false;
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (agent.name || '').toLowerCase().includes(term) ||
            (agent.location || '').toLowerCase().includes(term) ||
            (agent.username || '').toLowerCase().includes(term) ||
            (agent.agentCode || '').toLowerCase().includes(term) ||
            (agent.repName || '').toLowerCase().includes(term)
        );
    });

    const handleExportAgents = () => {
        let itemsToExport = agents;
        if (reportStartDate) itemsToExport = itemsToExport.filter(s => new Date(s.createdAt) >= new Date(reportStartDate));
        if (reportEndDate) {
            const end = new Date(reportEndDate + 'T23:59:59.999Z');
            itemsToExport = itemsToExport.filter(s => new Date(s.createdAt) <= end);
        }
        if (!itemsToExport.length) return alert('No agents to export for this date range');
        const headers = ['Agent ID', 'Name', 'Location', 'Code', 'Username', 'Password', 'Bank Name', 'Branch', 'Account Number', 'Account Name', 'Contact 1', 'Contact 2', 'Rep Name', 'Remark', 'Registered Date', 'Visited', 'Visited Date', 'Revisited Dates', 'Active', 'POSM Active'];
        const rows = itemsToExport.map(s => {
            const acc = s.accountDetails || {};
            return [
                s._id,
                `"${(s.name || '').replace(/"/g, '""')}"`,
                `"${(s.location || '').replace(/"/g, '""')}"`,
                s.agentCode || '',
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
        saveAs(blob, 'agents_report.csv');
        logReportHistory('Agents List', itemsToExport.length);
    };

    const handleExportOrders = async () => {
        let filteredOrders = adminRole === 'admin' ? orders.filter(o => o.status === 'Processing' || o.status === 'Paid') : orders;
        if (reportStartDate) filteredOrders = filteredOrders.filter(o => new Date(o.createdAt) >= new Date(reportStartDate));
        if (reportEndDate) {
            const end = new Date(reportEndDate + 'T23:59:59.999Z');
            filteredOrders = filteredOrders.filter(o => new Date(o.createdAt) <= end);
        }
        if (!filteredOrders.length) return alert('No orders to export');
        const headers = ['Order ID', 'Merchant Order ID', 'Date', 'Agent', 'Customer Name', 'Customer Phone', 'Additional Phone', 'Address', 'City', 'Status', 'Total Amount', 'Items'];
        const rows = filteredOrders.map(o => [
            o._id,
            o.merchantOrderId || o._id.slice(-6).toUpperCase(),
            `"${new Date(o.createdAt).toLocaleString()}"`,
            `"${(o.agentName || '').replace(/"/g, '""')}"`,
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
        if (!agentPerformance.length) return alert('No performance data');
        const headers = ['Agent', 'Valid Orders', 'Returns', 'Cancelled', 'Items Sold', 'Revenue'];
        const rows = agentPerformance.map(s => [
            `"${(s.agentName || 'Unknown').replace(/"/g, '""')}"`,
            s.totalOrders,
            s.returnedOrders || 0,
            s.cancelledOrders || 0,
            s.totalItemsSold,
            s.totalRevenue
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, 'performance_report.csv');
        logReportHistory('Performance Summary', agentPerformance.length);
    };

    const activeAgentsCount = agents.filter(s => s.isActive).length;
    const posmAgentsCount = agents.filter(s => s.posmActive).length;
    const visitedAgentsFromDb = agents.filter(s => s.isVisited).length;

    const repStats = {};
    agents.forEach(s => {
        const rep = (s.repName && s.repName.trim() !== '') ? s.repName : 'Unassigned';
        if (!repStats[rep]) {
            repStats[rep] = { name: rep, visited: 0, active: 0, posm: 0 };
        }
        if (s.isVisited) repStats[rep].visited += 1;
        if (s.isActive) repStats[rep].active += 1;
        if (s.posmActive) repStats[rep].posm += 1;
    });
    const repChartData = Object.values(repStats).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="admin-container animate-fade-in">
            {/* Header - Logo and External Links */}
            <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src="/Fadna New Logo.png" alt="Fadna Logo" className="site-logo" style={{ maxHeight: '40px' }} />
                    <h1 style={{ margin: 0 }}>Agent Admin Dashboard</h1>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <ThemeToggle />
                    <button className="btn-primary outline" style={{ padding: '0.5rem 1rem', opacity: 0.8 }} onClick={() => navigate('/admin')}>Salons Dashboard</button>
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
                            <button className={`btn-primary nav-btn ${activeTab === 'agents' ? '' : 'outline'}`} style={{ opacity: activeTab === 'agents' ? 1 : 0.7 }} onClick={() => setActiveTab('agents')}>Agents</button>
                            <button className={`btn-primary nav-btn ${activeTab === 'products' ? '' : 'outline'}`} style={{ opacity: activeTab === 'products' ? 1 : 0.7 }} onClick={() => setActiveTab('products')}>Products</button>
                            <button className={`btn-primary nav-btn ${activeTab === 'monitor' ? '' : 'outline'}`} style={{ opacity: activeTab === 'monitor' ? 1 : 0.7 }} onClick={() => setActiveTab('monitor')}>Monitor</button>
                            <button className={`btn-primary nav-btn ${activeTab === 'accounts' ? '' : 'outline'}`} style={{ opacity: activeTab === 'accounts' ? 1 : 0.7 }} onClick={() => setActiveTab('accounts')}>Accounts</button>
                        </>
                    )}
                    {(adminRole === 'admin' || adminRole === 'superadmin') && (
                        <button className={`btn-primary nav-btn ${activeTab === 'reports' ? '' : 'outline'}`} style={{ opacity: activeTab === 'reports' ? 1 : 0.7 }} onClick={() => setActiveTab('reports')}>Reports</button>
                    )}
                </div>

                {/* Contextual Filters */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {(activeTab === 'orders' || activeTab === 'monitor' || activeTab === 'agents') && (
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

                    <select value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)}
                        style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'white', transition: 'all 0.3s ease' }}>
                        <option value="" >All Agents</option>
                        {agents.map(agent => <option key={agent._id} value={agent._id} >{agent.name}</option>)}
                    </select>
                </div>
            </div>

            {activeTab === 'overview' && (
                <section className="glass-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <h2>Dashboard Overview</h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
                            <h3 style={{ color: '#38bdf8', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Active Agents</h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff' }}>{activeAgentsCount}</div>
                        </div>
                        <div style={{ background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.3)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
                            <h3 style={{ color: '#c084fc', marginBottom: '0.5rem', fontSize: '1.2rem' }}>POSM Active</h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff' }}>{posmAgentsCount}</div>
                        </div>
                        <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
                            <h3 style={{ color: '#4ade80', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Visited Agents</h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff' }}>{visitedAgentsFromDb}</div>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ marginBottom: '1.5rem', color: '#fff' }}>Rep Wise Overview</h3>
                        <div className="table-container">
                            <table className="styled-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Rep Name</th>
                                        <th style={{ textAlign: 'center', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Active Agents</th>
                                        <th style={{ textAlign: 'center', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>POSM Active</th>
                                        <th style={{ textAlign: 'center', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Visited Agents</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {repChartData.length > 0 ? (
                                        repChartData.map((rep, index) => (
                                            <tr key={index} style={{ background: index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                                                <td style={{ fontWeight: 'bold', color: '#bae6fd', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{rep.name}</td>
                                                <td style={{ textAlign: 'center', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{rep.active}</td>
                                                <td style={{ textAlign: 'center', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{rep.posm}</td>
                                                <td style={{ textAlign: 'center', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{rep.visited}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'gray' }}>No data available</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <h3 style={{ margin: 0, color: '#fff' }}>Detailed Rep Agent List</h3>
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer', opacity: filterDetailedVisited ? 1 : 0.6 }}>
                                        <input type="checkbox" checked={filterDetailedVisited} onChange={(e) => setFilterDetailedVisited(e.target.checked)} style={{ width: '16px', height: '16px', margin: 0 }} />
                                        Visited
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer', opacity: filterDetailedActive ? 1 : 0.6 }}>
                                        <input type="checkbox" checked={filterDetailedActive} onChange={(e) => setFilterDetailedActive(e.target.checked)} style={{ width: '16px', height: '16px', margin: 0 }} />
                                        Active
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer', opacity: filterDetailedPOSM ? 1 : 0.6 }}>
                                        <input type="checkbox" checked={filterDetailedPOSM} onChange={(e) => setFilterDetailedPOSM(e.target.checked)} style={{ width: '16px', height: '16px', margin: 0 }} />
                                        POSM
                                    </label>
                                </div>
                                <select
                                    value={selectedRep}
                                    onChange={(e) => setSelectedRep(e.target.value)}
                                    style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'white', minWidth: '200px' }}
                                >
                                    <option value="" >Select a Rep</option>
                                    {reps.map(rep => (
                                        <option key={rep._id} value={rep.name} >{rep.name}</option>
                                    ))}
                                    <option value="Unassigned" >Unassigned</option>
                                </select>
                            </div>
                        </div>

                        {selectedRep && (
                            <div style={{ marginBottom: '1rem', opacity: 0.8, fontSize: '0.9rem' }}>
                                Showing {agents.filter(a => {
                                    const rep = (a.repName && a.repName.trim() !== '') ? a.repName : 'Unassigned';
                                    if (rep !== selectedRep) return false;
                                    if (filterDetailedVisited && !a.isVisited) return false;
                                    if (filterDetailedActive && !a.isActive) return false;
                                    if (filterDetailedPOSM && !a.posmActive) return false;
                                    return true;
                                }).length} agents for {selectedRep}
                            </div>
                        )}

                        {selectedRep && (
                            <div className="table-container">
                                <table className="styled-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            <th>Agent Name</th>
                                            <th>Phone Number</th>
                                            <th>Address</th>
                                            <th style={{ textAlign: 'center' }}>Visited</th>
                                            <th style={{ textAlign: 'center' }}>Active</th>
                                            <th style={{ textAlign: 'center' }}>POSM</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {agents
                                            .filter(a => {
                                                const rep = (a.repName && a.repName.trim() !== '') ? a.repName : 'Unassigned';
                                                if (rep !== selectedRep) return false;

                                                if (filterDetailedVisited && !a.isVisited) return false;
                                                if (filterDetailedActive && !a.isActive) return false;
                                                if (filterDetailedPOSM && !a.posmActive) return false;

                                                return true;
                                            })
                                            .map((a, idx) => (
                                                <tr key={a._id} style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                                                    <td style={{ fontWeight: 'bold', color: '#bae6fd' }}>{a.name}</td>
                                                    <td>{a.contactNumber1}{a.contactNumber2 ? `, ${a.contactNumber2}` : ''}</td>
                                                    <td style={{ fontSize: '0.9rem', opacity: 0.8 }}>{a.location}</td>
                                                    <td style={{ textAlign: 'center' }}>{a.isVisited ? <span style={{ color: '#4ade80' }}>✓</span> : <span style={{ color: '#ef4444' }}>✗</span>}</td>
                                                    <td style={{ textAlign: 'center' }}>{a.isActive ? <span style={{ color: '#4ade80' }}>✓</span> : <span style={{ color: '#ef4444' }}>✗</span>}</td>
                                                    <td style={{ textAlign: 'center' }}>{a.posmActive ? <span style={{ color: '#4ade80' }}>✓</span> : <span style={{ color: '#ef4444' }}>✗</span>}</td>
                                                </tr>
                                            ))}
                                        {agents.filter(a => {
                                            const rep = (a.repName && a.repName.trim() !== '') ? a.repName : 'Unassigned';
                                            if (rep !== selectedRep) return false;
                                            if (filterDetailedVisited && !a.isVisited) return false;
                                            if (filterDetailedActive && !a.isActive) return false;
                                            if (filterDetailedPOSM && !a.posmActive) return false;
                                            return true;
                                        }).length === 0 && (
                                                <tr>
                                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>No agents found matching your criteria</td>
                                                </tr>
                                            )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {!selectedRep && (
                            <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                                Please select a representative to view their agent details.
                            </div>
                        )}
                    </div>
                </section>
            )}

            {(adminRole === 'admin' || adminRole === 'superadmin') && activeTab === 'orders' && (
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
                                        if (adminRole === 'admin' && order.status !== 'COD' && order.status !== 'Paid') return false;
                                        if (!searchTerm) return true;
                                        const term = searchTerm.toLowerCase();
                                        return (
                                            (order.agentName || '').toLowerCase().includes(term) ||
                                            (order.customerName || '').toLowerCase().includes(term) ||
                                            (order.customerPhone || '').toLowerCase().includes(term) ||
                                            (order.additionalPhone || '').toLowerCase().includes(term) ||
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
                                                    <option  value="Pending Payment">Pending</option>
                                                    <option  value="Paid">Paid</option>
                                                    <option  value="COD">COD</option>
                                                    <option  value="Shipped">Shipped</option>
                                                    <option  value="Completed">Completed</option>
                                                    <option  value="Returned">Returned</option>
                                                    <option  value="Cancelled">Cancelled</option>
                                                    <option  value="Payment Failed">Payment Failed</option>
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
                activeTab === 'agents' && (
                    <div className="admin-grid-vertical" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <section className="glass-container">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <h2>{editingAgentId ? 'Edit Agent' : (formModeAdmin === 'assign' ? 'Assign to Pre-Registered QR' : 'Create New Agent')}</h2>
                                {!editingAgentId && (
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

                            <form onSubmit={editingAgentId ? handleUpdateAgent : handleCreateAgent}>
                                {!editingAgentId && formModeAdmin === 'assign' && (
                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(56,189,248,0.5)' }}>
                                        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', background: 'none', WebkitTextFillColor: 'initial' }}>
                                            Enter Pre-Registered QR Code
                                        </h3>
                                        <p style={{ fontSize: '0.85rem', color: '#bae6fd', marginBottom: '1rem', opacity: 0.8 }}>
                                            Enter the 6-character Agent Code from a pre-registered QR to assign these details to it.
                                        </p>
                                        <input
                                            type="text"
                                            placeholder="e.g. AB1234"
                                            value={newAgent.assignToCode}
                                            onChange={(e) => setNewAgent({ ...newAgent, assignToCode: e.target.value.toUpperCase() })}
                                            required={formModeAdmin === 'assign'}
                                            style={{ margin: 0, fontSize: '1rem', letterSpacing: '1px', maxWidth: '200px', fontWeight: 'bold' }}
                                        />
                                    </div>
                                )}

                                {/* Group 0B: Assign Draft to Code (Only visible in Edit Mode of a Draft) */}
                                {editingAgentId && newAgent.isDraft && (
                                    <div style={{ background: 'rgba(56,189,248,0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(56,189,248,0.5)' }}>
                                        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', background: 'none', WebkitTextFillColor: 'initial' }}>
                                            Assign to Pre-Registered QR Code (Optional)
                                        </h3>
                                        <p style={{ fontSize: '0.85rem', color: '#bae6fd', marginBottom: '1rem', opacity: 0.8 }}>
                                            You can turn this Draft into a real Agent Record by entering a pre-registered 6-character Agent Code.
                                        </p>
                                        <input
                                            type="text"
                                            placeholder="e.g. AB1234"
                                            value={newAgent.assignToCode}
                                            onChange={(e) => setNewAgent({ ...newAgent, assignToCode: e.target.value.toUpperCase() })}
                                            style={{ margin: 0, fontSize: '1rem', letterSpacing: '1px', maxWidth: '200px', fontWeight: 'bold' }}
                                        />
                                    </div>
                                )}

                                <div className="form-grid">
                                    <div className="input-group">
                                        <label>Agent Name *</label>
                                        <input type="text" placeholder="e.g. John Doe" value={newAgent.name} onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Location</label>
                                        <input type="text" placeholder="e.g. Colombo 05" value={newAgent.location} onChange={(e) => setNewAgent({ ...newAgent, location: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Contact Number 1</label>
                                        <input type="text" placeholder="Phone 1" value={newAgent.contactNumber1} onChange={(e) => setNewAgent({ ...newAgent, contactNumber1: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Contact Number 2</label>
                                        <input type="text" placeholder="Phone 2" value={newAgent.contactNumber2} onChange={(e) => setNewAgent({ ...newAgent, contactNumber2: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Representative Name</label>
                                        <select value={newAgent.repName} onChange={(e) => setNewAgent({ ...newAgent, repName: e.target.value })}>
                                            <option value="" >Select Rep Name</option>
                                            {reps.map(rep => (
                                                <option key={rep._id} value={rep.name} >{rep.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Remark</label>
                                        <input type="text" placeholder="Any notes..." value={newAgent.remark} onChange={(e) => setNewAgent({ ...newAgent, remark: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Username (Optional)</label>
                                        <input type="text" placeholder="Custom Username" value={newAgent.username} onChange={(e) => setNewAgent({ ...newAgent, username: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Password (Optional)</label>
                                        <input type="text" placeholder="Custom Password" value={newAgent.password} onChange={(e) => setNewAgent({ ...newAgent, password: e.target.value })} />
                                    </div>
                                </div>

                                <h3 className="section-title">Account Details</h3>
                                <div className="form-grid">
                                    <div className="input-group">
                                        <label>Bank Name</label>
                                        <input type="text" placeholder="e.g. BOC" value={newAgent.accountDetails.bankName} onChange={(e) => setNewAgent({ ...newAgent, accountDetails: { ...newAgent.accountDetails, bankName: e.target.value } })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Branch</label>
                                        <input type="text" placeholder="e.g. City Branch" value={newAgent.accountDetails.branch} onChange={(e) => setNewAgent({ ...newAgent, accountDetails: { ...newAgent.accountDetails, branch: e.target.value } })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Account Number</label>
                                        <input type="text" placeholder="e.g. 123456789" value={newAgent.accountDetails.accountNumber} onChange={(e) => setNewAgent({ ...newAgent, accountDetails: { ...newAgent.accountDetails, accountNumber: e.target.value } })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Account Name</label>
                                        <input type="text" placeholder="e.g. John Doe" value={newAgent.accountDetails.accountName} onChange={(e) => setNewAgent({ ...newAgent, accountDetails: { ...newAgent.accountDetails, accountName: e.target.value } })} />
                                    </div>
                                </div>

                                <h3 className="section-title">Status & Marks</h3>
                                <div className="form-grid" style={{ marginBottom: '1.5rem', alignContent: 'start', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                                    <div className="input-group" style={{ justifyContent: 'center' }}>
                                        <label style={{ cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1rem' }}>
                                            <input type="checkbox" checked={newAgent.isVisited} onChange={(e) => setNewAgent({ ...newAgent, isVisited: e.target.checked })} style={{ width: '22px', height: '22px', margin: 0 }} />
                                            Visited Agent
                                        </label>
                                        {newAgent.isVisited && (
                                            <input
                                                type="date"
                                                value={newAgent.visitedDate}
                                                onChange={(e) => setNewAgent({ ...newAgent, visitedDate: e.target.value })}
                                                style={{ marginTop: '0.5rem' }}
                                            />
                                        )}
                                    </div>
                                    <div className="input-group" style={{ justifyContent: 'center' }}>
                                        <label style={{ cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1rem' }}>
                                            <input type="checkbox" checked={newAgent.isActive} onChange={(e) => setNewAgent({ ...newAgent, isActive: e.target.checked })} style={{ width: '22px', height: '22px', margin: 0 }} />
                                            Active Agent
                                        </label>
                                    </div>
                                    <div className="input-group" style={{ justifyContent: 'center' }}>
                                        <label style={{ cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1rem' }}>
                                            <input type="checkbox" checked={newAgent.posmActive} onChange={(e) => setNewAgent({ ...newAgent, posmActive: e.target.checked })} style={{ width: '22px', height: '22px', margin: 0 }} />
                                            POSM Active Agent
                                        </label>
                                    </div>
                                </div>

                                <div className="input-group" style={{ marginBottom: '2rem' }}>
                                    <label style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold' }}>Revisited Dates (Mark old visits here)</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '30px' }}>
                                        {(newAgent.revisitedDates || []).map((d, index) => (
                                            <div key={index} style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', color: '#bae6fd', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {new Date(d).toLocaleDateString()}
                                                <button type="button" onClick={() => {
                                                    const newArr = [...newAgent.revisitedDates];
                                                    newArr.splice(index, 1);
                                                    setNewAgent({ ...newAgent, revisitedDates: newArr });
                                                }} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.2rem', lineHeight: 1, cursor: 'pointer', padding: 0, fontWeight: 'bold' }}>&times;</button>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <input type="date" id={`revisit-date-${editingAgentId || 'new'}`} style={{ flex: 1, margin: 0 }} />
                                        <button type="button" onClick={() => {
                                            const dateVal = document.getElementById(`revisit-date-${editingAgentId || 'new'}`).value;
                                            if (dateVal) {
                                                setNewAgent({ ...newAgent, revisitedDates: [...(newAgent.revisitedDates || []), dateVal] });
                                                document.getElementById(`revisit-date-${editingAgentId || 'new'}`).value = '';
                                            }
                                        }} className="btn-primary" style={{ whiteSpace: 'nowrap' }}>+ Add Date</button>
                                    </div>
                                </div>
                                <button type="submit" className="btn-primary" style={{ width: '100%', marginBottom: editingAgentId ? '0.5rem' : '0' }}>
                                    {editingAgentId ? 'Update Agent' : (formModeAdmin === 'assign' ? 'Assign to QR Code' : (formModeAdmin === 'draft' ? 'Save Details Only' : 'Generate Registration & QR'))}
                                </button>
                                {editingAgentId && (
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
                                    <h3>Agent Created Successfully!</h3>

                                    <div style={{ marginBottom: '2rem' }}>
                                        <img src={qrCode} alt="Agent QR" style={{ borderRadius: '8px', border: '5px solid white', maxWidth: '200px' }} />
                                        <div style={{ marginTop: '1rem', fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>
                                            CODE: <span style={{ color: 'var(--secondary-color)' }}>{createdAgent?.agentCode}</span>
                                        </div>
                                        <div style={{ marginTop: '0.5rem', fontSize: '1.1rem', color: 'white', opacity: 0.9 }}>
                                            NAME: {createdAgent?.name}
                                        </div>
                                        <br />
                                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                                            <button
                                                onClick={() => handleDownloadQR(createdAgent)}
                                                className="btn-primary"
                                                style={{ cursor: 'pointer' }}
                                            >
                                                Download SVG
                                            </button>
                                            <button
                                                onClick={() => handleDownloadJPG(createdAgent)}
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
                                            <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', opacity: 0.8 }}>Please save these credentials to share with the agent owner. The password will not be shown again.</p>

                                            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 'bold', color: 'var(--secondary-color)' }}>Code:</span>
                                                <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>{newCredentials.agentCode || 'N/A'}</code>

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
                                        placeholder="Number of Agents"
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
                                        Register {bulkCount || 0} Agents
                                    </button>
                                </div>

                                <div style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                                    OR
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'nowrap' }}>
                                    <select
                                        value={newAgent.repName}
                                        onChange={(e) => setNewAgent({ ...newAgent, repName: e.target.value })}
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

                            {newBulkAgents.length > 0 && (
                                <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3 style={{ margin: 0 }}>Newly Registered Agents ({newBulkAgents.length})</h3>
                                        {newBulkAgents.some(s => s.agentCode) && (
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <button
                                                    onClick={() => handleBatchPrint(newBulkAgents)}
                                                    className="btn-primary"
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                                                >
                                                    Print All New
                                                </button>
                                                <button
                                                    onClick={() => handleBatchDownloadZip(newBulkAgents)}
                                                    className="btn-primary"
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                                                >
                                                    Download All ZIP
                                                </button>
                                                <button
                                                    onClick={() => setNewBulkAgents([])}
                                                    className="btn-primary outline"
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                                                >
                                                    Clear List
                                                </button>
                                            </div>
                                        )}
                                        {!newBulkAgents.some(s => s.agentCode) && (
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <button
                                                    onClick={() => setNewBulkAgents([])}
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
                                                {newBulkAgents.map(agent => (
                                                    <tr key={agent._id}>
                                                        <td>{agent.name}</td>
                                                        <td style={{ fontWeight: 'bold', color: 'var(--secondary-color)' }}>{agent.agentCode || 'N/A'}</td>
                                                        <td>{agent.username}</td>
                                                        <td style={{ fontFamily: 'monospace' }}>{agent.plainPassword}</td>
                                                        <td>
                                                            {agent.agentCode ? (
                                                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                                    <button
                                                                        onClick={() => handleDownloadQR(agent)}
                                                                        className="btn-primary"
                                                                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                                                                        title="Download SVG"
                                                                    >
                                                                        SVG
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDownloadJPG(agent)}
                                                                        className="btn-primary"
                                                                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', background: '#eab308', border: 'none', color: '#000' }}
                                                                        title="Download JPG"
                                                                    >
                                                                        JPG
                                                                    </button>
                                                                </div>
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
                            {/* Filter agents based on search term and selectedAgentId */}
                            {/* This logic was previously inside an IIFE, now moved out for direct use */}
                            {(() => {
                                const filteredAgents = agents.filter(agent => {
                                    const rep = (agent.repName && agent.repName.trim() !== '') ? agent.repName : 'Unassigned';
                                    if (selectedRep && rep !== selectedRep) return false;
                                    if (selectedAgentId && agent._id !== selectedAgentId) return false;
                                    if (!searchTerm) return true;
                                    const term = searchTerm.toLowerCase();
                                    return (
                                        agent.name.toLowerCase().includes(term) ||
                                        (agent.location && agent.location.toLowerCase().includes(term)) ||
                                        (agent.username && agent.username.toLowerCase().includes(term)) ||
                                        (agent.agentCode && agent.agentCode.toLowerCase().includes(term)) ||
                                        (agent.repName && agent.repName.toLowerCase().includes(term))
                                    );
                                });

                                return (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <h2 style={{ margin: 0 }}>Registered Agents ({filteredAgents.length})</h2>
                                                <button
                                                    onClick={() => handleSelectAll(filteredAgents)}
                                                    className="btn-primary outline"
                                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                                                >
                                                    {selectedAgents.length === filteredAgents.length && filteredAgents.length > 0 ? 'Deselect All' : 'Select All'}
                                                </button>
                                            </div>

                                            {selectedAgents.length > 0 && (
                                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                                                    <span style={{ fontSize: '0.9rem' }}>{selectedAgents.length} Selected</span>
                                                    <button
                                                        onClick={() => handleBatchPrint(agents.filter(s => selectedAgents.includes(s._id)))}
                                                        className="btn-primary"
                                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                                                    >
                                                        Print Selected
                                                    </button>
                                                    <button
                                                        onClick={() => handleBatchDownloadZip(agents.filter(s => selectedAgents.includes(s._id)), 'svg')}
                                                        className="btn-primary"
                                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                                                    >
                                                        ZIP (SVG)
                                                    </button>
                                                    <button
                                                        onClick={() => handleBatchDownloadZip(agents.filter(s => selectedAgents.includes(s._id)), 'jpg')}
                                                        className="btn-primary"
                                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#eab308', borderColor: '#eab308', color: '#000' }}
                                                    >
                                                        ZIP (JPG)
                                                    </button>
                                                    <button
                                                        onClick={() => handleBatchDelete(agents.filter(s => selectedAgents.includes(s._id)))}
                                                        className="btn-primary danger"
                                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                                                    >
                                                        Delete Selected
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedAgents([])}
                                                        className="btn-primary outline"
                                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                                                    >
                                                        Clear Selection
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="agent-grid">
                                            {filteredAgents.map(agent => (

                                                <div key={agent._id} className={`agent-card ${selectedAgents.includes(agent._id) ? 'selected' : ''}`} style={{ position: 'relative', border: selectedAgents.includes(agent._id) ? '2px solid var(--secondary-color)' : 'none' }}>
                                                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedAgents.includes(agent._id)}
                                                            onChange={() => handleSelectAgent(agent._id)}
                                                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <div>
                                                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                                {agent.name}
                                                                {agent.isVisited && <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '12px', background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>Visited</span>}
                                                                {agent.isActive && <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '12px', background: 'rgba(56,189,248,0.2)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }}>Active</span>}
                                                                {agent.posmActive && <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.4rem', borderRadius: '12px', background: 'rgba(192,132,252,0.2)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.3)', whiteSpace: 'nowrap' }}>POSM</span>}
                                                                {!agent.agentCode && <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.4rem', borderRadius: '12px', background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', whiteSpace: 'nowrap' }}>DRAFT</span>}
                                                            </h3>
                                                            <div className="agent-meta" style={{ marginTop: '0.25rem' }}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                                                {agent.location || 'No Location'}
                                                            </div>
                                                            <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', opacity: 0.6 }}>
                                                                Created: {agent.createdAt ? new Date(agent.createdAt).toLocaleDateString() : 'N/A'}
                                                            </div>
                                                            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--secondary-color)', fontWeight: 'bold' }}>
                                                                Code: {agent.agentCode || 'N/A'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="credential-box">
                                                        <div className="credential-row">
                                                            <span style={{ opacity: 0.6 }}>User:</span>
                                                            <span className="mono-text">{agent.username}</span>
                                                        </div>
                                                        <div className="credential-row">
                                                            <span style={{ opacity: 0.6 }}>Pass:</span>
                                                            <span className="mono-text" style={{ color: agent.plainPassword ? '#4ade80' : 'inherit' }}>
                                                                {agent.plainPassword || '••••••'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {expandedAgentId === agent._id && (
                                                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
                                                            <p style={{ margin: '0.2rem 0' }}><strong>Contact 1:</strong> {agent.contactNumber1 || agent.contactNumber || 'N/A'}</p>
                                                            <p style={{ margin: '0.2rem 0' }}><strong>Contact 2:</strong> {agent.contactNumber2 || 'N/A'}</p>
                                                            <p style={{ margin: '0.2rem 0' }}><strong>Rep Name:</strong> {agent.repName || 'N/A'}</p>
                                                            <p style={{ margin: '0.2rem 0' }}><strong>Remark:</strong> {agent.remark || 'N/A'}</p>
                                                            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Bank:</strong> {agent.accountDetails?.bankName || 'N/A'}</p>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Branch:</strong> {agent.accountDetails?.branch || 'N/A'}</p>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Account No:</strong> {agent.accountDetails?.accountNumber || 'N/A'}</p>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Account Name:</strong> {agent.accountDetails?.accountName || 'N/A'}</p>
                                                            </div>
                                                            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Visited Agent:</strong> <span style={{ color: agent.isVisited ? '#4ade80' : '#ef4444' }}>{agent.isVisited ? 'Yes' : 'No'}</span></p>
                                                                {agent.isVisited && agent.visitedDate && (
                                                                    <p style={{ margin: '0.2rem 0' }}><strong>Visited Date:</strong> {new Date(agent.visitedDate).toLocaleDateString()}</p>
                                                                )}
                                                                {agent.revisitedDates && agent.revisitedDates.length > 0 && (
                                                                    <p style={{ margin: '0.2rem 0' }}><strong>Revisited Dates:</strong> {agent.revisitedDates.map(d => new Date(d).toLocaleDateString()).join(', ')}</p>
                                                                )}
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Active Agent:</strong> <span style={{ color: agent.isActive ? '#4ade80' : '#ef4444' }}>{agent.isActive ? 'Yes' : 'No'}</span></p>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>POSM Active Agent:</strong> <span style={{ color: agent.posmActive ? '#4ade80' : '#ef4444' }}>{agent.posmActive ? 'Yes' : 'No'}</span></p>
                                                            </div>
                                                            <p style={{ margin: '0.2rem 0', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                                <strong>Last Edited By:</strong> {agent.editedBy || 'N/A'}
                                                            </p>
                                                        </div>
                                                    )}

                                                    <div className="card-actions">
                                                        <button
                                                            onClick={() => setExpandedAgentId(expandedAgentId === agent._id ? null : agent._id)}
                                                            className="icon-btn info"
                                                            title="Toggle Details"
                                                            style={{ border: '1px solid rgba(255,255,255,0.2)' }}
                                                        >
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownloadQR(agent)}
                                                            className="icon-btn success"
                                                            title="Download SVG"
                                                        >
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownloadJPG(agent)}
                                                            className="icon-btn success"
                                                            title="Download JPG"
                                                            style={{ backgroundColor: '#eab308', color: '#000' }}
                                                        >
                                                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>JPG</span>
                                                        </button>
                                                        <a
                                                            href={`/agent-order/${agent.uniqueId}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="icon-btn primary"
                                                            title="Visit Shop"
                                                            style={{ backgroundColor: '#10b981' }}
                                                        >
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                                        </a>
                                                        <button
                                                            onClick={() => handleEditClick(agent)}
                                                            className="icon-btn primary"
                                                            title="Edit Agent"
                                                        >
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteAgent(agent._id)}
                                                            className="icon-btn danger"
                                                            title="Delete Agent"
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
                        <div className="agent-grid" style={{ marginTop: '1rem' }}>
                            {products.map(p => (
                                <div key={p._id} className="agent-card" style={{ gap: '0.5rem' }}>
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
            )}

            {
                activeTab === 'monitor' && (
                    <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <section className="glass-container">
                            <h2>Agent Performance</h2>
                            <div className="table-container">
                                <table className="styled-table">
                                    <thead>
                                        <tr>
                                            <th>Agent</th>
                                            <th>Valid Orders</th>
                                            <th>Returns</th>
                                            <th>Cancelled</th>
                                            <th>Items Sold</th>
                                            <th>Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {agentPerformance
                                            .filter(stat => {
                                                if (!searchTerm) return true;
                                                return (stat.agentName || '').toLowerCase().includes(searchTerm.toLowerCase());
                                            })
                                            .map(stat => (
                                                <tr key={stat._id}>
                                                    <td>{stat.agentName || 'Unknown'}</td>
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
                                                        title="Edit"
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
            )}

            {(adminRole === 'admin' || adminRole === 'superadmin') && activeTab === 'reports' && (
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
                            <h3 style={{ margin: 0 }}>Agent List Report</h3>
                            <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem', flex: 1 }}>Export a complete list of all registered agents including their contact, account details, and activity-marks.</p>
                            <button onClick={handleExportAgents} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Download Agents CSV
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
                            <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem', flex: 1 }}>Export a summarized performance table showing the count of orders, returns, and total revenue per agent.</p>
                            <button onClick={handleExportPerformance} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Download Performance CSV
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
            )}

        </div >
    );
};

export default AgentAdminDashboard;
