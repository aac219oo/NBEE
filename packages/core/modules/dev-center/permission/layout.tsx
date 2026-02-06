export default function PermissionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-full bg-sub-background overflow-y-auto">
      {children}
    </div>
  );
}
