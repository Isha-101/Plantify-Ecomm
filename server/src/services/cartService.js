import { priceCart } from './pricing.js';
import { getProductsByIds } from './catalogueService.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';
import { isObjectId, str } from '../utils/validate.js';

const sameLine = (l, productId, kitId) => String(l.product) === String(productId) && (l.kitId || '') === (kitId || '');

export function cleanKit(kitId, kitName) {
  const id = kitId ? str(String(kitId), 40).replace(/[^\w-]/g, '') : '';
  return id ? { kitId: id, kitName: str(kitName, 60) || 'Custom kit' } : { kitId: undefined, kitName: undefined };
}

/** Prices raw lines [{productId, quantity, kitId?, kitName?}] (used for guests and for the stored cart). */
export async function quote(rawLines, coupon) {
  const valid = rawLines.filter((l) => isObjectId(String(l.productId)) && Number(l.quantity) > 0);
  const products = await getProductsByIds(valid.map((l) => l.productId));
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = valid
    .map((l) => ({ product: byId.get(String(l.productId)), quantity: Math.min(99, Math.floor(Number(l.quantity))), ...cleanKit(l.kitId, l.kitName) }))
    .filter((l) => l.product);
  return { ...priceCart(lines, coupon), missing: valid.length - lines.length };
}

/** Prices the user's stored cart and removes lines whose products no longer exist. */
export async function cartPayload(user, coupon) {
  const raw = user.cart.map((l) => ({ productId: String(l.product), quantity: l.quantity, kitId: l.kitId, kitName: l.kitName }));
  const result = await quote(raw, coupon);
  if (result.missing > 0) {
    const ids = new Set(result.items.map((i) => i.productId));
    user.cart = user.cart.filter((l) => ids.has(String(l.product)));
    await user.save();
  }
  const { missing, ...rest } = result;
  return rest;
}

/** Total quantity of a product across every cart line (kits included). */
function totalFor(user, productId) {
  return user.cart.filter((l) => String(l.product) === String(productId)).reduce((s, l) => s + l.quantity, 0);
}

export async function addItem(user, { productId, quantity = 1, kitId, kitName }, { clamp = false } = {}) {
  if (!isObjectId(String(productId))) throw badRequest('Invalid product.');
  const qty = Math.floor(Number(quantity));
  if (!(qty >= 1 && qty <= 99)) throw badRequest('Quantity must be between 1 and 99.');
  const [product] = await getProductsByIds([productId]);
  if (!product) throw notFound('That product is no longer available.');
  if (product.stock <= 0) throw conflict(`${product.name} is out of stock.`, { available: 0 });

  const kit = cleanKit(kitId, kitName);
  const have = totalFor(user, productId);
  const room = product.stock - have;
  if (qty > room) {
    if (!clamp) throw conflict(room > 0 ? `Only ${product.stock} of ${product.name} in stock${have ? ` (you already have ${have} in your cart)` : ''}.` : `You already have all ${product.stock} available ${product.name} in your cart.`, { available: product.stock, inCart: have });
    if (room <= 0) return false;
  }
  const add = Math.min(qty, room);
  const line = user.cart.find((l) => sameLine(l, productId, kit.kitId));
  if (line) line.quantity += add;
  else user.cart.push({ product: productId, quantity: add, kitId: kit.kitId, kitName: kit.kitName });
  return true;
}

export async function setQuantity(user, productId, quantity, kitId) {
  if (!isObjectId(String(productId))) throw badRequest('Invalid product.');
  const qty = Math.floor(Number(quantity));
  if (!(qty >= 0 && qty <= 99)) throw badRequest('Quantity must be between 0 and 99.');
  const line = user.cart.find((l) => sameLine(l, productId, kitId));
  if (!line) throw notFound('That item is not in your cart.');
  if (qty === 0) {
    user.cart = user.cart.filter((l) => l !== line);
    return;
  }
  const [product] = await getProductsByIds([productId]);
  if (!product) throw notFound('That product is no longer available.');
  const others = totalFor(user, productId) - line.quantity;
  if (qty + others > product.stock) throw conflict(`Only ${product.stock} of ${product.name} in stock.`, { available: product.stock });
  line.quantity = qty;
}
