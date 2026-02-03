import { vi } from "vitest";
import { getTask, updateTask } from "../taskController";
import Task from "../../models/Task";
import { notificationService } from "../../notification";
import {
  isValidObjectId,
  isValidTaskStatus,
  isValidTaskTitle,
} from "../../utils/validators";
import type { AuthenticatedRequest } from "../../middleware/auth";

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

function createMockRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();
  return { res: { json, status } as any, json, status };
}

describe("taskController.getTask", () => {
  const mockTask = {
    _id: "507f1f77bcf86cd799439011",
    tenantId: "tenant-1",
    userId: "user-1",
    title: "Test task",
    description: "Desc",
    status: "todo",
    priority: "medium",
    sprintId: null,
    dueDate: null,
    attachments: [],
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid task id", async () => {
    (isValidObjectId as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    const { res, status, json } = createMockRes();

    const req = {
      params: { id: "bad-id" },
      user: { role: "user", tenantId: "tenant-1", userId: "user-1" },
    } as unknown as AuthenticatedRequest;

    const next = vi.fn();

    await getTask(req, res, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: "Invalid task identifier",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns task when found", async () => {
    (isValidObjectId as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (Task.findOne as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockTask);

    const { res, json } = createMockRes();
    const req = {
      params: { id: mockTask._id },
      user: { role: "user", tenantId: "tenant-1", userId: "user-1" },
    } as unknown as AuthenticatedRequest;
    const next = vi.fn();

    await getTask(req, res, next);

    expect(Task.findOne).toHaveBeenCalledWith({
      _id: mockTask._id,
      tenantId: "tenant-1",
      userId: "user-1",
    });
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Task fetched successfully",
        task: expect.objectContaining({
          id: mockTask._id,
          title: mockTask.title,
        }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});

describe("taskController.updateTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates status and sends notification to assignee when actor is different", async () => {
    const savedTask = {
      _id: "507f1f77bcf86cd799439012",
      tenantId: { toString: () => "tenant-1" },
      userId: { toString: () => "assignee-1" },
      createdBy: { toString: () => "creator-1" },
      title: "Task A",
      description: "Desc",
      status: "todo",
      priority: "medium",
      sprintId: null,
      dueDate: null,
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      save: vi.fn().mockResolvedValue(undefined),
    };

    (isValidObjectId as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (isValidTaskStatus as ReturnType<typeof vi.fn>).mockReturnValue({ valid: true });
    (Task.findOne as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(savedTask);

    const { res, json } = createMockRes();
    const req = {
      params: { id: savedTask._id },
      body: { status: "completed" },
      user: {
        role: "tenantAdmin",
        tenantId: "tenant-1",
        userId: "admin-1",
      },
    } as unknown as AuthenticatedRequest;
    const next = vi.fn();

    await updateTask(req, res, next);

    expect(isValidTaskStatus).toHaveBeenCalledWith("completed");
    expect(savedTask.save).toHaveBeenCalled();

    // Assignee notification (userId != actor.userId)
    expect(notificationService.sendToUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "assignee-1",
        tenantId: "tenant-1",
        type: "task_completed",
        taskId: savedTask._id.toString(),
      }),
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Task updated successfully",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});

