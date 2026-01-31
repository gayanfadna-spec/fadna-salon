import React, { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ResetPasswordModal = ({ salon, onClose }) => {
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/salons/${salon._id}/reset-password`, { password: newPassword });
            if (res.data.success) {
                alert('Password Reset Successfully!');
                onClose();
            }
        } catch (err) {
            console.error(err);
            alert('Error resetting password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="glass-container" style={{ width: '400px', maxWidth: '90%' }}>
                <h3>Reset Password for {salon.name}</h3>
                <form onSubmit={handleReset}>
                    <input
                        type="text"
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        style={{ width: '100%', marginBottom: '1rem', padding: '0.5rem' }}
                    />
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                        <button type="button" onClick={onClose} className="btn-primary outline">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPasswordModal;
//hghghghghghg