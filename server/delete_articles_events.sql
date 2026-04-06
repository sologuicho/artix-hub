-- Eliminar todos los registros de artículos y eventos
DELETE FROM "Reaction" WHERE "articleId" IS NOT NULL OR "eventId" IS NOT NULL;
DELETE FROM "Comment" WHERE "articleId" IS NOT NULL;
DELETE FROM "EventRegistration";
DELETE FROM "EventReminder";
DELETE FROM "EventCollaborator";
DELETE FROM "ArticleCollaborator";
DELETE FROM "SavedItem" WHERE "articleId" IS NOT NULL OR "eventId" IS NOT NULL;
DELETE FROM "Article";
DELETE FROM "Event";

