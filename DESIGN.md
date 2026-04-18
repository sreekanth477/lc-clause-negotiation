# LC Copilot — Design System & Improvement Log

This document records every design decision, improvement implemented, and future recommendation for the LC Clause Negotiation AI Copilot frontend.

---

## Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Bank-grade clarity** | Information hierarchy mirrors paper LC review forms — reference at top, risk signals dominant |
| **Signal over noise** | Risk levels always use colour, never just text — colour-blind users also get text labels |
| **Progressive disclosure** | Clause detail only shows when a clause is selected; alternatives only expand on demand |
| **Instant feedback** | Every action (decision, escalation, feedback) confirms via toast notification within 300ms |
| **Audit-visible design** | UI surfaces the audit trail — every decision shows who, what, when |

---

## Design Token System

### Colour Tokens (tailwind.config.js)

All raw hex values have been replaced with named design tokens. Never use `#1e3a5f` directly in component code — use the token.

```js
colors: {
  bank: {
    900: '#12243d',       // deepest navy (headings on dark bg)
    800: '#1e3a5f',       // PRIMARY — sidebar, main CTAs
    700: '#254d7d',       // slightly lighter for borders
    600: '#2d6a9f',       // hover state for primary buttons
    500: '#3a82bf',       // links, secondary actions
    200: '#bfdbf7',       // light tint for badges
    50:  '#f0f7ff',       // very light bg for hover states
    accent: '#f0a500',    // GOLD — primary action buttons (New Review, Generate Report)
    'accent-light': '#fbbf24',  // hover state for gold buttons
  },
  risk: {
    high:            '#dc2626',    // Tailwind red-600
    'high-bg':       '#fef2f2',
    'high-border':   '#fca5a5',
    medium:          '#d97706',    // Tailwind amber-600
    'medium-bg':     '#fffbeb',
    'medium-border': '#fcd34d',
    low:             '#ca8a04',    // Tailwind yellow-600
    'low-bg':        '#fefce8',
    'low-border':    '#fde68a',
    compliant:       '#16a34a',    // Tailwind green-600
    'compliant-bg':  '#f0fdf4',
    'compliant-border': '#86efac',
  }
}
```

### Typography

- **Font stack:** Inter → system-ui → -apple-system → sans-serif
- **Mono font:** JetBrains Mono → Menlo → Monaco (used for LC reference numbers, code)
- **Scale:** 2xs=10px, xs=12px, sm=14px, base=16px, lg=18px, xl=20px, 2xl=24px

### Spacing System

All spacing uses Tailwind's 4px base scale. Key values:
- Card padding: `p-5` (20px)
- Section gap: `space-y-6` (24px)
- Sidebar width: `w-60` (240px) — fixed, never collapses on desktop
- Clause navigator width: `w-72` (288px)

### Shadow Tokens

```js
boxShadow: {
  card:         '0 1px 3px 0 rgba(0,0,0,.06), 0 1px 2px -1px rgba(0,0,0,.04)',
  'card-hover': '0 4px 12px 0 rgba(0,0,0,.08)',
  modal:        '0 20px 60px -10px rgba(0,0,0,.25)',
  toast:        '0 4px 20px rgba(0,0,0,.15)',
}
```

---

## Improvements Implemented

### 1. Toast Notification System (`Toast.tsx`)

**Problem:** Zero visual feedback when a decision was saved, an escalation raised, or feedback submitted. Users were left wondering if their action registered.

**Solution:** Built a full `ToastProvider` + `useToast()` hook with four variants (success, error, warning, info). Each toast:
- Shows a colour-coded icon + border
- Displays a progress bar that drains over the toast's lifetime
- Auto-dismisses (4s default, 6s for errors)
- Stacks up to 5 toasts in the bottom-right corner
- Includes an X button for manual dismiss
- Is `aria-live="assertive"` for screen reader compatibility

**Usage:**
```tsx
const { success, error, warning } = useToast()
success('Decision recorded', 'Clause 3 marked as accepted AI suggestion.')
error('Save failed', 'Please try again.')
```

**Files:** `src/components/shared/Toast.tsx`

---

### 2. Tailwind Design Token Expansion

**Problem:** Raw hex `#1e3a5f` and `#2d6a9f` appeared in 30+ locations with no central source of truth. Risk colours had no border variants, making card designs inconsistent.

