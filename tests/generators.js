export function generateUser(branch, id) {
  return {
    telegram: `@username_${id}`,
    telegram_id: id,
    roles: {
      [`rota_${branch}`]: {
        nick: `Nick_${id}`,
        c: 0
      }
    }
  };
}

export function generateAdmin(branch, id) {
  const user = generateUser(branch, id);
  user.roles[`admin_rota_${branch}`] = null;
  return user;
}

export function generateDateRangeStats(userIds) {
  return userIds.map(id => ({
    _id: id,
    count: Math.floor(Math.random() * 30) + 1
  }));
}

export function generateCumulativeStats(dateRanges) {
  return dateRanges.reduce((acc, range, idx) => {
    acc[`range_${idx}`] = [
      {
        count: Math.floor(Math.random() * 30) + 1,
        date: new Date(range[0])
      }
    ];
    return acc;
  }, {});
}

export function generateEmptyDutiesStats(dateRanges, count = 10) {
  return dateRanges.reduce((acc, _range, idx) => {
    acc[`range_${idx}`] = count === 0 ? [] : [{ count }];
    return acc;
  }, {});
}

export function generateTakenDutiesStats(dateRanges, count = 10) {
  return dateRanges.reduce((acc, _range, idx) => {
    acc[`range_${idx}`] = count === 0 ? [] : [{ count }];
    return acc;
  }, {});
}

export function generateUniqueUsersStats(dateRanges, count = 10) {
  return dateRanges.reduce((acc, _range, idx) => {
    acc[`range_${idx}`] = count === 0 ? [] : [{ count }];
    return acc;
  }, {});
}
