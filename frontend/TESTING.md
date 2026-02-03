## Frontend Unit Testing with Jest

This document explains **how Jest-based unit testing works in this frontend**, and how to read/write tests so you understand what Jest is doing in a real Vite + React + TypeScript project.

---

### 1. What Jest is used for here

- **Jest** is the test runner and assertion library.
- **React Testing Library** (`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`) is used to:
  - Render components in a realistic way
  - Interact with them like a user (clicks, typing)
  - Assert on what appears in the DOM
- **ts-jest** compiles TypeScript test files for Jest.

You use Jest to test:

- Small UI components (`Loader`, `ErrorMessage`, `Navbar`)
- Routing and auth guards (`ProtectedRoute`)
- State and stores (`authStore`)
- HTTP client + service layer (`httpClient`, `authService`, `taskService`)

---

### 2. How to run tests

From `frontend/`:

```bash
npm test            # run all tests once
npm run test:watch  # watch mode
npm run test:ci     # serial mode for CI
```

`package.json` scripts:

```json
"scripts": {
  "test": "NODE_OPTIONS=--experimental-vm-modules jest",
  "test:watch": "NODE_OPTIONS=--experimental-vm-modules jest --watch",
  "test:ci": "NODE_OPTIONS=--experimental-vm-modules jest --runInBand"
}
```

Because this project is ESM + Vite, Jest is run with `NODE_OPTIONS=--experimental-vm-modules` and a special config.

---

### 3. Jest configuration (high level)

File: `jest.config.cjs`

- Uses `ts-jest` ESM preset:
  - Compiles `.ts`/`.tsx` files for Jest
  - Respects `tsconfig.jest.json`
- Test environment: **`jsdom`** (browser-like environment for React).
- `setupFilesAfterEnv`: runs `src/test/setupTests.ts` before each test.
- `moduleNameMapper`:
  - Resolves `@/` to `src/` (same alias as Vite)
  - Mocks CSS and static assets so imports don’t crash tests.

You don’t usually edit this once it works; you just use it.

---

### 4. TypeScript config for tests

File: `tsconfig.jest.json`

- Extends the main app config.
- Adds types:
  - `jest`
  - `@testing-library/jest-dom`
  - `node`
- Enables `esModuleInterop` and `allowSyntheticDefaultImports` for smooth imports.

This makes TypeScript understand Jest globals and React types in test files.

---

### 5. Global test setup

File: `src/test/setupTests.ts`

What it does:

- Imports `@testing-library/jest-dom` to extend Jest matchers (e.g. `toBeInTheDocument`).
- Adds `window.matchMedia` so libraries that read it don’t break.
- Adds `TextEncoder` / `TextDecoder` polyfills for React Router and other libs.
- Provides a default `fetch` implementation that throws with a clear message if you forgot to mock it in a test.

This runs automatically before each test file.

---

### 6. Shared render helper: `renderWithProviders`

File: `src/test/utils/renderWithProviders.tsx`

Purpose: avoid re-writing boilerplate (router + React Query) in every test.

It:

- Creates a **test `QueryClient`** with retries disabled.
- Wraps `children` in:
  - `QueryClientProvider`
  - `MemoryRouter` (so you can test routing)

Usage:

```ts
import { renderWithProviders } from "@/test/utils/renderWithProviders";

renderWithProviders(<MyComponent />, { route: "/some-path" });
```

This is how component tests in this project run with the same providers as the real app.

---

### 7. Example: simple component test (`Loader`)

File: `src/components/common/__tests__/Loader.test.tsx`

Concepts:

- Render a component with Testing Library.
- Assert text and classes in the DOM.

Key patterns used:

- `render(<Loader />)` – draw the component.
- `screen.getByText("Loading...")` – query DOM by text.
- `expect(...).toBeInTheDocument()` – Jest DOM matcher.

What you learn:

- Basic structure of a React unit test.
- How to test default props and variants (`fullScreen` vs not).

---

### 8. Example: routing + auth guard (`ProtectedRoute`)

File: `src/components/features/auth/__tests__/ProtectedRoute.test.tsx`

Concepts:

- Testing **protected routes**.
- Mocking **`fetch`** to simulate backend `/auth/me`.
- Using `MemoryRouter` + `<Routes>` to check redirects.

Key ideas:

- Use `useAuthStore.setState(...)` to set the auth state.
- Use `renderWithProviders(<AppRoutes />, { route: "/protected" })`.
- Scenario tests:
  - No token → redirected to `/login`.
  - Valid token → `/auth/me` returns a user → children render.
  - Invalid token → `/auth/me` returns 401 → redirect to `/login`.

What you learn:

- How to write tests that **span routing and auth logic** without a browser.
- How to mock `fetch` safely in Jest.

---

### 9. Example: state store & services

**Zustand store (`authStore`)**

File: `src/store/__tests__/authStore.test.ts`

- Tests `login`:
  - Writes token into `localStorage`.
  - Updates `user`, `token`, `isAuthenticated`.
- Tests `logout`:
  - Clears token from `localStorage`.
  - Resets state.

Concepts:

- Using store `.getState()` and `.setState()` directly.
- Asserting state transitions and side effects.

**HTTP client (`httpClient`)**

File: `src/lib/__tests__/httpClient.test.ts`

- Mocks `global.fetch` to a local helper that returns JSON.
- Tests:
  - Auth header is added when required.
  - `skipAuth: true` bypasses auth.
  - Missing token throws `UnauthorizedError`.

Concepts:

- How to test a **wrapper** around `fetch`.
- How to distinguish between authenticated and public requests.

**API services (`authService`, `taskService`)**

Files:

- `src/services/api/__tests__/authService.test.ts`
- `src/services/api/__tests__/taskService.test.ts`

They:

- Mock `httpClient.post` / `httpClient.get`.
- Verify:
  - Correct endpoints and payloads are used.
  - Tokens are stored in `localStorage` (auth).
  - Query strings are built correctly (tasks).
  - Raw API data is normalized into app-friendly types (`Task`).

What you learn:

- How to isolate and test the **service layer** without hitting the network.

---

### 10. Where to put new frontend tests

- Co-locate with code, inside a `__tests__` folder or next to the file:
  - `src/components/Feature/Thing.test.tsx`
  - or `src/components/Feature/__tests__/Thing.test.tsx`
- Follow the same patterns:
  - Use `renderWithProviders` for routed/components needing providers.
  - Mock `fetch` / services when needed.
  - Assert on **behavior and DOM**, not implementation details or CSS classes.

If you work through the existing tests, you’ll see **all the main Jest patterns** applied to a real React + Vite app: rendering, routing, state, services, and mocking. This is enough to understand what Jest-based unit testing means in this frontend and how to extend it. 

