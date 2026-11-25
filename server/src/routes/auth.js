import { Router } from 'express';
import { User, LIGHT_LEVELS, PLANT_TYPES } from '../models/User.js';
import { protect, signToken } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound, unauthorized } from '../utils/httpError.js';
import { Validator, isEmail, validatePassword, str, oneOf, arrayOf, assertObjectId } from '../utils/validate.js';
import { publicUser } from '../services/serialize.js';
import { parseAddress } from '../utils/address.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: 'Too many sign-in attempts. Please wait a few minutes and try again.' });

function applyPreferences(user, p = {}) {
  const pref = user.preferences;
  if (p.experience) pref.experience = oneOf(p.experience, ['beginner', 'intermediate', 'expert'], pref.experience);
  if (p.preferredTypes) pref.preferredTypes = arrayOf(p.preferredTypes, PLANT_TYPES);
  if (p.lightConditions) pref.lightConditions = oneOf(p.lightConditions, [...LIGHT_LEVELS, 'unsure'], pref.lightConditions);
  if (p.pets) pref.pets = oneOf(p.pets, ['yes', 'no', 'unspecified'], pref.pets);
  if (p.petInfo !== undefined) pref.petInfo = str(p.petInfo, 120);
  if (p.climate) pref.climate = oneOf(p.climate, ['tropical-india', 'temperate-north', 'temperate-south'], pref.climate);
}

router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { name, email, password, preferences } = req.body || {};
    const v = new Validator();
    v.check('name', str(name, 60).length >= 2, 'Please enter your name (at least 2 characters).');
    v.check('email', isEmail(email), 'Please enter a valid email address.');
    const pwErr = validatePassword(password);
    v.check('password', !pwErr, pwErr);
    v.done();

    if (await User.exists({ email: email.trim().toLowerCase() })) throw badRequest('An account with this email already exists.', { email: 'This email is already registered.' });

    const user = new User({ name: str(name, 60), email: email.trim().toLowerCase(), password });
    applyPreferences(user, preferences);
    await user.save();
    res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
  })
);

router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    const v = new Validator();
    v.check('email', isEmail(email), 'Please enter a valid email address.');
    v.check('password', typeof password === 'string' && password.length > 0, 'Please enter your password.');
    v.done();

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    // Same message for unknown email and wrong password.
    if (!user || !(await user.comparePassword(password))) throw unauthorized('Incorrect email or password.');
    res.json({ token: signToken(user.id), user: publicUser(user) });
  })
);

router.get('/me', protect, (req, res) => res.json({ user: publicUser(req.user) }));

router.put(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    const { name, profile = {}, preferences } = req.body || {};
    const user = req.user;
    const v = new Validator();
    if (name !== undefined) v.check('name', str(name, 60).length >= 2, 'Please enter your name (at least 2 characters).');
    v.done();
    if (name !== undefined) user.name = str(name, 60);
    if (profile.phone !== undefined) user.profile.phone = str(profile.phone, 15);
    if (profile.city !== undefined) user.profile.city = str(profile.city, 60);
    if (profile.bio !== undefined) user.profile.bio = str(profile.bio, 240);
    applyPreferences(user, preferences);
    await user.save();
    res.json({ user: publicUser(user) });
  })
);

router.put(
  '/me/password',
  protect,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    const user = await User.findById(req.user.id).select('+password');
    if (!(await user.comparePassword(String(currentPassword || '')))) throw badRequest('Your current password is incorrect.', { currentPassword: 'Incorrect password.' });
    const err = validatePassword(newPassword);
    if (err) throw badRequest(err, { newPassword: err });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated.' });
  })
);

// ───── Saved addresses ─────
const addressFrom = parseAddress;

router.post(
  '/addresses',
  protect,
  asyncHandler(async (req, res) => {
    const a = addressFrom(req.body);
    const user = req.user;
    if (a.isDefault || !user.addresses.length) {
      user.addresses.forEach((x) => (x.isDefault = false));
      a.isDefault = true;
    }
    if (user.addresses.length >= 10) throw badRequest('You can save up to 10 addresses.');
    user.addresses.push(a);
    await user.save();
    res.status(201).json({ user: publicUser(user) });
  })
);

router.put(
  '/addresses/:id',
  protect,
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'address id');
    const addr = req.user.addresses.id(req.params.id);
    if (!addr) throw notFound('Address not found.');
    const a = addressFrom({ ...addr.toObject(), ...req.body });
    if (a.isDefault) req.user.addresses.forEach((x) => (x.isDefault = false));
    addr.set(a);
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  })
);

router.delete(
  '/addresses/:id',
  protect,
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'address id');
    const addr = req.user.addresses.id(req.params.id);
    if (!addr) throw notFound('Address not found.');
    const wasDefault = addr.isDefault;
    addr.deleteOne();
    if (wasDefault && req.user.addresses.length) req.user.addresses[0].isDefault = true;
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  })
);

export default router;