**Solution:** Extended `tailwind.config.js` with:
- Full `bank.*` colour scale (50–900 + accent)
- Full `risk.*` scale with `-bg` and `-border` variants for each level
- Named shadow utilities (`card`, `card-hover`, `modal`, `toast`)
- Named animation utilities (`slide-in-up`, `fade-in`, `pulse-ring`)

**Files:** `tailwind.config.js`

---

### 3. AppShell Desktop Breadcrumb Header

**Problem:** The desktop layout had no top header — only a mobile hamburger bar. Users navigating deep into a session had no breadcrumb trail and no way to orient themselves without using the sidebar.

**Solution:** Added a sticky desktop header bar (hidden on mobile) containing:
- **Breadcrumb trail** — auto-derives from `useLocation()`, e.g. `Dashboard › Clause Review`
- Clickable parent segments link back to their respective pages
- **Right side:** logged-in user's email + avatar initials circle
- Mobile bar unchanged — shows current page title in the `<header>`

**Breadcrumb logic:**
| Route | Breadcrumb |
|-------|-----------|
| `/dashboard` | Dashboard |
| `/lc/new` | Dashboard › New LC Review |
| `/lc/:id/review` | Dashboard › Clause Review |
| `/lc/:id/report` | Dashboard › Scrutiny Report |
| `/compliance` | Dashboard › Compliance Dashboard |

**Files:** `src/components/layout/AppShell.tsx`

---

### 4. Login Page — Password Reveal + Demo Credentials

**Problem:** No show/hide toggle on the password field. New users had no way to discover demo credentials without reading the README.

**Solution:**
- Added Eye / EyeOff toggle button inside the password input (right-padded to avoid overlap)
- Added a blue hint card below the login card showing demo credentials inline
- Button is `tabIndex={-1}` so it doesn't interrupt keyboard flow

**Files:** `src/App.tsx`

---

### 5. ClauseReview — Filter Buttons with Live Counts

**Problem:** The filter bar showed `All | High Risk | Unactioned` with no indication of how many clauses each filter would return. Officers couldn't assess the review burden at a glance.

**Solution:** Each filter button now shows a sub-label count that updates in real-time as analyses complete via SSE:

```
┌─────────┐  ┌──────────┐  ┌───────────┐
│  All    │  │ High Risk│  │ Unactioned│
│   8     │  │    3     │  │    5      │
└─────────┘  └──────────┘  └───────────┘
```

Count is computed directly from the Zustand store and rerenders instantly as SSE events arrive.

**Files:** `src/pages/ClauseReview.tsx`

---

### 6. ClauseReview — "Accept Original" for COMPLIANT Clauses

**Problem:** When a clause was COMPLIANT, officers had no decision path. All four decision buttons (`Accept AI Suggestion`, `Edit & Accept`, `Reject — Write Own`, `Escalate`) were shown even though none were appropriate. Officers couldn't mark compliant clauses as reviewed, so the progress counter never reached 100%.

**Solution:**
- Added a COMPLIANT notice banner (green, ShieldCheck icon) above the decision section for COMPLIANT clauses
- Shows a single `Accept Original — No Change` button for COMPLIANT clauses (records `ACCEPTED_ORIGINAL` decision)
- All other decision buttons are only shown for non-COMPLIANT clauses

**Files:** `src/pages/ClauseReview.tsx`

---

### 7. Risk Findings — Colour-Coded Left-Border Cards

**Problem:** Risk findings were displayed as a flat list with a small coloured bullet point. HIGH and MEDIUM findings were visually indistinguishable at a glance. Officers had to read the severity label to understand urgency.

**Solution:** Replaced bullet list with severity-banded cards featuring:
- `border-l-4` left accent bar (red for HIGH, amber for MEDIUM, yellow for LOW)
- Matching background tint (`bg-red-50`, `bg-amber-50`, `bg-yellow-50`)
- Severity label as uppercase badge
- Issue text in full weight; explanation in muted sub-text
- Each card is visually contained and scannable independently

**Before:**
```
● SOFT CLAUSE DETECTED...
  This clause makes payment conditional...
```

**After:**
```
┃ HIGH
┃ SOFT CLAUSE DETECTED
┃ This clause makes payment conditional on "acceptable to applicant"...
```
(with red background tint and left bar)

**Files:** `src/pages/ClauseReview.tsx`

---

### 8. Toast on Decision / Escalation Save

