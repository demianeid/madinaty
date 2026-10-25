import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export interface LogAuditParams {
  actorUserId?: string | null;
  actorType?: "USER" | "SYSTEM" | "CRON" | "ADMIN_OVERRIDE";
  action: string;
  entityType: string;
  entityId: string;
  requestId?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Creates an immutable AuditLog entry.
 * Never logs passwords, tokens, API keys, or raw personal data.
 */
export async function logAuditEvent(params: LogAuditParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId ?? null,
        actorType: params.actorType ?? "USER",
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        requestId: params.requestId,
        metadata: params.metadata ?? Prisma.JsonNull,
      },
    });
  } catch (error) {
    // In production, fallback log to monitoring without failing the caller if outside transaction
    console.error("Failed to persist audit log entry:", error);
    return null;
  }
}
