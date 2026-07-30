/** Las 32 provincias de República Dominicana (incluye el Distrito Nacional). */
export const PROVINCES = [
  "Distrito Nacional",
  "Azua",
  "Bahoruco",
  "Barahona",
  "Dajabón",
  "Duarte",
  "El Seibo",
  "Elías Piña",
  "Espaillat",
  "Hato Mayor",
  "Hermanas Mirabal",
  "Independencia",
  "La Altagracia",
  "La Romana",
  "La Vega",
  "María Trinidad Sánchez",
  "Monseñor Nouel",
  "Monte Cristi",
  "Monte Plata",
  "Pedernales",
  "Peravia",
  "Puerto Plata",
  "Samaná",
  "San Cristóbal",
  "San José de Ocoa",
  "San Juan",
  "San Pedro de Macorís",
  "Sánchez Ramírez",
  "Santiago",
  "Santiago Rodríguez",
  "Santo Domingo",
  "Valverde",
] as const;

export type Province = (typeof PROVINCES)[number];

/** ¿El texto corresponde a una provincia conocida? (comparación laxa). */
export function isKnownProvince(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return PROVINCES.some((p) => p.toLowerCase() === v);
}
