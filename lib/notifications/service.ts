import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export type NotificationType =
  | "REPORT_CREATED"
  | "STATUS_CHANGED"
  | "INFO_REQUESTED"
  | "INFO_PROVIDED"
  | "REPORT_RESOLVED"
  | "REPORT_REJECTED"
  | "APPEAL_SUBMITTED"
  | "AUTO_CLOSED";

export interface CreateNotificationInput {
  userId: string;
  reportId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
}

/**
 * Creates an in-app notification for a user, optionally within a Prisma transaction.
 */
export async function createNotification(
  input: CreateNotificationInput,
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
  return client.notification.create({
    data: {
      userId: input.userId,
      reportId: input.reportId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      deliveries: {
        create: {
          channel: "IN_APP",
          status: "SENT",
          sentAt: new Date(),
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
}

/**
 * Retrieves a paginated list of notifications for a specific user.
 */
export async function listUserNotifications(
  userId: string,
  options?: { limit?: number; offset?: number; unreadOnly?: boolean }
) {
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 50);
  const offset = Math.max(options?.offset ?? 0, 0);
  const where: Prisma.NotificationWhereInput = {
    userId,
    ...(options?.unreadOnly ? { readAt: null } : {}),
  };

  const [items, totalCount, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
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
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return {
    items,
    totalCount,
    unreadCount,
    limit,
    offset,
  };
}

/**
 * Gets the number of unread in-app notifications for a user.
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}

/**
 * Marks a single notification as read if it belongs to the given user.
 */
export async function markNotificationAsRead(userId: string, notificationId: string) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}

/**
 * Marks all unread notifications for a user as read.
 */
export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}

