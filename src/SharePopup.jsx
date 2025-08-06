import React, { useState, useEffect } from "react";

export default function SharePopup({ isOpen, onClose, clip, currentUrl }) {
  const [shareFrom, setShareFrom] = useState("");
  const [shareTo, setShareTo] = useState("");
  const [shareUrl, setShareUrl] = useState("");

  // 초를 시:분:초 형식으로 변환하는 함수
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, "0")}`;
    }
  };

  // 시간 문자열을 초로 변환하는 함수
  const parseTimeString = (timeString) => {
    if (!timeString || timeString.trim() === "") return 0;

    const trimmed = timeString.trim();

    // 이미 숫자인 경우 (초 단위)
    if (!isNaN(trimmed) && !trimmed.includes(":")) {
      return parseFloat(trimmed);
    }

    // 시간 형식 파싱 (HH:MM:SS 또는 MM:SS)
    const parts = trimmed.split(":");

    if (parts.length === 2) {
      // MM:SS 형식 (예: 30:00, 5:00)
      const minutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);

      if (isNaN(minutes) || isNaN(seconds)) return 0;

      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      // HH:MM:SS 형식 (예: 1:00:00)
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const seconds = parseInt(parts[2], 10);

      if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return 0;

      return hours * 3600 + minutes * 60 + seconds;
    }

    return 0;
  };

  // 초를 시간 형식 문자열로 변환하는 함수 (입력 필드용)
  const formatTimeForInput = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, "0")}`;
    }
  };

  // 클립이 변경될 때 초기값 설정
  useEffect(() => {
    if (clip) {
      setShareFrom(formatTimeForInput(clip.from));
      setShareTo(formatTimeForInput(clip.to));
    }
  }, [clip]);

  // 공유 URL 생성
  const generateShareUrl = () => {
    const from = parseTimeString(shareFrom);
    const to = parseTimeString(shareTo);

    const url = new URL(currentUrl);
    url.searchParams.set("from", from);
    url.searchParams.set("to", to);
    url.searchParams.set("clip", clip?.label || "shared-clip");

    return url.toString();
  };

  // 공유 링크 생성 및 복사
  const handleGenerateShare = () => {
    const url = generateShareUrl();
    setShareUrl(url);

    // 클립보드에 복사
    navigator.clipboard.writeText(url).then(() => {
      alert("공유 링크가 클립보드에 복사되었습니다!");
    });
  };

  if (!isOpen || !clip) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "20px",
          width: "400px",
          maxWidth: "90vw",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ margin: 0, color: "#1976d2" }}>📤 클립 공유</h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              color: "#666",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>
            클립: {clip.label}
          </h4>
          <p style={{ margin: "0 0 15px 0", color: "#666", fontSize: "14px" }}>
            공유할 시간 구간을 설정하세요
          </p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                시작 시간:
              </label>
              <input
                type="text"
                placeholder="0:00"
                value={shareFrom}
                onChange={(e) => setShareFrom(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  fontSize: "14px",
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                종료 시간:
              </label>
              <input
                type="text"
                placeholder="0:00"
                value={shareTo}
                onChange={(e) => setShareTo(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  fontSize: "14px",
                }}
              />
            </div>
          </div>

          <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
            원본: {formatTime(clip.from)} ~ {formatTime(clip.to)}
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={handleGenerateShare}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "16px",
              backgroundColor: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🔗 공유 링크 생성
          </button>
        </div>

        {shareUrl && (
          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
                fontSize: "14px",
              }}
            >
              공유 링크:
            </label>
            <div
              style={{
                padding: "10px",
                backgroundColor: "#f5f5f5",
                borderRadius: "4px",
                fontSize: "12px",
                wordBreak: "break-all",
                border: "1px solid #ddd",
              }}
            >
              {shareUrl}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "8px 16px",
              fontSize: "14px",
              backgroundColor: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
