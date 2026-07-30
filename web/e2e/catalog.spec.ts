import { test, expect } from "@playwright/test";

test("home carga con marca, nav de categorías y banner", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/MercadoRD/);
  await expect(page.getByRole("banner").getByRole("link", { name: "MercadoRD" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Categorías", exact: true }).getByRole("link", { name: "Electrónica" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Compra y vende en República Dominicana/ })).toBeVisible();
});

test("categoría válida responde 200 y muestra su título", async ({ page }) => {
  const res = await page.goto("/categoria/electronica");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: /Electrónica/ })).toBeVisible();
});

test("categoría inexistente devuelve 404", async ({ page }) => {
  const res = await page.goto("/categoria/no-existe");
  expect(res?.status()).toBe(404);
});

test("producto inexistente devuelve 404", async ({ page }) => {
  const res = await page.goto(
    "/producto/algo-00000000-0000-0000-0000-000000000000",
  );
  expect(res?.status()).toBe(404);
});

test("búsqueda con filtros carga y no se indexa", async ({ page }) => {
  await page.goto("/buscar?q=iphone&cat=electronics&cond=new&sort=price_asc");
  await expect(page.getByRole("heading", { name: /Resultados para/ })).toBeVisible();
  // Las páginas de resultados llevan noindex.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("los filtros desaparecen del sidebar en móvil y aparece el botón Filtros", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/buscar");
  await expect(page.getByRole("complementary", { name: "Filtros" })).toBeHidden();
  const filtros = page.getByRole("button", { name: /Filtros/ });
  await expect(filtros).toBeVisible();
  // El drawer accesible abre con role=dialog.
  await filtros.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("sitemap y robots responden bien", async ({ request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("/categoria/electronica");

  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Sitemap:");
});
