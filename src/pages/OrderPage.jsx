import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://salonfadna-backend.onrender.com/api';

const OrderPage = () => {
    const { salonId } = useParams();
    const navigate = useNavigate();
    const [paymentMethod, setPaymentMethod] = useState('Online');
    const [salon, setSalon] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // Added error state
    const [cart, setCart] = useState({});
    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        additionalPhone: '',
        address: '',
        city: ''
    });
    const [payhereParams, setPayhereParams] = useState(null);
    const payhereFormRef = React.useRef(null);

    useEffect(() => {
        console.log("OrderPage Mounted. SalonID:", salonId);
        console.log("API URL:", API_URL);

        if (!salonId) {
            setError("No Salon ID provided in URL.");
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch Salon
                console.log(`Fetching salon data for: ${salonId}`);
                const salonRes = await axios.get(`${API_URL}/salons/${salonId}`);
                console.log("Salon Response:", salonRes.data);

                if (salonRes.data.success) {
                    setSalon(salonRes.data.salon);
                } else {
                    throw new Error(salonRes.data.message || "Failed to load salon data");
                }

                // Fetch Products
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

    const handleSearchMobile = async () => {
        if (!formData.customerPhone) {
            alert("Please enter a phone number to search.");
            return;
        }

        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/orders/customer/${formData.customerPhone}`);
            if (res.data.success) {
                const { customerName, address, city, additionalPhone } = res.data.customer;
                setFormData(prev => ({
                    ...prev,
                    customerName: customerName || '',
                    address: address || '',
                    city: city || '',
                    additionalPhone: additionalPhone || ''
                }));
                // Optional: You could show a success toast here
            } else {
                alert("Customer not found.");
            }
        } catch (err) {
            if (err.response && err.response.status === 404) {
                alert("Customer not found.");
            } else {
                console.error("Search error:", err);
                alert("Error searching for customer.");
            }
        } finally {
            setLoading(false);
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
                salonId,
                customerName: formData.customerName,
                customerPhone: formData.customerPhone,
                additionalPhone: formData.additionalPhone,
                address: formData.address,
                city: formData.city,
                items,
                totalAmount: calculateTotal(),
                paymentMethod // 'Online' or 'Cash on Delivery'
            });

            if (res.data.success) {
                if (paymentMethod === 'Cash on Delivery') {
                    // Redirect to success page directly
                    navigate('/payment/success');
                } else {
                    setPayhereParams(res.data.payhere);
                }
            }
        } catch (err) {
            alert('Failed to place order');
        }
    };

    useEffect(() => {
        if (payhereParams && payhereFormRef.current) {
            payhereFormRef.current.submit();
        }
    }, [payhereParams]);

    if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '2rem' }}>Loading Shop Details...</div>;

    if (error) {
        return (
            <div className="container" style={{ textAlign: 'center', marginTop: '2rem', color: '#ef4444' }}>
                <h2>Something went wrong</h2>
                {/* Displaying detailed error for debugging */}
                <p style={{ fontWeight: 'bold' }}>{error}</p>
                <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                    <p>Debug Info:</p>
                    <p>Salon ID: {salonId}</p>
                    <p>API URL: {API_URL}</p>
                    <p>Timestamp: {new Date().toISOString()}</p>
                </div>
            </div>
        );
    }

    if (!salon) return <div className="container">Salon not found.</div>;
    if (payhereParams) {
        return (
            <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>
                <h2>Redirecting to Payment Gateway...</h2>
                <form ref={payhereFormRef} method="post" action="https://sandbox.payhere.lk/pay/checkout">
                    {Object.entries(payhereParams).map(([key, value]) => (
                        <input key={key} type="hidden" name={key} value={value} />
                    ))}
                </form>
            </div>
        );
    }

    return (
        <div className="container animate-fade-in" style={{ maxWidth: '600px' }}>
            <div className="logo-container">
                <img src="/Fadna New Logo.png" alt="Fadna Logo" className="site-logo" />
            </div>
            <div className="glass-container" style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '0.5rem' }}>{salon.name}</h2>
                <p style={{ margin: 0, opacity: 0.7 }}>Place your order below</p>
            </div>

            <form onSubmit={handleSubmit}>
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
                    <div className="order-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <input
                                type="tel"
                                placeholder="Phone Number"
                                value={formData.customerPhone}
                                onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                                required
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleSearchMobile}
                            className="btn-primary"
                            style={{ padding: '0.8rem 1.2rem', whiteSpace: 'nowrap', height: '100%' }}
                        >
                            Search
                        </button>
                        <input
                            type="tel"
                            placeholder="Additional Phone (Optional)"
                            value={formData.additionalPhone}
                            onChange={e => setFormData({ ...formData, additionalPhone: e.target.value })}
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }}
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
                </div>

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
                                <button
                                    type="button"
                                    onClick={() => updateQuantity(item._id, -1)}
                                    className="qty-btn minus"
                                >-</button>
                                <span style={{ width: '20px', textAlign: 'center', fontWeight: 'bold' }}>{cart[item._id] || 0}</span>
                                <button
                                    type="button"
                                    onClick={() => updateQuantity(item._id, 1)}
                                    className="qty-btn plus"
                                >+</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <h3>Payment Method</h3>
                    <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', cursor: 'pointer', border: paymentMethod === 'Online' ? '1px solid var(--secondary-color)' : '1px solid transparent' }}>
                            <input
                                type="radio"
                                name="paymentMethod"
                                value="Online"
                                checked={paymentMethod === 'Online'}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                            />
                            <span>Online Payment (Cards, EzCash, M-Cash)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', cursor: 'pointer', border: paymentMethod === 'Cash on Delivery' ? '1px solid var(--secondary-color)' : '1px solid transparent' }}>
                            <input
                                type="radio"
                                name="paymentMethod"
                                value="Cash on Delivery"
                                checked={paymentMethod === 'Cash on Delivery'}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                            />
                            <span>Cash on Delivery</span>
                        </label>
                    </div>
                </div>

                <div className="glass-container" style={{ position: 'sticky', bottom: '1rem', background: 'rgba(15, 23, 42, 0.9)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Total</span>
                        <span style={{ fontSize: '1.5rem', color: 'var(--secondary-color)', fontWeight: 'bold' }}>Rs.{calculateTotal()}</span>
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%', fontSize: '1.1rem' }}>Proceed to Payment</button>
                </div>
            </form >
        </div >
    );
};

export default OrderPage;
