import { vi } from "vitest";
import { taskService } from "../taskService";
import { httpClient } from "@/lib/httpClient";
import { API_ENDPOINTS } from "@/config/api";

describe("taskService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds query string and normalizes tasks", async () => {
    const get = vi.spyOn(httpClient, "get").mockResolvedValue({
      success: true,
      page: 2,
      limit: 10,
      total: 1,
      totalPages: 1,
      tasks: [
        {
          _id: "t1",
          tenantId: "tenant-1",
          title: "Task A",
          status: "todo",
          priority: "high",
          dueDate: "2026-01-01T00:00:00.000Z",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    const page = await taskService.getTasks({
      page: 2,
      limit: 10,
      q: "  hello ",
      status: "todo",
      priority: "high",
      tenantId: "tenant-1",
    });

    expect(get).toHaveBeenCalledWith(
      `${API_ENDPOINTS.TASKS.LIST}?page=2&limit=10&q=hello&status=todo&priority=high&tenantId=tenant-1`,
    );
    expect(page.tasks[0].id).toBe("t1");
    expect(page.tasks[0].dueDate).toBeInstanceOf(Date);
  });
});

