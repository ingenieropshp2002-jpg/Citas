---
name: Atelier Booking & Wellness
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#43474c'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#73777d'
  outline-variant: '#c3c7cd'
  surface-tint: '#4b6176'
  primary: '#000f1d'
  on-primary: '#ffffff'
  primary-container: '#0d2538'
  on-primary-container: '#778da4'
  inverse-primary: '#b2c9e2'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed65b'
  on-secondary-container: '#745c00'
  tertiary: '#000f1d'
  on-tertiary: '#ffffff'
  tertiary-container: '#00263e'
  on-tertiary-container: '#6c8ead'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cee5ff'
  primary-fixed-dim: '#b2c9e2'
  on-primary-fixed: '#041d30'
  on-primary-fixed-variant: '#33495d'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#a8caeb'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#274a66'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  title-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 26px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Manrope
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  currency-display:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system embodies the understated elegance of boutique salons and high-end wellness sanctuaries across Latin America, specifically tailored for the sophisticated urban centers of Colombia (Bogotá, Medellín, Cali). It merges the tactile prestige of high-fashion editorial publications with the razor-sharp clarity of modern booking infrastructure.

### Brand Personality & Emotional Impact
- **Discerning & Tailored:** Evokes the bespoke precision of a personal master stylist or luxury spa concierge.
- **Calm Authority:** Eliminates scheduling friction with quiet, dependable confidence.
- **Warm Prestige:** Avoids cold, clinical minimalism by pairing deep maritime petroleum tones with subtle, gilded accents reminiscent of brushed brass salon mirrors.

### Visual Movement
The aesthetic balances **Modern Editorial Luxury** with **Utilitarian Functionalism**. Prominent headlines utilize an expressive high-contrast transitional serif (`Playfair Display`) to establish prestige, while the operational core relies on an ultra-legible, geometric humanist sans-serif (`Manrope`) for rapid, error-free appointment scheduling, service selection, and multi-rail payment flows (PSE, Nequi, Credit Cards). Surfaces are pristine, airy, and layered with featherlight atmospheric depth.

## Colors

The color palette centers around deep petroleum navy, balanced with aged metallic gold accents and warm luminous neutrals.

### Palette Architecture
- **Primary (`#0D2538`):** Deep Petroleum Blue. Serves as the anchor for top-tier navigation, primary interaction states, high-priority buttons, and dominant typographical hierarchies.
- **Secondary (`#D4AF37`):** Refined Salon Gold. Applied purposefully for active indicators, premium tier badges, celebratory states, and delicate rating stars. Never used for dense body copy.
- **Tertiary (`#133954`):** Petrol Teal. Acts as a supportive depth layer for active tabs, selected states, and secondary card containers.
- **Neutral Core:** Built around a warm alabaster foundation.
  - Surface Background: `#FAFAF8` (warm alabaster cream)
  - Card & Container Surface: `#FFFFFF`
  - Outline & Divider Border: `#EAE6E1` (soft parchment gray)
  - Text Primary: `#0F172A`
  - Text Secondary: `#526071`
  - Text Muted: `#94A3B8`

### Functional Semantics & Payment Systems
- **Success / Confirmed:** `#1B5E3B` (rich emerald forest; indicates confirmed bookings).
- **Attention / Pending:** `#B45309` (deep amber; indicates appointments pending stylist confirmation).
- **Error / Cancelled:** `#9F1239` (muted crimson; alerts for missed slots, expired sessions).
- **Payment Method Anchors:**
  - Nequi accent integration: `#3B1358` (deep plum used exclusively on payment provider badges).
  - PSE badge integration: `#0033A0` (institutional blue restricted to transaction selection chips).

## Typography

The typographical pairing relies on contrast between editorial beauty and transactional precision.

### Editorial Display Hierarchy (`Playfair Display`)
Used exclusively for top-level headers, hero banners, establishment showcase titles, and confirmation states. It elevates services beyond mere transactions into experiential rituals. Titles employ italic stylistic alternates sparingly for category designations (e.g., *Balayage*, *Barba Tradicional*, *Ritual Spa*).

### Functional System Hierarchy (`Manrope`)
Handles all user experience logistics: stylist calendars, time slot selectors, pricing, service durations, form labels, and payment breakdowns. `Manrope` guarantees high legibility at condensed sizes on handheld devices.

### Regional Currency Display (Colombian Peso - COP)
Colombian currency amounts must always display using tabular numeral figures (`tnum`) in `Manrope` to maintain vertical alignment within invoice reviews. Format figures with complete dot separators for thousands, omitting decimals unless explicitly representing banking cents (e.g., `$ 180.000 COP`).

## Layout & Spacing

The layout is structured around an adaptable 4-to-12 column fluid layout tuned for mobile booking agility and spacious desktop browsing.

### Breakpoints & Canvas Geometry
- **Mobile (< 640px):** 4 fluid columns with `margin: 1rem` (16px) and `gutter: 1rem` (16px). All booking pathways anchor tightly to the lower 60% of the viewport for comfortable one-thumb ergonomics.
- **Tablet (640px – 1024px):** 8 fluid columns with `margin-tablet: 2rem` (32px) and `gutter: 1.25rem` (20px). Suitable for side-by-side stylist selection and time grids.
- **Desktop (> 1024px):** 12 fluid columns, constrained to a maximum content container of `1280px` with `margin-desktop: 3rem` (48px) and `gutter-desktop: 1.5rem` (24px).

