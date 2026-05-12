import type { ProductResult } from "../api/client";
import type { GroceryItem } from "../context/GroceryListsContext";

export const WEIGHT_PORTIONS = [
  { label: "250 גרם", value: 0.25 },
  { label: "500 גרם", value: 0.5 },
  { label: "750 גרם", value: 0.75 },
  { label: "1 ק״ג", value: 1 },
  { label: "1.5 ק״ג", value: 1.5 },
  { label: "2 ק״ג", value: 2 },
];

interface WeightedCandidate {
  productName?: string;
  packSize?: string;
  manufacturerAndBarcode?: string;
}

const WEIGHT_PATTERNS = [
  /מחיר\s*לפי\s*משקל/,
  /לפי\s*משקל/,
  /\bק["״']?ג\b/,
  /קילו(?:גרם)?/,
  /kilogram/i,
  /\bkg\b/i,
];

export function isWeightedProduct(product: ProductResult) {
  return isWeightedItem({
    productName: `${product.parts?.name_and_contents || product.label} ${product.value}`,
    packSize: product.parts?.pack_size,
    manufacturerAndBarcode: product.parts?.manufacturer_and_barcode,
  });
}

export function isWeightedItem(item: WeightedCandidate) {
  const text = [item.productName, item.packSize, item.manufacturerAndBarcode].filter(Boolean).join(" ");
  return WEIGHT_PATTERNS.some((pattern) => pattern.test(text));
}

export function defaultQuantityForProduct(product: ProductResult) {
  return isWeightedProduct(product) ? 1 : 1;
}

export function normalizeQuantity(value: number, weighted: boolean) {
  if (!Number.isFinite(value)) return weighted ? 0.25 : 1;
  if (!weighted) return Math.max(1, Math.floor(value));
  return Math.max(0.05, Math.round(value * 100) / 100);
}

export function quantityLabel(item: Pick<GroceryItem, "quantity" | "productName" | "packSize" | "manufacturerAndBarcode">) {
  if (!isWeightedItem(item)) return `${item.quantity} יחידות לקנייה`;
  return `${formatWeight(item.quantity)} לקנייה`;
}

export function formatWeight(quantity: number) {
  if (quantity < 1) return `${Math.round(quantity * 1000)} גרם`;
  return `${Number.isInteger(quantity) ? quantity : quantity.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")} ק״ג`;
}
