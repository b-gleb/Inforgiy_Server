import { getDB } from '../database.js';
import { isBefore, formatISO, addDays, isAfter, isEqual } from "date-fns";


export function formatInitData(initDataUnsafe){
  initDataUnsafe.user.id = parseInt(initDataUnsafe.user.id, 10)
  initDataUnsafe.user.allows_write_to_pm = Boolean(initDataUnsafe.user.allows_write_to_pm)
  initDataUnsafe.auth_date = parseInt(initDataUnsafe.auth_date, 10)

  if (initDataUnsafe.user?.is_premium !== undefined) {
    initDataUnsafe.user.is_premium = Boolean(initDataUnsafe.user.is_premium);
  }

  if (initDataUnsafe.can_send_after){initDataUnsafe.can_send_after = parseInt(initDataUnsafe?.can_send_after, 10)}

  return initDataUnsafe
}


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
}


export async function statistic(initDataUnsafe, action, sub_action = null, misc = null) {
  if (process.env.ENV === 'TEST') {
    return
  }

  const mongo_db = getDB();

  const user_entry = await mongo_db.collection('users').findOne(
    {telegram_id: initDataUnsafe.user.id},
    {projection: {region: 1, _id: 0}}
  );

  const user_region = user_entry?.region ?? null;

  const new_entry = {
    date: new Date(),
    action: action,
    sub_action: sub_action,
    misc: misc,
    user_id: initDataUnsafe.user.id,
    username: initDataUnsafe.user.username,
    user_region: user_region,
  };

  console.log(new_entry);
  await mongo_db.collection('usageStatistics').insertOne(new_entry);
}


export function fillMissingDates(data, startDate, endDate) {
  let result = [];
  let lastKnownCount = 0;
  let index = 0;
  let firstDataDate = data[0]?.date ?? startDate; // fallback to startDate when data is an empty array (ie no stats avaliable for user)

  // Fill missing dates before the first data point with zero
  while (isBefore(startDate, firstDataDate)) {
      result.push({ date: formatISO(startDate, { representation: 'complete' }), cumulativeCount: 0 });
      startDate = addDays(startDate, 1);
  }

  while (!isAfter(startDate, endDate)) {
      let dateStr = formatISO(startDate, { representation: 'complete' });

      if (index < data.length && isEqual(data[index].date, startDate)) {
          lastKnownCount = data[index].cumulativeCount;
          result.push({ date: dateStr, cumulativeCount: lastKnownCount });
          index++;
      } else {
          result.push({ date: dateStr, cumulativeCount: lastKnownCount });
      }
      
      startDate = addDays(startDate, 1);
  }
  
  return result;
}
