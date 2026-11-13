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
import { CURRENCIES, CurrencyCode, DEFAULT_BRAND_LOGO_PATH } from '../types';

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
  const [defaultLogoError, setDefaultLogoError] = useState(false);
  const [drawerGameQuery, setDrawerGameQuery] = useState('');
  const [failedDrawerLogos, setFailedDrawerLogos] = useState<Record<string, boolean>>({});

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
  const defaultLogoSrc = `${import.meta.env.BASE_URL}${DEFAULT_BRAND_LOGO_PATH}`;
  const usingCustomLogo = Boolean(siteSettings?.logoUrl && !logoError);
  const activeLogoSrc = usingCustomLogo ? siteSettings!.logoUrl : defaultLogoSrc;

  // Calculate wallet balance in current currency
  const walletInUsd = (wallet?.balanceInr || 0) / CURRENCIES.INR.rate;

  return (
    <>
      <div className="sticky top-0 z-40 w-full max-w-full">
        {/* Announcement Bar */}
        {siteSettings?.announcementText && (
          <div className="bg-black text-white text-xs font-semibold px-4 py-2 text-center tracking-wide break-words max-w-full shadow-sm border-b border-neutral-900">
            {siteSettings.announcementText}
          </div>
        )}

        {/* Strictly One-Row Solid Black Header */}
        <header className="bg-black border-b border-neutral-900 shadow-[0_4px_20px_rgba(0,0,0,0.45)] w-full max-w-full">
          <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 min-w-0">
            {/* Left: Branding with Name and Logo */}
            <Link
              to="/"
              className="flex items-center gap-3 shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-xl min-w-0"
            >
              {usingCustomLogo || !defaultLogoError ? (
                <img
                  src={activeLogoSrc}
                  alt={brandName}
                  referrerPolicy="no-referrer"
                  onError={() => {
                    if (usingCustomLogo) {
                      setLogoError(true);
                    } else {
                      setDefaultLogoError(true);
                    }
                  }}
                  className="w-9 h-9 rounded-xl object-cover border border-neutral-800 shadow-sm shrink-0 bg-black"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-black font-display font-extrabold text-lg shadow-sm shrink-0 border border-neutral-700">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-poppins font-bold text-lg sm:text-xl tracking-tight text-white group-hover:text-pink-300 transition-colors whitespace-nowrap">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-white transition-all shadow-xs"
                  title="View your wallet balance and transactions"
                >
                  <WalletIcon className="w-3.5 h-3.5 text-pink-300 shrink-0" />
                  <span className="font-mono text-white font-bold">
                    {formatPrice(walletInUsd)}
                  </span>
                </Link>
              )}

              {/* Sign-in / User Profile Option - Navy Blue Button */}
              {user ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-700 text-xs text-white font-semibold">
                    <span className="max-w-[120px] truncate">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                    {isSeller && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        Seller
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={signOutUser}
                    className="p-2 rounded-full bg-neutral-900 hover:bg-rose-950 border border-neutral-700 hover:border-rose-500 text-neutral-200 hover:text-rose-200 transition-all shrink-0"
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
                className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-pink-300 text-white transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-xs"
              >
                <Menu className="w-5 h-5 text-white" />
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
          <div className="relative w-full max-w-md bg-black text-white h-full shadow-[0_0_50px_rgba(0,0,0,0.65)] border-l border-neutral-800 flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Header of Drawer */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
              <div className="flex items-center gap-2.5">
                {usingCustomLogo || !defaultLogoError ? (
                  <img
                    src={activeLogoSrc}
                    alt={brandName}
                    referrerPolicy="no-referrer"
                    onError={() => {
                      if (usingCustomLogo) {
                        setLogoError(true);
                      } else {
                        setDefaultLogoError(true);
                      }
                    }}
                    className="w-7 h-7 rounded-lg object-cover border border-neutral-700 shadow-xs shrink-0 bg-black"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white bg-neutral-900 border border-neutral-700">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                )}
                <span className="font-vintage italic font-bold text-lg text-white">
                  Menu &amp; Filters
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white transition-all"
                aria-label="Close Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body - Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Section 1: "Become a Seller" CTA Banner */}
              <div className="p-5 rounded-2xl bg-neutral-950 text-white shadow-lg border border-neutral-800">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-white/10 px-2.5 py-0.5 rounded-full mb-1.5 border border-neutral-700 text-white">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                      Seller Portal
                    </span>
                    <h3 className="font-display font-bold text-base text-white">
                      {isSeller ? 'Verified Seller Account' : 'Become a Verified Seller'}
                    </h3>
                    <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                      {isSeller
                        ? 'Your seller account is verified. Manage listings and receive instant payouts.'
                        : 'Submit your Google identity, phone, WhatsApp & National ID to start selling.'}
                    </p>
                  </div>
                </div>
                <Link
                  to={isSeller ? '/seller' : '/become-seller'}
                  onClick={() => setDrawerOpen(false)}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-extrabold text-xs uppercase tracking-wide shadow-md transition-colors"
                >
                  <span>{isSeller ? 'Open Selling Studio' : 'Become a Seller'}</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Section 2: Currency Selector */}
              <div className="black-subbox p-4 rounded-2xl border border-neutral-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-pink-300" />
                    Currency
                  </span>
                  <span className="font-mono text-xs font-bold text-white bg-neutral-900 px-2 py-0.5 rounded-md border border-neutral-700">
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
                            : 'bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 font-semibold'
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
              <div className="black-subbox p-4 rounded-2xl border border-neutral-800">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Gamepad2 className="w-4 h-4 text-pink-300" />
                    Game Filter
                  </span>
                  {filterGameSlug !== 'all' && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterGameSlug('all');
                        setDrawerGameQuery('');
                      }}
                      className="text-[11px] text-pink-300 font-bold hover:underline"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* Search Input for 339 Games */}
                <div className="relative mb-2.5">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={drawerGameQuery}
                    onChange={(e) => setDrawerGameQuery(e.target.value)}
                    placeholder="Search any game..."
                    aria-label="Search games in menu"
                    className="w-full black-input rounded-xl pl-8 pr-3 py-1.5 text-xs text-white font-semibold placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white"
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
                        : 'bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700'
                    }`}
                  >
                    <span>All Games</span>
                    <span className={filterGameSlug === 'all' ? 'text-neutral-200 text-[10px]' : 'text-neutral-400 text-[10px]'}>
                      ({catalogueGames.length})
                    </span>
                  </button>

                  {(() => {
                    const q = drawerGameQuery.trim().toLowerCase();
                    const combinedMap = new Map<string, typeof catalogueGames[number]>();
                    games.forEach((g) => combinedMap.set(g.slug.toLowerCase(), g));
                    catalogueGames.forEach((g) => {
                      const key = g.slug.toLowerCase();
                      const existing = combinedMap.get(key);
                      if (!existing) {
                        combinedMap.set(key, g);
                      } else if (!existing.iconUrl && g.iconUrl) {
                        combinedMap.set(key, { ...existing, iconUrl: g.iconUrl });
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
                              : 'bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {g.iconUrl && !failedDrawerLogos[g.slug] ? (
                              <img
                                src={g.iconUrl}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                                onError={() =>
                                  setFailedDrawerLogos((prev) => ({ ...prev, [g.slug]: true }))
                                }
                                className="w-5 h-5 rounded-md object-cover bg-black border border-neutral-700 shrink-0"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-md bg-neutral-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                                {g.title.charAt(0)}
                              </div>
                            )}
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
              <div className="black-subbox p-4 rounded-2xl border border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-pink-300" />
                    Max Price Filter
                  </span>
                  <span className="font-mono text-xs font-bold text-white bg-neutral-900 px-2.5 py-0.5 rounded-md border border-neutral-700">
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
                  className="w-full accent-white cursor-pointer"
                />
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-300 font-semibold mt-1">
                  <span>{formatPrice(5)}</span>
                  <span>{formatPrice(500)}</span>
                  <span>{formatPrice(1000)}</span>
                </div>
              </div>

              {/* Section 5: Account & Navigation Links */}
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <Link
                  to="/chat"
                  onClick={() => setDrawerOpen(false)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-600 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="w-4 h-4 text-pink-300" />
                    <span>Buyer &amp; Seller Chat</span>
                  </div>
                  {conversations.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-white text-black text-[11px] font-extrabold">
                      {conversations.length}
                    </span>
                  )}
                </Link>

                {isSeller && (
                  <Link
                    to="/seller"
                    onClick={() => setDrawerOpen(false)}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-600 text-white text-xs font-bold transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Store className="w-4 h-4 text-emerald-400" />
                      <span>Selling Studio (List &amp; Withdraw)</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </Link>
                )}

                <Link
                  to="/wallet"
                  onClick={() => setDrawerOpen(false)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-600 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <WalletIcon className="w-4 h-4 text-pink-300" />
                    <span>My Digital Wallet</span>
                  </div>
                  <span className="font-mono font-extrabold text-white bg-neutral-900 px-2 py-0.5 rounded-md border border-neutral-700">
                    {formatPrice(walletInUsd)}
                  </span>
                </Link>

                <Link
                  to="/orders"
                  onClick={() => setDrawerOpen(false)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-600 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="w-4 h-4 text-pink-300" />
                    <span>My Orders</span>
                  </div>
                  {orders.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-white text-black text-[11px] font-extrabold">
                      {orders.length}
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-950 text-center text-xs text-neutral-300 font-medium">
              <span className="font-brand font-normal text-sm text-white">Beatrix.gl</span>
              <span className="mx-1.5">•</span>
              <span className="font-script font-semibold text-sm text-neutral-300">Fast &amp; Secure Gaming Marketplace</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
