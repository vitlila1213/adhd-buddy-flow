import { usePhoneAuth } from "@/contexts/PhoneAuthContext";
import LoginPage from "./LoginPage";
import Dashboard from "./Dashboard";

const Index = () => {
  const { phone } = usePhoneAuth();
  return phone ? <Dashboard /> : <LoginPage />;
};

export default Index;
