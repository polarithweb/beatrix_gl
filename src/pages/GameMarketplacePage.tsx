import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Clock,
  Star,
  PackageOpen,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';

export const GameMarketplacePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { games, catalogueGames, categories, listings, loadingData, formatPrice } =
    useMarketplace();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [priceSort, setPriceSort] = useState<'none' | 'asc' | 'desc' | 'rating'>('none');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState<boolean>(true);
  const [bannerError, setBannerError] = useState(false);

  const game = useMemo(
    () =>
      games.find((g) => g.slug === slug || g.id === slug) ||
      catalogueGames.find((g) => g.slug === slug || g.id === slug),
    [games, catalogueGames, slug]
  );

  const gameCategories = useMemo(() => {
    if (!game) return categories;
    if (!game.categoryIds || game.categoryIds.length === 0) return categories;
    const linked = categories.filter((c) => game.categoryIds.includes(c.id));
    return linked.length > 0 ? linked : categories;
  }, [game, categories]);

  const gameListings = useMemo(() => {
    if (!game) return [];
    const filtered = listings.filter((l) => {
      if (!l.active) return false;
      if (l.gameId !== game.id && l.gameSlug !== game.slug) return false;
      if (selectedCategoryId !== 'all' && l.categoryId !== selectedCategoryId) return false;
      if (inStockOnly && l.stock <= 0) return false;
      if (
        deliveryFilter !== 'all' &&
        l.deliverySpeed.toLowerCase() !== deliveryFilter.toLowerCase()
      ) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        return (
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.sellerName.toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (priceSort === 'asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (priceSort === 'desc') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (priceSort === 'rating') {
      filtered.sort((a, b) => b.sellerRating - a.sellerRating);
    }

    return filtered;
  }, [game, listings, selectedCategoryId, inStockOnly, deliveryFilter, searchTerm, priceSort]);

  const availableDeliverySpeeds = useMemo(() => {
    if (!game) return ['Instant', '15 Minutes', '1 Hour', '24 Hours'];
    const speeds = new Set<string>();
    listings
      .filter((l) => (l.gameId === game.id || l.gameSlug === game.slug) && l.active)
      .forEach((l) => {
        if (l.deliverySpeed) speeds.add(l.deliverySpeed);
      });
    return Array.from(speeds);
  }, [game, listings]);

  if (loadingData) {
    return (
      <main className="max-w-[1400px] w-full max-w-full min-w-0 mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="h-56 rounded-3xl frosted-glass animate-pulse" />
        <div className="h-14 rounded-2xl frosted-glass animate-pulse" />
      </main>
    );
  }

  if (!game) {
    return (
      <main className="max-w-[1400px] w-full max-w-full min-w-0 mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl neu-circle flex items-center justify-center mx-auto text-[#0F172A] bg-slate-100">
          <PackageOpen className="w-8 h-8" />
        </div>
        <h1 className="font-display font-black text-2xl text-slate-900">Game Not Found</h1>
        <p className="text-sm text-slate-700 font-medium max-w-md mx-auto">
          The requested game catalog could not be found or has not been created yet.
        </p>
        <Link
          to="/"
          className="btn-navy inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-bold text-xs shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </Link>
      </main>
    );
  }

  return (
    <main className="space-y-8 pb-16 w-full max-w-full overflow-x-hidden min-w-0">
      {/* Custom Game Header Banner */}
      <section className="relative w-full max-w-full py-6 px-4 sm:px-6">
        <div className="max-w-[1400px] w-full mx-auto relative rounded-3xl frosted-glass-strong p-6 sm:p-10 border border-slate-200 shadow-[0_12px_36px_rgba(15,23,42,0.08)] overflow-hidden min-w-0 space-y-6">
          {game.bannerUrl && !bannerError && (
            <img
              src={game.bannerUrl}
              alt={game.title}
              referrerPolicy="no-referrer"
              onError={() => setBannerError(true)}
              className="absolute inset-0 w-full h-full object-cover opacity-12 pointer-events-none"
            />
          )}

          <Link
            to="/"
            className="relative z-10 inline-flex items-center gap-1.5 text-xs font-bold text-[#0F172A] hover:text-blue-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Marketplace Games</span>
          </Link>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 min-w-0">
            <div className="flex items-center gap-4 min-w-0">
              {game.iconUrl ? (
                <img
                  src={game.iconUrl}
                  alt={game.title}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white bg-white shadow-md shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl btn-navy text-white font-brand font-normal text-3xl flex items-center justify-center shadow-md shrink-0">
                  {game.title.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-script text-base text-[#0F172A] font-bold truncate">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#0F172A]" />
                  <span>Verified Game Marketplace</span>
                </div>
                <h1 className="font-vintage font-extrabold text-2xl sm:text-4xl text-[#0F172A] mt-0.5 truncate break-words">
                  {game.title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-800 font-bold mt-1 font-mono tabular-nums">
                  {gameListings.length} matching {gameListings.length === 1 ? 'offer' : 'offers'} available
                </p>
              </div>
            </div>
          </div>

          {/* Game-Specific Category Tabs (Navy) */}
          <div className="relative z-10 pt-2 flex flex-wrap items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('all')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                selectedCategoryId === 'all'
                  ? 'btn-navy text-white shadow-xs'
                  : 'neu-flat text-slate-800 hover:text-[#0F172A] border border-slate-300'
              }`}
            >
              All Offers
            </button>
            {gameCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  selectedCategoryId === cat.id
                    ? 'btn-navy text-white shadow-xs'
                    : 'neu-flat text-slate-800 hover:text-[#0F172A] border border-slate-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Filter & Sort Controls Bar */}
      <section className="max-w-[1400px] w-full max-w-full min-w-0 mx-auto px-4 sm:px-6 space-y-6">
        <div className="frosted-glass rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border border-slate-200 shadow-sm min-w-0">
          {/* Search within game offers */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${game.title} offers by keyword or seller...`}
              aria-label="Search game offers"
              className="w-full neu-pressed rounded-full pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 font-semibold placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0F172A] transition-all"
            />
          </div>

          {/* Sort & Filter Controls */}
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            {/* Delivery Speed Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="delivery-filter" className="text-xs font-bold text-slate-800 whitespace-nowrap">
                Delivery:
              </label>
              <select
                id="delivery-filter"
                value={deliveryFilter}
                onChange={(e) => setDeliveryFilter(e.target.value)}
                className="neu-pressed rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F172A] font-bold"
              >
                <option value="all">All Speeds</option>
                {availableDeliverySpeeds.map((speed) => (
                  <option key={speed} value={speed}>
                    {speed}
                  </option>
                ))}
              </select>
            </div>

            {/* Price & Rating Sort */}
            <div className="flex items-center gap-2">
              <label htmlFor="price-sort" className="text-xs font-bold text-slate-800 whitespace-nowrap">
                Sort:
              </label>
              <select
                id="price-sort"
                value={priceSort}
                onChange={(e) =>
                  setPriceSort(e.target.value as 'none' | 'asc' | 'desc' | 'rating')
                }
                className="neu-pressed rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F172A] font-bold"
              >
                <option value="none">Recommended</option>
                <option value="asc">Price: Low to High</option>
                <option value="desc">Price: High to Low</option>
                <option value="rating">Seller Rating</option>
              </select>
            </div>

            {/* In Stock Toggle */}
            <button
              type="button"
              onClick={() => setInStockOnly((v) => !v)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                inStockOnly
                  ? 'btn-navy text-white shadow-xs'
                  : 'neu-flat text-slate-800 border border-slate-300'
              }`}
            >
              {inStockOnly ? 'In Stock Only: ON' : 'Include Out of Stock'}
            </button>
          </div>
        </div>

        {/* Listings Grid */}
        {gameListings.length === 0 ? (
          <div className="frosted-glass rounded-3xl p-12 text-center space-y-3 border border-slate-300">
            <SlidersHorizontal className="w-8 h-8 text-slate-600 mx-auto" />
            <h2 className="font-display font-black text-lg text-slate-900">
              No matching offers found for {game.title}
            </h2>
            <p className="text-xs text-slate-700 font-medium max-w-md mx-auto">
              Either no offers have been published for this category yet, or your active filters
              excluded them.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryId('all');
                setSearchTerm('');
                setDeliveryFilter('all');
                setPriceSort('none');
                setInStockOnly(false);
              }}
              className="btn-navy px-4 py-2 rounded-full text-white font-bold text-xs shadow-sm hover:scale-102 transition-transform"
            >
              Reset Offer Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-w-0">
            {gameListings.map((offer) => (
              <Link
                key={offer.id}
                to={`/listing/${offer.id}`}
                className="group frosted-glass hover:frosted-glass-strong rounded-2xl p-5 flex flex-col justify-between gap-4 border border-slate-200 hover:border-slate-400 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-1 min-w-0 overflow-hidden"
              >
                <div className="space-y-3 min-w-0">
                  <div className="flex items-center justify-between text-xs text-slate-700 font-medium">
                    <span className="font-bold text-[#0F172A] truncate">{offer.categoryName}</span>
                    <span className="inline-flex items-center gap-1 text-emerald-800 font-bold shrink-0">
                      <Clock className="w-3.5 h-3.5 text-emerald-700" />
                      {offer.deliverySpeed}
                    </span>
                  </div>

                  <div className="flex items-start gap-3.5 min-w-0">
                    {offer.imageUrl && (
                      <img
                        src={offer.imageUrl}
                        alt={offer.title}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-xl object-cover bg-slate-100 border border-slate-300 shadow-xs shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-vintage font-bold text-base text-[#0F172A] group-hover:text-blue-900 transition-colors line-clamp-2 break-words">
                        {offer.title}
                      </h3>
                      <p className="text-xs text-slate-700 font-medium line-clamp-2 mt-1 break-words">
                        {offer.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3.5 border-t border-slate-200 flex items-center justify-between gap-4 min-w-0">
                  <div className="text-xs text-slate-700 flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-[#0F172A] font-bold truncate">
                      {offer.sellerName}
                    </span>
                    <span aria-hidden="true" className="text-slate-400">·</span>
                    <span className="inline-flex items-center gap-1 text-slate-900 font-mono font-bold tabular-nums shrink-0">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                      {Number(offer.sellerRating).toFixed(1)}
                    </span>
                    <span aria-hidden="true" className="text-slate-400">·</span>
                    <span className="font-mono tabular-nums text-slate-600 font-semibold shrink-0">
                      {offer.stock > 0 ? `${offer.stock} left` : '0 left'}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-black text-lg text-[#0F172A] tabular-nums">
                      {formatPrice(offer.price)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

