import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://salonfadna-backend.onrender.com/api';

const NetAgentOrderPage = () => {
    const { agentId } = useParams();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [paymentMethod, setPaymentMethod] = useState('Online'); // 'Online' or 'Cash on Delivery'
    const [agent, setAgent] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cart, setCart] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [payhereParams, setPayhereParams] = useState(null);
    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        additionalPhone: '',
        address: '',
        city: ''
    });
    const [orderId, setOrderId] = useState(null);

    useEffect(() => {
        if (!agentId) { setError("No Agent ID provided."); setLoading(false); return; }
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const agentRes = await axios.get(`${API_URL}/net-agents/${agentId}`);
                if (agentRes.data.success) setAgent(agentRes.data.agent);
                else throw new Error(agentRes.data.message || "Failed to load agent");

                const productRes = await axios.get(`${API_URL}/products`);
                if (productRes.data.success) {
                    // Show Satiny (salon) products only
                    const filtered = productRes.data.products.filter(
                        p => !p.target || p.target === 'both' || p.target === 'salon'
                    );
                    setProducts(filtered);
                }
            } catch (err) {
                setError(err.response?.data?.message || err.message || "Failed to load shop.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [agentId]);

    // PayHere integration — triggered when payhereParams is set
    useEffect(() => {
        if (payhereParams && window.payhere) {
            window.payhere.onCompleted = async function onCompleted(orderId) {
                console.log("Payment completed. OrderID: " + orderId);
                try {
                    await axios.put(`${API_URL}/orders/${payhereParams.order_id}/status`, { status: 'Paid' });
                    navigate('/payment/success', { state: { orderId: payhereParams.order_id } });
                } catch (err) {
                    console.error("Failed to update status to Paid", err);
                    alert("Payment successful but failed to update order status. Please contact support.");
                }
            };
            window.payhere.onDismissed = async function onDismissed() {
                try {
                    await axios.put(`${API_URL}/orders/${payhereParams.order_id}/status`, { status: 'Payment Failed' });
                } catch (err) {
                    console.error("Failed to update status", err);
                }
                setLoading(false);
                alert("Payment was dismissed. Order marked as Payment Failed.");
            };
            window.payhere.onError = async function onError(err) {
                try {
                    await axios.put(`${API_URL}/orders/${payhereParams.order_id}/status`, { status: 'Payment Failed' });
                } catch (e) {
                    console.error(e);
                }
                setError("Payment Error: " + err);
                setLoading(false);
            };
            try {
                window.payhere.startPayment(payhereParams);
            } catch (err) {
                console.error("Error starting PayHere:", err);
                setError("Failed to start payment gateway.");
            }
        }
    }, [payhereParams, navigate]);

    const updateQuantity = (itemId, change) => {
        setCart(prev => {
            const newQty = Math.max(0, (prev[itemId] || 0) + change);
            if (newQty === 0) { const { [itemId]: _, ...rest } = prev; return rest; }
            return { ...prev, [itemId]: newQty };
        });
    };

    const calculateTotal = () =>
        Object.entries(cart).reduce((total, [itemId, qty]) => {
            const item = products.find(i => i._id === itemId);
            return total + ((item ? item.finalPrice : 0) * qty);
        }, 0);

    const handleNextStep = async () => {
        if (step === 1) {
            if (!formData.customerName || !formData.customerPhone || !formData.city || !formData.address) {
                alert("Please fill in Name, Phone, Address, and City");
                return;
            }
            try {
                const res = await axios.post(`${API_URL}/orders/draft`, {
                    netAgentId: agentId,
                    customerName: formData.customerName,
                    customerPhone: formData.customerPhone,
                    additionalPhone: formData.additionalPhone,
                    address: formData.address,
                    city: formData.city
                });
                if (res.data.success) { setOrderId(res.data.orderId); setStep(2); }
            } catch (err) {
                alert("Failed to save details. Please try again.");
            }
        } else if (step === 2) {
            setStep(3);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const items = Object.entries(cart).map(([itemId, qty]) => {
            const item = products.find(i => i._id === itemId);
            return { productId: item._id, productName: item.name, quantity: qty, price: item.finalPrice };
        });
        if (items.length === 0) return alert('Please add items to cart');

        setSubmitting(true);
        try {
            const res = await axios.post(`${API_URL}/orders`, {
                orderId,
                netAgentId: agentId,
                agentId,
                customerName: formData.customerName,
                customerPhone: formData.customerPhone,
                additionalPhone: formData.additionalPhone,
                address: formData.address,
                city: formData.city,
                items,
                totalAmount: calculateTotal(),
                paymentMethod
            });

            if (res.data.success) {
                if (res.data.cod) {
                    // COD: go straight to success
                    navigate('/payment/success', { state: { orderId: res.data.orderId, cod: true } });
                } else {
                    // Online: trigger PayHere
                    setPayhereParams(res.data.payhere);
                }
            }
        } catch (err) {
            alert(`Failed to place order: ${err.response?.data?.message || err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '2rem' }}>Loading...</div>;
    if (error) return (
        <div className="container" style={{ textAlign: 'center', marginTop: '2rem', color: '#ef4444' }}>
            <h2>Something went wrong</h2>
            <p style={{ fontWeight: 'bold' }}>{error}</p>
            <button onClick={() => window.location.reload()} className="btn-primary" style={{ marginTop: '1rem' }}>Try Again</button>
        </div>
    );
    if (!agent) return <div className="container">Agent not found.</div>;

    return (
        <div className="container animate-fade-in" style={{ maxWidth: '600px' }}>
            <div className="logo-container">
                <img src="/Fadna New Logo.png" alt="Fadna Logo" className="site-logo" />
            </div>

            {/* Badge */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <span style={{
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff', borderRadius: '20px', padding: '0.4rem 1.2rem',
                    fontSize: '0.85rem', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(99,102,241,0.4)'
                }}>🌐 Net.Agent — Satiny</span>
            </div>

            {/* Step dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {[1, 2, 3].map(s => (
                    <div key={s} style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: step >= s ? 'var(--secondary-color)' : 'rgba(255,255,255,0.2)'
                    }} />
                ))}
            </div>

            <div className="glass-container" style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '0.5rem' }}>{agent.name}</h2>
                <p style={{ margin: 0, opacity: 0.7 }}>
                    {step === 1 ? "Enter your details" : step === 2 ? "About Satiny" : "Select your products"}
                </p>
            </div>

            {/* Step 1: Details */}
            {step === 1 && (
                <div className="animate-fade-in">
                    <h3>Your Details</h3>
                    <input type="text" placeholder="Your Name" value={formData.customerName}
                        onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                        style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', borderRadius: '8px', border: '1px solid #ccc' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <input type="tel" placeholder="Phone Number" value={formData.customerPhone}
                            onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                            style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }} />
                        <input type="tel" placeholder="Additional Phone (Optional)" value={formData.additionalPhone}
                            onChange={e => setFormData({ ...formData, additionalPhone: e.target.value })}
                            style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }} />
                    </div>
                    <input type="text" placeholder="Address" value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', borderRadius: '8px', border: '1px solid #ccc' }} />
                    <input type="text" placeholder="City" value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }} />
                    <button onClick={handleNextStep} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Next</button>
                </div>
            )}

            {/* Step 2: Satiny Intro */}
            {step === 2 && (
                <div className="animate-fade-in" style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: '1.5rem', borderRadius: '12px', overflow: 'hidden' }}>
                        <iframe width="100%" height="315"
                            src="https://www.youtube.com/embed/pH4Sgy8ihQ4"
                            title="Satiny" frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen />
                    </div>
                    <div style={{ marginBottom: '2rem', lineHeight: '1.6', color: 'rgba(255,255,255,0.9)', textAlign: 'left' }}>
                        <h3>Satiny</h3>
                        <p>හිසකෙස් වැටීම බොහෝ විට නොදැනිම ආරම්භ වෙයි. SATINY යනු විද්‍යාත්මකව සනාථ කළ හර්බල් විසඳුමක් වන අතර, හිසකෙස් වැටීමට ප්‍රධාන හේතුවක් වන alpha-reductase එන්සයිමය ස්වභාවිකව අවහිර කරමින් මුල් හේතුවටම ප්‍රතිකාර කරයි.</p>
                        <p>කොළඹ විශ්වවිද්‍යාලයේ IBMBB ආයතනය සහ ආයුර්වේද දෙපාර්තමේන්තුව විසින් සංවර්ධනය කරන ලද SATINY, නවීන පර්යේෂණ හා ඖෂධීය ශාක සාරයන් එකතු කර නිර්මාණය කර ඇත.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => setStep(1)} style={{ flex: 1, padding: '0.8rem', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', borderRadius: '8px' }}>Back</button>
                        <button onClick={handleNextStep} className="btn-primary" style={{ flex: 1 }}>Order Now</button>
                    </div>
                </div>
            )}

            {/* Step 3: Catalog & Order */}
            {step === 3 && (
                <form onSubmit={handleSubmit} className="animate-fade-in">
                    <div className="catalog-grid" style={{ marginBottom: '2rem' }}>
                        <h3>Catalog</h3>
                        {products.map(item => (
                            <div key={item._id} className="product-card">
                                <div>
                                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        {item.name}
                                        {item.discountType !== 'none' && (
                                            <span className="status-badge cancelled" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                                                {item.discountType === 'percentage' ? `${item.discountValue}% OFF` : `Rs.${item.discountValue} OFF`}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        {item.discountType !== 'none' && (
                                            <span style={{ textDecoration: 'line-through', opacity: 0.5, fontSize: '0.9rem' }}>Rs.{item.price}</span>
                                        )}
                                        <span style={{ color: 'var(--secondary-color)', fontWeight: 'bold' }}>Rs.{item.finalPrice}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <button type="button" onClick={() => updateQuantity(item._id, -1)} className="qty-btn minus">-</button>
                                    <span style={{ width: '20px', textAlign: 'center', fontWeight: 'bold' }}>{cart[item._id] || 0}</span>
                                    <button type="button" onClick={() => updateQuantity(item._id, 1)} className="qty-btn plus">+</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Payment Method Selection */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h3>Payment Method</h3>
                        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                background: paymentMethod === 'Online' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                                padding: '1rem', borderRadius: '10px', cursor: 'pointer',
                                border: paymentMethod === 'Online' ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.15)',
                                transition: 'all 0.2s'
                            }}>
                                <input type="radio" name="paymentMethod" value="Online"
                                    checked={paymentMethod === 'Online'}
                                    onChange={() => setPaymentMethod('Online')}
                                    style={{ width: 'auto', marginBottom: 0 }} />
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>💳 Online Payment</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Pay securely via card or bank</div>
                                </div>
                            </label>
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                background: paymentMethod === 'Cash on Delivery' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.03)',
                                padding: '1rem', borderRadius: '10px', cursor: 'pointer',
                                border: paymentMethod === 'Cash on Delivery' ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.15)',
                                transition: 'all 0.2s'
                            }}>
                                <input type="radio" name="paymentMethod" value="Cash on Delivery"
                                    checked={paymentMethod === 'Cash on Delivery'}
                                    onChange={() => setPaymentMethod('Cash on Delivery')}
                                    style={{ width: 'auto', marginBottom: 0 }} />
                                <div>
                                    <div style={{ fontWeight: 'bold', color: paymentMethod === 'Cash on Delivery' ? '#f59e0b' : 'inherit' }}>🚚 Cash on Delivery</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Pay when your order arrives</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Sticky Total + Submit */}
                    <div className="glass-container" style={{ position: 'sticky', bottom: '1rem', background: 'rgba(15,23,42,0.9)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Total</span>
                            <span style={{ fontSize: '1.5rem', color: 'var(--secondary-color)', fontWeight: 'bold' }}>Rs.{calculateTotal()}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="button" onClick={() => setStep(2)}
                                style={{ flex: 1, padding: '0.8rem', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', borderRadius: '8px' }}>Back</button>
                            <button type="submit" className="btn-primary" style={{ flex: 2, fontSize: '1.1rem' }} disabled={submitting}>
                                {submitting ? 'Placing Order...' : paymentMethod === 'Cash on Delivery' ? '🚚 Place COD Order' : '💳 Pay Online'}
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
};

export default NetAgentOrderPage;
