# Design Guidelines

Claude Workspace is a visual workspace UI for Claude Code agents. The design system ensures consistency, accessibility, and responsive behavior across desktop and mobile platforms.

## Design System Overview

The design system is built on three core foundations:

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **CSS Framework** | Tailwind CSS 4 | Utility-first styling with custom theme variables |
| **Component Primitives** | Radix UI | Accessible, unstyled components (Dialog, Dropdown, Tabs, etc.) |
| **UI Components** | shadcn/ui | Pre-built, composable components on top of Radix UI |

The CSS variables are defined in `src/app/globals.css` using OKLch color space for perceptually uniform colors across themes.

## Theme System

Claude Workspace supports multiple themes that respond to user preference and system settings.

### Available Themes

| Theme | Description | Use Case |
|-------|-------------|----------|
| **Light** | Bright, high-contrast design for daytime viewing | Default light mode |
| **Dark** | Dark background with warm syntax colors for reduced eye strain | Default dark mode |
| **VS Code Light** | Matches VS Code's light editor theme | Developer preference |
| **VS Code Dark** | Matches VS Code's dark editor theme | Developer preference |
| **Dracula** | Popular purple-themed dark mode | Developer preference |

### Theme Implementation

The theme provider is in `src/components/providers/theme-provider.tsx`:

```typescript
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange
/>
```

**How it works:**
- Reads system preference (light/dark) via `prefers-color-scheme`
- Applies `.dark` class to the `<html>` element for dark mode
- Theme-specific CSS variables defined in `:root` and `.dark` selectors

**CSS Variable Structure:**

All colors use OKLch format for consistency. Example from `globals.css`:

```css
:root {
  --background: oklch(1 0 0);           /* White */
  --foreground: oklch(0.145 0 0);       /* Near black */
  --primary: oklch(0.205 0 0);          /* Dark blue */
  --accent: oklch(0.85 0.02 250);       /* Subtle blue */
}

.dark {
  --background: oklch(0.145 0 0);       /* Near black */
  --foreground: oklch(0.93 0 0);        /* Light gray */
  --primary: oklch(0.85 0 0);           /* Light blue */
}
```

Syntax highlighting uses warm colors (yellow, orange, pink) for code visibility:

```css
.hljs-string { color: #f0c674; }          /* Warm yellow */
.hljs-keyword { color: #ff7b72; }         /* Warm pink */
.hljs-built_in { color: #ffa657; }        /* Warm orange */
```

## Layout Structure

Claude Workspace uses a responsive three-panel layout:

```
┌─────────────────────────────────────────┐
│       Header (Project, Settings)        │
├────────────┬──────────────────┬─────────┤
│  Sidebar   │  Kanban Board    │  Right  │
│ (Nav, Git) │  (Tasks, Cards)  │ Sidebar │
│            │                  │ (Chat)  │
├────────────┴──────────────────┴─────────┤
│        Footer / Status Bar              │
└─────────────────────────────────────────┘
```

### Layout Components

**Left Sidebar:**
- Project navigation
- Git status
- File explorer
- Settings access

**Main Canvas:**
- Kanban board with drag-and-drop
- Task cards with conversation history
- Code editor in tabs (CodeMirror)
- Detachable floating windows

**Right Sidebar:**
- Live Claude Code output
- Agent responses
- Questions requiring user input

**Header:**
- Project selector
- Theme switcher
- Language selector
- Quick actions

Floating windows (detachable editor, terminal, etc.) can be moved, resized, and positioned independently.

## Mobile Responsiveness

Mobile layout adapts at the **768px breakpoint** using Tailwind CSS media queries:

```typescript
const MOBILE_BREAKPOINT = 768;  // src/hooks/use-mobile-viewport.ts
```

### Mobile Adaptations

| Feature | Desktop (768px+) | Mobile (<768px) |
|---------|-----------------|-----------------|
| **Sidebar** | Fixed left panel | Hidden, overlay on tap |
| **Kanban** | Multi-column view | Single-column with status tabs |
| **Right Panel** | Fixed right sidebar | Bottom drawer or overlay |
| **Font Size** | System default | 16px (prevents iOS zoom) |
| **Touch Targets** | 40x40px minimum | 44x44px minimum |

### Mobile Touch Handlers

The `src/components/terminal/setup-terminal-mobile-touch-handlers.ts` implements:

- Vertical scroll with touch (prevents horizontal scroll trap)
- Pan-Y gesture support for terminal and kanban
- Proper overflow behavior for fixed elements

**Mobile-specific CSS from `globals.css`:**

