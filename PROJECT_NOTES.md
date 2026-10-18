# KLASIK CAFE Project Notes

## Project
- **Course:** ELEC 3 school project
- **Type:** Small café website
- **Brand:** KLASIK CAFE
- **Primary color:** Logo blue (`#1E3382`); pale blue tints remain for backgrounds and borders
- **Technology:** Plain HTML, CSS, and vanilla JavaScript; the existing application also uses its Supabase client for backend-backed features

## Current Scope
The site includes the café homepage, menu, Supabase-backed login and sign-up, customer order pages, customer feedback, and separate admin/barista panels.

The existing Supabase integration is used by authentication, menu, cart/order, admin/barista, and storage flows. Customer reviews and suggestions, along with some favorites and homepage customer interactions, still use browser `localStorage` and are not a shared backend source. Preserve the configured Supabase project and its data/schema; do not replace or recreate it when making front-end changes.

## Structure
- `klasik_cafe_logo_3_-removebg-preview.png`: shared brand logo used in the homepage header/footer and both account pages
- `css/style.css`: shared responsive design and page styles
- `js/script.js`: mobile navigation, image fallbacks, password toggles, demo links, and form validation
- `images/`: local photos include `coffee.jpg` and `cafe.jpg` for the homepage experience/story sections; remote image fallbacks are retained where configured. If both sources fail, a styled placeholder is shown.

## Current Behavior and Decisions
- Homepage navigation links scroll to sections; account links open the separate login and sign-up pages.
- The existing homepage remains the customer homepage and links to the full menu, customer feedback, and order review while retaining its original café design.
- The homepage sections follow the requested sequence: KLASIK Experience, More Than Coffee, Visit KLASIK CAFE, Guest Feedback, then the social footer band. The feedback button uses the existing `reviews.html` flow and the homepage review area shows the existing empty state when no reviews are stored.
- The homepage contains no product catalog or product customizer; its menu teaser links to `menu.html`, which reads available products directly from the Supabase `menu_items` table. Admin menu changes therefore remain the menu source of truth. Available picks on Favorites now also read that same table.
- Drink customization uses Medium as standard, Large adds ₱25, and the add-ons are Oreo ₱15, Biscoff ₱25, Cold Foam ₱15, Seasalt Cream ₱15, Extra Shot ₱25, Sauce/Syrup ₱15, and Oat Milk Substitute ₱25. Small, Soy Milk, and No Ice are removed.
- `menu.html` provides live autocomplete for available catalog items, including closest-name suggestions for common misspellings. Selecting a suggestion reveals the matching product card.
- The homepage opens with a white KLASIK logo above its blue tagline, centered in a stacked layout; the opening screen transitions automatically after 1.8 seconds plus its fade, with no continue button. The original homepage sections and styling remain intact, including the “A taste of Klasik in every cup.” hero headline.
- Admin product availability and Best Seller are switch controls with explicit Available/Unavailable and Best Seller/Not a Best Seller labels. Best Seller badges appear uppercase at the bottom-right of marked product images, using a gray 50%-opacity rectangular background.
- Product images can be selected or dropped into the admin upload area, previewed, and removed before saving. Accepted images are compressed for browser-local storage.
- Customer favorites are stored by the demo login identity in browser `localStorage`; customers can toggle favorites from menu cards or customization and manage/add them on the dedicated `favorites.html` page. The Favorites link on order navigation opens this standalone page; Order Review, Placed Orders, and Order History each display only their own content. If the signed-in customer's list is empty, Favorites offers up to three available real menu products as saveable suggestions; guests see a login prompt and log-in-to-save links.
- Admin and barista sidebars remain sticky on desktop with Log Out at the bottom and return to normal document flow on smaller screens.
- Product categories now support a nested structure so a main category such as Coffee can contain subcategories like Iced Coffee, Hot Coffee, and Espesyal for clearer organization in the admin panel and menu filtering.
- `orders.html` handles the cart and themed pre-placement confirmation. Confirming creates a unique receipt/order code and moves the order into `placed-orders.html` with Awaiting Confirmation status.
- Customer order pages and the barista queue use `klasikCafeOrders` localStorage, while the Admin order panel reads Supabase `placed_orders`; these are separate and do not share order/status updates.
- The admin menu reads and writes the Supabase `menu_items` table. The homepage and menu page no longer embed a duplicate product catalog.
- `reviews.html` is the customer feedback page. Reviews and suggestions use the existing client-side feedback flow; the homepage uses the same review list and links to this page rather than adding a separate form.
- The retired standalone customer dashboard has been replaced with links and order summaries using the current shared browser data instead of seeded sample profile/order details.
- Menu product cards read current prices and availability from Supabase; `menu-page.js` displays them and opens the customization modal. Supabase cart insertion is in `cart.js`, but the cart/order review wiring still needs consolidation before production use.
- Signup requires all fields, a valid email and phone number, a password of at least eight characters, matching confirmation, and accepted terms.
- Login accepts a username or email, validates email formatting when the value contains `@`, and redirects the demo customer back to the homepage after successful login.
- Authentication is provided by the existing Supabase integration. Do not expose or replace its configuration, and do not put service-role credentials in frontend code.
- The café location is listed by Google Maps as beside Chapel, Matimbubong, San Ildefonso, Bulacan. The directions link and embedded map use the supplied Google Maps location. Published phone and opening-hour strings elsewhere in older page footers are unverified sample content; do not treat them as confirmed business details. Social URLs are not configured.
- Google Fonts, Unsplash image fallbacks, and the Google Maps embed require an internet connection; local images can replace the image fallbacks.

