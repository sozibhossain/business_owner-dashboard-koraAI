"use client";

import { createContext, useContext, useState } from "react";

type MobileNavValue = {
  isOpen: boolean;
  setIsOpen: (next: boolean) => void;
  toggle: () => void;
};

const MobileNavContext = createContext<MobileNavValue>({
  isOpen: false,
  setIsOpen: () => {},
  toggle: () => {},
});

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <MobileNavContext.Provider
      value={{ isOpen, setIsOpen, toggle: () => setIsOpen(!isOpen) }}
    >
      {children}
    </MobileNavContext.Provider>
  );
}

export const useMobileNav = () => useContext(MobileNavContext);
