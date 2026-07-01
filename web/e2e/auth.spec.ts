import { test, expect } from "@playwright/test";

test("header muestra Entrar y Crear cuenta cuando no hay sesión", async ({
  page,
}) => {
  await page.goto("/");
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Entrar" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Crear cuenta" })).toBeVisible();
});

test("la página de login se ve y enlaza a registro", async ({ page }) => {
  await page.goto("/entrar");
  await expect(
    page.getByRole("heading", { name: "Entrar a MercadoRD" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Continuar con Google/ }),
  ).toBeVisible();
});

test("login con credenciales inválidas muestra error", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill("noexiste@example.com");
  await page.getByLabel("Contraseña").fill("contrasena-falsa-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Invalid login credentials")).toBeVisible();
  await expect(page).toHaveURL(/\/entrar\?error=/);
});
