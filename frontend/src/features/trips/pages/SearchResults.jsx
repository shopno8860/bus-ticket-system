import { useSearchParams } from 'react-router-dom';

function SearchResults() {
  const [params] = useSearchParams();
  const origin = params.get('origin') || '';
  const destination = params.get('destination') || '';

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-4 text-2xl font-bold">Search results</h1>
      <p className="opacity-80">
        {origin || destination
          ? `Showing trips for ${origin || '—'} → ${destination || '—'}`
          : 'Enter origin and destination on the home page to search.'}
      </p>
    </div>
  );
}

export default SearchResults;
