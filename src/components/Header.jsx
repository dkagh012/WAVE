import React from "react";
import "./header.scss";
const Header = ({ selectedClipId, onShareClick }) => {
  return (
    <div className="header">
      <h2>🎮 Video Clip Editor with Timeline</h2>
      <button
        onClick={onShareClick}
        disabled={!selectedClipId}
        className={`share-button ${selectedClipId ? "enabled" : "disabled"}`}
      >
        📤 클립 공유
      </button>
    </div>
  );
};

export default Header;
