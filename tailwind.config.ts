import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', "Inter", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          glow: "hsl(var(--primary-glow))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-gold": "var(--gradient-gold)",
        "gradient-dark": "var(--gradient-dark)",
        "gradient-hero": "var(--gradient-hero)",
      },
      boxShadow: {
        glow: "var(--shadow-glow)",
        gold: "var(--shadow-gold)",
        soft: "var(--shadow-md)",
        "glow-lg": "0 20px 60px -15px hsl(var(--primary) / 0.55)",
        "inner-glow": "inset 0 1px 0 hsl(0 0% 100% / 0.1)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "fade-in-fast": { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "scale-in": { "0%": { opacity: "0", transform: "scale(0.94)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        "slide-up": { "0%": { opacity: "0", transform: "translateY(32px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "slide-right": { "0%": { opacity: "0", transform: "translateX(-24px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
        "slide-left": { "0%": { opacity: "0", transform: "translateX(24px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
        "pulse-glow": { "0%,100%": { boxShadow: "0 0 0 0 hsl(var(--primary)/0.5)" }, "50%": { boxShadow: "0 0 0 12px hsl(var(--primary)/0)" } },
        "float": {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "float-slow": {
          "0%,100%": { transform: "translateY(0px) scale(1)" },
          "50%": { transform: "translateY(-18px) scale(1.03)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "orb-drift": {
          "0%,100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(30px,-20px) scale(1.05)" },
          "66%": { transform: "translate(-20px,15px) scale(0.97)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "border-glow": {
          "0%,100%": { borderColor: "hsl(var(--primary)/0.3)" },
          "50%": { borderColor: "hsl(var(--primary)/0.8)" },
        },
        "text-shimmer": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" },
        },
        "count": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out both",
        "fade-in-fast": "fade-in-fast 0.35s ease-out both",
        "scale-in": "scale-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
        "slide-up": "slide-up 0.6s cubic-bezier(0.22,1,0.36,1) both",
        "slide-right": "slide-right 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "slide-left": "slide-left 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
        "float": "float 5s ease-in-out infinite",
        "float-slow": "float-slow 8s ease-in-out infinite",
        "shimmer": "shimmer 2.2s linear infinite",
        "orb-drift": "orb-drift 12s ease-in-out infinite",
        "spin-slow": "spin-slow 12s linear infinite",
        "border-glow": "border-glow 2s ease-in-out infinite",
        "text-shimmer": "text-shimmer 3s linear infinite",
        "count": "count 0.5s ease-out both",
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
