/**
 * Firestore Security Rules Test Suite — Dirty Dozen Verification
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on orders Create',
    collection: 'orders/order_1',
    operation: 'create',
    auth: { uid: 'user_abc', email: 'buyer@example.com', email_verified: true },
    payload: {
      listingId: 'listing_1',
      buyerUid: 'user_abc',
      status: 'Pending',
      isVerifiedAdmin: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Buyer UID Spoofing on orders Create',
    collection: 'orders/order_2',
    operation: 'create',
    auth: { uid: 'user_abc', email: 'buyer@example.com', email_verified: true },
    payload: {
      listingId: 'listing_1',
      buyerUid: 'victim_uid_999',
      status: 'Pending',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Order Status Shortcutting on Create',
    collection: 'orders/order_3',
    operation: 'create',
    auth: { uid: 'user_abc', email: 'buyer@example.com', email_verified: true },
    payload: {
      listingId: 'listing_1',
      buyerUid: 'user_abc',
      status: 'Completed',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Negative Price or Quantity on orders Create',
    collection: 'orders/order_4',
    operation: 'create',
    auth: { uid: 'user_abc', email: 'buyer@example.com', email_verified: true },
    payload: {
      listingId: 'listing_1',
      buyerUid: 'user_abc',
      quantity: -2,
      unitPrice: 10,
      totalPrice: -20,
      status: 'Pending',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Unverified Email Spoof Attack Against Admin Email',
    collection: 'siteSettings/global',
    operation: 'create',
    auth: { uid: 'spoof_1', email: 'priyam.dgp13@gmail.com', email_verified: false },
    payload: {
      siteName: 'Hacked Marketplace',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Cross-User Order PII Scraping',
    collection: 'orders/order_1',
    operation: 'get',
    auth: { uid: 'other_user_xyz', email: 'other@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Orphaned Listing Creation with Non-Existent Game/Category',
    collection: 'listings/listing_orphan',
    operation: 'create',
    auth: { uid: 'admin_1', email: 'priyam.dgp13@gmail.com', email_verified: true },
    payload: {
      gameId: 'missing_game_id',
      categoryId: 'missing_category_id',
      title: 'Orphaned Offer',
      price: 20,
      stock: 5,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Negative Price or Stock in listings',
    collection: 'listings/listing_neg',
    operation: 'create',
    auth: { uid: 'admin_1', email: 'priyam.dgp13@gmail.com', email_verified: true },
    payload: {
      gameId: 'game_1',
      categoryId: 'cat_1',
      title: 'Negative Offer',
      price: -15,
      stock: -3,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Path Variable ID Poisoning with Invalid Characters',
    collection: 'games/invalid$id!with*spaces',
    operation: 'get',
    auth: null,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Immutable createdAt Tampering on Update',
    collection: 'games/game_1',
    operation: 'update',
    auth: { uid: 'admin_1', email: 'priyam.dgp13@gmail.com', email_verified: true },
    payload: {
      createdAt: '1999-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unauthorized Public Write to siteSettings/global',
    collection: 'siteSettings/global',
    operation: 'update',
    auth: { uid: 'regular_buyer', email: 'buyer@example.com', email_verified: true },
    payload: {
      heroTitle: 'Tampered Hero Title',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unauthorized Self-Promotion in admins with Wrong Token',
    collection: 'admins/regular_buyer',
    operation: 'create',
    auth: { uid: 'regular_buyer', email: 'buyer@example.com', email_verified: true },
    payload: {
      uid: 'regular_buyer',
      email: 'buyer@example.com',
      grantToken: 'INVALID_TOKEN',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 13,
    name: 'Seller UID Spoofing on listings Create',
    collection: 'listings/listing_spoof',
    operation: 'create',
    auth: { uid: 'seller_a', email: 'sellera@example.com', email_verified: true },
    payload: {
      gameId: 'game_1',
      categoryId: 'cat_1',
      sellerUid: 'seller_victim',
      title: 'Spoofed Offer',
      price: 10,
      stock: 5,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 14,
    name: 'Cross-User Chat Conversation Reading',
    collection: 'conversations/conv_user1_seller1',
    operation: 'get',
    auth: { uid: 'eavesdropper_uid', email: 'spy@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 15,
    name: 'Chat Message Sender UID Spoofing',
    collection: 'conversations/conv_user1_seller1/messages/msg_1',
    operation: 'create',
    auth: { uid: 'user1', email: 'buyer@example.com', email_verified: true },
    payload: {
      conversationId: 'conv_user1_seller1',
      buyerUid: 'user1',
      sellerUid: 'seller1',
      senderUid: 'seller1',
      senderName: 'Impersonator',
      text: 'Free gift',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];
