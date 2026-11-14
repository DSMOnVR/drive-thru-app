# DSMDonalds (GitHub Pages)

Browser-based DSMDonalds drive-thru demo with a **PC register/menu** and an **iPhone phone app** (rewards + wallet + scan-to-pay). Designed to be hosted on GitHub Pages as a static site.

## Pages
- `index.html` – launcher
- `register.html` – **PC Register**: add menu items to cart, link rewards account by **4-digit code** (Mobile App button), redeem offers, take cash/card or **Phone Scan payment** (shows QR).
- `menu.html` – **PC Menu Board** (McDonald's/Burger King style display). Press **Ctrl+Shift+E** to open the **Menu Adder** to add Food/Drinks items with **name, category, price, and picture (URL or upload)**.
- `phone.html` – **iPhone Phone App**: shows rewards **4-digit code**, points, offers/free rewards, **fake credit card & balance**, and **Scan & Pay** to scan the register's payment QR and pay from balance.
- `admin.html` – **Admin**: create/manage fake cards & rewards users (name, 4-code, balance, points), add offers/free food, configure points-per-dollar, reset demo data.

## How it works
- **Rewards (4-code):** Phone App displays a 4-digit code for the selected user. On the Register, click **Mobile App (4-code)** and enter it to link the customer (shows name/points/balance) and earn points on completed orders.
- **Payment / "Apple Pay" style scan:** On Register choose **Apple Pay / Phone Scan** to generate a payment QR. On Phone App use **Scan & Pay** (camera `BarcodeDetector` where supported, or paste data) and confirm to pay from the fake card balance. Then click **Check Payment** on the Register to complete the order.
- **Fake credit cards & balances:** Created/edited in Admin (and selectable in Phone App).
- **Points & offers:** Points awarded per $ on completed orders (configurable in Admin). Offers/free food can be added in Admin and redeemed from the Register when enough points (and shown in Phone App).

## iPhone use (actual app / PWA)
1. Host the folder on GitHub Pages (or any static host) and open the site in Safari on iPhone over HTTPS.
2. Open **Phone App** (`phone.html`). It’s built as an installable PWA with an app-like tabbed UI (Home/Rewards, Scan & Pay, Deals, Account), manifest, and service worker.
3. Use **Share → Add to Home Screen** to install DSMDonalds like an app (standalone/full-screen feel).
4. Camera QR scanning requires HTTPS (GitHub Pages provides this) and browser support for `BarcodeDetector`; if unavailable, paste the payment data.

## Sync & data
- Data is stored in **browser localStorage** (`dt_app_v1`) and can sync across devices when a Sync provider is configured.
- **Supabase sync (recommended):** in Admin/Phone → Sync, connect with your Supabase Project URL + anon key and a room ID (same on all devices). Setup (Supabase SQL Editor):
  ```sql
  create table if not exists app_state (
    id text primary key,
    data jsonb,
    updated_at timestamptz default now()
  );
  alter table app_state enable row level security;
  create policy "anon all" on app_state for all to anon using (true) with check (true);
  ```
  This enables real-time-ish sync (polling) for users/cards (e.g. Dylan), points, offers, menu, and scan-to-pay pending payments.
- **Auto Sync:** tries public stores (e.g. Pantry) and may be blocked by CORS/network in some browsers.
- **Manual Export/Import:** Admin → Manual Export / Import always works as a fallback.
- Menu items added via **Ctrl+Shift+E** are saved in synced data. For cross-device scan-to-pay, all devices must use the same sync.

## IPA / signing
A signed `.ipa` cannot be produced on Windows without macOS/Xcode. This repo provides the web app you can host on GitHub and use/install on iPhone via Safari. If you need a native wrapper, you can later wrap this folder with a tool like Capacitor on a Mac to build an IPA and sign it with your own signing setup.
