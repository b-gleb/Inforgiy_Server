import { getDB } from '../database.js';

export async function isRotaAdmin(branch, user_id) {
  const mongo_db = getDB();
  const userEntry = await mongo_db.collection('users').findOne(
    { telegram_id: user_id },
    { projection: {roles: 1} }
  );

  if (userEntry === null){
    return false
  }

  if (Object.hasOwn(userEntry.roles, `admin_rota_${branch}`)){
    return true;
  } else {
    return false;
  }
};