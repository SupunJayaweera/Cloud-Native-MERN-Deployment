/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      maxWidth: {
        full: "100%",
        screen: "100vw",
      },
      width: {
        screen: "100vw",
      },
    },
  },
  plugins: [],
  corePlugins: {
    // Ensure container utilities work properly
    container: true,
  },
};
