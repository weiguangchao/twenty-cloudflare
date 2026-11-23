# crm-ui

The internal React UI library for the CRM frontend: foundational primitives, shared components, icons, and theme tokens. It ships prebuilt CSS with CSS variables, so consumers do not need a CSS-in-JS compiler.

The code editor lives in `crm-ui/components/code-editor`. It needs the optional `@monaco-editor/react` and `monaco-editor` peers and Monaco workers configured for the bundler.

## Usage

For a standalone React application, import the base styles once, pick a theme stylesheet, and wrap your app in `ThemeProvider`:

```tsx
import { Field, Input } from 'crm-ui/primitives/input';
import { ThemeProvider } from 'crm-ui/theme';

import 'crm-ui/style.css';
import 'crm-ui/theme-light.css';

export const App = () => (
  <ThemeProvider colorScheme="light">
    <Field.Root>
      <Field.Label>Email</Field.Label>
      <Input name="email" type="email" placeholder="you@example.com" />
      <Field.Description>Use your work email address.</Field.Description>
    </Field.Root>
  </ThemeProvider>
);
```

The component stylesheet includes a global reset. Load it once at your application entry point.

Component styles and the reset use the `crm-ui` cascade layer. Unlayered application styles override those layered rules. Put application resets in an earlier layer.

## Entry points

Primitives provide foundational controls, including compound controls such as Select, Popover, and Dialog. Shared components compose them into presets such as `MainButton`, `LightButton`, `Dropdown`, and `Toaster`. Both layers receive data, labels, and callbacks from the application.

Prefer the matching public subpath for focused imports. The root entry point also re-exports primitives, shared components, icons, theme tokens, and utilities. Assets, testing helpers, the optional code editor, and the icon provider have separate entry points.

| Subpath                              | Contents                                                            |
| ------------------------------------ | ------------------------------------------------------------------- |
| `crm-ui/assets`                   | Logos and static assets                                             |
| `crm-ui/components`               | All shared component families except the optional editor            |
| `crm-ui/components/data-display`  | Avatar groups, command blocks, JSON trees, metrics, and icon tiles  |
| `crm-ui/components/feedback`      | Callouts, inline banners, and notifications                         |
| `crm-ui/components/input`         | Button presets, specialized inputs, pickers, and segmented controls |
| `crm-ui/components/layout`        | Sections, overflowing lists, and icon transitions                   |
| `crm-ui/components/navigation`    | Dropdowns, menu compositions, and tab actions                       |
| `crm-ui/components/settings`      | Settings rows with labeled controls                                 |
| `crm-ui/components/code-editor`   | Code editor, editor header, and editor theme helpers                |
| `crm-ui/icon`                     | Named icon components and icon types                                |
| `crm-ui/icon/provider`            | Icon provider, `useIcons`, and the by-name `Icon` component         |
| `crm-ui/primitives`               | All primitive families                                              |
| `crm-ui/primitives/accessibility` | Hidden elements and keyboard interaction helpers                    |
| `crm-ui/primitives/data-display`  | Avatars, badges, chips, tags, color samples, and status indicators  |
| `crm-ui/primitives/feedback`      | Banners, progress indicators, loaders, and skeletons                |
| `crm-ui/primitives/input`         | Buttons and form controls                                           |
| `crm-ui/primitives/layout`        | Expansion, separators, direction, and resizing                      |
| `crm-ui/primitives/navigation`    | Breadcrumbs, list items, and tabs                                   |
| `crm-ui/primitives/surfaces`      | Cards, dialogs, popovers, and tooltips                              |
| `crm-ui/primitives/typography`    | Text, headings, shortcuts, and overflowing text                     |
| `crm-ui/testing`                  | Storybook and test decorators and helpers                           |
| `crm-ui/theme`                    | Theme provider, hooks, types, and tokens                            |
| `crm-ui/utilities`                | Hooks and shared utilities                                          |

Import icons such as `IconCheck` from `crm-ui/icon`. Import `IconsProvider`, `useIcons`, and `Icon` from `crm-ui/icon/provider` only when icons need to be looked up by name at runtime: the provider loads the full catalog.

## Theming

