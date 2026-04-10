import { useState } from 'react';

interface ImageWithSkeletonProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
}

export default function ImageWithSkeleton({
  wrapperClassName,
  className,
  ...props
}: ImageWithSkeletonProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative ${wrapperClassName ?? ''}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-wow-bg-raised animate-pulse rounded-[inherit]" />
      )}
      <img
        {...props}
        className={`${className ?? ''} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
