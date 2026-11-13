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
  MessageCircle,
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
    allSellers,
    createOrder,
    startOrOpenConversation,
    addToast,
  } = useMarketplace();

  const listing = useMemo(() => listings.find((l) => l.id === id), [listings, id]);

  const [quantity, setQuantity] = useState(1);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [useWallet, setUseWallet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);

  const resolvedSellerUid = useMemo(() => {
    if (!listing) return '';
    if (listing.sellerUid) return listing.sellerUid;
    return (
      allSellers.find((s) => s.fullName.toLowerCase() === listing.sellerName.toLowerCase())?.userId ||
      ''
    );
  }, [listing, allSellers]);

  const handleChatWithSeller = async () => {
    if (!listing) return;
    if (!user) {
      const signedIn = await signInWithGoogle();
      if (!signedIn) return;
    }
    if (!resolvedSellerUid) {
      addToast('Seller chat is unavailable for this legacy listing.', 'info');
      return;
    }
    setOpeningChat(true);
    try {
      const convId = await startOrOpenConversation({
        sellerUid: resolvedSellerUid,
        sellerName: listing.sellerName,
        listingId: listing.id,
        listingTitle: listing.title,
      });
      navigate(`/chat?conversationId=${encodeURIComponent(convId)}`);
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Unable to start chat.', 'error');
    } finally {
      setOpeningChat(false);
    }
  };

  if (loadingData) {
    return (
      <main className="max-w-[1400px] w-full max-w-full min-w-0 mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-96 rounded-3xl black-box animate-pulse" />
        <div className="h-96 rounded-3xl black-box animate-pulse" />
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
          <section className="black-box-strong rounded-3xl p-6 sm:p-8 space-y-6 min-w-0 border border-neutral-800 shadow-[0_16px_38px_rgba(0,0,0,0.45)] overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5 min-w-0">
              {listing.imageUrl && (
                <img
                  src={listing.imageUrl}
                  alt={listing.title}
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover bg-neutral-900 border border-neutral-700 shadow-md shrink-0"
                />
              )}
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-300 font-semibold">
                  <span className="font-bold text-white">{listing.gameTitle}</span>
                  <span aria-hidden="true" className="text-neutral-600">·</span>
                  <span>{listing.categoryName}</span>
                  <span aria-hidden="true" className="text-neutral-600">·</span>
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    Delivery: {listing.deliverySpeed}
                  </span>
                </div>

                <h1 className="font-display italic font-bold text-2xl sm:text-3xl text-white break-words">
                  {listing.title}
                </h1>

                <div className="text-xs text-neutral-300 font-mono font-bold tabular-nums">
                  Available Stock: <strong className="text-white">{listing.stock} units</strong>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-800 space-y-3 min-w-0">
              <h2 className="font-display font-black text-sm text-white tracking-tight">
                Offer Description &amp; Delivery Specifications
              </h2>
              <div className="text-sm text-neutral-200 font-medium whitespace-pre-wrap leading-relaxed break-words">
                {listing.description || 'Verified digital offer. Follow standard in-game delivery instructions during checkout.'}
              </div>
            </div>
          </section>

          {/* Seller Rating Card */}
          <section className="black-box rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-neutral-800 shadow-sm min-w-0">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl btn-navy flex items-center justify-center text-white font-brand font-normal text-xl shrink-0 shadow-sm">
                {listing.sellerName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-black text-base text-white truncate">
                    {listing.sellerName}
                  </h2>
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-bold shrink-0">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Verified Seller
                  </span>
                </div>
                <p className="text-xs text-neutral-300 font-medium mt-0.5">
                  Protected by escrow until delivery is completed.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-800 shrink-0">
              <div>
                <div className="text-xs font-bold text-neutral-400">Seller Rating</div>
                <div className="flex items-center gap-1 font-mono font-black text-base text-white tabular-nums mt-0.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{Number(listing.sellerRating).toFixed(1)} / 5.0</span>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-neutral-400">Guaranteed Speed</div>
                <div className="font-mono font-bold text-sm text-white mt-0.5">
                  {listing.deliverySpeed}
                </div>
              </div>
              {(!user || !resolvedSellerUid || user.uid !== resolvedSellerUid) && (
                <button
                  type="button"
                  onClick={handleChatWithSeller}
                  disabled={openingChat}
                  className="btn-pink inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold disabled:opacity-50"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{openingChat ? 'Opening...' : 'Chat with Seller'}</span>
                </button>
              )}
            </div>
          </section>

          {/* TradeShield Buyer Protection Badge UI */}
          <section className="black-box rounded-2xl p-6 space-y-4 border border-neutral-800 shadow-sm min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl black-circle flex items-center justify-center text-white shrink-0">
                <ShieldCheck className="w-5 h-5 text-pink-300" />
              </div>
              <div>
                <h2 className="font-vintage font-bold text-base text-white">
                  TradeShield Buyer Protection
                </h2>
                <p className="font-editorial text-sm text-neutral-300 font-semibold">
                  Every order on our marketplace is backed by 3-point buyer security.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl black-subbox space-y-1 border border-neutral-800">
                <div className="text-xs font-extrabold text-white">100% Delivery Guarantee</div>
                <p className="text-xs text-neutral-300 font-medium">
                  Receive your exact ordered item or full refund protection.
                </p>
              </div>
              <div className="p-4 rounded-xl black-subbox space-y-1 border border-neutral-800">
                <div className="text-xs font-extrabold text-white">Escrow Payment Hold</div>
                <p className="text-xs text-neutral-300 font-medium">
                  Sellers are only credited once your order status reaches Completed.
                </p>
              </div>
              <div className="p-4 rounded-xl black-subbox space-y-1 border border-neutral-800">
                <div className="text-xs font-extrabold text-white">Live Order Tracking</div>
                <p className="text-xs text-neutral-300 font-medium">
                  Monitor real-time fulfillment directly in your Google account orders tab.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Contiguous Purchase & Checkout Module */}
        <aside className="black-box-strong rounded-3xl p-6 sm:p-7 space-y-6 lg:sticky lg:top-24 border border-neutral-800 shadow-[0_16px_38px_rgba(0,0,0,0.45)] min-w-0 w-full">
          {confirmedOrderId ? (
            <div className="space-y-5 text-center py-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl black-circle flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1 min-w-0">
                <h2 className="font-display font-black text-xl text-white">
                  Order Confirmed!
                </h2>
                <p className="text-xs text-neutral-300 font-mono font-bold break-all">
                  Order ID: #{confirmedOrderId.slice(0, 10).toUpperCase()}
                </p>
              </div>
              <p className="text-xs text-neutral-300 font-medium leading-relaxed break-words">
                Your order has been recorded in Firestore and assigned to{' '}
                <strong className="text-white">{listing.sellerName}</strong> for{' '}
                <strong className="text-pink-300">{listing.deliverySpeed}</strong> delivery.
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
                  className="w-full py-2.5 rounded-full black-subbox text-white hover:border-pink-300 text-xs font-bold transition-all border border-neutral-700"
                >
                  Place Another Order
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCheckout} className="space-y-5 min-w-0">
              <div className="flex items-baseline justify-between border-b border-neutral-800 pb-4">
                <span className="text-xs font-bold text-neutral-300">Unit Price</span>
                <span className="font-mono font-black text-2xl text-white tabular-nums">
                  {formatPrice(listing.price)}
                </span>
              </div>

              {/* Quantity Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white font-bold">Quantity</span>
                  <span className="text-neutral-300 font-mono font-semibold tabular-nums">
                    Max: {listing.stock}
                  </span>
                </div>
                <div className="flex items-center justify-between black-input rounded-2xl p-1.5 border border-neutral-700">
                  <button
                    type="button"
                    disabled={safeQty <= 1 || listing.stock <= 0}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-xl black-subbox hover:bg-neutral-800 disabled:opacity-40 flex items-center justify-center text-white transition-colors font-bold"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-mono font-black text-base text-white tabular-nums">
                    {safeQty}
                  </span>
                  <button
                    type="button"
                    disabled={safeQty >= maxQty || listing.stock <= 0}
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    className="w-9 h-9 rounded-xl black-subbox hover:bg-neutral-800 disabled:opacity-40 flex items-center justify-center text-white transition-colors font-bold"
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
                  className="block text-xs font-bold text-white"
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
                  className="w-full black-input rounded-2xl p-3.5 text-xs text-white font-medium placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white transition-all border border-neutral-700"
                />
              </div>

              {/* Total Price Summary */}
              <div className="p-4 rounded-2xl black-subbox space-y-2 border border-neutral-800">
                <div className="flex items-center justify-between text-xs text-neutral-300 font-semibold">
                  <span>Subtotal ({safeQty}x)</span>
                  <span className="font-mono font-bold text-white tabular-nums">{formatPrice(totalUsd)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-300 font-semibold">
                  <span>TradeShield Protection</span>
                  <span className="text-emerald-400 font-extrabold">Included</span>
                </div>
                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                  <span className="text-sm font-black text-white">Total Price</span>
                  <span className="font-mono font-black text-2xl text-white tabular-nums">
                    {formatPrice(totalUsd)}
                  </span>
                </div>
              </div>

              {/* Wallet Payment Method Option */}
              {user && (
                <div className="p-3.5 rounded-2xl black-subbox space-y-2 border border-neutral-700">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={useWallet}
                        onChange={(e) => setUseWallet(e.target.checked)}
                        className="rounded accent-pink-400 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-white">
                        Pay with Beatrix.gl Digital Wallet
                      </span>
                    </div>
                    <span className="font-mono text-xs font-black text-pink-300">
                      Balance: {formatInr(wallet?.balanceInr || 0)}
                    </span>
                  </label>
                  {useWallet && (
                    <div className="text-[11px] text-neutral-300 font-medium pl-6">
                      Funds will be deducted immediately from your digital wallet balance.
                    </div>
                  )}
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-2xl bg-rose-950 border border-rose-800 text-rose-200 text-xs font-bold flex items-start gap-2 break-words">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Google Sign-In Gate or Submit Order CTA */}
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
                  <p className="text-[11px] text-center text-neutral-300 font-medium">
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

