import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./header.scss";

const Header = ({ selectedClipId, onShareClick }) => {
  const location = useLocation();

  return (
    <div className="header">
      <div className="header-content">
        <h2>🎮 Video Clip Editor</h2>

        <nav className="nav-links">
          <Link
            to="/editor"
            className={`nav-link ${
              location.pathname === "/" || location.pathname === "/editor"
                ? "active"
                : ""
            }`}
          >
            ✂️ 편집작업
          </Link>
          <Link
            to="/viewer"
            className={`nav-link ${
              location.pathname === "/viewer" ? "active" : ""
            }`}
          >
            👤 사용자영상
          </Link>
        </nav>

        {onShareClick && (
          <button
            onClick={onShareClick}
            disabled={!selectedClipId}
            className={`share-button ${
              selectedClipId ? "enabled" : "disabled"
            }`}
          >
            📤 클립 공유
          </button>
        )}
      </div>
    </div>
  );
};

export default Header;