## Validation Performed
- `node --check js/script.js` completed without syntax errors.
- `node --check js/customer.js; node --check js/admin.js; node --check js/barista.js` completed without syntax errors after the dashboard additions.
- Browser checks covered homepage rendering and its six menu cards, mobile navigation interaction, login and sign-up validation/success states, password visibility, and the post-sign-up login link.
- The homepage showed no horizontal overflow at the tested desktop viewport. Remote photo fallbacks loaded when the local image files were absent.
- The supplied `klasik_cafe_logo_3_-removebg-preview.png` is used in the brand locations across all three pages.
- Editor diagnostics reported no errors in the updated order review page, the new order history page, the customer script, and the customer stylesheet.
- Browser loading confirmed `menu.html` renders the shared catalog, category controls, cart badge, and Customize buttons. Editor diagnostics reported no errors in the homepage, menu page, menu loader, shared scripts, and styles.
- The homepage footer block was restored to the branded bottom section matching the original KLASIK CAFE contact and account links.
- Browser checks at desktop (1440px) and mobile (390px) confirmed the enlarged header logo, logo-blue location and customization accents, removed location numbering, and no horizontal overflow. The footer-bottom color remains unchanged; editor diagnostics found no errors in the updated homepage and stylesheets.
- The shared blue accents now match the logo's dominant `#1E3382` across the site; pale blue surfaces and the footer-bottom styling are retained. The homepage header logo is slightly larger, and the Location, Opening hours, and Say hello labels are larger, blue, and no longer numbered.
- Large headings continue to use the available Playfair Display serif, which complements the logo's classic serif lettering.
- Homepage follow-up styling uses blue for the hero headline emphasis with a subtle shadow for readability, keeps the menu button logo-blue, strengthens the scroll label background, restores sans-serif on location labels (retaining size/color), darkens location details, and matches the Featured items title font to the location labels. Browser checks confirmed the requested colors/fonts and no horizontal overflow; editor diagnostics found no stylesheet errors.
- Latest typography refinement restores the hero's blue emphasis without a solid backing and adds a subtle shadow for legibility; Featured items, Our menu, order headings, Create account, and Welcome back use bold sans-serif. Login/sign-up logos are enlarged to about twice their previous displayed size, with mobile sizing kept within the hero area.
- Browser checks confirmed the hero blue, bold heading fonts on the homepage, full menu, order review, login, and sign-up; account logos render about twice as large without mobile overlap or horizontal overflow. Editor diagnostics reported no issues in touched HTML/CSS.
- The menu page now opens on a Best sellers view showing the homepage's first three featured items, with an explicit Best sellers category selected. The existing category controls remain available for browsing the rest of the catalog, and Featured items keeps its bold emphasis. Browser validation confirmed three initial items, category switching to the full coffee selection and back, and no horizontal overflow; both changed JavaScript files pass `node --check` and diagnostics.
- The menu section heading now reads “Menu,” while Best sellers remains a main category button with no subcategory. Add-ons likewise has no subcategory chips; both main-category buttons filter their matching products directly. Browser checks confirmed the three-item default, Add-ons filtering, zero subcategory chips for those groups, and no desktop horizontal overflow; updated scripts pass syntax checks and diagnostics.
- Removed a stray `x` text node after a menu product card in the homepage catalog source. Verified the loaded menu and a filtered subcategory contain no stray text/grid child.
- The second `espesyal2` product group (starting with Biscoff Oreo) now normalizes under the Non Coffee main category, so the existing Non Coffee → Espesyal filter includes those products.
- Browser verification confirmed all 10 `espesyal2` drinks appear under Non Coffee → Espesyal, and the menu has no horizontal overflow at the tested mobile width. JavaScript syntax check and editor diagnostics passed.
- Removed Matcha Series subcategory chips; the main Matcha Series category button directly filters to its matcha products, consistent with the Best sellers and Add-ons category controls.
- Browser verification confirmed Matcha Series has no subcategory chips and its button directly displays all 10 matcha products; homepage diagnostics found no HTML errors.
- Added Blueberry Cheesecake and Strawberry Cheesecake to the Cheesecakes category. Cookies contains copies of all four Smores products (OG, Matcha, Red Velvet, and Double Choco) with their original product details.
- Browser validation confirmed the Cheesecakes filter shows both new items and Cookies shows all four Smores copies. Homepage HTML diagnostics reported no errors.
- The Cookies category was aligned to the exact four Smores entries (OG, Matcha, Red Velvet, Double Choco), including their original item names, prices, images, and descriptions; only their category label is Cookies. Browser check confirmed exactly four cookie items.
- Added Snacks and Pasta as main menu categories without subcategories. Snacks contains French Fries and Double Cheese Sausage; Pasta contains one sample item, Creamy Chicken Pasta.
- Browser verification confirmed the Snacks filter shows exactly French Fries and Double Cheese Sausage, with no horizontal overflow; homepage HTML diagnostics found no errors.

