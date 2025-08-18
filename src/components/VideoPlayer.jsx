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
  const [showSettings, setShowSettings] = useState(false);
  const [currentQuality, setCurrentQuality] = useState("auto");
  const [currentPlaybackRate, setCurrentPlaybackRate] = useState(1);
  const [availableQualities, setAvailableQualities] = useState([]);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);

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
        maxBufferHole: 0.3,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.2,
        nudgeMaxRetry: 5,
        maxFragLookUpTolerance: 0.25,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        liveDurationInfinity: true,
        progressive: true,
        backBufferLength: 90,
        // 화질 변경 시 부드러운 전환을 위한 추가 설정
        abrEwmaDefaultEstimate: 500000, // 500kbps 기본 추정치
        abrBandWidthFactor: 0.95, // 대역폭 팩터
        abrBandWidthUpFactor: 0.7, // 상향 대역폭 팩터
        abrMaxWithRealBitrate: true, // 실제 비트레이트 기반 최대값
        // 세그먼트 로딩 최적화
        maxLoadingDelay: 4,
        maxStarvationDelay: 4,
        // 프리로딩 설정
        enableSoftwareAES: true,
        startLevel: -1, // 자동 시작 레벨
        startFragPrefetch: true, // 시작 프래그먼트 프리페치
        testBandwidth: true, // 대역폭 테스트 활성화
      });
      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("HLS manifest 파싱 완료");

        // 사용 가능한 화질 목록 가져오기
        const levels = hls.levels;
        if (levels && levels.length > 0) {
          const qualities = levels.map((level, index) => ({
            id: index,
            height: level.height,
            bitrate: level.bitrate,
            label: `${level.height}p (${Math.round(level.bitrate / 1000)}kbps)`,
          }));
          setAvailableQualities(qualities);

          // 초기 화질을 자동으로 설정
          hls.currentLevel = -1;
        }

        video.addEventListener("loadedmetadata", () => {
          onDurationChange(video.duration);
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        // 버퍼링 오류는 무시 (자동으로 복구됨)
        if (
          data.details === "bufferStalledError" ||
          data.details === "bufferNudgeOnStall" ||
          data.details === "fragLoadError" ||
          data.details === "keyLoadError"
        ) {
          console.log("HLS 경고 (자동 복구됨):", data.details);
          return;
        }

        // 치명적이지 않은 오류는 경고로 표시
        if (!data.fatal) {
          console.warn("HLS 경고:", data.details || data.type);
          return;
        }

        console.error("HLS 치명적 오류:", {
          type: data.type,
          details: data.details,
          fatal: data.fatal,
          error: data.error,
        });

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
                    maxBufferHole: 0.3,
                    highBufferWatchdogPeriod: 2,
                    nudgeOffset: 0.2,
                    nudgeMaxRetry: 5,
                    maxFragLookUpTolerance: 0.25,
                    liveSyncDurationCount: 3,
                    liveMaxLatencyDurationCount: 10,
                    liveDurationInfinity: true,
                    progressive: true,
                    backBufferLength: 90,
                    // 화질 변경 시 부드러운 전환을 위한 추가 설정
                    abrEwmaDefaultEstimate: 500000,
                    abrBandWidthFactor: 0.95,
                    abrBandWidthUpFactor: 0.7,
                    abrMaxWithRealBitrate: true,
                    maxLoadingDelay: 4,
                    maxStarvationDelay: 4,
                    enableSoftwareAES: true,
                    startLevel: -1,
                    startFragPrefetch: true,
                    testBandwidth: true,
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
    if (!video || !video.duration || !isFinite(video.duration)) return;

    const seekBar = e.currentTarget;
    const rect = seekBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;

    // 퍼센트 값을 0-1 범위로 제한
    const clampedPercent = Math.max(0, Math.min(1, percent));
    const seekTime = video.duration * clampedPercent;

    // seekTime이 유효한 값인지 확인
    if (isFinite(seekTime) && seekTime >= 0) {
      try {
        setIsSeeking(true);
        video.currentTime = seekTime;

        // 시크 완료 후 로딩 상태 해제
        setTimeout(() => {
          setIsSeeking(false);
        }, 500);
      } catch (error) {
        console.warn("시크 실패:", error);
        setIsSeeking(false);
      }
    }
  };

  // 프로그레스바 드래그 시작
  const handleSeekBarMouseDown = (e) => {
    const video = videoRef.current;
    if (!video || !video.duration || !isFinite(video.duration)) return;

    setIsDragging(true);
    // 마우스 다운 시 즉시 시크
    handleSeekBarClick(e);
  };

  // 프로그레스바 드래그 중 (throttle 적용)
  const handleSeekBarMouseMove = useCallback(
    (e) => {
      if (isDragging) {
        // throttle을 적용하여 성능 개선
        requestAnimationFrame(() => {
          handleSeekBarClick(e);
        });
      }
    },
    [isDragging]
  );

  // 프로그레스바 드래그 종료
  const handleSeekBarMouseUp = () => {
    setIsDragging(false);
  };

  // 마우스 리브 시에도 드래그 종료
  const handleSeekBarMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  // 비디오 클릭으로 재생/정지 토글
  const handleVideoClick = () => {
    togglePlayPause();
  };

  // 화질 변경 핸들러
  const handleQualityChange = (qualityId) => {
    if (hlsRef.current) {
      const hls = hlsRef.current;
      const video = videoRef.current;

      // 현재 재생 상태 저장
      const wasPlaying = !video.paused;
      const currentTime = video.currentTime;

      // 화질 변경 시 부드러운 전환을 위한 설정
      if (qualityId === "auto") {
        // 자동 모드로 설정
        hls.currentLevel = -1;
        setCurrentQuality("auto");
      } else {
        // 특정 화질로 설정
        try {
          // 현재 세그먼트가 끝날 때까지 기다린 후 화질 변경
          const currentLevel = hls.currentLevel;
          if (currentLevel !== qualityId) {
            // 화질 변경 전에 현재 재생 상태 확인
            if (wasPlaying) {
              video.pause();
            }

            // 화질 변경
            hls.currentLevel = qualityId;
            setCurrentQuality(qualityId);

            // 화질 변경 후 현재 시간으로 복원
            setTimeout(() => {
              if (video) {
                video.currentTime = currentTime;
                if (wasPlaying) {
                  video.play().catch(console.error);
                }
              }
            }, 100);
          }
        } catch (error) {
          console.error("화질 변경 실패:", error);
          // 실패 시 자동 모드로 복원
          hls.currentLevel = -1;
          setCurrentQuality("auto");
        }
      }
    }
  };

  // 배속 변경 핸들러
  const handlePlaybackRateChange = (rate) => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = rate;
      setCurrentPlaybackRate(rate);
    }
  };

  // 전체화면 토글 핸들러
  const toggleFullscreen = () => {
    const videoContainer = videoRef.current?.parentElement;
    if (!videoContainer) return;

    if (!document.fullscreenElement) {
      // 전체화면으로 전환
      if (videoContainer.requestFullscreen) {
        videoContainer.requestFullscreen();
      } else if (videoContainer.webkitRequestFullscreen) {
        videoContainer.webkitRequestFullscreen();
      } else if (videoContainer.msRequestFullscreen) {
        videoContainer.msRequestFullscreen();
      }
    } else {
      // 전체화면 해제
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  // 10초 앞으로 이동
  const skipForward = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.min(video.currentTime + 10, video.duration);
    }
  };

  // 10초 뒤로 이동
  const skipBackward = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(video.currentTime - 10, 0);
    }
  };

  // 볼륨 변경 핸들러
  const handleVolumeChange = (newVolume) => {
    const video = videoRef.current;
    if (video) {
      const clampedVolume = Math.max(0, Math.min(1, newVolume));
      video.volume = clampedVolume;
      setVolume(clampedVolume);

      // 볼륨이 0이면 음소거 상태로 설정
      if (clampedVolume === 0) {
        setIsMuted(true);
      } else {
        setIsMuted(false);
      }
    }
  };

  // 음소거 토글 핸들러
  const toggleMute = () => {
    const video = videoRef.current;
    if (video) {
      if (isMuted) {
        video.volume = volume;
        setIsMuted(false);
      } else {
        video.volume = 0;
        setIsMuted(true);
      }
    }
  };

  // 시간 포맷팅 함수
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor((seconds % 3600) % 60);

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
    if (!video || !video.duration || !isFinite(video.duration)) return 0;

    const percent = (currentTime / video.duration) * 100;
    return isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  };

  // 시크 프리뷰 시간 계산
  const getSeekPreviewTime = () => {
    const video = videoRef.current;
    if (!video || !video.duration || !isFinite(video.duration)) return 0;

    // 마우스 위치에 따른 시간 계산 (드래그 중일 때)
    if (isDragging) {
      const seekBar = document.querySelector(".video-player__seekbar");
      if (seekBar) {
        const rect = seekBar.getBoundingClientRect();
        const mouseX = event?.clientX || rect.left;
        const percent = (mouseX - rect.left) / rect.width;
        const clampedPercent = Math.max(0, Math.min(1, percent));
        return video.duration * clampedPercent;
      }
    }

    return currentTime;
  };

  return (
    <div className="video-player-wrapper">
      <div className="video-player__container">
        <video
          ref={videoRef}
          className="video-player__video"
          onClick={handleVideoClick}
        >
          브라우저가 비디오 태그를 지원하지 않습니다.
        </video>

        {/* 로딩 오버레이 */}
        {/* {isSeeking && (
          <div className="video-player__loading-overlay">
            <div className="video-player__loading-spinner">⏳</div>
            <div className="video-player__loading-text">로딩 중...</div>
          </div>
        )} */}

        {/* 커스텀 재생 컨트롤 */}
        <div className="video-player__controls">
          <button
            className="video-player__btn video-player__btn--play"
            onClick={togglePlayPause}
          >
            {isPlaying ? "⏸️" : "▶️"}
          </button>

          <button
            className="video-player__btn video-player__btn--stop"
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

          {/* 이전/이후 버튼 */}
          <button
            className="video-player__btn video-player__btn--skip-backward"
            onClick={skipBackward}
            title="10초 뒤로"
          >
            ⏪
          </button>

          <button
            className="video-player__btn video-player__btn--skip-forward"
            onClick={skipForward}
            title="10초 앞으로"
          >
            ⏩
          </button>

          <div className="video-player__time video-player__time--current">
            <span>
              {" "}
              {formatTime(currentTime)} /{" "}
              {formatTime(videoRef.current?.duration || 0)}
            </span>
          </div>

          <div
            className={`video-player__seekbar ${isDragging ? "dragging" : ""}`}
            onClick={handleSeekBarClick}
            onMouseDown={handleSeekBarMouseDown}
            onMouseMove={handleSeekBarMouseMove}
            onMouseUp={handleSeekBarMouseUp}
            onMouseLeave={handleSeekBarMouseLeave}
          >
            <div
              className="video-player__progress"
              style={{ width: `${getProgressPercent()}%` }}
            ></div>
            {/* 드래그 중일 때 시크 프리뷰 */}
            {isDragging && (
              <div
                className="video-player__seek-preview"
                style={{
                  left: `${getProgressPercent()}%`,
                  transform: "translateX(-50%)",
                }}
              >
                {formatTime(getSeekPreviewTime())}
              </div>
            )}
          </div>

          {/* 볼륨 컨트롤 */}
          <div className="video-player__volume-control">
            <button
              className="video-player__btn video-player__btn--mute"
              onClick={toggleMute}
              title={isMuted ? "음소거 해제" : "음소거"}
            >
              {isMuted || volume === 0 ? "🔇" : volume > 0.5 ? "🔊" : "🔉"}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="video-player__volume-slider"
              title="볼륨 조절"
            />
          </div>

          {/* 전체화면 버튼 */}
          <button
            className="video-player__btn video-player__btn--fullscreen"
            onClick={toggleFullscreen}
            title="전체화면"
          >
            ⛶
          </button>

          {/* 설정 버튼 */}
          <button
            className="video-player__btn video-player__btn--settings"
            onClick={() => setShowSettings(!showSettings)}
            title="설정"
          >
            ⚙️
          </button>
        </div>

        {/* 설정 모달 */}
        {showSettings && (
          <div className="video-player__settings-modal">
            <div className="video-player__settings-header">
              <h3>설정</h3>
              <button
                className="video-player__settings-close"
                onClick={() => setShowSettings(false)}
              >
                ×
              </button>
            </div>

            <div className="video-player__settings-content">
              {/* 화질 설정 */}
              <div className="video-player__setting-group">
                <label className="video-player__setting-label">화질</label>
                <select
                  className="video-player__setting-select"
                  value={currentQuality}
                  onChange={(e) =>
                    handleQualityChange(parseInt(e.target.value))
                  }
                >
                  <option value="auto">자동</option>
                  {availableQualities.map((quality) => (
                    <option key={quality.id} value={quality.id}>
                      {quality.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 배속 설정 */}
              <div className="video-player__setting-group">
                <label className="video-player__setting-label">배속</label>
                <select
                  className="video-player__setting-select"
                  value={currentPlaybackRate}
                  onChange={(e) =>
                    handlePlaybackRateChange(parseFloat(e.target.value))
                  }
                >
                  <option value={0.25}>0.25x</option>
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x (보통)</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                  <option value={3}>3x</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
