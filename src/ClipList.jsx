import React, { useState } from "react";

export default function ClipList({
  clips,
  selectedClipId,
  onSelectClip,
  onUpdateClip,
  duration,
}) {
  const [editingClip, setEditingClip] = useState(null);
  const [editValues, setEditValues] = useState({ from: "", to: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [isAddingNewClip, setIsAddingNewClip] = useState(false);
  const [newClipValues, setNewClipValues] = useState({
    label: "",
    from: "",
    to: "",
  });
  const [checkedClips, setCheckedClips] = useState([]); // 체크된 클립 id 배열
  const [highlights, setHighlights] = useState([]); // 하이라이트 리스트

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

  // 30초 단위로 시간을 비교하는 함수
  const compareTimeInMinutes = (time1, time2) => {
    const thirtySeconds1 = Math.floor(time1 / 30);
    const thirtySeconds2 = Math.floor(time2 / 30);
    return Math.abs(thirtySeconds1 - thirtySeconds2);
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

  const handleAddNewClip = () => {
    setIsAddingNewClip(true);
    setNewClipValues({ label: "", from: "", to: "" });
    setErrorMessage("");
  };

  const handleSaveNewClip = () => {
    const from = parseTimeString(newClipValues.from);
    const to = parseTimeString(newClipValues.to);

    // 유효성 검사
    if (!newClipValues.label.trim()) {
      setErrorMessage("클립 이름을 입력해주세요.");
      return;
    }

    if (from < 0) {
      setErrorMessage("시작 값은 0 이상이어야 합니다.");
      return;
    }

    if (to <= 0) {
      setErrorMessage("종료 값은 0보다 커야 합니다.");
      return;
    }

    if (from >= to) {
      setErrorMessage("시작 값이 종료 값보다 클 수 없습니다.");
      return;
    }

    // 1분 단위로 시간 비교하여 알림
    const timeDifference = compareTimeInMinutes(from, to);
    if (timeDifference < 1) {
      setErrorMessage(
        "⚠️ 클립 길이가 1분 미만입니다. 더 긴 구간을 선택해주세요."
      );
      return;
    }

    // 영상 길이 제한 확인
    if (duration && to > duration) {
      setErrorMessage(
        `⚠️ 클립 종료 시간이 영상 길이(${formatTime(duration)})를 초과합니다.`
      );
      return;
    }

    // 새 클립 생성
    const newClip = {
      id: Date.now(), // 임시 ID 생성
      label: newClipValues.label.trim(),
      from: from,
      to: to,
    };

    // 부모 컴포넌트에 새 클립 추가 요청
    if (onUpdateClip) {
      onUpdateClip(newClip, true); // true는 새 클립 추가를 의미
    }

    setIsAddingNewClip(false);
    setNewClipValues({ label: "", from: "", to: "" });
    setErrorMessage("");
  };

  const handleCancelNewClip = () => {
    setIsAddingNewClip(false);
    setNewClipValues({ label: "", from: "", to: "" });
    setErrorMessage("");
  };

  const handleSave = (clipId) => {
    const from = parseTimeString(editValues.from);
    const to = parseTimeString(editValues.to);

    // 유효성 검사
    if (from < 0) {
      setErrorMessage("시작 값은 0 이상이어야 합니다.");
      return;
    }

    if (to <= 0) {
      setErrorMessage("종료 값은 0보다 커야 합니다.");
      return;
    }

    // from이 to보다 크면 안 됨
    if (from >= to) {
      setErrorMessage("시작 값이 종료 값보다 클 수 없습니다.");
      return;
    }

    // to가 from보다 작으면 안 됨
    if (to <= from) {
      setErrorMessage("종료 값이 시작 값보다 클 수 없습니다.");
      return;
    }

    // 1분 단위로 시간 비교하여 알림
    const timeDifference = compareTimeInMinutes(from, to);
    if (timeDifference < 1) {
      setErrorMessage(
        "⚠️ 클립 길이가 1분 미만입니다. 더 긴 구간을 선택해주세요."
      );
      return;
    }

    // 영상 길이 제한 확인 (duration prop이 필요)
    if (duration && to > duration) {
      setErrorMessage(
        `⚠️ 클립 종료 시간이 영상 길이(${formatTime(duration)})를 초과합니다.`
      );
      return;
    }

    // 에러 메시지 초기화
    setErrorMessage("");

    const updatedClip = clips.find((c) => c.id === clipId);
    if (updatedClip) {
      onUpdateClip({
        ...updatedClip,
        from: from,
        to: to,
      });
    }
    setEditingClip(null);
  };

  const handleCancel = () => {
    setEditingClip(null);
    setErrorMessage(""); // 에러 메시지 초기화
  };

  const handleFromChange = (clipId, newFrom) => {
    setEditValues((prev) => ({
      ...prev,
      from: newFrom,
    }));
  };

  const handleToChange = (clipId, newTo) => {
    setEditValues((prev) => ({
      ...prev,
      to: newTo,
    }));
  };

  // 체크박스 핸들러
  const handleCheckboxChange = (clipId) => {
    setCheckedClips((prev) =>
      prev.includes(clipId)
        ? prev.filter((id) => id !== clipId)
        : [...prev, clipId]
    );
  };

  // 하이라이트 생성
  const handleCreateHighlight = () => {
    const selectedClips = clips.filter((clip) =>
      checkedClips.includes(clip.id)
    );
    const highlight = {
      id: Date.now(),
      videoName: `하이라이트 ${highlights.length + 1}`,
      clips: selectedClips.map((clip) => ({ from: clip.from, to: clip.to })),
      meta: selectedClips.map((clip) => clip.label),
    };
    setHighlights((prev) => [...prev, highlight]);
    console.log("하이라이트 생성:", highlight);
    setCheckedClips([]);
  };

  // 이름 클릭 시 수정 모드 진입
  const handleNameClick = (clip, e) => {
    e.stopPropagation();
    setEditingClip(clip.id);
    setEditValues({
      from: formatTimeForInput(clip.from),
      to: formatTimeForInput(clip.to),
    });
    setErrorMessage("");
  };

  return (
    <div className="clip-list">
      <div style={{ marginTop: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <h3>🔹 Clip List</h3>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleAddNewClip}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ➕ 새 클립 추가
            </button>
            <button
              onClick={handleCreateHighlight}
              disabled={checkedClips.length === 0}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                backgroundColor: checkedClips.length === 0 ? "#ccc" : "#1976d2",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: checkedClips.length === 0 ? "not-allowed" : "pointer",
                fontWeight: "bold",
              }}
            >
              ⭐ 하이라이트 생성
            </button>
          </div>
        </div>

        {errorMessage && (
          <div
            style={{
              backgroundColor: "#ffebee",
              color: "#c62828",
              padding: "8px 12px",
              borderRadius: "4px",
              marginBottom: "12px",
              fontSize: "14px",
              border: "1px solid #ef9a9a",
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        {/* 새 클립 추가 폼 */}
        {isAddingNewClip && (
          <div
            style={{
              border: "2px solid #2196f3",
              borderRadius: "8px",
              padding: "15px",
              marginBottom: "15px",
              backgroundColor: "#e3f2fd",
            }}
          >
            <h4 style={{ margin: "0 0 10px 0", color: "#1976d2" }}>
              🆕 새 클립 추가
            </h4>
            <div style={{ marginBottom: "10px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontWeight: "bold",
                }}
              >
                클립 이름:
              </label>
              <input
                type="text"
                value={newClipValues.label}
                onChange={(e) =>
                  setNewClipValues((prev) => ({
                    ...prev,
                    label: e.target.value,
                  }))
                }
                placeholder="클립 이름을 입력하세요"
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  fontSize: "14px",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "bold",
                  }}
                >
                  시작 시간:
                </label>
                <input
                  type="text"
                  placeholder="0:00"
                  value={newClipValues.from}
                  onChange={(e) =>
                    setNewClipValues((prev) => ({
                      ...prev,
                      from: e.target.value,
                    }))
                  }
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
                  }}
                >
                  종료 시간:
                </label>
                <input
                  type="text"
                  placeholder="0:00"
                  value={newClipValues.to}
                  onChange={(e) =>
                    setNewClipValues((prev) => ({
                      ...prev,
                      to: e.target.value,
                    }))
                  }
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
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleSaveNewClip}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                💾 저장
              </button>
              <button
                onClick={handleCancelNewClip}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  backgroundColor: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                ❌ 취소
              </button>
            </div>
          </div>
        )}

        <ul style={{ listStyle: "none", padding: 0 }}>
          {clips.map((clip) => (
            <li
              key={clip.id}
              style={{
                fontWeight: selectedClipId === clip.id ? "bold" : "normal",
                cursor: "pointer",
                padding: "12px",
                backgroundColor:
                  selectedClipId === clip.id ? "#e3f2fd" : "transparent",
                borderRadius: "4px",
                marginBottom: "8px",
                border:
                  selectedClipId === clip.id
                    ? "2px solid #2196f3"
                    : "2px solid transparent",
                color: "black",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              onClick={() => onSelectClip(clip)}
            >
              <input
                type="checkbox"
                checked={checkedClips.includes(clip.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  handleCheckboxChange(clip.id);
                }}
                style={{ marginRight: "8px" }}
              />
              <div style={{ flex: 1 }}>
                <strong
                  style={{
                    textDecoration:
                      editingClip === clip.id ? "underline" : "none",
                    cursor: "pointer",
                  }}
                  onClick={(e) => handleNameClick(clip, e)}
                >
                  {clip.label}
                </strong>
                {editingClip === clip.id ? (
                  <div
                    style={{
                      marginTop: "8px",
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <label style={{ fontSize: "12px", marginRight: "4px" }}>
                        From:
                      </label>
                      <input
                        type="text"
                        placeholder="0:00"
                        value={editValues.from}
                        onChange={(e) => {
                          handleFromChange(clip.id, e.target.value);
                        }}
                        style={{
                          width: "70px",
                          padding: "2px",
                          fontSize: "12px",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "12px", marginRight: "4px" }}>
                        To:
                      </label>
                      <input
                        type="text"
                        placeholder="0:00"
                        value={editValues.to}
                        onChange={(e) => {
                          handleToChange(clip.id, e.target.value);
                        }}
                        style={{
                          width: "70px",
                          padding: "2px",
                          fontSize: "12px",
                        }}
                      />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSave(clip.id);
                      }}
                      style={{
                        padding: "2px 8px",
                        fontSize: "10px",
                        backgroundColor: "#4CAF50",
                        color: "white",
                        border: "none",
                        borderRadius: "2px",
                        cursor: "pointer",
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancel();
                      }}
                      style={{
                        padding: "2px 8px",
                        fontSize: "10px",
                        backgroundColor: "#f44336",
                        color: "white",
                        border: "none",
                        borderRadius: "2px",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: "14px", color: "#666" }}>
                    {formatTime(clip.from)} ~ {formatTime(clip.to)}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3>🔹 Highlight List</h3>
        {/* 하이라이트 리스트 */}
        {highlights.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ margin: "10px 0 5px 0", color: "#1976d2" }}>
              ⭐ 하이라이트 리스트
            </h4>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {highlights.map((hl) => (
                <li
                  key={hl.id}
                  style={{
                    background: "#f3f6fa",
                    border: "1px solid #b3c6e0",
                    borderRadius: 6,
                    marginBottom: 8,
                    padding: 10,
                  }}
                >
                  <div style={{ fontWeight: "bold", fontSize: 15 }}>
                    {hl.videoName}
                  </div>
                  <div style={{ fontSize: 13, color: "#555" }}>
                    메타데이터: {hl.meta.join(", ")}
                  </div>
                  <div style={{ fontSize: 13, color: "#888" }}>
                    구간:{" "}
                    {hl.clips
                      .map((c) => `${formatTime(c.from)}~${formatTime(c.to)}`)
                      .join(", ")}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
