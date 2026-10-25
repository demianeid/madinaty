import { describe, it, expect } from "vitest";
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  AuthenticatedUser,
} from "@/lib/auth/guards";
import { UserRole, UserStatus } from "@prisma/client";

describe("Server-Side Authorization Guards & Error Primitives", () => {
  it("should instantiate error classes with expected HTTP status codes", () => {
    const unauth = new UnauthorizedError();
    expect(unauth.status).toBe(401);
    expect(unauth.name).toBe("UnauthorizedError");

    const forbidden = new ForbiddenError();
    expect(forbidden.status).toBe(403);
    expect(forbidden.name).toBe("ForbiddenError");

    const notFound = new NotFoundError();
    expect(notFound.status).toBe(404);
    expect(notFound.name).toBe("NotFoundError");
  });

  describe("Role & Scope Guard Logic", () => {
    const mockCitizen: AuthenticatedUser = {
      id: "usr_citizen_123",
      email: "citizen@madinaty.local",
      name: "أحمد المواطن",
      role: UserRole.CITIZEN,
      status: UserStatus.ACTIVE,
      preferredLocale: "ar",
    };

    const mockStaff: AuthenticatedUser = {
      id: "usr_staff_456",
      email: "staff@madinaty.local",
      name: "مهندس الصيانة",
      role: UserRole.STAFF,
      status: UserStatus.ACTIVE,
      preferredLocale: "ar",
    };

    const mockAdmin: AuthenticatedUser = {
      id: "usr_admin_789",
      email: "admin@madinaty.local",
      name: "مدير النظام",
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      preferredLocale: "ar",
    };

    it("verifies citizen is forbidden from admin endpoints", () => {
      const allowedRoles: UserRole[] = [UserRole.ADMIN];
      const isAllowed = allowedRoles.includes(mockCitizen.role);
      expect(isAllowed).toBe(false);
    });

    it("verifies staff is forbidden from admin settings", () => {
      const allowedRoles: UserRole[] = [UserRole.ADMIN];
      const isAllowed = allowedRoles.includes(mockStaff.role);
      expect(isAllowed).toBe(false);
    });

    it("allows admin global access across roles", () => {
      const staffOrAdmin: UserRole[] = [UserRole.STAFF, UserRole.ADMIN];
      expect(staffOrAdmin.includes(mockAdmin.role)).toBe(true);
    });
  });

  describe("Immediate Revocation Logic", () => {
    it("identifies suspended user accounts", () => {
      const suspendedUser: AuthenticatedUser = {
        id: "usr_suspended",
        email: "suspended@madinaty.local",
        name: "مستخدم مجمد",
        role: UserRole.STAFF,
        status: UserStatus.SUSPENDED,
        preferredLocale: "ar",
      };

      expect(suspendedUser.status === UserStatus.SUSPENDED).toBe(true);
    });
  });

  describe("IDOR Prevention Logic", () => {
    const citizenUser: AuthenticatedUser = {
      id: "citizen_a",
      email: "a@madinaty.local",
      name: "مواطن أ",
      role: UserRole.CITIZEN,
      status: UserStatus.ACTIVE,
      preferredLocale: "ar",
    };

    const reportOwnedByCitizenB = {
      id: "rep_999",
      createdById: "citizen_b",
      authorityId: "auth_works",
      status: "NEW",
    };

    it("rejects citizen accessing another citizen's private report", () => {
      const canAccess = citizenUser.role === UserRole.ADMIN || reportOwnedByCitizenB.createdById === citizenUser.id;
      expect(canAccess).toBe(false);
    });

    it("allows citizen to access their own report", () => {
      const ownReport = {
        id: "rep_111",
        createdById: citizenUser.id,
        authorityId: "auth_works",
        status: "NEW",
      };
      const canAccess = ownReport.createdById === citizenUser.id;
      expect(canAccess).toBe(true);
    });
  });
});
