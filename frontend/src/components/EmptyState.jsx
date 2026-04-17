function EmptyState({ title = 'No data', description }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <p className="text-lg font-medium opacity-80">{title}</p>
      {description ? (
        <p className="max-w-md text-sm opacity-60">{description}</p>
      ) : null}
    </div>
  );
}

export default EmptyState;
