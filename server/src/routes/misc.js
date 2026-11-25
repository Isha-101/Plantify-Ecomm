import { Router } from 'express';
import { Subscriber, ContactMessage } from '../models/misc.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Validator, isEmail, str } from '../utils/validate.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { COUPONS } from '../services/pricing.js';

const router = Router();
const limiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20 });

router.post(
  '/newsletter',
  limiter,
  asyncHandler(async (req, res) => {
    const email = str(req.body?.email, 120).toLowerCase();
    new Validator().check('email', isEmail(email), 'Please enter a valid email address.').done('Please enter a valid email address.');
    const existing = await Subscriber.findOne({ email });
    if (!existing) await Subscriber.create({ email });
    res.status(existing ? 200 : 201).json({ message: existing ? 'You are already on the list – thank you!' : 'Welcome to the Plantify garden! Watch your inbox for care tips.', alreadySubscribed: !!existing });
  })
);

router.post(
  '/contact',
  limiter,
  asyncHandler(async (req, res) => {
    const { name, email, subject, message } = req.body || {};
    const v = new Validator();
    v.check('name', str(name, 80).length >= 2, 'Please enter your name.');
    v.check('email', isEmail(email), 'Please enter a valid email address.');
    v.check('message', str(message, 2000).length >= 10, 'Please write at least 10 characters.');
    v.done();
    await ContactMessage.create({ name: str(name, 80), email: str(email, 120), subject: str(subject, 120), message: str(message, 2000) });
    res.status(201).json({ message: 'Thanks for getting in touch – we will reply soon.' });
  })
);

router.get('/coupons', (_req, res) => res.json({ coupons: Object.entries(COUPONS).map(([code, c]) => ({ code, label: c.label })) }));

export default router;
