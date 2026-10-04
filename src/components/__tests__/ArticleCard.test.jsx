import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ArticleCard from '../ArticleCard'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../ContentActions', () => ({
  default: () => <div data-testid="content-actions" />,
}))

import { useAuth } from '../../context/AuthContext'

const baseArticle = {
  id: 'article-1',
  title: 'Título del artículo de prueba',
  description: 'Descripción breve del artículo.',
  category: 'Tecnología',
  author: { id: 'user-1', name: 'Juan Pérez' },
  authorId: 'user-1',
  createdAt: '2025-01-15T00:00:00.000Z',
}

const renderCard = (article = baseArticle) =>
  render(
    <MemoryRouter>
      <ArticleCard article={article} onDelete={vi.fn()} />
    </MemoryRouter>
  )

describe('ArticleCard', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    useAuth.mockReturnValue({ user: null })
  })

  it('renders title and description', () => {
    renderCard()
    expect(screen.getByText(baseArticle.title)).toBeInTheDocument()
    expect(screen.getByText(baseArticle.description)).toBeInTheDocument()
  })

  it('renders the category badge', () => {
    renderCard()
    expect(screen.getByText('Tecnología')).toBeInTheDocument()
  })

  it('renders the author name', () => {
    renderCard()
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
  })

  it('renders the formatted date', () => {
    renderCard()
    // Date is formatted to es-ES locale
    expect(screen.getByText(/2025/)).toBeInTheDocument()
  })

  it('does not render ContentActions when user is not logged in', () => {
    useAuth.mockReturnValue({ user: null })
    renderCard()
    expect(screen.queryByTestId('content-actions')).not.toBeInTheDocument()
  })

  it('renders ContentActions when user is logged in', () => {
    useAuth.mockReturnValue({ user: { id: 'user-1', name: 'Juan Pérez' } })
    renderCard()
    expect(screen.getByTestId('content-actions')).toBeInTheDocument()
  })

  it('navigates to article page on click', () => {
    renderCard()
    fireEvent.click(screen.getByText(baseArticle.title))
    expect(mockNavigate).toHaveBeenCalledWith(`/articles/${baseArticle.id}`)
  })

  it('renders cover image when coverUrl is provided', () => {
    const article = { ...baseArticle, coverUrl: 'https://example.com/cover.jpg' }
    renderCard(article)
    expect(screen.getByRole('img', { name: article.title })).toBeInTheDocument()
  })

  it('renders placeholder gradient when no coverUrl', () => {
    const { container } = renderCard()
    // Gradient div exists when no cover image
    expect(container.querySelector('.from-blue-600')).toBeInTheDocument()
  })

  it('renders author occupation when provided', () => {
    const article = {
      ...baseArticle,
      author: { id: 'user-1', name: 'Ana López', occupation: 'Investigadora' },
    }
    renderCard(article)
    expect(screen.getByText('Investigadora')).toBeInTheDocument()
  })
})
