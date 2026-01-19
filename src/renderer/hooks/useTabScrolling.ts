/**
 * ============================================================================
 * useTabScrolling Hook - 탭 스크롤 공통 기능
 * ============================================================================
 *
 * 역할: TabView와 TerminalPanel에서 공통으로 사용하는 탭 스크롤 기능 제공
 *
 * 기능:
 * - 스크롤 버튼 표시/숨김 상태 관리
 * - 좌우 스크롤
 * - 활성 탭으로 자동 스크롤
 * - 마우스 휠로 좌우 스크롤
 * - ResizeObserver로 스크롤 상태 자동 업데이트
 * ============================================================================
 */

import { useState, useRef, useCallback, useEffect, RefObject } from 'react';

type ScrollDirection = 'left' | 'right';

export interface UseTabScrollingReturn {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  scrollTabs: (direction: ScrollDirection) => void;
  checkScrollButtons: () => void;
  handleWheel: (e: React.WheelEvent) => void;
}

/**
 * 탭 스크롤 기능을 제공하는 커스텀 훅
 *
 * @param activeId - 현재 활성 탭 ID
 * @param itemCount - 탭 개수 (배열 대신 length를 전달하여 참조 변경 문제 방지)
 * @returns 스크롤 관련 상태 및 핸들러
 */
export const useTabScrolling = (activeId: number | string | null, itemCount = 0): UseTabScrollingReturn => {
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 스크롤 상태 체크
  const checkScrollButtons = useCallback((): void => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const hasOverflow = el.scrollWidth > el.clientWidth;
    setCanScrollLeft(hasOverflow && el.scrollLeft > 1);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  // 좌우 스크롤
  const scrollTabs = useCallback((direction: ScrollDirection): void => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const scrollAmount = 200;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  }, []);

  // 활성 탭으로 스크롤
  const scrollToActiveTab = useCallback((): void => {
    const el = scrollContainerRef.current;
    if (!el || !activeId) return;

    const activeTab = el.querySelector('.active');
    if (activeTab) {
      const containerRect = el.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();

      if (tabRect.left < containerRect.left) {
        el.scrollBy({ left: tabRect.left - containerRect.left - 10, behavior: 'smooth' });
      } else if (tabRect.right > containerRect.right) {
        el.scrollBy({ left: tabRect.right - containerRect.right + 10, behavior: 'smooth' });
      }
    }
  }, [activeId]);

  // 마우스 휠로 좌우 스크롤
  const handleWheel = useCallback((e: React.WheelEvent): void => {
    const el = scrollContainerRef.current;
    if (!el) return;

    if (el.scrollWidth > el.clientWidth) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  }, []);

  // 초기화 및 리사이즈 감지
  useEffect(() => {
    requestAnimationFrame(() => {
      checkScrollButtons();
    });

    const resizeObserver = new ResizeObserver(() => {
      checkScrollButtons();
    });

    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }

    window.addEventListener('resize', checkScrollButtons);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', checkScrollButtons);
    };
  }, [checkScrollButtons]);

  // 탭 개수 변경 시 스크롤 버튼 상태 업데이트
  useEffect(() => {
    requestAnimationFrame(checkScrollButtons);
  }, [itemCount, checkScrollButtons]);

  // 활성 탭 변경 시 자동 스크롤
  useEffect(() => {
    scrollToActiveTab();
  }, [activeId, scrollToActiveTab]);

  return {
    scrollContainerRef,
    canScrollLeft,
    canScrollRight,
    scrollTabs,
    checkScrollButtons,
    handleWheel
  };
};

export default useTabScrolling;
