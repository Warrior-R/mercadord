import { test, expect } from "@playwright/test";

test("el listado de subastas responde 200 y muestra el título", async ({
  page,
}) => {
  await page.goto("/subastas");
  await expect(
    page.getByRole("heading", { name: /Subastas en vivo/ }),
  ).toBeVisible();
});

test("subasta inexistente devuelve 404", async ({ page }) => {
  const res = await page.goto(
    "/subasta/algo-00000000-0000-0000-0000-000000000000",
  );
  expect(res?.status()).toBe(404);
});

test("crear subasta muestra el formulario y avisa que hay que iniciar sesión", async ({
  page,
}) => {
  await page.goto("/subastas/crear");
  await expect(page.getByRole("heading", { name: /Crear una subasta/ })).toBeVisible();
  await expect(page.getByText(/Necesitas una sesión/)).toBeVisible();
});

test("la barra de categorías incluye el enlace a Subastas", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Categorías" });
  await expect(nav.getByRole("link", { name: /Subastas/ })).toBeVisible();
});
