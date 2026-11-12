import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  User as UserIcon,
  Phone,
  MessageSquare,
  MapPin,
  FileText,
  Wallet as WalletIcon,
  Sparkles,
  ArrowRight,
  X,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { compressImageToDataUrl } from '../types';

export const BecomeSellerPage: React.FC = () => {
  const {
    user,
    signInWithGoogle,
    sellerRecord,
    isSeller,
    sellerApplication,
    submitSellerApplication,
  } = useMarketplace();

  const [fullName, setFullName] = useState(user?.displayName || '');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [nationalIdUrl, setNationalIdUrl] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleIdFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const compressedDataUrl = await compressImageToDataUrl(file, 1400, 900, 0.78);
      setNationalIdUrl(compressedDataUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process ID document';
      setUploadError(msg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      await signInWithGoogle();
      return;
    }
    if (!agreedTerms) {
      setUploadError('Please agree to the seller verification terms.');
      return;
    }
    if (!nationalIdUrl) {
      setUploadError('Please upload a clear image of your government approved national ID.');
      return;
    }

    setSubmitting(true);
    setUploadError(null);
    try {
      await submitSellerApplication({
        fullName,
        address,
        phoneNumber,
        whatsappNumber,
        nationalIdUrl,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      setUploadError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // State 1: Active Verified Seller
  if (isSeller && sellerRecord) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="frosted-glass-strong rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-[0_12px_36px_rgba(15,23,42,0.12)] text-center">
          <div className="w-16 h-16 neu-circle mx-auto flex items-center justify-center bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md mb-4">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black uppercase tracking-wider mb-2 border border-emerald-300">
            Verified Seller on Beatrix.gl
          </span>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900">
            Welcome, {sellerRecord.fullName}!
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-800 font-medium max-w-xl mx-auto">
            Your Google account is permanently authorized as a verified seller. Whenever you log in to Beatrix.gl, you retain your verified status, listing permissions, and wallet access.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-xl mx-auto">
            <div className="neu-flat p-4 rounded-2xl bg-white/90 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Seller ID / UID
              </span>
              <p className="font-mono text-xs font-bold text-[#0F172A] mt-1 truncate">
                {sellerRecord.userId}
              </p>
            </div>
            <div className="neu-flat p-4 rounded-2xl bg-white/90 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Registered Email
              </span>
              <p className="text-xs font-bold text-slate-900 mt-1 truncate">
                {sellerRecord.userEmail}
              </p>
            </div>
            {sellerRecord.whatsappNumber && (
              <div className="neu-flat p-4 rounded-2xl bg-white/90 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  WhatsApp Contact
                </span>
                <p className="text-xs font-bold text-slate-900 mt-1">
                  {sellerRecord.whatsappNumber}
                </p>
              </div>
            )}
            {sellerRecord.phoneNumber && (
              <div className="neu-flat p-4 rounded-2xl bg-white/90 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Phone
                </span>
                <p className="text-xs font-bold text-slate-900 mt-1">
                  {sellerRecord.phoneNumber}
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/wallet"
              className="btn-navy inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold text-sm shadow-md transition-all"
            >
              <WalletIcon className="w-4 h-4" />
              <span>Go to My Wallet</span>
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full neu-flat text-slate-800 hover:text-[#0F172A] font-bold text-sm transition-colors border border-slate-300"
            >
              <span>Explore Marketplace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 2: Under Review Phase
  if (sellerApplication && sellerApplication.status === 'Pending') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="frosted-glass-strong rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-[0_12px_36px_rgba(15,23,42,0.12)] text-center">
          <div className="w-16 h-16 neu-circle mx-auto flex items-center justify-center bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md mb-4">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider mb-2 border border-amber-300">
            Review Phase
          </span>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900">
            Application Under Review
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-800 font-medium max-w-lg mx-auto">
            Your verification request has been forwarded to the Beatrix.gl administration team. Our team verifies your government-approved national ID and details before unlocking seller privileges.
          </p>

          <div className="mt-8 p-6 neu-flat rounded-2xl bg-white/90 max-w-lg mx-auto text-left space-y-3 border border-slate-200">
            <h3 className="font-display font-extrabold text-sm text-slate-900 border-b border-slate-200 pb-2">
              Submitted Details
            </h3>
            <div className="text-xs space-y-2 text-slate-800 font-medium">
              <div>
                <span className="text-slate-600 font-semibold">Full Legal Name:</span>{' '}
                <span className="font-bold text-slate-900">{sellerApplication.fullName}</span>
              </div>
              <div>
                <span className="text-slate-600 font-semibold">Google Account:</span>{' '}
                <span className="font-bold text-slate-900">{sellerApplication.userEmail}</span>
              </div>
              <div>
                <span className="text-slate-600 font-semibold">WhatsApp:</span>{' '}
                <span className="font-bold text-slate-900">{sellerApplication.whatsappNumber}</span>
              </div>
              <div>
                <span className="text-slate-600 font-semibold">Phone:</span>{' '}
                <span className="font-bold text-slate-900">{sellerApplication.phoneNumber}</span>
              </div>
              <div>
                <span className="text-slate-600 font-semibold">Address:</span>{' '}
                <span className="font-bold text-slate-900">{sellerApplication.address}</span>
              </div>
              <div className="pt-2">
                <span className="text-slate-600 font-semibold block mb-1">Uploaded National ID:</span>
                <img
                  src={sellerApplication.nationalIdUrl}
                  alt="National ID Preview"
                  className="w-36 h-24 object-cover rounded-xl border border-slate-300 shadow-xs"
                />
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Link
              to="/"
              className="btn-navy inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-white font-bold text-xs sm:text-sm shadow-md"
            >
              <span>Back to Storefront</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Banned
  if (sellerRecord?.status === 'Banned') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="frosted-glass-strong rounded-3xl p-8 border border-rose-300 shadow-md text-center">
          <div className="w-16 h-16 neu-circle mx-auto flex items-center justify-center bg-rose-600 text-white shadow-md mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="font-display font-black text-2xl text-slate-900">
            Seller Account Suspended
          </h1>
          <p className="mt-2 text-sm text-slate-700 font-medium">
            Your seller permissions on Beatrix.gl have been suspended by the platform administrator. For inquiries or appeal, please contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      {/* Header Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full neu-flat text-[#0F172A] text-xs font-black uppercase tracking-wider mb-3 border border-slate-300">
          <Sparkles className="w-3.5 h-3.5" />
          Beatrix.gl Partner Program
        </div>
        <h1 className="font-display font-black text-3xl sm:text-4xl text-[#0F172A] tracking-tight">
          Become a Verified Seller
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-800 font-medium max-w-lg mx-auto">
          Start offering gaming currencies, accounts, items, and services. Complete your KYC verification with Google, contact numbers, and national ID.
        </p>
      </div>

      {/* Main Registration Card */}
      <div className="frosted-glass-strong rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-[0_12px_36px_rgba(15,23,42,0.12)]">
        {/* Google Sign-In Check */}
        {!user ? (
          <div className="neu-flat p-6 rounded-2xl text-center space-y-4 border border-slate-300">
            <div className="w-12 h-12 neu-circle mx-auto flex items-center justify-center text-[#0F172A] bg-slate-100">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-black text-base text-slate-900">
                Step 1: Sign In with Google
              </h3>
              <p className="text-xs text-slate-700 font-medium mt-1 max-w-sm mx-auto">
                Your seller privileges will be permanently linked to your authenticated Google account.
              </p>
            </div>
            <button
              type="button"
              onClick={signInWithGoogle}
              className="btn-navy inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold text-sm shadow-md"
            >
              <UserIcon className="w-4 h-4" />
              <span>Sign in with Google</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="neu-flat p-4 rounded-2xl flex items-center justify-between border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#0F172A] font-black border border-slate-300">
                  {user.displayName ? user.displayName.charAt(0) : 'U'}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {user.displayName || 'Google User'}
                  </div>
                  <div className="text-[11px] font-mono font-semibold text-slate-600">
                    {user.email}
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                Google Authenticated
              </span>
            </div>

            {uploadError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Field: Full Legal Name */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-1.5 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-[#0F172A]" />
                Full Legal Name (as on National ID) *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Johnathan Alexander Doe"
                maxLength={120}
                className="w-full neu-pressed rounded-xl px-4 py-2.5 text-sm text-slate-900 font-semibold placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0F172A] border border-slate-300"
              />
            </div>

            {/* Field: Phone Number & WhatsApp Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#0F172A]" />
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  maxLength={30}
                  className="w-full neu-pressed rounded-xl px-4 py-2.5 text-sm text-slate-900 font-semibold placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0F172A] border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                  WhatsApp Number *
                </label>
                <input
                  type="tel"
                  required
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. +91 98765 43210 (with country code)"
                  maxLength={30}
                  className="w-full neu-pressed rounded-xl px-4 py-2.5 text-sm text-slate-900 font-semibold placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-slate-300"
                />
              </div>
            </div>

            {/* Field: Full Physical Address */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#0F172A]" />
                Full Physical Address *
              </label>
              <textarea
                required
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House/Apartment #, Street, City, State, Postal Code, Country"
                maxLength={400}
                className="w-full neu-pressed rounded-xl px-4 py-2.5 text-sm text-slate-900 font-semibold placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0F172A] resize-none border border-slate-300"
              />
            </div>

            {/* Field: National ID Document Upload */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#0F172A]" />
                Government Approved National ID *
              </label>
              <p className="text-[11px] text-slate-700 font-medium mb-2">
                Upload your Passport, Aadhaar, Driver&apos;s License, or National ID Card. Must clearly show full name and photo.
              </p>

              {nationalIdUrl ? (
                <div className="relative neu-flat p-3 rounded-2xl inline-block bg-white/95 border border-slate-300">
                  <img
                    src={nationalIdUrl}
                    alt="National ID Preview"
                    className="w-full max-w-sm max-h-48 rounded-xl object-contain border border-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setNationalIdUrl('')}
                    className="absolute top-1 right-1 p-1.5 bg-rose-600 text-white rounded-full shadow-md hover:bg-rose-700 transition-colors"
                    title="Remove ID"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="mt-1 text-center text-[10px] font-bold text-emerald-800">
                    ✓ Document ready for review
                  </div>
                </div>
              ) : (
                <label className="neu-flat rounded-2xl p-6 border-2 border-dashed border-slate-300 hover:border-slate-500 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white/70 group">
                  <div className="w-12 h-12 neu-circle flex items-center justify-center text-[#0F172A] mb-2 group-hover:scale-110 transition-transform bg-slate-100">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    Click to select National ID file
                  </span>
                  <span className="text-[10px] text-slate-600 font-medium mt-0.5">
                    Supports JPG, PNG, WEBP (automatically optimized)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIdFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Checkbox Terms */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 rounded-sm accent-[#0F172A] w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-medium leading-relaxed">
                  I confirm that all information provided is accurate and represents my legal identity. I agree to fulfill orders honestly and abide by Beatrix.gl buyer protection policies.
                </span>
              </label>
            </div>

            {/* Submit Button (Navy) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn-navy w-full py-3.5 px-6 rounded-2xl text-white font-bold text-sm shadow-md transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Submitting KYC Application...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Submit Seller Verification Application</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

