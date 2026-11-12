import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Lock,
  LogOut,
  LayoutDashboard,
  Settings,
  Layers,
  Gamepad2,
  Package,
  ShoppingBag,
  Plus,
  Trash2,
  Edit3,
  Check,
  Upload,
  Star,
  ArrowUp,
  ArrowDown,
  ShieldAlert,
  UserCheck,
  ShieldCheck,
  Ban,
  Eye,
  Phone,
  MessageSquare,
  MapPin,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import {
  Category,
  Game,
  Listing,
  OrderStatus,
  SellerApplication,
  Seller,
  compressImageToDataUrl,
} from '../types';

type AdminTab = 'overview' | 'settings' | 'categories' | 'games' | 'listings' | 'orders' | 'sellers';

export const AdminPage: React.FC = () => {
  const {
    user,
    signInWithGoogle,
    isAdminUnlocked,
    isAdminAuthorized,
    unlockAdminWithPassword,
    logoutAdmin,
    siteSettings,
    categories,
    games,
    catalogueGames,
    listings,
    orders,
    formatPrice,
    addToast,
    saveSiteSettings,
    createCategory,
    updateCategory,
    deleteCategory,
    createGame,
    updateGame,
    deleteGame,
    ensureCatalogueGameInFirestore,
    createListing,
    updateListing,
    deleteListing,
    updateOrderStatus,
    deleteOrder,
    allSellerApplications,
    allSellers,
    approveSellerApplication,
    rejectSellerApplication,
    banSeller,
    unbanSeller,
  } = useMarketplace();

  // Password Gate State
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  // National ID Modal Preview
  const [inspectingIdUrl, setInspectingIdUrl] = useState<string | null>(null);

  // Active Dashboard Tab
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // --- Tab 2: Site Settings Form State ---
  const [siteName, setSiteName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [heroBannerUrl, setHeroBannerUrl] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroCtaText, setHeroCtaText] = useState('');
  const [paymentBadgesText, setPaymentBadgesText] = useState('');
  const [supportLinksText, setSupportLinksText] = useState('');
  const [legalLinksText, setLegalLinksText] = useState('');
  const [copyrightText, setCopyrightText] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (siteSettings) {
      setSiteName(siteSettings.siteName || '');
      setLogoUrl(siteSettings.logoUrl || '');
      setAnnouncementText(siteSettings.announcementText || '');
      setHeroBannerUrl(siteSettings.heroBannerUrl || '');
      setHeroTitle(siteSettings.heroTitle || '');
      setHeroSubtitle(siteSettings.heroSubtitle || '');
      setHeroCtaText(siteSettings.heroCtaText || '');
      setPaymentBadgesText((siteSettings.paymentBadges || []).join(', '));
      setSupportLinksText((siteSettings.supportLinks || []).join('\n'));
      setLegalLinksText((siteSettings.legalLinks || []).join('\n'));
      setCopyrightText(siteSettings.copyrightText || '');
    }
  }, [siteSettings]);

  // --- Tab 3: Category Form State ---
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catOrder, setCatOrder] = useState<number>(0);
  const [savingCategory, setSavingCategory] = useState(false);

  // --- Tab 4: Game Form State ---
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [gameTitle, setGameTitle] = useState('');
  const [gameSlug, setGameSlug] = useState('');
  const [gameIconUrl, setGameIconUrl] = useState('');
  const [gameBannerUrl, setGameBannerUrl] = useState('');
  const [gameFeatured, setGameFeatured] = useState(true);
  const [gameCategoryIds, setGameCategoryIds] = useState<string[]>([]);
  const [savingGame, setSavingGame] = useState(false);

  // --- Tab 5: Listing Form State ---
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
  const [listingSellerName, setListingSellerName] = useState('PolarithVault');
  const [listingSellerRating, setListingSellerRating] = useState('4.9');
  const [listingImageUrl, setListingImageUrl] = useState('');
  const [listingActive, setListingActive] = useState(true);
  const [savingListing, setSavingListing] = useState(false);

  // Keep default dropdown selections in sync when games/categories change
  useEffect(() => {
    if (!listingGameId && games.length > 0) {
      setListingGameId(games[0].id);
      setListingGameSearch(games[0].title);
    }
  }, [games, listingGameId]);

  useEffect(() => {
    if (!listingCategoryId && categories.length > 0) {
      setListingCategoryId(categories[0].id);
    }
  }, [categories, listingCategoryId]);

  // Password Gate Submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setUnlocking(true);
    try {
      const ok = await unlockAdminWithPassword(passwordInput);
      if (!ok) {
        setPasswordError('Invalid administrator password. Access denied.');
      } else {
        setPasswordInput('');
      }
    } finally {
      setUnlocking(false);
    }
  };

  // Image File Upload Helper
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onResult: (dataUrl: string) => void,
    maxW = 1200,
    maxH = 720
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, maxW, maxH);
      onResult(dataUrl);
      addToast('Image processed and ready to save.', 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Image upload failed.';
      addToast(msg, 'error');
    } finally {
      e.target.value = '';
    }
  };

  // Save Site Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminAuthorized) {
      addToast('Please sign in with Google below to write to Firestore.', 'error');
      return;
    }
    setSavingSettings(true);
    try {
      const paymentBadges = paymentBadgesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const supportLinks = supportLinksText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const legalLinks = legalLinksText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      await saveSiteSettings({
        siteName: siteName || 'Polarith',
        logoUrl,
        announcementText,
        heroBannerUrl,
        heroTitle,
        heroSubtitle,
        heroCtaText,
        paymentBadges,
        supportLinks,
        legalLinks,
        copyrightText,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save site settings.';
      addToast(msg, 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Save Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminAuthorized) {
      addToast('Please sign in with Google to manage categories.', 'error');
      return;
    }
    setSavingCategory(true);
    try {
      const payload = {
        name: catName,
        slug: catSlug || catName,
        description: catDesc,
        iconName: 'Layers',
        order: Number(catOrder) || 0,
      };
      if (editingCategoryId) {
        await updateCategory(editingCategoryId, payload);
      } else {
        await createCategory(payload);
      }
      setEditingCategoryId(null);
      setCatName('');
      setCatSlug('');
      setCatDesc('');
      setCatOrder(categories.length + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save category.';
      addToast(msg, 'error');
    } finally {
      setSavingCategory(false);
    }
  };

  const startEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setCatName(cat.name);
    setCatSlug(cat.slug);
    setCatDesc(cat.description);
    setCatOrder(cat.order);
  };

  const handleMoveCategoryOrder = async (cat: Category, delta: number) => {
    if (!isAdminAuthorized) return;
    const nextOrder = Math.max(0, cat.order + delta);
    await updateCategory(cat.id, {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        iconName: cat.iconName,
        order: nextOrder,
    });
  };

  // Save Game
  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminAuthorized) {
      addToast('Please sign in with Google to manage games.', 'error');
      return;
    }
    setSavingGame(true);
    try {
      const payload = {
        title: gameTitle,
        slug: gameSlug || gameTitle,
        iconUrl: gameIconUrl,
        bannerUrl: gameBannerUrl,
        featured: gameFeatured,
        categoryIds: gameCategoryIds,
      };
      if (editingGameId) {
        await updateGame(editingGameId, payload);
      } else {
        await createGame(payload);
      }
      setEditingGameId(null);
      setGameTitle('');
      setGameSlug('');
      setGameIconUrl('');
      setGameBannerUrl('');
      setGameFeatured(true);
      setGameCategoryIds([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save game.';
      addToast(msg, 'error');
    } finally {
      setSavingGame(false);
    }
  };

  const startEditGame = (g: Game) => {
    setEditingGameId(g.id);
    setGameTitle(g.title);
    setGameSlug(g.slug);
    setGameIconUrl(g.iconUrl);
    setGameBannerUrl(g.bannerUrl);
    setGameFeatured(g.featured);
    setGameCategoryIds(g.categoryIds || []);
  };

  const toggleGameCategoryCheckbox = (catId: string) => {
    setGameCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId].slice(0, 10)
    );
  };

  // Save Listing
  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminAuthorized) {
      addToast('Please sign in with Google to manage listings.', 'error');
      return;
    }
    const foundFirestoreGame = games.find((g) => g.id === listingGameId);
    const foundCatalogueGame = catalogueGames.find(
      (g) => g.id === listingGameId || g.title.toLowerCase() === listingGameSearch.trim().toLowerCase()
    );
    const selectedGame = foundFirestoreGame || foundCatalogueGame;
    const targetCat = categories.find((c) => c.id === listingCategoryId);
    if (!selectedGame) {
      addToast('Please search and select a valid Game from the list.', 'error');
      return;
    }
    if (!targetCat) {
      addToast('Please create and select a valid Category first.', 'error');
      return;
    }

    setSavingListing(true);
    try {
      const targetGame = foundFirestoreGame
        ? foundFirestoreGame
        : await ensureCatalogueGameInFirestore(selectedGame);

      const payload = {
        gameId: targetGame.id,
        gameSlug: targetGame.slug,
        gameTitle: targetGame.title,
        categoryId: targetCat.id,
        categoryName: targetCat.name,
        title: listingTitle,
        description: listingDesc,
        price: Number(listingPrice),
        stock: Math.floor(Number(listingStock)),
        deliverySpeed: listingSpeed,
        sellerName: listingSellerName,
        sellerRating: Number(listingSellerRating),
        imageUrl: listingImageUrl,
        active: listingActive,
      };

      if (editingListingId) {
        await updateListing(editingListingId, payload);
      } else {
        await createListing(payload);
      }

      setEditingListingId(null);
      setListingTitle('');
      setListingDesc('');
      setListingPrice('9.99');
      setListingStock('10');
      setListingImageUrl('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save listing.';
      addToast(msg, 'error');
    } finally {
      setSavingListing(false);
    }
  };

  const startEditListing = (l: Listing) => {
    setEditingListingId(l.id);
    setListingGameId(l.gameId);
    setListingGameSearch(l.gameTitle);
    setListingCategoryId(l.categoryId);
    setListingTitle(l.title);
    setListingDesc(l.description);
    setListingPrice(String(l.price));
    setListingStock(String(l.stock));
    setListingSpeed(l.deliverySpeed);
    setListingSellerName(l.sellerName);
    setListingSellerRating(String(l.sellerRating));
    setListingImageUrl(l.imageUrl);
    setListingActive(l.active);
  };

  // --- GATE 1: Password Gate ("PolarithWeb8825") ---
  if (!isAdminUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-[#FFF0F5] to-[#FCE8F0] flex items-center justify-center p-4">
        <div className="max-w-md w-full frosted-glass-strong rounded-3xl p-8 space-y-6 border border-white/90 shadow-[10px_10px_35px_rgba(244,143,177,0.22)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl neu-circle flex items-center justify-center text-pink-500 shadow-sm">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-slate-900">
                Administrator Control Gate
              </h1>
              <p className="text-xs text-slate-500">
                Restricted access · Enter administrator password
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold text-slate-700"
              >
                Admin Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter administrator password..."
                className="w-full neu-pressed rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all"
              />
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {passwordError}
              </div>
            )}

            <button
              type="submit"
              disabled={unlocking || !passwordInput}
              className="btn-navy w-full py-3.5 rounded-full disabled:opacity-50 text-white font-display font-bold text-sm shadow-md transition-all"
            >
              {unlocking ? 'Verifying...' : 'Unlock Admin Dashboard'}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-200 text-center">
            <Link
              to="/"
              className="text-xs text-slate-700 hover:text-[#0F172A] transition-colors font-bold"
            >
              Return to Public Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- UNLOCKED ADMIN DASHBOARD ---
  const activeListingsCount = listings.filter((l) => l.active).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#FFF0F5] to-[#FCE8F0] flex flex-col lg:flex-row w-full max-w-full overflow-x-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-72 frosted-glass border-b lg:border-b-0 lg:border-r border-slate-200 p-5 sm:p-6 flex flex-col justify-between gap-6 shrink-0 shadow-sm">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl btn-navy flex items-center justify-center text-white font-display font-black text-base shadow-sm">
                B
              </div>
              <div>
                <div className="font-display font-black text-sm text-slate-900">
                  Admin Control Center
                </div>
                <div className="text-[11px] text-emerald-700 font-bold">Session Unlocked</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
            {(
              [
                { id: 'overview', label: '1. Overview', icon: LayoutDashboard },
                { id: 'settings', label: '2. Site & Banners', icon: Settings },
                { id: 'categories', label: '3. Categories', icon: Layers },
                { id: 'games', label: '4. Games & Banners', icon: Gamepad2 },
                { id: 'listings', label: '5. Listings / Offers', icon: Package },
                { id: 'orders', label: '6. Orders Manager', icon: ShoppingBag },
                { id: 'sellers', label: '7. Seller KYC & Bans', icon: ShieldCheck },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                    active
                      ? 'btn-navy text-white shadow-xs'
                      : 'neu-flat text-slate-800 hover:text-[#0F172A] border border-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Auth Status & Logout */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          {user ? (
            <div className="p-3.5 rounded-2xl neu-flat border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800">
                <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Firestore Write Authorized</span>
              </div>
              <div className="text-xs text-slate-900 truncate font-bold">{user.email}</div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-700" />
                <span>Sign In for DB Writes</span>
              </div>
              <p className="text-[11px] text-amber-900 font-medium">
                Firestore Security Rules require a verified Google session alongside your admin password.
              </p>
              <button
                type="button"
                onClick={signInWithGoogle}
                className="btn-navy w-full py-2 rounded-full text-white font-bold text-xs shadow-xs"
              >
                Connect Google Account
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="flex-1 py-2 px-3 rounded-full neu-flat text-xs font-semibold text-slate-700 text-center transition-colors"
            >
              Storefront
            </Link>
            <button
              type="button"
              onClick={logoutAdmin}
              className="py-2 px-3.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-full lg:max-w-6xl space-y-8 overflow-y-auto min-w-0 overflow-x-hidden">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900">
                Marketplace Overview
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Live Firestore database metrics and recent order activity.
              </p>
            </div>

            {/* 4 KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="frosted-glass rounded-2xl p-5 space-y-2 border border-white/90 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Total Games</div>
                <div className="font-mono font-bold text-3xl text-slate-900 tabular-nums">
                  {games.length}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('games')}
                  className="text-xs text-pink-600 hover:underline font-semibold"
                >
                  Manage Games &rarr;
                </button>
              </div>

              <div className="frosted-glass rounded-2xl p-5 space-y-2 border border-white/90 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Active Listings</div>
                <div className="font-mono font-bold text-3xl text-pink-600 tabular-nums">
                  {activeListingsCount}{' '}
                  <span className="text-sm text-slate-400 font-normal">/ {listings.length}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('listings')}
                  className="text-xs text-pink-600 hover:underline font-semibold"
                >
                  Manage Offers &rarr;
                </button>
              </div>

              <div className="frosted-glass rounded-2xl p-5 space-y-2 border border-white/90 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Product Categories</div>
                <div className="font-mono font-bold text-3xl text-slate-900 tabular-nums">
                  {categories.length}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('categories')}
                  className="text-xs text-pink-600 hover:underline font-semibold"
                >
                  Manage Categories &rarr;
                </button>
              </div>

              <div className="frosted-glass rounded-2xl p-5 space-y-2 border border-white/90 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Recorded Orders</div>
                <div className="font-mono font-bold text-3xl text-slate-900 tabular-nums">
                  {orders.length}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="text-xs text-pink-600 hover:underline font-semibold"
                >
                  View Orders &rarr;
                </button>
              </div>
            </div>

            {/* Recent Orders Table */}
            <div className="frosted-glass-strong rounded-3xl p-6 space-y-4 border border-white/90 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-lg text-slate-900">Recent Orders</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="text-xs text-pink-600 hover:underline font-semibold"
                >
                  Open Full Orders Manager
                </button>
              </div>

              {orders.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No customer orders have been submitted yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-pink-100 text-slate-500">
                        <th className="py-2.5 pr-4 font-semibold">Order ID</th>
                        <th className="py-2.5 px-4 font-semibold">Item</th>
                        <th className="py-2.5 px-4 font-semibold">Buyer</th>
                        <th className="py-2.5 px-4 text-right font-semibold">Total</th>
                        <th className="py-2.5 pl-4 text-right font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pink-100/60">
                      {orders.slice(0, 6).map((o) => (
                        <tr key={o.id} className="hover:bg-pink-50/50">
                          <td className="py-3 pr-4 font-mono text-pink-600 font-semibold">
                            #{o.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-medium">
                            {o.listingTitle}{' '}
                            <span className="text-slate-400">({o.gameTitle})</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{o.buyerEmail}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-900 font-bold tabular-nums">
                            {formatPrice(o.totalPrice)}
                          </td>
                          <td className="py-3 pl-4 text-right font-semibold">
                            <span
                              className={
                                o.status === 'Completed'
                                  ? 'text-emerald-600'
                                  : o.status === 'Cancelled'
                                  ? 'text-rose-600'
                                  : 'text-amber-700'
                              }
                            >
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: GLOBAL SITE & BANNER SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900">
                Global Site &amp; Banner Settings
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Control the marketplace name, logo, promotional announcement bar, hero banner,
                payment badges, and footer links.
              </p>
            </div>

            <form
              onSubmit={handleSaveSettings}
              className="frosted-glass-strong rounded-3xl p-6 sm:p-8 space-y-6 border border-white/90 shadow-sm"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Site Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="e.g., Polarith Gaming"
                    className="w-full neu-pressed rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Top Announcement Bar Text (leave empty to hide)
                  </label>
                  <input
                    type="text"
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="e.g., TradeShield Protection Active · Instant Delivery on Currency"
                    className="w-full neu-pressed rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
              </div>

              {/* Logo URL / Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Site Logo Image (Paste URL or Upload File)
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://... or upload an image file"
                    className="flex-1 neu-pressed rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                  <label className="px-4 py-2.5 rounded-xl neu-flat text-xs font-semibold text-pink-600 flex items-center justify-center gap-2 cursor-pointer shrink-0">
                    <Upload className="w-4 h-4" />
                    <span>Upload Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, setLogoUrl, 256, 256)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Hero Banner URL / Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Hero Background Banner Image (Paste URL or Upload File)
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={heroBannerUrl}
                    onChange={(e) => setHeroBannerUrl(e.target.value)}
                    placeholder="https://... or upload a 16:9 banner image"
                    className="flex-1 neu-pressed rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                  <label className="px-4 py-2.5 rounded-xl neu-flat text-xs font-semibold text-pink-600 flex items-center justify-center gap-2 cursor-pointer shrink-0">
                    <Upload className="w-4 h-4" />
                    <span>Upload Hero Banner</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, setHeroBannerUrl, 1400, 700)}
                      className="hidden"
                    />
                  </label>
                </div>
                {heroBannerUrl && (
                  <img
                    src={heroBannerUrl}
                    alt="Hero banner preview"
                    referrerPolicy="no-referrer"
                    className="h-28 w-full object-cover rounded-xl border border-pink-100 mt-2"
                  />
                )}
              </div>

              {/* Hero Headlines & CTA */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Hero Headline
                  </label>
                  <input
                    type="text"
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    placeholder="e.g., The Premier Marketplace for Digital Gaming Assets"
                    className="w-full neu-pressed rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Hero CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={heroCtaText}
                    onChange={(e) => setHeroCtaText(e.target.value)}
                    placeholder="e.g., Explore Games"
                    className="w-full neu-pressed rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Hero Subheadline
                </label>
                <textarea
                  rows={2}
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  placeholder="Instant delivery on verified currency, accounts, items, and boosting."
                  className="w-full neu-pressed rounded-xl p-3.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              {/* Payment Method Badges & Footer Links */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Supported Payment Method Badges (comma-separated, max 10)
                </label>
                <input
                  type="text"
                  value={paymentBadgesText}
                  onChange={(e) => setPaymentBadgesText(e.target.value)}
                  placeholder="Visa, Mastercard, Apple Pay, Google Pay, PayPal, Crypto"
                  className="w-full neu-pressed rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Footer Support Links (one per line as Label|URL)
                  </label>
                  <textarea
                    rows={3}
                    value={supportLinksText}
                    onChange={(e) => setSupportLinksText(e.target.value)}
                    placeholder={'Order Tracking|#/orders\nBuyer Protection|#/\nHelp Center|#/'}
                    className="w-full neu-pressed rounded-xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Footer Legal &amp; Rules Links (one per line as Label|URL)
                  </label>
                  <textarea
                    rows={3}
                    value={legalLinksText}
                    onChange={(e) => setLegalLinksText(e.target.value)}
                    placeholder={'Terms of Service|#/\nPrivacy Policy|#/\nSeller Rules|#/'}
                    className="w-full neu-pressed rounded-xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Footer Copyright Text
                </label>
                <input
                  type="text"
                  value={copyrightText}
                  onChange={(e) => setCopyrightText(e.target.value)}
                  placeholder="© 2026 Polarith Gaming Marketplace. All rights reserved."
                  className="w-full neu-pressed rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="btn-navy px-6 py-3 rounded-full disabled:opacity-50 text-white font-display font-bold text-sm shadow-md transition-all"
              >
                {savingSettings ? 'Saving Settings...' : 'Save Global Site Settings'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: CATEGORY MANAGER */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900">
                Category Manager
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Create, rename, reorder, or delete marketplace product types (e.g., Currency,
                Accounts, Items, Boosting, Top Up, Gift Cards).
              </p>
            </div>

            <form
              onSubmit={handleSaveCategory}
              className="frosted-glass-strong rounded-3xl p-6 sm:p-8 space-y-4 border border-white/90 shadow-sm"
            >
              <h2 className="font-display font-bold text-base text-slate-900">
                {editingCategoryId ? 'Edit Category' : 'Add New Category'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="e.g., Currency"
                    className="w-full neu-pressed rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Slug (auto if blank)</label>
                  <input
                    type="text"
                    value={catSlug}
                    onChange={(e) => setCatSlug(e.target.value)}
                    placeholder="currency"
                    className="w-full neu-pressed rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Display Order</label>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={catOrder}
                    onChange={(e) => setCatOrder(Number(e.target.value))}
                    className="w-full neu-pressed rounded-xl px-3.5 py-2 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Short Description</label>
                <input
                  type="text"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="In-game gold, coins, orbs, and tradeable currencies."
                  className="w-full neu-pressed rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="btn-navy px-5 py-2.5 rounded-full text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>{editingCategoryId ? 'Update Category' : 'Add Category'}</span>
                </button>
                {editingCategoryId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategoryId(null);
                      setCatName('');
                      setCatSlug('');
                      setCatDesc('');
                    }}
                    className="px-4 py-2.5 rounded-full neu-flat text-xs text-slate-600"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>

            {/* Category List */}
            <div className="frosted-glass rounded-3xl p-6 space-y-3 border border-white/90 shadow-sm">
              <h2 className="font-display font-bold text-base text-slate-900">
                Configured Categories ({categories.length})
              </h2>
              {categories.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No categories created yet. Add categories above.
                </p>
              ) : (
                <div className="divide-y divide-pink-100">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="py-3 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-pink-600 font-bold">
                            #{cat.order}
                          </span>
                          <span className="font-display font-bold text-sm text-slate-900">
                            {cat.name}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            ({cat.slug})
                          </span>
                        </div>
                        {cat.description && (
                          <p className="text-xs text-slate-600 mt-0.5">{cat.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveCategoryOrder(cat, -1)}
                          className="p-1.5 rounded-lg neu-flat text-slate-700 hover:text-pink-600"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveCategoryOrder(cat, 1)}
                          className="p-1.5 rounded-lg neu-flat text-slate-700 hover:text-pink-600"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditCategory(cat)}
                          className="p-1.5 rounded-lg neu-flat text-pink-600"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCategory(cat.id)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: GAME & BANNER MANAGER */}
        {activeTab === 'games' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900">
                Game &amp; Banner Manager
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Create, edit, feature/unfeature, and delete games, including game icons, cover
                banners, and linked categories.
              </p>
            </div>

            <form
              onSubmit={handleSaveGame}
              className="frosted-glass-strong rounded-3xl p-6 sm:p-8 space-y-5 border border-white/90 shadow-sm"
            >
              <h2 className="font-display font-bold text-base text-slate-900">
                {editingGameId ? 'Edit Game' : 'Add New Game'}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Game Title *</label>
                  <input
                    type="text"
                    required
                    value={gameTitle}
                    onChange={(e) => setGameTitle(e.target.value)}
                    placeholder="e.g., Path of Exile 2"
                    className="w-full neu-pressed rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    URL Slug (for /#/game/:slug)
                  </label>
                  <input
                    type="text"
                    value={gameSlug}
                    onChange={(e) => setGameSlug(e.target.value)}
                    placeholder="path-of-exile-2"
                    className="w-full neu-pressed rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
              </div>

              {/* Game Icon & Cover Banner */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Game Icon (URL or Upload)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={gameIconUrl}
                      onChange={(e) => setGameIconUrl(e.target.value)}
                      placeholder="https://... or upload icon"
                      className="flex-1 neu-pressed rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                    />
                    <label className="px-3.5 py-2 rounded-xl neu-flat text-xs font-semibold text-pink-600 flex items-center gap-1.5 cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, setGameIconUrl, 300, 300)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Game Cover Banner (URL or Upload)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={gameBannerUrl}
                      onChange={(e) => setGameBannerUrl(e.target.value)}
                      placeholder="https://... or upload cover banner"
                      className="flex-1 neu-pressed rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                    />
                    <label className="px-3.5 py-2 rounded-xl neu-flat text-xs font-semibold text-pink-600 flex items-center gap-1.5 cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, setGameBannerUrl, 1200, 600)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Linked Categories & Featured Toggle */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Linked Categories (select up to 10)
                </label>
                {categories.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Create categories in Tab 3 first to link them to games.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => {
                      const checked = gameCategoryIds.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleGameCategoryCheckbox(cat.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            checked
                              ? 'neu-pressed bg-pink-50 text-pink-700 border border-pink-300'
                              : 'neu-flat text-slate-600'
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gameFeatured}
                    onChange={(e) => setGameFeatured(e.target.checked)}
                    className="rounded accent-pink-500"
                  />
                  <span>Feature this game prominently on the storefront</span>
                </label>

                <div className="flex items-center gap-3">
                  {editingGameId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGameId(null);
                        setGameTitle('');
                        setGameSlug('');
                        setGameIconUrl('');
                        setGameBannerUrl('');
                        setGameCategoryIds([]);
                      }}
                      className="px-4 py-2.5 rounded-full neu-flat text-xs text-slate-600"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={savingGame}
                    className="btn-navy px-5 py-2.5 rounded-full text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{editingGameId ? 'Update Game' : 'Add Game'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Games List */}
            <div className="frosted-glass rounded-3xl p-6 space-y-4 border border-white/90 shadow-sm">
              <h2 className="font-display font-bold text-base text-slate-900">
                Games Catalog ({games.length})
              </h2>
              {games.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No games added yet. Create your first game above.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {games.map((g) => (
                    <div
                      key={g.id}
                      className="p-4 rounded-2xl neu-flat flex items-center justify-between gap-4 border border-white"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {g.iconUrl ? (
                          <img
                            src={g.iconUrl}
                            alt={g.title}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-xl object-cover bg-white shadow-xs shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white font-display font-bold flex items-center justify-center shrink-0">
                            {g.title.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display font-bold text-sm text-slate-900 truncate">
                              {g.title}
                            </span>
                            {g.featured && (
                              <Star className="w-3.5 h-3.5 text-pink-500 fill-pink-500 shrink-0" />
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-mono truncate">
                            /#/game/{g.slug}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            updateGame(g.id, {
                              title: g.title,
                              slug: g.slug,
                              iconUrl: g.iconUrl,
                              bannerUrl: g.bannerUrl,
                              featured: !g.featured,
                              categoryIds: g.categoryIds,
                            })
                          }
                          className="px-2.5 py-1.5 rounded-full neu-flat text-xs font-semibold text-slate-700"
                        >
                          {g.featured ? 'Unfeature' : 'Feature'}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditGame(g)}
                          className="p-1.5 rounded-lg neu-flat text-pink-600"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteGame(g.id)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: LISTINGS / OFFERS MANAGER */}
        {activeTab === 'listings' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900">
                Listings &amp; Offers Manager
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Create, edit, toggle active status, and adjust stock or pricing for marketplace offers.
              </p>
            </div>

            {/* Listing Form */}
            <form
              onSubmit={handleSaveListing}
              className="frosted-glass-strong rounded-3xl p-6 sm:p-8 space-y-4 border border-white/90 shadow-sm"
            >
              <h2 className="font-display font-bold text-base text-slate-900">
                {editingListingId ? 'Edit Listing Offer' : 'Create New Listing Offer'}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 relative">
                  <label className="block text-xs font-semibold text-slate-700">
                    Search &amp; Select Game (339 Catalogue Titles) *
                  </label>
                  <input
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
                    placeholder="Type to search game (e.g., Minecraft, Valorant, Blox Fruits)..."
                    className="w-full neu-pressed rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300 font-medium"
                  />
                  {listingGameDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-52 overflow-y-auto bg-white rounded-xl border border-slate-300 shadow-lg divide-y divide-slate-100">
                      {(() => {
                        const q = listingGameSearch.trim().toLowerCase();
                        const merged = new Map<string, Game>();
                        games.forEach((g) => merged.set(g.slug.toLowerCase(), g));
                        catalogueGames.forEach((g) => {
                          if (!merged.has(g.slug.toLowerCase())) {
                            merged.set(g.slug.toLowerCase(), g);
                          }
                        });
                        const list = Array.from(merged.values())
                          .filter((g) => !q || g.title.toLowerCase().includes(q))
                          .slice(0, 20);

                        if (list.length === 0) {
                          return (
                            <div className="px-3.5 py-2.5 text-xs text-slate-500">
                              No matching game found.
                            </div>
                          );
                        }

                        return list.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onMouseDown={(ev) => {
                              ev.preventDefault();
                              setListingGameId(g.id);
                              setListingGameSearch(g.title);
                              setListingGameDropdownOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-pink-50 flex items-center justify-between"
                          >
                            <span>{g.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">/{g.slug}</span>
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Select Category *</label>
                  <select
                    required
                    value={listingCategoryId}
                    onChange={(e) => setListingCategoryId(e.target.value)}
                    className="w-full neu-pressed rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300 font-medium"
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Offer Title *</label>
                <input
                  type="text"
                  required
                  value={listingTitle}
                  onChange={(e) => setListingTitle(e.target.value)}
                  placeholder="e.g., 1,000 Divine Orbs — Softcore League — Instant Face-to-Face Trade"
                  className="w-full neu-pressed rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Offer Description &amp; Delivery Instructions
                </label>
                <textarea
                  rows={3}
                  value={listingDesc}
                  onChange={(e) => setListingDesc(e.target.value)}
                  placeholder="Detailed item specifications, server compatibility, and delivery steps..."
                  className="w-full neu-pressed rounded-xl p-3.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Price (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={listingPrice}
                    onChange={(e) => setListingPrice(e.target.value)}
                    className="w-full neu-pressed rounded-xl px-3 py-2 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Stock Qty *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={listingStock}
                    onChange={(e) => setListingStock(e.target.value)}
                    className="w-full neu-pressed rounded-xl px-3 py-2 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Delivery Speed</label>
                  <input
                    type="text"
                    value={listingSpeed}
                    onChange={(e) => setListingSpeed(e.target.value)}
                    placeholder="Instant"
                    className="w-full neu-pressed rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Seller Name</label>
                  <input
                    type="text"
                    value={listingSellerName}
                    onChange={(e) => setListingSellerName(e.target.value)}
                    className="w-full neu-pressed rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Rating (0-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={listingSellerRating}
                    onChange={(e) => setListingSellerRating(e.target.value)}
                    className="w-full neu-pressed rounded-xl px-3 py-2 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Offer Image (Optional URL or Upload)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={listingImageUrl}
                    onChange={(e) => setListingImageUrl(e.target.value)}
                    placeholder="https://... or upload thumbnail"
                    className="flex-1 neu-pressed rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                  <label className="px-3.5 py-2 rounded-xl neu-flat text-xs font-semibold text-pink-600 flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, setListingImageUrl, 600, 600)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={listingActive}
                    onChange={(e) => setListingActive(e.target.checked)}
                    className="rounded accent-pink-500"
                  />
                  <span>Offer Active &amp; Visible on Storefront</span>
                </label>

                <div className="flex items-center gap-3">
                  {editingListingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingListingId(null);
                        setListingTitle('');
                        setListingDesc('');
                      }}
                      className="px-4 py-2.5 rounded-full neu-flat text-xs text-slate-600"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={savingListing}
                    className="btn-navy px-5 py-2.5 rounded-full text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{editingListingId ? 'Update Listing' : 'Publish Listing'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Existing Listings Table */}
            <div className="frosted-glass rounded-3xl p-6 space-y-4 border border-white/90 shadow-sm">
              <h2 className="font-display font-bold text-base text-slate-900">
                All Listings ({listings.length})
              </h2>
              {listings.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No marketplace offers created yet.
                </p>
              ) : (
                <div className="divide-y divide-pink-100">
                  {listings.map((item) => (
                    <div
                      key={item.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="text-pink-600 font-semibold">{item.gameTitle}</span>
                          <span>·</span>
                          <span>{item.categoryName}</span>
                          <span>·</span>
                          <span
                            className={
                              item.active ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'
                            }
                          >
                            {item.active ? 'Active' : 'Hidden'}
                          </span>
                        </div>
                        <div className="font-display font-bold text-sm text-slate-900 truncate">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-600 font-mono tabular-nums">
                          Price: {formatPrice(item.price)} · Stock: {item.stock} · Speed:{' '}
                          {item.deliverySpeed}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
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
                            })
                          }
                          className="px-3 py-1.5 rounded-full neu-flat text-xs font-semibold text-slate-700"
                        >
                          {item.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditListing(item)}
                          className="p-1.5 rounded-lg neu-flat text-pink-600"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteListing(item.id)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: ORDERS MANAGER */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900">
                Orders Manager
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Review customer orders, inspect delivery character details, update fulfillment
                status, or remove test orders.
              </p>
            </div>

            <div className="frosted-glass rounded-3xl p-6 space-y-4 border border-white/90 shadow-sm">
              {orders.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center">
                  No orders recorded yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {orders.map((o) => (
                    <div
                      key={o.id}
                      className="p-5 rounded-2xl neu-flat border border-white flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono text-pink-600 font-bold">
                            #{o.id.slice(0, 10).toUpperCase()}
                          </span>
                          <span>·</span>
                          <span className="text-slate-900 font-semibold">{o.gameTitle}</span>
                          <span>·</span>
                          <span>{o.categoryName}</span>
                          <span>·</span>
                          <span>Buyer: {o.buyerEmail}</span>
                        </div>

                        <div className="font-display font-bold text-sm text-slate-900">
                          {o.listingTitle} (Qty: {o.quantity}) — {formatPrice(o.totalPrice)}
                        </div>

                        <div className="text-xs text-slate-700 neu-pressed px-3 py-1.5 rounded-xl inline-block">
                          Delivery Instructions: {o.deliveryInstructions}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {(['Pending', 'Completed', 'Cancelled'] as OrderStatus[]).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => updateOrderStatus(o.id, st)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                              o.status === st
                                ? st === 'Completed'
                                  ? 'bg-emerald-700 text-white shadow-xs'
                                  : st === 'Cancelled'
                                  ? 'bg-rose-700 text-white shadow-xs'
                                  : 'btn-navy text-white shadow-xs'
                                : 'neu-flat text-slate-800 hover:text-[#0F172A] border border-slate-300'
                            }`}
                          >
                            {o.status === st && <Check className="w-3 h-3" />}
                            <span>{st}</span>
                          </button>
                        ))}

                        <button
                          type="button"
                          onClick={() => deleteOrder(o.id)}
                          className="p-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200"
                          title="Delete Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: SELLER KYC & BAN MANAGEMENT */}
        {activeTab === 'sellers' && (
          <div className="space-y-8">
            <div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900">
                Seller KYC &amp; Ban Management
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Verify government approved national IDs, approve new seller applications, and exercise ban control over all marketplace sellers.
              </p>
            </div>

            {/* Sub-Section A: Pending Applications */}
            <div className="frosted-glass-strong rounded-3xl p-6 space-y-4 border border-white/90 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h2 className="font-display font-bold text-base text-slate-900">
                    Pending Verification Applications (
                    {allSellerApplications.filter((a) => a.status === 'Pending').length})
                  </h2>
                </div>
              </div>

              {allSellerApplications.filter((a) => a.status === 'Pending').length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No seller applications are currently waiting for review.
                </div>
              ) : (
                <div className="space-y-4">
                  {allSellerApplications
                    .filter((a) => a.status === 'Pending')
                    .map((app) => (
                      <div
                        key={app.id}
                        className="p-5 rounded-2xl neu-flat border border-white space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-pink-100/60 pb-3">
                          <div>
                            <div className="font-display font-bold text-base text-slate-900">
                              {app.fullName}
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                              Email: {app.userEmail} · UID: {app.userId}
                            </div>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            Status: Under Review
                          </span>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                              <span className="text-slate-400 font-medium">Phone:</span>
                              <span className="font-semibold">{app.phoneNumber}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="text-slate-400 font-medium">WhatsApp:</span>
                              <span className="font-semibold">{app.whatsappNumber}</span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-pink-500 shrink-0 mt-0.5" />
                              <span className="text-slate-400 font-medium">Address:</span>
                              <span className="font-semibold">{app.address}</span>
                            </div>
                          </div>

                          {/* ID Document Preview */}
                          <div>
                            <span className="text-slate-400 font-medium block mb-1">
                              National ID Document:
                            </span>
                            <div className="relative group inline-block">
                              <img
                                src={app.nationalIdUrl}
                                alt={`National ID for ${app.fullName}`}
                                className="w-44 h-28 object-cover rounded-xl border border-pink-200 shadow-xs cursor-pointer group-hover:opacity-90"
                                onClick={() => setInspectingIdUrl(app.nationalIdUrl)}
                              />
                              <button
                                type="button"
                                onClick={() => setInspectingIdUrl(app.nationalIdUrl)}
                                className="absolute inset-0 bg-slate-900/40 text-white rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-1 font-semibold text-xs"
                              >
                                <Eye className="w-4 h-4" />
                                <span>Inspect Full ID</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Decision Action Buttons */}
                        <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => approveSellerApplication(app)}
                            className="btn-navy px-4 py-2 rounded-xl text-white font-bold text-xs shadow-sm hover:scale-102 transition-transform flex items-center gap-1.5"
                          >
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span>Approve as Verified Seller</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => rejectSellerApplication(app.id)}
                            className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs border border-rose-300 transition-colors"
                          >
                            Reject Application
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Sub-Section B: All Verified Sellers & Ban Controls */}
            <div className="frosted-glass-strong rounded-3xl p-6 space-y-4 border border-white/90 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-base text-slate-900">
                    All Platform Sellers ({allSellers.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Administrator authority to review and ban/unban any seller.
                  </p>
                </div>
              </div>

              {allSellers.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No verified sellers currently registered.
                </div>
              ) : (
                <div className="divide-y divide-pink-100">
                  {allSellers.map((seller) => (
                    <div
                      key={seller.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full neu-circle flex items-center justify-center font-bold text-xs bg-pink-100 text-pink-700">
                            {seller.fullName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-display font-bold text-sm text-slate-900">
                              {seller.fullName}
                            </span>
                            <span className="text-xs text-slate-400 ml-2 font-mono">
                              ({seller.userEmail})
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              seller.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {seller.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 pl-10 space-x-3">
                          {seller.whatsappNumber && <span>WhatsApp: {seller.whatsappNumber}</span>}
                          {seller.phoneNumber && <span>Phone: {seller.phoneNumber}</span>}
                          {seller.address && <span>Address: {seller.address}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {seller.status === 'Active' ? (
                          <button
                            type="button"
                            onClick={() => banSeller(seller.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1.5 transition-colors"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Ban Seller</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => unbanSeller(seller.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center gap-1.5 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Unban / Restore</span>
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
      </main>

      {/* Full-Size National ID Inspection Modal */}
      {inspectingIdUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setInspectingIdUrl(null)}
        >
          <div
            className="relative bg-white rounded-3xl p-4 max-w-2xl w-full shadow-2xl border border-pink-100 max-h-[90vh] overflow-hidden flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 border-b border-pink-100 mb-3">
              <span className="font-display font-bold text-sm text-slate-900">
                Government Approved National ID Document Inspection
              </span>
              <button
                type="button"
                onClick={() => setInspectingIdUrl(null)}
                className="p-1 rounded-full neu-flat hover:text-rose-600 text-slate-500 text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>
            <img
              src={inspectingIdUrl}
              alt="Full National ID"
              className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain border border-pink-100"
            />
          </div>
        </div>
      )}
    </div>
  );
};
