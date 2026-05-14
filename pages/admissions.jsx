import Admissions from "@/components/Admissions";
import { withAuthPage } from "@/lib/withAuthPage";

export const getServerSideProps = withAuthPage({ path: "/admissions" });

export default function AdmissionsPage() {
  return <Admissions />;
}
