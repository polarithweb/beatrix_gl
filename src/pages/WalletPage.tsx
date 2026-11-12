import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle2,
  PlusCircle,
  HelpCircle,
  User as UserIcon,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { CURRENCIES, getMinWithdrawalInCurrency } from '../types';

export const WalletPage: React.FC = () => {
  const {
    user,
    signInWithGoogle,
    wallet,
    walletTransactions,
    currency,
    formatPrice,
    formatInr,
    depositToWallet,
    withdrawFromWallet,
    minWithdrawalInr,
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<'all' | 'deposits' | 'withdrawals' | 'orders'>('all');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState<number>(1000);
  const [depositDesc, setDepositDesc] = useState('Account Balance Deposit');
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  // Withdraw Form State
  const [withdrawAmount, setWithdrawAmount] = useState<number>(minWithdrawalInr);
  const [payoutDetails, setPayoutDetails] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const balanceInr = wallet?.balanceInr || 0;
  const balanceInUsd = balanceInr / CURRENCIES.INR.rate;
  const minLimitInActiveCurrency = getMinWithdrawalInCurrency(currency);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError(null);
    setIsDepositing(true);
    try {
      await depositToWallet(depositAmount, depositDesc);
      setShowDepositModal(false);
    } catch (err: unknown) {
      setDepositError(err instanceof Error ? err.message : 'Deposit failed');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    if (withdrawAmount < minWithdrawalInr) {
      setWithdrawError(`Minimum withdrawal is ₹${minWithdrawalInr.toLocaleString()} INR.`);
      return;
    }
    if (balanceInr < withdrawAmount) {
      setWithdrawError(`Insufficient funds. Your balance is ₹${balanceInr.toLocaleString()} INR.`);
      return;
    }
    if (!payoutDetails.trim()) {
      setWithdrawError('Please enter your Bank Account, UPI ID, or PayPal address.');
      return;
    }

    setIsWithdrawing(true);
    try {
      await withdrawFromWallet(withdrawAmount, payoutDetails);
      setShowWithdrawModal(false);
      setPayoutDetails('');
    } catch (err: unknown) {
      setWithdrawError(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const filteredTransactions = walletTransactions.filter((tx) => {
    if (activeTab === 'deposits') return tx.type === 'Deposit';
    if (activeTab === 'withdrawals') return tx.type === 'Withdrawal';
    if (activeTab === 'orders') return tx.type === 'Purchase' || tx.type === 'Sale';
    return true;
  });

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="frosted-glass-strong rounded-3xl p-8 border border-slate-200 shadow-[0_12px_36px_rgba(15,23,42,0.12)]">
          <div className="w-16 h-16 neu-circle mx-auto flex items-center justify-center text-[#0F172A] bg-slate-100 mb-4">
            <WalletIcon className="w-8 h-8" />
          </div>
          <h1 className="font-display font-black text-2xl text-slate-900">
            Sign In to Access Your Wallet
          </h1>
          <p className="mt-2 text-sm text-slate-700 font-medium">
            All marketplace buying, selling payouts, and withdrawals flow through your secure digital wallet.
          </p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="btn-navy mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold text-sm shadow-md"
          >
            <UserIcon className="w-4 h-4" />
            <span>Sign in with Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full neu-flat text-[#0F172A] text-xs font-black uppercase tracking-wider mb-2 border border-slate-300">
            <Sparkles className="w-3.5 h-3.5" />
            Beatrix.gl Financial Center
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-[#0F172A]">
            Digital Gaming Wallet
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDepositModal(true)}
            className="btn-navy inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-white font-bold text-xs uppercase tracking-wide shadow-md"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Funds</span>
          </button>
          <button
            type="button"
            onClick={() => setShowWithdrawModal(true)}
            className="btn-navy-outline inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wide transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Withdraw</span>
          </button>
        </div>
      </div>

      {/* Main Balance Card with Neomorphic Styling */}
      <div className="frosted-glass-strong rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-[0_12px_36px_rgba(15,23,42,0.1)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Col 1: Primary Balance in INR */}
          <div className="md:col-span-2 space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <WalletIcon className="w-4 h-4 text-[#0F172A]" />
              Available Balance
            </span>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-display font-black text-3xl sm:text-5xl text-[#0F172A] tracking-tight">
                {formatInr(balanceInr)}
              </span>
              <span className="font-mono text-base sm:text-lg font-black text-[#0F172A] bg-slate-100 px-3.5 py-1 rounded-full border border-slate-300">
                ≈ {formatPrice(balanceInUsd)}
              </span>
            </div>
            <p className="text-xs text-slate-700 font-medium">
              Balances are stored in Indian Rupees (INR) and automatically converted into your chosen currency ({currency}).
            </p>
          </div>

          {/* Col 2: Minimum Withdrawal Limit Notice Box */}
          <div className="neu-flat p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/80 border border-amber-300">
            <div className="flex items-center gap-2 text-amber-900 font-black text-xs">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Withdrawal Limit</span>
            </div>
            <div className="mt-2">
              <div className="text-lg font-mono font-black text-amber-950">
                ₹{minWithdrawalInr.toLocaleString()} INR
              </div>
              <div className="text-xs font-bold text-amber-900 mt-0.5">
                ≈ {CURRENCIES[currency].symbol}{minLimitInActiveCurrency} {currency}
              </div>
            </div>
            <p className="text-[11px] text-amber-900 font-medium mt-2 leading-relaxed">
              Minimum payout threshold for transfers to bank accounts, UPI, or PayPal.
            </p>
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="frosted-glass-strong rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-[0_12px_36px_rgba(15,23,42,0.1)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display font-black text-lg text-slate-900">
              Transaction History
            </h2>
            <p className="text-xs text-slate-700 font-medium">
              Audit log of all deposits, order payments, seller payouts, and withdrawals.
            </p>
          </div>

          {/* Filter Tabs (Navy) */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl neu-flat bg-white/90 border border-slate-300">
            {(['all', 'deposits', 'withdrawals', 'orders'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  activeTab === tab
                    ? 'btn-navy text-white shadow-xs'
                    : 'text-slate-800 hover:text-[#0F172A]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions Table / List */}
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-600 space-y-2">
            <Clock className="w-8 h-8 mx-auto text-slate-400" />
            <div className="text-sm font-bold text-slate-800">No transactions recorded yet.</div>
            <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto">
              When you deposit funds, purchase items, or withdraw money, every action will appear here with timestamps.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredTransactions.map((tx) => {
              const isCredit = tx.type === 'Deposit' || tx.type === 'Sale';
              const inUsd = tx.amountInr / CURRENCIES.INR.rate;
              return (
                <div
                  key={tx.id}
                  className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isCredit
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-900 truncate">
                        {tx.description || tx.type}
                      </div>
                      <div className="text-[11px] text-slate-600 font-mono font-semibold">
                        {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString() : 'Just now'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`font-mono text-xs sm:text-sm font-black ${
                        isCredit ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {isCredit ? '+' : '-'}{formatInr(tx.amountInr)}
                    </div>
                    <div className="text-[10px] font-mono text-slate-600 font-semibold">
                      ≈ {formatPrice(inUsd)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#0F172A] flex items-center justify-center">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <h3 className="font-display font-black text-lg text-slate-900">
                  Add Funds to Wallet
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDepositModal(false)}
                className="text-slate-500 hover:text-slate-800 p-1 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              {depositError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                  {depositError}
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-1.5">
                  Select Quick Amount (INR)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[500, 1000, 2500, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmount(amt)}
                      className={`py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all ${
                        depositAmount === amt
                          ? 'btn-navy text-white shadow-xs'
                          : 'neu-flat text-slate-800 hover:border-slate-400'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-1">
                  Or Custom Amount (INR)
                </label>
                <input
                  type="number"
                  min="50"
                  step="50"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Math.max(50, Number(e.target.value)))}
                  className="w-full neu-pressed rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F172A] border border-slate-300"
                />
                <span className="text-[11px] font-mono text-slate-600 font-semibold mt-1 block">
                  Converted: {formatPrice(depositAmount / CURRENCIES.INR.rate)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-1">
                  Note / Description
                </label>
                <input
                  type="text"
                  value={depositDesc}
                  onChange={(e) => setDepositDesc(e.target.value)}
                  maxLength={100}
                  className="w-full neu-pressed rounded-xl px-4 py-2 text-xs text-slate-900 font-medium border border-slate-300"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isDepositing}
                  className="btn-navy w-full py-3 rounded-2xl text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all disabled:opacity-50"
                >
                  {isDepositing ? 'Processing Deposit...' : `Confirm Deposit of ₹${depositAmount.toLocaleString()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#0F172A] flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <h3 className="font-display font-black text-lg text-slate-900">
                  Withdraw Funds
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-500 hover:text-slate-800 p-1 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between font-bold">
                <span>Minimum Withdrawal Limit:</span>
                <span className="font-mono font-black">₹{minWithdrawalInr.toLocaleString()} INR</span>
              </div>

              {withdrawError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                  {withdrawError}
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-1">
                  Withdrawal Amount (INR) *
                </label>
                <input
                  type="number"
                  min={minWithdrawalInr}
                  max={balanceInr}
                  required
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  className="w-full neu-pressed rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F172A] border border-slate-300"
                />
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 font-semibold mt-1">
                  <span>Balance: {formatInr(balanceInr)}</span>
                  <span>≈ {formatPrice(withdrawAmount / CURRENCIES.INR.rate)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-1">
                  Payout Destination (Bank Account, UPI ID, or PayPal) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={payoutDetails}
                  onChange={(e) => setPayoutDetails(e.target.value)}
                  placeholder="e.g. UPI: name@oksbi OR Bank: IFSC HDFC0000123, Acc #123456789"
                  maxLength={200}
                  className="w-full neu-pressed rounded-xl px-4 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0F172A] resize-none border border-slate-300"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isWithdrawing || balanceInr < minWithdrawalInr}
                  className="btn-navy w-full py-3 rounded-2xl text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all disabled:opacity-50"
                >
                  {isWithdrawing
                    ? 'Submitting Request...'
                    : balanceInr < minWithdrawalInr
                    ? `Balance Below ₹${minWithdrawalInr} Limit`
                    : `Submit Withdrawal of ₹${withdrawAmount.toLocaleString()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

