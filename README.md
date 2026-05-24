# Petrol Pump Accounting

Accounting and operations app for petrol stations. Workers record end-of-shift data; admins configure the station and review records.

## User roles

- **Worker** — Assigned to a station. Submits shifts for that station’s fuel nozzles and sales.
- **Admin** — Full access to users, pricing, credit accounts, orders, and all shift records.

Workers and admins sign in separately. Workers only see shift submission; admins see the management screens.

## Worker: shift submission

A shift is submitted in steps:

1. **Shift details** — Date, day or night shift, pump readings (opening/closing per fuel type and nozzle), fuel thrown out during testing, and lube sales.
2. **Deferred payments** — Credit sales and credit-back entries tied to customer accounts (amount, account, description).
3. **Sales** — Cash in hand, cash with manager, QR transfer, card, credit totals, and losses.
4. **Review & submit** — Summary of readings, sales, and credit lines before the shift is saved.

Day rates for **XG**, **HSD**, and **MS** are pulled from the latest admin-set prices for that day. After a successful submit, the worker is logged out.

Each worker account is linked to a **station name** and a configured set of **fuel types and nozzles** (readings) used on the shift form.

## Gemini AI: shift image upload

Workers can upload a photo of their written shift sheet instead of typing every value by hand.

1. **Upload** — On the shift details step, select an image of the shift paperwork (meter readings, lube lines, testing notes, etc.).
2. **Extract** — The backend sends the image to **Google Gemini** and asks it to read structured data from the photo.
3. **Pre-fill** — Returned data is merged into the form:
   - **Meter readings** — Opening and closing values per fuel type and nozzle (matched to the worker’s configured nozzles).
   - **Lube sales** — Description, quantity, and amount where visible on the sheet.
   - **Nozzle testing** — Fuel type and litres thrown out during testing.
4. **Review** — The worker checks and edits any fields before continuing through deferred payments, sales, and final submit.

AI extraction is a helper only: numbers can be corrected manually, and the normal review and calculation steps still apply before the shift is saved.

## Admin: daily fuel rates

Set and update today’s price per litre for **XG**, **HSD**, and **MS**. Workers’ shifts use these rates for calculations. Rate history is available for reference.

## Admin: users

- Create, edit, and delete **admin** and **worker** accounts.
- Set username, password, station name, role, and active/inactive status.
- For workers: assign fuel types and nozzle closing readings used on the shift form.
- View last login per user.

## Admin: deferred payment accounts

Customer accounts used for credit sales and repayments:

- Create and edit accounts (name, code, contact details, balance).
- List accounts and open account summaries (balance and related activity).

## Admin: deferred payment orders

Standalone credit transactions (not only inside a shift):

- **Credit sale** — Charge an account.
- **Credit back** — Payment or adjustment against an account.

Create, edit, delete, and filter orders. View order summaries linked to accounts and shifts where applicable.

## Admin: shifts

- Browse shifts by date range.
- Open a shift to view full detail (readings, sales, credit lines, rates used).
- Edit or delete submitted shifts.

## Admin: shift-linked credit (during worker flow)

When workers submit shifts, credit sales and credit-backs are stored as orders and linked to the shift. Admins can also record or adjust deferred-payment orders from the admin area.

## Fuel types

The system supports three fuel categories: **XG**, **HSD**, and **MS**, each with one or more pump nozzles per station configuration.
