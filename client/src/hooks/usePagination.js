import { useMemo, useState } from 'react';

// Client-side pagination helper for an array of items.
export default function usePagination(items, perPage = 8) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, safePage, perPage]);

  return { page: safePage, setPage, totalPages, pageItems };
}
