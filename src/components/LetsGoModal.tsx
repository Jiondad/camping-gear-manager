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
  const [isSharing, setIsSharing] = useState(false);

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

  const handleShare = async () => {
    if (!modalRef.current || isSharing) return;
    
    setIsSharing(true);

    const targetElement = modalRef.current;
    const originalHeight = targetElement.style.height;
    const originalMaxHeight = targetElement.style.maxHeight;
    const originalOverflowY = targetElement.style.overflowY;

    try {
      // 임시 스타일 조정 (스크롤 해제 및 높이 펼침)
      targetElement.style.height = 'auto';
      targetElement.style.maxHeight = 'none';
      targetElement.style.overflowY = 'visible';

      const blob = await toBlob(targetElement, {
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      // 캡처 후 스타일 즉시 복구
      targetElement.style.height = originalHeight; 
      targetElement.style.maxHeight = originalMaxHeight; 
      targetElement.style.overflowY = originalOverflowY;

      if (!blob) {
        throw new Error('Canvas to Blob failed');
      }

      const file = new File([blob], 'camping-packing-list.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: '캠핑 패킹 리스트',
            files: [file],
          });
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            alert('공유 실패! PC에서는 이미지가 다운로드됩니다.');
            downloadFallback(blob);
          }
        }
      } else {
        // Fallback to download
        alert('공유 실패! PC에서는 이미지가 다운로드됩니다.');
        downloadFallback(blob);
      }
    } catch (err) {
      console.error('Failed to generate image', err);
      alert('이미지 캡처 중 오류가 발생했습니다. 브라우저 호환성 및 HTTPS 연결을 확인해 주세요.');
      
      // 에러 발생 시에도 스타일 복구
      targetElement.style.height = originalHeight; 
      targetElement.style.maxHeight = originalMaxHeight; 
      targetElement.style.overflowY = originalOverflowY;
    } finally {
      setIsSharing(false);
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
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
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
                  {isSharing ? '캡처 중...' : '공유'}
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
