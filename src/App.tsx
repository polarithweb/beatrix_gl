/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { MarketplaceProvider, useMarketplace } from './context/MarketplaceContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { GameMarketplacePage } from './pages/GameMarketplacePage';
import { ListingDetailPage } from './pages/ListingDetailPage';
import { OrdersPage } from './pages/OrdersPage';
import { AdminPage } from './pages/AdminPage';
import { BecomeSellerPage } from './pages/BecomeSellerPage';
import { WalletPage } from './pages/WalletPage';
import { SellerDashboardPage } from './pages/SellerDashboardPage';
import { ChatPage } from './pages/ChatPage';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useMarketplace();
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 left-5 sm:left-auto sm:right-24 z-50 flex flex-col gap-2.5 max-w-[calc(100vw-2.5rem)] w-96 pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-xs font-medium frosted-glass-strong shadow-[6px_6px_16px_rgba(244,143,177,0.18)] ${
            t.type === 'success'
              ? 'border-emerald-300 text-emerald-800'
              : t.type === 'error'
              ? 'border-rose-300 text-rose-800'
              : 'border-pink-300 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {t.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : t.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            ) : (
              <Info className="w-4 h-4 shrink-0 text-pink-600" />
            )}
            <span className="truncate">{t.message}</span>
          </div>
          <button
            type="button"
            onClick={() => removeToast(t.id)}
            className="text-slate-400 hover:text-slate-700 p-0.5 shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="relative min-h-screen w-full max-w-full flex flex-col text-slate-800 overflow-x-hidden">
      {/* Global Pink & Light Blue Silk Gradient Backdrop */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 pointer-events-none">
        <img
          src={`${import.meta.env.BASE_URL}assets/aistudio/IMG_b3686b81-66af-4d69-99aa-0056452b47a4_67782422.jpg`}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center select-none"
        />
      </div>
      {!isAdminRoute && <Navbar />}
      <div className="flex-1 w-full max-w-full min-w-0">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/game/:slug" element={<GameMarketplacePage />} />
          <Route path="/listing/:id" element={<ListingDetailPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/become-seller" element={<BecomeSellerPage />} />
          <Route path="/seller" element={<SellerDashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
      {!isAdminRoute && <Footer />}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <MarketplaceProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </MarketplaceProvider>
  );
}
