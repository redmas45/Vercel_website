import { useSearchParams } from 'react-router-dom';
import { ShopListing } from './ShopListing';

export function SearchResults() {
  const [params] = useSearchParams();
  return <ShopListing forcedQuery={params.get('q') || ''} />;
}
