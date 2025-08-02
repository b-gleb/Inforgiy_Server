import database from "../database";

export async function isRotaAdmin(branch, user_id) {
  const userEntry = await database.getUserRoles(user_id)

  if (userEntry === null){
    return false
  };

  if (Object.hasOwn(userEntry.roles, `admin_rota_${branch}`)){
    return true;
  } else {
    return false;
  };
};