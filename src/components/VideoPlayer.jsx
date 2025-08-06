import React, { useRef, useEffect } from "react";

const VideoPlayer = ({
  videoUrl,
  currentTime,
  onTimeUpdate,
  onDurationChange,
  sharedTimeRange,
}) => {
  const videoRef = useRef(null);

  // 공유된 시간 범위가 있으면 자동 재생
  useEffect(() => {
    if (sharedTimeRange && videoRef.current) {
      const { from, to } = sharedTimeRange;

      // 시작 시간으로 이동하고 재생
      videoRef.current.currentTime = from;
      onTimeUpdate(from);

      // 비디오가 로드되면 재생 시작
      const handleCanPlay = () => {
        if (!hasStopped) {
          videoRef.current.play();
        }
      };

      // 종료 시간에 도달하면 정지 (한 번만)
      let hasStopped = false;
      let userResumed = false;

      const handleTimeUpdate = () => {
        if (!hasStopped && !userResumed && videoRef.current.currentTime >= to) {
          videoRef.current.pause();
          videoRef.current.currentTime = to;
          onTimeUpdate(to);
          hasStopped = true;
        }
      };

      // 사용자가 재생 버튼을 누르면 더 이상 자동 정지하지 않음
      const handlePlay = () => {
        if (hasStopped) {
          userResumed = true;
        }
      };

      // 자동 재생 방지 이벤트들
      const handleEnded = () => {};
      const handleLoadStart = () => {
        if (hasStopped) {
          videoRef.current.pause();
        }
      };
      const handleCanPlayThrough = () => {
        if (hasStopped) {
          videoRef.current.pause();
        }
      };
      const handleWaiting = () => {
        if (hasStopped) {
          videoRef.current.pause();
        }
      };
      const handleStalled = () => {
        if (hasStopped) {
          videoRef.current.pause();
        }
      };

      videoRef.current.addEventListener("canplay", handleCanPlay);
      videoRef.current.addEventListener("timeupdate", handleTimeUpdate);
      videoRef.current.addEventListener("play", handlePlay);
      videoRef.current.addEventListener("ended", handleEnded);
      videoRef.current.addEventListener("loadstart", handleLoadStart);
      videoRef.current.addEventListener("canplaythrough", handleCanPlayThrough);
      videoRef.current.addEventListener("waiting", handleWaiting);
      videoRef.current.addEventListener("stalled", handleStalled);

      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener("canplay", handleCanPlay);
          videoRef.current.removeEventListener("timeupdate", handleTimeUpdate);
          videoRef.current.removeEventListener("play", handlePlay);
          videoRef.current.removeEventListener("ended", handleEnded);
          videoRef.current.removeEventListener("loadstart", handleLoadStart);
          videoRef.current.removeEventListener(
            "canplaythrough",
            handleCanPlayThrough
          );
          videoRef.current.removeEventListener("waiting", handleWaiting);
          videoRef.current.removeEventListener("stalled", handleStalled);
        }
      };
    }
  }, [sharedTimeRange, onTimeUpdate]);

  // 비디오 시간 업데이트 추적
  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;

      const handleTimeUpdate = () => {
        const time = video.currentTime;
        onTimeUpdate(time);
      };

      const handleSeeked = () => {
        const time = video.currentTime;
        onTimeUpdate(time);
      };

      const handleLoadedMetadata = () => {
        onDurationChange(video.duration);
      };

      video.addEventListener("timeupdate", handleTimeUpdate);
      video.addEventListener("seeked", handleSeeked);
      video.addEventListener("loadedmetadata", handleLoadedMetadata);

      return () => {
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("seeked", handleSeeked);
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      };
    }
  }, [onTimeUpdate, onDurationChange]);

  // 비디오 소스 설정
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.src = videoUrl;
    }
  }, [videoUrl]);

  // 외부에서 시간이 변경될 때 비디오 시간 업데이트
  useEffect(() => {
    if (
      videoRef.current &&
      Math.abs(videoRef.current.currentTime - currentTime) > 0.1
    ) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  return (
    <div style={{ marginTop: 20 }}>
      <video ref={videoRef} controls style={{ width: "100%", marginTop: 10 }} />
    </div>
  );
};

export default VideoPlayer;
