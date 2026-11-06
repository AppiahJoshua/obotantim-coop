function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-gray-200 motion-reduce:animate-none ${className}`} />;
}

function LoadingRegion({ label, children, className = '' }) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function CardGridSkeleton({ count = 6, className = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' }) {
  return (
    <LoadingRegion label="Loading cards" className={className}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card space-y-4 p-5">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </LoadingRegion>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <LoadingRegion label="Loading table" className="card overflow-hidden">
      <table aria-hidden="true" className="w-full">
        <thead className="bg-surface">
          <tr>
            {Array.from({ length: columns }, (_, index) => (
              <th key={index} className="px-5 py-4">
                <Skeleton className="h-3 w-3/4" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row}>
              {Array.from({ length: columns }, (_, column) => (
                <td key={column} className="px-5 py-4">
                  <Skeleton className={`h-3 ${column === 0 ? 'w-5/6' : 'w-2/3'}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </LoadingRegion>
  );
}

export function ListSkeleton({ count = 5 }) {
  return (
    <LoadingRegion label="Loading items" className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card space-y-3 p-5">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </LoadingRegion>
  );
}

export function FormSkeleton() {
  return (
    <LoadingRegion label="Loading form" className="card max-w-2xl space-y-5 p-6">
      <Skeleton className="mx-auto h-32 w-32 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
      </div>
      <Skeleton className="h-11" />
      <Skeleton className="h-32" />
      <Skeleton className="h-10 w-32" />
    </LoadingRegion>
  );
}

export function DashboardSkeleton() {
  return (
    <LoadingRegion label="Loading dashboard" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="card space-y-3 p-5">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ListSkeleton count={3} />
        <ListSkeleton count={3} />
      </div>
    </LoadingRegion>
  );
}

export function GalleryGridSkeleton({ count = 8 }) {
  return (
    <LoadingRegion label="Loading gallery" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="aspect-square rounded-xl" />
      ))}
    </LoadingRegion>
  );
}

export default Skeleton;