## Customer, admin, and barista interfaces
- Customer, admin, and barista interfaces remain front-end demos. Customer ordering, availability, reviews, and suggestions are stored locally in the browser, not sent to a service.
- Admin menu management reads the homepage catalog on first load and persists local edits; availability is shared with customer menu cards by product name.
- Barista confirmation and subsequent order-status changes use the same browser-local order record as customer order pages and the admin panel.
- Demo role links remain available from the login page; they are navigation shortcuts, not access-controlled staff accounts.

## Latest change validation
- `node --check` passed for `js/script.js`, `js/customer.js`, `js/admin.js`, `js/barista.js`, and `js/menu-page.js` after the welcome screen, availability-switch, and typo-suggestion changes.
- HTML parsing and targeted assertions passed for the intro content, homepage layout/hero, admin availability switch/modal close button, fuzzy-search prompt/search icon, and Best Seller badge placement and styling.
- Earlier validation observed the animated intro and a manual “Enter the café” control; that control was subsequently removed in favor of the automatic transition.
- Workspace diagnostics reported no issues in the touched homepage, menu, admin, barista, customer, JavaScript, and stylesheet files during the prior implementation; the latest additions were syntax-checked and HTML-parsed as noted above.
- The welcome screen now transitions after 1.8 seconds plus its fade, without a button; the logo is centered above the tagline. The Favorites panel is a responsive adjacent column on Order Review, Placed Orders, and Order History, and stacks below the primary panel on mobile.
- All five JavaScript files pass `node --check`; workspace diagnostics report no issues in the touched HTML, JavaScript, or CSS files.
- Python HTML parsing verified the exact Medium/Large size values and all seven requested add-ons/prices on both homepage and menu customizers, as well as the two required order notes and Awaiting Confirmation initial state.
- Latest targeted assertions passed for unique homepage/cart HTML IDs, the three-second automatic intro transition, centered responsive logo/tagline, gray half-opacity rectangular Best Seller badge, responsive adjacent Favorites panel, and identity-keyed favorite storage with a guest login prompt.
- Integrated browser verification showed the welcome screen transition to the original homepage after 3.7 seconds, with the original homepage content visible and no Continue button.
- Added a Cart & Favorites shortcut from the menu and order-review pages, plus a Favorites jump link beside the order-page tabs. The Admin Best Seller map now takes precedence over any stale product-record flag, matching Admin's loading behavior; only Admin-marked items show the badge. `node --check js/customer.js` and targeted menu/order markup and state-precedence assertions passed.
- HTTP smoke checks returned 200 for the homepage, menu, order review, placed orders, order history, feedback, customer, admin, and barista pages.
- Integrated browser navigation returned `ERR_FAILED`; no interactive visual or responsive browser check was available in this session.
- Current homepage restoration was verified in a local browser at desktop and mobile widths. The section order, unique IDs, local Experience/Story photos, responsive navigation, location map, feedback empty state, and existing menu/reviews routes all passed checks; no horizontal overflow was found.
- `node --check` passed for the existing JavaScript files. No `package.json` or build script is present, and the existing Supabase integration/data were not changed.
- The homepage Call the café control remains disabled until a real phone number is confirmed. Opening hours and social URLs remain unconfigured rather than using sample values.
- A read-only browser check confirmed that `menu.html` loads the existing `menu_items` entry and Favorites fetches available picks from the same table. No database writes or schema changes were made for this update.

