import PayrollRunView from "@/components/payroll/PayrollRunView";
import { ROLES } from "@/lib/permissions";
import { withAuthPage } from "@/lib/withAuthPage";

export const getServerSideProps = withAuthPage({
  path: "/principal/payroll",
  allowedRoles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
});

export default function PrincipalPayrollPage() {
  return <PayrollRunView mode="principal" />;
}
