# ADR 0002 — Estrategia de estilos y sistema de diseño

- **Estado:** Aceptado
- **Fecha:** 2026-07-01
- **Decisores:** Dueño del proyecto + CTO (Claude, rol asumido)
- **Relacionados:** `docs/adr/0001-nextjs.md`

## Contexto

La migración a Next.js (ADR 0001) requiere una estrategia de estilos definida antes de crear componentes, para no generar deuda desde el día uno. El stack actual usa 9 archivos CSS por componente (~2.022 líneas) con clases ad-hoc y muchos estilos acoplados a IDs. El audit marcó incumplimientos de contraste (p. ej. `#999` sobre blanco) y componentes a rehacer accesibles.

## Decisión

Usar **Tailwind CSS** como sistema de estilos, sobre un conjunto de **design tokens** centralizados, y una capa fina de **componentes de UI accesibles** (basados en Radix UI primitives) para elementos con comportamiento (Dialog, Tabs, Popover, etc.).

### Composición

| Capa | Elección |
|---|---|
| Utilidades | Tailwind CSS |
| Tokens (color, tipografía, espaciado, radios) | `tailwind.config` + CSS variables (soporta dark mode y theming) |
| Primitivos con comportamiento | Radix UI (Dialog/Tabs/Popover/Dropdown) — accesibles por defecto (focus-trap, roving tabindex, ARIA) |
| Composición de clases | `clsx` + `tailwind-merge` (helper `cn()`) |
| Variantes de componente | `cva` (class-variance-authority) |

### Reglas

- **Contraste AA obligatorio** en los tokens: ningún color de texto por debajo de 4.5:1 (elimina el `#999` del audit). Definir escala de grises con pares texto/fondo validados.
- **Dark mode** vía `class` + CSS variables desde el inicio (el audit lo pide y el stack actual ya lo insinúa).
- **Sin estilos por ID**; todo por componente/utilidad.
- Los **primitivos accesibles** (Dialog con focus-trap nativo, Tabs con patrón ARIA) reemplazan los parches JS post-render (`focus-manager`, `a11yTagInteractive`) del stack vanilla — se rehacen como componentes, no se portan.
- Design tokens como **única fuente**: colores de marca RD, tipografía, espaciado y radios viven en un solo lugar y se consumen desde Tailwind.

## Consecuencias

**Positivas:** velocidad de desarrollo, consistencia, purga automática de CSS no usado (bundles pequeños → ayuda a CWV), accesibilidad de base garantizada por Radix, theming/dark-mode nativo.

**Negativas:** clases largas en el markup (mitigado con `cva` y componentes bien nombrados); curva inicial para definir bien los tokens; dependencia de Radix para primitivos (aceptable, es el estándar accesible).

## Alternativas descartadas

- **CSS Modules:** más cercano al CSS actual, pero más lento para iterar y sin sistema de tokens/utilidades ni purga; obliga a reescribir manualmente los patrones accesibles.
- **CSS-in-JS runtime (styled-components/emotion):** costo en runtime y fricción con React Server Components. Descartado.
- **Tailwind sin Radix:** dejaría el comportamiento accesible (focus-trap, ARIA) a mano — el error que el audit ya señaló. Descartado.