- `crm-ui/style.css` ships the base reset and component styles. Import it once.
- `crm-ui/theme-light.css` and `crm-ui/theme-dark.css` define the design-token CSS variables for each color scheme. Load both when your application switches between schemes.
- `ThemeProvider` applies the `light` or `dark` class to the document root by default. Set `applyToRoot={false}` to scope a theme to a subtree; `overrides` optionally customizes public `--t-` CSS variables.
- Import `themeCssVariables` for CSS variable references, `useTheme()` for theme values, and `useThemeColorScheme()` for the active scheme, all from `crm-ui/theme`.
- The provider's `theme` prop supplies explicit JavaScript values, such as `THEME_LIGHT` or `THEME_DARK`, for consumers that cannot read computed styles. It does not replace the theme stylesheets.

See [docs/theme.md](docs/theme.md) for scoped overrides, portals, and explicit values.

## Responsive hooks

Import responsive hooks and media-query constants from `crm-ui/utilities`, `MOBILE_VIEWPORT` from `crm-ui/theme`, and story overrides from `crm-ui/testing`.

- `useIsMobile` matches `MOBILE_MEDIA_QUERY` (up to and including `MOBILE_VIEWPORT`). `useIsTouchDevice` matches `TOUCH_DEVICE_MEDIA_QUERY` and is independent of width: branch interaction behavior on it, and layout on `useIsMobile`.
- `useMediaQuery(query)` subscribes to native `matchMedia` changes and shares one `MediaQueryList` per query. It returns `false` during server rendering and the first hydration render, and wherever `window.matchMedia` is unavailable. In a front component, `matchMedia` answers for the widget's own box, so `useIsMobile` follows the widget width rather than the browser viewport, while `useIsTouchDevice` follows the primary input of the user's device.
- To force a result in a story, return `overrideMediaQueryMatches({ [MOBILE_MEDIA_QUERY]: true })` from `beforeEach`; the returned cleanup restores the native `matchMedia`.

## Development

Use the Node.js version in the repository's `.nvmrc` and the Yarn version in its root `package.json`. Run the following commands from the repository root:

```bash
yarn install
npx nx generateBarrels crm-ui
npx nx storybook:serve:dev crm-ui
```

Storybook runs at `http://localhost:6008`.

| Command                                                 | Purpose                                        |
| ------------------------------------------------------- | ---------------------------------------------- |
| `npx nx build crm-ui`                                | Build ESM, CommonJS, CSS, and TypeScript types |
| `npx nx lint crm-ui`                                 | Check lint and formatting                      |
| `npx tsgo -p packages/crm-ui/tsconfig.json --noEmit` | Check types directly, without the Nx cache     |
| `npx nx test crm-ui`                                 | Check module ownership and run unit tests      |
| `npx nx storybook:build crm-ui`                      | Build Storybook                                |
| `npx nx storybook:test crm-ui`                       | Run browser stories with coverage              |
| `npx nx test:package crm-ui`                         | Check optional dependencies and theme exports  |

Before running browser stories, install Chromium with `npx playwright install chromium` from `packages/crm-ui`.

### Source layout and generated files

Primitives live in `src/primitives/<family>`, shared components in `src/components/<family>`, and the optional editor in `src/components/code-editor`. Keep each component's types, stories, tests, and private parts beside its implementation. Components use SCSS modules and theme CSS variables.

Record formatting, routing, product illustrations, and feature-specific animation belong to the host application. Implementation parts in `internal` or `parts` directories are excluded from public barrels.

- Run `npx nx generateBarrels crm-ui` after changing public exports. Do not edit generated barrels by hand.
- Edit token sources in `design-tokens`, then run `npx nx generateTokens crm-ui`. Use `npx nx generate:check crm-ui` to check that generated token files are current.
- Run `npx nx check:ownership crm-ui` to validate exports, generated files, and dependency rules. After an intentional interface change, run `node --import tsx packages/crm-ui/scripts/checkModuleOwnership.ts --write` and review the two inventory files in `docs/`.

### Testing

Component interaction and behavior tests belong in Storybook stories (`*.stories.tsx`) using `play` functions. Component unit tests are reserved for conformance (native props, refs, class names, rendering, and prop types). Keep non-interactive utility, hook, and token tests in the Vitest unit project; avoid duplicating story coverage there.

```bash
npx vitest run --root packages/crm-ui --project unit <file>
npx vitest run --root packages/crm-ui --project storybook <file>
```

The unit project runs in jsdom. The Storybook project runs in headless Chromium through Playwright, including story interactions and accessibility checks. `npx nx storybook:test crm-ui` also runs the `reduced-motion` browser project for reduced-motion checks.

## License

crm-ui is released under the [MIT](LICENSE) license.
