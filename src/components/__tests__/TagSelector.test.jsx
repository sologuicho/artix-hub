import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import TagSelector from '../TagSelector'

describe('TagSelector', () => {
  const renderSelector = (props = {}) => {
    const onChange = vi.fn()
    render(<TagSelector tags={[]} onChange={onChange} {...props} />)
    return { onChange }
  }

  it('renders the input with placeholder', () => {
    renderSelector({ placeholder: 'Añade etiquetas' })
    expect(screen.getByPlaceholderText('Añade etiquetas')).toBeInTheDocument()
  })

  it('displays existing tags', () => {
    renderSelector({ tags: ['React', 'Vitest'] })
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Vitest')).toBeInTheDocument()
  })

  it('calls onChange with new tag when Enter is pressed', () => {
    const { onChange } = renderSelector({ tags: [] })
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'NuevoTag' } })
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 })
    expect(onChange).toHaveBeenCalledWith(['NuevoTag'])
  })

  it('does not add duplicate tags', () => {
    const { onChange } = renderSelector({ tags: ['React'] })
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'React' } })
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('does not add empty tags', () => {
    const { onChange } = renderSelector({ tags: [] })
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('removes a tag when its delete button is clicked', () => {
    const { onChange } = renderSelector({ tags: ['React', 'Vitest'] })
    const deleteButtons = screen.getAllByRole('button')
    // First button that's a delete (the X next to a tag)
    fireEvent.click(deleteButtons[0])
    expect(onChange).toHaveBeenCalled()
    const newTags = onChange.mock.calls[0][0]
    expect(newTags).toHaveLength(1)
  })

  it('trims whitespace from new tags', () => {
    const { onChange } = renderSelector({ tags: [] })
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '  JavaScript  ' } })
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 })
    expect(onChange).toHaveBeenCalledWith(['JavaScript'])
  })

  it('shows suggestions when typing', () => {
    renderSelector({ context: 'articles' })
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Tecnol' } })
    expect(screen.getByText('Tecnología')).toBeInTheDocument()
  })

  it('adds a tag when a suggestion is clicked', () => {
    const { onChange } = renderSelector({ tags: [], context: 'articles' })
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Tecnol' } })
    fireEvent.click(screen.getByText('Tecnología'))
    expect(onChange).toHaveBeenCalledWith(['Tecnología'])
  })

  it('clears input after adding a tag via suggestion', () => {
    renderSelector({ tags: [], context: 'articles' })
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Tecnol' } })
    fireEvent.click(screen.getByText('Tecnología'))
    expect(input).toHaveValue('')
  })
})
