import React, { useState, useRef, useEffect, useCallback } from "react";
import Hls from "hls.js";
import Header from "./components/Header.jsx";
import "./VideoViewer.css";

export default function VideoViewer() {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  // 상태 관리
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(0);
  const [clipDuration, setClipDuration] = useState(0);
  const [isPlayingClip, setIsPlayingClip] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState(null);

  // 클립 목록
  const clips = [
    {
      id: 1,
      label: "클립 1: 3분 - 6분 구간 (초반 하이라이트)",
      from: 180,
      to: 360,
    },
    {
      id: 2,
      label: "클립 2: 10분 - 14분 구간 (첫 득점 장면)",
      from: 600,
      to: 840,
    },
    {
      id: 3,
      label: "클립 3: 20분 - 25분 구간 (선수 교체)",
      from: 1200,
      to: 1500,
    },
    {
      id: 4,
      label: "클립 4: 45분 - 50분 구간 (중간 하이라이트)",
      from: 2700,
      to: 3000,
    },
    {
      id: 5,
      label: "클립 5: 55분 - 60분 구간 (팀 타임아웃)",
      from: 3300,
      to: 3600,
    },
    {
      id: 6,
      label: "클립 6: 70분 - 75분 구간 (중요 전술 변화)",
      from: 4200,
      to: 4500,
    },
    {
      id: 7,
      label: "클립 7: 80분 - 85분 구간 (결정적 장면)",
      from: 4800,
      to: 5100,
    },
    {
      id: 8,
      label: "클립 8: 95분 - 100분 구간 (마지막 득점)",
      from: 5700,
      to: 6000,
    },
    {
      id: 9,
      label: "클립 9: 105분 - 110분 구간 (종료 직전 장면)",
      from: 6300,
      to: 6600,
    },
    {
      id: 10,
      label: "클립 10: 115분 - 120분 구간 (경기 종료)",
      from: 6900,
      to: 7200,
    },
  ];

  const m3u8Url = "/hls/output.m3u8";

  // HLS 초기화
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
      });

      hlsRef.current = hls;
      hls.loadSource(m3u8Url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("HLS manifest 파싱 완료");
        video.addEventListener("loadedmetadata", () => {
          setDuration(video.duration);
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS 오류:", data);
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
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = m3u8Url;
    }

    // 이벤트 리스너 추가
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", () => setIsPlaying(true));
    video.addEventListener("pause", () => setIsPlaying(false));
    video.addEventListener("loadedmetadata", () => setDuration(video.duration));

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", () => setIsPlaying(true));
      video.removeEventListener("pause", () => setIsPlaying(false));
      video.removeEventListener("loadedmetadata", () =>
        setDuration(video.duration)
      );
    };
  }, []);

  // 시간 업데이트 핸들러
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const time = video.currentTime;

    if (isPlayingClip) {
      // 클립 범위를 벗어나면 자동으로 제한
      if (time < clipStart) {
        video.currentTime = clipStart;
        return;
      }

      if (time >= clipEnd) {
        video.pause();
        setIsPlayingClip(false);
        setSelectedClipId(null);
        console.log("클립 재생 완료");
        return;
      }

      // 실제 비디오 시간을 저장 (시간 표시용)
      setCurrentTime(time);
    } else {
      // 전체 영상 재생 중
      setCurrentTime(time);
    }
  }, [isPlayingClip, clipStart, clipEnd]);

  // 클립 재생 함수
  const playClip = useCallback(
    (clip) => {
      const video = videoRef.current;
      if (!video) return;

      setClipStart(clip.from);
      setClipEnd(clip.to);
      setClipDuration(clip.to - clip.from);
      setIsPlayingClip(true);
      setSelectedClipId(clip.id);

      // 기존 HLS 인스턴스가 있으면 제거
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      // HLS 인스턴스 생성
      if (Hls.isSupported()) {
        const hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: true,
        });

        hlsRef.current = hls;
        hls.loadSource(m3u8Url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log(`클립 "${clip.label}" HLS manifest 파싱 완료`);
          video.currentTime = clip.from;
          setCurrentTime(0); // 클립 시작 시 시간을 0으로 초기화
          video.play();
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("클립 HLS 오류:", data);
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
                hls.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = m3u8Url;
        video.addEventListener("loadedmetadata", () => {
          video.currentTime = clip.from;
          setCurrentTime(0); // 클립 시작 시 시간을 0으로 초기화
          video.play();
        });
      }
    },
    [m3u8Url]
  );

  // 전체 영상으로 돌아가기
  const handleShowFullVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsPlayingClip(false);
    setSelectedClipId(null);
    setClipStart(0);
    setClipEnd(0);
    setClipDuration(0);

    // 기존 HLS 인스턴스가 있으면 제거
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // 전체 영상용 HLS 인스턴스 생성
    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
      });

      hlsRef.current = hls;
      hls.loadSource(m3u8Url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("전체 영상 HLS manifest 파싱 완료");
        video.addEventListener("loadedmetadata", () => {
          setDuration(video.duration);
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("전체 영상 HLS 오류:", data);
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
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = m3u8Url;
    }
  }, [m3u8Url]);

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

    if (isPlayingClip) {
      // 클립 재생 중: 클립 내에서의 상대적 위치를 계산
      const clipTime = clipDuration * percent;
      const seekTime = clipStart + clipTime;
      video.currentTime = seekTime;
    } else {
      // 전체 영상 재생 중: 전체 영상에서의 위치
      const seekTime = duration * percent;
      video.currentTime = seekTime;
    }
  };

  // 시간 포맷팅 함수
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // 진행률 계산
  const getProgressPercent = () => {
    if (isPlayingClip) {
      // 클립 재생 중: 클립 내에서의 상대적 진행률 (0% ~ 100%)
      const clipTime = currentTime - clipStart;
      return (clipTime / clipDuration) * 100;
    } else {
      // 전체 영상 재생 중: 전체 영상에서의 진행률
      return (currentTime / duration) * 100;
    }
  };

  return (
    <div className="video-viewer">
      <Header selectedClipId={selectedClipId} onShareClick={null} />

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
                video.currentTime = isPlayingClip ? clipStart : 0;
                setIsPlaying(false);
              }
            }}
          >
            ⏹️
          </button>

          <div className="time-display">
            <span>
              {isPlayingClip
                ? `${formatTime(currentTime)} / ${formatTime(clipEnd)}`
                : formatTime(currentTime)}
            </span>
          </div>

          <div className="custom-seekbar" onClick={handleSeekBarClick}>
            <div
              className="progress-bar"
              style={{ width: `${getProgressPercent()}%` }}
            ></div>
          </div>

          <div className="time-display">
            <span>
              {isPlayingClip
                ? `클립: ${formatTime(clipDuration)}`
                : formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      <div className="clips-section">
        <h2>클립 목록</h2>
        <div className="clips-list">
          {clips.map((clip) => (
            <div
              key={clip.id}
              className={`clip-item ${
                selectedClipId === clip.id ? "active" : ""
              }`}
              onClick={() => playClip(clip)}
            >
              {clip.label}
            </div>
          ))}
        </div>

        {isPlayingClip && (
          <button className="show-full-video-btn" onClick={handleShowFullVideo}>
            전체 영상 보기
          </button>
        )}
      </div>
    </div>
  );
}
