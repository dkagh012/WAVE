import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";

const Waveform = ({
  audioUrl,
  currentTime,
  onDurationChange,
  onRegionsPluginChange,
  onWaveformReady,
  clips,
  selectedClipId,
  onClipUpdate,
  onTimeUpdate,
}) => {
  const waveformContainerRef = useRef(null);
  const containerRef = useRef(null);
  const [wavesurfer, setWavesurfer] = useState(null);
  const [isWaveformLoading, setIsWaveformLoading] = useState(true);
  const [isDraggingWaveform, setIsDraggingWaveform] = useState(false);
  const [regionsPlugin, setRegionsPlugin] = useState(null);

  const hasInitialized = useRef(false);
  const isDragging = useRef(false);
  const cursorRef = useRef(null);
  const scrollElementRef = useRef(null);
  const updateTimeRequestRef = useRef(null);

  // 파형 초기화
  useEffect(() => {
    if (!hasInitialized.current && audioUrl) {
      hasInitialized.current = true;

      fetch(audioUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          initWaveform(blobUrl);
        });
    }
  }, [audioUrl]);

  const initWaveform = (blobUrl) => {
    const ws = WaveSurfer.create({
      container: waveformContainerRef.current,
      height: 100,
      scrollParent: false, // Region 위치 계산 정확성을 위해 false로 설정
      responsive: false,
      normalize: true,
      barWidth: 2,
      minPxPerSec: 2,
      interact: false,
      maxCanvasWidth: 4000,
      maxCanvasLength: 2000,
      fillParent: true, // Region 정확성을 위해 true로 설정
      backend: "WebAudio",
      mediaControls: false,
      hideScrollbar: false,
      waveColor: "#4F4A85",
    });

    // Regions 플러그인 등록
    const regions = RegionsPlugin.create();
    ws.registerPlugin(regions);
    setRegionsPlugin(regions);
    onRegionsPluginChange(regions);

    setWavesurfer(ws);

    ws.on("ready", () => {
      setIsWaveformLoading(false);
      onDurationChange(ws.getDuration());
      createWaveformCursor();
      onWaveformReady(ws);

      // WaveSurfer의 기본 클릭 이벤트 비활성화
      ws.setTime(0);

      setTimeout(() => {
        // 초기화 완료 처리
      }, 300);
    });

    // WaveSurfer의 기본 클릭 이벤트 비활성화
    ws.on("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });

    ws.load(blobUrl);
  };

  // 파형에 시간 커서 생성
  const createWaveformCursor = () => {
    if (!wavesurfer || !waveformContainerRef.current) return;

    const container = waveformContainerRef.current;

    // 기존 커서 제거
    const existingCursor = container.querySelector(".waveform-cursor");
    if (existingCursor) {
      existingCursor.remove();
    }

    // 새 커서 생성
    const cursor = document.createElement("div");
    cursor.className = "waveform-cursor";
    cursor.style.position = "absolute";
    cursor.style.top = "0px";
    cursor.style.width = "2px";
    cursor.style.height = "100px";
    cursor.style.backgroundColor = "red";
    cursor.style.zIndex = "10";
    cursor.style.pointerEvents = "none";
    cursor.style.left = "0px";

    container.style.position = "relative";
    container.appendChild(cursor);
    cursorRef.current = cursor;
  };

  // 파형 커서 위치 업데이트
  const updateWaveformCursor = (time) => {
    if (!wavesurfer || !cursorRef.current) return;

    const duration = wavesurfer.getDuration();
    if (duration === 0) return;

    const scrollElement = scrollElementRef.current;
    if (!scrollElement) return;

    const containerWidth = scrollElement.scrollWidth;
    const position = (time / duration) * containerWidth;

    cursorRef.current.style.left = `${position}px`;
  };

  // Region 이벤트 핸들러 설정 함수
  const setupRegionEventHandlers = (region) => {
    region.on("update-start", () => {
      isDragging.current = true;
      // 이전 pending된 업데이트 요청 취소
      if (updateTimeRequestRef.current) {
        cancelAnimationFrame(updateTimeRequestRef.current);
        updateTimeRequestRef.current = null;
      }
    });

    region.on("update", () => {
      const duration = wavesurfer.getDuration();
      if (region.end > duration) {
        console.log(
          "Region 종료 시간이 영상 길이를 초과합니다:",
          region.end,
          ">",
          duration
        );
        return;
      }

      // 드래그 중 실시간 비디오 동기화 (requestAnimationFrame으로 최적화)
      if (onTimeUpdate && !updateTimeRequestRef.current) {
        updateTimeRequestRef.current = requestAnimationFrame(() => {
          onTimeUpdate(region.start);
          updateTimeRequestRef.current = null;
        });
      }
    });

    region.on("update-end", () => {
      isDragging.current = false;

      // pending된 업데이트 요청 취소 후 최종 업데이트
      if (updateTimeRequestRef.current) {
        cancelAnimationFrame(updateTimeRequestRef.current);
        updateTimeRequestRef.current = null;
      }

      // 비디오 시간을 region 시작 시간으로 최종 업데이트
      if (onTimeUpdate) {
        onTimeUpdate(region.start);
      }

      onClipUpdate({
        id: parseInt(region.id),
        from: region.start,
        to: region.end,
        label: "Updated Clip",
      });
    });

    region.on("click", (e) => {
      e.stopPropagation();
    });
  };

  // Region 위치로 자동 스크롤하는 함수
  const scrollToRegion = (clip) => {
    if (!scrollElementRef.current || !wavesurfer) {
      console.log("스크롤 실패: scrollElement 또는 wavesurfer가 없음");
      return;
    }

    const scrollElement = scrollElementRef.current;
    const duration = wavesurfer.getDuration();
    const containerWidth = scrollElement.scrollWidth;

    const startPosition = (clip.from / duration) * containerWidth;
    const targetScrollLeft = startPosition - scrollElement.clientWidth / 2;
    const maxScroll = scrollElement.scrollWidth - scrollElement.clientWidth;
    const adjustedScrollLeft = Math.max(
      0,
      Math.min(maxScroll, targetScrollLeft)
    );

    scrollElement.scrollLeft = adjustedScrollLeft;

    setTimeout(() => {
      if (Math.abs(scrollElement.scrollLeft - adjustedScrollLeft) > 10) {
        console.log("스크롤 재시도:", adjustedScrollLeft);
        scrollElement.scrollLeft = adjustedScrollLeft;
        setTimeout(() => {}, 50);
      }
    }, 100);
  };

  // 현재 시간이 변경될 때 커서 업데이트
  useEffect(() => {
    if (!isDragging.current && !isDraggingWaveform) {
      updateWaveformCursor(currentTime);
    }
  }, [currentTime, isDraggingWaveform]);

  // 내부 scroll 요소에서 드래그 및 휠 이벤트 처리
  useEffect(() => {
    if (!scrollElementRef.current || !wavesurfer) return;

    const scrollElement = scrollElementRef.current;

    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();

      requestAnimationFrame(() => {});
    };

    let isDragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    const handleMouseDown = (e) => {
      if (e.target.closest("[data-region-id]")) {
        return;
      }

      isDragging = true;
      startX = e.clientX;
      startScrollLeft = scrollElement.scrollLeft;
      setIsDraggingWaveform(true);

      document.body.style.userSelect = "none";
      scrollElement.style.cursor = "grabbing";
      e.preventDefault();
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();

      const deltaX = e.clientX - startX;
      const duration = wavesurfer.getDuration();

      const newScrollLeft = Math.max(
        0,
        Math.min(
          scrollElement.scrollWidth - scrollElement.clientWidth,
          startScrollLeft - deltaX
        )
      );

      scrollElement.scrollLeft = newScrollLeft;

      const maxScroll = scrollElement.scrollWidth - scrollElement.clientWidth;
      const scrollProgress = maxScroll > 0 ? newScrollLeft / maxScroll : 0;
      const newTime = scrollProgress * duration;

      // 비디오 시간도 업데이트
      if (onTimeUpdate) {
        onTimeUpdate(newTime);
      }

      updateWaveformCursor(newTime);

      // 파형 드래그 시에는 region 위치 업데이트 불필요 (region은 고정된 시간 구간)
    };

    const handleMouseUp = () => {
      if (!isDragging) return;

      isDragging = false;
      setIsDraggingWaveform(false);
      document.body.style.userSelect = "";
      scrollElement.style.cursor = "grab";
    };

    const handleClick = (e) => {
      if (!wavesurfer || isDraggingWaveform) return;

      // WaveSurfer의 기본 클릭 동작 방지
      e.preventDefault();
      e.stopPropagation();

      if (e.target.closest("[data-region-id]")) return;

      const rect = scrollElement.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollElement.scrollLeft;
      const duration = wavesurfer.getDuration();
      const containerWidth = scrollElement.scrollWidth;
      const time = Math.max(
        0,
        Math.min(duration, (x / containerWidth) * duration)
      );

      // 비디오 시간도 업데이트
      if (onTimeUpdate) {
        onTimeUpdate(time);
      }

      updateWaveformCursor(time);
    };

    const handleScroll = () => {};

    scrollElement.addEventListener("scroll", handleScroll, { passive: false });
    scrollElement.addEventListener("wheel", handleWheel, { passive: false });
    scrollElement.addEventListener("mousedown", handleMouseDown);
    scrollElement.addEventListener("mousemove", handleMouseMove);
    scrollElement.addEventListener("mouseup", handleMouseUp);
    scrollElement.addEventListener("click", handleClick);
    document.addEventListener("mouseup", handleMouseUp);

    scrollElement.style.cursor = "grab";

    return () => {
      scrollElement.removeEventListener("wheel", handleWheel);
      scrollElement.removeEventListener("mousedown", handleMouseDown);
      scrollElement.removeEventListener("mousemove", handleMouseMove);
      scrollElement.removeEventListener("mouseup", handleMouseUp);
      scrollElement.removeEventListener("click", handleClick);
      scrollElement.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mouseup", handleMouseUp);
      scrollElement.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [wavesurfer, currentTime]);

  // 클립 선택 시 region 생성
  useEffect(() => {
    if (!regionsPlugin || !selectedClipId) return;

    const selectedClip = clips.find((clip) => clip.id === selectedClipId);
    if (!selectedClip) return;

    // 기존 클립 리전들만 제거
    const regions = regionsPlugin.getRegions();
    regions.forEach((region) => {
      if (region.id !== "waveform-region") {
        region.remove();
      }
    });

    // 새 클립 리전 생성
    const region = regionsPlugin.addRegion({
      id: String(selectedClip.id),
      start: selectedClip.from,
      end: selectedClip.to,
      color: "rgba(0, 123, 255, 0.1)",
      drag: true,
      resize: true,
    });

    setupRegionEventHandlers(region);

    // Region에 최소한의 스타일만 적용하여 WaveSurfer 기본 동작 보장
    setTimeout(() => {
      const regionElement = region.element;
      if (regionElement) {
        // 기본적인 스타일만 설정 (위치 관련 스타일 제거)
        regionElement.style.border = "2px solid black";
        regionElement.style.borderRadius = "4px";
        regionElement.style.cursor = "move";
        regionElement.setAttribute("data-region-id", selectedClip.id);

        // 비디오 시간을 클립 시작 시간으로 업데이트
        if (onTimeUpdate) {
          onTimeUpdate(selectedClip.from);
        }

        // 자동 스크롤
        scrollToRegion(selectedClip);
      }
    }, 100);
  }, [selectedClipId, regionsPlugin, clips]);

  // 컴포넌트 언마운트 시 pending된 애니메이션 프레임 정리
  useEffect(() => {
    return () => {
      if (updateTimeRequestRef.current) {
        cancelAnimationFrame(updateTimeRequestRef.current);
      }
    };
  }, []);

  return (
    <div style={{ marginTop: 20 }} ref={containerRef}>
      {isWaveformLoading && (
        <div
          style={{
            textAlign: "center",
            padding: "50px 0",
            fontSize: "16px",
            color: "#666",
          }}
        >
          파형 생성 중...
        </div>
      )}

      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          border: "1px solid #ddd",
          display: isWaveformLoading ? "none" : "block",
          overflow: "hidden",
          borderRadius: "4px",
        }}
        ref={scrollElementRef}
      >
        <div
          ref={waveformContainerRef}
          style={{
            width: "100%",
            // WaveSurfer progress 숨기기
            "--wavesurfer-progress-color": "transparent",
            "--wavesurfer-progress-opacity": "0",
          }}
        />
      </div>

      {/* WaveSurfer progress 숨기기 위한 추가 CSS */}
      <style>
        {`
          .wavesurfer-container canvas {
            pointer-events: none;
          }
          .wavesurfer-container canvas:last-child {
            pointer-events: auto;
          }
        `}
      </style>
    </div>
  );
};

export default Waveform;
