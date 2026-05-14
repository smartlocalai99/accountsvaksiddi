import { withAuthPage } from "@/lib/withAuthPage";

export const getServerSideProps = withAuthPage({ path: "/fees" });

export default function FeesPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Fees</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
          Protected module placeholder for fee management. This route is ready for future role-based restrictions.
        </p>
      </div>
    </div>
  );
}
