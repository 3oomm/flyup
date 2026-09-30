import DOMPurify from 'dompurify'
import { getSafeStoryImageHref } from './storyImageLink'

// เรื่องราวโปรเจกต์ (story) แก้ด้วย Tiptap editor ที่รองรับฝังวิดีโอ YouTube
// (@tiptap/extension-youtube) ซึ่ง render ออกมาเป็น <div data-youtube-video><iframe src="...">
// DOMPurify ค่า default จะตัด <iframe> ทิ้งทั้งหมด (ไม่อยู่ใน allow-list) ทำให้วิดีโอหายตอนแสดงผลจริง
// จึงต้องอนุญาต iframe แบบจำกัดเฉพาะ src ที่เป็น YouTube embed เท่านั้น กัน XSS ผ่าน iframe อื่นๆ ที่อาจหลุดเข้ามา
const YOUTUBE_EMBED_SRC = /^https:\/\/(www\.)?youtube(-nocookie)?\.com\/embed\//i

DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  if (data.tagName === 'iframe') {
    const el = node as HTMLIFrameElement
    const src = el.getAttribute('src') || ''
    if (!YOUTUBE_EMBED_SRC.test(src)) el.remove()
  }
})

DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName === 'data-href' && !getSafeStoryImageHref(data.attrValue)) {
    data.keepAttr = false
  }
})

/** Sanitize story/description HTML ที่อาจมีวิดีโอ YouTube ฝังอยู่ ก่อนแสดงผลด้วย dangerouslySetInnerHTML */
export function sanitizeStoryHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'src', 'width', 'height', 'title'],
  })
}
