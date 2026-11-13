import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Package,
  ShoppingBag,
  Wallet as WalletIcon,
  Plus,
  Edit3,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  XCircle,
  MessageCircle,
  Upload,
  Eye,
  AlertCircle,
  User as UserIcon,
  Sparkles,
  Store,
  Loader2,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import {
  CURRENCIES,
  FIELD_LIMITS,
  Game,
  Listing,
  OrderStatus,
  compressImageToDataUrl,
} from '../types';

type SellerTab = 'listings' | 'orders' | 'payouts';

const DELIVERY_SPEED_OPTIONS = [
  'Instant',
  '15 Minutes',
  '1 Hour',
  '6 Hours',
  '24 Hours',
];

export const SellerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    authReady,
    signInWithGoogle,
    sellerRecord,
    isSeller,
    sellerApplication,
    categories,
    games,
    catalogueGames,
    listings,
    sellerOrders,
    wallet,
    walletTransactions,
    currency,
    formatPrice,
    formatInr,
    minWithdrawalInr,
    addToast,
    ensureCatalogueGameInFirestore,
    createListing,
    updateListing,
    deleteListing,
    completeSellerOrder,
    cancelSellerOrder,
    withdrawFromWallet,
    startOrOpenConversation,
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<SellerTab>('listings');

  // Listing Create/Edit Form State
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [listingGameId, setListingGameId] = useState('');
  const [listingGameSearch, setListingGameSearch] = useState('');
  const [listingGameDropdownOpen, setListingGameDropdownOpen] = useState(false);
  const [listingCategoryId, setListingCategoryId] = useState('');
  const [listingTitle, setListingTitle] = useState('');
  const [listingDesc, setListingDesc] = useState('');
  const [listingPrice, setListingPrice] = useState('9.99');
  const [listingStock, setListingStock] = useState('10');
  const [listingSpeed, setListingSpeed] = useState('Instant');
  const [listingSellerName, setListingSellerName] = useState('');
  const [listingImageUrl, setListingImageUrl] = useState('');
  const [listingActive, setListingActive] = useState(true);
  const [savingListing, setSavingListing] = useState(false);
  const [listingFormError, setListingFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Incoming Orders Filter
  const [orderStatusFilter, setOrderStatusFilter] = useState<'All' | OrderStatus>('All');
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  // Quick Withdraw Modal State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(minWithdrawalInr);
  const [payoutDetails, setPayoutDetails] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Initialize default seller handle & category
  useEffect(() => {
    if (sellerRecord?.fullName && !listingSellerName) {
      setListingSellerName(sellerRecord.fullName.slice(0, FIELD_LIMITS.SELLER_NAME_MAX));
    }
  }, [sellerRecord, listingSellerName]);

  useEffect(() => {
    if (!listingCategoryId && categories.length > 0) {
      setListingCategoryId(categories[0].id);
    }
  }, [categories, listingCategoryId]);

  const myListings = useMemo(() => {
    if (!user) return [];
    return listings.filter((l) => l.sellerUid === user.uid);
  }, [listings, user]);

  const filteredSellerOrders = useMemo(() => {
    if (orderStatusFilter === 'All') return sellerOrders;
    return sellerOrders.filter((o) => o.status === orderStatusFilter);
  }, [sellerOrders, orderStatusFilter]);

  const searchableGames = useMemo(() => {
    const q = listingGameSearch.trim().toLowerCase();
    const merged = new Map<string, Game>();
    games.forEach((g) => merged.set(g.slug.toLowerCase(), g));
    catalogueGames.forEach((g) => {
      if (!merged.has(g.slug.toLowerCase())) {
        merged.set(g.slug.toLowerCase(), g);
      }
    });
    return Array.from(merged.values())
      .filter((g) => !q || g.title.toLowerCase().includes(q))
      .slice(0, 20);
  }, [games, catalogueGames, listingGameSearch]);

  const balanceInr = wallet?.balanceInr || 0;
  const balanceInUsd = balanceInr / CURRENCIES.INR.rate;
  const pendingOrdersCount = sellerOrders.filter((o) => o.status === 'Pending').length;
  const completedOrdersCount = sellerOrders.filter((o) => o.status === 'Completed').length;

  const resetListingForm = () => {
    setEditingListingId(null);
    setListingTitle('');
    setListingDesc('');
    setListingPrice('9.99');
    setListingStock('10');
    setListingSpeed('Instant');
    setListingImageUrl('');
    setListingActive(true);
    setListingFormError(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setListingFormError(null);
    try {
      const compressed = await compressImageToDataUrl(file, 720, 720, 0.78);
      setListingImageUrl(compressed);
      addToast('Offer thumbnail ready.', 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process offer image.';
      setListingFormError(msg);
    } finally {
      e.target.value = '';
    }
  };

  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isSeller || !sellerRecord) return;
    setListingFormError(null);

    const foundFirestoreGame = games.find((g) => g.id === listingGameId);
    const foundCatalogueGame = catalogueGames.find(
      (g) =>
        g.id === listingGameId ||
        g.title.toLowerCase() === listingGameSearch.trim().toLowerCase()
    );
    const selectedGame = foundFirestoreGame || foundCatalogueGame;
    const targetCat = categories.find((c) => c.id === listingCategoryId);

    if (!selectedGame) {
      setListingFormError('Please search and select a valid game from the dropdown.');
      return;
    }
    if (!targetCat) {
      setListingFormError('Please select a marketplace category.');
      return;
    }
    if (!listingTitle.trim()) {
      setListingFormError('Please enter a clear title for your offer.');
      return;
    }
    const parsedPrice = Number(listingPrice);
    const parsedStock = Math.floor(Number(listingStock));
    if (isNaN(parsedPrice) || parsedPrice < 0 || parsedPrice > 1000000) {
      setListingFormError('Please enter a valid non-negative price (USD).');
      return;
    }
    if (isNaN(parsedStock) || parsedStock < 0 || parsedStock > 1000000) {
      setListingFormError('Please enter a valid stock quantity (0 or more).');
      return;
    }

    setSavingListing(true);
    try {
      const targetGame = foundFirestoreGame
        ? foundFirestoreGame
        : await ensureCatalogueGameInFirestore(selectedGame);

      const payload: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'> = {
        gameId: targetGame.id,
        gameSlug: targetGame.slug,
        gameTitle: targetGame.title,
        categoryId: targetCat.id,
        categoryName: targetCat.name,
        title: listingTitle.trim(),
        description: listingDesc.trim(),
        price: parsedPrice,
        stock: parsedStock,
        deliverySpeed: listingSpeed.trim() || 'Instant',
        sellerName:
          (listingSellerName.trim() || sellerRecord.fullName).slice(0, FIELD_LIMITS.SELLER_NAME_MAX),
        sellerRating: 5.0,
        imageUrl: listingImageUrl.trim(),
        active: listingActive,
        sellerUid: user.uid,
      };

      if (editingListingId) {
        await updateListing(editingListingId, payload);
      } else {
        await createListing(payload);
      }

      resetListingForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish listing.';
      setListingFormError(msg);
      addToast(msg, 'error');
    } finally {
      setSavingListing(false);
    }
  };

  const handleStartEdit = (item: Listing) => {
    setEditingListingId(item.id);
    setListingGameId(item.gameId);
    setListingGameSearch(item.gameTitle);
    setListingCategoryId(item.categoryId);
    setListingTitle(item.title);
    setListingDesc(item.description);
    setListingPrice(String(item.price));
    setListingStock(String(item.stock));
    setListingSpeed(item.deliverySpeed);
    setListingSellerName(item.sellerName);
    setListingImageUrl(item.imageUrl);
    setListingActive(item.active);
    setListingFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    if (withdrawAmount < minWithdrawalInr) {
      setWithdrawError(`Minimum withdrawal is ₹${minWithdrawalInr.toLocaleString()} INR.`);
      return;
    }
    if (balanceInr < withdrawAmount) {
      setWithdrawError(`Insufficient wallet balance (₹${balanceInr.toLocaleString()} INR).`);
      return;
    }
    if (!payoutDetails.trim()) {
      setWithdrawError('Please enter your UPI ID, Bank Account + IFSC, or PayPal details.');
      return;
    }
    setIsWithdrawing(true);
    try {
      await withdrawFromWallet(withdrawAmount, payoutDetails);
      setShowWithdrawModal(false);
      setPayoutDetails('');
    } catch (err: unknown) {
      setWithdrawError(err instanceof Error ? err.message : 'Withdrawal failed.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleChatWithBuyer = async (order: typeof sellerOrders[number]) => {
    try {
      const convId = await startOrOpenConversation({
        buyerUid: order.buyerUid,
        buyerName: order.buyerName,
        sellerUid: user!.uid,
        sellerName: sellerRecord?.fullName || order.sellerName,
        listingId: order.listingId,
        listingTitle: order.listingTitle,
      });
      navigate(`/chat?conversationId=${encodeURIComponent(convId)}`);
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Could not open buyer chat.', 'error');
    }
  };

  if (!authReady) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-16">
        <div className="h-64 rounded-3xl black-box animate-pulse" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="black-box-strong rounded-3xl p-8 border border-neutral-800 shadow-lg space-y-5 text-white">
          <div className="w-16 h-16 black-circle mx-auto flex items-center justify-center text-white">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="font-display font-black text-2xl text-white">
            Sign In to Open Seller Studio
          </h1>
          <p className="text-sm text-neutral-300 font-medium">
            Log in with your verified Google account to list items, manage buyer orders, and withdraw your earnings.
          </p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="btn-navy inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm shadow-md"
          >
            <UserIcon className="w-4 h-4" />
            <span>Sign in with Google</span>
          </button>
        </div>
      </main>
    );
  }

  if (!isSeller || !sellerRecord) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-14 text-center">
        <div className="black-box-strong rounded-3xl p-8 border border-neutral-800 shadow-lg space-y-4 text-white">
          <div className="w-16 h-16 black-circle mx-auto flex items-center justify-center bg-amber-950 text-amber-300 border border-amber-700">
            {sellerApplication?.status === 'Pending' ? (
              <Clock className="w-8 h-8" />
            ) : (
              <ShieldCheck className="w-8 h-8" />
            )}
          </div>
          <h1 className="font-display font-black text-2xl text-white">
            {sellerRecord?.status === 'Banned'
              ? 'Seller Privileges Suspended'
              : sellerApplication?.status === 'Pending'
              ? 'Seller Verification Under Review'
              : 'Seller Verification Required'}
          </h1>
          <p className="text-sm text-neutral-300 font-medium max-w-md mx-auto">
            {sellerRecord?.status === 'Banned'
              ? 'Your seller account has been suspended by the platform administrator.'
              : sellerApplication?.status === 'Pending'
              ? 'Your KYC documents are being reviewed by our admin team. Once approved, you can list items and withdraw earnings here.'
              : 'Complete quick KYC verification (name, phone, WhatsApp, and National ID) to unlock your Selling Studio.'}
          </p>
          {sellerRecord?.status !== 'Banned' && (
            <Link
              to="/become-seller"
              className="btn-navy inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm shadow-md mt-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {sellerApplication?.status === 'Pending'
                  ? 'View Application Status'
                  : 'Apply to Become a Seller'}
              </span>
            </Link>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[1400px] w-full max-w-full min-w-0 overflow-x-hidden mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      {/* Top Seller Banner & Wallet Overview */}
      <section className="black-box-strong rounded-3xl p-6 sm:p-8 border border-neutral-800 shadow-[0_12px_36px_rgba(0,0,0,0.45)] space-y-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 text-xs font-extrabold border border-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Verified Seller Studio</span>
            </div>
            <h1 className="font-vintage font-bold text-2xl sm:text-4xl text-white break-words">
              {sellerRecord.fullName}&apos;s Selling Hub
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 font-medium">
              Publish offers across {catalogueGames.length} games, set your own prices and stock, fulfill orders, and withdraw earnings.
            </p>
          </div>

          {/* Direct Seller Wallet & Quick Withdraw Card */}
          <div className="black-subbox rounded-2xl p-5 border border-neutral-800 min-w-0 sm:min-w-[340px] space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                <WalletIcon className="w-4 h-4 text-pink-300" />
                Seller Wallet Balance
              </span>
              <Link
                to="/wallet"
                className="text-xs font-bold text-pink-300 hover:underline"
              >
                Full History &rarr;
              </Link>
            </div>
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span className="font-mono font-black text-2xl sm:text-3xl text-white">
                {formatInr(balanceInr)}
              </span>
              <span className="font-mono text-xs font-bold text-pink-300 bg-neutral-900 px-2.5 py-0.5 rounded-full border border-neutral-700">
                ≈ {formatPrice(balanceInUsd)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setWithdrawError(null);
                  setWithdrawAmount(Math.max(minWithdrawalInr, Math.min(balanceInr, minWithdrawalInr)));
                  setShowWithdrawModal(true);
                }}
                className="btn-navy flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-sm"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Withdraw</span>
              </button>
              <Link
                to="/wallet"
                className="btn-navy-outline inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Wallet</span>
              </Link>
            </div>
            <p className="text-[11px] text-neutral-400 font-medium">
              Min withdrawal: ₹{minWithdrawalInr.toLocaleString()} INR · Completed orders credit wallet automatically.
            </p>
          </div>
        </div>

        {/* 3 KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-neutral-800">
          <div className="black-subbox rounded-2xl p-4 border border-neutral-800">
            <div className="text-xs font-bold text-neutral-400">My Published Offers</div>
            <div className="font-mono font-black text-2xl text-white mt-1 tabular-nums">
              {myListings.filter((l) => l.active).length}{' '}
              <span className="text-xs text-neutral-400 font-semibold">/ {myListings.length} total</span>
            </div>
          </div>
          <div className="black-subbox rounded-2xl p-4 border border-neutral-800">
            <div className="text-xs font-bold text-neutral-400">Pending Orders to Fulfill</div>
            <div className="font-mono font-black text-2xl text-amber-400 mt-1 tabular-nums">
              {pendingOrdersCount}
            </div>
          </div>
          <div className="black-subbox rounded-2xl p-4 border border-neutral-800">
            <div className="text-xs font-bold text-neutral-400">Completed Sales</div>
            <div className="font-mono font-black text-2xl text-emerald-400 mt-1 tabular-nums">
              {completedOrdersCount}
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => setActiveTab('listings')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'listings' ? 'btn-navy shadow-md' : 'btn-navy-outline'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>List &amp; Manage Items ({myListings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'orders' ? 'btn-navy shadow-md' : 'btn-navy-outline'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Incoming Orders ({sellerOrders.length})</span>
          {pendingOrdersCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
              {pendingOrdersCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payouts')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'payouts' ? 'btn-navy shadow-md' : 'btn-navy-outline'
          }`}
        >
          <WalletIcon className="w-4 h-4" />
          <span>Wallet &amp; Payout History</span>
        </button>
      </div>

      {/* TAB 1: LIST & MANAGE ITEMS */}
      {activeTab === 'listings' && (
        <div className="space-y-8">
          {/* Publish / Edit Offer Form */}
          <form
            onSubmit={handleSaveListing}
            className="black-box-strong rounded-3xl p-6 sm:p-8 border border-neutral-800 shadow-sm space-y-5 text-white"
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="font-display font-black text-xl text-white">
                  {editingListingId ? 'Edit Your Marketplace Offer' : 'Publish a New Item / Offer'}
                </h2>
                <p className="text-xs text-neutral-300 font-medium mt-0.5">
                  Choose any game and category, set your price and stock, and go live immediately.
                </p>
              </div>
              {editingListingId && (
                <button
                  type="button"
                  onClick={resetListingForm}
                  className="btn-pink px-4 py-1.5 rounded-full text-xs font-bold"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {listingFormError && (
              <div className="p-3.5 rounded-2xl bg-rose-950 border border-rose-800 text-rose-200 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{listingFormError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Game Search Dropdown */}
              <div className="space-y-1.5 relative">
                <label
                  htmlFor="seller-game-search"
                  className="block text-xs font-extrabold uppercase tracking-wider text-white"
                >
                  Select Game *
                </label>
                <input
                  id="seller-game-search"
                  type="text"
                  required
                  value={listingGameSearch}
                  onFocus={() => setListingGameDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setListingGameDropdownOpen(false), 180)}
                  onChange={(e) => {
                    setListingGameSearch(e.target.value);
                    setListingGameId('');
                    setListingGameDropdownOpen(true);
                  }}
                  placeholder="Type game name (e.g., Valorant, Minecraft, GTA 5)..."
                  className="w-full black-input rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                {listingGameDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-56 overflow-y-auto bg-neutral-950 rounded-xl border border-neutral-700 shadow-xl divide-y divide-neutral-800">
                    {searchableGames.length === 0 ? (
                      <div className="px-3.5 py-2.5 text-xs text-neutral-400">
                        No matching game found.
                      </div>
                    ) : (
                      searchableGames.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onMouseDown={(ev) => {
                            ev.preventDefault();
                            setListingGameId(g.id);
                            setListingGameSearch(g.title);
                            setListingGameDropdownOpen(false);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-semibold text-white hover:bg-neutral-900 flex items-center justify-between"
                        >
                          <span>{g.title}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">/{g.slug}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Category Select */}
              <div className="space-y-1.5">
                <label
                  htmlFor="seller-category-select"
                  className="block text-xs font-extrabold uppercase tracking-wider text-white"
                >
                  Category *
                </label>
                <select
                  id="seller-category-select"
                  required
                  value={listingCategoryId}
                  onChange={(e) => setListingCategoryId(e.target.value)}
                  className="w-full black-input rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-pink-400"
                >
                  <option value="">-- Choose Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <p className="text-[11px] text-amber-300 font-semibold">
                    No categories exist yet. Please ask an admin to add marketplace categories first.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="seller-offer-title"
                className="block text-xs font-extrabold uppercase tracking-wider text-white"
              >
                Offer Title *
              </label>
              <input
                id="seller-offer-title"
                type="text"
                required
                maxLength={FIELD_LIMITS.LISTING_TITLE_MAX}
                value={listingTitle}
                onChange={(e) => setListingTitle(e.target.value)}
                placeholder="e.g., 5,000 VP Instant Gift Card Code — Global"
                className="w-full black-input rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="seller-offer-desc"
                className="block text-xs font-extrabold uppercase tracking-wider text-white"
              >
                Offer Description &amp; Delivery Terms
              </label>
              <textarea
                id="seller-offer-desc"
                rows={3}
                maxLength={FIELD_LIMITS.LISTING_DESC_MAX}
                value={listingDesc}
                onChange={(e) => setListingDesc(e.target.value)}
                placeholder="Describe region, account specs, or how you deliver in-game items..."
                className="w-full black-input rounded-xl p-3.5 text-sm text-white font-medium placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="seller-offer-price"
                  className="block text-xs font-extrabold uppercase tracking-wider text-white"
                >
                  Unit Price (USD) *
                </label>
                <input
                  id="seller-offer-price"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1000000"
                  required
                  value={listingPrice}
                  onChange={(e) => setListingPrice(e.target.value)}
                  className="w-full black-input rounded-xl px-3.5 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                <span className="text-[11px] font-mono font-semibold text-neutral-400 block">
                  Shows as {formatPrice(Number(listingPrice) || 0)} ({currency})
                </span>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="seller-offer-stock"
                  className="block text-xs font-extrabold uppercase tracking-wider text-white"
                >
                  Available Stock *
                </label>
                <input
                  id="seller-offer-stock"
                  type="number"
                  min="0"
                  max="1000000"
                  step="1"
                  required
                  value={listingStock}
                  onChange={(e) => setListingStock(e.target.value)}
                  className="w-full black-input rounded-xl px-3.5 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="seller-offer-speed"
                  className="block text-xs font-extrabold uppercase tracking-wider text-white"
                >
                  Delivery Speed
                </label>
                <select
                  id="seller-offer-speed"
                  value={listingSpeed}
                  onChange={(e) => setListingSpeed(e.target.value)}
                  className="w-full black-input rounded-xl px-3.5 py-2 text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-pink-400"
                >
                  {DELIVERY_SPEED_OPTIONS.map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="seller-display-handle"
                  className="block text-xs font-extrabold uppercase tracking-wider text-white"
                >
                  Seller Display Handle
                </label>
                <input
                  id="seller-display-handle"
                  type="text"
                  maxLength={FIELD_LIMITS.SELLER_NAME_MAX}
                  value={listingSellerName}
                  onChange={(e) => setListingSellerName(e.target.value)}
                  className="w-full black-input rounded-xl px-3.5 py-2 text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="seller-offer-image"
                className="block text-xs font-extrabold uppercase tracking-wider text-white"
              >
                Offer Thumbnail (Optional Image URL or Upload)
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  id="seller-offer-image"
                  type="text"
                  value={listingImageUrl}
                  onChange={(e) => setListingImageUrl(e.target.value)}
                  placeholder="https://... or upload an image file"
                  className="flex-1 black-input rounded-xl px-3.5 py-2 text-xs text-white font-medium placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                <label className="btn-pink px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Thumbnail</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-neutral-800">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={listingActive}
                  onChange={(e) => setListingActive(e.target.checked)}
                  className="rounded accent-pink-400 w-4 h-4"
                />
                <span>Active &amp; visible to buyers on storefront</span>
              </label>

              <button
                type="submit"
                disabled={savingListing || categories.length === 0}
                className="btn-navy px-6 py-3 rounded-full text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {savingListing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Offer...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>{editingListingId ? 'Save Changes' : 'Publish Offer'}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* My Listed Items */}
          <div className="black-box rounded-3xl p-6 sm:p-8 border border-neutral-800 shadow-sm space-y-4 text-white">
            <h2 className="font-display font-black text-lg text-white">
              My Listed Offers ({myListings.length})
            </h2>

            {myListings.length === 0 ? (
              <div className="py-10 text-center space-y-2 text-neutral-300">
                <Package className="w-9 h-9 mx-auto text-neutral-500" />
                <div className="text-sm font-bold text-white">No items listed yet</div>
                <p className="text-xs max-w-sm mx-auto text-neutral-400">
                  Use the form above to publish your first gaming offer with custom pricing and stock.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-800">
                {myListings.map((item) => (
                  <div
                    key={item.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-extrabold text-pink-300">{item.gameTitle}</span>
                        <span className="text-neutral-500">·</span>
                        <span className="font-semibold text-neutral-300">{item.categoryName}</span>
                        <span className="text-neutral-500">·</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.active
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                          }`}
                        >
                          {item.active ? 'Live' : 'Paused'}
                        </span>
                      </div>
                      <div className="font-display font-black text-base text-white break-words">
                        {item.title}
                      </div>
                      <div className="text-xs font-mono font-bold text-neutral-300 tabular-nums">
                        {formatPrice(item.price)} (${item.price.toFixed(2)} USD) · Stock: {item.stock} · {item.deliverySpeed}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Link
                        to={`/listing/${item.id}`}
                        className="btn-navy-outline px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1"
                        title="View public listing"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          updateListing(item.id, {
                            gameId: item.gameId,
                            gameSlug: item.gameSlug,
                            gameTitle: item.gameTitle,
                            categoryId: item.categoryId,
                            categoryName: item.categoryName,
                            title: item.title,
                            description: item.description,
                            price: item.price,
                            stock: item.stock,
                            deliverySpeed: item.deliverySpeed,
                            sellerName: item.sellerName,
                            sellerRating: item.sellerRating,
                            imageUrl: item.imageUrl,
                            active: !item.active,
                            sellerUid: item.sellerUid,
                          })
                        }
                        className="px-3 py-1.5 rounded-full black-subbox text-xs font-bold text-white border border-neutral-700"
                      >
                        {item.active ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        className="p-2 rounded-full black-subbox text-white border border-neutral-700 hover:border-pink-400"
                        aria-label={`Edit ${item.title}`}
                        title="Edit offer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {confirmDeleteId === item.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteListing(item.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2.5 py-1.5 rounded-full bg-rose-600 text-white text-[11px] font-bold"
                          >
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1.5 rounded-full black-subbox text-[11px] font-bold text-neutral-200 border border-neutral-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="p-2 rounded-full bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800"
                          aria-label={`Delete ${item.title}`}
                          title="Delete offer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INCOMING BUYER ORDERS */}
      {activeTab === 'orders' && (
        <div className="black-box-strong rounded-3xl p-6 sm:p-8 border border-neutral-800 shadow-sm space-y-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-black text-xl text-white">
                Incoming Buyer Orders ({filteredSellerOrders.length})
              </h2>
              <p className="text-xs text-neutral-300 font-medium mt-0.5">
                Deliver items using the buyer&apos;s instructions, message them directly, and mark orders Completed to credit your wallet.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(['All', 'Pending', 'Completed', 'Cancelled'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setOrderStatusFilter(st)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                    orderStatusFilter === st ? 'btn-navy' : 'black-subbox text-neutral-200 border border-neutral-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {filteredSellerOrders.length === 0 ? (
            <div className="py-12 text-center space-y-2 text-neutral-300">
              <ShoppingBag className="w-9 h-9 mx-auto text-neutral-500" />
              <div className="text-sm font-bold text-white">No incoming orders yet</div>
              <p className="text-xs max-w-sm mx-auto text-neutral-400">
                Orders placed by buyers on your listings will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSellerOrders.map((order) => {
                const payoutInr = Math.round(order.totalPrice * CURRENCIES.INR.rate);
                const isBusy = processingOrderId === order.id;

                return (
                  <div
                    key={order.id}
                    className="black-subbox rounded-2xl p-5 border border-neutral-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 font-semibold">
                        <span className="font-mono font-extrabold text-white">
                          #{order.id.slice(0, 10).toUpperCase()}
                        </span>
                        <span>·</span>
                        <span className="font-bold text-pink-300">{order.gameTitle}</span>
                        <span>·</span>
                        <span>{order.categoryName}</span>
                        <span>·</span>
                        <span>Buyer: {order.buyerName}</span>
                      </div>

                      <div className="font-display font-black text-base text-white break-words">
                        {order.listingTitle} (Qty: {order.quantity})
                      </div>

                      <div className="black-input rounded-xl px-3.5 py-2 text-xs text-neutral-200 font-semibold break-words">
                        Buyer Delivery Notes: {order.deliveryInstructions}
                      </div>
                    </div>

                    <div className="flex flex-col items-start lg:items-end gap-3 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-neutral-800">
                      <div className="text-left lg:text-right">
                        <div className="font-mono font-black text-lg text-white">
                          {formatPrice(order.totalPrice)}
                        </div>
                        <div className="text-[11px] font-mono font-bold text-emerald-400">
                          Payout: {formatInr(payoutInr)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleChatWithBuyer(order)}
                          className="btn-pink px-3.5 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Chat with Buyer</span>
                        </button>

                        {order.status === 'Pending' && (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={async () => {
                                setProcessingOrderId(order.id);
                                try {
                                  await completeSellerOrder(order);
                                } catch (err: unknown) {
                                  addToast(
                                    err instanceof Error ? err.message : 'Failed to complete order.',
                                    'error'
                                  );
                                } finally {
                                  setProcessingOrderId(null);
                                }
                              }}
                              className="btn-navy px-4 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                              <span>{isBusy ? 'Processing...' : 'Complete & Credit'}</span>
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={async () => {
                                setProcessingOrderId(order.id);
                                try {
                                  await cancelSellerOrder(order);
                                } catch (err: unknown) {
                                  addToast(
                                    err instanceof Error ? err.message : 'Failed to cancel order.',
                                    'error'
                                  );
                                } finally {
                                  setProcessingOrderId(null);
                                }
                              }}
                              className="px-3 py-1.5 rounded-full bg-rose-950 hover:bg-rose-900 text-rose-300 text-xs font-bold border border-rose-800"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {order.status === 'Completed' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Completed</span>
                          </span>
                        )}

                        {order.status === 'Cancelled' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-300 bg-rose-950 px-3 py-1 rounded-full border border-rose-700">
                            <XCircle className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* TAB 3: WALLET & PAYOUT HISTORY */}
      {activeTab === 'payouts' && (
        <div className="black-box-strong rounded-3xl p-6 sm:p-8 border border-neutral-800 shadow-sm space-y-5 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-black text-xl text-white">
                Recent Sales &amp; Withdrawal Activity
              </h2>
              <p className="text-xs text-neutral-300 font-medium">
                Track all completed sale credits and payout withdrawal requests.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setWithdrawError(null);
                setShowWithdrawModal(true);
              }}
              className="btn-navy px-5 py-2.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Request Withdrawal</span>
            </button>
          </div>

          {walletTransactions.length === 0 ? (
            <div className="py-10 text-center text-neutral-400 text-xs font-medium">
              No wallet transactions recorded yet. Complete orders to receive sales payouts.
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {walletTransactions.map((tx) => {
                const isCredit = tx.type === 'Deposit' || tx.type === 'Sale';
                return (
                  <div key={tx.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isCredit
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-white truncate">
                          {tx.description || tx.type}
                        </div>
                        <div className="text-[11px] font-mono text-neutral-400">
                          {tx.type} · {tx.status} ·{' '}
                          {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString() : 'Just now'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`font-mono text-sm font-black ${
                          isCredit ? 'text-emerald-400' : 'text-white'
                        }`}
                      >
                        {isCredit ? '+' : '-'}{formatInr(tx.amountInr)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Quick Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-black text-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-neutral-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-pink-300" />
                <span>Withdraw Seller Earnings</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="text-neutral-400 hover:text-white p-1 font-bold"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-950 border border-amber-700 text-amber-200 text-xs flex items-center justify-between font-bold">
                <span>Minimum Withdrawal:</span>
                <span className="font-mono font-black text-white">₹{minWithdrawalInr.toLocaleString()} INR</span>
              </div>

              {withdrawError && (
                <div className="p-3 rounded-xl bg-rose-950 border border-rose-800 text-rose-200 text-xs font-bold">
                  {withdrawError}
                </div>
              )}

              <div>
                <label
                  htmlFor="seller-withdraw-amount"
                  className="block text-xs font-extrabold uppercase tracking-wider text-white mb-1"
                >
                  Amount (INR) *
                </label>
                <input
                  id="seller-withdraw-amount"
                  type="number"
                  min={minWithdrawalInr}
                  max={Math.max(minWithdrawalInr, balanceInr)}
                  required
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  className="w-full black-input rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                <div className="text-[11px] font-mono text-neutral-400 mt-1">
                  Available: {formatInr(balanceInr)} (≈ {formatPrice(balanceInUsd)})
                </div>
              </div>

              <div>
                <label
                  htmlFor="seller-payout-dest"
                  className="block text-xs font-extrabold uppercase tracking-wider text-white mb-1"
                >
                  Payout Destination (Bank / UPI / PayPal) *
                </label>
                <textarea
                  id="seller-payout-dest"
                  rows={2}
                  required
                  maxLength={200}
                  value={payoutDetails}
                  onChange={(e) => setPayoutDetails(e.target.value)}
                  placeholder="e.g. UPI: name@okaxis or Bank IFSC + Account Number"
                  className="w-full black-input rounded-xl px-4 py-2 text-xs text-white font-medium placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isWithdrawing || balanceInr < minWithdrawalInr}
                className="btn-navy w-full py-3 rounded-2xl text-xs uppercase tracking-wider font-bold disabled:opacity-50"
              >
                {isWithdrawing
                  ? 'Submitting Payout Request...'
                  : balanceInr < minWithdrawalInr
                  ? `Need at least ₹${minWithdrawalInr.toLocaleString()} INR`
                  : `Submit Withdrawal of ₹${withdrawAmount.toLocaleString()}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};
