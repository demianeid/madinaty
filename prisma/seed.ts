import { UserRole, UserStatus, MembershipRole, AlexandriaSector } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../lib/db/prisma";
import {
  ALEXANDRIA_DISTRICTS,
  ALEXANDRIA_SECTOR_LIST,
  findNearestAlexandriaDistrict,
} from "../lib/alexandria/sectors";

async function upsertUserWithCredential(
  email: string,
  name: string,
  role: UserRole,
  hashedPassword: string
) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role, status: UserStatus.ACTIVE },
    create: {
      name,
      email,
      emailVerified: true,
      role,
      status: UserStatus.ACTIVE,
      preferredLocale: "ar",
    },
  });

  await prisma.account.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: user.id,
      },
    },
    update: { password: hashedPassword },
    create: {
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: hashedPassword,
    },
  });

  return user;
}

async function main() {
  console.log("🌱 Starting Madinaty Alexandria database seed...");

  // 1. Seed the 6 Official Alexandria Authorities
  const authoritiesDef = [
    {
      slug: "asdco-drainage",
      shortCode: "asdco",
      name: "Alexandria Sanitary Drainage Company (ASDCO)",
      nameAr: "شركة الصرف الصحي بالإسكندرية",
      description: "المسؤولة عن الشنايش ومطابق الصرف وطوارئ النوّات الشتوية وتصريف الأمطار (الخط الساخن 175).",
      contactEmail: "ops.drainage@alex.gov.eg",
    },
    {
      slug: "awco-water",
      shortCode: "awco",
      name: "Alexandria Water Company (AWCO)",
      nameAr: "شركة مياه الشرب بالإسكندرية",
      description: "المسؤولة عن معالجة كسور خطوط مياه الشرب والتسريبات الأرضية وضغط وجودة المياه (الخط الساخن 125).",
      contactEmail: "ops.water@alex.gov.eg",
    },
    {
      slug: "nahdet-misr-waste",
      shortCode: "waste",
      name: "Nahdet Misr Environmental Services",
      nameAr: "شركة نهضة مصر للخدمات البيئية والنظافة",
      description: "المسؤولة عن إدارة قطاع القمامة وتفريغ الحاويات ونظافة الشوارع ومحطات الترحيل.",
      contactEmail: "ops.waste@alex.gov.eg",
    },
    {
      slug: "aedc-electricity",
      shortCode: "aedc",
      name: "Alexandria Electricity Distribution Company (AEDC)",
      nameAr: "شركة الإسكندرية لتوزيع الكهرباء",
      description: "المسؤولة عن صيانة أعمدة الإنارة العامة والكابلات وتأمين المهمات الكهربائية من الأمطار (الخط الساخن 121).",
      contactEmail: "ops.electricity@alex.gov.eg",
    },
    {
      slug: "alex-roads",
      shortCode: "roads",
      name: "Directorate of Roads & Transport - Alexandria",
      nameAr: "مديرية الطرق والنقل بمحافظة الإسكندرية",
      description: "المسؤولة عن صيانة الأسفلت ومعالجة الحفر الوعائية والأرصفة والمطبات العشوائية.",
      contactEmail: "ops.roads@alex.gov.eg",
    },
    {
      slug: "alex-tourism-beaches",
      shortCode: "tourism",
      name: "Central Administration of Tourism & Resorts",
      nameAr: "الإدارة المركزية للسياحة والمصايف بالإسكندرية",
      description: "المسؤولة عن مراقبة طريق الكورنيش والشواطئ العامة وإشغالات الممشى الساحلي.",
      contactEmail: "ops.tourism@alex.gov.eg",
    },
  ];

  const authorityMap: Record<string, { id: string; slug: string; nameAr: string; shortCode: string }> = {};

  for (const auth of authoritiesDef) {
    const record = await prisma.authority.upsert({
      where: { slug: auth.slug },
      update: {
        name: auth.name,
        nameAr: auth.nameAr,
        description: auth.description,
        contactEmail: auth.contactEmail,
        isActive: true,
      },
      create: {
        slug: auth.slug,
        name: auth.name,
        nameAr: auth.nameAr,
        description: auth.description,
        contactEmail: auth.contactEmail,
        isActive: true,
      },
    });
    authorityMap[auth.slug] = {
      id: record.id,
      slug: record.slug,
      nameAr: record.nameAr,
      shortCode: auth.shortCode,
    };
  }

  // Deactivate legacy non-Alexandria authorities if present (preserve historical reports)
  await prisma.authority.updateMany({
    where: { slug: { in: ["municipal-works", "sanitation-environment"] } },
    data: { isActive: false },
  });

  console.log("✅ Seeded 6 Alexandria Authorities");

  // 2. Seed the 6 Alexandria Categories mapped to their Authorities
  const categoriesData = [
    {
      key: "sewage-flooding",
      labelAr: "طفح الصرف الصحي وتجمعات الأمطار",
      labelEn: "Sewage Flooding & Rainwater Accumulation",
      descriptionAr: "انسداد الشنايش ومطابق الصرف، طفح مياه الصرف الصحي، وتجمعات مياه الأمطار والنوّات.",
      defaultAuthorityId: authorityMap["asdco-drainage"].id,
    },
    {
      key: "water-pipeline-burst",
      labelAr: "كسور خطوط مياه الشرب والتسريبات",
      labelEn: "Water Pipeline Bursts & Leaks",
      descriptionAr: "كسور مواسير مياه الشرب العمومية وتسريبات المياه الأرضية.",
      defaultAuthorityId: authorityMap["awco-water"].id,
    },
    {
      key: "waste-accumulation",
      labelAr: "تراكم القمامة وتلف حاويات النفايات",
      labelEn: "Waste Accumulation & Damaged Bins",
      descriptionAr: "تراكم القمامة خارج الحاويات، تلف حاويات النظافة، ومخلفات الردش في الطرق.",
      defaultAuthorityId: authorityMap["nahdet-misr-waste"].id,
    },
    {
      key: "street-lighting-faults",
      labelAr: "أعطال إنارة الشوارع والأسلاك المكشوفة",
      labelEn: "Street Lighting Faults & Exposed Cables",
      descriptionAr: "أعمدة الإنارة المطفأة أو المتآكلة، والأسلاك والكابلات الكهربائية المكشوفة.",
      defaultAuthorityId: authorityMap["aedc-electricity"].id,
    },
    {
      key: "pavement-road-hazards",
      labelAr: "حفر الطرق والهبوطات الأسفلتية",
      labelEn: "Pavement & Road Asphalt Hazards",
      descriptionAr: "الحفر الوعائية، الهبوطات الأسفلتية، وتلف الأرصفة العامة.",
      defaultAuthorityId: authorityMap["alex-roads"].id,
    },
    {
      key: "coastal-corniche-issues",
      labelAr: "إشغالات وتلفيات الكورنيش والشواطئ",
      labelEn: "Coastal Corniche & Beach Issues",
      descriptionAr: "إشغالات الممشى الساحلي، تلفيات الشواطئ العامة، وحواجز الكورنيش.",
      defaultAuthorityId: authorityMap["alex-tourism-beaches"].id,
    },
  ];

  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: { key: cat.key },
      update: {
        labelAr: cat.labelAr,
        labelEn: cat.labelEn,
        descriptionAr: cat.descriptionAr,
        defaultAuthorityId: cat.defaultAuthorityId,
        isActive: true,
      },
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

  // Deactivate legacy category keys if present so new reports use the 6 Alexandria categories
  await prisma.category.updateMany({
    where: {
      key: {
        in: ["road-hazards", "street-lighting", "waste-management", "water-sewage", "public-parks"],
      },
    },
    data: { isActive: false },
  });

  console.log("✅ Seeded 6 Alexandria Categories");

  // 3. Seed the 10 Official Alexandria Districts (ServiceAreas) across the 4 Sectors
  for (const d of ALEXANDRIA_DISTRICTS) {
    await prisma.serviceArea.upsert({
      where: { id: d.id },
      update: {
        code: d.code,
        sector: d.sector,
        name: d.name,
        nameAr: d.nameAr,
        centerLat: d.centerLat,
        centerLng: d.centerLng,
        isActive: true,
      },
      create: {
        id: d.id,
        code: d.code,
        sector: d.sector,
        name: d.name,
        nameAr: d.nameAr,
        centerLat: d.centerLat,
        centerLng: d.centerLng,
        isActive: true,
      },
    });
  }

  console.log("✅ Seeded 10 Alexandria Districts across 4 Macro Sectors");

  // Backfill sector & serviceAreaId for any existing reports without a sector
  const existingReports = await prisma.report.findMany({
    where: { OR: [{ sector: null }, { serviceAreaId: null }] },
    select: { id: true, latitude: true, longitude: true },
  });

  for (const rep of existingReports) {
    const district = findNearestAlexandriaDistrict(rep.latitude, rep.longitude);
    await prisma.report.update({
      where: { id: rep.id },
      data: {
        serviceAreaId: district.id,
        sector: district.sector,
      },
    });
  }

  if (existingReports.length > 0) {
    console.log(`✅ Backfilled sector & district for ${existingReports.length} existing reports`);
  }

  // 4. Seed Development & Operational Users (single pre-hashed password for fast seeding)
  const defaultPassword = "Password1234!";
  const hashedPassword = await hashPassword(defaultPassword);

  const adminUser = await upsertUserWithCredential(
    "admin@madinaty.local",
    "مدير المنظومة العام - الإسكندرية",
    UserRole.ADMIN,
    hashedPassword
  );

  // Seed 24 Sector Authority Admins (6 Authorities x 4 Sectors)
  const sectorSlugMap: Record<AlexandriaSector, string> = {
    ALX_EAST: "east",
    ALX_CENTRAL: "central",
    ALX_WEST: "west",
    ALX_SOUTH: "south",
  };

  for (const auth of Object.values(authorityMap)) {
    for (const sec of ALEXANDRIA_SECTOR_LIST) {
      const email = `admin.${sectorSlugMap[sec.key]}.${auth.shortCode}@alex.gov.eg`;
      const name = `مدير ${sec.key === AlexandriaSector.ALX_EAST ? "قطاع شرق" : sec.key === AlexandriaSector.ALX_CENTRAL ? "قطاع وسط" : sec.key === AlexandriaSector.ALX_WEST ? "قطاع غرب" : "قطاع العامرية"} - ${auth.nameAr}`;
      const sectorAdmin = await upsertUserWithCredential(
        email,
        name,
        UserRole.STAFF,
        hashedPassword
      );

      await prisma.authorityMembership.upsert({
        where: { userId_authorityId: { userId: sectorAdmin.id, authorityId: auth.id } },
        update: {
          membershipRole: MembershipRole.AUTHORITY_ADMIN,
          sector: sec.key,
          isActive: true,
        },
        create: {
          userId: sectorAdmin.id,
          authorityId: auth.id,
          membershipRole: MembershipRole.AUTHORITY_ADMIN,
          sector: sec.key,
          isActive: true,
        },
      });
    }
  }

  // Seed sample Triage & Field Operator for ALX_EAST in ASDCO & keep staff.works@madinaty.local working
  const triageEastAsdco = await upsertUserWithCredential(
    "triage.east.asdco@alex.gov.eg",
    "منسق فرز قطاع شرق - الصرف الصحي",
    UserRole.STAFF,
    hashedPassword
  );
  await prisma.authorityMembership.upsert({
    where: {
      userId_authorityId: {
        userId: triageEastAsdco.id,
        authorityId: authorityMap["asdco-drainage"].id,
      },
    },
    update: {
      membershipRole: MembershipRole.TRIAGE,
      sector: AlexandriaSector.ALX_EAST,
      isActive: true,
    },
    create: {
      userId: triageEastAsdco.id,
      authorityId: authorityMap["asdco-drainage"].id,
      membershipRole: MembershipRole.TRIAGE,
      sector: AlexandriaSector.ALX_EAST,
      isActive: true,
    },
  });

  const techMon1Asdco = await upsertUserWithCredential(
    "tech.mon1.asdco@alex.gov.eg",
    "فني ميداني المنتزه أول - الصرف الصحي",
    UserRole.STAFF,
    hashedPassword
  );
  await prisma.authorityMembership.upsert({
    where: {
      userId_authorityId: {
        userId: techMon1Asdco.id,
        authorityId: authorityMap["asdco-drainage"].id,
      },
    },
    update: {
      membershipRole: MembershipRole.OPERATOR,
      sector: AlexandriaSector.ALX_EAST,
      assignedAreaId: "alx-mon1",
      isActive: true,
    },
    create: {
      userId: techMon1Asdco.id,
      authorityId: authorityMap["asdco-drainage"].id,
      membershipRole: MembershipRole.OPERATOR,
      sector: AlexandriaSector.ALX_EAST,
      assignedAreaId: "alx-mon1",
      isActive: true,
    },
  });

  const staffWorks = await upsertUserWithCredential(
    "staff.works@madinaty.local",
    "مهندس صيانة الطرق - قطاع شرق",
    UserRole.STAFF,
    hashedPassword
  );
  await prisma.authorityMembership.upsert({
    where: {
      userId_authorityId: {
        userId: staffWorks.id,
        authorityId: authorityMap["alex-roads"].id,
      },
    },
    update: {
      membershipRole: MembershipRole.TRIAGE,
      sector: AlexandriaSector.ALX_EAST,
      isActive: true,
    },
    create: {
      userId: staffWorks.id,
      authorityId: authorityMap["alex-roads"].id,
      membershipRole: MembershipRole.TRIAGE,
      sector: AlexandriaSector.ALX_EAST,
      isActive: true,
    },
  });

  const citizenUser = await upsertUserWithCredential(
    "citizen@madinaty.local",
    "أحمد المواطن",
    UserRole.CITIZEN,
    hashedPassword
  );

  console.log("✅ Seeded Alexandria Staff Hierarchy (24 Sector Admins + Triage + Tech + Super Admin + Citizen)", {
    password: defaultPassword,
    superAdmin: adminUser.email,
    sampleSectorAdmin: "admin.east.asdco@alex.gov.eg",
    sampleTriage: triageEastAsdco.email,
    sampleTech: techMon1Asdco.email,
    legacyStaff: staffWorks.email,
    citizen: citizenUser.email,
  });

  console.log("🌱 Alexandria Database seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
