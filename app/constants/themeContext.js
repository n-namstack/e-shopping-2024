import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  Children,
} from "react";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "react-native";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorTheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorTheme === "dark");

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
