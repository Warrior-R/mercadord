import { test, expect } from "@playwright/test";

test("mensajes sin sesión redirige a /entrar", async ({ page }) => {
  await page.goto("/mensajes");
  await expect(page).toHaveURL(/\/entrar/);
});

test("el formulario de publicar incluye el campo de WhatsApp", async ({
  page,
}) => {
  await page.goto("/vender");
  await expect(page.getByLabel(/WhatsApp/)).toBeVisible();
});

test("la barra inferior móvil incluye Mensajes", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const bottom = page.getByRole("navigation", { name: "Navegación principal" });
  await expect(bottom.getByRole("link", { name: /Mensajes/ })).toBeVisible();
});

test("moderación admin sin sesión redirige a /entrar", async ({ page }) => {
  await page.goto("/admin/reportes");
  await expect(page).toHaveURL(/\/entrar/);
});
