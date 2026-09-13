# Bag Delay Fee Refund Clock

**Paste (1) flight arrival / deplane opportunity time, (2) domestic vs international + flight duration if intl, (3) when the bag was delivered or still missing, (4) MBR filed?, (5) bag fee paid → one shareable clock card:**  
hours-since-arrival vs DOT significant-delay threshold (domestic **12h**; intl **15h** if the flight was ≤12h / **30h** if >12h) · **MBR filed?** chip · “automatic bag-fee refund due?” status · DOT refunds.gov + 14 CFR §260.5 pointer.

Brand on the surface: **Bag Delay Fee Refund Clock** only.

Not a claim filer. Not an airline customer-service bot. No PNR scrape. **Not legal advice.** User-pasted times only — this tool never invents airline delivery ETAs.

## Hypothesis

Carousel / hotel-delivery rage (“I paid $35–$60 to check and it isn’t here”) plus confusion about when the *fee* refund is automatic vs when to chase, and MBR vs insurance mix-ups. Flip that into a **threshold-honest share card**: are you past 12/15/30h + did you file MBR — without filing the claim or scraping airline apps. Distinct from Gate Rights (bag-fee clock ≠ significant *flight* delay / cancel ticket refunds) and from Travel Booking Tip Fee (mishandled bag ≠ OTA tip/VIP preselect).

## How to test (local)

```bash
cd kb/mde/bag-delay-fee-clock
npm run build          # copies assets → dist/
# either open the file:
open index.html        # or dist/index.html
# or serve:
npm start              # http://localhost:4212
```

Manual checklist:

1. Open the page → honesty banner + DOT / §260.5 cites visible.
2. Click **Domestic · 14h + MBR** → giant **14.2h vs 12h**, PAST bar, **MBR: filed**, **Fee refund may be due**.
3. Click **Domestic · 6h still out** → **Not yet**, ~6h remain to 12h, MBR not filed.
4. Click **Intl ≤12h flight · 16h** → 15h threshold text + may-be-due.
5. Click **Intl >12h flight · 31h** → 30h threshold text + may-be-due.
6. Click **Past 12h · no MBR** → **Past threshold · file MBR** (automatic refund not yet).
7. Click **Delivered · 8h domestic** → **Delivered before threshold**.
8. Clear arrival date → **Show fee-refund clock** → honest miss (no invented hours).
9. **Copy share link** → `#b=` restores the card.
10. **Copy summary** → clipboard has hours + threshold + MBR + cites + not-legal-advice.
11. **Export PNG** → dark clock card (hours vs 12/15/30h bar, MBR chip, disclaimer on face) still reads without the form.
12. Surface brand is **Bag Delay Fee Refund Clock** only (no Conglomerate / personal names).

### GitHub Pages

This folder is static-ready. Point Pages at `/` of a dedicated repo (or `/docs` after copying `dist/`), with `index.html` at the site root. Relative paths (`styles.css`, `app.js`) work on project pages.

```bash
npm run build   # optional artifact in dist/
```

Do **not** create the public repo or post from this build step — Steward handles Pages + distro. Distro stays product-linked only (e.g. r/travel, r/Flights, airline subs after ATCR recirculation). **No sock accounts.** No fake MBR stories.

## Seed cohort (MVP)

Labeled teaching scenarios — not live airline data. Never invent a carrier’s delivery ETA.

| Chip | Teaching point |
|------|----------------|
| Domestic · 14h + MBR | Past 12h + MBR → fee refund may be due |
| Domestic · 6h still out | Still missing, under 12h, no MBR |
| Intl ≤12h flight · 16h | International 15h threshold + MBR |
| Intl >12h flight · 31h | International 30h threshold + MBR |
| Past 12h · no MBR | Threshold yes, automatic refund blocked until MBR |
| Delivered · 8h domestic | Delivered before the 12h line |

## Public cites (hardcoded)

