import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const API_URL = import.meta.env.VITE_API_URL || 'https://salonfadna-backend.onrender.com/api';
const BASE_URL = 'https://www.portal.fadnals.lk';

const QRGeneratorPage = () => {
    const navigate = useNavigate();
    const [salons, setSalons] = useState([]);
    const [agents, setAgents] = useState([]);
    const [netAgents, setNetAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState('salon');
    const [searchTerm, setSearchTerm] = useState('');
    const [qrImages, setQrImages] = useState({});       // { id: dataURL }
    const [selectedIds, setSelectedIds] = useState([]);
    const [progress, setProgress] = useState('');

    useEffect(() => {
        if (!localStorage.getItem('adminUser')) navigate('/admin-login');
    }, [navigate]);

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true);
            const [sRes, aRes, nRes] = await Promise.all([
                axios.get(`${API_URL}/salons`),
                axios.get(`${API_URL}/agents`),
                axios.get(`${API_URL}/net-agents`)
            ]);
            if (sRes.data.success) setSalons(sRes.data.salons);
            if (aRes.data.success) setAgents(aRes.data.agents);
            if (nRes.data.success) setNetAgents(nRes.data.agents);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ---- QR generation helpers ----
    const getQrUrl = (item, type) => {
        if (type === 'salon') return `${BASE_URL}/order/${item.uniqueId}`;
        if (type === 'agent') return `${BASE_URL}/agent-order/${item.uniqueId}`;
        if (type === 'netAgent') return `${BASE_URL}/net-agent-order/${item.uniqueId}`;
        return '';
    };

    const getCode = (item, type) => {
        if (type === 'salon' || type === 'salonCOD') return item.salonCode || 'Draft';
        return item.agentCode || 'Draft';
    };

    const generateQRSVG = async (item, type) => {
        const url = getQrUrl(item, type);
        const code = getCode(item, type);
        const label = type === 'salonCOD'
            ? `${item.name} (COD)`
            : `${item.name} | ${code}`;

        const svgString = await QRCode.toString(url, {
            type: 'svg', margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
        });

        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const svg = doc.documentElement;
        const [vx, vy, vw, vh] = svg.getAttribute('viewBox').split(' ').map(Number);
        const textSpace = vh * 0.2;
        svg.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh + textSpace}`);

        const bg = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('fill', '#ffffff');
        bg.setAttribute('x', vx); bg.setAttribute('y', vy);
        bg.setAttribute('width', vw); bg.setAttribute('height', vh + textSpace);
        svg.insertBefore(bg, svg.firstChild);

        const text1 = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
        text1.setAttribute('x', vw / 2); text1.setAttribute('y', vh + textSpace * 0.45);
        text1.setAttribute('text-anchor', 'middle');
        text1.setAttribute('font-family', 'Arial, sans-serif');
        text1.setAttribute('font-size', `${vw * 0.055}`);
        text1.setAttribute('font-weight', 'bold');
        text1.setAttribute('fill', '#1e293b');
        text1.textContent = item.name;
        svg.appendChild(text1);

        const text2 = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
        text2.setAttribute('x', vw / 2); text2.setAttribute('y', vh + textSpace * 0.82);
        text2.setAttribute('text-anchor', 'middle');
        text2.setAttribute('font-family', 'Arial, sans-serif');
        text2.setAttribute('font-size', `${vw * 0.048}`);
        text2.setAttribute('fill', type === 'netAgent' ? '#7c3aed' : '#0f766e');
        text2.textContent = type === 'netAgent' ? `${code} — Net.Agent` : `Code: ${code}`;
        svg.appendChild(text2);

        return new XMLSerializer().serializeToString(svg);
    };

    const generateQRDataURL = async (item, type) => {
        const url = getQrUrl(item, type);
        return await QRCode.toDataURL(url, { margin: 2, width: 200 });
    };

    // ---- Generate preview for display ----
    const handleGenerateAll = async () => {
        setGenerating(true);
        const items = activeTab === 'salon' ? salons.filter(s => s.salonCode)
            : activeTab === 'salonCOD' ? salons.filter(s => s.salonCode)
                : activeTab === 'agent' ? agents.filter(a => a.agentCode)
                    : netAgents.filter(a => a.agentCode);

        const newQrs = {};
        for (let i = 0; i < items.length; i++) {
            setProgress(`Generating ${i + 1} / ${items.length}...`);
            const item = items[i];
            const dataUrl = await generateQRDataURL(item, activeTab);
            newQrs[item._id] = dataUrl;
        }
        setQrImages(prev => ({ ...prev, ...newQrs }));
        setProgress('');
        setGenerating(false);
    };

    // ---- Batch Print ----
    const handleBatchPrint = async (itemsToPrint, type) => {
        if (!itemsToPrint.length) return alert('No items to print');
        const pw = window.open('', '_blank');
        pw.document.write(`<html><head><title>Print QR Codes — ${type}</title>`);
        pw.document.write(`<style>
            body { font-family: Arial, sans-serif; background: #fff; margin: 0; padding: 10px; }
            .grid { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; }
            .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; text-align: center; width: 190px; page-break-inside: avoid; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.06); }
            .card svg { width: 100%; height: auto; }
            .name { font-weight: bold; font-size: 12px; margin-top: 6px; color: #1e293b; }
            .code { font-size: 11px; margin-top: 2px; color: #64748b; }
            .print-btn { position: fixed; top: 10px; right: 10px; padding: 10px 20px; background: #0f766e; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold; }
            @media print { .print-btn { display: none; } }
        </style></head><body>`);
        pw.document.write('<button class="print-btn" onclick="window.print()">🖨 PRINT NOW</button>');
        pw.document.write('<div class="grid">');

        for (const item of itemsToPrint) {
            try {
                setProgress(`Building print for ${item.name}...`);
                const svgString = await generateQRSVG(item, type);
                pw.document.write(`
                    <div class="card">
                        ${svgString}
                        <div class="name">${item.name}</div>
                        <div class="code">${getCode(item, type)}</div>
                    </div>`);
            } catch (e) { console.error(e); }
        }

        pw.document.write('</div></body></html>');
        pw.document.close();
        setProgress('');
    };

    // ---- Batch ZIP Download ----
    const handleBatchZip = async (itemsToZip, type) => {
        if (!itemsToZip.length) return alert('No items to download');
        const zip = new JSZip();
        for (let i = 0; i < itemsToZip.length; i++) {
            const item = itemsToZip[i];
            setProgress(`Packaging ${i + 1}/${itemsToZip.length}: ${item.name}...`);
            try {
                const svg = await generateQRSVG(item, type);
                const safeName = item.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
                const code = getCode(item, type);
                zip.file(`${safeName}_${code}.svg`, svg);
            } catch (e) { console.error(e); }
        }
        setProgress('Creating ZIP file...');
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `qr_codes_${type}_${Date.now()}.zip`);
        setProgress('');
    };

    // ---- Current items list ----
    const currentItems = (tab) => {
        const src = tab === 'salon' || tab === 'salonCOD' ? salons
            : tab === 'agent' ? agents : netAgents;
        const filtered = src.filter(item => {
            const hasCode = tab === 'salon' || tab === 'salonCOD'
                ? !!item.salonCode
                : !!item.agentCode;
            if (!hasCode) return false;
            if (!searchTerm) return true;
            const t = searchTerm.toLowerCase();
            return (item.name || '').toLowerCase().includes(t) ||
                ((item.salonCode || item.agentCode) || '').toLowerCase().includes(t) ||
                (item.location || '').toLowerCase().includes(t);
        });
        return filtered;
    };

    const items = currentItems(activeTab);

    const toggleSelect = (id) =>
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const toggleSelectAll = () =>
        setSelectedIds(selectedIds.length === items.length ? [] : items.map(i => i._id));

    const selectedItems = items.filter(i => selectedIds.includes(i._id));

    const tabConfig = [
        { key: 'salon', label: '🏪 Salon (Online)', color: '#0f766e', count: salons.filter(s => s.salonCode).length },
        { key: 'agent', label: '🤝 Agents', color: '#2563eb', count: agents.filter(a => a.agentCode).length },
        { key: 'netAgent', label: '🌐 Net.Agents', color: '#7c3aed', count: netAgents.filter(a => a.agentCode).length },
    ];

    return (
        <div className="container animate-fade-in">
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src="/Fadna New Logo.png" alt="Fadna Logo" style={{ maxHeight: '40px' }} />
                    <div>
                        <h1 style={{ margin: 0 }}>QR Code Generator</h1>
                        <p style={{ margin: 0, opacity: 0.6, fontSize: '0.85rem' }}>Generate, print & download all QR codes</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn-primary" style={{ padding: '0.5rem 1rem', opacity: 0.7 }} onClick={() => navigate('/admin')}>Salon Dashboard</button>
                    <button className="btn-primary" style={{ padding: '0.5rem 1rem', opacity: 0.7 }} onClick={() => navigate('/agent-admin')}>Agent Dashboard</button>
                    <button className="btn-primary" style={{ padding: '0.5rem 1rem', opacity: 0.7 }} onClick={() => navigate('/net-agent-admin')}>Net.Agent Dashboard</button>
                    <button className="btn-primary outline" style={{ padding: '0.5rem 1rem', borderColor: '#ef4444', color: '#ef4444' }}
                        onClick={() => { localStorage.removeItem('adminUser'); navigate('/admin-login'); }}>Log Out</button>
                </div>
            </header>

            {/* Type Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                {tabConfig.map(t => (
                    <button key={t.key}
                        onClick={() => { setActiveTab(t.key); setSelectedIds([]); setSearchTerm(''); }}
                        style={{
                            padding: '0.6rem 1.2rem', borderRadius: '10px', border: `2px solid ${t.color}`,
                            background: activeTab === t.key ? t.color : 'transparent',
                            color: activeTab === t.key ? '#fff' : t.color,
                            fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.9rem'
                        }}>
                        {t.label} <span style={{ opacity: 0.8, fontSize: '0.8rem' }}>({t.count})</span>
                    </button>
                ))}
            </div>

            {/* Toolbar */}
            <div className="glass-container" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input type="text" placeholder="Search by name or code..."
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                padding: '0.6rem 1rem', borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(255,255,255,0.1)', color: 'white', outline: 'none', width: '250px'
                            }} />
                        <span style={{ opacity: 0.6, fontSize: '0.85rem' }}>{items.length} items</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button className="btn-primary" onClick={handleGenerateAll} disabled={generating}
                            style={{ padding: '0.6rem 1.2rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                            {generating ? '⚙️ Generating...' : '⚡ Generate All Previews'}
                        </button>
                        <button className="btn-primary"
                            onClick={() => handleBatchPrint(selectedItems.length > 0 ? selectedItems : items, activeTab)}
                            style={{ padding: '0.6rem 1.2rem' }}>
                            🖨 Print {selectedItems.length > 0 ? `(${selectedItems.length})` : 'All'}
                        </button>
                        <button className="btn-primary"
                            onClick={() => handleBatchZip(selectedItems.length > 0 ? selectedItems : items, activeTab)}
                            style={{ padding: '0.6rem 1.2rem' }}>
                            📦 ZIP {selectedItems.length > 0 ? `(${selectedItems.length})` : 'All'}
                        </button>
                    </div>
                </div>

                {/* Progress */}
                {progress && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(99,102,241,0.15)', borderRadius: '8px', color: '#818cf8', fontSize: '0.9rem' }}>
                        ⚙️ {progress}
                    </div>
                )}

                {/* Select All */}
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="checkbox"
                            checked={selectedIds.length === items.length && items.length > 0}
                            onChange={toggleSelectAll} />
                        <span style={{ fontSize: '0.9rem' }}>
                            {selectedIds.length === items.length && items.length > 0
                                ? 'Deselect All' : `Select All (${items.length})`}
                        </span>
                    </label>
                    {selectedIds.length > 0 && (
                        <span style={{ color: '#818cf8', fontSize: '0.85rem' }}>
                            {selectedIds.length} selected
                        </span>
                    )}
                </div>
            </div>

            {/* QR Grid */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>Loading data...</div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '1.5rem'
                }}>
                    {items.map(item => {
                        const isSelected = selectedIds.includes(item._id);
                        const qrImg = qrImages[item._id];
                        const typeColor = tabConfig.find(t => t.key === activeTab)?.color || '#0f766e';
                        const code = getCode(item, activeTab);
                        const url = getQrUrl(item, activeTab);

                        return (
                            <div key={item._id}
                                onClick={() => toggleSelect(item._id)}
                                style={{
                                    background: isSelected ? `${typeColor}18` : 'rgba(255,255,255,0.05)',
                                    border: `2px solid ${isSelected ? typeColor : 'rgba(255,255,255,0.1)'}`,
                                    borderRadius: '14px', padding: '1.25rem',
                                    textAlign: 'center', cursor: 'pointer',
                                    transition: 'all 0.2s', position: 'relative'
                                }}>

                                {/* Selection checkbox */}
                                <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                                    <input type="checkbox" checked={isSelected}
                                        onChange={() => toggleSelect(item._id)}
                                        onClick={e => e.stopPropagation()} />
                                </div>

                                {/* QR Image or Placeholder */}
                                {qrImg ? (
                                    <img src={qrImg} alt="QR" style={{ width: '100%', borderRadius: '8px', background: '#fff', padding: '4px' }} />
                                ) : (
                                    <div style={{
                                        width: '100%', paddingTop: '100%', position: 'relative',
                                        background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '0.5rem'
                                    }}>
                                        <div style={{
                                            position: 'absolute', inset: 0, display: 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                            flexDirection: 'column', gap: '0.25rem', opacity: 0.4
                                        }}>
                                            <span style={{ fontSize: '2rem' }}>⬛</span>
                                            <span style={{ fontSize: '0.75rem' }}>Click Generate</span>
                                        </div>
                                    </div>
                                )}

                                {/* Info */}
                                <div style={{ marginTop: '0.75rem' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.25rem', wordBreak: 'break-word' }}>
                                        {item.name}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: typeColor, marginBottom: '0.25rem' }}>
                                        {code}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.5, wordBreak: 'break-all' }}>
                                        {url.replace('https://www.portal.fadnals.lk', '')}
                                    </div>
                                </div>

                                {/* Individual action buttons */}
                                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem' }} onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={async () => {
                                            const dataUrl = await generateQRDataURL(item, activeTab);
                                            setQrImages(prev => ({ ...prev, [item._id]: dataUrl }));
                                        }}
                                        style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>
                                        🔄 Gen
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const svg = await generateQRSVG(item, activeTab);
                                            const safeName = item.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
                                            saveAs(new Blob([svg], { type: 'image/svg+xml' }), `${safeName}_${code}.svg`);
                                        }}
                                        style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', background: typeColor, border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                        ⬇ SVG
                                    </button>
                                    <a href={url} target="_blank" rel="noopener noreferrer"
                                        style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', background: '#10b981', color: 'white', borderRadius: '6px', textAlign: 'center', textDecoration: 'none', fontWeight: 'bold' }}>
                                        👁️ View
                                    </a>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(url);
                                            alert('Link copied to clipboard!');
                                        }}
                                        style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>
                                        🔗
                                    </button>
                                    <button
                                        onClick={() => handleBatchPrint([item], activeTab)}
                                        style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>
                                        🖨
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {items.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', opacity: 0.4 }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                            <p>No registered {activeTab === 'salon' || activeTab === 'salonCOD' ? 'salons' : activeTab === 'agent' ? 'agents' : 'net agents'} found.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default QRGeneratorPage;
