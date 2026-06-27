import PayrollRunView from "@/components/payroll/PayrollRunView";
import { ROLES, normalizeRole } from "@/lib/permissions";
import { withAuthPage } from "@/lib/withAuthPage";

export const getServerSideProps = withAuthPage({
  path: "/payroll",
});

export default function PayrollPage({ user }) {
  const role = normalizeRole(user?.role);
  const mode = role === ROLES.ACCOUNTANT ? "accountant" : "principal";

  return <PayrollRunView mode={mode} />;
}
