import { Text as DefaultText, View as DefaultView } from "react-native";
import { useTheme } from "@react-navigation/native";

export function Text(props) {
  const { colors } = useTheme();
  return (
    <DefaultText style={[{ color: colors.text }, props.style]} {...props} />
  );
}

export function View(props) {
  const { colors } = useTheme();
  return (
    <DefaultView
      style={[{ backgroundColor: colors.background }, props.style]}
      {...props}
    />
  );
}
