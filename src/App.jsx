import React, { useEffect, useState, useCallback } from "react";
import ClipList from "./ClipList";
import SharePopup from "./SharePopup";
import VideoPlayer from "./components/VideoPlayer";
import Waveform from "./components/Waveform";
import TimeDisplay from "./components/TimeDisplay";
import Header from "./components/Header";
import "./App.css";

// 오디오 파일 import
import audioFile from "./assets/output.mp3";

const audioUrl = audioFile;
const videoUrl = "/master.m3u8";
const initialClips = [
  { id: 1, label: "Intro", from: 10, to: 30 },
  { id: 2, label: "Middle", from: 600, to: 1200 },
  { id: 3, label: "Middle", from: 1200, to: 1800 },
  { id: 4, label: "Middle", from: 1800, to: 2400 },
  { id: 5, label: "Middle", from: 2400, to: 3000 },
  { id: 6, label: "Middle", from: 3000, to: 3600 },
  { id: 7, label: "Middle", from: 3600, to: 4200 },
  { id: 8, label: "Middle", from: 4200, to: 4800 },
  { id: 9, label: "Middle", from: 4800, to: 5400 },
  { id: 10, label: "Middle", from: 5400, to: 6000 },
];

export default function VideoEditor() {
  const [clips, setClips] = useState(initialClips);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 공유 관련 상태
  const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);
  const [selectedClipForShare, setSelectedClipForShare] = useState(null);

  // URL 파라미터에서 공유된 시간 정보 확인
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const from = urlParams.get("from");
    const to = urlParams.get("to");
    const clipName = urlParams.get("clip");

    if (from && to) {
      const fromTime = parseFloat(from);
      const toTime = parseFloat(to);

      if (!isNaN(fromTime) && !isNaN(toTime)) {
        console.log(
          `공유된 링크: ${clipName || "클립"} (${fromTime} ~ ${toTime})`
        );
      }
    }
  }, []);

  // 클립 선택 핸들러
  const handleClipSelect = useCallback((clip) => {
    setSelectedClipId(clip.id);
  }, []);

  // 클립 업데이트 핸들러
  const handleClipUpdate = useCallback(
    (updatedClip, isNewClip = false) => {
      if (updatedClip.to > duration) {
        console.log(
          "클립 종료 시간이 영상 길이를 초과합니다:",
          updatedClip.to,
          ">",
          duration
        );
        return;
      }

      if (isNewClip) {
        setClips((prevClips) => [...prevClips, updatedClip]);
        setSelectedClipId(updatedClip.id);
      } else {
        setClips((prevClips) =>
          prevClips.map((c) => (c.id === updatedClip.id ? updatedClip : c))
        );
      }
    },
    [duration]
  );

  // 공유 팝업 열기
  const handleShareClick = () => {
    const selectedClip = clips.find((clip) => clip.id === selectedClipId);
    if (selectedClip) {
      setSelectedClipForShare(selectedClip);
      setIsSharePopupOpen(true);
    }
  };

  // 공유 시간 업데이트
  const handleShareTimeUpdate = ({ from }) => {
    setCurrentTime(from);
  };

  // 공유 팝업 닫기
  const handleCloseSharePopup = () => {
    setIsSharePopupOpen(false);
    setSelectedClipForShare(null);
  };

  // 파형 준비 완료 핸들러
  const handleWaveformReady = () => {
    // 파형이 준비되면 필요한 경우 여기서 처리
  };

  // 시간 업데이트 핸들러
  const handleTimeUpdate = useCallback((time) => {
    setCurrentTime(time);
  }, []);

  // 지속 시간 변경 핸들러
  const handleDurationChange = useCallback((newDuration) => {
    setDuration(newDuration);
  }, []);

  return (
    <div>
      <Header selectedClipId={selectedClipId} onShareClick={handleShareClick} />

      <TimeDisplay currentTime={currentTime} duration={duration} />

      <div className="video-container">
        <VideoPlayer
          videoUrl={videoUrl}
          currentTime={currentTime}
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={handleDurationChange}
          selectedClipId={selectedClipId}
          clips={clips}
        />
        <div className="clip-list-container">
          <ClipList
            clips={clips}
            selectedClipId={selectedClipId}
            onSelectClip={handleClipSelect}
            onUpdateClip={handleClipUpdate}
            duration={duration}
          />
        </div>
      </div>

      <Waveform
        audioUrl={audioUrl}
        currentTime={currentTime}
        onDurationChange={handleDurationChange}
        onRegionsPluginChange={() => {}}
        onWaveformReady={handleWaveformReady}
        clips={clips}
        selectedClipId={selectedClipId}
        onClipUpdate={handleClipUpdate}
        onClipSelect={handleClipSelect}
        onTimeUpdate={handleTimeUpdate}
      />

      {/* 공유 팝업 */}
      <SharePopup
        isOpen={isSharePopupOpen}
        onClose={handleCloseSharePopup}
        clip={selectedClipForShare}
        currentUrl={window.location.href}
        onTimeUpdate={handleShareTimeUpdate}
      />
    </div>
  );
}
