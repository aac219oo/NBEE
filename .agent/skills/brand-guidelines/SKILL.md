---
name: brand-guidelines
description: Applies Heiso's official brand colors and typography to any sort of artifact that may benefit from having Heiso's look-and-feel. Use it when brand colors or style guidelines, visual formatting, or company design standards apply.
license: Complete terms in LICENSE.txt
---

# Heiso Brand Styling

## Overview

To access Heiso's official brand identity and style resources, use this skill.

**Keywords**: branding, corporate identity, visual identity, post-processing, styling, brand colors, typography, Heiso brand, visual formatting, visual design

## Brand Guidelines

### Colors

**Main Colors:**

- Dark (Slate 900): `#111111` - Primary text and dark backgrounds
- Light (Slate 0): `#fefefe` - Light backgrounds
- Neutral (Gray 600): `#999999` - Secondary text
- Subtle (Gray 100): `#fafafa` - Subtle backgrounds

**Accent Colors:**

- Primary (Amber 300): `#fcd34d` - Brand primary
- Secondary (Amber 500): `#f59e0b` - Brand secondary
- Danger (Error): `#ff4d4d` - Destructive/Error actions

### Typography

- **Headings**: Lato (with sans-serif fallback)
- **Body Text**: Lato (with sans-serif fallback)
- **Note**: Fonts are imported from Google Fonts

## Features

### Smart Font Application

- Applies Lato font to headings (24pt and larger)
- Applies Lato font to body text
- Automatically falls back to sans-serif if custom fonts unavailable
- Preserves readability across all systems

### Text Styling

- Headings (24pt+): Lato font
- Body text: Lato font
- Smart color selection based on background
- Preserves text hierarchy and formatting

### Shape and Accent Colors

- Non-text shapes use accent colors
- Cycles through orange, blue, and green accents
- Maintains visual interest while staying on-brand

## Technical Details

### Font Management

- Uses Google Fonts (Lato) for consistent rendering across platforms
- Provides automatic fallback to system sans-serif fonts
- No local font installation required for web artifacts
- For offline artifacts (e.g. PPTX), pre-install Lato for best results

### Color Application

- Uses RGB color values for precise brand matching
- Applied via python-pptx's RGBColor class
- Maintains color fidelity across different systems