### Spacing Rules
Internal component padding relies strictly on geometric multiples of 4px. Compact interactive units (chips, payment selector tabs) adhere to `space-xs` (4px) and `space-sm` (8px). Service cards, appointment summaries, and modals use `space-md` (16px) through `space-lg` (24px) to preserve breathing room between rich imagery and service descriptions.

## Elevation & Depth

Visual hierarchy rejects harsh, generic drop shadows in favor of tinted, ambient surface diffusion combined with delicate parchment borders.

### Surface Tiers & Luminance
- **Base Canvas (`Level 0`):** `#FAFAF8`. Matte warm surface.
- **Resting Cards (`Level 1`):** Pure `#FFFFFF` resting on `#FAFAF8`, wrapped with a 1px border of `#EAE6E1` and an ambient shadow: `box-shadow: 0 4px 20px -2px rgba(13, 37, 56, 0.04)`.
- **Raised Hover / Active Selection (`Level 2`):** Pure `#FFFFFF` with a gold-kissed perimeter: `1px solid rgba(212, 175, 55, 0.4)` and a deeper ambient offset: `box-shadow: 0 8px 30px -4px rgba(13, 37, 56, 0.08)`.
- **Modals, Drawers & Bottom Sheets (`Level 3`):** `#FFFFFF` paired with an ultra-soft upper feather: `box-shadow: 0 -12px 40px 0 rgba(13, 37, 56, 0.12)`.
- **Floating CTA Bar (`Level 4`):** Fixed checkout drawer utilizing an atmospheric glass blur: `backdrop-filter: blur(12px)` over `rgba(255, 255, 255, 0.92)` with a subtle top border `rgba(13, 37, 56, 0.06)`.

## Shapes

The design system adopts a balanced rounded visual language (Level 2), where cards, controls, and sheets feel soft, welcoming, and ergonomically tactile without lapsing into playful, child-like pill forms.

### Corner Radii Guidelines
- **Base Radius (`0.5rem` / 8px):** Form input fields, dropdown trigger targets, calendar date blocks, and micro payment badges.
- **Large Radius (`1rem` / 16px):** Primary interactive buttons, service catalog cards, stylist avatar frames, and booking summary panels.
- **Extra Large Radius (`1.5rem` / 24px):** Bottom modal sheets (top corners only), sticky booking summary containers, and prominent salon profile hero banners.

## Components

### Buttons
- **Primary Action:** Solid petroleum background (`#0D2538`), text in white (`#FFFFFF`), `Manrope` 600 weight, 16px corner radius (`rounded-lg`), 48px standard touch height. Active feedback utilizes subtle scaling (0.985).
- **Secondary / Accent Action:** Transparent background with an internal 1.5px border of `#D4AF37`, text in `#0D2538`. Hover state fills with `rgba(212, 175, 55, 0.08)`.
- **Tertiary / Destructive:** Muted rose background (`#FFF1F2`), text in `#9F1239` for cancellation and reschedule actions.

### Chips & Filters
- **Category Filter Chips:** 36px height, rounded to 8px (`rounded-base`). Unselected chips use `#FFFFFF` background, `#526071` text, and `#EAE6E1` border. Selected chips invert to `#0D2538` background with `#FFFFFF` text.
- **Time Slot Selectors:** Grid-aligned rectangles with 8px radius. Unavailable slots are muted (`#F1F5F9`) with crossed slash indicators; selected slots feature `#0D2538` background and a `#D4AF37` dot indicator.

### Status Indicators
- **Confirmed (`Confirmada`):** `#ECFDF5` fill, `#065F46` label, small 6px `#059669` circular dot.
- **Pending Stylist (`Pendiente`):** `#FFFBEB` fill, `#92400E` label, circular pulse dot.
- **In-Progress / Service Underway (`En Servicio`):** `#EFF6FF` fill, `#1E40AF` label.

### Form Inputs & Selectors
- Standard inputs display a 48px height with a 1px border (`#EAE6E1`), using `#0F172A` text and `#94A3B8` placeholders.
- Focus state activates an outline tint in `#0D2538` with a 2px outer aura in `rgba(13, 37, 56, 0.1)`.
- Prefix indicators handle Colombian phone numbering format (+57) with an integrated mobile carrier or landline icon.

### Service & Stylist Cards
- Structured with an upper 16:9 ratio photography block (stylist workspace, barber cuts, aesthetic treatments) and a lower content compartment with 16px padding.
- Displays service duration (e.g., `45 min`), professional level (e.g., `Master Barber`), and right-aligned price formatted in COP (`$ 75.000`).

### Step Progress Indicator
- Horizontal 4-stage booking flow (`1. Servicio -> 2. Profesional -> 3. Horario -> 4. Pago`).
- Active steps display a solid `#0D2538` circle with a miniature gold checkmark or step number, connected by a 2px `#D4AF37` horizontal line. Inactive upcoming steps remain in soft gray (`#E2E8F0`).

### Payment Method Selector (Colombian Rails)
- Interactive selectable cards with distinct banking identifiers:
  - **Nequi:** Features the official Nequi badge, phone number input integration, and push-notification confirmation alerts.
  - **PSE:** Dropdown selector accommodating Colombian banking institutions (Bancolombia, Davivienda, Banco de Bogotá) with real-time redirect notices.
  - **Tarjetas:** Card brand recognition (Visa, Mastercard, American Express) with inline security encryption badges.