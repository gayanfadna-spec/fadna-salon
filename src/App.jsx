
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import OrderPage from './pages/OrderPage';
import LoginPage from './pages/LoginPage';
import SalonDashboard from './pages/SalonDashboard';
import PaymentResult from './pages/PaymentResult';
import AdminForgotPasswordPage from './pages/AdminForgotPasswordPage';
import AdminResetPasswordPage from './pages/AdminResetPasswordPage';
import './index.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/salon-login" element={<LoginPage />} /> {/* Keep for backward compat within session if needed, or redirect */}
          <Route path="/admin-login" element={<LoginPage />} /> {/* Keep for backward compat within session if needed, or redirect */}

          <Route path="/salon-dashboard" element={<SalonDashboard />} />
          <Route path="/admin/forgot-password" element={<AdminForgotPasswordPage />} />
          <Route path="/admin/reset-password/:resetToken" element={<AdminResetPasswordPage />} />
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/order/:salonId" element={<OrderPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/payment/success" element={<PaymentResult />} />
          <Route path="/payment/cancel" element={<PaymentResult />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
