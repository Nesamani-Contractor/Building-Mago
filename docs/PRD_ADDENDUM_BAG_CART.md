# Mago PRD Addendum — Makeup bag counts, quantity check, cart & orders (D-25)

13 Nov 2026 · Owner: Nesamani

## 1. Add products from the Library
Library → **My makeup bag** card: **Several photos** (camera burst or pick many), **One photo**, **By hand**. Same three on the bag screen.
- Photos are read for name, brand, shade, type, colour and **how many identical units** are visible. Full app: `scan-products` (Gemini, photo not stored). Claude web preview: Claude reads the photos (`sample` capability with images). If reading fails she names them on the review screen.
- Review screen: every product editable — name, brand, **How many?** stepper, type, shade name + swatch.

## 2. Same product added again = count goes up
- Same product = same type + brand (when both known) + name + shade (`isSameProduct`, `packages/shared/src/bag.ts`). Different shade or brand stays separate.
- Repeats are merged whether already in the bag, repeated inside one scan, or added from an arrived order (`mergeIntoBag`). Missing details (brand, shade, photo) are filled in from the new copy.
- Before saving she sees "Already in your bag (×2). Saving makes it ×3." After saving: "Matte Lipstick is now ×3".
- Bag tiles show ×N; the bag shows products and total items. Edit a product to change its count; 0 removes it.

## 3. Quantity details in the look check
For every product in a look (routine page bag check, "See every product", stylist's note):
- status with count: "In your bag · you have 2", "Swap · use your Matte Lipstick (you have 3)", "Not in your bag · you have 0";
- how the look uses it: "Used in 2 steps · 1 swipe, 2 coats" (amounts from the video);
- summary: "This look uses 4 products. You have 2 (3 in your bag) · 1 you can swap with what you own · 1 to buy."

## 4. Cart & orders
- **Add to cart** on every missing or swap product; **Add N missing to cart** for all at once (skips ones already in the cart); **Buy more** on any bag product.
- Same product added twice → its quantity goes up (one line per product, 1–10).
- **My cart** (cart icon with count on Library, bag, product list; Me → My cart): − / + stepper, Remove with **Undo**, Clear, Continue browsing (goes back where she came from), Checkout. Empty state → Find a look.
- **Checkout**: order summary, Edit cart (back), total items, Place order → **Order placed** (number, items) → Back to my looks / View my orders.
- **My orders** (Me): each order; **It arrived — add to my bag** adds everything to the bag with counts merged (once per order).

## Open questions
- **Retail partner** for real prices, stock, delivery and payment (affiliate or licensed retailer feed, ties to D-22). Until then checkout saves an order request on the phone and charges nothing.
- This reverses D-14's "not copied: shopping" — owner decision 13 Nov.

## Analytics
`bag_item_merged`, `cart_added` {count, source}, `cart_viewed`, `cart_item_removed`, `cart_cleared`, `order_placed` {lines, units}, `order_added_to_bag`. No product names sent.
