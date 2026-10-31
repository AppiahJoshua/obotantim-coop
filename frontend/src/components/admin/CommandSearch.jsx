import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import api from '../../api/axios';

export default function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 180);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else { setQuery(''); setDebouncedQuery(''); }
  }, [open]);

  const { data, isFetching } = useQuery({
    queryKey: ['admin-search', debouncedQuery],
    queryFn: () => api.get('/search', { params: { q: debouncedQuery } }).then((response) => response.data.results),
    enabled: open && debouncedQuery.length >= 2,
  });

  const openResult = (url) => {
    setOpen(false);
    navigate(url);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex min-w-10 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 sm:min-w-56">
        <Search size={15} /> <span className="flex-1 text-left">Search admin</span>
        <kbd className="hidden rounded border border-gray-200 px-1.5 py-0.5 text-[10px] sm:inline">Ctrl K</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 px-4 pt-[12vh]" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-label="Search admin" className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-gray-100 px-4">
              <Search size={18} className="text-gray-400" />
              <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people, records, products, or pages..." className="h-14 min-w-0 flex-1 outline-none" />
              <button type="button" aria-label="Close search" onClick={() => setOpen(false)} className="p-2 text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {query.trim().length < 2 ? <p className="px-3 py-6 text-center text-sm text-gray-500">Type at least two characters.</p>
                : isFetching ? <p className="px-3 py-6 text-center text-sm text-gray-500">Searching...</p>
                  : data?.length ? data.map((item, index) => (
                    <button key={`${item.type}-${item.url}-${index}`} type="button" onClick={() => openResult(item.url)} className="flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left hover:bg-surface">
                      <span className="min-w-0"><span className="block truncate text-sm font-medium text-dark">{item.label}</span><span className="block truncate text-xs text-gray-500">{item.detail}</span></span>
                      <span className="shrink-0 text-[11px] uppercase text-gray-400">{item.type}</span>
                    </button>
                  )) : <p className="px-3 py-6 text-center text-sm text-gray-500">No matches.</p>}
            </div>
            <footer className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">Search respects your staff role.</footer>
          </section>
        </div>
      )}
    </>
  );
}
