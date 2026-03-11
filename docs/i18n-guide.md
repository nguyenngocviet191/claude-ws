# Internationalization Guide

Claude Workspace supports 8 languages via next-intl framework. The system automatically detects user locale, persists preferences, and provides runtime language switching without page reload.

## Supported Languages

| Code | Name | Display | Flag |
|------|------|---------|------|
| `de` | Deutsch | German | 🇩🇪 |
| `en` | English | English | 🇺🇸 |
| `es` | Español | Spanish | 🇪🇸 |
| `fr` | Français | French | 🇫🇷 |
| `ja` | 日本語 | Japanese | 🇯🇵 |
| `ko` | 한국어 | Korean | 🇰🇷 |
| `vi` | Tiếng Việt | Vietnamese | 🇻🇳 |
| `zh` | 中文 | Chinese (Simplified) | 🇨🇳 |

---

## Architecture

### Configuration

**File:** `src/i18n/config.ts`

```typescript
export const locales = ['de', 'en', 'es', 'fr', 'ja', 'ko', 'vi', 'zh'] as const;
export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English',
  // ...
};

export const localeFlags: Record<Locale, string> = {
  de: '🇩🇪',
  en: '🇺🇸',
  // ...
};
```

**Requirements:**
- Always keep locale arrays **sorted alphabetically by code**
- Update all three places when adding languages

### Translation Files

**Location:** `locales/{code}.json`

Example structure:
```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "loading": "Loading"
  },
  "tasks": {
    "create": "Create task",
    "delete": "Delete task"
  },
  "errors": {
    "notFound": "Not found",
    "unauthorized": "Unauthorized"
  }
}
```

**Guidelines:**
- Use camelCase for keys
- Nest keys by feature/domain
- Keep values as short strings (avoid multi-line)
- Use variables for dynamic content

### Middleware: Locale Detection

**File:** `middleware.ts`

```typescript
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',        // No prefix for default locale
  localeDetection: true,             // Detect from Accept-Language
});
```

**Priority:**
1. URL prefix (e.g., `/fr/tasks`)
2. Stored localStorage preference
3. Accept-Language header
4. Default locale (English)

Routes:
- `/` → Detects user locale
- `/en/tasks` → English explicit
- `/ja/tasks` → Japanese explicit
- `/tasks` (in non-en context) → Redirects to locale prefix

### Zustand Persistence Store

**File:** `src/stores/locale-store.ts`

```typescript
interface LocaleStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;  // Switches language + persists
}

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set) => ({
      locale: defaultLocale,
      setLocale: (locale: Locale) => {
        set({ locale });
        // Update URL path + reload
        window.location.reload();
      },
    }),
    {
      name: 'locale-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

**Note:** `setLocale()` triggers full page reload to apply middleware routing.

---

## Usage Patterns

### useTranslations Hook (Client)

```typescript
'use client';

import { useTranslations } from 'next-intl';

export function TaskList() {
  const t = useTranslations('tasks');

  return (
    <div>
      <h1>{t('title')}</h1>
      <button>{t('create')}</button>
    </div>
  );
}
```

**Namespace Resolution:**
```typescript
const t = useTranslations();           // Root translations
const t = useTranslations('tasks');    // tasks.* keys
const t = useTranslations('common');   // common.* keys
```

### Dynamic Keys

```typescript
const t = useTranslations();
const key = 'save';
const text = t(key);  // Resolves 'common.save'
```

### Pluralization & Formatting

```typescript
const t = useTranslations();

// Plurals: store as key.singular and key.plural
t('tasks.count', { count: 5 });  // "5 tasks"

// Dates
const date = new Date();
t('common.date', { date });  // Formatted per locale

// Numbers
t('common.price', { price: 99.99 });  // $99.99 or €99,99 etc.
```

### Fallback & Missing Keys

```typescript
const t = useTranslations();
const text = t('nonexistent', { defaultValue: 'Fallback text' });
```

### Server-Side (Layout, Metadata)

```typescript
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }) {
  const t = await getTranslations('metadata');
  return {
    title: t('tasks'),
    description: t('tasksDescription'),
  };
}
```

### Locale in Component

```typescript
'use client';

import { useLocale } from 'next-intl';

export function Component() {
  const locale = useLocale();  // 'en', 'ja', etc.

  return <div>Current: {locale}</div>;
}
```

### Language Switcher

```typescript
'use client';

import { useLocaleStore } from '@/stores/locale-store';
import { locales, localeNames, localeFlags } from '@/i18n/config';
import { useTranslations } from 'next-intl';

