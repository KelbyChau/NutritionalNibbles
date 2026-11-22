import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // The device's own system font (San Francisco on Apple devices), with
      // Inter loaded for everything else. Numbers use the rounded variant.
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", '"SF Pro Text"', '"SF Pro Display"', "var(--font-inter)", "system-ui", "sans-serif"],
        display: ["-apple-system", "BlinkMacSystemFont", '"SF Pro Display"', "var(--font-inter)", "system-ui", "sans-serif"],
        rounded: ["ui-rounded", '"SF Pro Rounded"', "-apple-system", "BlinkMacSystemFont", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        nutrient: {
          calories: "hsl(var(--nutrient-calories))",
          protein: "hsl(var(--nutrient-protein))",
          carbs: "hsl(var(--nutrient-carbs))",
          fat: "hsl(var(--nutrient-fat))",
        },
        // Older name for the same colors, still used by the macro split bar.
        macro: {
          protein: "hsl(var(--nutrient-protein))",
          carbs: "hsl(var(--nutrient-carbs))",
          fat: "hsl(var(--nutrient-fat))",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        panel: "28px",
        card: "20px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        panel: "0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px rgb(0 0 0 / 0.06)",
        lift: "0 2px 6px rgb(0 0 0 / 0.06), 0 18px 40px rgb(0 0 0 / 0.10)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
