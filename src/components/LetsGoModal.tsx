import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Tent, Bed, Flame, Lightbulb, Package, Armchair, ThermometerSun, Check, Share2, Loader2 } from 'lucide-react';
import { GearItem, GearCategory } from '../types';
import { toBlob } from 'html-to-image';

interface LetsGoModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: GearItem[];
}

// 다음 n프레임까지 기다려서 레이아웃(reflow)이 실제로 반영된 뒤에 진행
const waitForNextFrames = (count = 2) =>
  new Promise<void>((resolve) => {
    const step = (n: number) => {
      if (n <= 0) return resolve();
      requestAnimationFrame(() => step(n - 1));
    };
    step(count);
  });

// 특정 시간 안에 끝나지 않으면 명확한 에러로 실패시킴 (무한정 멈춰있는 것 방지)
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

// 캡처 대상 노드(원본 또는 clone)를 펼친 뒤 이미지를 뽑아내는 공통 로직.
// clone에 대해 실행할 때는 화면에 아무 영향이 없으므로 스타일 복구가 필요 없다.
async function captureNodeToBlob(
  containerEl: HTMLElement,
  bodyEl: HTMLElement | null,
  opts: { restore: boolean }
): Promise<Blob | null> {
  const originalContainerStyle = opts.restore
    ? {
        height: containerEl.style.height,
        maxHeight: containerEl.style.maxHeight,
        overflowY: containerEl.style.overflowY,
      }
    : null;
  const originalBodyStyle =
    opts.restore && bodyEl
      ? {
          overflowY: bodyEl.style.overflowY,
          flex: bodyEl.style.flex,
          height: bodyEl.style.height,
          maxHeight: bodyEl.style.maxHeight,
        }
      : null;

  // 1. 전체 높이로 펼치기 (바깥 컨테이너)
  containerEl.style.height = 'auto';
  containerEl.style.maxHeight = 'none';
  containerEl.style.overflowY = 'visible';

  // 1-1. 실제 스크롤이 걸리는 body 영역도 함께 풀어줘야
  //      스크롤 아래 잘려있던 항목까지 전부 캡처됨
  if (bodyEl) {
    bodyEl.style.overflowY = 'visible';
    bodyEl.style.maxHeight = 'none';
    bodyEl.style.height = 'auto';
    bodyEl.style.flex = 'none'; // flex-1(flex-basis:0%)로 인한 높이 축소 방지
  }

  try {
    // 1-2. 스타일 변경이 실제로 레이아웃에 반영될 때까지 대기
    await waitForNextFrames(2);

    // 2. 이미지 캡처
    // - cacheBust:false → 매번 폰트/이미지를 네트워크로 재요청하지 않도록 함 (지연 방지)
    // - pixelRatio:1 → 레티나/고해상도 화면에서 캔버스가 과도하게 커져 느려지는 것 방지
    const blob = await withTimeout(
      toBlob(containerEl, { backgroundColor: '#ffffff', cacheBust: false, pixelRatio: 1 }),
      8000,
      '이미지 생성'
    );
    return blob;
  } finally {
    if (opts.restore && originalContainerStyle) {
      Object.assign(containerEl.style, originalContainerStyle);
    }
    if (opts.restore && bodyEl && originalBodyStyle) {
      Object.assign(bodyEl.style, originalBodyStyle);
    }
  }
}

