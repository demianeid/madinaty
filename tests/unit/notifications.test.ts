import { describe, it, expect, vi } from "vitest";
import {
  createNotification,
  listUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  notifyStaffAndAdmins,
  type NotificationType,
} from "@/lib/notifications/service";
import { prisma } from "@/lib/db/prisma";

describe("In-App Notification Center Service Tests (Phase 4)", () => {
  it("creates notification with IN_APP delivery record in transaction", async () => {
    const mockTx = {
      notification: {
        create: vi.fn().mockResolvedValue({
          id: "notif_123",
          userId: "user_abc",
          reportId: "rep_xyz",
          type: "REPORT_CREATED" as NotificationType,
          title: "تم استلام بلاغك بنجاح #MD-2026-0001",
          body: "تم تسجيل البلاغ بنجاح",
          readAt: null,
          createdAt: new Date(),
        }),
      },
    };

    const result = await createNotification(
      {
        userId: "user_abc",
        reportId: "rep_xyz",
        type: "REPORT_CREATED",
        title: "تم استلام بلاغك بنجاح #MD-2026-0001",
        body: "تم تسجيل البلاغ بنجاح",
      },
      mockTx as unknown as typeof prisma
    );

    expect(mockTx.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "user_abc",
        reportId: "rep_xyz",
        type: "REPORT_CREATED",
        title: "تم استلام بلاغك بنجاح #MD-2026-0001",
        body: "تم تسجيل البلاغ بنجاح",
        deliveries: {
          create: {
            channel: "IN_APP",
            status: "SENT",
            sentAt: expect.any(Date),
            attemptCount: 1,
          },
        },
      },
      include: {
        report: {
          select: {
            id: true,
            publicReference: true,
            title: true,
            status: true,
          },
        },
      },
    });

    expect(result.id).toBe("notif_123");
    expect(result.type).toBe("REPORT_CREATED");
  });

  it("lists paginated notifications with unread count", async () => {
    const originalFindMany = prisma.notification.findMany;
    const originalCount = prisma.notification.count;

    const mockNotifications = [
      {
        id: "notif_1",
        userId: "user_1",
        title: "تحديث على البلاغ",
        body: "جاري العمل على الإصلاح",
        readAt: null,
        createdAt: new Date(),
        report: {
          id: "rep_1",
          publicReference: "MD-2026-0001",
          title: "حفرة بالشارع",
          status: "IN_PROGRESS",
        },
      },
    ];

    prisma.notification.findMany = vi.fn().mockResolvedValue(mockNotifications);
    prisma.notification.count = vi
      .fn()
      .mockResolvedValueOnce(1) // totalCount
      .mockResolvedValueOnce(1); // unreadCount

    try {
      const res = await listUserNotifications("user_1", { limit: 10, offset: 0 });

      expect(res.items).toHaveLength(1);
      expect(res.totalCount).toBe(1);
      expect(res.unreadCount).toBe(1);
      expect(res.items[0].id).toBe("notif_1");
    } finally {
      prisma.notification.findMany = originalFindMany;
      prisma.notification.count = originalCount;
    }
  });

  it("fetches unread notification count accurately", async () => {
    const originalCount = prisma.notification.count;
    prisma.notification.count = vi.fn().mockResolvedValue(3);

    try {
      const count = await getUnreadNotificationCount("user_1");
      expect(count).toBe(3);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: {
          userId: "user_1",
          readAt: null,
        },
      });
    } finally {
      prisma.notification.count = originalCount;
    }
  });

  it("marks single notification as read scoped to user", async () => {
    const originalUpdateMany = prisma.notification.updateMany;
    prisma.notification.updateMany = vi.fn().mockResolvedValue({ count: 1 });

    try {
      await markNotificationAsRead("user_1", "notif_123");

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: "notif_123",
          userId: "user_1",
          readAt: null,
        },
        data: {
          readAt: expect.any(Date),
        },
      });
    } finally {
      prisma.notification.updateMany = originalUpdateMany;
    }
  });

  it("marks all unread notifications as read for user", async () => {
    const originalUpdateMany = prisma.notification.updateMany;
    prisma.notification.updateMany = vi.fn().mockResolvedValue({ count: 5 });

    try {
      await markAllNotificationsAsRead("user_1");

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: "user_1",
          readAt: null,
        },
        data: {
          readAt: expect.any(Date),
        },
      });
    } finally {
      prisma.notification.updateMany = originalUpdateMany;
    }
  });

  it("broadcasts notifications to active staff and admins", async () => {
    const mockTx = {
      user: {
        findMany: vi.fn().mockResolvedValue([
          { id: "staff_1" },
          { id: "admin_1" },
        ]),
      },
      notification: {
        create: vi.fn().mockResolvedValue({ id: "notif_ops" }),
      },
    };

    const result = await notifyStaffAndAdmins(
      {
        reportId: "rep_999",
        type: "REPORT_CREATED",
        title: "بلاغ وارد جديد #MDN-1001",
        body: "ورد بلاغ جديد في قطاع الإنارة",
        excludeUserId: "citizen_1",
      },
      mockTx as unknown as typeof prisma
    );

    expect(mockTx.user.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { role: "ADMIN" },
          {
            role: "STAFF",
            memberships: {
              some: {
                isActive: true,
              },
            },
          },
        ],
        status: "ACTIVE",
        deletedAt: null,
        id: { not: "citizen_1" },
      },
      select: { id: true },
    });

    expect(mockTx.notification.create).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });
});

