import cache, { longTTL } from '../utils/cache.js';

export default function makeDepartmentController(database) {
  const getDepartmentBySlug = async (req, res) => {
    const slug = req.params.slug;
    const cacheKey = `get.department.${slug}`;
    let departmentEntry = cache.get(cacheKey);

    if (departmentEntry === undefined) {
      departmentEntry = await database.getDepartmentBySlug(slug);
      cache.set(cacheKey, departmentEntry, longTTL);
    }

    if (departmentEntry === null) {
      return res.status(404).send('Department not found');
    } else {
      return res.json(departmentEntry);
    }
  };

  return {
    getDepartmentBySlug
  };
}