```css
@media screen and (max-width: 767px) {
  /* Prevent iOS Safari zoom on input focus */
  input, textarea, select {
    font-size: 16px !important;
  }

  /* Ensure fixed elements respect viewport bounds */
  .fixed {
    max-width: 100vw !important;
    overflow-x: hidden !important;
  }
}
```

## Component Library

Claude Workspace uses shadcn/ui components for consistent UI patterns. All components are in `src/components/ui/`:

### Core Components

| Component | Based On | Use Case |
|-----------|----------|----------|
| `Button` | Radix | Actions, form submissions |
| `Card` | Radix | Container for grouped content |
| `Dialog` | Radix Dialog | Modal windows |
| `Dropdown Menu` | Radix DropdownMenu | Context menus, options |
| `Input` | Radix | Text input fields |
| `Textarea` | Radix | Multi-line text input |
| `Badge` | Radix | Labels, tags, status indicators |
| `Tabs` | Radix Tabs | Tabbed content navigation |
| `Scroll Area` | Radix ScrollArea | Custom-styled scrollable regions |
| `Toast` | Sonner | Notifications (top-right position) |
| `Tooltip` | Radix Tooltip | Help text on hover |
| `Label` | Radix | Form labels |
| `Checkbox` | Radix Checkbox | Boolean toggles |
| `Select` | Radix Select | Dropdown select menus |

### Specialized Components

- **`detachable-window.tsx`** — Floating, draggable windows with resize handles
- **`file-extension-icon.tsx`** — File type icons based on extension
- **`typewriter-text.tsx`** — Streaming text animation for agent output
- **`running-dots.tsx`** — Loading indicator animation

All components accept `className` for Tailwind CSS overrides.

## Accessibility (a11y)

Accessibility is built into the Radix UI primitives:

**Keyboard Navigation:**
- All interactive elements are keyboard-accessible
- Tab order follows logical DOM structure
- Focus is visible with ring style: `outline-ring/50`

**Semantic HTML:**
- Proper ARIA labels on buttons and links
- Form elements use `<label>` for screen reader context
- Landmark roles for major sections (header, main, aside)

**Color Contrast:**
- Text/background contrast >= 4.5:1 (WCAG AA)
- Colors are not sole visual indicator (icons, text also used)
- Colorblind-friendly palette in syntax highlighting

**Motion:**
- Theme transitions disabled: `disableTransitionOnChange`
- Respects `prefers-reduced-motion` media query where applied

## Color System

### CSS Variables

All colors are defined as CSS custom properties in `globals.css`:

**Base Palette:**

```css
--primary              /* Primary action color */
--primary-foreground   /* Text on primary background */
--secondary            /* Secondary UI color */
--secondary-foreground /* Text on secondary background */
--accent               /* Highlight/accent color */
--accent-foreground    /* Text on accent background */
--destructive          /* Danger/delete actions */
--muted                /* Disabled/secondary text areas */
--muted-foreground     /* Text on muted background */
--border               /* Border color */
--input                /* Form input background */
--ring                 /* Focus ring color */
--background           /* Page background */
--foreground           /* Page text */
--card                 /* Card/container background */
--card-foreground      /* Text on card */
--popover              /* Dropdown/popup background */
--popover-foreground   /* Text on popover */
```

**Sidebar Palette:**

```css
--sidebar
--sidebar-foreground
--sidebar-primary
--sidebar-primary-foreground
--sidebar-accent
--sidebar-accent-foreground
--sidebar-border
--sidebar-ring
```

**Chart Colors:**

```css
--chart-1 through --chart-5  /* Data visualization colors */
```

### Light Theme Values

Light theme uses bright backgrounds with dark text:

```css
:root {
  --background: oklch(1 0 0);            /* White */
  --foreground: oklch(0.145 0 0);        /* Near black */
  --primary: oklch(0.205 0 0);           /* Dark */
  --accent: oklch(0.85 0.02 250);        /* Muted blue */
}
```

### Dark Theme Values

Dark theme uses dark backgrounds with light text and reduced saturation:

```css
.dark {
  --background: oklch(0.145 0 0);        /* Near black */
  --foreground: oklch(0.93 0 0);         /* Light gray */
  --primary: oklch(0.85 0 0);            /* Light blue */
  --accent: oklch(0.45 0.08 250);        /* More saturated blue */
}
```

## Typography

Typography is configured via Geist fonts from Next.js:

| Font | Variable | Usage |
|------|----------|-------|
| **Geist Sans** | `--font-geist-sans` | Body text, UI labels |
| **Geist Mono** | `--font-geist-mono` | Code, terminal, fixed-width |

