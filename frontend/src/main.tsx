import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@/styles";

import { initProductAnalytics } from "@/lib/analytics/productAnalytics";

initProductAnalytics();

createRoot(document.getElementById("root")!).render(<App />);
