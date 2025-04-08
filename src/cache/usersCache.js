const usersCache = {'lns': {}, 'gp': {}, 'di': {}, 'orel': {}, 'ryaz': {}};
const usersCacheTTL = 24 * 3600 * 1000; // 24hr in miliseconds

module.exports = {
  usersCache,
  usersCacheTTL
}