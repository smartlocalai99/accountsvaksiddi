import { withAuthPage } from "@/lib/withAuthPage";

export const getServerSideProps = withAuthPage({ path: "/expenses" });

export default function ExpensesPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
          Protected module placeholder for expenses and cash flow operations.
        </p>
      </div>
    </div>
  );
}
