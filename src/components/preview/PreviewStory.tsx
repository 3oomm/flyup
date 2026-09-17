import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { sanitizeStoryHtml } from '../../lib/sanitizeStoryHtml';

interface PreviewStoryProps {
  story?: string;
  risks?: string;
}

const PreviewStory = ({ story, risks }: PreviewStoryProps) => {
  const { html, toc } = useMemo(() => {
    if (!story || typeof window === 'undefined') return { html: '', toc: [] };

    const doc = new DOMParser().parseFromString(story, 'text/html');
    const headings = Array.from(doc.querySelectorAll('h1, h2, h3'));
    
    const tocList = headings.map((h, i) => {
      const id = h.id || `heading-${i}`;
      h.id = id;
      return { 
        id, 
        text: h.textContent || '', 
        level: Number(h.tagName.replace('H', '')) 
      };
    });
    
    return { html: doc.body.innerHTML, toc: tocList };
  }, [story]);

  const scrollToHeading = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-[40px] mt-[20px] relative items-start">
      {/* TOC Sidebar */}
      {toc.length > 0 && (
        <div className="hidden md:block w-[240px] shrink-0 sticky top-[100px]">
          <div className="flex flex-col gap-[12px] border-l-2 border-border pl-[16px]">
            <p className="text-[14px] font-bold text-foreground mb-[4px]">สารบัญเรื่องราว</p>
            {toc.map((item) => (
              <a 
                key={item.id} 
                href={`#${item.id}`} 
                onClick={(e) => scrollToHeading(item.id, e)}
                className="text-[13px] text-muted-foreground hover:text-primary transition-colors line-clamp-2"
                style={{ marginLeft: `${(item.level - 1) * 8}px` }}
              >
                {item.text}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-[20px] min-w-0">
        <div
          className="prose prose-slate w-full max-w-[800px] min-w-0 break-words [overflow-wrap:anywhere] text-foreground text-[15px] leading-relaxed [&_h1]:text-[24px] [&_h1]:font-bold [&_h2]:text-[20px] [&_h2]:font-bold [&_h3]:text-[18px] [&_h3]:font-bold [&_h1]:mb-[12px] [&_h2]:mb-[12px] [&_h3]:mb-[12px] [&_p]:mb-[12px] [&_ul]:mb-[12px] [&_li]:mb-[4px] [&_img]:rounded-[12px] [&_img]:my-[20px]"
          dangerouslySetInnerHTML={{ __html: sanitizeStoryHtml(html) }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            const span = target.closest('[data-href]') as HTMLElement | null;
            if (span?.dataset.href) {
              window.open(span.dataset.href, '_blank', 'noopener,noreferrer');
            }
          }}
        />

        {risks && (
          <div className="mt-[20px] border border-[#FCD34D] bg-[#FEF3C7]/40 rounded-[12px] p-[20px] flex gap-[16px] w-full max-w-[800px] min-w-0 overflow-hidden">
              <div className="text-[#D97706] mt-1 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <div className="flex flex-col gap-[4px] min-w-0 flex-1">
                  <h3 className="text-[14px] font-bold text-foreground">ความเสี่ยงและความท้าทาย</h3>
                  <div className="text-[13px] text-muted-foreground leading-relaxed break-words [overflow-wrap:anywhere] whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(risks) }} />
              </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default PreviewStory;
