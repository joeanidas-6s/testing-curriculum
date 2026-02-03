import { getTask, updateTask } from "../taskController";
import Task from "../../models/Task";
import { notificationService } from "../../notification";
import {
  isValidObjectId,
  isValidTaskStatus,
  isValidTaskTitle,
} from "../../utils/validators";
import type { AuthenticatedRequest } from "../../middleware/auth";

jest.mock("../../models/Task");
jest.mock("../../notification", () => ({
  notificationService: {
    sendToUser: jest.fn(),
  },
}));
jest.mock("../../utils/validators", () => ({
  isValidObjectId: jest.fn(() => true),
  isValidTaskStatus: jest.fn(() => ({ valid: true })),
  isValidTaskTitle: jest.fn(() => ({ valid: true })),
}));

function createMockRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnThis();
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
    jest.clearAllMocks();
  });

  it("returns 400 for invalid task id", async () => {
    (isValidObjectId as jest.Mock).mockReturnValueOnce(false);
    const { res, status, json } = createMockRes();

    const req = {
      params: { id: "bad-id" },
      user: { role: "user", tenantId: "tenant-1", userId: "user-1" },
    } as unknown as AuthenticatedRequest;

    const next = jest.fn();

    await getTask(req, res, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: "Invalid task identifier",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns task when found", async () => {
    (isValidObjectId as jest.Mock).mockReturnValue(true);
    (Task.findOne as unknown as jest.Mock).mockResolvedValue(mockTask);

    const { res, json } = createMockRes();
    const req = {
      params: { id: mockTask._id },
      user: { role: "user", tenantId: "tenant-1", userId: "user-1" },
    } as unknown as AuthenticatedRequest;
    const next = jest.fn();

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
    jest.clearAllMocks();
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
      save: jest.fn().mockResolvedValue(undefined),
    };

    (isValidObjectId as jest.Mock).mockReturnValue(true);
    (isValidTaskStatus as jest.Mock).mockReturnValue({ valid: true });
    (Task.findOne as unknown as jest.Mock).mockResolvedValue(savedTask);

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
    const next = jest.fn();

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

