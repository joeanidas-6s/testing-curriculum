import React, { type PropsWithChildren } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

type Options = {
  route?: string;
  routerProps?: Omit<MemoryRouterProps, "children">;
  queryClient?: QueryClient;
} & Omit<RenderOptions, "wrapper">;

export function renderWithProviders(
  ui: React.ReactElement,
  { route = "/", routerProps, queryClient, ...renderOptions }: Options = {},
) {
  const client = queryClient ?? createTestQueryClient();

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[route]} {...routerProps}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  return { queryClient: client, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

