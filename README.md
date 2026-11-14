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

## iPhone use
1. Host the folder on GitHub Pages (or any static host) and open the site in Safari on iPhone.
2. Open **Phone App** (`phone.html`). Use **Share → Add to Home Screen** for an app-like experience.
3. Camera QR scanning requires HTTPS (GitHub Pages provides this) and browser support for `BarcodeDetector`; if unavailable, paste the payment data.

## Important notes (static hosting)
- Data is stored in **browser localStorage** (`dt_app_v1`), so it is **per device/browser**. A PC and a separate iPhone will not automatically share the same localStorage over static hosting.
  - For a full demo on one machine, open Register/Menu/Phone in the same browser/profile.
  - For cross-device use, create matching users/codes in Admin on each device, or adapt the app to a shared backend (e.g. Firebase/Supabase) later.
- Menu items added via **Ctrl+Shift+E** are saved in that browser's storage.

## IPA / signing
A signed `.ipa` cannot be produced on Windows without macOS/Xcode. This repo provides the web app you can host on GitHub and use/install on iPhone via Safari. If you need a native wrapper, you can later wrap this folder with a tool like Capacitor on a Mac to build an IPA and sign it with your own signing setup.
