const {
  listUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  setUserActivation,
  updateUserRole,
} = require("../usecases/users/userUsecases");

async function list(req, res, next) {
  try {
    const { page, pageSize, search, role } = req.query;
    const result = await listUsers(req.user, {
      page,
      pageSize,
      search,
      role,
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const user = await getUserById(req.user, req.params.id);
    return res.json(user);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const updated = await updateUserById(req.user, req.params.id, req.body || {});
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    await deleteUserById(req.user, req.params.id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function activate(req, res, next) {
  try {
    const { isActive } = req.body || {};
    const updated = await setUserActivation(req.user, req.params.id, Boolean(isActive));
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
}

async function changeRole(req, res, next) {
  try {
    const { role } = req.body || {};
    const updated = await updateUserRole(req.user, req.params.id, role);
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  list,
  getById,
  update,
  remove,
  activate,
  changeRole,
};

