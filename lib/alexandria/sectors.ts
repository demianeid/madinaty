import type { AlexandriaSector } from "@prisma/client";

export const ALEXANDRIA_CENTER: [number, number] = [31.2001, 29.9187];

export interface SectorMeta {
  key: AlexandriaSector;
  labelAr: string;
  labelEn: string;
  shortAr: string;
  descriptionAr: string;
}

export const ALEXANDRIA_SECTORS: Record<AlexandriaSector, SectorMeta> = {
  ALX_EAST: {
    key: "ALX_EAST",
    labelAr: "قطاع شرق الإسكندرية",
    labelEn: "East Alexandria Sector",
    shortAr: "شرق",
    descriptionAr: "حي المنتزه أول، حي المنتزه ثان، وحي شرق",
  },
  ALX_CENTRAL: {
    key: "ALX_CENTRAL",
    labelAr: "قطاع وسط والمدينة التاريخية",
    labelEn: "Central & Historic Sector",
    shortAr: "وسط",
    descriptionAr: "حي وسط، حي الجمرك، وحي غرب",
  },
  ALX_WEST: {
    key: "ALX_WEST",
    labelAr: "قطاع غرب والساحل",
    labelEn: "West & Coastal Sector",
    shortAr: "غرب",
    descriptionAr: "حي العجمي (يشمل الدخيلة، البيطاش، الهانوفيل، أبو يوسف، والكيلو 21)",
  },
  ALX_SOUTH: {
    key: "ALX_SOUTH",
    labelAr: "قطاع العامرية والجنوب الصناعي",
    labelEn: "Amreya & South Industrial Sector",
    shortAr: "العامرية",
    descriptionAr: "حي العامرية أول، حي العامرية ثان، ومركز ومدينة برج العرب",
  },
};

export const ALEXANDRIA_SECTOR_LIST: SectorMeta[] = [
  ALEXANDRIA_SECTORS.ALX_EAST,
  ALEXANDRIA_SECTORS.ALX_CENTRAL,
  ALEXANDRIA_SECTORS.ALX_WEST,
  ALEXANDRIA_SECTORS.ALX_SOUTH,
];

export interface AlexandriaDistrictDef {
  id: string;
  code: string;
  sector: AlexandriaSector;
  name: string;
  nameAr: string;
  centerLat: number;
  centerLng: number;
}

export const ALEXANDRIA_DISTRICTS: AlexandriaDistrictDef[] = [
  {
    id: "alx-mon1",
    code: "ALX-MON1",
    sector: "ALX_EAST",
    name: "Montaza First District",
    nameAr: "حي المنتزه أول",
    centerLat: 31.258,
    centerLng: 30.002,
  },
  {
    id: "alx-mon2",
    code: "ALX-MON2",
    sector: "ALX_EAST",
    name: "Montaza Second District",
    nameAr: "حي المنتزه ثان",
    centerLat: 31.305,
    centerLng: 30.075,
  },
  {
    id: "alx-east",
    code: "ALX-EAST",
    sector: "ALX_EAST",
    name: "East District (Sharq)",
    nameAr: "حي شرق",
    centerLat: 31.221,
    centerLng: 29.953,
  },
  {
    id: "alx-mid",
    code: "ALX-MID",
    sector: "ALX_CENTRAL",
    name: "Central District (Wasat)",
    nameAr: "حي وسط",
    centerLat: 31.196,
    centerLng: 29.914,
  },
  {
    id: "alx-gom",
    code: "ALX-GOM",
    sector: "ALX_CENTRAL",
    name: "El-Gomrok District",
    nameAr: "حي الجمرك",
    centerLat: 31.205,
    centerLng: 29.882,
  },
  {
    id: "alx-west",
    code: "ALX-WEST",
    sector: "ALX_CENTRAL",
    name: "West District (Gharb)",
    nameAr: "حي غرب",
    centerLat: 31.173,
    centerLng: 29.871,
  },
  {
    id: "alx-agm",
    code: "ALX-AGM",
    sector: "ALX_WEST",
    name: "El-Agamy District (incl. El-Dekheila)",
    nameAr: "حي العجمي (شاملاً الدخيلة)",
    centerLat: 31.115,
    centerLng: 29.762,
  },
  {
    id: "alx-amr1",
    code: "ALX-AMR1",
    sector: "ALX_SOUTH",
    name: "Amreya First District",
    nameAr: "حي العامرية أول",
    centerLat: 31.025,
    centerLng: 29.794,
  },
  {
    id: "alx-amr2",
    code: "ALX-AMR2",
    sector: "ALX_SOUTH",
    name: "Amreya Second District",
    nameAr: "حي العامرية ثان",
    centerLat: 30.952,
    centerLng: 29.728,
  },
  {
    id: "alx-brg",
    code: "ALX-BRG",
    sector: "ALX_SOUTH",
    name: "Borg El Arab Center & City",
    nameAr: "مركز ومدينة برج العرب",
    centerLat: 30.916,
    centerLng: 29.548,
  },
];

function haversineSq(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = lat1 - lat2;
  const dLng = (lng1 - lng2) * Math.cos((lat1 * Math.PI) / 180);
  return dLat * dLat + dLng * dLng;
}

/**
 * Resolves any Alexandria coordinates to the nearest official district & macro sector.
 */
export function findNearestAlexandriaDistrict(
  lat: number,
  lng: number
): AlexandriaDistrictDef {
  let best = ALEXANDRIA_DISTRICTS[0];
  let minDist = Infinity;

  for (const district of ALEXANDRIA_DISTRICTS) {
    const d = haversineSq(lat, lng, district.centerLat, district.centerLng);
    if (d < minDist) {
      minDist = d;
      best = district;
    }
  }

  return best;
}
