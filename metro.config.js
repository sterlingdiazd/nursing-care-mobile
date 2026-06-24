const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Allow PDF files to be bundled as static assets (e.g. nurse manual)
config.resolver.assetExts.push("pdf");

module.exports = config;
