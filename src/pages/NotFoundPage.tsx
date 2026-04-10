import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <div className="text-center py-20">
      <p className="text-wow-text-secondary text-lg mb-6">Page not found</p>
      <Link
        to="/"
        className="inline-block px-6 py-2.5 bg-wow-gold-muted text-wow-bg-base font-medium rounded-lg hover:bg-wow-gold transition-colors duration-200 no-underline"
      >
        Return to Adventure Guide
      </Link>
    </div>
  );
}
