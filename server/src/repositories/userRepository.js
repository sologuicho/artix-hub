const prisma = require('../prismaClient');

const PUBLIC_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
  bio: true,
  occupation: true,
  country: true,
  interests: true,
  createdAt: true
};

const AUTHOR_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
  occupation: true,
  country: true
};

exports.findById = (id) =>
  prisma.user.findUnique({ where: { id } });

exports.findByEmail = (email) =>
  prisma.user.findFirst({ where: { email: email.toLowerCase() } });

exports.findByUsername = (username) =>
  prisma.user.findUnique({ where: { username: username.toLowerCase() } });

exports.findPublicProfile = (id) =>
  prisma.user.findUnique({ where: { id }, select: PUBLIC_SELECT });

exports.create = (data) =>
  prisma.user.create({ data });

exports.update = (id, data) =>
  prisma.user.update({ where: { id }, data });

exports.delete = (id) =>
  prisma.user.delete({ where: { id } });

exports.AUTHOR_SELECT = AUTHOR_SELECT;
exports.PUBLIC_SELECT = PUBLIC_SELECT;
