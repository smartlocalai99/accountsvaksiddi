import PayrollRunView from "@/components/payroll/PayrollRunView";
import { ROLES } from "@/lib/permissions";
import { withAuthPage } from "@/lib/withAuthPage";

export const getServerSideProps = withAuthPage({
  path: "/accountant/paysheet",
  allowedRoles: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
});

export default function AccountantPaysheetPage() {
  return <PayrollRunView mode="accountant" />;
}
