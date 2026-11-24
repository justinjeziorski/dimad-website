import { Playfair_Display } from "next/font/google";

/** Editorial display face for the City Header — self-hosted via next/font (no render-blocking <link>). */
export const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-playfair"
});
