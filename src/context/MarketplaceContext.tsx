import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  getDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  SiteSettings,
  Category,
  Game,
  Listing,
  Order,
  OrderStatus,
  CurrencyCode,
  CURRENCIES,
  FIELD_LIMITS,
  ADMIN_GRANT_TOKEN,
  ADMIN_SESSION_STORAGE_KEY,
  SellerApplication,
  Seller,
  Wallet,
  WalletTransaction,
  MIN_WITHDRAWAL_INR,
  getMinWithdrawalInCurrency,
  sanitizeText,
  sanitizeSlug,
  isValidImageUrlOrDataUri,
} from '../types';
import { DEFAULT_GAMES_CATALOGUE } from '../data/gamesCatalogue';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface MarketplaceContextValue {
  // Auth
  user: User | null;
  authReady: boolean;
  signInWithGoogle: () => Promise<User | null>;
  signOutUser: () => Promise<void>;

  // Admin Gate
  isAdminUnlocked: boolean;
  isAdminAuthorized: boolean;
  unlockAdminWithPassword: (password: string) => Promise<boolean>;
  syncAdminGrantForUser: (currentUser: User) => Promise<void>;
  logoutAdmin: () => void;

  // Data
  siteSettings: SiteSettings | null;
  categories: Category[];
  games: Game[];
  catalogueGames: Game[];
  listings: Listing[];
  orders: Order[];
  loadingData: boolean;

  // Currency & UI
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  formatPrice: (usdAmount: number) => string;
  formatInr: (inrAmount: number) => string;
  selectedCategoryId: string;
  setSelectedCategoryId: (id: string) => void;
  filterGameSlug: string;
  setFilterGameSlug: (slug: string) => void;
  priceFilterMax: number;
  setPriceFilterMax: (max: number) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Seller System
  sellerRecord: Seller | null;
  isSeller: boolean;
  sellerApplication: SellerApplication | null;
  allSellerApplications: SellerApplication[];
  allSellers: Seller[];
  submitSellerApplication: (input: {
    fullName: string;
    address: string;
    phoneNumber: string;
    whatsappNumber: string;
    nationalIdUrl: string;
  }) => Promise<void>;
  approveSellerApplication: (app: SellerApplication) => Promise<void>;
  rejectSellerApplication: (appId: string) => Promise<void>;
  banSeller: (sellerId: string) => Promise<void>;
  unbanSeller: (sellerId: string) => Promise<void>;

  // Wallet System
  wallet: Wallet | null;
  walletTransactions: WalletTransaction[];
  minWithdrawalInr: number;
  minWithdrawalActiveCurrency: number;
  depositToWallet: (amountInr: number, description?: string) => Promise<void>;
  withdrawFromWallet: (amountInr: number, payoutDetails: string) => Promise<void>;

  // Toasts
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  // CRUD Operations
  saveSiteSettings: (input: Omit<SiteSettings, 'updatedAt'>) => Promise<void>;
  createCategory: (input: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCategory: (id: string, input: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  createGame: (input: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateGame: (id: string, input: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteGame: (id: string) => Promise<void>;
  ensureCatalogueGameInFirestore: (game: Game) => Promise<Game>;
  createListing: (input: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateListing: (id: string, input: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  createOrder: (input: {
    listing: Listing;
    quantity: number;
    deliveryInstructions: string;
    useWallet?: boolean;
  }) => Promise<string>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
}

const MarketplaceContext = createContext<MarketplaceContextValue | undefined>(undefined);

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [hasAdminGrantDoc, setHasAdminGrantDoc] = useState(false);

  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Seller & Wallet states
  const [sellerRecord, setSellerRecord] = useState<Seller | null>(null);
  const [sellerApplication, setSellerApplication] = useState<SellerApplication | null>(null);
  const [allSellerApplications, setAllSellerApplications] = useState<SellerApplication[]>([]);
  const [allSellers, setAllSellers] = useState<Seller[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);

  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [gamesLoaded, setGamesLoaded] = useState(false);
  const [listingsLoaded, setListingsLoaded] = useState(false);

  // Global filters
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [filterGameSlug, setFilterGameSlug] = useState<string>('all');
  const [priceFilterMax, setPriceFilterMax] = useState<number>(1000);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Sync admin grant document in Firestore if user has unlocked the password gate
  const syncAdminGrantForUser = useCallback(async (currentUser: User) => {
    if (!currentUser.email) return;
    if (currentUser.email === 'priyam.dgp13@gmail.com') {
      setHasAdminGrantDoc(true);
      return;
    }
    const adminRef = doc(db, 'admins', currentUser.uid);
    try {
      const snap = await getDoc(adminRef);
      if (snap.exists()) {
        setHasAdminGrantDoc(true);
        return;
      }
      await setDoc(adminRef, {
        uid: currentUser.uid,
        email: sanitizeText(currentUser.email, 160),
        grantToken: ADMIN_GRANT_TOKEN,
        createdAt: serverTimestamp(),
      });
      setHasAdminGrantDoc(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `admins/${currentUser.uid}`);
    }
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (currentUser && isAdminUnlocked) {
        try {
          await syncAdminGrantForUser(currentUser);
        } catch {
          // Handled inside syncAdminGrantForUser
        }
      } else {
        setHasAdminGrantDoc(currentUser?.email === 'priyam.dgp13@gmail.com');
      }
    });
    return () => unsub();
  }, [isAdminUnlocked, syncAdminGrantForUser]);

  const signInWithGoogle = useCallback(async (): Promise<User | null> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user && isAdminUnlocked) {
        await syncAdminGrantForUser(result.user);
      }
      addToast(`Signed in as ${result.user.displayName || result.user.email}`, 'success');
      return result.user;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Google Sign-In failed';
      if (!msg.includes('popup-closed-by-user')) {
        addToast(`Sign-In error: ${msg}`, 'error');
      }
      return null;
    }
  }, [isAdminUnlocked, syncAdminGrantForUser, addToast]);

  const signOutUser = useCallback(async () => {
    try {
      await signOut(auth);
      setHasAdminGrantDoc(false);
      setSellerRecord(null);
      setSellerApplication(null);
      setWallet(null);
      setWalletTransactions([]);
      addToast('Signed out successfully.', 'info');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to sign out';
      addToast(msg, 'error');
    }
  }, [addToast]);

  const unlockAdminWithPassword = useCallback(
    async (password: string): Promise<boolean> => {
      if (password === 'PolarithWeb8825') {
        try {
          sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, 'true');
        } catch {
          // Ignore storage quota errors
        }
        setIsAdminUnlocked(true);
        if (user) {
          await syncAdminGrantForUser(user);
        }
        addToast('Admin Panel unlocked.', 'success');
        return true;
      }
      return false;
    },
    [user, syncAdminGrantForUser, addToast]
  );

  const logoutAdmin = useCallback(() => {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
    setIsAdminUnlocked(false);
    addToast('Logged out of Admin Panel.', 'info');
  }, [addToast]);

  const isAdminAuthorized = Boolean(
    isAdminUnlocked &&
      user &&
      user.emailVerified &&
      (user.email === 'priyam.dgp13@gmail.com' || hasAdminGrantDoc)
  );

  // Public Marketplace Real-Time Subscriptions
  useEffect(() => {
    const settingsRef = doc(db, 'siteSettings', 'global');
    const unsubSettings = onSnapshot(
      settingsRef,
      (snap) => {
        if (snap.exists()) {
          setSiteSettings(snap.data() as SiteSettings);
        } else {
          setSiteSettings(null);
        }
        setSettingsLoaded(true);
      },
      (error) => {
        setSettingsLoaded(true);
        handleFirestoreError(error, OperationType.GET, 'siteSettings/global');
      }
    );

    const categoriesRef = collection(db, 'categories');
    const unsubCategories = onSnapshot(
      categoriesRef,
      (snap) => {
        const items: Category[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Category, 'id'>),
        }));
        items.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
        setCategories(items);
        setCategoriesLoaded(true);
      },
      (error) => {
        setCategoriesLoaded(true);
        handleFirestoreError(error, OperationType.LIST, 'categories');
      }
    );

    const gamesRef = collection(db, 'games');
    const unsubGames = onSnapshot(
      gamesRef,
      (snap) => {
        const items: Game[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Game, 'id'>),
        }));
        items.sort((a, b) => Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title));
        setGames(items);
        setGamesLoaded(true);
      },
      (error) => {
        setGamesLoaded(true);
        handleFirestoreError(error, OperationType.LIST, 'games');
      }
    );

    const listingsRef = collection(db, 'listings');
    const unsubListings = onSnapshot(
      listingsRef,
      (snap) => {
        const items: Listing[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Listing, 'id'>),
        }));
        items.sort((a, b) => {
          const tA = a.createdAt?.toMillis?.() || 0;
          const tB = b.createdAt?.toMillis?.() || 0;
          return tB - tA;
        });
        setListings(items);
        setListingsLoaded(true);
      },
      (error) => {
        setListingsLoaded(true);
        handleFirestoreError(error, OperationType.LIST, 'listings');
      }
    );

    // All active sellers (Public list for verification badges)
    const sellersRef = collection(db, 'sellers');
    const unsubSellers = onSnapshot(
      sellersRef,
      (snap) => {
        const items: Seller[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Seller, 'id'>),
        }));
        setAllSellers(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'sellers');
      }
    );

    return () => {
      unsubSettings();
      unsubCategories();
      unsubGames();
      unsubListings();
      unsubSellers();
    };
  }, []);

  // User-scoped listeners: Seller Record, Seller Application, Wallet, Transactions, Orders
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      setSellerRecord(null);
      setSellerApplication(null);
      setWallet(null);
      setWalletTransactions([]);
      setOrders([]);
      return;
    }

    // 1. Check seller status for user
    const sellerDocRef = doc(db, 'sellers', user.uid);
    const unsubSellerDoc = onSnapshot(
      sellerDocRef,
      (snap) => {
        if (snap.exists()) {
          setSellerRecord({ id: snap.id, ...(snap.data() as Omit<Seller, 'id'>) });
        } else {
          setSellerRecord(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `sellers/${user.uid}`);
      }
    );

    // 2. Check seller application for user
    const appDocRef = doc(db, 'sellerApplications', user.uid);
    const unsubAppDoc = onSnapshot(
      appDocRef,
      (snap) => {
        if (snap.exists()) {
          setSellerApplication({ id: snap.id, ...(snap.data() as Omit<SellerApplication, 'id'>) });
        } else {
          setSellerApplication(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `sellerApplications/${user.uid}`);
      }
    );

    // 3. User Wallet
    const walletDocRef = doc(db, 'wallets', user.uid);
    const unsubWallet = onSnapshot(
      walletDocRef,
      async (snap) => {
        if (snap.exists()) {
          setWallet(snap.data() as Wallet);
        } else {
          // Initialize zero balance wallet on first lookup
          try {
            const initialWallet: Wallet = {
              userId: user.uid,
              balanceInr: 0,
            };
            await setDoc(walletDocRef, {
              ...initialWallet,
              updatedAt: serverTimestamp(),
            });
            setWallet(initialWallet);
          } catch {
            setWallet({ userId: user.uid, balanceInr: 0 });
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `wallets/${user.uid}`);
      }
    );

    // 4. User Wallet Transactions
    const txQuery = query(
      collection(db, 'walletTransactions'),
      where('userId', '==', user.uid)
    );
    const unsubTx = onSnapshot(
      txQuery,
      (snap) => {
        const items: WalletTransaction[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<WalletTransaction, 'id'>),
        }));
        items.sort((a, b) => {
          const tA = a.createdAt?.toMillis?.() || 0;
          const tB = b.createdAt?.toMillis?.() || 0;
          return tB - tA;
        });
        setWalletTransactions(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'walletTransactions');
      }
    );

    // 5. Orders Subscription (User's own orders)
    const ordersRef = collection(db, 'orders');
    const ordersQuery = isAdminAuthorized
      ? ordersRef
      : query(ordersRef, where('buyerUid', '==', user.uid));

    const unsubOrders = onSnapshot(
      ordersQuery,
      (snap) => {
        const items: Order[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Order, 'id'>),
        }));
        items.sort((a, b) => {
          const tA = a.createdAt?.toMillis?.() || 0;
          const tB = b.createdAt?.toMillis?.() || 0;
          return tB - tA;
        });
        setOrders(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    return () => {
      unsubSellerDoc();
      unsubAppDoc();
      unsubWallet();
      unsubTx();
      unsubOrders();
    };
  }, [authReady, user, isAdminAuthorized]);

  // Admin-scoped listener: All Seller Applications
  useEffect(() => {
    if (!isAdminAuthorized) {
      setAllSellerApplications([]);
      return;
    }
    const appsRef = collection(db, 'sellerApplications');
    const unsubApps = onSnapshot(
      appsRef,
      (snap) => {
        const items: SellerApplication[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<SellerApplication, 'id'>),
        }));
        items.sort((a, b) => {
          const tA = a.createdAt?.toMillis?.() || 0;
          const tB = b.createdAt?.toMillis?.() || 0;
          return tB - tA;
        });
        setAllSellerApplications(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'sellerApplications');
      }
    );
    return () => unsubApps();
  }, [isAdminAuthorized]);

  const isSeller = Boolean(sellerRecord && sellerRecord.status === 'Active');

  const formatPrice = useCallback(
    (usdAmount: number): string => {
      const cfg = CURRENCIES[currency] || CURRENCIES.USD;
      const converted = Math.max(0, Number(usdAmount) || 0) * cfg.rate;
      return `${cfg.symbol}${converted.toFixed(2)}`;
    },
    [currency]
  );

  const formatInr = useCallback((inrAmount: number): string => {
    return `₹${Math.max(0, inrAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }, []);

  // Seller Operations
  const submitSellerApplication = useCallback(
    async (input: {
      fullName: string;
      address: string;
      phoneNumber: string;
      whatsappNumber: string;
      nationalIdUrl: string;
    }) => {
      if (!user || !user.email) {
        throw new Error('Please sign in with Google to apply as a seller.');
      }
      const fullName = sanitizeText(input.fullName, 120);
      const address = sanitizeText(input.address, 400);
      const phoneNumber = sanitizeText(input.phoneNumber, 30);
      const whatsappNumber = sanitizeText(input.whatsappNumber, 30);

      if (fullName.length < 2) throw new Error('Full legal name is required.');
      if (address.length < 5) throw new Error('Full physical address is required.');
      if (phoneNumber.length < 5) throw new Error('Valid phone number is required.');
      if (whatsappNumber.length < 5) throw new Error('WhatsApp contact number is required.');
      if (!input.nationalIdUrl) throw new Error('Government approved national ID upload is required.');

      try {
        const appRef = doc(db, 'sellerApplications', user.uid);
        await setDoc(appRef, {
          userId: user.uid,
          userEmail: sanitizeText(user.email, 160),
          fullName,
          address,
          phoneNumber,
          whatsappNumber,
          nationalIdUrl: input.nationalIdUrl.slice(0, FIELD_LIMITS.IMAGE_URL_MAX),
          status: 'Pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        addToast('Seller application submitted! Status: Under Review.', 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `sellerApplications/${user.uid}`);
      }
    },
    [user, addToast]
  );

  const approveSellerApplication = useCallback(
    async (app: SellerApplication) => {
      if (!isAdminAuthorized) throw new Error('Admin privileges required.');
      try {
        // 1. Update application status
        await updateDoc(doc(db, 'sellerApplications', app.id), {
          status: 'Approved',
          updatedAt: serverTimestamp(),
        });

        // 2. Create or activate seller record in /sellers/{userId}
        await setDoc(doc(db, 'sellers', app.userId), {
          userId: app.userId,
          userEmail: app.userEmail,
          fullName: app.fullName,
          phoneNumber: app.phoneNumber,
          whatsappNumber: app.whatsappNumber,
          address: app.address,
          status: 'Active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        addToast(`Seller "${app.fullName}" has been approved!`, 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `sellers/${app.userId}`);
      }
    },
    [isAdminAuthorized, addToast]
  );

  const rejectSellerApplication = useCallback(
    async (appId: string) => {
      if (!isAdminAuthorized) throw new Error('Admin privileges required.');
      try {
        await updateDoc(doc(db, 'sellerApplications', appId), {
          status: 'Rejected',
          updatedAt: serverTimestamp(),
        });
        addToast('Seller application rejected.', 'info');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `sellerApplications/${appId}`);
      }
    },
    [isAdminAuthorized, addToast]
  );

  const banSeller = useCallback(
    async (sellerId: string) => {
      if (!isAdminAuthorized) throw new Error('Admin privileges required.');
      try {
        await updateDoc(doc(db, 'sellers', sellerId), {
          status: 'Banned',
          updatedAt: serverTimestamp(),
        });
        addToast(`Seller banned.`, 'info');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `sellers/${sellerId}`);
      }
    },
    [isAdminAuthorized, addToast]
  );

  const unbanSeller = useCallback(
    async (sellerId: string) => {
      if (!isAdminAuthorized) throw new Error('Admin privileges required.');
      try {
        await updateDoc(doc(db, 'sellers', sellerId), {
          status: 'Active',
          updatedAt: serverTimestamp(),
        });
        addToast(`Seller unbanned and restored.`, 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `sellers/${sellerId}`);
      }
    },
    [isAdminAuthorized, addToast]
  );

  // Wallet Operations
  const depositToWallet = useCallback(
    async (amountInr: number, description = 'Wallet Top Up') => {
      if (!user) throw new Error('Please sign in to access your wallet.');
      const amount = Math.floor(Number(amountInr));
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid deposit amount.');
      }

      try {
        const currentBalance = wallet?.balanceInr || 0;
        const newBalance = currentBalance + amount;

        // Update wallet
        await setDoc(doc(db, 'wallets', user.uid), {
          userId: user.uid,
          balanceInr: newBalance,
          updatedAt: serverTimestamp(),
        });

        // Record audit transaction
        await addDoc(collection(db, 'walletTransactions'), {
          userId: user.uid,
          type: 'Deposit',
          amountInr: amount,
          description: sanitizeText(description, 300),
          status: 'Completed',
          createdAt: serverTimestamp(),
        });

        addToast(`Added ₹${amount.toLocaleString()} to your wallet.`, 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `wallets/${user.uid}`);
      }
    },
    [user, wallet, addToast]
  );

  const withdrawFromWallet = useCallback(
    async (amountInr: number, payoutDetails: string) => {
      if (!user) throw new Error('Please sign in to withdraw funds.');
      const amount = Math.floor(Number(amountInr));
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid withdrawal amount.');
      }
      if (amount < MIN_WITHDRAWAL_INR) {
        throw new Error(`Minimum withdrawal limit is ₹${MIN_WITHDRAWAL_INR.toLocaleString()} INR.`);
      }
      const currentBalance = wallet?.balanceInr || 0;
      if (currentBalance < amount) {
        throw new Error(`Insufficient wallet balance. You have ₹${currentBalance.toLocaleString()} INR.`);
      }
      const payout = sanitizeText(payoutDetails, 200);
      if (!payout) {
        throw new Error('Please provide your bank details, UPI ID, or payout account.');
      }

      try {
        const newBalance = currentBalance - amount;

        // Update wallet balance
        await setDoc(doc(db, 'wallets', user.uid), {
          userId: user.uid,
          balanceInr: newBalance,
          updatedAt: serverTimestamp(),
        });

        // Record withdrawal transaction
        await addDoc(collection(db, 'walletTransactions'), {
          userId: user.uid,
          type: 'Withdrawal',
          amountInr: amount,
          description: `Withdrawal request to: ${payout}`,
          status: 'Pending',
          createdAt: serverTimestamp(),
        });

        addToast(`Withdrawal of ₹${amount.toLocaleString()} submitted for payout.`, 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `wallets/${user.uid}`);
      }
    },
    [user, wallet, addToast]
  );

  // CRUD 1: Global Site Settings
  const saveSiteSettings = useCallback(
    async (input: Omit<SiteSettings, 'updatedAt'>) => {
      const siteName = sanitizeText(input.siteName, FIELD_LIMITS.SITE_NAME_MAX);
      if (!siteName) throw new Error('Site Name is required.');
      if (!isValidImageUrlOrDataUri(input.logoUrl)) {
        throw new Error('Logo URL must be a valid HTTP(S) URL or uploaded image.');
      }
      if (!isValidImageUrlOrDataUri(input.heroBannerUrl)) {
        throw new Error('Hero Banner URL must be a valid HTTP(S) URL or uploaded image.');
      }

      const payload = {
        siteName,
        logoUrl: input.logoUrl.trim().slice(0, FIELD_LIMITS.IMAGE_URL_MAX),
        announcementText: sanitizeText(input.announcementText, FIELD_LIMITS.ANNOUNCEMENT_MAX),
        heroBannerUrl: input.heroBannerUrl.trim().slice(0, FIELD_LIMITS.IMAGE_URL_MAX),
        heroTitle: sanitizeText(input.heroTitle, FIELD_LIMITS.HERO_TITLE_MAX),
        heroSubtitle: sanitizeText(input.heroSubtitle, FIELD_LIMITS.HERO_SUBTITLE_MAX),
        heroCtaText: sanitizeText(input.heroCtaText, FIELD_LIMITS.HERO_CTA_MAX),
        paymentBadges: (input.paymentBadges || [])
          .map((b) => sanitizeText(b, 50))
          .filter(Boolean)
          .slice(0, FIELD_LIMITS.MAX_ARRAY_ITEMS),
        supportLinks: (input.supportLinks || [])
          .map((l) => sanitizeText(l, 200))
          .filter(Boolean)
          .slice(0, FIELD_LIMITS.MAX_ARRAY_ITEMS),
        legalLinks: (input.legalLinks || [])
          .map((l) => sanitizeText(l, 200))
          .filter(Boolean)
          .slice(0, FIELD_LIMITS.MAX_ARRAY_ITEMS),
        copyrightText: sanitizeText(input.copyrightText, FIELD_LIMITS.COPYRIGHT_MAX),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, 'siteSettings', 'global'), payload);
        addToast('Global site settings saved.', 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'siteSettings/global');
      }
    },
    [addToast]
  );

  // CRUD 2: Categories
  const createCategory = useCallback(
    async (input: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
      const name = sanitizeText(input.name, FIELD_LIMITS.CATEGORY_NAME_MAX);
      if (!name) throw new Error('Category name is required.');
      const slug = sanitizeSlug(input.slug || name, FIELD_LIMITS.CATEGORY_NAME_MAX);
      const order = Math.max(0, Math.min(10000, Math.floor(Number(input.order) || 0)));

      try {
        await addDoc(collection(db, 'categories'), {
          name,
          slug,
          description: sanitizeText(input.description, FIELD_LIMITS.CATEGORY_DESC_MAX),
          iconName: sanitizeText(input.iconName || 'Package', 40),
          order,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        addToast(`Category "${name}" created.`, 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'categories');
      }
    },
    [addToast]
  );

  const updateCategory = useCallback(
    async (id: string, input: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
      const name = sanitizeText(input.name, FIELD_LIMITS.CATEGORY_NAME_MAX);
      if (!name) throw new Error('Category name is required.');
      const slug = sanitizeSlug(input.slug || name, FIELD_LIMITS.CATEGORY_NAME_MAX);
      const order = Math.max(0, Math.min(10000, Math.floor(Number(input.order) || 0)));

      try {
        await updateDoc(doc(db, 'categories', id), {
          name,
          slug,
          description: sanitizeText(input.description, FIELD_LIMITS.CATEGORY_DESC_MAX),
          iconName: sanitizeText(input.iconName || 'Package', 40),
          order,
          updatedAt: serverTimestamp(),
        });
        addToast(`Category "${name}" updated.`, 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `categories/${id}`);
      }
    },
    [addToast]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      try {
        await deleteDoc(doc(db, 'categories', id));
        addToast('Category deleted.', 'info');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
      }
    },
    [addToast]
  );

  // CRUD 3: Games
  const createGame = useCallback(
    async (input: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>) => {
      const title = sanitizeText(input.title, FIELD_LIMITS.GAME_TITLE_MAX);
      if (!title) throw new Error('Game title is required.');
      const slug = sanitizeSlug(input.slug || title, FIELD_LIMITS.GAME_TITLE_MAX);
      if (!isValidImageUrlOrDataUri(input.iconUrl)) {
        throw new Error('Invalid Game Icon URL or image format.');
      }
      if (!isValidImageUrlOrDataUri(input.bannerUrl)) {
        throw new Error('Invalid Game Banner URL or image format.');
      }

      try {
        await addDoc(collection(db, 'games'), {
          title,
          slug,
          iconUrl: input.iconUrl.trim().slice(0, FIELD_LIMITS.IMAGE_URL_MAX),
          bannerUrl: input.bannerUrl.trim().slice(0, FIELD_LIMITS.IMAGE_URL_MAX),
          featured: Boolean(input.featured),
          categoryIds: (input.categoryIds || [])
            .map((cid) => sanitizeText(cid, 128))
            .filter(Boolean)
            .slice(0, FIELD_LIMITS.MAX_ARRAY_ITEMS),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        addToast(`Game "${title}" added to marketplace.`, 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'games');
      }
    },
    [addToast]
  );

  const updateGame = useCallback(
    async (id: string, input: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>) => {
      const title = sanitizeText(input.title, FIELD_LIMITS.GAME_TITLE_MAX);
      if (!title) throw new Error('Game title is required.');
      const slug = sanitizeSlug(input.slug || title, FIELD_LIMITS.GAME_TITLE_MAX);
      if (!isValidImageUrlOrDataUri(input.iconUrl)) {
        throw new Error('Invalid Game Icon URL or image format.');
      }
      if (!isValidImageUrlOrDataUri(input.bannerUrl)) {
        throw new Error('Invalid Game Banner URL or image format.');
      }

      try {
        await updateDoc(doc(db, 'games', id), {
          title,
          slug,
          iconUrl: input.iconUrl.trim().slice(0, FIELD_LIMITS.IMAGE_URL_MAX),
          bannerUrl: input.bannerUrl.trim().slice(0, FIELD_LIMITS.IMAGE_URL_MAX),
          featured: Boolean(input.featured),
          categoryIds: (input.categoryIds || [])
            .map((cid) => sanitizeText(cid, 128))
            .filter(Boolean)
            .slice(0, FIELD_LIMITS.MAX_ARRAY_ITEMS),
          updatedAt: serverTimestamp(),
        });
        addToast(`Game "${title}" updated.`, 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `games/${id}`);
      }
    },
    [addToast]
  );

  const deleteGame = useCallback(
    async (id: string) => {
      try {
        await deleteDoc(doc(db, 'games', id));
        addToast('Game deleted.', 'info');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `games/${id}`);
      }
    },
    [addToast]
  );

  const ensureCatalogueGameInFirestore = useCallback(
    async (catalogueGame: Game): Promise<Game> => {
      const existing = games.find(
        (g) => g.id === catalogueGame.id || g.slug.toLowerCase() === catalogueGame.slug.toLowerCase()
      );
      if (existing) return existing;

      const safeSlug = sanitizeSlug(catalogueGame.slug || catalogueGame.title, FIELD_LIMITS.GAME_TITLE_MAX);
      const docId = `cat_${safeSlug}`.slice(0, 128);
      const title = sanitizeText(catalogueGame.title, FIELD_LIMITS.GAME_TITLE_MAX);
      try {
        await setDoc(doc(db, 'games', docId), {
          title,
          slug: safeSlug,
          iconUrl: '',
          bannerUrl: '',
          featured: false,
          categoryIds: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return {
          ...catalogueGame,
          id: docId,
          title,
          slug: safeSlug,
          iconUrl: '',
          bannerUrl: '',
          featured: false,
          categoryIds: [],
        };
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `games/${docId}`);
      }
    },
    [games]
  );

  // CRUD 4: Listings
  const createListing = useCallback(
    async (input: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>) => {
      const title = sanitizeText(input.title, FIELD_LIMITS.LISTING_TITLE_MAX);
      if (!title) throw new Error('Offer title is required.');
      const price = Number(input.price);
      const stock = Math.floor(Number(input.stock));
      const sellerRating = Number(input.sellerRating);

      if (isNaN(price) || price < 0 || price > 1000000) {
        throw new Error('Price must be a valid non-negative number.');
      }
      if (isNaN(stock) || stock < 0 || stock > 1000000) {
        throw new Error('Stock must be a valid non-negative integer.');
      }
      if (isNaN(sellerRating) || sellerRating < 0 || sellerRating > 5) {
        throw new Error('Seller rating must be between 0 and 5.');
      }
      if (!isValidImageUrlOrDataUri(input.imageUrl)) {
        throw new Error('Invalid offer image URL or uploaded file.');
      }

      try {
        await addDoc(collection(db, 'listings'), {
          gameId: sanitizeText(input.gameId, 128),
          gameSlug: sanitizeSlug(input.gameSlug, 100),
          gameTitle: sanitizeText(input.gameTitle, FIELD_LIMITS.GAME_TITLE_MAX),
          categoryId: sanitizeText(input.categoryId, 128),
          categoryName: sanitizeText(input.categoryName, FIELD_LIMITS.CATEGORY_NAME_MAX),
          title,
          description: sanitizeText(input.description, FIELD_LIMITS.LISTING_DESC_MAX),
          price: Math.round(price * 100) / 100,
          stock,
          deliverySpeed: sanitizeText(input.deliverySpeed || 'Instant', FIELD_LIMITS.DELIVERY_SPEED_MAX),
          sellerName: sanitizeText(input.sellerName || 'VerifiedSeller', FIELD_LIMITS.SELLER_NAME_MAX),
          sellerRating: Math.round(sellerRating * 10) / 10,
          imageUrl: input.imageUrl.trim().slice(0, FIELD_LIMITS.IMAGE_URL_MAX),
          active: Boolean(input.active),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        addToast(`Listing "${title}" published.`, 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'listings');
      }
    },
    [addToast]
  );

  const updateListing = useCallback(
    async (id: string, input: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>) => {
      const title = sanitizeText(input.title, FIELD_LIMITS.LISTING_TITLE_MAX);
      if (!title) throw new Error('Offer title is required.');
      const price = Number(input.price);
      const stock = Math.floor(Number(input.stock));
      const sellerRating = Number(input.sellerRating);

      if (isNaN(price) || price < 0 || price > 1000000) {
        throw new Error('Price must be a valid non-negative number.');
      }
      if (isNaN(stock) || stock < 0 || stock > 1000000) {
        throw new Error('Stock must be a valid non-negative integer.');
      }
      if (isNaN(sellerRating) || sellerRating < 0 || sellerRating > 5) {
        throw new Error('Seller rating must be between 0 and 5.');
      }
      if (!isValidImageUrlOrDataUri(input.imageUrl)) {
        throw new Error('Invalid offer image URL or uploaded file.');
      }

      try {
        await updateDoc(doc(db, 'listings', id), {
          gameId: sanitizeText(input.gameId, 128),
          gameSlug: sanitizeSlug(input.gameSlug, 100),
          gameTitle: sanitizeText(input.gameTitle, FIELD_LIMITS.GAME_TITLE_MAX),
          categoryId: sanitizeText(input.categoryId, 128),
          categoryName: sanitizeText(input.categoryName, FIELD_LIMITS.CATEGORY_NAME_MAX),
          title,
          description: sanitizeText(input.description, FIELD_LIMITS.LISTING_DESC_MAX),
          price: Math.round(price * 100) / 100,
          stock,
          deliverySpeed: sanitizeText(input.deliverySpeed || 'Instant', FIELD_LIMITS.DELIVERY_SPEED_MAX),
          sellerName: sanitizeText(input.sellerName || 'VerifiedSeller', FIELD_LIMITS.SELLER_NAME_MAX),
          sellerRating: Math.round(sellerRating * 10) / 10,
          imageUrl: input.imageUrl.trim().slice(0, FIELD_LIMITS.IMAGE_URL_MAX),
          active: Boolean(input.active),
          updatedAt: serverTimestamp(),
        });
        addToast(`Listing "${title}" updated.`, 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `listings/${id}`);
      }
    },
    [addToast]
  );

  const deleteListing = useCallback(
    async (id: string) => {
      try {
        await deleteDoc(doc(db, 'listings', id));
        addToast('Listing deleted.', 'info');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `listings/${id}`);
      }
    },
    [addToast]
  );

  // CRUD 5: Orders (Supports Wallet checkout or direct order placement)
  const createOrder = useCallback(
    async (input: {
      listing: Listing;
      quantity: number;
      deliveryInstructions: string;
      useWallet?: boolean;
    }): Promise<string> => {
      if (!user || !user.email) {
        throw new Error('You must sign in with Google to place an order.');
      }
      const qty = Math.floor(Number(input.quantity));
      if (isNaN(qty) || qty < 1 || qty > input.listing.stock) {
        throw new Error('Requested quantity exceeds available stock.');
      }
      const instructions = sanitizeText(
        input.deliveryInstructions,
        FIELD_LIMITS.ORDER_INSTRUCTIONS_MAX
      );
      if (!instructions) {
        throw new Error('Please provide your in-game character name, server, or delivery details.');
      }

      const unitPrice = Math.round(Number(input.listing.price) * 100) / 100;
      const totalPrice = Math.round(unitPrice * qty * 100) / 100;
      // Convert order price to INR: 1 USD = 86.5 INR
      const priceInInr = Math.round(totalPrice * CURRENCIES.INR.rate);

      if (input.useWallet) {
        const balance = wallet?.balanceInr || 0;
        if (balance < priceInInr) {
          throw new Error(
            `Insufficient wallet balance. Total is ₹${priceInInr.toLocaleString()} INR, but your wallet has ₹${balance.toLocaleString()} INR. Top up your wallet or pay with external method.`
          );
        }
      }

      try {
        const docRef = await addDoc(collection(db, 'orders'), {
          listingId: input.listing.id,
          listingTitle: sanitizeText(input.listing.title, FIELD_LIMITS.LISTING_TITLE_MAX),
          gameTitle: sanitizeText(input.listing.gameTitle, FIELD_LIMITS.GAME_TITLE_MAX),
          categoryName: sanitizeText(input.listing.categoryName, FIELD_LIMITS.CATEGORY_NAME_MAX),
          sellerName: sanitizeText(input.listing.sellerName, FIELD_LIMITS.SELLER_NAME_MAX),
          quantity: qty,
          unitPrice,
          totalPrice,
          buyerUid: user.uid,
          buyerEmail: sanitizeText(user.email, 160),
          buyerName: sanitizeText(user.displayName || user.email.split('@')[0], 100),
          deliveryInstructions: instructions,
          status: 'Pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Decrement listing stock
        const newStock = Math.max(0, input.listing.stock - qty);
        await updateDoc(doc(db, 'listings', input.listing.id), {
          stock: newStock,
          updatedAt: serverTimestamp(),
        });

        // Deduct from wallet if wallet payment was selected
        if (input.useWallet && wallet) {
          const newBalance = wallet.balanceInr - priceInInr;
          await setDoc(doc(db, 'wallets', user.uid), {
            userId: user.uid,
            balanceInr: newBalance,
            updatedAt: serverTimestamp(),
          });
          await addDoc(collection(db, 'walletTransactions'), {
            userId: user.uid,
            type: 'Purchase',
            amountInr: priceInInr,
            description: `Order #${docRef.id.slice(0, 8).toUpperCase()} - ${input.listing.title} x${qty}`,
            status: 'Completed',
            createdAt: serverTimestamp(),
          });
        }

        addToast(`Order #${docRef.id.slice(0, 8).toUpperCase()} placed!`, 'success');
        return docRef.id;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'orders');
      }
    },
    [user, wallet, addToast]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          status,
          updatedAt: serverTimestamp(),
        });
        addToast(`Order status updated to ${status}.`, 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
      }
    },
    [addToast]
  );

  const deleteOrder = useCallback(
    async (orderId: string) => {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
        addToast('Order deleted.', 'info');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
      }
    },
    [addToast]
  );

  const loadingData = !(settingsLoaded && categoriesLoaded && gamesLoaded && listingsLoaded);
  const minWithdrawalActiveCurrency = getMinWithdrawalInCurrency(currency);

  return (
    <MarketplaceContext.Provider
      value={{
        user,
        authReady,
        signInWithGoogle,
        signOutUser,
        isAdminUnlocked,
        isAdminAuthorized,
        unlockAdminWithPassword,
        syncAdminGrantForUser,
        logoutAdmin,
        siteSettings,
        categories,
        games,
        catalogueGames: DEFAULT_GAMES_CATALOGUE,
        listings,
        orders,
        loadingData,
        currency,
        setCurrency,
        formatPrice,
        formatInr,
        selectedCategoryId,
        setSelectedCategoryId,
        filterGameSlug,
        setFilterGameSlug,
        priceFilterMax,
        setPriceFilterMax,
        searchQuery,
        setSearchQuery,
        sellerRecord,
        isSeller,
        sellerApplication,
        allSellerApplications,
        allSellers,
        submitSellerApplication,
        approveSellerApplication,
        rejectSellerApplication,
        banSeller,
        unbanSeller,
        wallet,
        walletTransactions,
        minWithdrawalInr: MIN_WITHDRAWAL_INR,
        minWithdrawalActiveCurrency,
        depositToWallet,
        withdrawFromWallet,
        toasts,
        addToast,
        removeToast,
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
        createOrder,
        updateOrderStatus,
        deleteOrder,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
};

export function useMarketplace(): MarketplaceContextValue {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) {
    throw new Error('useMarketplace must be used within a MarketplaceProvider');
  }
  return ctx;
}
