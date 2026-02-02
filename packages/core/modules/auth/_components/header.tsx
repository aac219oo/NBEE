export default function Header({
  title,
  description,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center space-y-2 font-lato ${className}`}
    >
      <h1 className="text-3xl md:text-4xl font-black text-center tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
        {title}
      </h1>
      {description && (
        <p className="text-center text-sm font-medium text-muted-foreground/80">
          {description}
        </p>
      )}
    </div>
  );
}
