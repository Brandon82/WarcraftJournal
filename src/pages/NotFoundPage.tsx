import { Link } from 'react-router';
import { CompassOutlined } from '@ant-design/icons';

export default function NotFoundPage() {
  return (
    <div className="text-center py-20">
      <div className="text-5xl text-wow-gold-muted/40 mb-4">
        <CompassOutlined />
      </div>
      <h2 className="text-wow-text text-xl font-semibold mb-2 m-0">
        Instance Not Found
      </h2>
      <p className="text-wow-text-secondary text-sm mb-8">
        This area hasn't been discovered yet. Check your coordinates and try again.
      </p>
      <Link
        to="/"
        className="inline-block px-6 py-2.5 bg-wow-gold-muted text-wow-bg-base font-medium rounded-lg hover:bg-wow-gold transition-colors duration-200 no-underline"
      >
        Return to Adventure Guide
      </Link>
    </div>
  );
}
