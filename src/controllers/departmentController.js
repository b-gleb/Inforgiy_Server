import Joi from 'joi';
import cache, { longTTL } from '../utils/cache.js';
import { validateBranch } from '../utils/responseValidation.js';

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
    const paramsSchema = Joi.object({
      departmentSlug: validateBranch.required()
    });

    const { error: paramsError, value: params } = paramsSchema.validate(req.params ?? {});
    if (paramsError) return res.status(400).send(paramsError.details[0].message);

    const cacheKey = `get.department.${params.departmentSlug}`;
    let departmentEntry = cache.get(cacheKey);

    if (departmentEntry === undefined) {
      departmentEntry = await database.getDepartmentBySlug(params.departmentSlug);
      cache.set(cacheKey, departmentEntry, longTTL);
    }

    return res.json(departmentEntry);
  };

  return {
    getDepartments,
    getDepartmentBySlug
  };
}
