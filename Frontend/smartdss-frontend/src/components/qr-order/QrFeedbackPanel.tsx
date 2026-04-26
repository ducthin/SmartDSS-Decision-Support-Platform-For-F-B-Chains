import type { Dispatch, SetStateAction } from 'react';
import { ImagePlus, MessageSquareText, Send, Star, Trash2 } from 'lucide-react';
import type { QrFeedbackForm } from '@/types';

interface QrFeedbackPanelProps {
  feedback: QrFeedbackForm;
  setFeedback: Dispatch<SetStateAction<QrFeedbackForm>>;
  feedbackPreviewUrls: string[];
  maxFeedbackContent: number;
  submittingFeedback: boolean;
  onSubmitFeedback: () => void;
  onRemoveSelectedImage: (idx: number) => void;
}

export default function QrFeedbackPanel({
  feedback,
  setFeedback,
  feedbackPreviewUrls,
  maxFeedbackContent,
  submittingFeedback,
  onSubmitFeedback,
  onRemoveSelectedImage,
}: QrFeedbackPanelProps) {
  return (
    <div className="coffee-soft-shadow space-y-4 rounded-xl border border-[rgba(111,78,55,0.14)] bg-white/95 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(245,230,211,0.8)] text-(--coffee-primary)">
          <MessageSquareText className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-(--coffee-dark)">Góp ý cho quán</h2>
          <p className="mt-0.5 text-sm text-[rgba(62,42,31,0.62)]">Ý kiến của bạn giúp chúng tôi phục vụ tốt hơn.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <input
          value={feedback.customerName}
          onChange={(e) => setFeedback((prev) => ({ ...prev, customerName: e.target.value }))}
          placeholder="Họ và tên *"
          className="w-full rounded-xl border border-[rgba(111,78,55,0.2)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-(--coffee-accent) focus:ring-4 focus:ring-[rgba(228,172,92,0.2)]"
        />
        <input
          value={feedback.customerPhone}
          onChange={(e) => setFeedback((prev) => ({ ...prev, customerPhone: e.target.value }))}
          placeholder="Số điện thoại *"
          className="w-full rounded-xl border border-[rgba(111,78,55,0.2)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-(--coffee-accent) focus:ring-4 focus:ring-[rgba(228,172,92,0.2)]"
        />
        <input
          type="email"
          value={feedback.customerEmail}
          onChange={(e) => setFeedback((prev) => ({ ...prev, customerEmail: e.target.value }))}
          placeholder="Email *"
          className="w-full rounded-xl border border-[rgba(111,78,55,0.2)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-(--coffee-accent) focus:ring-4 focus:ring-[rgba(228,172,92,0.2)]"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-(--coffee-dark)">Đánh giá *</label>
        <div className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFeedback((prev) => ({ ...prev, rating: s }))}
              className="coffee-interactive rounded-lg p-1.5 hover:bg-[rgba(245,230,211,0.6)]"
              title={`${s} sao`}
            >
              <Star
                className={`h-7 w-7 ${s <= feedback.rating ? 'fill-(--coffee-accent) text-(--coffee-accent)' : 'text-[rgba(111,78,55,0.22)]'}`}
              />
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={feedback.content}
        onChange={(e) => setFeedback((prev) => ({ ...prev, content: e.target.value }))}
        placeholder="Nội dung góp ý *"
        className="w-full resize-none rounded-xl border border-[rgba(111,78,55,0.2)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-(--coffee-accent) focus:ring-4 focus:ring-[rgba(228,172,92,0.2)]"
        rows={4}
      />
      <div className="text-right text-xs text-[rgba(62,42,31,0.54)]">
        {feedback.content.length}/{maxFeedbackContent}
      </div>

      <div>
        <label className="text-sm font-semibold text-(--coffee-dark)">Ảnh đính kèm (tuỳ chọn)</label>
        <label className="coffee-interactive mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[rgba(111,78,55,0.28)] bg-[rgba(245,230,211,0.45)] p-4 text-sm text-[rgba(62,42,31,0.74)] hover:bg-[rgba(245,230,211,0.62)]">
          <ImagePlus className="h-4 w-4 text-(--coffee-primary)" />
          <span>{feedback.images?.length ? `Đã chọn ${feedback.images.length} ảnh` : 'Chọn ảnh (tối đa 5MB/ảnh)'}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => setFeedback((prev) => ({ ...prev, images: Array.from(e.target.files || []) }))}
          />
        </label>
        {(feedback.images || []).length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(feedback.images || []).map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="relative overflow-hidden rounded-xl border border-[rgba(111,78,55,0.18)] bg-[rgba(245,230,211,0.35)]">
                <img src={feedbackPreviewUrls[idx]} alt={file.name} className="h-20 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemoveSelectedImage(idx)}
                  className="coffee-interactive absolute right-1 top-1 rounded-full bg-[rgba(62,42,31,0.72)] p-1.5 text-white hover:bg-[rgba(62,42,31,0.88)]"
                  title="Xóa ảnh"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onSubmitFeedback}
        disabled={submittingFeedback}
        className="coffee-interactive flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(120deg,var(--coffee-primary),var(--coffee-dark))] py-3.5 text-sm font-bold text-(--coffee-secondary) shadow-lg shadow-[rgba(62,42,31,0.26)] disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        {submittingFeedback ? 'Đang gửi…' : 'Gửi góp ý'}
      </button>
    </div>
  );
}
