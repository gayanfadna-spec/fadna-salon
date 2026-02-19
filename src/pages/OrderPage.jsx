import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://salonfadna-backend.onrender.com/api';

const OrderPage = () => {
    const { salonId } = useParams();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [paymentMethod, setPaymentMethod] = useState('Online');
    const [salon, setSalon] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cart, setCart] = useState({});
    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        additionalPhone: '',
        address: '',
        city: ''
    });
    const [orderId, setOrderId] = useState(null);
    const [payhereParams, setPayhereParams] = useState(null);

    useEffect(() => {
        // ... (existing fetchData logic remains the same, assuming it's correct)
        console.log("OrderPage Mounted. SalonID:", salonId);
        if (!salonId) {
            setError("No Salon ID provided in URL.");
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const salonRes = await axios.get(`${API_URL}/salons/${salonId}`);
                if (salonRes.data.success) {
                    setSalon(salonRes.data.salon);
                } else {
                    throw new Error(salonRes.data.message || "Failed to load salon data");
                }

                const productRes = await axios.get(`${API_URL}/products`);
                if (productRes.data.success) {
                    setProducts(productRes.data.products);
                }
            } catch (err) {
                console.error("Error fetching data", err);
                setError(err.response?.data?.message || err.message || "Failed to load shop data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [salonId]);

    const updateQuantity = (itemId, change) => {
        setCart(prev => {
            const currentQty = prev[itemId] || 0;
            const newQty = Math.max(0, currentQty + change);
            if (newQty === 0) {
                const { [itemId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [itemId]: newQty };
        });
    };

    const calculateTotal = () => {
        return Object.entries(cart).reduce((total, [itemId, qty]) => {
            const item = products.find(i => i._id === itemId);
            return total + ((item ? item.finalPrice : 0) * qty);
        }, 0);
    };

    const handleNextStep = async () => {
        if (step === 1) {
            if (!formData.customerName || !formData.customerPhone || !formData.city || !formData.address) {
                alert("Please fill in Name, Phone, Address, and City");
                return;
            }

            // Create Draft Order
            try {
                // If we already have an orderId, we could update it, but for now just log
                // or if we went back and forth, we might want to update.
                // For simplicity, let's create a draft or update if we have one.
                // Our /draft endpoint creates new. Let's stick to creating one for now or check if we should add update logic to draft endpoint.
                // Actually, let's just create it on first pass.

                // If orderId exists, maybe we update? The current /draft makes a NEW one. 
                // Let's just create for now to satisfy "Save on Next". 
                // Optimization: Update existing if orderId is set.

                const res = await axios.post(`${API_URL}/orders/draft`, {
                    salonId,
                    customerName: formData.customerName,
                    customerPhone: formData.customerPhone,
                    additionalPhone: formData.additionalPhone,
                    address: formData.address,
                    city: formData.city
                });

                if (res.data.success) {
                    setOrderId(res.data.orderId);
                    setStep(2);
                }
            } catch (err) {
                console.error("Failed to save draft", err);
                // Optionally alert user or just proceed locally if backend fails?
                // Better to alert as requirement is to save.
                // But to not block flow, maybe just log and proceed?
                // User said "details should be save", implies success requirement.
                // Let's alert but allow proceed? No, better to force save.
                alert("Failed to save details. Please try again.");
                return;
            }

        } else if (step === 2) {
            setStep(3);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const items = Object.entries(cart).map(([itemId, qty]) => {
            const item = products.find(i => i._id === itemId);
            return {
                productId: item._id,
                productName: item.name,
                quantity: qty,
                price: item.finalPrice
            };
        });

        if (items.length === 0) return alert('Please add items to cart');

        try {
            const res = await axios.post(`${API_URL}/orders`, {
                orderId, // Pass orderId if we have it (from draft)
                salonId,
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
                setPayhereParams(res.data.payhere);
            }
        } catch (err) {
            console.error(err);
            alert(`Failed to place order: ${err.response?.data?.message || err.message}`);
        }
    };

    useEffect(() => {
        if (payhereParams) {
            window.payhere.onCompleted = async function onCompleted(orderId) {
                console.log("Payment completed. OrderID:" + orderId);
                try {
                    await axios.put(`${API_URL}/orders/${orderId}/status`, { status: 'Paid' });
                    navigate('/payment/success', { state: { orderId } });
                } catch (err) {
                    console.error("Failed to update status to Paid", err);
                    alert("Payment successful but failed to update order status. Please contact support.");
                }
            };
            window.payhere.onDismissed = async function onDismissed() {
                console.log("Payment dismissed");
                try {
                    // Assuming payhereParams.order_id holds the order ID
                    await axios.put(`${API_URL}/orders/${payhereParams.order_id}/status`, { status: 'Payment Failed' });
                } catch (err) {
                    console.error("Failed to update status to Payment Failed", err);
                }
                setLoading(false);
                alert("Payment was dismissed. Order marked as Payment Failed.");
            };
            window.payhere.onError = async function onError(error) {
                console.log("Error:" + error);
                try {
                    await axios.put(`${API_URL}/orders/${payhereParams.order_id}/status`, { status: 'Payment Failed' });
                } catch (err) {
                    console.error("Failed to update status to Payment Failed", err);
                }
                setError("Payment Error: " + error);
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

    if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '2rem' }}>Loading Shop Details...</div>;

    if (error) {
        return (
            <div className="container" style={{ textAlign: 'center', marginTop: '2rem', color: '#ef4444' }}>
                <h2>Something went wrong</h2>
                <p style={{ fontWeight: 'bold' }}>{error}</p>
                <div style={{ marginTop: '2rem' }}>
                    <button onClick={() => window.location.reload()} className="btn-primary">Try Again</button>
                </div>
            </div>
        );
    }

    if (!salon) return <div className="container">Salon not found.</div>;

    return (
        <div className="container animate-fade-in" style={{ maxWidth: '600px' }}>
            <div className="logo-container">
                <img src="/Fadna New Logo.png" alt="Fadna Logo" className="site-logo" />
            </div>

            {/* Steps Indicator (Optional, but good for UX) */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {[1, 2, 3].map(s => (
                    <div key={s} style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: step >= s ? 'var(--secondary-color)' : 'rgba(255,255,255,0.2)'
                    }} />
                ))}
            </div>

            <div className="glass-container" style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '0.5rem' }}>{salon.name} Salon</h2>
                <p style={{ margin: 0, opacity: 0.7 }}>
                    {step === 1 ? "Enter your details" : step === 2 ? "Satiny" : "Select your products"}
                </p>
            </div>

            {step === 1 && (
                <div className="animate-fade-in">
                    <div style={{ marginBottom: '2rem' }}>
                        <h3>Your Details</h3>
                        <input
                            type="text"
                            placeholder="Your Name"
                            value={formData.customerName}
                            onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                            required
                            style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', borderRadius: '8px', border: '1px solid #ccc' }}
                        />
                        <div className="order-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <input
                                    type="tel"
                                    placeholder="Phone Number"
                                    value={formData.customerPhone}
                                    onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', marginBottom: 0 }}
                                />
                            </div>
                            <input
                                type="tel"
                                placeholder="Additional Phone (Optional)"
                                value={formData.additionalPhone}
                                onChange={e => setFormData({ ...formData, additionalPhone: e.target.value })}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', marginBottom: 0 }}
                            />
                        </div>
                        <input
                            type="text"
                            placeholder="Address"
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            required
                            style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', borderRadius: '8px', border: '1px solid #ccc' }}
                        />
                        <input
                            type="text"
                            placeholder="City"
                            value={formData.city}
                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                            required
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }}
                        />
                        <button onClick={handleNextStep} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                            Next
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="animate-fade-in" style={{ textAlign: 'center' }}>
                    <div className="video-container" style={{ marginBottom: '1.5rem', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <iframe
                            width="100%"
                            height="315"
                            //src="https://www.youtube.com/embed/dQw4w9WgXcQ" // Placeholder
                            src="https://www.youtube.com/embed/pH4Sgy8ihQ4"
                            title="Product Introduction"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>
                    <div className="product-intro" style={{ marginBottom: '2rem', lineHeight: '1.6', color: 'rgba(255,255,255,0.9)' }}>
                        <h3>Satiny</h3>
                        <p>හිසකෙස් වැටීම බොහෝ විට නොදැනිම ආරම්භ වෙයි. දුර්වල වූ කේෂ මූලයන් සහ හිස්තලයේ එන්සයිම් අසමතුලිතතාවය නිසා හිසකෙස් සිහින්වීම, වියළිවීම සහ දිප්ති අහිමි වීම සිදුවේ.

                            SATINY යනු විද්‍යාත්මකව සනාථ කළ හර්බල් විසඳුමක් වන අතර, හිසකෙස් වැටීමට ප්‍රධාන හේතුවක් වන alpha-reductase එන්සයිමය ස්වභාවිකව අවහිර කරමින් මුල් හේතුවටම ප්‍රතිකාර කරයි.</p>
                        <p>කොළඹ විශ්වවිද්‍යාලයේ IBMBB ආයතනය සහ ආයුර්වේද දෙපාර්තමේන්තුව විසින් සංවර්ධනය කරන ලද SATINY, නවීන පර්යේෂණ හා පාරම්පරික වෛද්‍ය ඖෂධීය ශාක සාරයන් එකට එකතු කර නිර්මාණය කර ඇත. Eclipta prostrata සහ Cocos nucifera වැනි සම්ප්‍රදායික ශාක සාරයන් සමඟ එහි ක්‍රියාකාරී බොටැනිකල් සංයෝග හිසකෙස් වර්ධනය වැඩි කරමින්, හිසකෙස් වැටීම අඩු කර, ශක්තිය සහ දිප්තිය නැවත ලබාදේ.</p>

                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => setStep(1)} className="btn-secondary" style={{ flex: 1, padding: '0.8rem', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', borderRadius: '8px' }}>
                            Back
                        </button>
                        <button onClick={handleNextStep} className="btn-primary" style={{ flex: 1 }}>
                            Order Now
                        </button>
                    </div>
                </div>
            )}

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
                                                {item.discountType === 'percentage'
                                                    ? `${item.discountValue}% OFF`
                                                    : `Rs.${item.discountValue} OFF`}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        {item.discountType !== 'none' && (
                                            <span style={{ textDecoration: 'line-through', opacity: 0.5, fontSize: '0.9rem' }}>
                                                Rs.{item.price}
                                            </span>
                                        )}
                                        <span style={{ color: 'var(--secondary-color)', fontWeight: 'bold' }}>
                                            Rs.{item.finalPrice}
                                        </span>
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

                    <div style={{ marginBottom: '2rem' }}>
                        <h3>Payment Method</h3>
                        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--secondary-color)' }}>
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="Online"
                                    checked={true}
                                    readOnly
                                    style={{ width: 'auto', marginBottom: 0, marginRight: '1rem' }}
                                />
                                <span>Online Payment</span>
                            </label>
                        </div>
                    </div>

                    <div className="glass-container" style={{ position: 'sticky', bottom: '1rem', background: 'rgba(15, 23, 42, 0.9)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Total</span>
                            <span style={{ fontSize: '1.5rem', color: 'var(--secondary-color)', fontWeight: 'bold' }}>Rs.{calculateTotal()}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="button" onClick={() => setStep(2)} className="btn-secondary" style={{ flex: 1, padding: '0.8rem', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', borderRadius: '8px' }}>
                                Back
                            </button>
                            <button type="submit" className="btn-primary" style={{ flex: 2, fontSize: '1.1rem' }}>Place Order</button>
                        </div>
                    </div>
                </form >
            )}
        </div >
    );
};

export default OrderPage;
