import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import "./VideoViewer.css";
import Header from "./components/Header";

function App() {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentClip, setCurrentClip] = useState(null);
  const [clipStartTime, setClipStartTime] = useState(0);
  const [clipEndTime, setClipEndTime] = useState(0);
  const [isClipMode, setIsClipMode] = useState(false);
  const [isClipEnded, setIsClipEnded] = useState(false);

  useEffect(() => {
    // HLS 초기화
    if (Hls.isSupported()) {
      hlsRef.current = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      // HLS 이벤트 리스너 설정
      hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("HLS 매니페스트 파싱 완료");
        setDuration(hlsRef.current.duration);
      });

      hlsRef.current.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS 에러:", data);
      });

      // 비디오 소스 설정
      hlsRef.current.loadSource("/hls/output.m3u8");
      hlsRef.current.attachMedia(videoRef.current);

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
      };
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari 네이티브 HLS 지원
      videoRef.current.src = "/hls/output.m3u8";
    }
  }, []);

  // 비디오 시간 업데이트
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;

      if (isClipMode) {
        // 클립 모드일 때는 클립 시작 시간부터의 상대적 시간 계산
        const relativeTime = currentTime - clipStartTime;

        // 클립 범위를 벗어나지 않도록 제한
        if (currentTime >= clipEndTime) {
          video.currentTime = clipEndTime;
          setCurrentTime(duration); // 클립의 마지막 시간
          setIsPlaying(false);
          setIsClipEnded(true);
          return;
        }

        if (currentTime < clipStartTime) {
          video.currentTime = clipStartTime;
          setCurrentTime(0);
          return;
        }

        setCurrentTime(relativeTime);
      } else {
        // 전체 영상 모드일 때는 절대 시간
        setCurrentTime(currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      if (isClipMode) {
        // 클립 모드일 때는 클립 길이만큼만 duration 설정
        setDuration(clipEndTime - clipStartTime);
      } else {
        // 전체 영상 모드일 때는 전체 길이
        setDuration(video.duration);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("loadstart", handleLoadStart);
    video.addEventListener("canplay", handleCanPlay);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("loadstart", handleLoadStart);
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [isClipMode, clipStartTime, clipEndTime, duration]);

  // 클립 재생 함수 - 구간별 스트리밍
  const playClip = async (startTime, endTime, clipName) => {
    if (!videoRef.current || !hlsRef.current) return;

    try {
      setIsLoading(true);
      setCurrentClip(clipName);
      setClipStartTime(startTime);
      setClipEndTime(endTime);
      setIsClipMode(true);
      setIsClipEnded(false);

      // 현재 HLS 인스턴스 정리
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      // 새로운 HLS 인스턴스 생성
      hlsRef.current = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        startLevel: -1, // 자동 품질 선택
        startPosition: startTime, // 시작 위치 설정
      });

      // HLS 이벤트 리스너 설정
      hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("클립 HLS 매니페스트 파싱 완료");

        // 시작 시간으로 이동
        videoRef.current.currentTime = startTime;

        // 클립 길이 설정
        setDuration(endTime - startTime);

        // 재생 시작
        videoRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            setIsLoading(false);
          })
          .catch((error) => {
            console.error("클립 재생 실패:", error);
            setIsLoading(false);
            setCurrentClip(null);
            setIsClipMode(false);
            setIsClipEnded(false);
          });
      });

      hlsRef.current.on(Hls.Events.ERROR, (event, data) => {
        console.error("클립 HLS 에러:", data);
        setIsLoading(false);
        setCurrentClip(null);
        setIsClipMode(false);
        setIsClipEnded(false);
      });

      // 클립 구간에 맞는 세그먼트만 로드
      hlsRef.current.loadSource("/hls/output.m3u8");
      hlsRef.current.attachMedia(videoRef.current);
    } catch (error) {
      console.error("클립 로드 실패:", error);
      setIsLoading(false);
      setCurrentClip(null);
      setIsClipMode(false);
      setIsClipEnded(false);
    }
  };

  // 클립 리플레이
  const replayClip = () => {
    if (!currentClip || !clipStartTime || !clipEndTime) return;

    // 현재 클립을 다시 재생
    playClip(clipStartTime, clipEndTime, currentClip);
  };

  // 전체 영상으로 돌아가기
  const playFullVideo = () => {
    if (!videoRef.current) return;

    // 현재 HLS 인스턴스 정리
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    // 전체 영상 HLS 인스턴스 재생성
    hlsRef.current = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 90,
    });

    hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log("전체 영상 HLS 매니페스트 파싱 완료");
      setDuration(hlsRef.current.duration);
    });

    hlsRef.current.on(Hls.Events.ERROR, (event, data) => {
      console.error("전체 영상 HLS 에러:", data);
    });

    hlsRef.current.loadSource("/hls/output.m3u8");
    hlsRef.current.attachMedia(videoRef.current);

    setCurrentClip(null);
    setClipStartTime(0);
    setClipEndTime(0);
    setIsClipMode(false);
    setIsClipEnded(false);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // 재생/일시정지/리플레이 토글
  const togglePlayPause = () => {
    if (!videoRef.current) return;

    if (isClipEnded) {
      // 클립이 끝났을 때는 리플레이
      replayClip();
    } else if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  // 시간 포맷팅 함수
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // 프로그레스 바 클릭으로 시간 이동
  const handleProgressClick = (e) => {
    if (!videoRef.current || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = clickX / rect.width;

    if (isClipMode) {
      // 클립 모드일 때는 클립 시작 시간부터의 상대적 시간 계산
      const newRelativeTime = clickPercent * duration;
      const newAbsoluteTime = clipStartTime + newRelativeTime;

      // 클립 범위 내에서만 이동 가능
      if (newAbsoluteTime >= clipStartTime && newAbsoluteTime <= clipEndTime) {
        videoRef.current.currentTime = newAbsoluteTime;
        setIsClipEnded(false);
      }
    } else {
      // 전체 영상 모드일 때는 절대 시간
      const newTime = clickPercent * duration;
      videoRef.current.currentTime = newTime;
    }
  };

  return (
    <div className="app">
      <Header selectedClipId={null} onShareClick={null} />
      <div className="video-container">
        <video
          ref={videoRef}
          className="video-player"
          style={{ width: "100%", maxWidth: "800px" }}
        />

        {/* 커스텀 컨트롤 */}
        <div className="custom-controls">
          <button onClick={togglePlayPause} className="control-btn">
            {isClipEnded ? "🔄" : isPlaying ? "⏸️" : "▶️"}
          </button>

          <div className="progress-container" onClick={handleProgressClick}>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <span className="time-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner">클립 로딩 중...</div>
          </div>
        )}

        {currentClip && (
          <div className="current-clip-info">
            현재 재생 중: {currentClip}
            <br />
            {formatTime(clipStartTime)} ~ {formatTime(clipEndTime)}
            {isClipEnded && <br />}
            {isClipEnded && (
              <span style={{ color: "#ffc107" }}>
                클립 재생 완료 - 🔄 버튼으로 다시 보기
              </span>
            )}
          </div>
        )}

        {currentClip && (
          <button onClick={playFullVideo} className="full-video-btn">
            전체 영상 보기
          </button>
        )}
      </div>
      <div className="clips-section">
        <h2>클립 목록</h2>
        <div className="clips-list">
          {/* 초반 구간 클립 (0~40분) */}
          <div
            className="clip-item"
            onClick={() =>
              playClip(180, 181, "클립 1: 3분 - 6분 구간 (초반 하이라이트)")
            }
          >
            클립 1: 3분 - 6분 구간 (초반 하이라이트)
          </div>
          <div
            className="clip-item"
            onClick={() =>
              playClip(600, 840, "클립 2: 10분 - 14분 구간 (첫 득점 장면)")
            }
          >
            클립 2: 10분 - 14분 구간 (첫 득점 장면)
          </div>
          <div
            className="clip-item"
            onClick={() =>
              playClip(1200, 1500, "클립 3: 20분 - 25분 구간 (선수 교체)")
            }
          >
            클립 3: 20분 - 25분 구간 (선수 교체)
          </div>

          {/* 중간 구간 클립 (40~80분) */}
          <div
            className="clip-item"
            onClick={() =>
              playClip(2700, 3000, "클립 4: 45분 - 50분 구간 (중간 하이라이트)")
            }
          >
            클립 4: 45분 - 50분 구간 (중간 하이라이트)
          </div>
          <div
            className="clip-item"
            onClick={() =>
              playClip(3300, 3600, "클립 5: 55분 - 60분 구간 (팀 타임아웃)")
            }
          >
            클립 5: 55분 - 60분 구간 (팀 타임아웃)
          </div>
          <div
            className="clip-item"
            onClick={() =>
              playClip(4200, 4500, "클립 6: 70분 - 75분 구간 (중요 전술 변화)")
            }
          >
            클립 6: 70분 - 75분 구간 (중요 전술 변화)
          </div>
          <div
            className="clip-item"
            onClick={() =>
              playClip(4800, 5100, "클립 7: 80분 - 85분 구간 (결정적 장면)")
            }
          >
            클립 7: 80분 - 85분 구간 (결정적 장면)
          </div>

          {/* 끝 구간 클립 (80~120분) */}
          <div
            className="clip-item"
            onClick={() =>
              playClip(5700, 6000, "클립 8: 95분 - 100분 구간 (마지막 득점)")
            }
          >
            클립 8: 95분 - 100분 구간 (마지막 득점)
          </div>
          <div
            className="clip-item"
            onClick={() =>
              playClip(
                6300,
                6600,
                "클립 9: 105분 - 110분 구간 (종료 직전 장면)"
              )
            }
          >
            클립 9: 105분 - 110분 구간 (종료 직전 장면)
          </div>
          <div
            className="clip-item"
            onClick={() =>
              playClip(6900, 7200, "클립 10: 115분 - 120분 구간 (경기 종료)")
            }
          >
            클립 10: 115분 - 120분 구간 (경기 종료)
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
