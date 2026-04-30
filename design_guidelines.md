# TerracitoAppartments - Design Guidelines

## 1. Theme & Concept
- **Domain**: Luxury Vacation Rentals in Italy (Amalfi, Costa Smeralda, Puglia, etc.)
- **Theme**: Light, Bright, and Luminous.
- **Archetype**: Archetype 1 (Organic & Earthy) blended with the premium/cinematic execution of Archetype 5 (Jewel & Luxury).
- **Inspiration**: Mediterranean luxury, Italian seaside villa. Colors include cream, sand, terracotta, and soft olive.

## 2. Typography
**Font Imports**
```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Manrope:wght@300;400;500;600&display=swap');
```
- **Headings**: `Cormorant Garamond` (Elegant serif).
- **Body**: `Manrope` (Clean, highly readable sans-serif).

**Utility Classes Example**:
- **Hero H1**: `text-5xl sm:text-6xl tracking-tighter font-light font-serif`
- **Section H2**: `text-3xl sm:text-4xl tracking-tight font-serif text-foreground/90`
- **Body Text**: `text-base font-sans text-muted-foreground leading-relaxed`
- **Eyebrow / Overline**: `text-xs tracking-[0.2em] uppercase font-sans text-terracotta-600 font-medium`

## 3. Color Palette & CSS Variables (Tailwind v3)
Add these to `/app/frontend/src/index.css`:

```css
@layer base {
  :root {
    --background: 42 33% 96%; /* #F6F4F0 - Creamy Sand */
    --foreground: 222 25% 15%; /* #1E232B - Dark Navy/Charcoal */
    
    --card: 0 0% 100%; /* Pure White */
    --card-foreground: 222 25% 15%;
    
    --popover: 0 0% 100%;
    --popover-foreground: 222 25% 15%;
    
    --primary: 21 65% 55%; /* #D9734E - Terracotta */
    --primary-foreground: 0 0% 100%;
    
    --secondary: 65 14% 85%; /* Soft Olive / Sage gray */
    --secondary-foreground: 222 25% 15%;
    
    --muted: 42 20% 90%; /* Sand */
    --muted-foreground: 215 15% 45%; 
    
    --accent: 195 40% 85%; /* Sea blue touch */
    --accent-foreground: 222 25% 15%;
    
    --border: 42 20% 85%;
    --input: 42 20% 85%;
    --ring: 21 65% 55%;
    
    --radius: 0rem; /* Flat, elegant edges */
  }

  .dark {
    --background: 222 25% 15%;
    --foreground: 42 33% 96%;
    --card: 222 25% 12%;
    --card-foreground: 42 33% 96%;
    --popover: 222 25% 12%;
    --popover-foreground: 42 33% 96%;
    --primary: 21 65% 55%;
    --primary-foreground: 0 0% 100%;
    --secondary: 222 15% 25%;
    --secondary-foreground: 42 33% 96%;
    --muted: 222 15% 25%;
    --muted-foreground: 215 15% 70%;
    --accent: 222 15% 25%;
    --accent-foreground: 42 33% 96%;
    --border: 222 15% 25%;
    --input: 222 15% 25%;
    --ring: 21 65% 55%;
  }
}
```

## 4. Components & Layout Patterns

- **Navbar**: Sticky with `backdrop-blur-xl bg-background/70` and a thin `border-b border-border/40`. Elegant and crystal clear.
- **Hero Section**: Asymmetrical. Large lifestyle property image spanning multiple grid columns. Max overlay opacity `bg-black/30` or gradient to preserve the image beauty.
- **Property Cards**: Flat design (`rounded-none` or `rounded-sm`), thin 1px border. On hover: subtle image zoom (`group-hover:scale-105`) and slight card lift.
- **Buttons**:
  - Primary: `bg-primary text-primary-foreground hover:bg-terracotta-600 rounded-none px-8 py-4 font-sans tracking-wide transition-all shadow-sm`
  - Ghost: `hover:bg-sand-200 text-foreground rounded-none transition-all`
- **Inputs**: Minimalist. Use `border-b` or very thin full borders. Focus ring should be `focus:ring-1 focus:ring-primary`, avoiding thick bulky shadows.
- **Admin Dashboard**: Switch to pure white cards on sand background. Dense data tables, highly accessible. Uses Mode B "Control Room" bento grid.

## 5. Media Guidelines
Images must be cinematic, showcasing light and Mediterranean architecture.
DO NOT use placeholder dummy images. Use the generated assets from `design_guidelines.json`.

**Example Images Generated/Fetched**:
- Hero Villa: `https://static.prod-images.emergentagent.com/jobs/b1c98317-ff02-4c84-be87-7bd3f896d882/images/b6d8b78d89aa333e03f80eb452525333c980d414e31b32554da2d2bc1bd16242.png`
- Abstract Sand Texture: `https://static.prod-images.emergentagent.com/jobs/b1c98317-ff02-4c84-be87-7bd3f896d882/images/d02ad170e23e86fa7543d5038d3c73b1d5a795bd085f9185664e83ea1d8fb78c.png`
- Property Exterior: `https://images.pexels.com/photos/35438897/pexels-photo-35438897.jpeg`
- Property Interior: `https://images.pexels.com/photos/6782578/pexels-photo-6782578.jpeg`

## 6. Logo Recommendation
Wordmark **TerracitoAppartments** in `Cormorant Garamond` (font-semibold), with an optional minimalist line-art sun or terracotta arch to the left.

## 7. Testing
All interactive elements MUST include `data-testid` attributes (e.g., `data-testid="book-now-button"`).
