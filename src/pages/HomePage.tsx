import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Clock,
  Star,
  PackageOpen,
  ChevronDown,
  X,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import defaultGamingBanner from '../assets/images/gaming_hero_clean_banner_1794497280637.jpg';
import { TOP_20_PROMINENT_GAMES, ProminentGameCard } from '../data/gamesCatalogue';
import { Game } from '../types';

interface TrustCardData {
  id: string;
  title: string;
  text: string;
}

interface ExitingTrustCard {
  uid: number;
  card: TrustCardData;
  targetX: number;
  targetY: number;
  targetRotate: number;
  startX: number;
  startY: number;
  flying: boolean;
}

interface ExitingGameCard {
  uid: number;
  card: ProminentGameCard;
  targetX: number;
  targetY: number;
  targetRotate: number;
  startX: number;
  startY: number;
  flying: boolean;
}

const TRUST_CARDS: TrustCardData[] = [
  {
    id: 'secure',
    title: 'Secure',
    text: '100% TradeShield buyer protection. Funds are safely locked in escrow and only released once you confirm verified in-game delivery.',
  },
  {
    id: 'encrypted',
    title: 'Encrypted',
    text: '256-bit SSL encrypted checkout, credential transfers, and end-to-end protected player transactions.',
  },
  {
    id: 'perfect',
    title: 'Perfect',
    text: 'Guaranteed dispute-free fulfillment track record with instant handoffs and verified top-tier sellers.',
  },
  {
    id: 'authorised',
    title: 'Authorised by Board',
    text: 'Compliant digital gaming asset exchange strictly following national regulatory commerce standards.',
  },
];

