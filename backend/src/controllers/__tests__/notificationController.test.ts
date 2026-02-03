import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification,
} from "../notificationController";
import Notification from "../../models/Notification";
import mongoose from "mongoose";

// Mocks
vi.mock("../../models/Notification", () => ({
  default: {
    countDocuments: vi.fn(),
    find: vi.fn(),
    markAsRead: vi.fn(),
    updateMany: vi.fn(),
    findOneAndDelete: vi.fn(),
    deleteMany: vi.fn(),
  },
}));
vi.mock("../../models/User");

// We keep real mongoose for Types.ObjectId if possible, 
// or simple mock if it causes issues. 
// For now, let's assume we can pass strings where ObjectId is expected 
// or the controller's use of new mongoose.Types.ObjectId won't break if we mock mongoose methods.

function createMockRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();
  return { res: { json, status } as any, json, status };
}

describe("notificationController", () => {
  const userId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getNotifications", () => {
    it("returns paginated notifications", async () => {
      const { res, json } = createMockRes();
      const req = {
        user: { userId },
        query: { page: "1", limit: "10" },
      } as any;

      const mockNotifications = [
        {
          _id: "n1",
          title: "Alert",
          taskId: "t1",
          triggeredBy: "u2",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (Notification.countDocuments as any).mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      // Chain: find().sort().skip().limit().populate().populate().exec()
      const populate2 = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockNotifications),
      });
      const populate1 = vi.fn().mockReturnValue({ populate: populate2 });
      const limitMock = vi.fn().mockReturnValue({ populate: populate1 });
      const skipMock = vi.fn().mockReturnValue({ limit: limitMock });
      const sortMock = vi.fn().mockReturnValue({ skip: skipMock });
      (Notification.find as any).mockReturnValue({ sort: sortMock });

      await getNotifications(req, res, vi.fn());

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 1,
          notifications: expect.arrayContaining([
            expect.objectContaining({ id: "n1" }),
          ]),
        })
      );
    });
  });

  describe("getUnreadCount", () => {
    it("returns count", async () => {
      const { res, json } = createMockRes();
      const req = { user: { userId } } as any;

      (Notification.countDocuments as any).mockResolvedValue(5);

      await getUnreadCount(req, res, vi.fn());

      expect(Notification.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ isRead: false })
      );
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ count: 5 })
      );
    });
  });

  describe("markAsRead", () => {
    it("validates input", async () => {
      const { res, status } = createMockRes();
      const req = { user: { userId }, body: {} } as any; // missing notificationIds

      await markAsRead(req, res, vi.fn());

      expect(status).toHaveBeenCalledWith(400);
    });

    it("calls static markAsRead", async () => {
      const { res, json } = createMockRes();
      const req = {
        user: { userId },
        body: { notificationIds: ["n1", "n2"] },
      } as any;

      (Notification.markAsRead as any).mockResolvedValue(2);

      await markAsRead(req, res, vi.fn());

      expect(Notification.markAsRead).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, count: 2 })
      );
    });
  });

  describe("deleteNotification", () => {
    it("returns 404 if not found", async () => {
      const { res, status } = createMockRes();
      const req = {
        user: { userId },
        params: { id: new mongoose.Types.ObjectId().toString() },
      } as any;

      (Notification.findOneAndDelete as any).mockResolvedValue(null);

      await deleteNotification(req, res, vi.fn());

      expect(status).toHaveBeenCalledWith(404);
    });

    it("deletes successfully", async () => {
      const { res, json } = createMockRes();
      const req = {
        user: { userId },
        params: { id: new mongoose.Types.ObjectId().toString() },
      } as any;

      (Notification.findOneAndDelete as any).mockResolvedValue({ _id: "n1" });

      await deleteNotification(req, res, vi.fn());

      expect(Notification.findOneAndDelete).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });
});
