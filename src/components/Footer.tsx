import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Zap } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { DEFAULT_BRAND_LOGO_PATH, parseFooterLink } from '../types';

export const Footer: React.FC = () => {
  const { siteSettings, categories, setSelectedCategoryId } = useMarketplace();
  const [logoError, setLogoError] = useState(false);
  const [defaultLogoError, setDefaultLogoError] = useState(false);

  useEffect(() => {
    setLogoError(false);
  }, [siteSettings?.logoUrl]);

  const brandName = siteSettings?.siteName || 'Beatrix.gl';
  const defaultLogoSrc = `${import.meta.env.BASE_URL}${DEFAULT_BRAND_LOGO_PATH}`;
  const usingCustomLogo = Boolean(siteSettings?.logoUrl && !logoError);
  const activeLogoSrc = usingCustomLogo ? siteSettings!.logoUrl : defaultLogoSrc;
  const paymentBadges = siteSettings?.paymentBadges || [];
  const supportLinks = (siteSettings?.supportLinks || []).map(parseFooterLink);
  const legalLinks = (siteSettings?.legalLinks || []).map(parseFooterLink);
  const copyrightText =
    siteSettings?.copyrightText ||
    `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`;

  return (
    <footer className="bg-black text-white border-t border-neutral-800 mt-20 w-full max-w-full overflow-x-hidden min-w-0 transition-colors shadow-[0_-8px_30px_rgba(0,0,0,0.45)]">
      {/* Buyer Trust & Payment Strip */}
      <div className="border-b border-neutral-800 w-full bg-neutral-950">
        <div className="max-w-[1400px] w-full max-w-full min-w-0 mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 sm:gap-6 text-xs text-white font-bold">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-pink-300 shrink-0" />
              <span>TradeShield 100% Buyer Protection</span>
            </div>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-pink-300 shrink-0" />
              <span>Verified Instant &amp; Timed Delivery</span>
            </div>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-pink-300 shrink-0" />
              <span>Encrypted Checkout</span>
            </div>
          </div>

          {/* Dynamic Payment Method Badges */}
          {paymentBadges.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 justify-center">
              <span className="text-xs text-neutral-300 mr-1 font-bold">Supported Payments:</span>
              {paymentBadges.map((badge, idx) => (
                <span
                  key={`${badge}_${idx}`}
                  className="px-2.5 py-1 rounded-full black-subbox text-xs font-mono font-bold text-white border border-neutral-700"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Footer Columns */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Column 1: Brand Summary */}
        <div className="space-y-3">
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
                className="w-8 h-8 rounded-xl object-cover border border-neutral-700 shadow-sm shrink-0 bg-black"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl btn-navy flex items-center justify-center text-white font-brand font-normal text-lg shadow-sm">
                {brandName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-brand font-normal text-xl text-white">
              {brandName}
            </span>
          </div>
          <p className="font-editorial text-base text-neutral-300 font-semibold leading-relaxed max-w-xs">
            {siteSettings?.heroSubtitle ||
              'Digital gaming marketplace for in-game currency, verified accounts, rare items, and boosting services.'}
          </p>
        </div>

        {/* Column 2: Marketplace Categories */}
        <div>
          <h3 className="font-vintage font-bold text-base text-white mb-3.5 tracking-tight">
            Marketplace Categories
          </h3>
          {categories.length === 0 ? (
            <p className="text-xs text-neutral-400 font-medium">No categories configured yet.</p>
          ) : (
            <ul className="space-y-2 text-sm text-neutral-300 font-medium">
              {categories.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <Link
                    to="/"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className="hover:text-white hover:underline transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Column 3: Support Navigation */}
        <div>
          <h3 className="font-vintage font-bold text-base text-white mb-3.5 tracking-tight">
            Support &amp; Buyer Care
          </h3>
          {supportLinks.length === 0 ? (
            <ul className="space-y-2 text-sm text-neutral-300 font-medium">
              <li>
                <Link to="/orders" className="hover:text-white hover:underline transition-colors">
                  Order Lookup &amp; Status
                </Link>
              </li>
              <li>
                <span className="text-neutral-400 text-xs">
                  Additional support links configurable in site settings.
                </span>
              </li>
            </ul>
          ) : (
            <ul className="space-y-2 text-sm text-neutral-300 font-medium">
              {supportLinks.map((item, idx) => (
                <li key={`${item.label}_${idx}`}>
                  <a
                    href={item.url}
                    className="hover:text-white hover:underline transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Column 4: Legal & Marketplace Rules */}
        <div>
          <h3 className="font-vintage font-bold text-base text-white mb-3.5 tracking-tight">
            Legal &amp; Rules
          </h3>
          {legalLinks.length === 0 ? (
            <p className="text-xs text-neutral-400 font-medium">
              Legal and marketplace policy links can be configured in global site settings.
            </p>
          ) : (
            <ul className="space-y-2 text-sm text-neutral-300 font-medium">
              {legalLinks.map((item, idx) => (
                <li key={`${item.label}_${idx}`}>
                  <a
                    href={item.url}
                    className="hover:text-white hover:underline transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Bottom Copyright */}
      <div className="border-t border-neutral-800 py-5 bg-black">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-300 font-semibold">
          <span>{copyrightText}</span>
          <span>All game titles and trademarks belong to their respective owners.</span>
        </div>
      </div>
    </footer>
  );
};

