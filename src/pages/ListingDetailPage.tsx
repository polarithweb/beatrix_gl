import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Clock,
  Star,
  Minus,
  Plus,
  CheckCircle2,
  Lock,
  UserCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';

export const ListingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    listings,
    loadingData,
    user,
    signInWithGoogle,
    formatPrice,
    formatInr,
    wallet,
    createOrder,
  } = useMarketplace();

  const listing = useMemo(() => listings.find((l) => l.id === id), [listings, id]);

  const [quantity, setQuantity] = useState(1);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [useWallet, setUseWallet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);

  if (loadingData) {
    return (
      <main className="max-w-[1400px] w-full max-w-full min-w-0 mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-96 rounded-3xl frosted-glass animate-pulse" />
        <div className="h-96 rounded-3xl frosted-glass animate-pulse" />
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="max-w-[1400px] w-full max-w-full min-w-0 mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
        <h1 className="font-display font-black text-2xl text-slate-900">Listing Not Found</h1>
        <p className="text-sm text-slate-700 font-medium">
          This marketplace offer may have been removed or is no longer active.
        </p>
        <Link
          to="/"
          className="btn-navy inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-bold text-xs shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Storefront</span>
        </Link>
      </main>
    );
  }

  const maxQty = Math.max(1, listing.stock);
  const safeQty = Math.min(Math.max(1, quantity), maxQty);
  const totalUsd = listing.price * safeQty;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!user) {
      const signedIn = await signInWithGoogle();
      if (!signedIn) return;
    }

    if (listing.stock <= 0) {
      setErrorMsg('This offer is currently out of stock.');
      return;
    }

    if (!deliveryInstructions.trim()) {
      setErrorMsg('Please enter your in-game character name, server/realm, or delivery instructions.');
      return;
    }

    setSubmitting(true);
    try {
      const orderId = await createOrder({
        listing,
        quantity: safeQty,
        deliveryInstructions,
        useWallet,
      });
      setConfirmedOrderId(orderId);
      setDeliveryInstructions('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Checkout failed. Please try again.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-[1400px] w-full max-w-full min-w-0 overflow-x-hidden mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between gap-4 flex-wrap min-w-0">
        <div className="flex items-center gap-2 text-xs text-slate-700 font-medium flex-wrap min-w-0">
          <Link to="/" className="hover:text-blue-900 text-slate-900 transition-colors font-bold">
            Storefront
          </Link>
          <span aria-hidden="true" className="text-slate-400">/</span>
          <Link
            to={`/game/${listing.gameSlug}`}
            className="hover:text-blue-900 text-[#0F172A] font-extrabold transition-colors"
          >
            {listing.gameTitle}
          </Link>
          <span aria-hidden="true" className="text-slate-400">/</span>
          <span className="text-[#0F172A] font-bold">{listing.categoryName}</span>
        </div>
      </div>

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start min-w-0">
        {/* Left 2 Columns: Offer Details, Seller Card, TradeShield Protection */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* Primary Offer Card */}
          <section className="frosted-glass-strong rounded-3xl p-6 sm:p-8 space-y-6 min-w-0 border border-slate-200 shadow-[0_12px_36px_rgba(15,23,42,0.08)] overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5 min-w-0">
              {listing.imageUrl && (
                <img
                  src={listing.imageUrl}
                  alt={listing.title}
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover bg-slate-100 border-2 border-white shadow-md shrink-0"
                />
              )}
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700 font-semibold">
                  <span className="font-bold text-[#0F172A]">{listing.gameTitle}</span>
                  <span aria-hidden="true" className="text-slate-400">·</span>
                  <span>{listing.categoryName}</span>
                  <span aria-hidden="true" className="text-slate-400">·</span>
                  <span className="inline-flex items-center gap-1 text-emerald-800 font-bold">
                    <Clock className="w-3.5 h-3.5 text-emerald-700" />
                    Delivery: {listing.deliverySpeed}
                  </span>
                </div>

                <h1 className="font-display font-black text-2xl sm:text-3xl text-[#0F172A] break-words">
                  {listing.title}
                </h1>

                <div className="text-xs text-slate-700 font-mono font-bold tabular-nums">
                  Available Stock: <strong className="text-slate-900">{listing.stock} units</strong>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200 space-y-3 min-w-0">
              <h2 className="font-display font-black text-sm text-[#0F172A] tracking-tight">
                Offer Description &amp; Delivery Specifications
              </h2>
              <div className="text-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed break-words">
                {listing.description || 'Verified digital offer. Follow standard in-game delivery instructions during checkout.'}
              </div>
            </div>
          </section>

          {/* Seller Rating Card */}
          <section className="frosted-glass rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-200 shadow-sm min-w-0">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl btn-navy flex items-center justify-center text-white font-display font-black text-lg shrink-0 shadow-sm">
                {listing.sellerName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-black text-base text-[#0F172A] truncate">
                    {listing.sellerName}
                  </h2>
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-800 font-bold shrink-0">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                    Verified Seller
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium mt-0.5">
                  Protected by escrow until delivery is completed.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200 shrink-0">
              <div>
                <div className="text-xs font-bold text-slate-600">Seller Rating</div>
                <div className="flex items-center gap-1 font-mono font-black text-base text-[#0F172A] tabular-nums mt-0.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                  <span>{Number(listing.sellerRating).toFixed(1)} / 5.0</span>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-600">Guaranteed Speed</div>
                <div className="font-mono font-bold text-sm text-[#0F172A] mt-0.5">
                  {listing.deliverySpeed}
                </div>
              </div>
            </div>
          </section>

          {/* TradeShield Buyer Protection Badge UI */}
          <section className="frosted-glass rounded-2xl p-6 space-y-4 border border-slate-200 shadow-sm min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl neu-circle flex items-center justify-center text-[#0F172A] shrink-0 bg-slate-100">
                <ShieldCheck className="w-5 h-5 text-[#0F172A]" />
              </div>
              <div>
                <h2 className="font-display font-black text-base text-[#0F172A]">
                  TradeShield Buyer Protection
                </h2>
                <p className="text-xs text-slate-700 font-medium">
                  Every order on our marketplace is backed by 3-point buyer security.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl neu-flat space-y-1 border border-slate-200">
                <div className="text-xs font-extrabold text-slate-900">100% Delivery Guarantee</div>
                <p className="text-xs text-slate-700 font-medium">
                  Receive your exact ordered item or full refund protection.
                </p>
              </div>
              <div className="p-4 rounded-xl neu-flat space-y-1 border border-slate-200">
                <div className="text-xs font-extrabold text-slate-900">Escrow Payment Hold</div>
                <p className="text-xs text-slate-700 font-medium">
                  Sellers are only credited once your order status reaches Completed.
                </p>
              </div>
              <div className="p-4 rounded-xl neu-flat space-y-1 border border-slate-200">
                <div className="text-xs font-extrabold text-slate-900">Live Order Tracking</div>
                <p className="text-xs text-slate-700 font-medium">
                  Monitor real-time fulfillment directly in your Google account orders tab.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Contiguous Purchase & Checkout Module */}
        <aside className="frosted-glass-strong rounded-3xl p-6 sm:p-7 space-y-6 lg:sticky lg:top-24 border border-slate-200 shadow-[0_12px_36px_rgba(15,23,42,0.12)] min-w-0 w-full">
          {confirmedOrderId ? (
            <div className="space-y-5 text-center py-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl neu-circle flex items-center justify-center mx-auto text-emerald-700 bg-emerald-50">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1 min-w-0">
                <h2 className="font-display font-black text-xl text-slate-900">
                  Order Confirmed!
                </h2>
                <p className="text-xs text-slate-700 font-mono font-bold break-all">
                  Order ID: #{confirmedOrderId.slice(0, 10).toUpperCase()}
                </p>
              </div>
              <p className="text-xs text-slate-700 font-medium leading-relaxed break-words">
                Your order has been recorded in Firestore and assigned to{' '}
                <strong className="text-slate-900">{listing.sellerName}</strong> for{' '}
                <strong className="text-[#0F172A]">{listing.deliverySpeed}</strong> delivery.
              </p>
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/orders')}
                  className="btn-navy w-full py-3 rounded-full text-white font-display font-bold text-xs transition-all shadow-md"
                >
                  Track Order Status
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmedOrderId(null)}
                  className="w-full py-2.5 rounded-full neu-flat text-slate-800 hover:text-[#0F172A] text-xs font-bold transition-all border border-slate-300"
                >
                  Place Another Order
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCheckout} className="space-y-5 min-w-0">
              <div className="flex items-baseline justify-between border-b border-slate-200 pb-4">
                <span className="text-xs font-bold text-slate-600">Unit Price</span>
                <span className="font-mono font-black text-2xl text-[#0F172A] tabular-nums">
                  {formatPrice(listing.price)}
                </span>
              </div>

              {/* Quantity Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-900 font-bold">Quantity</span>
                  <span className="text-slate-600 font-mono font-semibold tabular-nums">
                    Max: {listing.stock}
                  </span>
                </div>
                <div className="flex items-center justify-between neu-pressed rounded-2xl p-1.5 border border-slate-300">
                  <button
                    type="button"
                    disabled={safeQty <= 1 || listing.stock <= 0}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-xl neu-flat hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center text-slate-900 transition-colors font-bold"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-mono font-black text-base text-slate-900 tabular-nums">
                    {safeQty}
                  </span>
                  <button
                    type="button"
                    disabled={safeQty >= maxQty || listing.stock <= 0}
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    className="w-9 h-9 rounded-xl neu-flat hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center text-slate-900 transition-colors font-bold"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Delivery Instructions Input */}
              <div className="space-y-2">
                <label
                  htmlFor="delivery-notes"
                  className="block text-xs font-bold text-slate-900"
                >
                  In-Game Character Name / Server / Delivery Instructions *
                </label>
                <textarea
                  id="delivery-notes"
                  rows={3}
                  required
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  placeholder="Enter your Character ID, Server/Realm, or delivery notes..."
                  className="w-full neu-pressed rounded-2xl p-3.5 text-xs text-slate-900 font-medium placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0F172A] transition-all border border-slate-300"
                />
              </div>

              {/* Total Price Summary */}
              <div className="p-4 rounded-2xl neu-flat space-y-2 border border-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                  <span>Subtotal ({safeQty}x)</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">{formatPrice(totalUsd)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                  <span>TradeShield Protection</span>
                  <span className="text-emerald-700 font-extrabold">Included</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-black text-slate-900">Total Price</span>
                  <span className="font-mono font-black text-2xl text-[#0F172A] tabular-nums">
                    {formatPrice(totalUsd)}
                  </span>
                </div>
              </div>

              {/* Wallet Payment Method Option */}
              {user && (
                <div className="p-3.5 rounded-2xl neu-flat bg-white/90 space-y-2 border border-slate-300">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={useWallet}
                        onChange={(e) => setUseWallet(e.target.checked)}
                        className="rounded accent-[#0F172A] w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-900">
                        Pay with Beatrix.gl Digital Wallet
                      </span>
                    </div>
                    <span className="font-mono text-xs font-black text-[#0F172A]">
                      Balance: {formatInr(wallet?.balanceInr || 0)}
                    </span>
                  </label>
                  {useWallet && (
                    <div className="text-[11px] text-slate-700 font-medium pl-6">
                      Funds will be deducted immediately from your digital wallet balance.
                    </div>
                  )}
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2 break-words">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Google Sign-In Gate or Submit Order CTA (Navy Buttons) */}
              {!user ? (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={signInWithGoogle}
                    className="btn-navy w-full py-3.5 px-4 rounded-full text-white font-display font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Sign in with Google to Checkout</span>
                  </button>
                  <p className="text-[11px] text-center text-slate-600 font-medium">
                    Google Sign-In is required to bind your order to TradeShield Buyer Protection.
                  </p>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={submitting || listing.stock <= 0}
                  className="btn-navy w-full py-3.5 px-4 rounded-full disabled:opacity-50 text-white font-display font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Order...</span>
                    </>
                  ) : listing.stock <= 0 ? (
                    <span>Out of Stock</span>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Buy Now — {formatPrice(totalUsd)}</span>
                    </>
                  )}
                </button>
              )}
            </form>
          )}
        </aside>
      </div>
    </main>
  );
};

