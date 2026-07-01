/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0e131e",
          soft: "#121828",
          card: "#171f2e",
          raised: "#212b3d",
          line: "rgba(255, 255, 255, 0.09)",
          line2: "rgba(255, 255, 255, 0.14)",
        },
        // имена neon-* сохранены для совместимости — значения премиальные, приглушённые
        neon: {
          cyan: "#8a93a6",     // нейтральный графит
          magenta: "#c98b8b",  // приглушённая роза
          violet: "#9d8df1",   // лавандовый (партнёр)
          green: "#2ebd85",    // изумруд (прибыль/продано)
          gold: "#e5c07b",     // шампань — главный акцент
          red: "#f6465d",      // красный (убыток)
        },
        ink: {
          DEFAULT: "#f4f4f7",
          dim: "#a0a0ab",
          mute: "#66666f",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"SF Pro Display"',
          "Inter",
          "system-ui",
          "sans-serif",
        ],
        mono: ['"SF Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: {
        tightish: "-0.014em",
        tight2: "-0.022em",
        widest2: "0.16em",
      },
      borderRadius: {
        "2.5xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        "glow-cyan": "0 0 0 1px rgba(138,147,166,0.18)",
        "glow-magenta": "0 0 0 1px rgba(201,139,139,0.20)",
        "glow-violet": "0 0 0 1px rgba(157,141,241,0.20)",
        "glow-green": "0 0 0 1px rgba(46,189,133,0.20)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -8px rgba(0,0,0,0.5)",
        float: "0 12px 40px -8px rgba(0,0,0,0.65), 0 1px 0 0 rgba(255,255,255,0.05) inset",
        gold: "0 6px 20px -6px rgba(229,192,123,0.5), 0 1px 0 rgba(255,255,255,0.25) inset",
      },
      backgroundImage: {
        "grad-gold": "linear-gradient(135deg, #f0d195 0%, #e5c07b 45%, #cda352 100%)",
        "grad-card": "linear-gradient(180deg, #1b2433 0%, #151c29 100%)",
      },
    },
  },
  plugins: [],
};
