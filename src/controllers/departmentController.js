import cache, { longTTL } from '../utils/cache.js';

export default function makeDepartmentController(database) {
  const getDepartments = async (_req, res) => {
    const cacheKey = 'get.departments';
    let rotaArray = cache.get(cacheKey);

    if (rotaArray === undefined) {
      const rotaEntries = await database.getDepartments();

      rotaArray = rotaEntries.map(entry => ({
        slug: entry.slug,
        name: entry.name,
        maxDuties: entry.maxDuties
      }));

      // Cache the full array
      cache.set(cacheKey, rotaArray, longTTL);

      // Cache each department individually
      rotaArray.forEach(department => {
        cache.set(`get.department.${department.slug}`, department, longTTL);
      });
    }

    return res.json(rotaArray);
  };

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
    getDepartments,
    getDepartmentBySlug
  };
}
