import React, { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

type BrandContextValue = {
  showBrand: boolean;
};

const BrandContext = createContext<BrandContextValue>({ showBrand: false });

export function BrandProvider({ children }: { children: ReactNode }) {
  const { nurseServiceType, roles } = useAuth();
  const isAdmin = roles.some(r => r.toLowerCase() === 'admin');
  const showBrand = isAdmin || nurseServiceType === 'CasaHogar';

  return (
    <BrandContext.Provider value={{ showBrand }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand(): BrandContextValue {
  return useContext(BrandContext);
}
