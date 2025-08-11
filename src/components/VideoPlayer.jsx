import React, { useRef, useEffect, useState, useCallback } from "react";
import Hls from "hls.js";
import "./VideoPlayer.css";

const VideoPlayer = ({
  videoUrl,
  currentTime,
  onTimeUpdate,
  onDurationChange,
  selectedClipId,
  clips,
}) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);

  // HLS 초기화
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000, // 60MB
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.2,
        nudgeMaxRetry: 5,
        maxFragLookUpTolerance: 0.25,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        liveDurationInfinity: true,
        progressive: true,
        backBufferLength: 90,
      });
      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("HLS manifest 파싱 완료");
        video.addEventListener("loadedmetadata", () => {
          onDurationChange(video.duration);
        });
      });

      // 버퍼링 상태 모니터링
      hls.on(Hls.Events.BUFFER_STALLED, () => {
        console.log("버퍼링 중...");
      });

      hls.on(Hls.Events.BUFFER_APPENDING, () => {
        console.log("버퍼 추가 중...");
      });

      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        console.log("버퍼 추가 완료");
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS 오류:", data);

        // 버퍼링 오류는 무시 (자동으로 복구됨)
        if (
          data.details === "bufferStalledError" ||
          data.details === "bufferNudgeOnStall"
        ) {
          console.log("버퍼링 오류 감지, 자동 복구 대기 중...");
          return;
        }

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("네트워크 오류, 재시도 중...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("미디어 오류, 복구 시도 중...");
              hls.recoverMediaError();
              break;
            default:
              console.log("치명적 오류, HLS 인스턴스 재생성...");
              hls.destroy();
              // HLS 인스턴스 재생성
              setTimeout(() => {
                if (video && videoUrl) {
                  const newHls = new Hls({
                    debug: false,
                    enableWorker: true,
                    lowLatencyMode: true,
                    maxBufferLength: 30,
                    maxMaxBufferLength: 60,
                    maxBufferSize: 60 * 1000 * 1000,
                    maxBufferHole: 0.5,
                    highBufferWatchdogPeriod: 2,
                    nudgeOffset: 0.2,
                    nudgeMaxRetry: 5,
                    maxFragLookUpTolerance: 0.25,
                    liveSyncDurationCount: 3,
                    liveMaxLatencyDurationCount: 10,
                    liveDurationInfinity: true,
                    progressive: true,
                    backBufferLength: 90,
                  });
                  hlsRef.current = newHls;
                  newHls.loadSource(videoUrl);
                  newHls.attachMedia(video);
                }
              }, 1000);
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = videoUrl;
    }

    // 이벤트 리스너 추가
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", () => setIsPlaying(true));
    video.addEventListener("pause", () => setIsPlaying(false));
    video.addEventListener("loadedmetadata", () =>
      onDurationChange(video.duration)
    );

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", () => setIsPlaying(true));
      video.removeEventListener("pause", () => setIsPlaying(false));
      video.removeEventListener("loadedmetadata", () =>
        onDurationChange(video.duration)
      );
    };
  }, [videoUrl, onDurationChange]);

  // 시간 업데이트 핸들러
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const time = video.currentTime;
    onTimeUpdate(time);
  }, [onTimeUpdate]);

  // 클립 선택 시 해당 시간으로 이동
  useEffect(() => {
    if (selectedClipId && clips) {
      const selectedClip = clips.find((clip) => clip.id === selectedClipId);
      if (selectedClip) {
        const video = videoRef.current;
        if (video) {
          video.currentTime = selectedClip.from;
          onTimeUpdate(selectedClip.from);
        }
      }
    }
  }, [selectedClipId, clips, onTimeUpdate]);

  // 재생/일시정지 토글
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  // 커스텀 시크바 클릭 핸들러
  const handleSeekBarClick = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const seekBar = e.currentTarget;
    const rect = seekBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;

    const seekTime = video.duration * percent;
    video.currentTime = seekTime;
  };

  // 시간 포맷팅 함수
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${mins
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    } else {
      return `${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
  };

  // 진행률 계산
  const getProgressPercent = () => {
    const video = videoRef.current;
    if (!video) return 0;

    return (currentTime / video.duration) * 100;
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div className="video-container">
        <video ref={videoRef} className="video-player">
          브라우저가 비디오 태그를 지원하지 않습니다.
        </video>

        {/* 커스텀 재생 컨트롤 */}
        <div className="custom-controls">
          <button className="play-btn" onClick={togglePlayPause}>
            {isPlaying ? "⏸️" : "▶️"}
          </button>

          <button
            className="stop-btn"
            onClick={() => {
              const video = videoRef.current;
              if (video) {
                video.pause();
                video.currentTime = 0;
                setIsPlaying(false);
              }
            }}
          >
            ⏹️
          </button>

          <div className="time-display">
            <span>{formatTime(currentTime)}</span>
          </div>

          <div className="custom-seekbar" onClick={handleSeekBarClick}>
            <div
              className="progress-bar"
              style={{ width: `${getProgressPercent()}%` }}
            ></div>
          </div>

          <div className="time-display">
            <span>{formatTime(videoRef.current?.duration || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