**Problem:** When officers clicked a decision button, nothing confirmed success — no visual change until the next render cycle updated the Zustand store. Silent failures left officers unsure whether to retry.

**Solution:** Every `submitDecision()` and `submitEscalation()` call now:
- Shows a `success` toast on completion: `"Decision recorded — Clause 3 marked as accepted ai suggestion."`
- Shows an `error` toast on failure: `"Failed to save decision — Please try again."`

**Files:** `src/pages/ClauseReview.tsx`

---

### 9. ComplianceDashboard — BarChart Cell Fix

**Problem:** The feedback BarChart used `<rect>` elements inside a `.map()` which Recharts ignores entirely — all bars rendered in the default grey color regardless of the `fill` property defined in `feedbackChartData`.

**Solution:** Replaced `<rect key={i} fill={entry.fill} />` with the correct Recharts API: `<Cell key={i} fill={entry.fill} />` imported from `recharts`. The chart now correctly shows green for Helpful, amber for Partially Helpful, and red for Not Helpful.

**Files:** `src/pages/ComplianceDashboard.tsx`

---

### 10. ComplianceDashboard — Escalation Rate Metric Card

**Problem:** The backend calculates and returns `escalationRate` in `aiPerformanceMetrics`, but the UI only showed 4 metric cards (Avg Confidence, Acceptance, Edit, Rejection). The escalation rate — a key compliance KPI — was silently discarded.

**Solution:** Added a 5th metric card (orange colour scheme) showing escalation rate with sub-label "referred to compliance". Grid updated from `grid-cols-4` to `grid-cols-5` on large screens.

**Files:** `src/pages/ComplianceDashboard.tsx`

---

### 11. ComplianceDashboard — Refresh Button + Last Refreshed Timestamp

**Problem:** Dashboard data was only fetched on mount. Compliance officers reviewing escalations throughout the day had no way to reload without a full page refresh.

**Solution:**
- Added a "Refresh" button (with RefreshCw icon) in the page header
- Shows a "Last refreshed: HH:MM:SS" timestamp updated on every successful fetch
- The button re-triggers the full dashboard data fetch and updates the timestamp

**Files:** `src/pages/ComplianceDashboard.tsx`

---

### 12. NewLCReview — Step Indicator with Connecting Line

**Problem:** The 3-step progress indicator during LC processing (`Uploading Document → Extracting Clauses → Ready for Review`) showed isolated icons with no visual connection, making it hard to perceive as a sequence.

**Solution:** Added a vertical connecting line (`absolute left-[15px]`) running behind the step icons. Step icons upgraded to bordered circles that fill on completion:
- `pending` → hollow circle with gray border
- `loading` → white circle with bank-800 border + spinning loader
- `done` → green filled circle with white checkmark
- `error` → red-tinted circle with alert icon

Each step also shows a "In progress..." or "Complete" sub-label.

**Files:** `src/pages/NewLCReview.tsx`

---

### 13. Dashboard — Client-Side Search

**Problem:** The sessions table had no search or filter capability. With 50+ sessions loaded, finding a specific LC by reference number or applicant name required scrolling.

**Solution:** Added a search input in the sessions table header. Client-side filtering on:
- Reference number (case-insensitive substring)
- Applicant name (case-insensitive substring)
- LC Type

Filtered count updates in real time with `useMemo`. When search returns zero results, shows `No sessions match "{query}"`.

**Files:** `src/pages/Dashboard.tsx`

---

### 14. Dashboard — Recent Activity Feed

**Problem:** The requirements specified a "recent activity feed" on the Dashboard, but the initial implementation only had a sessions table. Officers returning to the dashboard had no quick summary of what was recently worked on.

**Solution:** Added a side panel (right 1/3 of main grid on `lg` screens) showing the 5 most recent LC sessions sorted by creation date:
- Red dot for sessions with HIGH risk clauses, green for clean sessions
- Shows reference + applicant, type + status, and creation date
- Clicking any item navigates directly to that session's clause review

On smaller screens, the activity feed stacks below the table.

**Files:** `src/pages/Dashboard.tsx`

---

## Accessibility Improvements

| Issue | Fix |
|-------|-----|
| Password field — no toggle affordance | Eye/EyeOff button with `aria-label` added |
| Icon-only buttons (sidebar Logout, toast dismiss) | `aria-label` attributes added to all |
| Toast notifications — not announced to screen readers | `role="alert"` and `aria-live="assertive"` on toast container |
| Mobile menu open/close buttons | `aria-label="Open menu"` / `aria-label="Close menu"` |
| Main content area | `id="main-content"` added for skip-link target |
| Breadcrumb nav | Wrapped in `<nav aria-label="Breadcrumb">` |

