# Polarith Gaming Marketplace — Security Specification (Phase 0 TDD)

## 1. Data Invariants

1. **Global Default-Deny Safety Net**: Any path not explicitly matched is unconditionally denied (`allow read, write: if false;`).
2. **Admin Privilege Invariant (`isAdmin()`)**:
   - Only verified Google users (`request.auth != null && request.auth.token.email_verified == true`) who either match the bootstrapped owner email (`priyam.dgp13@gmail.com`) OR have a valid document at `/admins/$(request.auth.uid)` may create, update, or delete marketplace configuration (`siteSettings`, `categories`, `games`, `listings`) or update/delete `orders`.
3. **Public Marketplace Read Access**:
   - `siteSettings`, `categories`, `games`, and `listings` are public storefront collections readable by all visitors, with strict ID validation (`isValidId`) on single-document `get` and explicit schema field checks on `list`.
4. **Relational Integrity on Listings**:
   - A `listing` document cannot be created unless both its referenced `gameId` (`/games/$(incoming().gameId)`) and `categoryId` (`/categories/$(incoming().categoryId)`) exist in Firestore (`exists(...)`), and `price >= 0`, `stock >= 0`, and `sellerRating >= 0 && sellerRating <= 5`.
5. **Buyer Order Identity & PII Isolation**:
   - An `order` can only be created by a signed-in, email-verified user (`isVerifiedUser()`) where `incoming().buyerUid == request.auth.uid`, `incoming().status == 'Pending'`, `incoming().quantity >= 1`, `incoming().unitPrice >= 0`, `incoming().totalPrice >= 0`, `incoming().createdAt == request.time`, and `exists(/databases/$(database)/documents/listings/$(incoming().listingId))`.
   - Because `orders` contain buyer PII (`buyerEmail`, `buyerName`), `get` and `list` are strictly isolated to the order owner (`resource.data.buyerUid == request.auth.uid`) or a verified administrator.
6. **Temporal & Immutability Invariants**:
   - `createdAt` must equal `request.time` on `create` and is strictly immutable (`incoming().createdAt == existing().createdAt`) on `update`.
   - `updatedAt` must equal `request.time` on `create` and `update`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 — Shadow Field Injection on `orders` Create**:
   ```json
   {
     "listingId": "listing_1",
     "listingTitle": "10,000 Gold Coins",
     "gameTitle": "Elden Realm",
     "categoryName": "Currency",
     "sellerName": "VaultTrader",
     "quantity": 1,
     "unitPrice": 19.99,
     "totalPrice": 19.99,
     "buyerUid": "user_abc",
     "buyerEmail": "buyer@example.com",
     "buyerName": "Buyer One",
     "deliveryInstructions": "Character: TarnishedOne",
     "status": "Pending",
     "isVerifiedAdmin": true
   }
   ```
   *Expected Result*: `PERMISSION_DENIED` (blocked by `data.keys().hasOnly(...)`).

2. **Payload 2 — Buyer UID Spoofing on `orders` Create**:
   ```json
   {
     "buyerUid": "victim_uid_999",
     "status": "Pending"
   }
   ```
   *Expected Result*: `PERMISSION_DENIED` (blocked by `data.buyerUid == request.auth.uid`).

3. **Payload 3 — Order Status Shortcutting on Create**:
   ```json
   {
     "buyerUid": "user_abc",
     "status": "Completed"
   }
   ```
   *Expected Result*: `PERMISSION_DENIED` (blocked by `incoming().status == 'Pending'` on create).

4. **Payload 4 — Negative Price / Negative Quantity Exploit on `orders`**:
   ```json
   {
     "quantity": -5,
     "unitPrice": 10,
     "totalPrice": -50
   }
   ```
   *Expected Result*: `PERMISSION_DENIED` (blocked by `data.quantity >= 1 && data.totalPrice >= 0`).

5. **Payload 5 — Unverified Email Spoof Attack Against Admin Email**:
   ```json
   {
     "auth": { "uid": "spoof_1", "token": { "email": "priyam.dgp13@gmail.com", "email_verified": false } }
   }
   ```
   *Expected Result*: `PERMISSION_DENIED` (blocked by `request.auth.token.email_verified == true`).

6. **Payload 6 — Cross-User Order PII Scraping (`get` / `list` on `/orders`)**:
   - Authenticated user `user_xyz` attempts to `get` or `list` an order where `buyerUid == "user_abc"`.
   *Expected Result*: `PERMISSION_DENIED` (blocked by `existing().buyerUid == request.auth.uid || isAdmin()`).

7. **Payload 7 — Orphaned Listing Creation (Non-Existent `gameId` or `categoryId`)**:
   ```json
   {
     "gameId": "non_existent_game_999",
     "categoryId": "non_existent_cat_999",
     "title": "Orphaned Offer",
     "price": 15.0
   }
   ```
   *Expected Result*: `PERMISSION_DENIED` (blocked by `exists(/databases/$(database)/documents/games/$(incoming().gameId))`).

8. **Payload 8 — Negative Price or Stock in `listings`**:
   ```json
   {
     "title": "Corrupted Listing",
     "price": -10,
     "stock": -1
   }
   ```
   *Expected Result*: `PERMISSION_DENIED` (blocked by `data.price >= 0 && data.stock >= 0`).

9. **Payload 9 — Path Variable ID Poisoning (2KB Junk Document ID)**:
   - Attempting `create` or `get` on `/games/<2000-char-junk-id!@#$>`.
   *Expected Result*: `PERMISSION_DENIED` (blocked by `isValidId(gameId)` regex and `<= 128` length check).

10. **Payload 10 — Immutable `createdAt` Tampering on Update**:
    - Attempting to modify `createdAt` during an `update` on `/games/{gameId}` or `/orders/{orderId}`.
    *Expected Result*: `PERMISSION_DENIED` (blocked by `incoming().createdAt == existing().createdAt`).

11. **Payload 11 — Unauthorized Public Write to `/siteSettings/global`**:
    - Non-admin user attempts to change `heroTitle` or `logoUrl` on `/siteSettings/global`.
    *Expected Result*: `PERMISSION_DENIED` (blocked by `isAdmin()`).

12. **Payload 12 — Unauthorized Self-Promotion in `/admins/{adminId}` with Wrong Token**:
    - Signed-in user attempts to write `/admins/{uid}` with `grantToken: "WRONG_PASSWORD"`.
    *Expected Result*: `PERMISSION_DENIED` (blocked by `data.grantToken == 'POLARITH_ADMIN_8825_GRANT'`).
