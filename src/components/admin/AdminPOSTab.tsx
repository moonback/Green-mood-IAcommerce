import { AdminPOSView } from './pos/admin-pos/AdminPOSView';
import { AdminPOSTabProps } from './pos/admin-pos/types';
import { useAdminPOS } from './pos/admin-pos/useAdminPOS';

function AdminPOSTab(props: AdminPOSTabProps) {
  const pos = useAdminPOS(props);
  return <AdminPOSView {...props} pos={pos} />;
}

export default AdminPOSTab;
