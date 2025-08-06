import React from "react";

const TimeDisplay = ({ currentTime, duration }) => {
  // 시간을 MM:SS 형식으로 변환하는 함수
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor((seconds % 3600) % 60);
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    } else {
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
  };

  return (
    <div
      style={{
        marginTop: 10,
        fontSize: "18px",
        fontWeight: "bold",
        fontFamily: "monospace",
        color: "#333",
      }}
    >
      {formatTime(currentTime)} / {formatTime(duration)}
    </div>
  );
};

export default TimeDisplay;
