import { test, expect } from "@playwright/test";

test("página legal responde 200 y muestra el título", async ({ page }) => {
  const res = await page.goto("/legal/terminos");
  expect(res?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { level: 1, name: "Términos y Condiciones" }),
  ).toBeVisible();
});

test("página legal inexistente devuelve 404", async ({ page }) => {
  const res = await page.goto("/legal/no-existe");
  expect(res?.status()).toBe(404);
});

test("una ruta inexistente muestra el 404 con marca", async ({ page }) => {
  const res = await page.goto("/esto-no-existe-1234");
  expect(res?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Página no encontrada" }),
  ).toBeVisible();
});

test("mi cuenta sin sesión redirige a /entrar", async ({ page }) => {
  await page.goto("/cuenta");
  await expect(page).toHaveURL(/\/entrar/);
});

test("el footer aparece con enlaces legales", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer).toBeVisible();
  await expect(
    footer.getByRole("link", { name: "Política de Privacidad" }),
  ).toBeVisible();
});

test("la barra inferior aparece en móvil y se oculta en escritorio", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const bottom = page.getByRole("navigation", { name: "Navegación principal" });
  await expect(bottom.getByRole("link", { name: /Vender/ })).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(bottom).toBeHidden();
});
