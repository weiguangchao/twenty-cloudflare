# twenty-ui

The internal React UI library for the CRM frontend: foundational primitives, shared components, icons, and theme tokens. It ships prebuilt CSS with CSS variables, so consumers do not need a CSS-in-JS compiler.

The code editor lives in `twenty-ui/components/code-editor`. It needs the optional `@monaco-editor/react` and `monaco-editor` peers and Monaco workers configured for the bundler.

## Usage

For a standalone React application, import the base styles once, pick a theme stylesheet, and wrap your app in `ThemeProvider`:

```tsx
import { Field, Input } from 'twenty-ui/primitives/input';
import { ThemeProvider } from 'twenty-ui/theme';

import 'twenty-ui/style.css';
import 'twenty-ui/theme-light.css';

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

Component styles and the reset use the `twenty-ui` cascade layer. Unlayered application styles override those layered rules. Put application resets in an earlier layer.

## Entry points

Primitives provide foundational controls, including compound controls such as Select, Popover, and Dialog. Shared components compose them into presets such as `MainButton`, `LightButton`, `Dropdown`, and `Toaster`. Both layers receive data, labels, and callbacks from the application.

Prefer the matching public subpath for focused imports. The root entry point also re-exports primitives, shared components, icons, theme tokens, and utilities. Assets, testing helpers, the optional code editor, and the icon provider have separate entry points.

| Subpath                              | Contents                                                            |
| ------------------------------------ | ------------------------------------------------------------------- |
| `twenty-ui/assets`                   | Logos and static assets                                             |
| `twenty-ui/components`               | All shared component families except the optional editor            |
| `twenty-ui/components/data-display`  | Avatar groups, command blocks, JSON trees, metrics, and icon tiles  |
| `twenty-ui/components/feedback`      | Callouts, inline banners, and notifications                         |
| `twenty-ui/components/input`         | Button presets, specialized inputs, pickers, and segmented controls |
| `twenty-ui/components/layout`        | Sections, overflowing lists, and icon transitions                   |
| `twenty-ui/components/navigation`    | Dropdowns, menu compositions, and tab actions                       |
| `twenty-ui/components/settings`      | Settings rows with labeled controls                                 |
| `twenty-ui/components/code-editor`   | Code editor, editor header, and editor theme helpers                |
| `twenty-ui/icon`                     | Named icon components and icon types                                |
| `twenty-ui/icon/provider`            | Icon provider, `useIcons`, and the by-name `Icon` component         |
| `twenty-ui/primitives`               | All primitive families                                              |
| `twenty-ui/primitives/accessibility` | Hidden elements and keyboard interaction helpers                    |
| `twenty-ui/primitives/data-display`  | Avatars, badges, chips, tags, color samples, and status indicators  |
| `twenty-ui/primitives/feedback`      | Banners, progress indicators, loaders, and skeletons                |
| `twenty-ui/primitives/input`         | Buttons and form controls                                           |
| `twenty-ui/primitives/layout`        | Expansion, separators, direction, and resizing                      |
| `twenty-ui/primitives/navigation`    | Breadcrumbs, list items, and tabs                                   |
| `twenty-ui/primitives/surfaces`      | Cards, dialogs, popovers, and tooltips                              |
| `twenty-ui/primitives/typography`    | Text, headings, shortcuts, and overflowing text                     |
| `twenty-ui/testing`                  | Storybook and test decorators and helpers                           |
| `twenty-ui/theme`                    | Theme provider, hooks, types, and tokens                            |
| `twenty-ui/utilities`                | Hooks and shared utilities                                          |

Import icons such as `IconCheck` from `twenty-ui/icon`. Import `IconsProvider`, `useIcons`, and `Icon` from `twenty-ui/icon/provider` only when icons need to be looked up by name at runtime: the provider loads the full catalog.

## Theming

- `twenty-ui/style.css` ships the base reset and component styles. Import it once.
- `twenty-ui/theme-light.css` and `twenty-ui/theme-dark.css` define the design-token CSS variables for each color scheme. Load both when your application switches between schemes.
- `ThemeProvider` applies the `light` or `dark` class to the document root by default. Set `applyToRoot={false}` to scope a theme to a subtree; `overrides` optionally customizes public `--t-` CSS variables.
- Import `themeCssVariables` for CSS variable references, `useTheme()` for theme values, and `useThemeColorScheme()` for the active scheme, all from `twenty-ui/theme`.
- The provider's `theme` prop supplies explicit JavaScript values, such as `THEME_LIGHT` or `THEME_DARK`, for consumers that cannot read computed styles. It does not replace the theme stylesheets.

See [docs/theme.md](docs/theme.md) for scoped overrides, portals, and explicit values.

## Responsive hooks

Import responsive hooks and media-query constants from `twenty-ui/utilities`, `MOBILE_VIEWPORT` from `twenty-ui/theme`, and story overrides from `twenty-ui/testing`.

- `useIsMobile` matches `MOBILE_MEDIA_QUERY` (up to and including `MOBILE_VIEWPORT`). `useIsTouchDevice` matches `TOUCH_DEVICE_MEDIA_QUERY` and is independent of width: branch interaction behavior on it, and layout on `useIsMobile`.
- `useMediaQuery(query)` subscribes to native `matchMedia` changes and shares one `MediaQueryList` per query. It returns `false` during server rendering and the first hydration render, and wherever `window.matchMedia` is unavailable. In a front component, `matchMedia` answers for the widget's own box, so `useIsMobile` follows the widget width rather than the browser viewport, while `useIsTouchDevice` follows the primary input of the user's device.
- To force a result in a story, return `overrideMediaQueryMatches({ [MOBILE_MEDIA_QUERY]: true })` from `beforeEach`; the returned cleanup restores the native `matchMedia`.

## Development

Use the Node.js version in the repository's `.nvmrc` and the Yarn version in its root `package.json`. Run the following commands from the repository root:

```bash
yarn install
npx nx generateBarrels twenty-ui
npx nx storybook:serve:dev twenty-ui
```

Storybook runs at `http://localhost:6008`.

