/**
 * Backfill script: index all published content and public user profiles in ai-core.
 *
 * Run once after enabling ai-core:
 *   node scripts/backfill-ai-index.js
 *
 * Env vars required: AI_CORE_URL, AI_CORE_KEY, DATABASE_URL
 * Optional: BATCH_DELAY_MS (default 200) — delay between batches to avoid overloading Ollama
 */

require('dotenv').config()

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const AI_CORE_URL = process.env.AI_CORE_URL
const AI_CORE_KEY = process.env.AI_CORE_KEY
const BATCH_DELAY_MS = parseInt(process.env.BATCH_DELAY_MS || '200', 10)

if (!AI_CORE_URL || !AI_CORE_KEY) {
  console.error('ERROR: AI_CORE_URL and AI_CORE_KEY must be set in .env')
  process.exit(1)
}

let indexed = 0
let failed  = 0

async function indexOne(doc) {
  try {
    const res = await fetch(`${AI_CORE_URL}/v1/index`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_CORE_KEY,
      },
      body: JSON.stringify(doc),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`${res.status}: ${text}`)
    }
    indexed++
  } catch (err) {
    console.error(`  FAIL [${doc.id}]: ${err.message}`)
    failed++
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Index articles ───────────────────────────────────────────────────────────
async function indexArticles() {
  const articles = await prisma.article.findMany({
    where: { status: 'published' },
    select: { id: true, title: true, content: true, category: true },
  })
  console.log(`\nArticles: ${articles.length} published`)
  for (const a of articles) {
    await indexOne({
      id:       `article-${a.id}`,
      entity:   'article',
      text:     `${a.title}\n\n${a.content}`,
      metadata: { artixId: a.id, category: a.category },
    })
    await sleep(BATCH_DELAY_MS)
  }
}

// ─── Index research ───────────────────────────────────────────────────────────
async function indexResearch() {
  const rows = await prisma.research.findMany({
    where: { status: 'published' },
    select: { id: true, title: true, content: true, category: true },
  })
  console.log(`\nResearch: ${rows.length} published`)
  for (const r of rows) {
    await indexOne({
      id:       `research-${r.id}`,
      entity:   'research',
      text:     `${r.title}\n\n${r.content}`,
      metadata: { artixId: r.id, category: r.category },
    })
    await sleep(BATCH_DELAY_MS)
  }
}

// ─── Index blog posts ─────────────────────────────────────────────────────────
async function indexBlogPosts() {
  const rows = await prisma.blogPost.findMany({
    where: { status: 'published' },
    select: { id: true, title: true, content: true, category: true },
  })
  console.log(`\nBlog posts: ${rows.length} published`)
  for (const p of rows) {
    await indexOne({
      id:       `post-${p.id}`,
      entity:   'post',
      text:     `${p.title || ''}\n\n${p.content}`,
      metadata: { artixId: p.id, category: p.category },
    })
    await sleep(BATCH_DELAY_MS)
  }
}

// ─── Index events ─────────────────────────────────────────────────────────────
async function indexEvents() {
  const rows = await prisma.event.findMany({
    where: { status: 'published' },
    select: { id: true, title: true, description: true, type: true },
  })
  console.log(`\nEvents: ${rows.length} published`)
  for (const e of rows) {
    await indexOne({
      id:       `event-${e.id}`,
      entity:   'event',
      text:     `${e.title}\n\n${e.description}`,
      metadata: { artixId: e.id, type: e.type },
    })
    await sleep(BATCH_DELAY_MS)
  }
}

// ─── Index user profiles (public fields only) ─────────────────────────────────
async function indexUsers() {
  const users = await prisma.user.findMany({
    where: { profileComplete: true, banned: false },
    select: { id: true, name: true, bio: true, occupation: true, interests: true },
  })
  console.log(`\nUser profiles: ${users.length} complete`)
  for (const u of users) {
    if (!u.name && !u.bio) continue // skip empty profiles
    const text = [
      u.name,
      u.occupation,
      u.bio,
      u.interests?.length ? `Intereses: ${u.interests.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    await indexOne({
      id:       `user-${u.id}`,
      entity:   'user',
      text,
      metadata: { artixId: u.id },
    })
    await sleep(BATCH_DELAY_MS)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`ai-core backfill — ${AI_CORE_URL}`)
  console.log('='.repeat(50))

  await indexArticles()
  await indexResearch()
  await indexBlogPosts()
  await indexEvents()
  await indexUsers()

  console.log('\n' + '='.repeat(50))
  console.log(`Done. Indexed: ${indexed}  Failed: ${failed}`)
}

main()
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
