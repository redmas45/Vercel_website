export function AdminMessages({ error, notice }: { error: string; notice: string }) {
  return (
    <>
      {error ? <p className="mt-4 text-[13px] text-red-600">{error}</p> : null}
      {notice ? <p className="mt-4 text-[13px] text-green-700">{notice}</p> : null}
    </>
  );
}
