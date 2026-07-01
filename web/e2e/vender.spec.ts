import { test, expect } from "@playwright/test";

test("la página de publicar muestra el formulario y avisa que hay que iniciar sesión", async ({
  page,
}) => {
  await page.goto("/vender");
  await expect(
    page.getByRole("heading", { name: "Publicar un producto" }),
  ).toBeVisible();
  // Sin sesión: aviso para entrar.
  await expect(page.getByText(/Necesitas una sesión para publicar/)).toBeVisible();
  // El formulario existe con sus campos clave.
  await expect(page.getByLabel(/Título/)).toBeVisible();
  await expect(page.getByLabel("Categoría *")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publicar producto" })).toBeVisible();
});

test("publicar sin sesión redirige a /entrar", async ({ page }) => {
  await page.goto("/vender");
  await page.getByLabel(/Título/).fill("Producto de prueba E2E");
  await page.getByLabel(/Precio \(RD\$\)/).fill("1000");
  await page.getByLabel("Categoría *").selectOption("electronics");
  await page.getByLabel("Condición *").selectOption("used");
  await page.getByRole("button", { name: "Publicar producto" }).click();
  await expect(page).toHaveURL(/\/entrar/);
});
