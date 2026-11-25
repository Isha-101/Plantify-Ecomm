import { Validator, str } from './validate.js';

/** Validates and normalises an Indian-style shipping address. Throws a 400 with field errors. */
export function parseAddress(body = {}) {
  const a = {
    label: str(body.label, 30) || 'Home',
    fullName: str(body.fullName, 80),
    phone: str(body.phone, 15).replace(/\D/g, '').slice(-10),
    line1: str(body.line1, 120),
    line2: str(body.line2, 120),
    city: str(body.city, 60),
    state: str(body.state, 60),
    pincode: str(body.pincode, 10).replace(/\D/g, ''),
    isDefault: !!body.isDefault,
  };
  const v = new Validator();
  v.check('fullName', a.fullName.length >= 2, 'Enter the recipient’s full name.');
  v.check('phone', /^[0-9]{10}$/.test(a.phone), 'Enter a 10-digit mobile number.');
  v.check('line1', a.line1.length >= 3, 'Enter the address (house / street).');
  v.check('city', a.city.length >= 2, 'Enter the city.');
  v.check('state', a.state.length >= 2, 'Enter the state.');
  v.check('pincode', /^[0-9]{6}$/.test(a.pincode), 'Enter a 6-digit PIN code.');
  v.done();
  return a;
}
