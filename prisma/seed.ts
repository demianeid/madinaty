import { UserRole, UserStatus, MembershipRole } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../lib/db/prisma";

async function main() {
  console.log("🌱 Starting Madinaty database seed...");

  // 1. Seed Authorities
  const worksAuthority = await prisma.authority.upsert({
    where: { slug: "municipal-works" },
    update: {},
    create: {
      name: "Municipal Works Authority",
      nameAr: "هيئة الأشغال البلدية والطرق",
      slug: "municipal-works",
      description: "المسؤولة عن صيانة الطرق، الأرصفة، والإنارة العامة.",
      contactEmail: "works@madinaty.local",
      isActive: true,
    },
  });

  const sanitationAuthority = await prisma.authority.upsert({
    where: { slug: "sanitation-environment" },
    update: {},
    create: {
      name: "Sanitation and Environment Department",
      nameAr: "دائرة النظافة وحماية البيئة",
      slug: "sanitation-environment",
      description: "المسؤولة عن إدارة النفايات، النظافة العامة، والحدائق.",
      contactEmail: "cleanliness@madinaty.local",
      isActive: true,
    },
  });

  console.log("✅ Seeded Authorities:", worksAuthority.slug, sanitationAuthority.slug);

  // 2. Seed Categories
  const categoriesData = [
    {
      key: "road-hazards",
      labelAr: "حفر وتصدعات الطرق والأرصفة",
      labelEn: "Road & Pavement Hazards",
      descriptionAr: "الحفر الوعائية، هبوط الأسفلت، وتلف الأرصفة العامة.",
      defaultAuthorityId: worksAuthority.id,
    },
    {
      key: "street-lighting",
      labelAr: "أعطال إنارة الشوارع",
      labelEn: "Street Lighting Outages",
      descriptionAr: "أعمدة الإنارة المعطلة أو الأسلاك المكشوفة في الطرق العامة.",
      defaultAuthorityId: worksAuthority.id,
    },
    {
      key: "waste-management",
      labelAr: "تراكم النفايات والحاويات",
      labelEn: "Waste & Garbage Accumulation",
      descriptionAr: "تراكم النفايات خارج الحاويات، أو تلف حاويات جمع القمامة.",
      defaultAuthorityId: sanitationAuthority.id,
    },
    {
      key: "water-sewage",
      labelAr: "تسربات المياه والصرف الصحي",
      labelEn: "Water Leaks & Sewage Overflows",
      descriptionAr: "انسداد مصارف الأمطار، طفح مياه الصرف، أو كسر أنابيب المياه العامة.",
      defaultAuthorityId: worksAuthority.id,
    },
    {
      key: "public-parks",
      labelAr: "صيانة الحدائق والمساحات الخضراء",
      labelEn: "Public Parks & Green Spaces",
      descriptionAr: "تلف ألعاب الأطفال، جفاف الأشجار، أو تلف المقاعد العامة.",
      defaultAuthorityId: sanitationAuthority.id,
    },
  ];

  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: { key: cat.key },
      update: {},
      create: {
        key: cat.key,
        labelAr: cat.labelAr,
        labelEn: cat.labelEn,
        descriptionAr: cat.descriptionAr,
        defaultAuthorityId: cat.defaultAuthorityId,
        isActive: true,
      },
    });
  }

  console.log("✅ Seeded Categories:", categoriesData.length);

  // 3. Seed Service Area
  const serviceArea = await prisma.serviceArea.upsert({
    where: { id: "default-metropolitan-area" },
    update: {},
    create: {
      id: "default-metropolitan-area",
      authorityId: worksAuthority.id,
      name: "Metropolitan District 1",
      nameAr: "المنطقة المركزية - الحي الأول",
      polygon: {
        type: "Polygon",
        coordinates: [
          [
            [31.2, 30.0],
            [31.4, 30.0],
            [31.4, 30.2],
            [31.2, 30.2],
            [31.2, 30.0],
          ],
        ],
      },
      isActive: true,
    },
  });

  console.log("✅ Seeded Service Area:", serviceArea.nameAr);

  // 4. Seed Development Users
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@madinaty.local" },
    update: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    create: {
      name: "مدير النظام العام",
      email: "admin@madinaty.local",
      emailVerified: true,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      preferredLocale: "ar",
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { email: "staff.works@madinaty.local" },
    update: { role: UserRole.STAFF, status: UserStatus.ACTIVE },
    create: {
      name: "مهندس صيانة الطرق",
      email: "staff.works@madinaty.local",
      emailVerified: true,
      role: UserRole.STAFF,
      status: UserStatus.ACTIVE,
      preferredLocale: "ar",
    },
  });

  // Assign staff to Works Authority
  await prisma.authorityMembership.upsert({
    where: {
      userId_authorityId: {
        userId: staffUser.id,
        authorityId: worksAuthority.id,
      },
    },
    update: { isActive: true },
    create: {
      userId: staffUser.id,
      authorityId: worksAuthority.id,
      membershipRole: MembershipRole.TRIAGE,
      isActive: true,
    },
  });

  const citizenUser = await prisma.user.upsert({
    where: { email: "citizen@madinaty.local" },
    update: { role: UserRole.CITIZEN, status: UserStatus.ACTIVE },
    create: {
      name: "أحمد المواطن",
      email: "citizen@madinaty.local",
      emailVerified: true,
      role: UserRole.CITIZEN,
      status: UserStatus.ACTIVE,
      preferredLocale: "ar",
    },
  });

  // Default password for all development seed accounts
  const defaultPassword = "Password1234!";
  const hashedPassword = await hashPassword(defaultPassword);

  for (const user of [adminUser, staffUser, citizenUser]) {
    await prisma.account.upsert({
      where: {
        providerId_accountId: {
          providerId: "credential",
          accountId: user.id,
        },
      },
      update: {
        password: hashedPassword,
      },
      create: {
        userId: user.id,
        providerId: "credential",
        accountId: user.id,
        password: hashedPassword,
      },
    });
  }

  console.log("✅ Seeded Development Users with password: Password1234!", {
    admin: adminUser.email,
    staff: staffUser.email,
    citizen: citizenUser.email,
  });

  console.log("🌱 Database seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
