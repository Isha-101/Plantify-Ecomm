import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/httpError.js';
import { getProductsByIds } from '../services/catalogueService.js';
import { checkCompatibility } from '../services/compatibility.js';

const router = Router();

router.post(
  '/check',
  asyncHandler(async (req, res) => {
    const ids = [...new Set((Array.isArray(req.body?.productIds) ? req.body.productIds : []).map(String))];
    if (ids.length < 2) throw badRequest('Choose at least two plants to compare.');
    if (ids.length > 6) throw badRequest('You can compare up to 6 plants at a time.');
    const products = await getProductsByIds(ids);
    if (products.length !== ids.length) throw badRequest('One of the selected plants could not be found.');
    const notPlants = products.filter((p) => !p.isPlant);
    if (notPlants.length) throw badRequest(`Only plants can be compared – remove ${notPlants.map((p) => p.name).join(', ')}.`);
    res.json(checkCompatibility(products));
  })
);

export default router;
