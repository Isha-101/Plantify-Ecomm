export const formatINR = (n) => {
  const v = Number(n) || 0;
  return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
};
export const formatDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!d) return '';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN', opts);
};
export const formatDateTime = (d) => formatDate(d, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const pluralize = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

export const LIGHT_LABEL = { low: 'Low light', medium: 'Medium light', 'bright-indirect': 'Bright indirect', 'bright-direct': 'Direct sun', unsure: 'Not sure' };
export const DIFFICULTY_LABEL = { easy: 'Easy', moderate: 'Moderate', hard: 'Expert' };
export const PET_LABEL = { safe: 'Pet-safe', toxic: 'Toxic to pets', unknown: 'Pet safety unknown', na: '' };
export const TYPE_LABEL = { foliage: 'Foliage', flowering: 'Flowering', succulent: 'Succulent', herb: 'Herb' };
export const ROOM_LABEL = { bedroom: 'Bedroom', 'living-room': 'Living Room', study: 'Study', bathroom: 'Bathroom', balcony: 'Balcony', office: 'Office', other: 'Other' };
export const CATEGORY_LABEL = {
  'indoor-plants': 'Indoor Plants', 'outdoor-plants': 'Outdoor Plants', succulents: 'Succulents', 'flowering-plants': 'Flowering Plants', seeds: 'Seeds',
  'pots-planters': 'Pots & Planters', 'gardening-tools': 'Gardening Tools', 'soil-fertilizers': 'Soil & Fertilizers', 'plant-accessories': 'Plant Accessories', 'plant-kits': 'Plant Kits',
};
export const TASK_LABEL = { water: 'Water', fertilize: 'Fertilise', mist: 'Mist', rotate: 'Rotate', prune: 'Prune / deadhead', repot: 'Repot', clean: 'Clean leaves', 'pest-check': 'Pest check' };
export const MOOD_LABEL = { great: 'Thriving', good: 'Happy', okay: 'Okay', struggling: 'Struggling' };
export const ORDER_STAGES = ['Order Placed', 'Processing', 'Packed', 'Shipped', 'Delivered'];

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const stockLabel = (stock) => (stock <= 0 ? 'Out of stock' : stock <= 5 ? `Only ${stock} left` : 'In stock');
