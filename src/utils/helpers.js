import { isBefore, formatISO, addDays, isAfter, isEqual } from 'date-fns';

export default function makeHelpers(database) {
  const formatInitData = initDataUnsafe => {
    initDataUnsafe.user.id = parseInt(initDataUnsafe.user.id, 10);
    initDataUnsafe.user.allows_write_to_pm = Boolean(
      initDataUnsafe.user.allows_write_to_pm
    );
    initDataUnsafe.auth_date = parseInt(initDataUnsafe.auth_date, 10);

    if (initDataUnsafe.user?.is_premium !== undefined) {
      initDataUnsafe.user.is_premium = Boolean(initDataUnsafe.user.is_premium);
    }

    if (initDataUnsafe.can_send_after) {
      initDataUnsafe.can_send_after = parseInt(
        initDataUnsafe?.can_send_after,
        10
      );
    }

    return initDataUnsafe;
  };

  const isRotaAdmin = async (branch, userId) => {
    const userEntry = await database.getUser(userId);

    if (userEntry === null) {
      return false;
    }

    if (Object.hasOwn(userEntry.roles, `admin_rota_${branch}`)) {
      return true;
    } else {
      return false;
    }
  };

  const isUserInBranch = async (branch, userId) => {
    const userEntry = await database.getUser(userId);

    if (userEntry === null) {
      return false;
    }

    if (Object.hasOwn(userEntry.roles, `rota_${branch}`)) {
      return true;
    } else {
      return false;
    }
  };

  const statistic = async (
    initDataUnsafe,
    action,
    sub_action = null,
    misc = null
  ) => {
    if (process.env.ENV === 'TEST') {
      return;
    }

    const userRegion = await database.getUserRegion(initDataUnsafe.user.id);

    const newEntry = {
      date: new Date(),
      action: action,
      sub_action: sub_action,
      misc: misc,
      user_id: initDataUnsafe.user.id,
      username: initDataUnsafe.user.username,
      user_region: userRegion
    };

    console.log(newEntry);
    await database.logUsageStatistics(newEntry);
  };

  const fillMissingDates = (data, startDate, endDate) => {
    const result = [];
    let lastKnownCount = 0;
    let index = 0;
    const firstDataDate = data[0]?.date ?? startDate; // fallback to startDate when data is an empty array (ie no stats avaliable for user)

    // Fill missing dates before the first data point with zero
    while (isBefore(startDate, firstDataDate)) {
      result.push({
        date: formatISO(startDate, { representation: 'complete' }),
        count: 0
      });
      startDate = addDays(startDate, 1);
    }

    while (!isAfter(startDate, endDate)) {
      const dateStr = formatISO(startDate, { representation: 'complete' });

      if (index < data.length && isEqual(data[index].date, startDate)) {
        lastKnownCount = data[index].count;
        result.push({ date: dateStr, count: lastKnownCount });
        index++;
      } else {
        result.push({ date: dateStr, count: lastKnownCount });
      }

      startDate = addDays(startDate, 1);
    }

    return result;
  };

  return {
    formatInitData,
    isRotaAdmin,
    isUserInBranch,
    statistic,
    fillMissingDates
  };
}
