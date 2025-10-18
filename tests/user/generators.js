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
