
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import OrderPage from './pages/OrderPage';
import LoginPage from './pages/LoginPage';
import SalonDashboard from './pages/SalonDashboard';
import PaymentResult from './pages/PaymentResult';
import AdminForgotPasswordPage from './pages/AdminForgotPasswordPage';
import AdminResetPasswordPage from './pages/AdminResetPasswordPage';
import SalesmanDashboard from './pages/SalesmanDashboard';
import AgentAdminDashboard from './pages/AgentAdminDashboard';
import AgentDashboard from './pages/AgentDashboard';
import AgentOrderPage from './pages/AgentOrderPage';

import NetAgentDashboard from './pages/NetAgentDashboard';
import NetAgentOrderPage from './pages/NetAgentOrderPage';
import QRGeneratorPage from './pages/QRGeneratorPage';
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
          <Route path="/salon-register" element={<SalesmanDashboard />} />
          <Route path="/admin/forgot-password" element={<AdminForgotPasswordPage />} />
          <Route path="/admin/reset-password/:resetToken" element={<AdminResetPasswordPage />} />
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/order/:salonId" element={<OrderPage />} />

          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/agent-admin" element={<AgentAdminDashboard />} />
          <Route path="/agent-dashboard" element={<AgentDashboard />} />
          <Route path="/agent-order/:agentId" element={<AgentOrderPage />} />
          <Route path="/net-agent-admin" element={<NetAgentDashboard />} />
          <Route path="/net-agent-order/:agentId" element={<NetAgentOrderPage />} />
          <Route path="/qr-generator" element={<QRGeneratorPage />} />
          <Route path="/payment/success" element={<PaymentResult />} />
          <Route path="/payment/cancel" element={<PaymentResult />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
