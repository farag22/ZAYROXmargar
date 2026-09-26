import DashboardLayout from "@/components/DashboardLayout";
import Workspace from "@/pages/Workspace";

export default function Login() {
  return (
    <DashboardLayout>
      <Workspace view="dashboard" />
    </DashboardLayout>
  );
}