export function LanguageSwitcher() {
  const t = useTranslations('common');
  const { locale, setLocale } = useLocaleStore();

  return (
    <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
      {locales.map((code) => (
        <option key={code} value={code}>
          {localeFlags[code]} {localeNames[code]}
        </option>
      ))}
    </select>
  );
}
```

---

## Adding a New Language

### Step 1: Create Translation File

Create `locales/{code}.json` based on English template:

```bash
cp locales/en.json locales/de.json  # German example
```

Translate all keys.

### Step 2: Update Config

**File:** `src/i18n/config.ts`

```typescript
// Add locale code (keep alphabetically sorted)
export const locales = ['de', 'en', 'es', 'fr', 'ja', 'ko', 'vi', 'zh'] as const;

// Add locale name
export const localeNames: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English',
  // ... keep sorted
};

// Add flag emoji
export const localeFlags: Record<Locale, string> = {
  de: '🇩🇪',
  en: '🇺🇸',
  // ... keep sorted
};
```

### Step 3: Update Middleware Config

**File:** `middleware.ts`

next-intl reads `locales` array from config, no separate change needed.

### Step 4: Test

```bash
# Set user locale via Accept-Language header
curl -H "Accept-Language: de-DE" http://localhost:3000/

# Or use URL prefix
http://localhost:3000/de/tasks

# Or switch in UI (language switcher triggers reload)
```

### Step 5: Commit

```bash
git add locales/de.json src/i18n/config.ts
git commit -m "feat: add German (de) translation"
```

---

## Translation File Structure

Best practices for organizing keys:

```json
{
  "common": {
    "actions": {
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Delete"
    },
    "navigation": {
      "home": "Home",
      "settings": "Settings"
    },
    "status": {
      "loading": "Loading",
      "error": "Error"
    }
  },
  "tasks": {
    "title": "Tasks",
    "create": "Create task",
    "empty": "No tasks yet"
  },
  "attempts": {
    "title": "Attempts",
    "running": "Running...",
    "completed": "Completed"
  }
}
```

**Naming Conventions:**
- Use descriptive keys: `emptyTasksMessage` instead of `m1`
- Group by feature: `tasks.create`, `tasks.delete`
- Use dotted paths: `t('tasks.create')`
- Lowercase keys with camelCase

---

## Locale Detection Priority

When user first visits:

1. **URL Locale Prefix** (highest priority)
   - `/fr/tasks` → Force French
   - `/en/tasks` → Force English

2. **localStorage (from locale-store)**
   - User previously selected German → Persist German
   - Checked via middleware

3. **Accept-Language Header**
   - Browser header: `Accept-Language: ja-JP,ja;q=0.9,en;q=0.8`
   - Matches supported languages in order
   - Falls back to first match

4. **Default Locale** (lowest priority)
   - English (`en`) if all else fails

### Example: New User in Japan

1. Browser sends: `Accept-Language: ja-JP,ja;q=0.9`
2. Middleware finds `ja` in supported locales
3. Redirects to `/ja/` (or stays at `/` with Japanese context)
4. User's preference stored in localStorage
5. Future visits start in Japanese

---

## Common Patterns

### Conditional Rendering by Locale

```typescript
'use client';

import { useLocale } from 'next-intl';

export function Component() {
  const locale = useLocale();

  if (locale === 'ja') {
    // Japanese-specific UI or format
    return <JapaneseLayout />;
  }

  return <DefaultLayout />;
}
```

### Locale-Specific Formatting

```typescript
'use client';

import { useLocale } from 'next-intl';

export function Price({ amount }: { amount: number }) {
  const locale = useLocale();

  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  return <span>{formatted}</span>;
}
```

### Translation with Variables

**File:** `locales/en.json`
```json
{
  "tasks": {
    "deleteConfirm": "Delete task \"{title}\"? This cannot be undone."
  }
}
```

**Usage:**
```typescript
const t = useTranslations('tasks');
const message = t('deleteConfirm', { title: task.title });
```

### Nested Namespace

**File:** `locales/en.json`
```json
{
  "errors": {
    "validation": {
      "required": "This field is required",
      "email": "Invalid email address"
    }
  }
}
```

**Usage:**
```typescript
const t = useTranslations('errors.validation');
const msg = t('required');  // Resolves errors.validation.required
```

---

## Right-to-Left (RTL) Languages

Current setup supports LTR only. To add RTL (Arabic, Hebrew):

1. Create translation files: `ar.json`, `he.json`
2. Add locale codes to `config.ts`
3. Add RTL detection in layout:

```typescript
import { useLocale } from 'next-intl';