## Next Steps / Known Limitations
- Reviews, suggestions, and some customer-only features remain browser-local and are not shared across devices; migrate only if explicitly requested and after agreeing on a schema.
- Confirm the café phone number, opening hours, and official social URLs before enabling those homepage actions/links.
- Supabase-backed and local-only flows are still split: the homepage/customer scripts keep separate localStorage cart/order/review/favorite state, while `menu.html` inserts into the Supabase cart. The order review page loads local state and references a missing `js/orders.js`; `js/order.js` exists but is not loaded there. The barista queue also reads localStorage instead of `placed_orders`.
- Admin Reviews, Suggestions, Café Information, and Settings are not connected to database reads/writes; reviews/suggestions submitted by customers are localStorage-only. The customer reporting panel is a placeholder. The admin menu pagination controls currently have no handlers.
- Signup creates a Supabase Auth user but does not create a `profiles` row; login uses a demo localStorage handler alongside Supabase Auth, and staff invitations write profile rows without sending Auth invitations. Review the role assignment and provisioning flow.
- `auth-check.js` updates navigation/cart state but does not enforce page roles. Verify Supabase Row Level Security on `profiles`, `menu_items`, `cart`, `placed_orders`, and the `product-images` bucket; client-side role checks are not a security boundary.
- The repository has no `package.json` or configured build/test script; use available syntax and browser checks for front-end validation.

## Session Maintenance
When project files, behavior, scope, or decisions change, update these notes during that work session so the next chat starts with accurate context. Record meaningful decisions, current behavior, validation performed, and remaining work; remove details that are no longer true.
- Latest customer-page update: Favorites is a standalone page reached from the order-page navigation; the Favorites content fills its own panel without an order list beside it. Order Review, Placed Orders, and Order History display only their own content. Cart labels remain Cart. The welcome overlay transitions after 1.8 seconds before its fade completes; the logo is enlarged, the tagline uses smaller single-line sizing, and the homepage phrase “in every cup.” uses the brand blue. Targeted markup/style checks and browser checks passed.
- Favorites is linked as its own page (`favorites.html`) from the customer order navigation. Favorites functionality, guest login prompt, and real-catalog suggestions remain unchanged; browser inspection at mobile width showed three available menu picks, no order panel beside Favorites, and no horizontal overflow. Customer JavaScript syntax and page-link/unique-ID assertions passed.
- Empty Favorites panels now show up to three available products parsed from the existing homepage catalog, each with a Save Favorite control for signed-in customers. Guest panels show the same real menu picks with login-to-save links. Browser testing confirmed three suggestions render, saving a suggestion moves it into the actual favorites list, and temporary QA session/favorite data was removed afterward. `node --check js/customer.js` and targeted HTML/CSS assertions passed.
- Order Review checkout now snapshots item names, prices, customizations, and menu image URLs into each Supabase order; it expects the owner to apply the separate SQL migration for `placed_orders.order_code`, `placed_orders.customer_name`, and `placed_orders.items`. A new receipt page loads the inserted order by its ID and customer session. Admin and Barista queues use Supabase `placed_orders`, with order-code search, per-status pagination, item images, and Pending → Preparing → Ready for Pickup → Completed transitions. Signup adds customer name fields to Supabase Auth user metadata, and shared navigation uses that name before looking up `profiles.full_name`. Existing test suite passed; module syntax checks passed. No package manifest/build command exists. The complete Supabase checkout/receipt flow remains unverified until the SQL is applied and tested against the configured project.
- Replaced all native JavaScript `alert()` and `confirm()` calls with the existing branded toast and confirmation dialog; homepage/menu customization now requires a signed-in Supabase user and uses the login/sign-up modal for guests. Admin and Barista order lists have two-column desktop cards, status colors, search icons, branded pagination buttons, and two orders per page in Admin's All filter. Admin product editing preserves the existing `image_url` in the form and displays it in the preview. Login now has one functional, styled Forgot password link. No database changes are needed for these UI/auth updates; JavaScript syntax checks passed and repository search found no remaining native alert/confirm calls.
