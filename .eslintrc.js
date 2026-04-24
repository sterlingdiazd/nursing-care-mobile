module.exports = {
  root: true,
  extends: ["expo", "plugin:react-native-a11y/all"],
  plugins: ["react-native-a11y"],
  rules: {
    "react-native-a11y/has-accessibility-props": "warn",
    "react-native-a11y/has-valid-accessibility-role": "warn",
    "react-native-a11y/no-nested-touchables": "warn",
    "no-restricted-syntax": [
      "warn",
      {
        "selector": "Property[key.name=/color|Color|background|Background/] > Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
        "message": "Use design tokens instead of raw hex color literals. Import from src/design-system/tokens.ts."
      }
    ]
  }
};
