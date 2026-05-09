const prisma = require('../prismaClient');

// Helper function to check if user can edit/delete content (including Artix Research content for luisflores01)
const canManageContent = async (authorId, userId, userUsername, userRole) => {
  // If user is the author, allow
  if (authorId === userId) return true;
  
  // If user is admin, allow
  if (userRole === 'ADMIN') return true;
  
  // If user is luisflores01 and content was published by Artix Research, allow
  if (userUsername === 'luisflores01') {
    const artixUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: 'artixresearch' },
          { username: 'artix-research' },
          { name: 'Artix Research' }
        ]
      }
    });
    if (artixUser && authorId === artixUser.id) {
      return true;
    }
  }
  
  return false;
};

// Get unique categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.research.findMany({
      where: {
        category: { not: null },
        status: { not: 'archived' }
      },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });

    const categoryList = categories
      .map(c => c.category)
      .filter(c => c && c.trim() !== '')
      .sort();

    res.json({ ok: true, categories: categoryList });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch categories' });
  }
};

// Get all research
exports.getAllResearch = async (req, res) => {
  try {
    const { search, category, author, status } = req.query;
    
    const where = {};
    // By default, exclude archived research unless explicitly requested
    if (status !== 'archived' && !req.query.includeArchived) {
      where.status = { not: 'archived' };
    } else {
      where.status = status || 'published';
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ];
    }

    if (category) {
      where.category = category;
    }

    if (author) {
      where.authorId = author;
    }

    const research = await prisma.research.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            bio: true
          }
        },
        _count: {
          select: {
            reactions: true,
            comments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ ok: true, research });
  } catch (error) {
    console.error('Error fetching research:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch research' });
  }
};

// Get single research
exports.getResearch = async (req, res) => {
  try {
    const { id } = req.params;
    const research = await prisma.research.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            bio: true
          }
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            },
            replies: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    avatar: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!research) {
      return res.status(404).json({ ok: false, message: 'Research not found' });
    }

    res.json({ ok: true, research });
  } catch (error) {
    console.error('Error fetching research:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch research' });
  }
};

// Get research preview
exports.getResearchPreview = async (req, res) => {
  try {
    const { id } = req.params;
    
    const research = await prisma.research.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    if (!research) {
      return res.status(404).json({ ok: false, message: 'Research not found' });
    }

    // Generate content preview: strip HTML tags and get first 200 words
    const strippedContent = research.content ? research.content.replace(/<[^>]*>?/gm, '') : '';
    const words = strippedContent.split(/\s+/).filter(word => word.length > 0);
    const contentPreview = words.slice(0, 200).join(' ') + (words.length > 200 ? '...' : '');

    res.json({
      ok: true,
      research: {
        id: research.id,
        title: research.title,
        description: research.description,
        category: research.category,
        tags: research.tags,
        coverImage: research.coverUrl || research.coverImage,
        author: research.author,
        createdAt: research.createdAt,
        readTime: research.readTime,
        contentPreview,
        isPreview: true
      }
    });
  } catch (error) {
    console.error('Error fetching research preview:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch research preview' });
  }
};

// Create research
exports.createResearch = async (req, res) => {
  try {
    const { title, content, description, category, tags, coverUrl, pdfUrl, documents, references, isCollaborative, publishAsArtixResearch } = req.body;
    const userId = req.user.id;
    
    // Si el usuario es luisflores01 y quiere publicar como Artix Research
    let authorId = userId;
    if (publishAsArtixResearch && req.user.username === 'luisflores01') {
      // Buscar o crear el usuario Artix Research
      let artixUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: 'artixresearch' },
            { username: 'artix-research' },
            { name: 'Artix Research' }
          ]
        }
      });
      
      if (!artixUser) {
        // Crear el usuario Artix Research si no existe
        artixUser = await prisma.user.create({
          data: {
            provider: 'system',
            providerId: 'artix-research',
            username: 'artixresearch',
            name: 'Artix Research',
            email: 'research@artixhub.com',
            role: 'user',
            profileComplete: true,
            bio: 'Cuenta oficial de investigación de Artix Hub. Publicamos artículos científicos, investigaciones avanzadas y contenido académico de alta calidad sobre física cuántica, inteligencia artificial, química computacional y más.',
            occupation: 'Organización de Investigación',
            country: 'Global',
            interests: ['Quantum Physics', 'AI Research', 'Chemistry', 'Machine Learning', 'Data Science']
          }
        });
      }
      
      authorId = artixUser.id;
    }

    const research = await prisma.research.create({
      data: {
        title,
        content,
        description: description || null,
        category: category || 'General',
        tags: tags || [],
        coverUrl: coverUrl || null,
        pdfUrl: pdfUrl || null,
        documents: documents && Array.isArray(documents) ? documents : [],
        references: references || [],
        isCollaborative: isCollaborative || false,
        status: 'reviewing', // Start in reviewing status
        authorId: authorId
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    // Schedule AI validation (similar to articles)
    setTimeout(async () => {
      try {
        // TODO: Implement AI validation for research
        // For now, auto-publish after 1 minute
        await prisma.research.update({
          where: { id: research.id },
          data: { status: 'published' }
        });
      } catch (error) {
        console.error('Error in research validation:', error);
      }
    }, 60000); // 1 minute

    res.status(201).json({ ok: true, research });
  } catch (error) {
    console.error('Error creating research:', error);
    res.status(500).json({ ok: false, message: 'Failed to create research' });
  }
};

// Update research
exports.updateResearch = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, description, category, tags, coverUrl, pdfUrl, documents, references } = req.body;
    const userId = req.user.id;

    const existing = await prisma.research.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ ok: false, message: 'Research not found' });
    }
    if (existing.authorId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ ok: false, message: 'Not authorized' });
    }

    const research = await prisma.research.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
        ...(coverUrl !== undefined && { coverUrl }),
        ...(pdfUrl !== undefined && { pdfUrl }),
        ...(documents !== undefined && { documents: Array.isArray(documents) ? documents : [] }),
        ...(references !== undefined && { references: Array.isArray(references) ? references : [] })
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    res.json({ ok: true, research });
  } catch (error) {
    console.error('Error updating research:', error);
    res.status(500).json({ ok: false, message: 'Failed to update research' });
  }
};

// Archive/Unarchive research
exports.archiveResearch = async (req, res) => {
  try {
    const { id } = req.params;
    const { archived } = req.body;
    const userId = req.user.id;

    const existing = await prisma.research.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ ok: false, message: 'Research not found' });
    }
    
    const canArchive = await canManageContent(existing.authorId, userId, req.user.username, req.user.role);
    if (!canArchive) {
      return res.status(403).json({ ok: false, message: 'Not authorized' });
    }

    const research = await prisma.research.update({
      where: { id },
      data: { status: archived ? 'archived' : 'published' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    res.json({ ok: true, research, message: archived ? 'Research archived' : 'Research unarchived' });
  } catch (error) {
    console.error('Error archiving research:', error);
    res.status(500).json({ ok: false, message: 'Failed to archive research' });
  }
};

// Delete research
exports.deleteResearch = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await prisma.research.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ ok: false, message: 'Research not found' });
    }
    
    const canDelete = await canManageContent(existing.authorId, userId, req.user.username, req.user.role);
    if (!canDelete) {
      return res.status(403).json({ ok: false, message: 'Not authorized' });
    }

    await prisma.research.delete({ where: { id } });
    res.json({ ok: true, message: 'Research deleted' });
  } catch (error) {
    console.error('Error deleting research:', error);
    res.status(500).json({ ok: false, message: 'Failed to delete research' });
  }
};

