"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, type ReactNode } from "react";

/**
 * Drawer de filtros para móvil. Reemplaza el sidebar (oculto en <md).
 * Radix Dialog aporta focus-trap, cierre con Escape, aria-modal y overlay.
 */
export function FiltersDrawer({
  children,
  activeCount,
}: {
  children: ReactNode;
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:border-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-neutral-700 dark:bg-neutral-900 md:hidden"
        >
          <span aria-hidden>⚙️</span>
          Filtros
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs text-white">
              {activeCount}
            </span>
          )}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[85%] max-w-sm flex-col overflow-y-auto bg-white p-5 shadow-xl focus:outline-none dark:bg-neutral-950">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">
              Filtros
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Cerrar filtros"
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-neutral-800"
              >
                ✕
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Ajusta categoría, condición, precio y ubicación para filtrar los
            resultados.
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
