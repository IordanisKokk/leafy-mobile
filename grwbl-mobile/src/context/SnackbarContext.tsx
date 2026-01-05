// src/context/SnackbarContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";
import { Snackbar, SnackbarType } from "../components/Snackbar";

type SnackbarOptions = {
  message: string;
  type?: SnackbarType;
  duration?: number; // ms
};

type SnackbarContextValue = {
  showSnackbar: (options: SnackbarOptions) => void;
};

const SnackbarContext = createContext<SnackbarContextValue | undefined>(
  undefined
);

export const SnackbarProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<SnackbarType>("info");
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hide = useCallback(() => {
    setVisible(false);
  }, []);

  const showSnackbar = useCallback(
    ({ message, type = "info", duration = 3000 }: SnackbarOptions) => {
      // clear previous timeout if any
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }

      setMessage(message);
      setType(type);
      setVisible(true);

      hideTimeoutRef.current = setTimeout(() => {
        hide();
      }, duration);
    },
    [hide]
  );

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <Snackbar
        visible={visible}
        message={message}
        type={type}
        onHide={hide}
      />
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = (): SnackbarContextValue => {
  const ctx = useContext(SnackbarContext);
  if (!ctx) {
    throw new Error("useSnackbar must be used within a SnackbarProvider");
  }
  return ctx;
};
