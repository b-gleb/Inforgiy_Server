import dotenv from 'dotenv';
dotenv.config();
import crypto from 'crypto';

export const validateInitData = initDataUnsafe => {
  const unixTime = Math.floor(Date.now() / 1000);

  if (
    process.env.ENV === 'PROD' &&
    unixTime - 3600 > initDataUnsafe.auth_date
  ) {
    return false;
  }

  const { hash, ...rest } = initDataUnsafe;
  const dataCheckString = Object.entries(rest)
    .sort()
    .map(([k, v]) => {
      if (typeof v === 'object' && v !== null) {
        v = JSON.stringify(v);
      }

      if (typeof v === 'string' && /(https?:\/\/[^\s]+)/.test(v)) {
        v = v.replace(/\//g, '\\/');
      }

      return `${k}=${v}`;
    })
    .join('\n');

  const secret = crypto
    .createHmac('sha256', 'WebAppData')
    .update(process.env.TOKEN);

  const calculatedHash = crypto
    .createHmac('sha256', secret.digest())
    .update(dataCheckString)
    .digest('hex');

  if (calculatedHash === hash) {
    return true;
  } else {
    return false;
  }
};