export function RootLayout({ children, params }) {
  const locale = useLocale();
  const isRTL = ['ar', 'he'].includes(locale);

  return (
    <html dir={isRTL ? 'rtl' : 'ltr'} lang={locale}>
      {children}
    </html>
  );
}
```

4. Add RTL CSS handling (Tailwind):
```css
[dir="rtl"] .component {
  direction: rtl;
  text-align: right;
}
```

---

## Maintenance

### Finding Untranslated Keys

```bash
# Use next-intl CLI to check
npm run i18n:validate

# Or manually compare
diff <(jq -S 'keys' locales/en.json) \
     <(jq -S 'keys' locales/ja.json)
```

### Updating All Languages

When adding new keys to English:

1. Add to `locales/en.json`
2. Add stub to all other language files
3. Request translations from maintainers
4. Test with fallback values

### Performance

- Translation files are bundled (kept small)
- next-intl caches compiled translations
- No runtime parsing (pre-compiled)

---

## Testing

### Test with Different Locales

```typescript
// jest.setup.ts
import { createTranslator } from 'next-intl';

test('renders Japanese task title', async () => {
  const t = createTranslator({
    locale: 'ja',
    namespace: 'tasks',
    messages: jaMessages,
  });

  expect(t('create')).toBe('タスクを作成');
});
```

### Locale Switcher Tests

```typescript
test('switches language without page reload', async () => {
  render(<LanguageSwitcher />);

  const select = screen.getByRole('combobox');
  fireEvent.change(select, { target: { value: 'ja' } });

  // Verify localStorage updated
  expect(localStorage.getItem('locale-storage')).toContain('ja');
});
```

---

## Troubleshooting

### Missing Translation Key

Error: `Key "tasks.unknown" not found`

**Solution:**
1. Check key exists in `locales/en.json`
2. Verify namespace in `useTranslations()` matches
3. Use `defaultValue` as fallback:
   ```typescript
   t('missingKey', { defaultValue: 'Fallback' })
   ```

### Language Not Switching

1. Check localStorage cleared: `localStorage.removeItem('locale-storage')`
2. Verify locale in URL: Browser address bar should update
3. Check browser Accept-Language header: DevTools Network tab

### Translation Not Applied

1. Verify file saved: `locales/{locale}.json`
2. Check build cache: `pnpm build --no-cache`
3. Clear `.next` folder: `rm -rf .next && pnpm build`

### Locale Prefix Breaking Links

Links should use `useRouter` from `next-intl`:

```typescript
import { useRouter } from 'next-intl/client';

export function Component() {
  const router = useRouter();

  return (
    <button onClick={() => router.push('/tasks')}>
      // Automatically prefixes with locale (/ja/tasks, /en/tasks, etc.)
    </button>
  );
}
```

---

## Files to Update When Adding Language

| File | Change |
|------|--------|
| `locales/{code}.json` | Create new translation file |
| `src/i18n/config.ts` | Add to `locales`, `localeNames`, `localeFlags` |
| `middleware.ts` | No change (reads config) |
| Language switcher component | No change (reads config) |
| Documentation | Update this file with new language |

---

## Resources

- **next-intl Docs:** https://next-intl-docs.vercel.app
- **Translation File Format:** JSON with arbitrary nesting
- **Browser Locale Detection:** Standard `Accept-Language` header
- **Pluralization:** Use library like `pluralize` or manual keys

---

## Examples by Language

### Adding German (de)

```bash
cp locales/en.json locales/de.json
# Edit locales/de.json with German translations
```

**Update config.ts:**
```typescript
export const locales = ['de', 'en', 'es', ...] as const;
export const localeNames = {
  de: 'Deutsch',
  en: 'English',
  ...
};
export const localeFlags = {
  de: '🇩🇪',
  en: '🇺🇸',
  ...
};
```

Visit `/de/tasks` to test.

### Language Switcher Display

```
🇩🇪 Deutsch
🇺🇸 English
🇪🇸 Español
🇫🇷 Français
🇯🇵 日本語
🇰🇷 한국어
🇻🇳 Tiếng Việt
🇨🇳 中文
```

---

## Best Practices

1. **Keep translations short** — Avoid multi-line text
2. **Use variables for dynamic content** — Don't concatenate strings
3. **Organize keys by feature** — Easy to find and update
4. **Test with long strings** — German words are longer than English
5. **Check right-to-left compatibility** — If planning to add RTL languages
6. **Keep locale arrays sorted** — Alphabetical order always
7. **Provide context in comments** — Help translators understand context
8. **Never hardcode strings** — Always use `useTranslations()`