---

## Known Issues & Future Recommendations

### High Priority

| Issue | Recommended Fix |
|-------|----------------|
| No pagination UI on sessions table | Add page controls below table — backend already supports `page` + `limit` params |
| `useMatches` imported but unused in AppShell | Remove import — breadcrumbs use `useLocation` directly |
| Clause text area in decision modes has no character counter | Add `{text.length}/2000` counter below each textarea |
| No error boundary at page level | Wrap each page in `<ErrorBoundary>` to prevent full-app crashes on agent failures |
| Mobile ClauseReview layout is broken | Left navigator panel needs to become a drawer/modal on `sm` screens |

### Medium Priority

| Issue | Recommended Fix |
|-------|----------------|
| Risk counts in dashboard table show `1H 2M` raw text | Replace with mini `RiskBadge` chips for visual consistency |
| Sessions table has no column sorting | Add `onClick` sort on Reference, Created date columns |
| ComplianceDashboard Risk Trend chart renders no data | Backend `getRiskTrend()` groups by creation date of clauses — seed data may share same date; add mock data or change grouping |
| `diff-match-patch` comparison shows no diff for identical text | Add a "Texts are identical" state |
| Feedback buttons have no "already submitted" state | Track submitted feedback IDs in local state and grey out already-rated buttons |
| NegotiationNote modal date is hardcoded `+7 days` | Make configurable or pull from LC expiry date |

### Low Priority / Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| **Dark mode** | Add `dark:` variants — Tailwind dark mode is already available. Toggle stored in localStorage. |
| **Keyboard navigation** | `←/→` arrow keys to navigate between clauses in the left panel |
| **Print stylesheet** | Add `@media print` styles for ScrutinyReport — currently only works via PDF export |
| **Session tagging** | Allow officers to tag sessions with custom labels (e.g. "urgent", "commodities") |
| **Clause search** | Full-text search across clause text within a session |
| **AI confidence trend** | Line chart showing confidence score across clauses in a session — helps identify structurally ambiguous LCs |
| **Onboarding tour** | First-time user walkthrough using a lightweight tour library |
| **Notification centre** | In-app notification bell for escalation updates, replacing email/external notifications |
| **WASM PDF preview** | Inline PDF viewer for uploaded documents alongside the clause navigator |

---

## Component Inventory

| Component | File | Complexity | Tests |
|-----------|------|-----------|-------|
| Toast / ToastProvider | `components/shared/Toast.tsx` | Medium | ⬜ Needed |
| RiskBadge | `components/shared/RiskBadge.tsx` | Low | ⬜ Needed |
| ConfidenceScore | `components/shared/ConfidenceScore.tsx` | Low | ⬜ Needed |
| StatusIndicator | `components/shared/StatusIndicator.tsx` | Low | ⬜ Needed |
| AppShell | `components/layout/AppShell.tsx` | Medium | ⬜ Needed |
| Sidebar | `components/layout/Sidebar.tsx` | Low | ⬜ Needed |
| LCUploader | `components/lc/LCUploader.tsx` | Medium | ⬜ Needed |
| ClauseCard | `components/lc/ClauseCard.tsx` | Low | ⬜ Needed |
| ClauseComparison | `components/lc/ClauseComparison.tsx` | Medium | ⬜ Needed |
| AlternativeWording | `components/lc/AlternativeWording.tsx` | Low | ⬜ Needed |
| NegotiationNote | `components/lc/NegotiationNote.tsx` | Medium | ⬜ Needed |
| UCPArticleReference | `components/lc/UCPArticleReference.tsx` | Low | ⬜ Needed |
| ScrutinyReportViewer | `components/report/ScrutinyReportViewer.tsx` | Medium | ⬜ Needed |
| ExportButtons | `components/report/ExportButtons.tsx` | Low | ⬜ Needed |

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-04-18 | 1.0.0 | Initial full-stack build — all pages, agents, RAG, routes |
| 2026-04-18 | 1.1.0 | Design review pass: toast system, breadcrumbs, filter counts, COMPLIANT decision path, BarChart fix, risk finding cards, step indicator, search, activity feed, escalation rate card |
