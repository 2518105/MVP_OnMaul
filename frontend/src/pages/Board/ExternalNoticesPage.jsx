import React, { useEffect, useState } from 'react';
import client from '../../api/client';

const ExternalNoticesPage = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    fetchNotices();
  }, [page]);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const response = await client.get(`/admin/external-notices?page=${page}&limit=${limit}`);
      setNotices(response.data);
      setError(null);
    } catch (err) {
      console.error('공지 조회 실패:', err);
      setError('공지사항을 불러올 수 없습니다');
      setNotices([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const utc = dateString.endsWith('Z') ? dateString : dateString + 'Z';
    const date = new Date(utc);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  const handleItemClick = (sourceUrl) => {
    if (sourceUrl) {
      window.open(sourceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 페이지 제목 */}
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          청산면 공지사항
        </h1>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* 공지 목록 */}
        {notices.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-500">공지사항이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notices.map((notice) => (
              <div
                key={notice.id}
                onClick={() => handleItemClick(notice.source_url)}
                className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer border-l-4 border-maul"
              >
                {/* 제목 */}
                <h3 className="text-lg font-semibold text-maul hover:underline mb-2">
                  {notice.title}
                </h3>

                {/* 메타 정보 (날짜, 조회수) */}
                <div className="flex justify-between text-sm text-gray-600">
                  <span className="text-gray-700 font-medium">
                    <span style={{display:"inline-flex",alignItems:"center",gap:"4px"}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>{formatDate(notice.published_at)}</span>
                  </span>
                  <span className="text-gray-600">
                    <span style={{display:"inline-flex",alignItems:"center",gap:"4px"}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>{notice.view_count}회</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-maul text-white rounded disabled:bg-gray-300"
          >
            이전
          </button>
          <span className="px-4 py-2 text-gray-700 font-semibold">
            {page}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={notices.length < limit}
            className="px-4 py-2 bg-maul text-white rounded disabled:bg-gray-300"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExternalNoticesPage;