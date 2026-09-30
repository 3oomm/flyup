import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PreviewStory from './PreviewStory'
import { getSafeStoryImageHref } from '../../lib/storyImageLink'

describe('story image links', () => {
  it('accepts regular HTTP links and rejects unsafe or malformed links', () => {
    expect(getSafeStoryImageHref(' https://example.com/page ')).toBe('https://example.com/page')
    expect(getSafeStoryImageHref('http://example.com/page')).toBe('http://example.com/page')
    expect(getSafeStoryImageHref('javascript:alert(1)')).toBeNull()
    expect(getSafeStoryImageHref('data:text/html,test')).toBeNull()
    expect(getSafeStoryImageHref('/relative-page')).toBeNull()
    expect(getSafeStoryImageHref('https://user:pass@example.com')).toBeNull()
  })

  it('opens a valid image link in a new tab', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const { container } = render(
      <PreviewStory story={'<span data-href="https://example.com/page"><img src="/image.png" alt="linked image"></span>'} />,
    )

    fireEvent.click(container.querySelector('img')!)
    expect(open).toHaveBeenCalledWith('https://example.com/page', '_blank', 'noopener,noreferrer')
    open.mockRestore()
  })

  it('removes and ignores an unsafe link from saved story HTML', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const { container } = render(
      <PreviewStory story={'<span data-href="javascript:alert(1)"><img src="/image.png" alt="unsafe image"></span>'} />,
    )

    expect(container.querySelector('[data-href]')).toBeNull()
    fireEvent.click(container.querySelector('img')!)
    expect(open).not.toHaveBeenCalled()
    open.mockRestore()
  })
})
