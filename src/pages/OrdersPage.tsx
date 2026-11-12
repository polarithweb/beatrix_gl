import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  Lock,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';

export const OrdersPage: React.FC = () => {
  const { user, signInWithGoogle, orders, formatPrice, updateOrderStatus } =
    useMarketplace();

  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Completed' | 'Cancelled'>(
    'All'
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'All' && o.status !== statusFilter) return false;
      if (orderSearch.trim()) {
        const q = orderSearch.trim().toLowerCase();
        return (
          o.id.toLowerCase().includes(q) ||
          o.listingTitle.toLowerCase().includes(q) ||
          o.gameTitle.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, statusFilter, orderSearch]);

  if (!user) {
    return (
      <main className="max-w-[1400px] w-full max-w-full min-w-0 mx-auto px-4 sm:px-6 py-16">
        <div className="max-w-md w-full mx-auto frosted-glass-strong rounded-3xl p-8 text-center space-y-5 border border-slate-200 shadow-[0_12px_36px_rgba(15,23,42,0.12)] min-w-0">
          <div className="w-14 h-14 rounded-2xl neu-circle flex items-center justify-center mx-auto text-[#0F172A] bg-slate-100 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display font-black text-2xl text-slate-900">
              Sign In to View Your Orders
            </h1>
            <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
              Your marketplace purchases and live delivery status updates are securely linked to
              your Google account.
            </p>
          </div>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="btn-navy w-full py-3.5 px-5 rounded-full text-white font-display font-bold text-sm shadow-md transition-all"
          >
            Sign In with Google
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[1400px] w-full max-w-full min-w-0 overflow-x-hidden mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 min-w-0">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-[#0F172A]">
            My Marketplace Orders
          </h1>
          <p className="text-sm text-slate-700 font-medium mt-1 truncate">
            Signed in as <span className="text-[#0F172A] font-extrabold">{user.email}</span>
          </p>
        </div>

        {/* Status Filter Tabs (Navy Pills) */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-full neu-flat border border-slate-300">
          {(['All', 'Pending', 'Completed', 'Cancelled'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'btn-navy text-white shadow-xs'
                  : 'text-slate-800 hover:text-[#0F172A]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md w-full">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={orderSearch}
          onChange={(e) => setOrderSearch(e.target.value)}
          placeholder="Search by Order ID, game, or offer title..."
          aria-label="Search orders"
          className="w-full neu-pressed rounded-full pl-10 pr-4 py-2.5 text-xs text-slate-900 font-semibold placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0F172A] transition-all border border-slate-300"
        />
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="frosted-glass rounded-3xl p-12 text-center space-y-4 border border-slate-300">
          <ShoppingBag className="w-10 h-10 text-[#0F172A] mx-auto" />
          <div className="space-y-1">
            <h2 className="font-display font-black text-lg text-slate-900">No Orders Found</h2>
            <p className="text-xs text-slate-700 font-medium">
              You haven&apos;t placed any orders matching this filter yet.
            </p>
          </div>
          <Link
            to="/"
            className="btn-navy inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-bold text-xs shadow-md"
          >
            <span>Browse Marketplace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4 min-w-0">
          {filteredOrders.map((order) => {
            const dateStr = order.createdAt?.toDate
              ? order.createdAt.toDate().toLocaleString()
              : 'Just now';

            return (
              <div
                key={order.id}
                className="frosted-glass rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-slate-200 shadow-sm min-w-0"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700 font-medium">
                    <span className="font-mono text-[#0F172A] font-extrabold break-all">
                      #{order.id.slice(0, 10).toUpperCase()}
                    </span>
                    <span aria-hidden="true" className="text-slate-400">·</span>
                    <span className="font-bold text-slate-900">{order.gameTitle}</span>
                    <span aria-hidden="true" className="text-slate-400">·</span>
                    <span className="font-semibold text-slate-700">{order.categoryName}</span>
                    <span aria-hidden="true" className="text-slate-400">·</span>
                    <span className="font-mono text-slate-600 font-semibold">{dateStr}</span>
                  </div>

                  <h3 className="font-display font-black text-base text-[#0F172A] break-words">
                    {order.listingTitle}
                  </h3>

                  <div className="text-xs text-slate-800 space-y-1 font-medium">
                    <div>
                      Seller: <span className="text-[#0F172A] font-extrabold">{order.sellerName}</span> · Quantity:{' '}
                      <span className="font-mono text-[#0F172A] font-bold tabular-nums">{order.quantity}</span>
                    </div>
                    <div className="text-slate-900 neu-pressed rounded-xl px-3 py-1.5 inline-block break-words max-w-full font-semibold border border-slate-300">
                      Delivery Details: {order.deliveryInstructions}
                    </div>
                  </div>
                </div>

                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-200 shrink-0">
                  <div className="font-mono font-black text-xl text-[#0F172A] tabular-nums">
                    {formatPrice(order.totalPrice)}
                  </div>

                  <div className="flex items-center gap-3">
                    {order.status === 'Completed' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Completed</span>
                      </span>
                    )}
                    {order.status === 'Pending' && (
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-50 px-3 py-1 rounded-full border border-amber-300">
                          <Clock className="w-4 h-4 text-amber-700" />
                          <span>Pending Delivery</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, 'Cancelled')}
                          className="text-xs text-rose-700 hover:text-rose-900 underline font-bold"
                        >
                          Cancel Order
                        </button>
                      </div>
                    )}
                    {order.status === 'Cancelled' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-800 bg-rose-50 px-3 py-1 rounded-full border border-rose-300">
                        <XCircle className="w-4 h-4 text-rose-700" />
                        <span>Cancelled</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
};

