const prisma = require('../prismaClient');

const AUTHOR_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
  occupation: true,
  country: true
};

exports.findById = (id) =>
  prisma.article.findUnique({
    where: { id },
    include: {
      author: { select: AUTHOR_SELECT },
      comments: {
        include: { author: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

exports.findMany = ({ where, skip, take, orderBy } = {}) =>
  prisma.article.findMany({
    where,
    skip,
    take,
    include: {
      author: { select: AUTHOR_SELECT },
      _count: { select: { comments: true } }
    },
    orderBy: orderBy || { createdAt: 'desc' }
  });

exports.count = (where) =>
  prisma.article.count({ where });

exports.create = (data) =>
  prisma.article.create({
    data,
    include: { author: { select: AUTHOR_SELECT } }
  });

exports.update = (id, data) =>
  prisma.article.update({
    where: { id },
    data,
    include: { author: { select: AUTHOR_SELECT } }
  });

exports.delete = (id) =>
  prisma.article.delete({ where: { id } });

exports.findDraftsByUser = (userId, take = 5) =>
  prisma.article.findMany({
    where: { authorId: userId, status: 'draft' },
    orderBy: { updatedAt: 'desc' },
    take,
    include: { author: { select: AUTHOR_SELECT } }
  });

exports.AUTHOR_SELECT = AUTHOR_SELECT;
