import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { Spin } from "antd";

type GlobalLoadingContextType = {
  setLoading: (value: boolean) => void;
};

const GlobalLoadingContext = createContext<GlobalLoadingContextType>({
  setLoading: () => {},
});

type ProviderProps = {
  children: ReactNode;
};

export function GlobalLoadingProvider({ children }: ProviderProps) {
  const [loading, setLoading] = useState(false);

  return (
    <GlobalLoadingContext.Provider value={{ setLoading }}>
      {children}
      {loading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.35)",
            zIndex: 9999,
          }}
        >
          <Spin size="large" />
        </div>
      )}
    </GlobalLoadingContext.Provider>
  );
}

export function useGlobalLoading() {
  return useContext(GlobalLoadingContext);
}