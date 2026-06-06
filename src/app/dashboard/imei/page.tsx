import { ImeiTracker } from "@/components/imei/imei-tracker";

export default async function ImeiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">IMEI Tracker</h1>
        <p className="text-muted-foreground">
          Complete device lifecycle from purchase to sale
        </p>
      </div>
      <ImeiTracker initialImei={params.q} />
    </div>
  );
}
