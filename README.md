# ByajWala

Offline-first money lending and recovery app for a single lender.  
React Native (Expo) · SQLite · no backend · Android + iOS.

## Interest model

Monthly interest is **interest-only** on outstanding principal:

`Monthly interest (paise) = round(principal_paise × rate_bps / 10000)`

Example: ₹1,00,000 at 2% / month → ₹2,000 interest every month. Principal stays until final settlement (principal + last month’s interest).

All money is stored as **integer paise** to avoid float rounding.

## Features

- Dashboard totals, dues, overdue, recent activity  
- Customers (search, archive, statement PDF)  
- Loans with auto schedule and statuses  
- Payments: interest, principal, partial, advance, settlement  
- Recovery filters  
- Receipts & reports (PDF / CSV share)  
- Local JSON backup / restore with confirmation  
- Optional PIN lock (SecureStore)  
- Local reminder digest  

## Run

```bash
npm install
npx expo start
```

- Android: `npx expo start --android` or Expo Go  
- iOS: `npx expo start --ios` (macOS)  
- Web preview: `npx expo start --web`

Production binaries: `npx expo prebuild` then open `android/` / `ios/`.

## Architecture

```
src/
  db/           SQLite schema, repos, sequences
  services/     calc, pdf, backup, notifications
  screens/      UI
  navigation/   tabs + stack
  utils/money   paise arithmetic
```

Repos are the only data-access layer so a future API can replace SQLite calls.

## Privacy

All data stays on device. Closed loans lock; payments are not hard-deleted (`voided` flag exists for future corrections).
