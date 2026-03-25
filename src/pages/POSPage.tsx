import AdminPOSTab from '../components/admin/AdminPOSTab';
import SEO from '../components/SEO';
import { useSettingsStore } from '../store/settingsStore';
export default function POSPage() {
    const settings = useSettingsStore((s) => s.settings);
    return (
        <div className="min-h-screen bg-black overflow-hidden flex flex-col">
            <SEO title={`Caisse POS — ${settings.store_name}`} description="Système de caisse pour vente en boutique." />
            <div className="flex-1 p-4 md:p-6">
                <AdminPOSTab />
            </div>
        </div>
    );
}