export const HomePage: React.FC = () => {
  const {
    siteSettings,
    categories,
    games,
    catalogueGames,
    listings,
    loadingData,
    selectedCategoryId,
    setSelectedCategoryId,
    formatPrice,
    filterGameSlug,
    setFilterGameSlug,
    priceFilterMax,
  } = useMarketplace();

  const navigate = useNavigate();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const cleanupTimersRef = useRef<number[]>([]);

  const [searchFilter, setSearchFilter] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [bannerLoadError, setBannerLoadError] = useState(false);

  // Swipeable Tilted Stack State for Trust Cards (Gestures Only)
  const [activeTrustIndex, setActiveTrustIndex] = useState(0);
  const [trustDragOffset, setTrustDragOffset] = useState({ x: 0, y: 0 });
  const [isTrustDragging, setIsTrustDragging] = useState(false);
  const [exitingTrustCards, setExitingTrustCards] = useState<ExitingTrustCard[]>([]);
  const trustDragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
  });

  // Swipeable Tilted Cards State for Top 20 Prominent Games (Swipe + Tap to Go)
  const [activeGameCardIndex, setActiveGameCardIndex] = useState(0);
  const [gameDragOffset, setGameDragOffset] = useState({ x: 0, y: 0 });
  const [isGameDragging, setIsGameDragging] = useState(false);
  const [exitingGameCards, setExitingGameCards] = useState<ExitingGameCard[]>([]);
  const gameDragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    maxMove: 0,
  });

  // Preload unique Top 20 artwork images so swiping never flashes an undecoded image
  useEffect(() => {
    const uniqueUrls = Array.from(new Set(TOP_20_PROMINENT_GAMES.map((g) => g.imageUrl)));
    uniqueUrls.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Cleanup any pending animation timers on unmount
  useEffect(() => {
    return () => {
      cleanupTimersRef.current.forEach((id) => window.clearTimeout(id));
      cleanupTimersRef.current = [];
    };
  }, []);

  // Close search suggestions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Merge Firestore games with 338 catalogue titles for live text-only search suggestions
  const searchableGamesList = useMemo(() => {
    const combined = new Map<string, Game>();
    games.forEach((g) => combined.set(g.slug.toLowerCase(), g));
    catalogueGames.forEach((g) => {
      if (!combined.has(g.slug.toLowerCase())) {
        combined.set(g.slug.toLowerCase(), g);
      }
    });
    return Array.from(combined.values());
  }, [games, catalogueGames]);

  const searchSuggestions = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return [];
    const startsWithMatches: Game[] = [];
    const containsMatches: Game[] = [];

    for (const g of searchableGamesList) {
      const lowerTitle = g.title.toLowerCase();
      if (lowerTitle.startsWith(q)) {
        startsWithMatches.push(g);
      } else if (lowerTitle.includes(q) || g.slug.toLowerCase().includes(q)) {
        containsMatches.push(g);
      }
    }

    return [...startsWithMatches, ...containsMatches].slice(0, 8);
  }, [searchableGamesList, searchFilter]);

  const activeListings = useMemo(() => {
    return listings.filter((l) => {
      if (!l.active) return false;
      if (filterGameSlug !== 'all' && l.gameSlug !== filterGameSlug) return false;
      if (l.price > priceFilterMax) return false;
      if (selectedCategoryId !== 'all' && l.categoryId !== selectedCategoryId) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.trim().toLowerCase();
        return (
          l.title.toLowerCase().includes(q) ||
          l.gameTitle.toLowerCase().includes(q) ||
          l.categoryName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [listings, filterGameSlug, priceFilterMax, selectedCategoryId, searchFilter]);

  // Determine active hero banner image source
  const heroImageSrc =
    !bannerLoadError && siteSettings?.heroBannerUrl
      ? siteSettings.heroBannerUrl
      : defaultGamingBanner;

  // Trust Card Handlers (Pure swipe gesture: left, right, or upward — always reveals card underneath)
  const triggerTrustSwipe = useCallback(
    (diffX: number, diffY: number, startX: number, startY: number) => {
      const swipedCard = TRUST_CARDS[activeTrustIndex];
      const uid = Date.now() + Math.random();
      const isVerticalSwipe = Math.abs(diffY) > Math.abs(diffX) && diffY < -45;
      const dirX = diffX >= 0 ? 1 : -1;
      const targetX = isVerticalSwipe ? startX + diffX * 1.4 : dirX * 460;
      const targetY = isVerticalSwipe ? -420 : startY + diffY * 0.4;
      const targetRotate = isVerticalSwipe ? dirX * 8 : dirX * 14;

      setExitingTrustCards((prev) => [
        ...prev,
        { uid, card: swipedCard, targetX, targetY, targetRotate, startX, startY, flying: false },
      ]);
      setActiveTrustIndex((prev) => (prev + 1) % TRUST_CARDS.length);
      setTrustDragOffset({ x: 0, y: 0 });

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setExitingTrustCards((prev) =>
            prev.map((item) => (item.uid === uid ? { ...item, flying: true } : item))
          );
        });
      });

      const timer = window.setTimeout(() => {
        setExitingTrustCards((prev) => prev.filter((item) => item.uid !== uid));
      }, 280);
      cleanupTimersRef.current.push(timer);
    },
    [activeTrustIndex]
  );

  const handleTrustPointerDown = (e: React.PointerEvent) => {
    trustDragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
    };
    setIsTrustDragging(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore pointer capture errors
    }
  };

  const handleTrustPointerMove = (e: React.PointerEvent) => {
    if (!trustDragRef.current.active || trustDragRef.current.pointerId !== e.pointerId) return;
    const diffX = e.clientX - trustDragRef.current.startX;
    const diffY = e.clientY - trustDragRef.current.startY;
    setTrustDragOffset({ x: diffX, y: diffY * 0.85 });
  };

  const handleTrustPointerUp = (e: React.PointerEvent) => {
    if (!trustDragRef.current.active || trustDragRef.current.pointerId !== e.pointerId) return;
    const diffX = e.clientX - trustDragRef.current.startX;
    const diffY = e.clientY - trustDragRef.current.startY;

    trustDragRef.current.active = false;
    trustDragRef.current.pointerId = -1;
    setIsTrustDragging(false);

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture already released
    }

    if (Math.abs(diffX) > 40 || diffY < -45) {
      triggerTrustSwipe(diffX, diffY, diffX, diffY * 0.85);
    } else {
      setTrustDragOffset({ x: 0, y: 0 });
    }
  };

  const handleTrustPointerCancel = (e: React.PointerEvent) => {
    if (!trustDragRef.current.active || trustDragRef.current.pointerId !== e.pointerId) return;
    trustDragRef.current.active = false;
    trustDragRef.current.pointerId = -1;
    setIsTrustDragging(false);
    setTrustDragOffset({ x: 0, y: 0 });
  };

  // Prominent Games Swipeable Cards Handlers (Left, right, or upward lift always reveals card underneath)
  const triggerGameSwipe = useCallback(
    (diffX: number, diffY: number, startX: number, startY: number) => {
      const swipedCard = TOP_20_PROMINENT_GAMES[activeGameCardIndex];
      const uid = Date.now() + Math.random();
      const isVerticalSwipe = Math.abs(diffY) > Math.abs(diffX) && diffY < -45;
      const dirX = diffX >= 0 ? 1 : -1;
      const targetX = isVerticalSwipe ? startX + diffX * 1.4 : dirX * 540;
      const targetY = isVerticalSwipe ? -480 : startY + diffY * 0.4;
      const targetRotate = isVerticalSwipe ? dirX * 8 : dirX * 14;

      setExitingGameCards((prev) => [
        ...prev,
        { uid, card: swipedCard, targetX, targetY, targetRotate, startX, startY, flying: false },
      ]);

      // Always advance to the card directly underneath (prev + 1) so it never swaps unexpectedly
      setActiveGameCardIndex((prev) => (prev + 1) % TOP_20_PROMINENT_GAMES.length);
      setGameDragOffset({ x: 0, y: 0 });

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setExitingGameCards((prev) =>
            prev.map((item) => (item.uid === uid ? { ...item, flying: true } : item))
          );
        });
      });

      const timer = window.setTimeout(() => {
        setExitingGameCards((prev) => prev.filter((item) => item.uid !== uid));
      }, 280);
      cleanupTimersRef.current.push(timer);
    },
    [activeGameCardIndex]
  );

  const handleGamePointerDown = (e: React.PointerEvent) => {
    gameDragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      maxMove: 0,
    };
    setIsGameDragging(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore pointer capture errors
    }
  };

  const handleGamePointerMove = (e: React.PointerEvent) => {
    if (!gameDragRef.current.active || gameDragRef.current.pointerId !== e.pointerId) return;
    const diffX = e.clientX - gameDragRef.current.startX;
    const diffY = e.clientY - gameDragRef.current.startY;
    const dist = Math.hypot(diffX, diffY);
    if (dist > gameDragRef.current.maxMove) {
      gameDragRef.current.maxMove = dist;
    }
    setGameDragOffset({ x: diffX, y: diffY * 0.85 });
  };

  const handleGamePointerUp = (e: React.PointerEvent, slug: string) => {
    if (!gameDragRef.current.active || gameDragRef.current.pointerId !== e.pointerId) return;
    const diffX = e.clientX - gameDragRef.current.startX;
    const diffY = e.clientY - gameDragRef.current.startY;
    const dist = Math.max(gameDragRef.current.maxMove, Math.hypot(diffX, diffY));

    gameDragRef.current.active = false;
    gameDragRef.current.pointerId = -1;
    setIsGameDragging(false);

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture already released
    }

    if (Math.abs(diffX) > 40 || diffY < -45) {
      triggerGameSwipe(diffX, diffY, diffX, diffY * 0.85);
    } else if (dist < 10) {
      setGameDragOffset({ x: 0, y: 0 });
      navigate(`/game/${slug}`);
    } else {
      setGameDragOffset({ x: 0, y: 0 });
    }
  };

  const handleGamePointerCancel = (e: React.PointerEvent) => {
    if (!gameDragRef.current.active || gameDragRef.current.pointerId !== e.pointerId) return;
    gameDragRef.current.active = false;
    gameDragRef.current.pointerId = -1;
    setIsGameDragging(false);
    setGameDragOffset({ x: 0, y: 0 });
  };

  if (loadingData) {
    return (
      <main className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-10 space-y-10 min-w-0 overflow-x-hidden">
        <div className="h-[420px] rounded-3xl frosted-glass animate-pulse" />
        <div className="h-12 w-full max-w-sm rounded-2xl frosted-glass animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-64 rounded-2xl frosted-glass animate-pulse"
            />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="w-full max-w-full space-y-12 sm:space-y-16 pb-20 overflow-x-hidden min-w-0">
      {/* =========================================================================
          1. Hero Section: Full-Width Edge-to-Edge Directly Under Beatrix.gl Bar
             Diluted atmospheric blend fading seamlessly downwards with zero visible line
         ========================================================================= */}
      <section className="relative w-full overflow-x-clip">
        <div className="relative w-full h-[400px] sm:h-[490px] md:h-[560px] lg:h-[620px]">
          {/* Diluted Top Artwork tapering smoothly into the blur well above the bottom */}
          <img
            src={heroImageSrc}
            alt="Gaming Showcase"
            referrerPolicy="no-referrer"
            onError={() => setBannerLoadError(true)}
            style={{
              maskImage:
                'linear-gradient(to bottom, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.58) 18%, rgba(0, 0, 0, 0.24) 36%, rgba(0, 0, 0, 0.06) 50%, transparent 62%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.58) 18%, rgba(0, 0, 0, 0.24) 36%, rgba(0, 0, 0, 0.06) 50%, transparent 62%)',
            }}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-70 select-none"
          />

          {/* Mid-Zone Soft Diluted Blur Layer */}
          <img
            src={heroImageSrc}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            style={{
              maskImage:
                'linear-gradient(to bottom, rgba(0, 0, 0, 0.16) 0%, rgba(0, 0, 0, 0.68) 24%, rgba(0, 0, 0, 0.42) 46%, rgba(0, 0, 0, 0.16) 64%, rgba(0, 0, 0, 0.04) 76%, transparent 86%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, rgba(0, 0, 0, 0.16) 0%, rgba(0, 0, 0, 0.68) 24%, rgba(0, 0, 0, 0.42) 46%, rgba(0, 0, 0, 0.16) 64%, rgba(0, 0, 0, 0.04) 76%, transparent 86%)',
            }}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-75 blur-2xl scale-105 pointer-events-none select-none"
          />

          {/* Deep Heavy Diluted Blur Layer dissolving completely before container bottom */}
          <img
            src={heroImageSrc}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            style={{
              maskImage:
                'linear-gradient(to bottom, transparent 8%, rgba(0, 0, 0, 0.65) 34%, rgba(0, 0, 0, 0.38) 54%, rgba(0, 0, 0, 0.14) 70%, rgba(0, 0, 0, 0.03) 82%, transparent 91%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 8%, rgba(0, 0, 0, 0.65) 34%, rgba(0, 0, 0, 0.38) 54%, rgba(0, 0, 0, 0.14) 70%, rgba(0, 0, 0, 0.03) 82%, transparent 91%)',
            }}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-65 blur-3xl scale-110 pointer-events-none select-none"
          />

          {/* Soft Elliptical Readability Scrim (zero straight edges on any side) */}
          <div
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(ellipse 80% 70% at 24% 40%, rgba(15, 23, 42, 0.62) 0%, rgba(15, 23, 42, 0.32) 45%, rgba(15, 23, 42, 0.08) 70%, transparent 88%)',
            }}
            className="absolute inset-0 pointer-events-none"
          />

          {/* In-Banner Content Overlay: Centered in vivid zone above downward blur, NO buttons, NO logo */}
          <div className="relative z-10 max-w-[1400px] mx-auto h-full px-4 sm:px-6 flex flex-col justify-center pb-16 sm:pb-24 md:pb-28">
            <div className="max-w-3xl min-w-0">
              <h1 className="font-display italic font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white tracking-tight leading-[1.12] drop-shadow-md">
                {siteSettings?.heroTitle || 'Next-Gen Digital Gaming Marketplace'}
              </h1>

              <p className="mt-2.5 sm:mt-4 font-editorial font-semibold text-sm sm:text-lg md:text-xl text-slate-100 leading-relaxed max-w-2xl drop-shadow-sm">
                {siteSettings?.heroSubtitle ||
                  'Premium currency, high-tier accounts, rare skins, and boosting services across Minecraft, Valorant, GTA V, and top global titles.'}
              </p>

              <div className="mt-4 sm:mt-6 flex items-center gap-2 font-script font-bold text-base sm:text-xl text-pink-200 tracking-wide select-none drop-shadow-sm">
                <span>Scroll down to explore marketplace offers</span>
                <ChevronDown className="w-4 h-4 text-pink-300 animate-bounce" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. Interactive Tilted & Swipeable Cards: Directly on Background
             (NO special box behind, NO serial number, NO buttons, ONLY heading + text, SWIPE ONLY)
         ========================================================================= */}
      <section className="relative w-full max-w-[1400px] mx-auto px-4 sm:px-6 pt-2">
        <div className="relative w-full max-w-[460px] mx-auto h-[220px] sm:h-[240px] flex items-center justify-center perspective-[1200px] select-none touch-none">
          {TRUST_CARDS.map((card, idx) => {
            const offset = (idx - activeTrustIndex + TRUST_CARDS.length) % TRUST_CARDS.length;

            if (offset > 2) return null;

            const isTop = offset === 0;
            const isSecond = offset === 1;

            const tiltAngle = isTop
              ? isTrustDragging
                ? trustDragOffset.x * 0.08
                : 0
              : isSecond
              ? 3.5
              : -3.5;

            const translateX = isTop ? trustDragOffset.x : isSecond ? 8 : -8;
            const translateY = isTop ? trustDragOffset.y : isSecond ? 12 : 24;
            const scale = isTop ? 1 : isSecond ? 0.95 : 0.9;
            const zIndex = isTop ? 40 : isSecond ? 30 : 20;
            const opacity = isTop ? 1 : isSecond ? 0.92 : 0.78;

            return (
              <div
                key={card.id}
                onDragStart={(e) => e.preventDefault()}
                onPointerDown={isTop ? handleTrustPointerDown : undefined}
                onPointerMove={isTop ? handleTrustPointerMove : undefined}
                onPointerUp={isTop ? handleTrustPointerUp : undefined}
                onPointerCancel={isTop ? handleTrustPointerCancel : undefined}
                style={{
                  transform: `translate3d(${translateX}px, ${translateY}px, 0) rotate(${tiltAngle}deg) scale(${scale})`,
                  zIndex,
                  opacity,
                  cursor: isTop
                    ? isTrustDragging
                      ? 'grabbing'
                      : 'grab'
                    : 'default',
                  transition:
                    isTrustDragging && isTop
                      ? 'none'
                      : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease',
                }}
                className="absolute inset-0 w-full h-full rounded-3xl p-6 sm:p-8 flex flex-col justify-center frosted-glass-strong border border-slate-200/90 shadow-[0_16px_36px_rgba(15,23,42,0.08),0_4px_16px_rgba(244,114,182,0.12)]"
              >
                <h3 className="font-brand font-normal text-2xl sm:text-3xl text-[#0F172A] tracking-wide">
                  {card.title}
                </h3>
                <p className="mt-2.5 sm:mt-3 font-editorial font-semibold text-sm sm:text-base text-slate-800 leading-relaxed">
                  {card.text}
                </p>
              </div>
            );
          })}

          {/* Outgoing Swiped Trust Cards (Independent Layer) */}
          {exitingTrustCards.map((item) => {
            const x = item.flying ? item.targetX : item.startX;
            const y = item.flying ? item.targetY : item.startY;
            const rotate = item.flying ? item.targetRotate : item.startX * 0.08;
            return (
              <div
                key={item.uid}
                aria-hidden="true"
                style={{
                  transform: `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg)`,
                  zIndex: 50,
                  opacity: item.flying ? 0 : 1,
                  transition: 'transform 0.26s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.24s ease',
                }}
                className="absolute inset-0 w-full h-full rounded-3xl p-6 sm:p-8 flex flex-col justify-center frosted-glass-strong border border-slate-200/90 shadow-[0_16px_36px_rgba(15,23,42,0.08),0_4px_16px_rgba(244,114,182,0.12)] pointer-events-none"
              >
                <h3 className="font-brand font-normal text-2xl sm:text-3xl text-[#0F172A] tracking-wide">
                  {item.card.title}
                </h3>
                <p className="mt-2.5 sm:mt-3 font-editorial font-semibold text-sm sm:text-base text-slate-800 leading-relaxed">
                  {item.card.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          3. Top 20 Prominent Games: Swipeable Image Cards (Pure Swipe + Tap to Go)
             No counters (x/20), no serial numbers, no prev/next buttons, no CTA buttons
         ========================================================================= */}
      <section
        aria-label="Popular Games"
        className="relative w-full max-w-[1400px] mx-auto px-4 sm:px-6 space-y-6 min-w-0"
      >
        <div className="text-center">
          <h2 className="font-vintage italic font-bold text-2xl sm:text-3xl lg:text-4xl text-[#0F172A] tracking-tight">
            Popular Games
          </h2>
        </div>

        {/* 3D Swipeable Deck Container */}
        <div className="relative w-full max-w-[540px] mx-auto h-[340px] sm:h-[380px] flex items-center justify-center perspective-[1200px] select-none touch-none pt-1">
          {TOP_20_PROMINENT_GAMES.map((gameCard, idx) => {
            const offset =
              (idx - activeGameCardIndex + TOP_20_PROMINENT_GAMES.length) %
              TOP_20_PROMINENT_GAMES.length;

            if (offset > 2) return null;

            const isTop = offset === 0;
            const isSecond = offset === 1;

            const tiltAngle = isTop
              ? isGameDragging
                ? gameDragOffset.x * 0.06
                : 0
              : isSecond
              ? 3.2
              : -3.2;

            const translateX = isTop ? gameDragOffset.x : isSecond ? 10 : -10;
            const translateY = isTop ? gameDragOffset.y : isSecond ? 14 : 28;
            const scale = isTop ? 1 : isSecond ? 0.95 : 0.9;
            const zIndex = isTop ? 40 : isSecond ? 30 : 20;
            const opacity = isTop ? 1 : isSecond ? 0.92 : 0.78;

            return (
              <div
                key={gameCard.id}
                role={isTop ? 'button' : undefined}
                tabIndex={isTop ? 0 : -1}
                aria-label={isTop ? `Open ${gameCard.title} marketplace` : undefined}
                onDragStart={(e) => e.preventDefault()}
                onPointerDown={isTop ? handleGamePointerDown : undefined}
                onPointerMove={isTop ? handleGamePointerMove : undefined}
                onPointerUp={
                  isTop ? (e) => handleGamePointerUp(e, gameCard.slug) : undefined
                }
                onPointerCancel={isTop ? handleGamePointerCancel : undefined}
                onKeyDown={
                  isTop
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/game/${gameCard.slug}`);
                        } else if (e.key === 'ArrowRight') {
                          e.preventDefault();
                          triggerGameSwipe(-60, 0, 0, 0);
                        } else if (e.key === 'ArrowLeft') {
                          e.preventDefault();
                          triggerGameSwipe(60, 0, 0, 0);
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          triggerGameSwipe(0, -60, 0, 0);
                        }
                      }
                    : undefined
                }
                style={{
                  transform: `translate3d(${translateX}px, ${translateY}px, 0) rotate(${tiltAngle}deg) scale(${scale})`,
                  zIndex,
                  opacity,
                  cursor: isTop
                    ? isGameDragging
                      ? 'grabbing'
                      : 'pointer'
                    : 'default',
                  transition:
                    isGameDragging && isTop
                      ? 'none'
                      : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease',
                }}
                className="absolute inset-0 w-full h-full rounded-3xl overflow-hidden bg-slate-950 border border-slate-200/90 shadow-[0_20px_45px_rgba(15,23,42,0.14),0_6px_20px_rgba(244,114,182,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]"
              >
                <img
                  src={gameCard.imageUrl}
                  alt={gameCard.title}
                  decoding="sync"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center pointer-events-none select-none"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent pointer-events-none"
                />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 pointer-events-none">
                  <h3 className="font-vintage font-extrabold text-xl sm:text-2xl text-white tracking-tight drop-shadow-md truncate">
                    {gameCard.title}
                  </h3>
                </div>
              </div>
            );
          })}

          {/* Outgoing Swiped Game Cards (Independent Layer — Zero Flash-Back) */}
          {exitingGameCards.map((item) => {
            const x = item.flying ? item.targetX : item.startX;
            const y = item.flying ? item.targetY : item.startY;
            const rotate = item.flying ? item.targetRotate : item.startX * 0.06;
            return (
              <div
                key={item.uid}
                aria-hidden="true"
                style={{
                  transform: `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg)`,
                  zIndex: 50,
                  opacity: item.flying ? 0 : 1,
                  transition: 'transform 0.26s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.24s ease',
                }}
                className="absolute inset-0 w-full h-full rounded-3xl overflow-hidden bg-slate-950 border border-slate-200/90 shadow-[0_20px_45px_rgba(15,23,42,0.14),0_6px_20px_rgba(244,114,182,0.16)] pointer-events-none"
              >
                <img
                  src={item.card.imageUrl}
                  alt={item.card.title}
                  decoding="sync"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center pointer-events-none select-none"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent pointer-events-none"
                />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 pointer-events-none">
                  <h3 className="font-vintage font-extrabold text-xl sm:text-2xl text-white tracking-tight drop-shadow-md truncate">
                    {item.card.title}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          4. Live Game Search Suggestions (338 Text Catalogue) & Active Marketplace Offers
             (NO game grid dump)
         ========================================================================= */}
      <section className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 space-y-6 min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h2 className="font-display font-bold text-xl sm:text-2xl lg:text-3xl text-[#0F172A] tracking-tight">
              Active Marketplace Offers
            </h2>
            <p className="font-editorial italic text-sm sm:text-base text-slate-800 font-semibold mt-1">
              Instant &amp; verified player-to-player offers protected by TradeShield.
            </p>
          </div>

          {/* Search Input with Live Text-Only Game Suggestions */}
          <div ref={searchContainerRef} className="relative w-full lg:w-96 min-w-0">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none shrink-0 z-10" />
            <input
              type="text"
              value={searchFilter}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setSearchFocused(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchFocused(false);
                }
              }}
              placeholder="Search any game or offer..."
              aria-label="Search any game or offer"
              aria-expanded={searchFocused && searchSuggestions.length > 0}
              aria-autocomplete="list"
              className="w-full neu-pressed rounded-full pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-900 font-semibold placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0F172A] transition-all"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => {
                  setSearchFilter('');
                  setSearchFocused(false);
                }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-500 hover:text-slate-900 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Text-Only Suggestions Dropdown for All Catalogue Games */}
            {searchFocused && searchFilter.trim().length > 0 && (
              <div
                role="listbox"
                aria-label="Game search suggestions"
                className="absolute left-0 right-0 top-full mt-2 z-30 bg-white/95 backdrop-blur-xl rounded-2xl border border-pink-200/90 shadow-[0_16px_36px_rgba(15,23,42,0.14)] overflow-hidden divide-y divide-slate-100"
              >
                {searchSuggestions.length === 0 ? (
                  <div className="px-4 py-3 text-xs font-medium text-slate-600">
                    No matching games found for &ldquo;{searchFilter.trim()}&rdquo;
                  </div>
                ) : (
                  searchSuggestions.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      role="option"
                      onMouseDown={(ev) => {
                        ev.preventDefault();
                        setSearchFocused(false);
                        setSearchFilter('');
                        navigate(`/game/${g.slug}`);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#0F172A] hover:bg-[#FFF0F5] transition-colors flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{g.title}</span>
                      <span className="text-[11px] font-bold text-pink-700 shrink-0">
                        View Market
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Category Filter Bar (Navy & Light Pink Pills) */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setSelectedCategoryId('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategoryId === 'all'
                ? 'btn-navy text-white shadow-xs'
                : 'bg-white/90 hover:bg-[#FFF0F5] text-[#0F172A] border border-pink-200/90 hover:border-[#0F172A] shadow-xs'
            }`}
          >
            All Categories
          </button>

          {categories.map((cat) => {
            const active = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  active
                    ? 'btn-navy text-white shadow-xs'
                    : 'bg-white/90 hover:bg-[#FFF0F5] text-[#0F172A] border border-pink-200/90 hover:border-[#0F172A] shadow-xs'
                }`}
              >
                {cat.name}
              </button>
            );
          })}

          {filterGameSlug !== 'all' && (
            <button
              type="button"
              onClick={() => setFilterGameSlug('all')}
              className="px-4 py-2 rounded-full text-xs font-bold bg-[#FFF0F5] text-[#0F172A] border border-pink-300 hover:border-[#0F172A] inline-flex items-center gap-1.5 transition-all"
            >
              <span>Game filter active</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Active Marketplace Offers Grid */}
        {activeListings.length === 0 ? (
          <div className="frosted-glass rounded-3xl p-8 sm:p-10 text-center max-w-xl mx-auto space-y-2.5 border border-slate-300">
            <PackageOpen className="w-8 h-8 text-[#0F172A] mx-auto" />
            <h3 className="font-display font-bold text-base text-slate-900">
              No active marketplace offers match right now
            </h3>
            <p className="text-xs text-slate-700 font-medium">
              Search any of our 338 games above or adjust your category filter.
            </p>
            {(selectedCategoryId !== 'all' || filterGameSlug !== 'all' || searchFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryId('all');
                  setFilterGameSlug('all');
                  setSearchFilter('');
                }}
                className="btn-navy px-4 py-2 rounded-full text-white font-bold text-xs shadow-sm"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 w-full">
            {activeListings.slice(0, 9).map((offer) => (
              <Link
                key={offer.id}
                to={`/listing/${offer.id}`}
                className="group frosted-glass hover:frosted-glass-strong rounded-2xl p-5 flex flex-col justify-between gap-4 border border-slate-200 hover:border-slate-400 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-1 w-full min-w-0"
              >
                <div className="space-y-3 min-w-0">
                  <div className="flex items-center justify-between text-xs text-slate-700 font-medium gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 truncate min-w-0">
                      <span className="font-bold text-[#0F172A] truncate">
                        {offer.gameTitle}
                      </span>
                      <span aria-hidden="true" className="shrink-0 text-slate-400">·</span>
                      <span className="truncate font-semibold text-slate-700">{offer.categoryName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-800 font-bold shrink-0">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
                      <span>{offer.deliverySpeed}</span>
                    </div>
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
                      <h3 className="font-vintage font-bold text-sm sm:text-base text-[#0F172A] group-hover:text-blue-900 transition-colors line-clamp-2 break-words">
                        {offer.title}
                      </h3>
                      <p className="text-xs text-slate-700 font-medium line-clamp-2 mt-1 break-words">
                        {offer.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3.5 border-t border-slate-200 flex items-center justify-between gap-3 min-w-0">
                  <div className="text-xs text-slate-700 flex items-center gap-1.5 min-w-0 truncate">
                    <span className="text-[#0F172A] font-bold truncate">
                      {offer.sellerName}
                    </span>
                    <span aria-hidden="true" className="shrink-0 text-slate-400">·</span>
                    <span className="inline-flex items-center gap-0.5 text-slate-900 font-mono font-bold tabular-nums shrink-0">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-500 shrink-0" />
                      {Number(offer.sellerRating).toFixed(1)}
                    </span>
                    <span aria-hidden="true" className="shrink-0 text-slate-400">·</span>
                    <span className="font-mono tabular-nums text-slate-600 font-semibold shrink-0">
                      {offer.stock} left
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-black text-base sm:text-lg text-[#0F172A] tabular-nums">
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
