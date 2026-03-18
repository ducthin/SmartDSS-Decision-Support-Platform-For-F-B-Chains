import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { feedbackService } from '@/services/feedbackService';
import { resolveBackendUrl } from '@/services/settingsService';
import type { CustomerFeedback, PageResponse } from '@/types';
import { getApiErrorMessage } from '@/utils/helpers';
import Pagination from '@/components/ui/Pagination';
import { ChevronLeft, ChevronRight, MessageSquareText, Star, X } from 'lucide-react';

export default function FeedbacksPage() {
  const [items, setItems] = useState<CustomerFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState<PageResponse<CustomerFeedback> | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await feedbackService.getAll(page, 10);
      const data = res.data.data;
      setItems(data.content || []);
      setPageData(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể tải feedback khách hàng'));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const closePreview = () => {
    setPreviewIndex(null);
    setPreviewUrls([]);
  };

  const activePreviewUrl = previewIndex !== null ? previewUrls[previewIndex] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Feedback khách hàng</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <MessageSquareText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p>Chưa có feedback nào từ khách hàng.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((item) => {
            const urls = (item.imageUrls && item.imageUrls.length > 0)
              ? item.imageUrls
              : item.imageUrl
                ? [item.imageUrl]
                : [];
            return (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-900">{item.customerName}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {item.customerPhone} - {item.customerEmail}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Bàn: {item.tableName} - {new Date(item.createdAt).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star size={16} className="fill-amber-400" />
                  <span className="font-semibold text-sm">{item.rating}/5</span>
                </div>
              </div>

              <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.content}</p>

              {urls.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {urls.map((url, idx) => (
                    <button
                      key={`${item.id}-${idx}`}
                      onClick={() => {
                        setPreviewUrls(urls.map((u) => resolveBackendUrl(u) || u));
                        setPreviewIndex(idx);
                      }}
                      className="rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition"
                    >
                      <img
                        src={resolveBackendUrl(url) ?? ''}
                        alt={`Feedback attachment ${idx + 1}`}
                        className="w-full h-28 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {activePreviewUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <button onClick={closePreview} className="absolute inset-0" aria-label="Close image preview" />
          <div className="relative z-10 max-w-5xl w-full flex items-center justify-center">
            <button
              onClick={closePreview}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-2 hover:bg-black/80"
              title="Đóng"
            >
              <X size={18} />
            </button>

            {previewUrls.length > 1 && previewIndex !== null && (
              <button
                onClick={() => setPreviewIndex((prev) => (prev === null ? 0 : (prev - 1 + previewUrls.length) % previewUrls.length))}
                className="absolute left-2 md:left-4 bg-black/60 text-white rounded-full p-2 hover:bg-black/80"
                title="Ảnh trước"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            <img
              src={activePreviewUrl}
              alt="Feedback preview"
              className="max-h-[85vh] max-w-full object-contain rounded-lg border border-white/20"
            />

            {previewUrls.length > 1 && previewIndex !== null && (
              <button
                onClick={() => setPreviewIndex((prev) => (prev === null ? 0 : (prev + 1) % previewUrls.length))}
                className="absolute right-2 md:right-4 bg-black/60 text-white rounded-full p-2 hover:bg-black/80"
                title="Ảnh sau"
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      )}

      {pageData && (
        <Pagination
          page={page}
          totalPages={pageData.totalPages}
          totalElements={pageData.totalElements}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
