import React, { createContext, useContext, useState, useEffect } from "react";

interface PhoneAuthContextType {
  phone: string | null;
  login: (phone: string) => void;
  logout: () => void;
}

const PhoneAuthContext = createContext<PhoneAuthContextType>({
  phone: null,
  login: () => {},
  logout: () => {},
});

export const usePhoneAuth = () => useContext(PhoneAuthContext);

export const PhoneAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [phone, setPhone] = useState<string | null>(() => {
    return localStorage.getItem("cerebro_phone");
  });

  const login = (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/\D/g, "");
    localStorage.setItem("cerebro_phone", cleaned);
    setPhone(cleaned);
  };

  const logout = () => {
    localStorage.removeItem("cerebro_phone");
    setPhone(null);
  };

  return (
    <PhoneAuthContext.Provider value={{ phone, login, logout }}>
      {children}
    </PhoneAuthContext.Provider>
  );
};
