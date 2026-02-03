## Backend Unit Testing with Vitest

This document explains **how Vitest unit testing works in the backend** and how it is used in this project. If you read this file and the example tests, you should understand:

- What Vitest is doing
- How to test **pure logic**
- How to test **Express-style helpers**
- How to test a **controller/route handler** by mocking:
  - Mongoose models
  - External services (like `notificationService`)
  - Libraries (like `nodemailer`)

---

### 1. How to run backend tests

From `backend/`:

```bash
npm install   # first time only
npm test      # run all Vitest tests once
npm run test:watch   # watch mode
```

`package.json` key parts:

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  ...
},
"devDependencies": {
  "vitest": "^3.2.4",
  ...
}
```

So:

- Vitest is the test runner.
- Tests are written in `.test.ts` files under `src/**/__tests__/`.

---

### 2. Vitest configuration (big picture)

File: `vitest.config.ts`

- **environment: "node"** – Node environment (no browser).
- **include**: `["src/**/__tests__/**/*.test.ts"]` – test file pattern.
- **globals: true** – `describe`, `it`, `expect`, `vi` are available globally.
- **clearMocks: true** – mocks are cleared between tests.

You usually don’t touch this much; it just wires Vitest + TypeScript together.

---

### 3. Example 1 – Pure logic unit tests (`validators`)

Target file: `src/utils/validators.ts`  
Test file: `src/utils/__tests__/validators.test.ts`

These tests cover:

- `isValidEmail` – regex-based email check.
- `isValidPassword` – min length.
- `isValidTaskTitle` – non-empty, max length.
- `isValidTaskStatus` – allowed statuses only.
- `isValidObjectId` – 24-char hex IDs.
- `isValidName` – simple name rules.
- `sanitizeInput` – trims strings and enforces max length.

Patterns you see:

- Simple **input → output** tests.
- No database, no HTTP, no mocking – just function calls and `expect(...)`.

This is the simplest and most “pure” kind of unit test.

---

### 4. Example 2 – Express-style helpers (`errorUtils`)

Target file: `src/utils/errorUtils.ts`  
Test file: `src/utils/__tests__/errorUtils.test.ts`

Functions being tested:

- `ApiError` – custom error type with `status`.
- `successResponse(res, data, message?, status?)` – sends success JSON.
- `errorResponse(res, error, status?)` – sends error JSON.

Key idea: **mock the Express `res` object**.

In the test we build:

```ts
import { vi } from "vitest";

function createMockRes() {
  const json = vi.fn();
  const res = {
    status: vi.fn().mockReturnThis(),
    json,
  } as any;
  return { res, json };
}
```

Then we call:

- `successResponse(res, { data: { id: 1 } }, "Created", 201)`  
  and assert:
  - `res.status(201)` was called
  - `res.json(...)` had the correct payload.

- `errorResponse(res, new Error("Boom"))`  
  and assert that we return:
  - `status 500`
  - standardized `{ success: false, error: "Internal Server Error" }`.

- `errorResponse(res, new ApiError("Not found", 404))`  
  and assert it uses the **error’s own status/message**.

What you learn:

- How to test code that **wraps Express responses** without running a real server.

---

### 5. Example 3 – Service with external dependency (`emailService`)

Target file: `src/services/emailService.ts`  
Test file: `src/services/__tests__/emailService.test.ts`

Functions:

- `generateOTP` – returns a 6-digit numeric string.
- `sendEmail` – uses `nodemailer.createTransport().sendMail(...)`.
- `sendPasswordResetEmail` – builds HTML and calls `sendEmail`.

The interesting part: **mocking `nodemailer`**.

In the test:

```ts
import { vi } from "vitest";
import nodemailer from "nodemailer";

