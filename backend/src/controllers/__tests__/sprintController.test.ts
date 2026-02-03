import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  getSprints,
  getSprint,
  createSprint,
  updateSprint,
  deleteSprint,
} from "../sprintController";
import Sprint from "../../models/Sprint";
import Task from "../../models/Task";
import { isValidObjectId } from "../../utils/validators";

// Mocks
vi.mock("../../models/Sprint");
vi.mock("../../models/Task");
vi.mock("../../utils/validators");

function createMockRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();
  return { res: { json, status } as any, json, status };
}

describe("sprintController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isValidObjectId as any).mockReturnValue(true);
  });

  describe("getSprints", () => {
    it("returns sprints with task counts", async () => {
      const { res, json } = createMockRes();
      const req = {
        user: { role: "user", tenantId: "t1" },
      } as any;

      const mockSprints = [
        {
          _id: "s1",
          name: "S1",
          tenantId: "t1",
          createdBy: "u1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (Sprint.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockSprints),
        }),
      });
      (Task.countDocuments as any).mockResolvedValue(5);

      await getSprints(req, res, vi.fn());

      expect(Sprint.find).toHaveBeenCalledWith({ tenantId: "t1" });
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          sprints: expect.arrayContaining([
            expect.objectContaining({
              id: "s1",
              taskCount: 5,
            }),
          ]),
        })
      );
    });
  });

  describe("createSprint", () => {
    it("checks for permissions", async () => {
      const { res, status } = createMockRes();
      const req = {
        user: { role: "user", tenantId: "t1" },
        body: { name: "Sprint 1", startDate: "2023-01-01", endDate: "2023-01-14" },
      } as any;

      await createSprint(req, res, vi.fn());
      expect(status).toHaveBeenCalledWith(403);
    });

    it("validates dates", async () => {
      const { res, status, json } = createMockRes();
      const req = {
        user: { role: "tenantAdmin", tenantId: "t1" },
        body: {
          name: "Bad Dates",
          startDate: "2023-02-01",
          endDate: "2023-01-01", // End before start
        },
      } as any;

      await createSprint(req, res, vi.fn());

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "End date must be after start date" })
      );
    });

    it("creates sprint successfully", async () => {
      const { res, status, json } = createMockRes();
      const req = {
        user: { role: "tenantAdmin", tenantId: "t1", userId: "u1" },
        body: {
          name: "Good Sprint",
          startDate: "2023-01-01",
          endDate: "2023-01-14",
          status: "planned",
        },
      } as any;

      const saveMock = vi.fn();
      (Sprint as any).mockImplementation((data: any) => ({
        ...data,
        _id: "s-new",
        save: saveMock,
      }));

      await createSprint(req, res, vi.fn());

      expect(saveMock).toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(201);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          sprint: expect.objectContaining({ name: "Good Sprint" }),
        })
      );
    });
  });

  describe("deleteSprint", () => {
    it("unassigns tasks and deletes sprint", async () => {
      const { res, json } = createMockRes();
      const req = {
        params: { id: "s1" },
        user: { role: "tenantAdmin", tenantId: "t1" },
      } as any;

      const mockSprint = {
        _id: "s1",
        deleteOne: vi.fn(),
      };
      (Sprint.findOne as any).mockResolvedValue(mockSprint);
      (Task.updateMany as any).mockResolvedValue({});

      await deleteSprint(req, res, vi.fn());

      expect(Task.updateMany).toHaveBeenCalledWith(
        { sprintId: "s1" },
        { $set: { sprintId: null } }
      );
      expect(mockSprint.deleteOne).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: "Sprint deleted successfully" })
      );
    });
  });
});
