import { createContext, ReactNode, useMemo } from 'react';
import { localBusinessSchema, organizationSchema, websiteSchema } from '../lib/seo/schemaBuilder';
import { useSettingsStore } from '../store/settingsStore';

interface SEOProviderValue {
  defaultSchemas: object[];
}

export const SEOContext = createContext<SEOProviderValue>({ defaultSchemas: [] });

export function SEOProvider({ children }: { children: ReactNode }) {
  const settings = useSettingsStore((s) => s.settings);
  const value = useMemo(
    () => ({
      defaultSchemas: [organizationSchema(), websiteSchema(), localBusinessSchema()],
    }),
    [settings],
  );

  return <SEOContext.Provider value={value}>{children}</SEOContext.Provider>;
}
