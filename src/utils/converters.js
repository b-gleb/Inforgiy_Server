import { usersCache, usersCacheTTL } from '../cache/usersCache.js';

export default function makeCoverters(database) {
  /**
    Converts userId into username. Checks cache values first
  */
  const convertUserId = async (branch, userId) => {
    // Check cache
    if (usersCache[branch][userId]) {
      return usersCache[branch][userId];
    }

    // Get user from DB
    const userEntry = await database.getUser(userId);

    if (userEntry === null) {
      return null;
    }

    // Save information to cache
    usersCache[branch][userId] = {
      username: userEntry.telegram,
      nick: userEntry?.roles[`rota_${branch}`]?.nick ?? userEntry.telegram,
      color: userEntry?.roles[`rota_${branch}`]?.c ?? null
    };

    // Self-destructing cache
    setTimeout(() => {
      delete usersCache[branch][userId];
    }, usersCacheTTL).unref();

    const userObj = usersCache[branch][userId];
    userObj.id = userId;

    return userObj;
  };

  /**
    Converts rota from DB by adding hour ranges and converting userIds into usernames
  */
  const convertListRota = async (branch, data) => {
    const result = [];

    for (let index = 0; index < 24; index++) {
      // Create the time range string
      const startHour = String(index).padStart(2, '0');
      const endHour = String(index + 1).padStart(2, '0');
      const label = `${startHour}:00-${endHour}:00`;

      if (data?.[index]) {
        // Process userIds asynchronously and convert them to usernames
        const userArray = [];
        await Promise.all(
          data[index].map(async userId => {
            const userObj = await convertUserId(branch, userId);
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
  };

  return {
    convertUserId,
    convertListRota
  };
}
