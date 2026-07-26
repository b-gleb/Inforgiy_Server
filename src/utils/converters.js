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
    // Build the labels and per-hour userId lists up front (synchronous)
    const hours = Array.from({ length: 24 }, (_, index) => {
      const startHour = String(index).padStart(2, '0');
      const endHour = String(index + 1).padStart(2, '0');
      return {
        label: `${startHour}:00-${endHour}:00`,
        userIds: data?.[index] ?? []
      };
    });

    // Flatten all userIds across all hours into one array of conversion promises
    const allConversions = await Promise.all(
      hours.flatMap(({ userIds }) => userIds.map(userId => convertUserId(branch, userId)))
    );

    // Walk through the flattened results, slicing them back out per hour
    let cursor = 0;
    const result = hours.map(({ label, userIds }) => {
      const users = allConversions.slice(cursor, cursor + userIds.length);
      cursor += userIds.length;
      return { users, label };
    });

    return result;
  };

  return {
    convertUserId,
    convertListRota
  };
}
