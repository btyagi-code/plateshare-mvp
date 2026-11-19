# 🍽 PlateShare MVP

Gets UMass dining surplus food to the student orgs, pantries and shelters who need it, with volunteers moving it. This is the clickable MVP for **Group 9 (Rahim, Harini, Bhawna, Julia, Taha)**, built from our MVP Design, Market Analysis, and Actions & Pivots worksheets.

## Run it

No install or build step. Open `index.html` in a browser, or turn on GitHub Pages: **Settings → Pages → Deploy from branch → `main` / root**. That gives you a link and QR code to share at presentations.

Data is stored in each visitor's browser (`localStorage`) and starts with sample postings. Use **Reset demo** in the footer to start over.

## What's in it (mapped to our user stories)

| Page | User story |
|---|---|
| **Post food** (`#/staff`) | *As a dining staff member, I want to post surplus food with its quantity and pickup window so that it can be donated before it goes to waste.* The form times itself, so it measures how long posting really takes. |
| **Find food** (`#/browse`) | *As a student org leader, I want to view and request available food…* and *As a student, I want to see the quantity and type of food so that I can assess that it meets my dietary needs.* Filter by location and diet (vegan, halal, gluten-free…), then reserve. |
| **Volunteer** (`#/volunteer`) | *As a volunteer, I want to see pickup details and confirm a completed pickup so that the organization knows the food is on its way.* |
| **Impact** (`#/impact`) | Tracks the assumptions from Worksheet 3 (see below) and exports CSVs. |
| **Landing page** (`#/`) | Covers the gaps from Sprint Retro 2: a **unique value proposition** (comparison with Food Recovery Network and Too Good To Go), the **nonprofit business model**, and a clear **call to action**. |
| **Feedback** (`#/feedback`) | A proper survey form instead of "scan the QR code," with role, a 1–5 likelihood scale, biggest blocker, and an interview opt-in. |

## Assumption tracker

The dashboard grades each assumption against the evidence thresholds we set in Worksheet 3:

| Assumption | Supports it | Challenges it |
|---|---|---|
| Shelters and students will request food | ≥ 60% of postings claimed before expiring, 2+ repeat orgs | < 30% claimed |
| Pickups will be reliable | ≥ 80% picked up within the window | < 50% |
| Posting fits staff routines | Average posting time < 2 min | > 5 min |
| Dining provides consistent supply | Pilot location posts ≥ 3 per week | Rarely posts |

"Servings rescued" is a rough estimate (for example, 1 tray ≈ 12 servings). Replace it with real numbers from dining staff.

## Not in the MVP yet

- Real accounts and a shared database. Right now each browser has its own data. Next step: Supabase or Firebase, so staff, orgs and volunteers see the same postings.
- Real notifications (email or SMS) when food is posted.
- Pulling UMass Dining menus automatically (a risk noted in Worksheet 3).
- A food-safety sign-off flow agreed with UMass Dining.

## Files

`index.html` (layout), `styles.css` (design), `app.js` (all logic: routing, state, pages, metrics)
