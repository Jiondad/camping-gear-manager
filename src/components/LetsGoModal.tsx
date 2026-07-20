import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Tent, Bed, Flame, Lightbulb, Package, Armchair, ThermometerSun, Check, Share2, Loader2 } from 'lucide-react';
import { GearItem, GearCategory } from '../types';
import { toBlob } from 'html-to-image';

interface LetsGoModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: GearItem[];
}

export default function LetsGoModal({ isOpen, onClose, selectedItems }: LetsGoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null); // 실제로 스크롤이 걸리는 body 영역
  const [isSharing, setIsSharing] = useState(false);
  const [shareStage, setShareStage] = useState<'idle' | 'capturing' | 'opening-share'>('idle');

  // Group items by category and compute weights
  const { groupedItems, totalQuantity, totalWeight } = useMemo(() => {
    const groups: Partial<Record<GearCategory, { items: GearItem[], categoryWeight: number }>> = {};
    let tQty = 0;
    let tWeight = 0;

    selectedItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = { items: [], categoryWeight: 0 };
      }
      groups[item.category]!.items.push(item);
      const qty = Number(item.quantity) || 0;
      const weight = Number(item.weight) || 0;
      const itemTotalWeight = qty * weight;
      groups[item.category]!.categoryWeight += itemTotalWeight;
      
      tQty += qty;
      tWeight += itemTotalWeight;
    });

    return { groupedItems: groups, totalQuantity: tQty, totalWeight: tWeight };
  }, [selectedItems]);

  const categoryOptions: { value: GearCategory; label: string; icon: React.ReactNode }[] = [
    { value: 'tent', label: '텐트/타프', icon: <Tent className="w-4 h-4" /> },
    { value: 'bedding', label: '침구류', icon: <Bed className="w-4 h-4" /> },
    { value: 'furniture', label: '테이블/체어', icon: <Armchair className="w-4 h-4" /> },
    { value: 'lighting', label: '랜턴/조명', icon: <Lightbulb className="w-4 h-4" /> },
    { value: 'cooking', label: '버너/그릴', icon: <Flame className="w-4 h-4" /> },
    { value: 'seasonal', label: '계절장비', icon: <ThermometerSun className="w-4 h-4" /> },
    { value: 'etc', label: '소품/기타', icon: <Package className="w-4 h-4" /> },
  ];

  const getCategoryInfo = (val: string) => categoryOptions.find(c => c.value === val);

  const downloadFallback = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'camping-packing-list.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // alert/confirm이 sandboxed iframe(allow-modals 없음) 등에서 무시되거나 예외를 던져도
  // 로직이 멈추지 않도록 안전하게 감싸는 헬퍼
  const safeConfirm = (msg: string): boolean => {
    try {
      return window.confirm(msg);
    } catch {
      return false;
    }
  };
  const safeAlert = (msg: string) => {
    try {
      window.alert(msg);
    } catch {
      console.warn('[alert 무시됨]', msg);
    }
  };

  // 다음 두 프레임까지 기다려서 레이아웃(reflow)이 실제로 반영된 뒤에 진행
  const waitForNextFrames = (count = 2) =>
    new Promise<void>((resolve) => {
      const step = (n: number) => {
        if (n <= 0) return resolve();
        requestAnimationFrame(() => step(n - 1));
      };
      step(count);
    });

  // 특정 시간 안에 끝나지 않으면 명확한 에러로 실패시킴 (무한정 "캡처 중..."으로 멈춰있는 것 방지)
  const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${label} 시간 초과 (${ms}ms)`));
      }, ms);
      promise.then(
        (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        (e) => {
          clearTimeout(timer);
          reject(e);
        }
      );
    });
  };

  const handleShare = async () => {
    if (!modalRef.current || isSharing) return;
    setIsSharing(true);
    setShareStage('capturing');

    const containerEl = modalRef.current;
    const bodyEl = bodyRef.current;

    // 1. 기존 스타일 안전하게 백업 (바깥 컨테이너 + 실제 스크롤 영역 둘 다)
    const originalContainerStyle = {
      height: containerEl.style.height,
      maxHeight: containerEl.style.maxHeight,
      overflowY: containerEl.style.overflowY,
    };
    const originalBodyStyle = bodyEl
      ? {
          overflowY: bodyEl.style.overflowY,
          flex: bodyEl.style.flex,
          height: bodyEl.style.height,
          maxHeight: bodyEl.style.maxHeight,
        }
      : null;

    const restoreStyles = () => {
      Object.assign(containerEl.style, originalContainerStyle);
      if (bodyEl && originalBodyStyle) {
        Object.assign(bodyEl.style, originalBodyStyle);
      }
    };

    let blob: Blob | null = null;

    try {
      // 2. 캡처를 위해 전체 높이로 펼치기 (바깥 컨테이너)
      containerEl.style.height = 'auto';
      containerEl.style.maxHeight = 'none';
      containerEl.style.overflowY = 'visible';

      // 2-1. 실제 스크롤이 걸리는 body 영역도 함께 풀어줘야
      //      스크롤 아래 잘려있던 항목까지 전부 캡처됨 (핵심 수정 포인트)
      if (bodyEl) {
        bodyEl.style.overflowY = 'visible';
        bodyEl.style.maxHeight = 'none';
        bodyEl.style.height = 'auto';
        bodyEl.style.flex = 'none'; // flex-1(flex-basis:0%)로 인한 높이 축소 방지
      }

      // 2-2. 스타일 변경이 실제로 레이아웃에 반영될 때까지 대기
      await waitForNextFrames(2);

      // 3. 이미지 캡처
      // - cacheBust:true는 매번 폰트/이미지를 네트워크로 재요청하게 만들어
      //   배포 도메인에서 수 초~수십 초까지 느려지는 주 원인이 될 수 있음 → false로 변경
      // - 8초 안에 안 끝나면 타임아웃으로 실패시켜, 사용자 제스처가
      //   만료된 채로 navigator.share()를 호출하는 상황을 방지
      blob = await withTimeout(
        toBlob(containerEl, { backgroundColor: '#ffffff', cacheBust: false }),
        8000,
        '이미지 생성'
      );

      // 4. 캡처 직후 스타일 즉시 복구
      restoreStyles();

      if (!blob) throw new Error('이미지 생성 실패');

      const file = new File([blob], 'camping-packing-list.png', { type: 'image/png' });

      // 5. 공유 API 실행 및 실패 시 폴백
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        setShareStage('opening-share');
        try {
          await navigator.share({
            title: '캠핑 패킹 리스트',
            files: [file],
          });
        } catch (err: any) {
          if (err.name === 'AbortError') {
            // 사용자가 공유 시트를 스스로 닫은 정상 취소 케이스.
            // confirm()이 sandbox 환경에서 무시될 수 있으므로 안전 버전 사용.
            const userWantsToDownload = safeConfirm(
              '공유 창이 닫혔거나 실행 시간이 초과되었습니다. 대신 기기에 이미지를 저장하시겠습니까?'
            );
            if (userWantsToDownload) {
              downloadFallback(blob);
            }
          } else {
            console.warn('공유 창 열기 실패, 다운로드로 대체:', err);
            safeAlert('공유 창을 띄울 수 없어 기기에 이미지를 저장합니다.');
            downloadFallback(blob);
          }
        }
      } else {
        safeAlert('현재 브라우저에서는 공유 기능을 지원하지 않아 이미지를 저장합니다.');
        downloadFallback(blob);
      }
    } catch (err) {
      console.error('캡처/공유 중 오류 발생:', err);
      // 치명적 에러 발생 시에도 스타일 확실히 복구
      restoreStyles();
      // 캡처는 됐는데 이후 단계에서 실패한 거라면 최소한 다운로드는 시도
      if (blob) {
        downloadFallback(blob);
      } else {
        safeAlert('이미지 생성이 너무 오래 걸려 중단했습니다. 다시 시도해 주세요.');
      }
    } finally {
      // 6. 성공하든 실패하든 무조건 버튼 로딩 상태 해제
      setIsSharing(false);
      setShareStage('idle');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full max-w-lg max-h-[90vh] overflow-hidden border-2 border-[#cbd5c8] rounded-2xl bg-[#f4f7f3] shadow-2xl text-stone-800 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#eef3ec] border-b border-[#cbd5c8] text-[#4a6648] shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#5aa880] animate-pulse"></span>
                <h3 className="font-sans font-black text-lg tracking-tight">
                  🏕️ 캠핑 패킹 리스트 (Let's Go!)
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-white border border-[#cbd5c8] text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div ref={bodyRef} className="p-6 space-y-4 overflow-y-auto flex-1">
              {(Object.entries(groupedItems) as [GearCategory, { items: GearItem[], categoryWeight: number }][])
                .sort(([catA], [catB]) => {
                  const indexA = categoryOptions.findIndex(c => c.value === catA);
                  const indexB = categoryOptions.findIndex(c => c.value === catB);
                  const sortA = indexA !== -1 ? indexA : 999;
                  const sortB = indexB !== -1 ? indexB : 999;
                  return sortA - sortB;
                })
                .map(([category, data]) => {
                const catInfo = getCategoryInfo(category);
                if (!data || !catInfo) return null;

                return (
                  <div key={category} className="bg-white border border-[#cbd5c8] rounded-xl overflow-hidden shadow-sm">
                    {/* Category Header */}
                    <div className="px-4 py-3 bg-[#f8faf7] border-b border-[#cbd5c8] flex justify-between items-center">
                      <div className="flex items-center gap-2 font-bold text-[#4a6648] text-sm">
                        {catInfo.icon}
                        <span>{catInfo.label}</span>
                      </div>
                      <div className="bg-[#eef3ec] text-[#4a6648] px-2 py-0.5 rounded-full text-xs font-mono font-bold border border-[#cbd5c8]">
                        {data.categoryWeight.toFixed(2)} kg
                      </div>
                    </div>
                    {/* Category Items */}
                    <div className="divide-y divide-stone-100">
                      {data.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center px-4 py-2.5 text-sm">
                          <div className="flex-1 flex flex-col">
                            <span className="font-bold text-stone-700">{item.name}</span>
                            <span className="text-xs text-stone-500">{item.brand}</span>
                          </div>
                          <div className="flex flex-col items-end text-xs font-mono">
                            <span className="text-stone-700 font-bold">{Number(item.quantity) || 0} 개</span>
                            <span className="text-stone-400">{((Number(item.weight) || 0) * (Number(item.quantity) || 0)).toFixed(2)} kg</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {selectedItems.length === 0 && (
                <div className="text-center py-8 text-stone-500 font-bold">
                  선택된 장비가 없습니다.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-[#eef3ec] border-t border-[#cbd5c8] p-5 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
              <div className="flex flex-col items-center sm:items-start text-[#4a6648]">
                <span className="text-xs font-bold uppercase tracking-wider mb-1 font-mono">Total Info</span>
                <div className="flex items-center gap-3">
                  <span className="font-sans text-sm"><strong className="text-lg">{totalQuantity}</strong> 개</span>
                  <span className="text-stone-300">|</span>
                  <span className="font-sans text-sm"><strong className="text-lg">{totalWeight.toFixed(2)}</strong> kg</span>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-bold border border-stone-300 text-stone-600 bg-white hover:bg-stone-50 rounded-xl shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                  {shareStage === 'capturing' && '이미지 생성 중...'}
                  {shareStage === 'opening-share' && '공유 앱 선택 중...'}
                  {shareStage === 'idle' && '공유'}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-6 py-2.5 text-sm font-bold text-white bg-[#5aa880] hover:bg-[#4d9670] rounded-xl shadow-sm transition-colors border border-[#4a8f6a]"
                >
                  <Check className="w-4 h-4" />
                  확인
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}