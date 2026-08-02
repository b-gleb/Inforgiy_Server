export default function makeDepartmentController(database) {
  const getDepartmentBySlug = async (req, res) => {
    const departmentEntry = await database.getDepartmentBySlug(req.params.slug);

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
