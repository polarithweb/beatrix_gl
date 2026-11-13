import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  Lock,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  MessageCircle,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    signInWithGoogle,
    orders,
    allSellers,
    formatPrice,
    updateOrderStatus,
    startOrOpenConversation,
    addToast,
  } = useMarketplace();

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
        <div className="max-w-md w-full mx-auto black-box-strong rounded-3xl p-8 text-center space-y-5 border border-neutral-800 shadow-[0_16px_38px_rgba(0,0,0,0.45)] min-w-0">
          <div className="w-14 h-14 rounded-2xl black-circle flex items-center justify-center mx-auto text-white shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display font-black text-2xl text-white">
              Sign In to View Your Orders
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 font-medium leading-relaxed">
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
          <p className="text-sm text-slate-900 font-medium mt-1 truncate">
            Signed in as <span className="text-[#0F172A] font-extrabold">{user.email}</span>
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-full black-subbox border border-neutral-800">
          {(['All', 'Pending', 'Completed', 'Cancelled'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'btn-navy text-white shadow-xs'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md w-full">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={orderSearch}
          onChange={(e) => setOrderSearch(e.target.value)}
          placeholder="Search by Order ID, game, or offer title..."
          aria-label="Search orders"
          className="w-full black-input rounded-full pl-10 pr-4 py-2.5 text-xs text-white font-semibold placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white transition-all border border-neutral-700"
        />
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="black-box rounded-3xl p-12 text-center space-y-4 border border-neutral-800">
          <ShoppingBag className="w-10 h-10 text-white mx-auto" />
          <div className="space-y-1">
            <h2 className="font-display font-black text-lg text-white">No Orders Found</h2>
            <p className="text-xs text-neutral-300 font-medium">
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
                className="black-box rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-neutral-800 shadow-sm min-w-0"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-300 font-medium">
                    <span className="font-mono text-pink-300 font-extrabold break-all">
                      #{order.id.slice(0, 10).toUpperCase()}
                    </span>
                    <span aria-hidden="true" className="text-neutral-600">·</span>
                    <span className="font-bold text-white">{order.gameTitle}</span>
                    <span aria-hidden="true" className="text-neutral-600">·</span>
                    <span className="font-semibold text-neutral-300">{order.categoryName}</span>
                    <span aria-hidden="true" className="text-neutral-600">·</span>
                    <span className="font-mono text-neutral-400 font-semibold">{dateStr}</span>
                  </div>

                  <h3 className="font-display font-black text-base text-white break-words">
                    {order.listingTitle}
                  </h3>

                  <div className="text-xs text-neutral-300 space-y-1 font-medium">
                    <div>
                      Seller: <span className="text-white font-extrabold">{order.sellerName}</span> · Quantity:{' '}
                      <span className="font-mono text-white font-bold tabular-nums">{order.quantity}</span>
                    </div>
                    <div className="text-white black-input rounded-xl px-3 py-1.5 inline-block break-words max-w-full font-semibold border border-neutral-700">
                      Delivery Details: {order.deliveryInstructions}
                    </div>
                  </div>
                </div>

                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-neutral-800 shrink-0">
                  <div className="font-mono font-black text-xl text-white tabular-nums">
                    {formatPrice(order.totalPrice)}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {(order.sellerUid ||
                      allSellers.some(
                        (s) => s.fullName.toLowerCase() === order.sellerName.toLowerCase()
                      )) && (
                      <button
                        type="button"
                        onClick={async () => {
                          const targetSellerUid =
                            order.sellerUid ||
                            allSellers.find(
                              (s) => s.fullName.toLowerCase() === order.sellerName.toLowerCase()
                            )?.userId ||
                            '';
                          if (!targetSellerUid) return;
                          try {
                            const convId = await startOrOpenConversation({
                              sellerUid: targetSellerUid,
                              sellerName: order.sellerName,
                              listingId: order.listingId,
                              listingTitle: order.listingTitle,
                            });
                            navigate(`/chat?conversationId=${encodeURIComponent(convId)}`);
                          } catch (err: unknown) {
                            addToast(
                              err instanceof Error ? err.message : 'Unable to open chat.',
                              'error'
                            );
                          }
                        }}
                        className="btn-pink px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat with Seller</span>
                      </button>
                    )}

                    {order.status === 'Completed' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Completed</span>
                      </span>
                    )}
                    {order.status === 'Pending' && (
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-950 px-3 py-1 rounded-full border border-amber-700">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span>Pending Delivery</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, 'Cancelled')}
                          className="text-xs text-rose-400 hover:text-rose-300 underline font-bold"
                        >
                          Cancel Order
                        </button>
                      </div>
                    )}
                    {order.status === 'Cancelled' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-300 bg-rose-950 px-3 py-1 rounded-full border border-rose-700">
                        <XCircle className="w-4 h-4 text-rose-400" />
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