**Text Scaling:**

- Base size: system default (typically 16px on desktop)
- Prose content: 0.875rem (14px) for compact display
- Headings: scale from 1rem (h6) to 1.5rem (h1)

**Line Height:**

```css
body { line-height: 1.5; }          /* Normal text */
.prose { line-height: 1.6; }        /* Readable prose */
code { line-height: 1.4; }          /* Code blocks */
```

## Spacing & Border Radius

Tailwind spacing scale (0.25rem = 4px increments):

```css
--radius: 0.625rem;                 /* Base radius */
--radius-sm: calc(var(--radius) - 4px);
--radius-md: calc(var(--radius) - 2px);
--radius-lg: var(--radius);
--radius-xl: calc(var(--radius) + 4px);
```

Use these for:
- Buttons, inputs: `rounded-lg`
- Cards, panels: `rounded-lg` or `rounded-xl`
- Subtle elements: `rounded-sm`

## Custom Scrollbars

Custom scrollbars are styled per region:

**Standard scrollbar (`.custom-scrollbar`):**

```css
scrollbar-width: thin;
scrollbar-color: oklch(0.4 0 0 / 0.5);
```

**Kanban columns (`.kanban-scrollbar`):**

```css
scrollbar-width: thin;
scrollbar-color: oklch(0.5 0 0 / 0.12);  /* Very subtle */
```

The `::-webkit-scrollbar-*` pseudo-elements are styled for Chromium browsers.

## Animation

**Spinning border** (for running tasks):

```css
@keyframes spin-border {
  0%, 100% { border-color: hsl(var(--primary)); }
  50% { border-color: hsl(var(--primary) / 0.3); }
}
.animate-spin-border { animation: spin-border 2s linear infinite; }
```

**Glow animation** (for processing spinner):

```css
@keyframes glow-warm {
  0%, 100% { filter: drop-shadow(0 0 2px #b9664a); }
  50% { filter: drop-shadow(0 0 12px #b9664a); }
}
```

Transition time: 200-300ms for UI interactions.

## Diff View Styling

Code diffs use semantic coloring to show changes:

| State | Background | Border | Foreground |
|-------|-----------|--------|-----------|
| **Added** | `rgba(20, 184, 166, 0.2)` | `#2dd4bf` (teal) | Normal syntax colors |
| **Removed** | `rgba(218, 54, 51, 0.2)` | `#f85149` (red) | Slightly faded |

Syntax highlighting applies within diffs for readability.

## Naming Conventions

**CSS Classes:**
- Use kebab-case: `.kanban-scrollbar`, `.custom-scrollbar`
- Prefix utility patterns: `.animate-spin-border`, `.emoji-flag`

**Component Props:**
- Use camelCase: `className`, `onClick`, `disabled`
- Tailwind class overrides always via `className` prop

**CSS Variables:**
- Use kebab-case with `--` prefix: `--background`, `--sidebar-ring`
- Theme-specific overrides in `:root` and `.dark`

## Implementation Best Practices

**1. Use CSS variables for colors:**

```typescript
/* Good */
<div className="bg-background text-foreground">
```

**2. Respect theme system:**

```typescript
/* Good — components inherently support light/dark */
<Button>Click me</Button>

/* Avoid — hardcoded colors */
<Button style={{ backgroundColor: '#fff' }}>
```

**3. Mobile-first with tailwind breakpoints:**

```typescript
/* Good */
<div className="flex flex-col md:flex-row">

/* Avoid — media queries in CSS */
@media (min-width: 768px) { /* ... */ }
```

**4. Accessibility first:**

```typescript
/* Good */
<button
  aria-label="Close dialog"
  className="p-2 hover:bg-muted"
>
  X
</button>

/* Avoid — unlabeled icon buttons */
<button>✕</button>
```

## Reference Files

- **Design tokens:** `src/app/globals.css` (CSS variables, theme definitions)
- **Theme provider:** `src/components/providers/theme-provider.tsx`
- **Component library:** `src/components/ui/*.tsx`
- **Mobile detection:** `src/hooks/use-mobile-viewport.ts`
- **Layout components:** `src/components/` (sidebar, header, kanban, right-sidebar)
- **Tailwind config:** `tailwind.config.ts`

## External Resources

- [Tailwind CSS 4 Docs](https://tailwindcss.com)
- [Radix UI Docs](https://www.radix-ui.com)
- [shadcn/ui Components](https://ui.shadcn.com)
- [OKLch Color Space](https://oklch.com)