export default function LetsGoModal({ isOpen, onClose, selectedItems }: LetsGoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null); // 실제로 스크롤이 걸리는 body 영역
  const [isSharing, setIsSharing] = useState(false);
  const [shareStage, setShareStage] = useState<'idle' | 'capturing' | 'opening-share'>('idle');

  // 사전 캡처(pre-capture) 결과 보관.
  // navigator.share({files})는 버튼 클릭 이후 아주 짧은 user-gesture 유효 시간 안에
  // 호출되어야 OS 공유 시트가 뜬다. 클릭한 뒤에 무거운 캡처 작업(폰트 임베딩 등)을
  // 시작하면 이 시간을 넘겨서 공유 시트가 아예 안 뜨고 AbortError만 나는 문제가 있었다.
  // → 모달이 열리자마자(화면엔 안 보이게) 미리 이미지를 만들어두고,
  //   클릭 시엔 이미 준비된 이미지로 최대한 빨리 share()를 호출한다.
  const [preparedBlob, setPreparedBlob] = useState<Blob | null>(null);
  const preparedForRef = useRef<string>(''); // 어떤 아이템 목록으로 준비된 blob인지 식별

  const itemsSignature = useMemo(
    () => selectedItems.map((i) => `${i.id}:${i.quantity}`).join('|'),
    [selectedItems]
  );

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

  // 모달이 열려있는 동안, 화면 밖(hidden clone)에서 미리 이미지를 만들어둔다.
  // 실제로 보이는 모달을 건드리지 않으므로 열리는 애니메이션과 시각적으로 충돌하지 않는다.
  useEffect(() => {
    if (!isOpen) {
      setPreparedBlob(null);
      preparedForRef.current = '';
      return;
    }

    let cancelled = false;

    // 모달 오픈 애니메이션(250ms)이 끝난 뒤 시작
    const timer = setTimeout(async () => {
      const source = modalRef.current;
      if (!source || cancelled) return;

      const wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.top = '0';
      wrapper.style.left = '-99999px';
      wrapper.style.zIndex = '-1';
      wrapper.style.width = `${source.offsetWidth}px`;
      wrapper.setAttribute('aria-hidden', 'true');

      const clone = source.cloneNode(true) as HTMLDivElement;
      // framer-motion이 넣어둔 inline transform/opacity 제거 (애니메이션 중간값 캡처 방지)
      clone.style.transform = 'none';
      clone.style.opacity = '1';

      const cloneBody = clone.querySelector<HTMLDivElement>('[data-share-scroll="true"]');

      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      try {
        const blob = await captureNodeToBlob(clone, cloneBody, { restore: false });
        if (!cancelled) {
          setPreparedBlob(blob);
          preparedForRef.current = itemsSignature;
        }
      } catch (e) {
        // 사전 캡처는 실패해도 치명적이지 않음: 클릭 시 실시간 캡처로 폴백됨
        console.warn('사전 캡처 실패(공유 클릭 시 실시간 캡처로 대체됩니다):', e);
      } finally {
        document.body.removeChild(wrapper);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, itemsSignature]);

  const handleShare = async () => {
    if (!modalRef.current || isSharing) return;
    setIsSharing(true);

    let blob: Blob | null = null;

    try {
      const hasFreshPreparedBlob = preparedBlob && preparedForRef.current === itemsSignature;

      if (hasFreshPreparedBlob) {
        // 이미 준비된 이미지가 있으면 캡처 단계를 건너뛰고 바로 공유 단계로.
        // user-gesture 유효 시간을 최대한 아껴서 공유 시트가 확실히 뜨도록 함.
        blob = preparedBlob;
      } else {
        // 준비된 이미지가 없다면(막 열자마자 클릭한 경우 등) 실시간으로 캡처
        setShareStage('capturing');
        blob = await captureNodeToBlob(modalRef.current, bodyRef.current, { restore: true });
      }

      if (!blob) throw new Error('이미지 생성 실패');

      const file = new File([blob], 'camping-packing-list.png', { type: 'image/png' });

      // 공유 API 실행 및 실패 시 폴백
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        setShareStage('opening-share');
        try {
          await navigator.share({
            title: '캠핑 패킹 리스트',
            files: [file],
          });
        } catch (err: any) {
          if (err.name === 'AbortError') {
            // 사용자가 공유 시트를 스스로 닫았거나, user-gesture 유효 시간을 넘겨
            // 브라우저가 공유 시트 자체를 띄우지 못한 경우.
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
      if (blob) {
        downloadFallback(blob);
      } else {
        safeAlert('이미지 생성이 너무 오래 걸려 중단했습니다. 다시 시도해 주세요.');
      }
    } finally {
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
            <div ref={bodyRef} data-share-scroll="true" className="p-6 space-y-4 overflow-y-auto flex-1">
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