vi.mock("nodemailer", () => {
  const sendMail = vi.fn().mockResolvedValue({ messageId: "mock-id" });
  return {
    __esModule: true,
    default: {
      createTransport: vi.fn(() => ({
        sendMail,
      })),
    },
  };
});
```

Then:

- `generateOTP`:

  ```ts
  const otp = generateOTP();
  expect(otp).toHaveLength(6);
  expect(/^\d{6}$/.test(otp)).toBe(true);
  ```

- `sendEmail`:

  ```ts
  const transportInstance = (nodemailer as any).createTransport() as {
    sendMail: ReturnType<typeof vi.fn>;
  };

  await sendEmail({
    to: "user@example.com",
    subject: "Hello",
    html: "<p>Test</p>",
  });

  expect(transportInstance.sendMail).toHaveBeenCalledWith(
    expect.objectContaining({
      to: "user@example.com",
      subject: "Hello",
    }),
  );
  ```

- `sendPasswordResetEmail`:

  ```ts
  const transportInstance = (nodemailer as any).createTransport() as {
    sendMail: ReturnType<typeof vi.fn>;
  };
  transportInstance.sendMail.mockClear();

  const otp = "123456";
  await sendPasswordResetEmail("user@example.com", otp);

  expect(transportInstance.sendMail).toHaveBeenCalledWith(
    expect.objectContaining({
      to: "user@example.com",
      subject: "Password Reset OTP - TaskFlow",
    }),
  );
  const args = transportInstance.sendMail.mock.calls[0][0];
  expect(args.html).toContain(otp);
  ```

What you learn:

- How to **mock an external library** and assert your service calls it correctly.

---

### 6. Example 4 – Controller / route handler tests

Target file: `src/controllers/taskController.ts`  
Test file: `src/controllers/__tests__/taskController.test.ts`

Goals:

- Test a **controller function** without starting a server.
- Mock:
  - Mongoose `Task` model
  - `notificationService`
  - Validator functions
- Assert on:
  - HTTP status code and JSON body
  - Calls to `Task.findOne` and `notificationService.sendToUser`

#### 6.1. Mocks for this test file

At the top of the test file:

```ts
import { vi } from "vitest";

vi.mock("../../models/Task");
vi.mock("../../notification", () => ({
  notificationService: {
    sendToUser: vi.fn(),
  },
}));
vi.mock("../../utils/validators", () => ({
  isValidObjectId: vi.fn(() => true),
  isValidTaskStatus: vi.fn(() => ({ valid: true })),
  isValidTaskTitle: vi.fn(() => ({ valid: true })),
}));
```

Also, we reuse `createMockRes` for Express-style `res`:

```ts
function createMockRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();
  return { res: { json, status } as any, json, status };
}
```

#### 6.2. Controller test 1 – `getTask`

Two scenarios are tested:

1. **Invalid task ID**:

   - Force `isValidObjectId` to return `false`.
   - Call `getTask` with a bad `id`.
   - Expect `status(400)` and an appropriate error JSON.

2. **Successful fetch**:

   - Mock `Task.findOne` to return a fake task object.
   - Provide a user on the request (`req.user`) for access control.
   - Call `getTask`.
   - Assert:
     - `Task.findOne` was called with the correct filters.
     - JSON response has `success: true`, right message, and a mapped `task`.

Concepts:

- How controllers use **validators** and **Mongoose models**.
- How to simulate a request/response without Express.

#### 6.3. Controller test 2 – `updateTask` with notifications

Scenario: a **tenant admin** updates a task status to `"completed"` for another user; the assignee should be notified.

Steps in the test:

1. Mock validators (`isValidObjectId`, `isValidTaskStatus`) to always accept inputs.
2. Mock `Task.findOne` to return a fake `savedTask` object with:
   - `tenantId`, `userId`, `createdBy`
   - Methods like `save()` mocked with `vi.fn()`.
3. Build `req`:
   - `params.id` is the task ID.
   - `body.status = "completed"`.
   - `user` is a tenant admin (`tenantAdmin`) with a different `userId` than the assignee.
4. Call `updateTask(req, res, next)`.
5. Assert:
   - `isValidTaskStatus("completed")` was called.
   - `savedTask.save()` was called.
   - `notificationService.sendToUser` was called with:
     - `userId` of the assignee
     - `tenantId` of the task
     - `type: "task_completed"`
   - Response JSON indicates `"Task updated successfully"`.

What you learn:

- How controller logic checks and updates data.
- How side effects (notifications) are triggered.
- How to test **“if this happens, we send this notification”** without real DB or sockets.

---

### 7. Where to put new backend tests

- For utilities:  
  `src/utils/__tests__/someUtil.test.ts`

- For services:  
  `src/services/__tests__/someService.test.ts`

- For controllers:  
  `src/controllers/__tests__/someController.test.ts`

The general pattern is:

1. Import the unit under test (function, class, controller).
2. Mock:
   - Mongoose models (`vi.mock("../../models/Model")`)
   - External services (`notificationService`, `nodemailer`, etc.)
   - Helpers/validators as needed.
3. Create fake `req`, `res`, and `next`:
   - `req` is a plain object (`as any`) with only the fields you need.
   - `res` uses `vi.fn()`s for `status` and `json`.
   - `next` is usually `vi.fn()`.
4. Call the function.
5. Assert:
   - `res.status` / `res.json` calls.
   - Mongoose/static method calls (e.g., `Task.findOne`).
   - Service calls (e.g., `notificationService.sendToUser`).

Working through these examples will show you the **core Vitest unit testing patterns** used in a real Node + Express + MongoDB backend: pure logic, helpers, external services, and full controller logic with mocked dependencies.
