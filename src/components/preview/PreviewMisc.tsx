import { useState } from 'react';
import { MessageCircle, ChevronLeft, Lock, Send, Loader2, CornerDownRight } from 'lucide-react';
import type { ProjectUpdate, ProjectFAQ, ProjectThread } from '../../store/useProjectDetailStore';
import { useProjectDetailStore } from '../../store/useProjectDetailStore';

// ─── PreviewUpdate ────────────────────────────────────────────────────────────

interface PreviewUpdateProps {
  updates: ProjectUpdate[];
  creatorName?: string;
  creatorAvatar?: string;
  projectId?: number;
  hasInvested?: boolean;
  isOwner?: boolean;
}

export const PreviewUpdate = ({ updates, creatorName = 'ผู้พัฒนาโปรเจกต์', creatorAvatar, projectId, hasInvested, isOwner }: PreviewUpdateProps) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);
  const [updateComment, setUpdateComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const { updateThreads, fetchUpdateThreads, createUpdateThread } = useProjectDetailStore();

  const selectedUpdate = updates.find(u => u.id === selectedId) ?? null;
  const selectedIndex = updates.findIndex(u => u.id === selectedId);
  const currentUpdateComments = selectedId ? (updateThreads[selectedId] ?? []) : [];

  const handleSelectUpdate = (id: number) => {
    setSelectedId(id);
    if (projectId) fetchUpdateThreads(projectId, id);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const initials = creatorName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'C';

  // ── Detail View ──────────────────────────────────────────────────────────────
  if (selectedUpdate) {
    const updateNumber = updates.length - selectedIndex;

    return (
      <div className="flex flex-col gap-[24px] mt-[16px] animate-in fade-in duration-200">
        {/* Back button */}
        <button
          onClick={() => setSelectedId(null)}
          className="flex items-center gap-[6px] text-[13px] text-primary hover:text-primary/70 transition-colors font-medium w-fit cursor-pointer"
        >
          <ChevronLeft size={16} />
          อัปเดตทั้งหมด
        </button>

        <div className="bg-white border border-border rounded-[16px] p-[28px] shadow-sm flex flex-col gap-[20px]">
          {/* Header */}
          <div className="flex flex-col gap-[10px] border-b border-border pb-[20px]">
            <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
              อัปเดต #{updateNumber}
            </span>
            <h2 className="text-[22px] font-bold text-foreground leading-tight">{selectedUpdate.title}</h2>

            {/* Creator + date */}
            <div className="flex items-center gap-[10px] mt-[4px]">
              <div className="w-[36px] h-[36px] rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[13px] flex-shrink-0 overflow-hidden">
                {creatorAvatar
                  ? <img src={creatorAvatar} alt="creator" className="w-full h-full object-cover" />
                  : initials
                }
              </div>
              <div className="flex flex-col gap-[2px]">
                <div className="flex items-center gap-[6px]">
                  <span className="text-[14px] font-semibold text-foreground">{creatorName}</span>
                  <span className="text-[11px] bg-emerald-100 text-emerald-700 px-[8px] py-[2px] rounded-full font-medium">Pioneer</span>
                </div>
                <span className="text-[12px] text-muted-foreground">{formatDate(selectedUpdate.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="text-[15px] text-foreground leading-relaxed whitespace-pre-wrap">
            {selectedUpdate.body}
          </div>

        </div>

        {/* Comments section */}
        <div className="bg-white border border-border rounded-[16px] p-[24px] flex flex-col gap-[16px] shadow-sm">
          <h3 className="text-[15px] font-semibold text-foreground flex items-center gap-[6px]">
            <MessageCircle size={16} className="text-primary" />
            ความคิดเห็น
            <span className="min-w-[20px] h-[20px] px-[6px] rounded-full bg-primary text-white text-[11px] font-bold inline-flex items-center justify-center">
              {currentUpdateComments.length || selectedUpdate.comment_count || 0}
            </span>
          </h3>

          {/* Existing comments for this update */}
          {currentUpdateComments.length > 0 && (
            <div className="flex flex-col gap-[10px]">
              {currentUpdateComments.map((c) => {
                const cInitials = c.user_name?.trim()
                  ? c.user_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                  : '?';
                return (
                  <div key={c.id} className="flex gap-[10px] p-[14px] bg-surface-soft rounded-[12px]">
                    <div className="w-[32px] h-[32px] rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[12px] flex-shrink-0 overflow-hidden">
                      {c.user_avatar
                        ? <img src={c.user_avatar} alt={c.user_name} className="w-full h-full object-cover" />
                        : cInitials}
                    </div>
                    <div className="flex flex-col gap-[2px] flex-1">
                      <span className="text-[13px] font-semibold text-foreground">{c.user_name || 'ผู้ใช้ไม่ระบุชื่อ'}</span>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">{c.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {(hasInvested || isOwner) && projectId && selectedId ? (
            <div className="flex flex-col gap-[10px]">
              <textarea
                value={updateComment}
                onChange={(e) => setUpdateComment(e.target.value)}
                placeholder="แสดงความคิดเห็นเกี่ยวกับอัปเดตนี้..."
                rows={3}
                className="w-full resize-none text-[14px] text-foreground placeholder:text-muted-foreground bg-transparent outline-none leading-relaxed border border-border rounded-[10px] px-[12px] py-[10px] focus:border-primary/50 transition-colors"
              />
              <div className="flex justify-end">
                <button
                  onClick={async () => {
                    if (!updateComment.trim() || !projectId || !selectedId) return;
                    setIsPostingComment(true);
                    try {
                      await createUpdateThread(projectId, selectedId, updateComment.trim(), !!isOwner);
                      setUpdateComment('');
                    } finally {
                      setIsPostingComment(false);
                    }
                  }}
                  disabled={isPostingComment || !updateComment.trim()}
                  className="flex items-center gap-[6px] px-[16px] py-[7px] bg-primary text-white rounded-[8px] text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isPostingComment ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  โพสต์
                </button>
              </div>
            </div>
          ) : (hasInvested === false && isOwner === false) ? (
            <div className="flex flex-col items-center gap-[10px] py-[24px] border border-dashed border-border rounded-[12px]">
              <Lock size={20} className="text-muted-foreground" strokeWidth={1.5} />
              <p className="text-[13px] font-medium text-foreground">เฉพาะผู้ลงทุนเท่านั้นที่แสดงความเห็นได้</p>
              <p className="text-[12px] text-muted-foreground text-center max-w-[260px] leading-relaxed">
                ลงทุนในโปรเจกต์นี้เพื่อร่วมสอบถามและติดตามความคืบหน้า
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // ── List View ────────────────────────────────────────────────────────────────
  if (updates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-[12px] mt-[40px] p-[40px] border border-dashed border-border rounded-[16px] bg-white">
        <span className="text-muted-foreground text-[14px]">ยังไม่มีอัปเดต</span>
      </div>
    );
  }

  const visible = updates.slice(0, visibleCount);

  return (
    <div className="flex flex-col gap-[16px] mt-[16px]">
      {visible.map((u, idx) => {
        const updateNumber = updates.length - idx;

        return (
          <div key={u.id} onClick={() => handleSelectUpdate(u.id)} className="bg-white border border-border rounded-[16px] p-[24px] shadow-sm flex flex-col gap-[14px] hover:border-primary/40 transition-colors cursor-pointer">
            {/* Update number */}
            <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
              อัปเดต #{updateNumber}
            </span>

            {/* Title */}
            <h3 className="text-[20px] font-bold text-foreground leading-tight">{u.title}</h3>

            {/* Creator + date */}
            <div className="flex items-center gap-[8px] pb-[14px] border-b border-border">
              <div className="w-[28px] h-[28px] rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[11px] flex-shrink-0 overflow-hidden">
                {creatorAvatar
                  ? <img src={creatorAvatar} alt="creator" className="w-full h-full object-cover" />
                  : initials
                }
              </div>
              <div className="flex flex-col gap-[1px]">
                <div className="flex items-center gap-[6px]">
                  <span className="text-[13px] font-semibold text-foreground">{creatorName}</span>
                  <span className="text-[11px] bg-emerald-100 text-emerald-700 px-[7px] py-[1px] rounded-full font-medium">Pioneer</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{formatDate(u.created_at)}</span>
              </div>
            </div>

            {/* Preview content */}
            <div className="relative max-h-[150px] overflow-hidden">
              <p className="text-[14px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{u.body}</p>
              <div className="absolute bottom-0 left-0 right-0 h-[48px] bg-gradient-to-t from-white to-transparent pointer-events-none" />
            </div>

            {/* Footer */}
            <div className="flex items-center">
              <span className="flex items-center gap-[5px] text-[13px] text-muted-foreground">
                <MessageCircle size={14} />
                ความคิดเห็น
                <span className="min-w-[20px] h-[20px] px-[6px] rounded-full bg-primary/10 text-primary text-[11px] font-bold inline-flex items-center justify-center">
                  {u.comment_count || 0}
                </span>
              </span>
            </div>
          </div>
        );
      })}

      {updates.length > 5 && (
        <div className="flex flex-col items-center gap-[12px] pt-[8px]">
          <span className="text-[13px] text-muted-foreground">
            แสดง {Math.min(visibleCount, updates.length)} จาก {updates.length} อัปเดต
          </span>
          <div className="flex gap-[8px]">
            {visibleCount < updates.length && (
              <button
                onClick={() => setVisibleCount(v => v + 5)}
                className="bg-foreground text-background text-[14px] font-medium px-[32px] py-[10px] rounded-[8px] hover:opacity-80 transition-opacity cursor-pointer"
              >
                โหลดเพิ่มเติม
              </button>
            )}
            {visibleCount > 5 && (
              <button
                onClick={() => setVisibleCount(5)}
                className="bg-white border border-border text-foreground text-[14px] font-medium px-[32px] py-[10px] rounded-[8px] hover:border-primary/50 transition-colors cursor-pointer"
              >
                แสดงน้อยลง
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── PreviewQuestion ──────────────────────────────────────────────────────────

interface PreviewQuestionProps {
  questions: ProjectFAQ[];
}

export const PreviewQuestion = ({ questions }: PreviewQuestionProps) => {
  const [visibleCount, setVisibleCount] = useState(5);

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-[12px] mt-[40px] p-[40px] border border-dashed border-border rounded-[16px] bg-white">
        <span className="text-muted-foreground text-[14px]">ยังไม่มีคำถาม</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[12px] mt-[16px]">
      {questions.slice(0, visibleCount).map((item) => (
        <div key={item.id} className="bg-white border border-border rounded-[16px] p-[20px] shadow-sm">
          <div className="flex items-start gap-[12px]">
            <div className="text-primary mt-[2px] flex-shrink-0">
              <MessageCircle size={18} />
            </div>
            <div className="flex flex-col gap-[6px]">
              <p className="text-[15px] font-semibold text-foreground">{item.question}</p>
              <p className="text-[14px] text-muted-foreground leading-relaxed">{item.answer}</p>
            </div>
          </div>
        </div>
      ))}
      {questions.length > 5 && (
        <div className="flex flex-col items-center gap-[12px] pt-[8px]">
          <span className="text-[13px] text-muted-foreground">
            แสดง {Math.min(visibleCount, questions.length)} จาก {questions.length} คำถาม
          </span>
          <div className="flex gap-[8px]">
            {visibleCount < questions.length && (
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + 5)}
                className="bg-foreground text-background text-[14px] font-medium px-[32px] py-[10px] rounded-[8px] hover:opacity-80 transition-opacity cursor-pointer"
              >
                โหลดเพิ่มเติม
              </button>
            )}
            {visibleCount > 5 && (
              <button
                type="button"
                onClick={() => setVisibleCount(5)}
                className="bg-white border border-border text-foreground text-[14px] font-medium px-[32px] py-[10px] rounded-[8px] hover:border-primary/50 transition-colors cursor-pointer"
              >
                แสดงน้อยลง
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── PreviewComment ───────────────────────────────────────────────────────────

interface PreviewCommentProps {
  comments: ProjectThread[];
  canInteract?: boolean;
  isOwner?: boolean;
}

const formatCommentDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

function CommentCard({ c, canInteract, isOwner }: { c: ProjectThread; canInteract: boolean; isOwner: boolean }) {
  const { threadMessages, fetchThreadMessages, createThreadMessage } = useProjectDetailStore();
  const [showReplies, setShowReplies] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const messages = threadMessages[c.id] ?? [];

  const handleToggleReplies = async () => {
    if (!showReplies && messages.length === 0) {
      await fetchThreadMessages(c.id);
    }
    setShowReplies((v) => !v);
  };

  const handlePostReply = async () => {
    if (!replyBody.trim()) return;
    setIsPosting(true);
    try {
      await createThreadMessage(c.id, replyBody.trim(), isOwner);
      setReplyBody('');
    } finally {
      setIsPosting(false);
    }
  };

  const initials = c.user_name?.trim()
    ? c.user_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="bg-white border border-border rounded-[16px] p-[20px] shadow-sm flex flex-col gap-[12px]">
      {/* Header */}
      <div className="flex items-center gap-[10px]">
        <div className="w-[36px] h-[36px] rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[13px] flex-shrink-0 overflow-hidden">
          {c.user_avatar
            ? <img src={c.user_avatar} alt={c.user_name} className="w-full h-full object-cover" />
            : initials
          }
        </div>
        <div className="flex flex-col gap-[2px]">
          <span className="text-[14px] font-semibold text-foreground">{c.user_name || 'ผู้ใช้ไม่ระบุชื่อ'}</span>
          <span className="text-[12px] text-muted-foreground">{formatCommentDate(c.created_at)}</span>
        </div>
      </div>

      {/* Body */}
      <p className="text-[14px] text-muted-foreground leading-relaxed">{c.body}</p>

      {/* Reply toggle */}
      <button
        onClick={handleToggleReplies}
        className="flex items-center gap-[5px] text-[12px] text-primary hover:text-primary/70 transition-colors w-fit cursor-pointer font-medium"
      >
        <CornerDownRight size={13} />
        {showReplies ? 'ซ่อนการตอบกลับ' : `ตอบกลับ${messages.length > 0 ? ` (${messages.length})` : ''}`}
      </button>

      {/* Replies section */}
      {showReplies && (
        <div className="flex flex-col gap-[10px] pl-[16px] border-l-2 border-border">
          {messages.map((m) => {
            const mInitials = m.user_name?.trim()
              ? m.user_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
              : '?';
            return (
              <div key={m.id} className="flex gap-[10px]">
                <div className="w-[28px] h-[28px] rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[11px] flex-shrink-0 overflow-hidden">
                  {m.user_avatar
                    ? <img src={m.user_avatar} alt={m.user_name} className="w-full h-full object-cover" />
                    : mInitials
                  }
                </div>
                <div className="flex flex-col gap-[2px] flex-1">
                  <span className="text-[13px] font-semibold text-foreground">{m.user_name || 'ผู้ใช้ไม่ระบุชื่อ'}</span>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{m.body}</p>
                  <span className="text-[11px] text-muted-foreground">{formatCommentDate(m.created_at)}</span>
                </div>
              </div>
            );
          })}

          {canInteract && (
            <div className="flex gap-[8px] items-end mt-[4px]">
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="เขียนการตอบกลับ..."
                rows={2}
                className="flex-1 resize-none text-[13px] text-foreground placeholder:text-muted-foreground bg-transparent outline-none leading-relaxed border border-border rounded-[8px] px-[10px] py-[8px] focus:border-primary/50 transition-colors"
              />
              <button
                onClick={handlePostReply}
                disabled={isPosting || !replyBody.trim()}
                className="flex items-center gap-[5px] px-[12px] py-[8px] bg-primary text-white rounded-[8px] text-[12px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
              >
                {isPosting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                ส่ง
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const PreviewComment = ({ comments, canInteract = false, isOwner = false }: PreviewCommentProps) => {
  const [visibleCount, setVisibleCount] = useState(5);

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-[12px] mt-[40px] p-[40px] border border-dashed border-border rounded-[16px] bg-white">
        <span className="text-muted-foreground text-[14px]">ยังไม่มีความคิดเห็นในขณะนี้</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[12px] mt-[16px]">
      {comments.slice(0, visibleCount).map((c) => (
        <CommentCard key={c.id} c={c} canInteract={canInteract} isOwner={isOwner} />
      ))}
      {comments.length > 5 && (
        <div className="flex flex-col items-center gap-[12px] pt-[8px]">
          <span className="text-[13px] text-muted-foreground">
            แสดง {Math.min(visibleCount, comments.length)} จาก {comments.length} ความคิดเห็น
          </span>
          <div className="flex gap-[8px]">
            {visibleCount < comments.length && (
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + 5)}
                className="bg-foreground text-background text-[14px] font-medium px-[32px] py-[10px] rounded-[8px] hover:opacity-80 transition-opacity cursor-pointer"
              >
                โหลดเพิ่มเติม
              </button>
            )}
            {visibleCount > 5 && (
              <button
                type="button"
                onClick={() => setVisibleCount(5)}
                className="bg-white border border-border text-foreground text-[14px] font-medium px-[32px] py-[10px] rounded-[8px] hover:border-primary/50 transition-colors cursor-pointer"
              >
                แสดงน้อยลง
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
