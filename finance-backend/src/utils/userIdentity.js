const { Op } = require('sequelize');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value);

const getUserUuid = (user) => {
  const candidate = user?._id || user?.uuid || user?.userUuid;
  return isUuid(String(candidate || '')) ? String(candidate) : null;
};

const getLegacyUserId = (user) => {
  const candidate = user?.legacyId ?? user?.legacyUserId ?? user?.integerId;
  if (candidate !== undefined && candidate !== null && /^\d+$/.test(String(candidate))) {
    return Number(candidate);
  }

  if (user?.id !== undefined && user?.id !== null && /^\d+$/.test(String(user.id))) {
    return Number(user.id);
  }

  return null;
};

const getRuntimeUserId = (user) => getUserUuid(user) || getLegacyUserId(user);

const findUserByRuntimeId = async (User, value) => {
  if (!value) return null;
  const id = String(value);

  if (isUuid(id)) {
    return User.findOne({ where: { _id: id } });
  }

  if (/^\d+$/.test(id)) {
    return User.findOne({
      where: {
        [Op.or]: [
          { id: Number(id) },
          { legacyId: Number(id) },
        ],
      },
    });
  }

  return null;
};

const publicUser = (user) => {
  const raw = user?.toJSON ? user.toJSON() : { ...(user || {}) };
  delete raw.password;

  const uuid = getUserUuid(raw);
  const legacyId = getLegacyUserId(raw);

  return {
    ...raw,
    id: uuid || legacyId,
    _id: uuid,
    legacyId,
    userId: uuid || legacyId,
  };
};

module.exports = {
  isUuid,
  getUserUuid,
  getLegacyUserId,
  getRuntimeUserId,
  findUserByRuntimeId,
  publicUser,
};
