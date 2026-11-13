import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Globe,
  Wallet as WalletIcon,
  ShoppingBag,
  Sparkles,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Gamepad2,
  DollarSign,
  ChevronRight,
  Search,
  MessageCircle,
  Store,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { CURRENCIES, CurrencyCode } from '../types';

export const Navbar: React.FC = () => {
  const {
    siteSettings,
    games,
    catalogueGames,
    user,
    signInWithGoogle,
    signOutUser,
    currency,
    setCurrency,
    orders,
    wallet,
    formatPrice,
    isSeller,
    conversations,
    filterGameSlug,
    setFilterGameSlug,
    priceFilterMax,
    setPriceFilterMax,
  } = useMarketplace();

  const navigate = useNavigate();
  const location = useLocation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [drawerGameQuery, setDrawerGameQuery] = useState('');

  useEffect(() => {
    setLogoError(false);
  }, [siteSettings?.logoUrl]);

  // Close drawer upon navigation
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const brandName = siteSettings?.siteName || 'Beatrix.gl';

  // Calculate wallet balance in current currency
  const walletInUsd = (wallet?.balanceInr || 0) / CURRENCIES.INR.rate;

  return (
    <>
      <div className="sticky top-0 z-40 w-full max-w-full">
        {/* Announcement Bar */}
        {siteSettings?.announcementText && (
          <div className="bg-[#0F172A] text-white text-xs font-semibold px-4 py-2 text-center tracking-wide break-words max-w-full shadow-sm border-b border-slate-800">
            {siteSettings.announcementText}
          </div>
        )}

        {/* Strictly One-Row Frosted Glass Header */}
        <header className="bg-white/92 backdrop-blur-xl border-b border-slate-200 shadow-[0_4px_20px_rgba(15,23,42,0.06)] w-full max-w-full">
          <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 min-w-0">
            {/* Left: Branding with Name and Logo */}
            <Link
              to="/"
              className="flex items-center gap-3 shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded-xl min-w-0"
            >
              {siteSettings?.logoUrl && !logoError ? (
                <img
                  src={siteSettings.logoUrl}
                  alt={brandName}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-9 h-9 rounded-xl object-cover border border-slate-300 shadow-sm shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-tr from-[#0F172A] to-[#1E293B] font-display font-extrabold text-lg shadow-sm shrink-0 border border-slate-700">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-poppins font-bold text-lg sm:text-xl tracking-tight text-slate-900 group-hover:text-blue-900 transition-colors whitespace-nowrap">
                  {brandName}
                </span>
              </div>
            </Link>

            {/* Right: Wallet quick link (if logged in), Sign-In option (Navy Blue), and Hamburger Menu Button */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Wallet Quick Pill */}
              {user && (
                <Link
                  to="/wallet"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 transition-all shadow-xs"
                  title="View your wallet balance and transactions"
                >
                  <WalletIcon className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                  <span className="font-mono text-slate-900 font-bold">
                    {formatPrice(walletInUsd)}
                  </span>
                </Link>
              )}

              {/* Sign-in / User Profile Option - Navy Blue Button */}
              {user ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-xs text-slate-800 font-semibold">
                    <span className="max-w-[120px] truncate">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                    {isSeller && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                        <ShieldCheck className="w-3 h-3 text-emerald-700" />
                        Seller
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={signOutUser}
                    className="p-2 rounded-full bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 text-slate-700 hover:text-rose-700 transition-all shrink-0"
                    title="Sign out"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="btn-navy flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm transition-all whitespace-nowrap shrink-0"
                >
                  <UserIcon className="w-4 h-4 shrink-0" />
                  <span>Sign In</span>
                </button>
              )}

              {/* Beside Sign-In: Hamburger Menu Button */}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open Navigation Menu"
                className="p-2.5 rounded-xl bg-white hover:bg-[#FFF0F5] border border-pink-200 hover:border-[#0F172A] text-slate-900 transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 shadow-xs"
              >
                <Menu className="w-5 h-5 text-slate-900" />
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* Hamburger Overlay Drawer / Page */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Sliding Side Page Container */}
          <div className="relative w-full max-w-md bg-white backdrop-blur-2xl h-full shadow-[0_0_50px_rgba(15,23,42,0.35)] border-l border-slate-200 flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Header of Drawer */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white bg-[#0F172A]">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <span className="font-vintage italic font-bold text-lg text-slate-900">
                  Menu &amp; Filters
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-full bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 transition-all"
                aria-label="Close Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body - Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Section 1: "Become a Seller" CTA Banner - Sleek Navy Theme */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white shadow-lg border border-slate-700">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-white/15 px-2.5 py-0.5 rounded-full mb-1.5 border border-white/20 text-white">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                      Seller Portal
                    </span>
                    <h3 className="font-display font-bold text-base text-white">
                      {isSeller ? 'Verified Seller Account' : 'Become a Verified Seller'}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {isSeller
                        ? 'Your seller account is verified. Manage listings and receive instant payouts.'
                        : 'Submit your Google identity, phone, WhatsApp & National ID to start selling.'}
                    </p>
                  </div>
                </div>
                <Link
                  to={isSeller ? '/seller' : '/become-seller'}
                  onClick={() => setDrawerOpen(false)}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-[#0F172A] font-extrabold text-xs uppercase tracking-wide shadow-md transition-colors"
                >
                  <span>{isSeller ? 'Open Selling Studio' : 'Become a Seller'}</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Section 2: Currency Selector */}
              <div className="frosted-glass p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-blue-900" />
                    Currency
                  </span>
                  <span className="font-mono text-xs font-bold text-blue-950 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    Active: {currency} ({CURRENCIES[currency].symbol})
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
                    const active = currency === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setCurrency(code)}
                        className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl text-xs font-mono transition-all ${
                          active
                            ? 'btn-navy shadow-sm'
                            : 'bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-semibold'
                        }`}
                      >
                        <span className="text-sm font-bold">{CURRENCIES[code].symbol}</span>
                        <span className="text-[10px] uppercase font-bold">{code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Game Filter (Searchable across all 339 games) */}
              <div className="frosted-glass p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Gamepad2 className="w-4 h-4 text-blue-900" />
                    Game Filter
                  </span>
                  {filterGameSlug !== 'all' && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterGameSlug('all');
                        setDrawerGameQuery('');
                      }}
                      className="text-[11px] text-blue-900 font-bold hover:underline"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* Search Input for 339 Games */}
                <div className="relative mb-2.5">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={drawerGameQuery}
                    onChange={(e) => setDrawerGameQuery(e.target.value)}
                    placeholder="Search any game..."
                    aria-label="Search games in menu"
                    className="w-full neu-pressed rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 font-semibold placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterGameSlug('all');
                      if (location.pathname !== '/') navigate('/');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      filterGameSlug === 'all'
                        ? 'btn-navy'
                        : 'bg-white hover:bg-slate-100 text-slate-900 border border-slate-300'
                    }`}
                  >
                    <span>All Games</span>
                    <span className={filterGameSlug === 'all' ? 'text-slate-300 text-[10px]' : 'text-slate-500 text-[10px]'}>
                      ({catalogueGames.length})
                    </span>
                  </button>

                  {(() => {
                    const q = drawerGameQuery.trim().toLowerCase();
                    const combinedMap = new Map<string, typeof catalogueGames[number]>();
                    games.forEach((g) => combinedMap.set(g.slug.toLowerCase(), g));
                    catalogueGames.forEach((g) => {
                      if (!combinedMap.has(g.slug.toLowerCase())) {
                        combinedMap.set(g.slug.toLowerCase(), g);
                      }
                    });
                    const allSearchable = Array.from(combinedMap.values());
                    const matching = q
                      ? allSearchable
                          .filter((g) => g.title.toLowerCase().includes(q))
                          .slice(0, 15)
                      : allSearchable.slice(0, 10);

                    return matching.map((g) => {
                      const active = filterGameSlug === g.slug;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            setFilterGameSlug(g.slug);
                            navigate(`/game/${g.slug}`);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                            active
                              ? 'btn-navy'
                              : 'bg-white hover:bg-slate-100 text-slate-900 border border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-md bg-slate-200 text-slate-900 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {g.title.charAt(0)}
                            </div>
                            <span className="truncate">{g.title}</span>
                          </div>
                          {active && <span className="font-bold text-amber-300">✓</span>}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Section 4: Price Range Filter */}
              <div className="frosted-glass p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-blue-900" />
                    Max Price Filter
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-300">
                    Up to {formatPrice(priceFilterMax)}
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="1000"
                  step="5"
                  value={priceFilterMax}
                  onChange={(e) => setPriceFilterMax(Number(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 font-semibold mt-1">
                  <span>{formatPrice(5)}</span>
                  <span>{formatPrice(500)}</span>
                  <span>{formatPrice(1000)}</span>
                </div>
              </div>

              {/* Section 5: Account & Navigation Links */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <Link
                  to="/chat"
                  onClick={() => setDrawerOpen(false)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white hover:bg-[#FFF0F5] border border-pink-200 text-slate-900 text-xs font-bold transition-colors shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="w-4 h-4 text-[#0F172A]" />
                    <span>Buyer &amp; Seller Chat</span>
                  </div>
                  {conversations.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#0F172A] text-white text-[11px] font-extrabold">
                      {conversations.length}
                    </span>
                  )}
                </Link>

                {isSeller && (
                  <Link
                    to="/seller"
                    onClick={() => setDrawerOpen(false)}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 text-xs font-bold transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Store className="w-4 h-4 text-emerald-700" />
                      <span>Selling Studio (List &amp; Withdraw)</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </Link>
                )}

                <Link
                  to="/wallet"
                  onClick={() => setDrawerOpen(false)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 text-xs font-bold transition-colors shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <WalletIcon className="w-4 h-4 text-blue-900" />
                    <span>My Digital Wallet</span>
                  </div>
                  <span className="font-mono font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                    {formatPrice(walletInUsd)}
                  </span>
                </Link>

                <Link
                  to="/orders"
                  onClick={() => setDrawerOpen(false)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 text-xs font-bold transition-colors shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="w-4 h-4 text-blue-900" />
                    <span>My Orders</span>
                  </div>
                  {orders.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-extrabold">
                      {orders.length}
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 text-center text-xs text-slate-600 font-medium">
              <span className="font-brand font-normal text-sm text-slate-900">Beatrix.gl</span>
              <span className="mx-1.5">•</span>
              <span className="font-script font-semibold text-sm text-slate-700">Fast &amp; Secure Gaming Marketplace</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
