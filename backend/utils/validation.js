export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const POSITIONS = [
  'setter',
  'libero',
  'outside_hitter',
  'middle_blocker',
  'opposite',
];

export function requireFields(body, fields) {
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === '') {
      throw new HttpError(400, `Missing required field: ${f}`);
    }
  }
}

export function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
