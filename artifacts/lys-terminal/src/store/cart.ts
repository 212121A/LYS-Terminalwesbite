import { useState, useCallback } from "react";

export interface CartItemEditMeta {
  kind: "sauce" | "options" | "extraSauce";
  baseName: string;
  basePrice: number;
  profile?: "matcha" | "coffeeMilk";
  /** Bei „extraSauce": Carb-/Größen-Label ohne Soße, um beim Bearbeiten den
   *  Basis-Zustand wiederherzustellen. */
  baseSizeLabel?: string;
}

export interface CartItem {
  id: string;
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  sizeLabel?: string;
  edit?: CartItemEditMeta;
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((
    itemId: string,
    name: string,
    price: number,
    sizeLabel?: string,
    edit?: CartItemEditMeta
  ) => {
    setItems((prev) => {
      const cartId = sizeLabel ? `${itemId}-${sizeLabel}` : itemId;
      const existing = prev.find((i) => i.id === cartId);
      if (existing) {
        return prev.map((i) =>
          i.id === cartId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { id: cartId, itemId, name, price, quantity: 1, sizeLabel, edit }];
    });
  }, []);

  const removeLine = useCallback((cartId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== cartId));
  }, []);

  const removeItem = useCallback((cartId: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === cartId);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter((i) => i.id !== cartId);
      return prev.map((i) =>
        i.id === cartId ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, addItem, removeItem, removeLine, clearCart, total, itemCount };
}
