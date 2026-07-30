import { CATEGORIES } from "@/lib/categories";
import { CONDITIONS } from "@/lib/filters";
import type { Product } from "@/lib/types";

const inputClass =
  "rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light";

/**
 * Formulario de producto reutilizable para crear y editar.
 * `product` prellena los campos (modo edición); `defaultWhatsapp` se pasa aparte
 * porque la columna whatsapp no viaja en el SELECT compartido (resiliencia F2).
 */
export function ProductForm({
  action,
  product,
  defaultWhatsapp,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  product?: Product;
  defaultWhatsapp?: string | null;
  submitLabel: string;
}) {
  return (
    <form
      action={action}
      encType="multipart/form-data"
      className="mt-6 flex flex-col gap-4"
    >
      {product && <input type="hidden" name="id" value={product.id} />}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Título *</span>
        <input
          type="text"
          name="title"
          required
          minLength={3}
          defaultValue={product?.title ?? ""}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Descripción</span>
        <textarea
          name="description"
          rows={4}
          defaultValue={product?.description ?? ""}
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">Precio (RD$) *</span>
          <input
            type="number"
            name="price"
            required
            min={1}
            step="0.01"
            inputMode="decimal"
            defaultValue={product?.price ?? ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">Precio anterior (opcional)</span>
          <input
            type="number"
            name="old_price"
            min={0}
            step="0.01"
            inputMode="decimal"
            defaultValue={product?.old_price ?? ""}
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">Categoría *</span>
          <select
            name="category"
            required
            defaultValue={product?.category ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Selecciona…
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">Condición *</span>
          <select
            name="condition"
            required
            defaultValue={product?.condition ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Selecciona…
            </option>
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">Ubicación</span>
          <input
            type="text"
            name="location"
            placeholder="Provincia o ciudad"
            defaultValue={product?.location ?? ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">WhatsApp (opcional)</span>
          <input
            type="tel"
            name="whatsapp"
            inputMode="tel"
            placeholder="809 000 0000"
            defaultValue={defaultWhatsapp ?? ""}
            className={inputClass}
          />
          <span className="text-xs text-ink-soft">
            Se mostrará un botón para contactarte por WhatsApp.
          </span>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Foto del producto</span>
        <input
          type="file"
          name="image_file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
        />
        <span className="text-xs text-ink-soft">
          JPG, PNG o WebP (máx. 5 MB). O pega una URL abajo.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">URL de imagen (opcional)</span>
        <input
          type="url"
          name="image_url"
          placeholder="https://…"
          defaultValue={product?.image_url ?? ""}
          className={inputClass}
        />
      </label>

      <button
        type="submit"
        className="mt-2 rounded-lg bg-accent px-4 py-3 text-sm font-bold text-white transition hover:bg-accent-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2"
      >
        {submitLabel}
      </button>
    </form>
  );
}