| Command                                                 | Purpose                                        |
| ------------------------------------------------------- | ---------------------------------------------- |
| `npx nx build twenty-ui`                                | Build ESM, CommonJS, CSS, and TypeScript types |
| `npx nx lint twenty-ui`                                 | Check lint and formatting                      |
| `npx tsgo -p packages/twenty-ui/tsconfig.json --noEmit` | Check types directly, without the Nx cache     |
| `npx nx test twenty-ui`                                 | Check module ownership and run unit tests      |
| `npx nx storybook:build twenty-ui`                      | Build Storybook                                |
| `npx nx storybook:test twenty-ui`                       | Run browser stories with coverage              |
| `npx nx test:package twenty-ui`                         | Check optional dependencies and theme exports  |

Before running browser stories, install Chromium with `npx playwright install chromium` from `packages/twenty-ui`.

### Source layout and generated files

Primitives live in `src/primitives/<family>`, shared components in `src/components/<family>`, and the optional editor in `src/components/code-editor`. Keep each component's types, stories, tests, and private parts beside its implementation. Components use SCSS modules and theme CSS variables.

Record formatting, routing, product illustrations, and feature-specific animation belong to the host application. Implementation parts in `internal` or `parts` directories are excluded from public barrels.

- Run `npx nx generateBarrels twenty-ui` after changing public exports. Do not edit generated barrels by hand.
- Edit token sources in `design-tokens`, then run `npx nx generateTokens twenty-ui`. Use `npx nx generate:check twenty-ui` to check that generated token files are current.
- Run `npx nx check:ownership twenty-ui` to validate exports, generated files, and dependency rules. After an intentional interface change, run `node --import tsx packages/twenty-ui/scripts/checkModuleOwnership.ts --write` and review the two inventory files in `docs/`.

### Testing

Component interaction and behavior tests belong in Storybook stories (`*.stories.tsx`) using `play` functions. Component unit tests are reserved for conformance (native props, refs, class names, rendering, and prop types). Keep non-interactive utility, hook, and token tests in the Vitest unit project; avoid duplicating story coverage there.

```bash
npx vitest run --root packages/twenty-ui --project unit <file>
npx vitest run --root packages/twenty-ui --project storybook <file>
```

The unit project runs in jsdom. The Storybook project runs in headless Chromium through Playwright, including story interactions and accessibility checks. `npx nx storybook:test twenty-ui` also runs the `reduced-motion` browser project for reduced-motion checks.

## License

twenty-ui is released under the [MIT](LICENSE) license.
