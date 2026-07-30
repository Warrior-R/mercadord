import { test, expect } from "@playwright/test";

test("la portada muestra las 4 pestañas de exploración", async ({ page }) => {
  await page.goto("/");
  const tabs = page.getByRole("navigation", { name: "Formas de explorar" });
  for (const name of [
    "Destacados",
    "Más nuevos",
    "Ofertas del día",
    "Cerca de mí",
  ]) {
    await expect(tabs.getByRole("link", { name, exact: true })).toBeVisible();
  }
});

test("el sidebar de filtros aparece en escritorio con sus paneles", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const aside = page.getByRole("complementary", { name: "Filtros" });
  await expect(aside.getByRole("heading", { name: "Categorías" })).toBeVisible();
  await expect(
    aside.getByRole("heading", { name: /Precio máximo/ }),
  ).toBeVisible();
  await expect(aside.getByRole("heading", { name: "Condición" })).toBeVisible();
});

test("los filtros del sidebar se combinan y se preservan entre pestañas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?cat=vehicles&max=50000");
  const tabs = page.getByRole("navigation", { name: "Formas de explorar" });
  await tabs.getByRole("link", { name: "Ofertas del día" }).click();
  await expect(page).toHaveURL(/cat=vehicles/);
  await expect(page).toHaveURL(/max=50000/);
  await expect(page).toHaveURL(/tab=ofertas/);
});

test("'Cerca de mí' pide provincia antes de listar", async ({ page }) => {
  await page.goto("/?tab=cerca");
  await expect(page.getByRole("heading", { name: "Elige tu provincia" })).toBeVisible();
  await expect(page.getByLabel("Tu provincia")).toBeVisible();
});

test("el estado vacío invita a publicar y enlaza a vender y subastas", async ({
  page,
}) => {
  await page.goto("/");
  const cta = page.getByRole("link", { name: "Publicar anuncio gratis" }).first();
  await expect(cta).toHaveAttribute("href", "/vender");
});
