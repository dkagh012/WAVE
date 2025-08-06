import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import VideoViewer from "./VideoViewer.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/editor" element={<App />} />
        <Route path="/viewer" element={<VideoViewer />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