| Source | URL |
|--------|-----|
| DOT Refunds (bag-fee significant delay) | https://www.transportation.gov/individuals/aviation-consumer-protection/refunds |
| 14 CFR §260.5 | https://www.law.cornell.edu/cfr/text/14/260.5 |
| August 2026 Air Travel Consumer Report | https://www.transportation.gov/resources/individuals/aviation-consumer-protection/august-2026-air-travel-consumer-report-june-and |
| Sep 1 2026 ATCR mishandle analysis (secondary) | https://travelprnews.com/us-airline-baggage-data-shows-wide-gap-in-mishandling-rates-as-overall-performance-improves/travel-press-release/2026/09/01/ |

DOT framing used on the card (literacy only): domestic = not delivered within **12 hours** after opportunity to deplane; international = **15 hours** (flight ≤12h) or **30 hours** (flight >12h); clock starts at deplane opportunity at the final destination and ends at pickup / agreed delivery; passenger **must file an MBR**; refund is automatic once MBR + significant delay. August 2026 ATCR context (H1 2026 mishandled volume) is a footnote, not a live rate.

Never invent legal claims beyond that public framing. Never file an MBR or start an airline claim.

## Ads pathway (ad-only free utility — do not spend yet)

| Path | Notes |
|------|--------|
| **Revenue (primary)** | **AdSense / display under the clock card + “when is a checked bag ‘significantly delayed’ for a fee refund?” explainer** (not inside the PNG). Inventory spikes on ATCR baggage headlines and holiday travel weeks. Justified when sessions cover hosting. Free card forever — **no paywall**, no Gumroad. |
| **Brand-safe** | Informational clock + public DOT / CFR cites. **Not legal advice. Not a claim filer.** Ads **not** inside PNG. **Hard avoid claim-mill / “sue the airline” affiliates** that conflict with honesty brand. Pointer: file MBR with the airline; details at transportation.gov refunds / baggage pages. |
| **Sponsorship (later)** | Optional brand-safe travel-literacy sponsor only at scale — never claim mills. |
| **Acquisition (gated)** | Google “delayed bag fee refund” / “airline mishandled baggage refund 12 hours” + Reddit promo after Sep ATCR recirculation. Creative = “Paste arrival + delivery time — past the DOT significant-delay threshold?”. Max CPA abort ~$0.30–0.50 without a completed share. Debit/cash only. **Spend only after one organic travel-thread test.** |
| **UTM** | Example: `?utm_source=reddit&utm_medium=organic&utm_campaign=bag_delay_fee_clock_mvp` (query stays; hash carries times). |
| **Tracking** | Clock completes + share clicks (GoatCounter path when Pages is live). |
| **Abort sketch** | Pause paid if CPA exceeds band without share / “am I past 12 hours?” replies. |

**No spend from this ready_for_pages step.** Ads are the monetization path (**ad-only OK**). **No forced Gumroad.**

## Product constraints

- Single static site (no backend). Client-side only.
- **Times only from user paste** (or labeled seeds). Never invent airline delivery ETAs.
- Threshold labels must be **text** (domestic 12h / intl 15h / 30h), not color-only.
- Empty states honest. Disclaimer always visible on the share PNG.
- Brand: **Bag Delay Fee Refund Clock** only on surface.
- Share = URL hash (`#b=`) + PNG + copy summary.
- No airline login. No PNR scrape. No claim filing. No sock “sue the airline” farms.

## Files

| Path | Role |
|------|------|
| `index.html` | App shell (GitHub Pages entry) |
| `app.js` | DOT 12/15/30h math, MBR/status chips, seeds, share hash, PNG |
| `styles.css` | Bag Delay Fee Refund Clock UI |
| `scripts/build.js` | `npm run build` → `dist/` |
| `package.json` | build / start / preview scripts |

## Opportunity

Internal card: `opp_travel_bag_delay_fee_clock` (travel / baggage refunds).  
Experiment stub: `institutions/mde/experiments/exp_bag_delay_fee_clock.md`.
