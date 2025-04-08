const { getDB } = require('../config/db');
const { usersCache, usersCacheTTL } = require('../cache/usersCache');



async function convertUserId(branch, user_id) {
  const mongo_db = getDB();
  
  // Check cache
  if (usersCache[branch][user_id]){
    return usersCache[branch][user_id];
  }

  // Get user from DB
  const userEntry = await mongo_db.collection('users').findOne(
    {telegram_id: user_id},
    {projection: {telegram: 1, roles: 1, _id: 0}}
  );


  if (userEntry === null) {
    return null;
  }

  // Save information to cache
  usersCache[branch][user_id] = {
    username: userEntry.telegram,
    nick: userEntry?.roles[`rota_${branch}`]?.nick ?? userEntry.telegram,
    color: userEntry?.roles[`rota_${branch}`]?.c ?? null,
  }

  // Self-destructing cache
  setTimeout(() => {
    delete usersCache[branch][user_id];
  }, usersCacheTTL);

  const userObj = usersCache[branch][user_id];
  userObj.id = user_id;

  return userObj;
}


async function convertListRota(branch, data) {
  const result = [];

  for (let index = 0; index < 24; index++) {
    // Create the time range string
    const startHour = String(index).padStart(2, '0');
    const endHour = String(index + 1).padStart(2, '0');
    const label = `${startHour}:00-${endHour}:00`;

    if (data && data[index]) {
      // Process user_ids asynchronously and convert them to usernames
      const userArray = [];
      await Promise.all(
        data[index].map(async (userId) => {
          const userObj = await convertUserId(branch, userId)
          userArray.push(userObj);
        })
      );

      result.push({
        users: userArray,
        label: label
      });
    } else {
      // Use an empty object if no data is available
      result.push({
        users: [],
        label: label
      });
    }
  }

  return result;
}

module.exports = {
  convertUserId,
  convertListRota
}