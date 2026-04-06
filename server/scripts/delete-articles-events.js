const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteArticlesAndEvents() {
  try {
    console.log('🗑️  Eliminando artículos y eventos...');
    
    // Delete in correct order (respecting foreign keys)
    await prisma.reaction.deleteMany({
      where: {
        articleId: { not: null }
      }
    });
    console.log('✅ Reacciones de artículos eliminadas');

    await prisma.comment.deleteMany({
      where: {
        articleId: { not: null }
      }
    });
    console.log('✅ Comentarios de artículos eliminados');

    await prisma.eventRegistration.deleteMany({});
    console.log('✅ Registros de eventos eliminados');

    await prisma.eventReminder.deleteMany({});
    console.log('✅ Recordatorios de eventos eliminados');

    await prisma.eventCollaborator.deleteMany({});
    console.log('✅ Colaboradores de eventos eliminados');

    await prisma.articleCollaborator.deleteMany({});
    console.log('✅ Colaboradores de artículos eliminados');

    await prisma.savedItem.deleteMany({
      where: {
        OR: [
          { articleId: { not: null } },
          { eventId: { not: null } }
        ]
      }
    });
    console.log('✅ Items guardados relacionados eliminados');

    const deletedArticles = await prisma.article.deleteMany({});
    console.log(`✅ ${deletedArticles.count} artículos eliminados`);

    const deletedEvents = await prisma.event.deleteMany({});
    console.log(`✅ ${deletedEvents.count} eventos eliminados`);

    console.log('✨ ¡Eliminación completada exitosamente!');
  } catch (error) {
    console.error('❌ Error eliminando registros:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteArticlesAndEvents();

