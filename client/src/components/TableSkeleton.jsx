// Skeleton loader rows for tables.
export default function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c}>
              <div className="skeleton" style={{ height: 16, width: c === 0 ? '40%' : '80%' }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
