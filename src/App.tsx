/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tent,
  Bed,
  Flame,
  Lightbulb,
  Package,
  Plus,
  Pencil,
  Trash2,
  Coins,
  X,
  Search,
  Sparkles,
  RotateCcw,
  Compass,
  Check,
  CheckSquare,
  Square,
  FlameKindling,
  Info,
  Calendar,
  Layers,
  Award,
  Armchair,
  ThermometerSun,
  CarFront,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { GearItem, GearCategory, CategorySummary } from './types';
import GearFormModal from './components/GearFormModal';
import LetsGoModal from './components/LetsGoModal';

const categoryLabels: Record<GearCategory, string> = {
  tent: '텐트/타프',
  bedding: '침구류',
  furniture: '테이블/체어',
  lighting: '랜턴/조명',
  cooking: '버너/그릴',
  seasonal: '계절장비',
  etc: '소품/기타',
};

const DEFAULT_GEAR: GearItem[] = [];

const API_URL = "https://script.google.com/macros/s/AKfycbzO_rRc9-MaJRxWLIHHEql1ELwjZ0qysTAWbp4K3oXrGH-z3j6HM4hBccdbE_DI1--n/exec";

export default function App() {
  const [gearList, setGearList] = useState<GearItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamic today's date format (YYYY-MM-DD)
  const today = new Date();
  const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // UI state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLetsGoOpen, setIsLetsGoOpen] = useState(false);
  const [editItem, setEditItem] = useState<GearItem | null>(null);
  const [isSummaryVisible, setIsSummaryVisible] = useState(true);

  // Playful environment decorations
  const [lanternOn, setLanternOn] = useState(true);
  const [compassAngle, setCompassAngle] = useState(45);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Show a message
  const triggerToast = (text: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Sync with Google Sheets backend
  const syncWithBackend = async (updatedList: GearItem[]) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({ action: 'syncAll', payload: updatedList })
      });
      if (!response.ok) {
        throw new Error('Sync response not ok');
      }
    } catch (error) {
      console.error('Error syncing with backend:', error);
      triggerToast('구글 시트 동기화에 실패했습니다.', 'warning');
    }
  };

  // Initial fetch from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error('Failed to fetch data from backend');
        }
        const data = await response.json();
        if (data && Array.isArray(data) && data.length > 0) {
          setGearList(data);
        } else {
          setGearList(DEFAULT_GEAR);
          await syncWithBackend(DEFAULT_GEAR);
        }
      } catch (error) {
        console.error('Fetch error, using default gear:', error);
        setGearList(DEFAULT_GEAR);
        await syncWithBackend(DEFAULT_GEAR);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Categories summaries derived from dynamic gearList (active '보유' items count as described)
  const summaries = useMemo<CategorySummary[]>(() => {
    const getSummary = (
      cat: GearCategory, 
      name: string, 
      label: string, 
      iconName: 'tent' | 'bedding' | 'furniture' | 'lighting' | 'cooking' | 'seasonal' | 'etc'
    ): CategorySummary => {
      const filtered = gearList.filter(item => item.category === cat && item.status === '보유');
      const totalQuantity = filtered.reduce((acc, curr) => acc + curr.quantity, 0);
      
      let countText = '';
      if (cat === 'tent') countText = `텐트/타프 ${totalQuantity}개`;
      else if (cat === 'bedding') countText = `침구류 ${totalQuantity}개`;
      else if (cat === 'furniture') countText = `테이블/체어 ${totalQuantity}개`;
      else if (cat === 'lighting') countText = `랜턴/조명 ${totalQuantity}개`;
      else if (cat === 'cooking') countText = `버너/그릴 ${totalQuantity}개`;
      else if (cat === 'seasonal') countText = `계절장비 ${totalQuantity}개`;
      else countText = `소품/기타 ${totalQuantity}개`;

      return { id: cat, name, label, iconName, countText, totalQuantity };
    };

    return [
      getSummary('tent', 'Tents', '텐트/타프', 'tent'),
      getSummary('bedding', 'Bedding', '침구류', 'bedding'),
      getSummary('furniture', 'Furniture', '테이블/체어', 'furniture'),
      getSummary('lighting', 'Lighting', '랜턴/조명', 'lighting'),
      getSummary('cooking', 'Cooking', '버너/그릴', 'cooking'),
      getSummary('seasonal', 'Seasonal', '계절장비', 'seasonal'),
      getSummary('etc', 'Gear', '소품/기타', 'etc'),
    ];
  }, [gearList]);

  // Filtering list
  const filteredGear = useMemo(() => {
    const categoryOrder: GearCategory[] = ['tent', 'bedding', 'furniture', 'lighting', 'cooking', 'seasonal', 'etc'];
    const filtered = gearList.filter(item => {
      const matchSearch =
        String(item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.model || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchSearch && matchCat && matchStatus;
    });

    return [...filtered].sort((a, b) => {
      const orderA = categoryOrder.indexOf(a.category);
      const orderB = categoryOrder.indexOf(b.category);
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return b.price - a.price; // 내림차순
    });
  }, [gearList, searchTerm, categoryFilter, statusFilter]);

  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredGear.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredGear.map(item => item.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(x => x !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  // Actions
  const handleLetsGoClick = () => {
    console.log("Let's Go 버튼 클릭됨!", { selectedIds });

    // 1. 선택된 장비가 없을 때
    if (selectedIds.length === 0) {
      triggerToast("선택된 장비가 없습니다.", "warning"); // alert 대신 toast 사용
      return;
    }

    const selectedGearItems = gearList.filter(gear => selectedIds.includes(gear.id));

    // 2. 이용 불가능한 장비 필터링 (한글 상태값이 정확히 무엇인지 코드에 맞게 조정하세요)
    const unavailableItems = selectedGearItems.filter(
      gear => gear.status !== '보유' // 예: '보유' 상태가 아닌 것을 모두 걸러냅니다.
    );

    // 3. 불가능한 장비가 포함되어 있을 때
    if (unavailableItems.length > 0) {
      const unavailableItemNames = unavailableItems.map(gear => `${gear.name}(${gear.status})`).join(', ');
      
      // alert 대신 toast 사용
      triggerToast(`이용 불가 장비가 있습니다: ${unavailableItemNames}`, "warning");
      console.warn("가져갈 수 없는 장비 목록:", unavailableItemNames); // 목록은 콘솔에 출력
      return;
    }

    // 4. 모달 열기
    setIsLetsGoOpen(true);
  };

  const handleAddNew = () => {
    setEditItem(null);
    setIsFormOpen(true);
  };

  const handleSaveItem = (itemData: Omit<GearItem, 'id'> & { id?: string }) => {
    let updatedList: GearItem[];
    if (itemData.id) {
      // Edit
      updatedList = gearList.map(item => item.id === itemData.id ? { ...(itemData as GearItem) } : item);
      setGearList(updatedList);
      syncWithBackend(updatedList);
      triggerToast('장비 정보가 성공적으로 수정되었습니다.', 'success');
    } else {
      // New
      const newItem: GearItem = {
        ...(itemData as Omit<GearItem, 'id'>),
        id: 'g_' + Date.now(),
      };
      updatedList = [newItem, ...gearList];
      setGearList(updatedList);
      syncWithBackend(updatedList);
      triggerToast('새로운 캠핑 장비가 대장에 등록되었습니다.', 'success');
    }
    setSelectedIds([]);
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('이 장비를 목록에서 완전히 삭제하시겠습니까?')) {
      const updatedList = gearList.filter(item => item.id !== id);
      setGearList(updatedList);
      syncWithBackend(updatedList);
      triggerToast('선택한 장비가 목록에서 완전히 삭제되었습니다.', 'success');
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  // Compass interaction
  const spinCompass = () => {
    const additionalSpin = Math.floor(Math.random() * 360) + 360;
    setCompassAngle(prev => prev + additionalSpin);
    triggerToast('🧭 나침반 자침이 북극을 향해 회전합니다!', 'info');
  };

  // Render Category Icon helper
  const renderCategoryIcon = (iconName: string, className = "w-6 h-6") => {
    switch (iconName) {
      case 'tent': return <Tent className={className} />;
      case 'bedding': return <Bed className={className} />;
      case 'furniture': return <Armchair className={className} />;
      case 'lighting': return <Lightbulb className={className} />;
      case 'cooking': return <Flame className={className} />;
      case 'seasonal': return <ThermometerSun className={className} />;
      default: return <Package className={className} />;
    }
  };

  // Category badge color helper (table와 모바일 카드에서 공용으로 사용)
  const getCategoryBadgeStyle = (cat: string) => {
    const styles: Record<string, string> = {
      tent: "bg-[#eef7f4] border-[#bfe3d5] text-emerald-800",
      bedding: "bg-[#fdf2f0] border-[#fbc9bf] text-rose-800",
      furniture: "bg-[#fdf8f5] border-[#f0ded3] text-amber-900",
      cooking: "bg-[#fef9e7] border-[#fae5a4] text-amber-800",
      lighting: "bg-[#e8f4fd] border-[#c0e0fc] text-sky-800",
      seasonal: "bg-[#f4faf8] border-[#daf0ea] text-teal-800",
      etc: "bg-[#f3f0fd] border-[#dfd7fe] text-indigo-800"
    };
    return styles[cat] || styles.etc;
  };

  // Status badge helper (table와 모바일 카드에서 공용으로 사용)
  const renderStatusBadge = (status: GearItem['status']) => {
    if (status === '보유') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#ebf5ed] text-emerald-700 border border-emerald-300 shadow-sm relative">
          <Tent className="w-3.5 h-3.5 text-emerald-600" />
          보유
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5" />
        </span>
      );
    }
    if (status === '매각') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#fbf4eb] text-amber-700 border border-amber-300 shadow-sm">
          <Coins className="w-3 h-3 text-amber-600" />
          매각
        </span>
      );
    }
    if (status === '폐기') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#fdf0f1] text-rose-700 border border-rose-300 shadow-sm">
          <X className="w-3 h-3 text-rose-500" />
          폐기
        </span>
      );
    }
    return null;
  };


  const stats = useMemo(() => {
    const totalCount = filteredGear.reduce((acc, curr) => acc + curr.quantity, 0);
    const totalWeight = filteredGear.reduce((acc, curr) => acc + curr.weight, 0);
    const totalPrice = filteredGear.reduce((acc, curr) => acc + curr.price, 0);
    return {
      totalCount,
      totalWeight: totalWeight.toFixed(1),
      totalPrice: totalPrice.toLocaleString(),
    };
  }, [filteredGear]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-[#faf9f6] via-[#f5ede0] to-[#eae0cc] p-1 md:p-4 lg:p-6 flex flex-col items-center justify-center select-none">
      
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f4f7f3]/85 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-2xl border border-[#cbd5c8] shadow-2xl flex flex-col items-center gap-4 max-w-sm text-center"
          >
            {/* Spinning & Bouncing Container */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              {/* Spinning Outer Ring */}
              <div className="absolute inset-0 rounded-full border-4 border-[#e6ece4] border-t-[#5aa880] animate-spin" />
              {/* Bouncing Tent */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="text-4xl select-none"
              >
                ⛺
              </motion.div>
            </div>
            
            <div className="space-y-1.5">
              <h3 className="font-sans font-black text-stone-900 text-lg">
                Camping Gears is Coming...
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                Cloud Data와 동기화 중입니다. 잠시만 기다려 주세요!
              </p>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* 🌲 Wooden Plank Joint Line Overlays to simulate elegant white-washed birch/wood desk planks */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="w-full h-px bg-stone-300/60 absolute top-[15%]" />
        <div className="w-full h-px bg-white/70 absolute top-[15.1%]" />
        <div className="w-full h-px bg-stone-300/60 absolute top-[40%]" />
        <div className="w-full h-px bg-white/70 absolute top-[40.1%]" />
        <div className="w-full h-px bg-stone-300/60 absolute top-[70%]" />
        <div className="w-full h-px bg-white/70 absolute top-[70.1%]" />
        
        {/* Wood knots styled via absolute elements */}
        <div className="absolute left-[8%] top-[25%] w-32 h-20 wood-knot rounded-full" />
        <div className="absolute right-[5%] top-[60%] w-40 h-24 wood-knot rounded-full" />
      </div>

      {/* 🕯️ Lantern ambient glow on the desk */}
      {lanternOn && (
        <div className="absolute inset-0 bg-[#f59e0b]/[0.02] pointer-events-none transition-all duration-700" />
      )}

      {/* ============================================================== */}
      {/* CAMPING DECORATIONS SURROUNDING THE MONITOR */}
      {/* ============================================================== */}
      {/* ============================================================== */}
      {/* CAMPING BRAND STICKERS (DESK DECORATION) */}
      {/* ============================================================== */}
      <div className="hidden xl:block absolute inset-0 pointer-events-none overflow-hidden z-30 select-none">
        
        {/* Coleman 스티커 (비율 완벽한 최종 완성형) */}
        <div className="absolute left-[2.5%] top-[40%] -rotate-12 bg-[#cc0000] border-2 border-white rounded-lg px-4 py-2 flex items-center justify-between shadow-xl opacity-95 overflow-hidden select-none -skew-x-6 gap-3">
          <div className="flex flex-col justify-center px-1">
            <span className="font-sans italic font-black text-white text-xl tracking-tight leading-none scale-y-110 drop-shadow-sm">
              Coleman
            </span>
            <div className="w-full h-1 bg-white rounded-full mt-1.5 shadow-sm" />
          </div>

          {/* 여백 없이 꽉 찬 타원형 랜턴 심벌 */}
          <div className="w-7 h-8 bg-white rounded-full flex items-center justify-center border-2 border-[#cc0000] shadow-inner shrink-0 relative overflow-hidden">
            <svg viewBox="0 0 100 100" className="w-[1.4rem] h-[1.4rem] fill-[#cc0000] mt-[1px]">
              {/* 상단 꼭지 및 2단 갓 */}
              <path d="M 46 16 L 54 16 L 54 20 L 46 20 Z" />
              <path d="M 42 20 L 58 20 L 62 28 L 38 28 Z" />
              <path d="M 32 29 L 68 29 L 66 33 L 34 33 Z" />
              {/* 중앙 유리 글로브 */}
              <rect x="41" y="35" width="18" height="24" rx="1" />
              {/* 하단 연료통 및 카라 */}
              <rect x="39" y="61" width="22" height="4" rx="1" />
              <path d="M 35 67 L 65 67 L 67 84 L 33 84 Z" strokeLinejoin="round" />
              {/* 양옆 3단 빛줄기 */}
              <path d="M 16 35 L 28 41 M 84 35 L 72 41 M 12 48 L 26 48 M 88 48 L 74 48 M 16 61 L 28 55 M 84 61 L 72 55" stroke="#cc0000" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            </svg>
          </div>
        </div>
        
        {/* 스노우피크 스티커 (사실적인 리얼 로고 적용) */}
        <div className="absolute left-[3.5%] top-[50%] rotate-6 bg-white text-stone-900 px-3.5 py-1.5 rounded-md shadow-lg opacity-95 border border-stone-200 flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5 mb-[1px]">
            {/* 리얼 눈꽃 모양 SVG */}
            <svg viewBox="0 0 100 100" className="w-[14px] h-[14px] fill-stone-900 select-none">
              <g transform="translate(50, 50)">
                <polygon points="-6,-42 6,-42 2,-2 -2,-2" />
                <polygon points="-6,42 6,42 2,2 -2,2" />
                <g transform="rotate(60)">
                  <polygon points="-6,-42 6,-42 2,-2 -2,-2" />
                  <polygon points="-6,42 6,42 2,2 -2,2" />
                </g>
                <g transform="rotate(120)">
                  <polygon points="-6,-42 6,-42 2,-2 -2,-2" />
                  <polygon points="-6,42 6,42 2,2 -2,2" />
                </g>
              </g>
            </svg>
            <span className="font-serif font-black text-[13px] tracking-tighter leading-none select-none scale-x-110 origin-left mt-[1px]">
              snow peak
            </span>
          </div>
          {/* 하단 미세 레터링 디테일 */}
          <div className="flex items-center justify-between w-full px-[1px]">
            <span className="font-sans text-[4.5px] text-stone-800 tracking-tighter select-none scale-x-90 origin-left">outdoor lifestyle creator</span>
            <span className="font-sans text-[4.5px] text-stone-800 tracking-tighter select-none scale-x-90 origin-right">since 1958</span>
          </div>
        </div>
        <div className="absolute left-[1.5%] top-[60%] -rotate-6 bg-black text-white px-5 py-2 font-sans font-black italic tracking-widest text-xs rounded-md shadow-lg opacity-95 border border-stone-800">
          Helinox
        </div>
        <div className="absolute left-[4%] top-[70%] rotate-12 bg-[#ff5a00] text-white px-4 py-1.5 font-sans font-bold tracking-tight text-xs rounded-md shadow-lg opacity-95">
          MINIMAL WORKS
        </div>
        <div className="absolute left-[2%] top-[80%] -rotate-3 bg-[#e0d6c8] text-stone-800 px-4 py-1.5 font-serif font-bold tracking-widest text-xs rounded-md shadow-lg border border-[#c4b59d] opacity-95 flex items-center gap-1.5">
          🐻 NORDISK
        </div>
        <div className="absolute left-[3.5%] top-[90%] rotate-6 bg-[#3b332c] text-[#ff8c00] px-4 py-1.5 font-sans font-black tracking-widest text-xs rounded-md shadow-lg opacity-95 border border-[#ff8c00]/30">
          KOVEA
        </div>

        {/* Right Side Stickers (상단 랜턴/머그컵 아래부터 시작되도록 top 비율 조정) */}
        <div className="absolute right-[2.5%] top-[42%] rotate-12 bg-white text-[#cc0000] px-4 py-1.5 font-serif font-black tracking-widest text-xs rounded-md shadow-lg border-2 border-[#cc0000] opacity-95">
          HILLEBERG
        </div>
        <div className="absolute right-[4%] top-[52%] -rotate-6 bg-[#006600] text-white px-4 py-1.5 font-sans font-bold tracking-wider text-xs rounded-md shadow-lg opacity-95 flex items-center gap-1.5">
          🍁 LOGOS
        </div>
        <div className="absolute right-[1.5%] top-[62%] rotate-3 bg-stone-100 text-stone-800 px-3.5 py-1.5 font-mono font-bold tracking-tighter text-xs rounded-md shadow-lg opacity-95 border border-stone-300">
          tent-Mark DESIGNS
        </div>
        <div className="absolute right-[4.5%] top-[72%] -rotate-12 bg-[#f4e087] text-stone-900 px-4 py-1.5 font-sans font-black tracking-widest text-sm rounded-md shadow-lg opacity-95 flex items-center gap-1.5">
          🐰 DOD
        </div>
        <div className="absolute right-[2%] top-[82%] rotate-6 bg-white text-[#cc0000] px-5 py-2 font-sans font-black tracking-tighter text-base rounded-full shadow-lg border-2 border-[#cc0000] opacity-95 flex items-center gap-1">
          🐧 CHUMS
        </div>
        <div className="absolute right-[5%] top-[92%] -rotate-6 bg-black text-[#00a0e9] px-4 py-1.5 font-sans font-black tracking-widest text-xs rounded-md shadow-lg opacity-95 border-b-2 border-[#00a0e9]">
          NEMO
        </div>
      </div>


      {/* Left Decoration: Antique Brass Compass & Rope Loop */}
      <div className="hidden 2xl:flex absolute left-2 xl:left-4 top-16 flex-col items-center gap-6 z-20">
        {/* Rope Coil */}
        <div className="relative w-36 h-36 flex items-center justify-center filter drop-shadow-md" title="감성 캠핑 코튼 면로프">
          <svg className="w-full h-full text-stone-300" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <path strokeWidth="3" d="M 50 10 C 20 10 10 30 10 50 C 10 70 30 90 50 90 C 70 90 90 70 90 50 C 90 30 70 10 50 10 Z" strokeDasharray="3,3" />
            <path strokeWidth="4" d="M 50 14 C 25 14 15 32 15 50 C 15 68 32 86 50 86 C 68 86 85 68 85 50 C 85 32 68 14 50 14 Z" />
            <path strokeWidth="4" d="M 50 18 C 30 18 20 34 20 50 C 20 66 34 82 50 82 C 66 82 80 66 80 50 C 80 34 66 18 50 18 Z" />
            <path strokeWidth="6" strokeLinecap="round" d="M 40 45 L 60 55 M 38 52 L 58 62 M 42 38 L 62 48" stroke="currentColor" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
            <Layers className="w-5 h-5 text-stone-400 mb-1" />
            <span className="font-hand text-[10px] text-stone-500 leading-none">Cotton Rope</span>
          </div>
        </div>

        {/* Antique Brass Compass */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={spinCompass}
          className="w-32 h-32 rounded-full border-4 border-amber-600 bg-[#faf8f4] shadow-xl relative cursor-pointer flex items-center justify-center"
          title="작동하는 골동품 황동 나침반 (클릭시 회전)"
        >
          {/* Inner brass ring */}
          <div className="absolute inset-1 rounded-full border border-amber-400/40 flex items-center justify-center">
            {/* Compass marks */}
            <span className="absolute top-2 text-rose-600 font-mono font-bold text-xs select-none">N</span>
            <span className="absolute right-2 text-amber-800 font-mono font-bold text-[10px] select-none">E</span>
            <span className="absolute bottom-2 text-amber-800 font-mono font-bold text-[10px] select-none">S</span>
            <span className="absolute left-2 text-amber-800 font-mono font-bold text-[10px] select-none">W</span>
            
            {/* Tick marks */}
            <div className="absolute inset-3 border border-dotted border-amber-700/20 rounded-full" />

            {/* Dial background details */}
            <span className="text-[8px] font-mono text-amber-800/60 absolute top-5">360°</span>
            <span className="text-[8px] font-mono text-amber-800/60 absolute bottom-5">180°</span>
          </div>

          {/* Magnetic Needle */}
          <motion.div
            animate={{ rotate: compassAngle }}
            transition={{ type: 'spring', stiffness: 50, damping: 12 }}
            className="w-full h-full absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            {/* North pointer (Red) */}
            <div className="absolute h-10 w-2 bg-gradient-to-t from-rose-500 to-rose-600 rounded-t-full bottom-1/2 origin-bottom shadow-md" style={{ transform: 'translateY(1px)' }}>
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-rose-700 absolute -top-2 left-1/2 -translate-x-1/2" />
            </div>
            {/* South pointer (Slate) */}
            <div className="absolute h-10 w-2 bg-gradient-to-b from-gray-400 to-gray-500 rounded-b-full top-1/2 origin-top shadow-md" style={{ transform: 'translateY(-1px)' }}>
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[8px] border-t-gray-600 absolute -bottom-2 left-1/2 -translate-x-1/2" />
            </div>
            {/* Center Pivot */}
            <div className="w-3.5 h-3.5 rounded-full bg-yellow-500 border-2 border-stone-800 shadow-lg z-10" />
          </motion.div>
        </motion.div>
      </div>

        {/* Right Decoration: Coleman Classic Red Lantern (Limited Edition) - Volumed Up */}
      <div className="hidden 2xl:flex absolute right-10 2xl:right-16 top-12 flex-col items-center gap-4 z-20">
        <motion.div
          whileHover={{ scale: 1.03 }}
          onClick={() => setLanternOn(p => !p)}
          className="cursor-pointer flex flex-col items-center group relative"
          title="작동하는 콜맨 크리스마스 한정판 랜턴 (클릭시 점등)"
        >
          {/* Bail Handle (콜맨 특유의 커다란 와이어 손잡이) */}
          <div className="absolute top-6 -left-6 -right-6 bottom-16 border-[2.5px] border-stone-400/80 rounded-b-[3rem] rounded-t-[2.5rem] pointer-events-none transition-colors group-hover:border-stone-300 z-0" />

          {/* Metal Wire loop on top (상단 고정 너트) */}
          <div className="w-10 h-8 border-4 border-stone-400 border-b-0 rounded-t-full -mb-1 group-hover:border-red-400 transition-colors relative z-10">
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-2 bg-gradient-to-b from-stone-200 to-stone-400 rounded-sm border border-stone-500 shadow-sm" />
          </div>

          {/* Lantern Top Hood (Red Ventilator - 챙과 볼륨 확장) */}
          <div className="w-20 h-6 bg-gradient-to-b from-[#a30b0b] to-[#7a0606] rounded-t-xl shadow-md border-b border-[#540202] flex flex-col items-center justify-end relative z-20">
            <div className="w-24 h-2.5 bg-gradient-to-r from-[#8a0808] via-[#e31212] to-[#8a0808] rounded-full -mb-1.5 shadow-sm border border-[#540202]" />
          </div>

          {/* Glass Chamber & Frame (양옆 수직 프레임 철사 추가 및 유리볼륨 업) */}
          <div className="relative mt-1.5 z-10">
            {/* 양옆 수직 철사 (Frame) */}
            <div className="absolute -left-2 top-0 bottom-0 w-1.5 bg-gradient-to-r from-stone-400 to-stone-300 rounded-full shadow-sm z-20" />
            <div className="absolute -right-2 top-0 bottom-0 w-1.5 bg-gradient-to-r from-stone-300 to-stone-400 rounded-full shadow-sm z-20" />

            <div className="w-16 h-20 bg-amber-500/10 border-x border-stone-300/80 relative flex items-center justify-center overflow-hidden rounded-xl">
              {/* Glass Highlights */}
              <div className="absolute inset-y-0 left-1.5 w-2 bg-white/30 blur-[1px] pointer-events-none" />
              <div className="absolute inset-y-0 right-2 w-1 bg-white/20 blur-[1px] pointer-events-none" />

              {/* Generator tube (굵어진 은색 기화기 관) */}
              <div className="absolute inset-y-0 left-1/3 w-2 bg-gradient-to-r from-stone-400 to-stone-200" />
              
              {/* Flame (더 풍성해진 불꽃) */}
              <AnimatePresence>
                {lanternOn && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ 
                      scale: [1, 1.2, 1.05, 1.15, 1], 
                      opacity: [0.9, 1, 0.95, 1, 0.9] 
                    }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 1.5,
                      ease: 'easeInOut' 
                    }}
                    className="w-8 h-10 bg-gradient-to-t from-yellow-100 via-amber-300 to-transparent rounded-full blur-[2px] shadow-[0_0_35px_15px_rgba(251,191,36,0.85)] flex items-center justify-center relative left-1"
                  >
                    <div className="w-3.5 h-6 bg-white rounded-full blur-[1px] absolute bottom-1" />
                  </motion.div>
                )}
              </AnimatePresence>
              {!lanternOn && (
                <div className="w-3 h-6 bg-neutral-200/60 rounded-full absolute bottom-4 left-[55%]" />
              )}
            </div>
          </div>

          {/* Silver Collar (은색 넥카라 부분 - 볼륨 업) */}
          <div className="w-20 h-4 bg-gradient-to-r from-stone-500 via-stone-200 to-stone-500 border-y border-stone-400 shadow-sm z-20 rounded-sm" />

          {/* Red fuel body (콜맨 레드 연료통 - 빵빵한 곡선과 뚱뚱한 볼륨감) */}
          <div className="w-24 h-16 bg-gradient-to-b from-[#e31212] via-[#bd0b0b] to-[#7a0606] rounded-b-xl rounded-t-3xl shadow-lg flex flex-col items-center justify-start pt-2 pb-2 border border-[#540202]/30 relative -mt-1 z-10">
            
            {/* Pump knob */}
            <div className="absolute -left-1.5 top-5 w-3 h-3.5 bg-gradient-to-r from-[#a30b0b] to-[#e31212] rounded-l-sm border border-[#540202]" />
            
            {/* Fuel Cap */}
            <div className="absolute -right-1.5 top-6 w-2.5 h-3 bg-gradient-to-b from-stone-200 to-stone-400 rounded-r-sm border border-stone-500" />

            {/* Control valve knob */}
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-stone-200 to-stone-400 border border-stone-500 shadow-inner flex items-center justify-center mt-0.5 relative z-20">
              <div className="absolute inset-1 rounded-full border border-dotted border-stone-600/30" />
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-[#a30b0b] to-[#e31212] border border-[#540202] cursor-pointer shadow-md group-hover:rotate-90 transition-transform duration-300" />
            </div>
            
            {/* Coleman 정품 스타일 리얼 로고 (랜턴 전용 컴팩트) */}
            <div className="mt-1 bg-[#cc0000] border border-white rounded-[4px] px-1.5 py-0.5 flex items-center justify-between shadow-sm relative overflow-hidden select-none -skew-x-6 w-[4.4rem]">
              <div className="flex flex-col justify-center">
                <span className="font-sans italic font-black text-white text-[9.5px] tracking-tight leading-none scale-y-110">
                  Coleman
                </span>
                <div className="w-full h-[0.7px] bg-white rounded-full mt-1" />
              </div>
              <div className="ml-1 w-4 h-4.5 bg-white rounded-full flex items-center justify-center border border-[#cc0000] shrink-0 shadow-inner">
                <svg viewBox="0 0 100 100" className="w-3 h-3 fill-[#cc0000]">
                  <path d="M50 12 C44 12 42 16 42 18 L58 18 C58 16 56 12 50 12 Z" />
                  <path d="M38 18 L62 18 C65 18 66 23 63 26 L37 26 C34 23 35 18 38 18 Z" />
                  <rect x="40" y="26" width="20" height="22" rx="2" />
                  <path d="M40 50 L60 50 C63 50 64 54 62 58 L38 58 C36 54 37 50 40 50 Z" />
                  <path d="M26 33 L35 36 M74 33 L65 36 M22 44 L35 44 M78 44 L65 44 M26 55 L35 52 M74 55 L65 52" stroke="#cc0000" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
          
          <span className="text-[10px] font-hand text-[#cc0000] mt-2 font-bold select-none group-hover:text-[#ff3333] transition-colors relative z-20">
            {lanternOn ? '💡 click to turn OFF' : '🔥 click to turn ON'}
          </span>
        </motion.div>

        {/* Right Decoration: Snow Peak Titanium Mug */}
        <div className="w-20 h-20 bg-gradient-to-br from-zinc-300 via-zinc-400 to-zinc-500 border border-zinc-400/80 rounded-b-[10px] relative mt-8 shadow-md" title="따뜻한 커피가 담긴 스노우피크 티타늄 머그">
          
          {/* 🌟 수정된 부분: Folding Handle (Single Loop 티타늄 폴딩 손잡이) */}
          <div className="absolute right-0 top-3 bottom-3 -mr-[1.35rem] w-[1.4rem] border-[2.5px] border-l-0 border-zinc-300 rounded-r-2xl shadow-sm z-0" />
          
          {/* Bracket for handle (손잡이 고정 브라켓 - 손잡이 안쪽을 가려주는 역할) */}
          <div className="absolute right-0 top-1.5 bottom-1.5 w-1.5 bg-gradient-to-b from-zinc-400 to-zinc-500 rounded-l-sm border-l border-zinc-300/50 z-10" />
          
          {/* Mug Rim (컵 둥근 테두리) */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-300 rounded-t-sm border-b border-zinc-500/50 z-10" />
          
          {/* Coffee line inside (커피 디테일) */}
          <div className="absolute top-1 inset-x-0 h-1 bg-[#4a2e1b]/80" />
          
          {/* Logo Details (스노우피크 리얼 로고 & 레터링) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-2 z-10">
            {/* Authentic SVG Asterisk */}
            <svg viewBox="0 0 100 100" className="w-5 h-5 fill-zinc-800 select-none mb-0.5">
              <g transform="translate(50, 50)">
                <polygon points="-6,-42 6,-42 2,-2 -2,-2" />
                <polygon points="-6,42 6,42 2,2 -2,2" />
                <g transform="rotate(60)">
                  <polygon points="-6,-42 6,-42 2,-2 -2,-2" />
                  <polygon points="-6,42 6,42 2,2 -2,2" />
                </g>
                <g transform="rotate(120)">
                  <polygon points="-6,-42 6,-42 2,-2 -2,-2" />
                  <polygon points="-6,42 6,42 2,2 -2,2" />
                </g>
              </g>
            </svg>
            
            <span className="font-serif font-black text-[11px] text-zinc-900 tracking-tighter leading-none select-none scale-x-110">
              snow peak
            </span>
            
            {/* 정품 로고 하단 슬로건 디테일 */}
            <div className="flex items-center justify-between w-[3.5rem] mt-[1.5px] px-[1px]">
              <span className="font-sans text-[2.5px] text-zinc-800 tracking-tighter select-none scale-x-90 origin-left">outdoor lifestyle creator</span>
              <span className="font-sans text-[2.5px] text-zinc-800 tracking-tighter select-none scale-x-90 origin-right">since 1958</span>
            </div>

            {/* Titanium 600 details */}
            <div className="mt-1 flex flex-col items-center">
              <span className="font-mono text-[4.5px] text-zinc-700 tracking-[0.2em] font-extrabold select-none mb-[1px]">600</span>
              <span className="font-sans text-[3px] text-zinc-700 tracking-tighter uppercase select-none mb-[1.5px]">double-wall</span>
              <span className="font-sans text-[4.5px] text-zinc-900 tracking-widest font-black uppercase select-none">Titanium</span>
              <span className="font-sans text-[3px] text-zinc-700 tracking-widest uppercase select-none mt-[0.5px]">Japan</span>
            </div>
          </div>

          {/* Floating Steam lines (모락모락 피어나는 김) */}
          <div className="absolute -top-7 left-6 w-8 h-8 flex gap-1 pointer-events-none overflow-hidden z-10">
            <motion.div
              animate={{ y: [0, -10, 0], opacity: [0, 0.7, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="w-0.5 h-4 bg-zinc-100/80 rounded-full"
            />
            <motion.div
              animate={{ y: [0, -12, 0], opacity: [0, 0.6, 0] }}
              transition={{ repeat: Infinity, duration: 2.3, delay: 0.4, ease: 'easeInOut' }}
              className="w-0.5 h-5 bg-zinc-100/80 rounded-full"
            />
            <motion.div
              animate={{ y: [0, -8, 0], opacity: [0, 0.5, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, delay: 0.8, ease: 'easeInOut' }}
              className="w-0.5 h-4 bg-zinc-100/80 rounded-full"
            />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MONITOR FRAME (THE CONTAINER RESTING ON THE WOOD DESK) */}
      {/* ============================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full h-full flex flex-col flex-1 min-h-0 max-w-full md:max-w-[95%] 2xl:max-w-[82%] rounded-xl md:rounded-2xl border-[6px] md:border-x-[12px] md:border-t-[12px] md:border-b-[24px] border-[#cbd5c8] bg-[#e3eae1] shadow-2xl relative overflow-hidden z-10"
        id="app-monitor-container"
      >
        {/* Monitor Gloss reflection overlay (retro desktop monitor look) */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.015] to-white/[0.04] pointer-events-none z-30" />

        {/* ============================================================== */}
        {/* INNER CONTAINER (COARSE DARK ALUMINUM FRAME FINISH) */}
        {/* ============================================================== */}
        <div className="p-2 md:p-3 bg-[#f4f7f3] w-full h-full flex flex-col flex-1 min-h-0 gap-1.5 md:gap-2 text-stone-800 border border-[#cbd5c8] overflow-hidden">
          
          {/* 1. APPLET TITLE BAR */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4 pb-1.5 md:pb-2 border-b-2 border-[#cbd5c8] shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#5aa880] text-white shadow-sm border border-[#488e6a]">
                <Tent className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-sans font-black text-xl md:text-2xl tracking-tight text-stone-900 flex items-center gap-2 break-keep">
                  캠핑장비 관리 시스템
                  <span className="text-[10px] bg-[#e6ece4] text-[#4a6648] border border-[#cbd5c8] px-2 py-0.5 rounded-full font-mono font-bold">
                    v3.0.0
                  </span>
                </h1>
                <p className="text-xs text-stone-500 mt-0.5 font-sans">
                  Springtime Aesthetic Glamping — Digital Pastel Ledger & Gear Management Engine
                </p>
              </div>
            </div>

            {/* Quick clock & stats */}
            <div className="flex items-center gap-3 bg-white/90 px-4 py-1.5 rounded-xl border border-[#cbd5c8] text-xs text-stone-600 shadow-sm">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-mono">{formattedDate}</span>
              </div>
              <div className="h-3 w-px bg-stone-300" />
              <div className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                <span>총 <strong className="text-stone-900 font-bold font-mono">{stats.totalCount}</strong>개 보관 중</span>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* 1. CATEGORY SUMMARY CARDS (PASTEL FABRIC PATCHES) */}
          {/* ============================================================== */}
          <div className="shrink-0">
            <h2 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-1 font-mono flex items-center gap-1.5 select-none">
              <span>카테고리 요약 정보</span>
              <span className="h-px bg-stone-200 flex-1"></span>
              <button
                onClick={() => setIsSummaryVisible(!isSummaryVisible)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-stone-50 border border-[#cbd5c8] text-stone-600 font-sans text-[10px] font-bold transition-all hover:text-stone-900 active:scale-95 shadow-2xs cursor-pointer"
              >
                {isSummaryVisible ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 text-[#5aa880]" />
                    <span>요약 감추기</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 text-[#5aa880]" />
                    <span>요약 펼치기</span>
                  </>
                )}
              </button>
            </h2>

            <AnimatePresence initial={false}>
              {isSummaryVisible && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="flex overflow-x-auto pb-1.5 pt-1 px-2 snap-x md:grid md:grid-cols-4 xl:grid-cols-7 gap-2 md:overflow-visible">
                    {summaries.map((sum) => {
                      const isActive = categoryFilter === sum.id;
                      
                      // Pastel style mappings for each category
                      const getPastelTheme = (id: string) => {
                        const themes: Record<string, { bg: string; border: string; text: string; iconBg: string; iconText: string; countText: string }> = {
                          tent: {
                            bg: "from-[#eef7f4] via-[#e2f1eb] to-[#d5ebe0]",
                            border: "border-[#9ed6bc]",
                            text: "text-emerald-900",
                            iconBg: "bg-[#d1ecd9]",
                            iconText: "text-emerald-700",
                            countText: "text-emerald-700"
                          },
                          bedding: {
                            bg: "from-[#fdf2f0] via-[#fbe4df] to-[#f9d4cc]",
                            border: "border-[#f5ada0]",
                            text: "text-rose-900",
                            iconBg: "bg-[#fad6cf]",
                            iconText: "text-rose-700",
                            countText: "text-rose-700"
                          },
                          furniture: {
                            bg: "from-[#fdf8f5] via-[#f7eae1] to-[#f0ded3]",
                            border: "border-[#ddc4b4]",
                            text: "text-amber-950",
                            iconBg: "bg-[#f5e3d7]",
                            iconText: "text-amber-800",
                            countText: "text-amber-800"
                          },
                          cooking: {
                            bg: "from-[#fef9e7] via-[#fdf2cc] to-[#faeab1]",
                            border: "border-[#e9cc72]",
                            text: "text-amber-900",
                            iconBg: "bg-[#fbe7a4]",
                            iconText: "text-amber-700",
                            countText: "text-amber-700"
                          },
                          lighting: {
                            bg: "from-[#e8f4fd] via-[#d4ebfc] to-[#bfe0fa]",
                            border: "border-[#96cbf2]",
                            text: "text-sky-900",
                            iconBg: "bg-[#cfe7fa]",
                            iconText: "text-sky-700",
                            countText: "text-sky-700"
                          },
                          seasonal: {
                            bg: "from-[#f4faf8] via-[#e5f5f0] to-[#daf0ea]",
                            border: "border-[#addbd0]",
                            text: "text-teal-950",
                            iconBg: "bg-[#cfebe3]",
                            iconText: "text-teal-800",
                            countText: "text-teal-800"
                          },
                          etc: {
                            bg: "from-[#f3f0fd] via-[#e6dffd] to-[#d4ceff]",
                            border: "border-[#bba6fc]",
                            text: "text-indigo-900",
                            iconBg: "bg-[#e2d8fe]",
                            iconText: "text-indigo-700",
                            countText: "text-indigo-700"
                          },
                        };
                        return themes[id] || themes.etc;
                      };

                      const theme = getPastelTheme(sum.id);

                      return (
                        <motion.div
                          key={sum.id}
                          whileHover={{ y: -3, scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setCategoryFilter(isActive ? 'all' : sum.id)}
                          className={`cursor-pointer transition-all duration-300 rounded-xl relative p-0.5 overflow-hidden shadow-sm min-w-[140px] md:min-w-0 snap-center shrink-0 ${
                            isActive 
                              ? 'ring-2 ring-[#5aa880] scale-[1.02] shadow-md' 
                              : 'hover:shadow-md'
                          }`}
                          id={`summary-card-${sum.id}`}
                        >
                          {/* Fabric patch stitched borders */}
                          <div className={`border border-dashed border-white m-[2px] rounded-lg p-2.5 flex flex-col justify-between h-[4.5rem] bg-gradient-to-br ${theme.bg} ${theme.border} shadow-inner relative`}>
                            {/* Soft canvas weave texture overlay */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.4),transparent)] pointer-events-none rounded-lg" />
                            
                            {/* Top icon & Label */}
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-black ${theme.text} tracking-wider uppercase font-mono`}>
                                {sum.name}
                              </span>
                              <div className={`p-1 rounded-lg ${theme.iconBg} ${theme.iconText} border border-white/60`}>
                                {renderCategoryIcon(sum.iconName, "w-4 h-4")}
                              </div>
                            </div>

                            {/* Handwritten text inside */}
                            <div className="mt-1 text-left">
                              <p className={`font-hand text-lg font-black ${theme.countText} leading-none`}>
                                {sum.countText}
                              </p>
                            </div>

                            {/* Small visual fabric label */}
                            <div className="absolute bottom-1 right-2.5 text-[8px] font-sans text-stone-400/60 italic font-bold pointer-events-none">
                              cotton patch
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ============================================================== */}
          {/* TOOLBAR: SEARCH & FILTERS AND MANAGEMENT BUTTONS */}
          {/* ============================================================== */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 p-2 bg-white/95 border border-[#cbd5c8] rounded-2xl shadow-sm shrink-0">
            
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative flex-1 min-w-[180px]">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#778c74]">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="물품명, 브랜드 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 bg-[#f8faf7] border border-[#cbd5c8] rounded-xl focus:outline-none focus:border-[#5aa880] focus:ring-2 focus:ring-[#5aa880]/20 text-xs text-stone-800 placeholder-[#99a997]"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-2.5 flex items-center text-stone-400 hover:text-stone-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-[#f8faf7] p-1 border border-[#cbd5c8] rounded-xl">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                    statusFilter === 'all' 
                      ? 'bg-[#5aa880] text-white shadow-sm' 
                      : 'text-[#61745f] hover:bg-[#eef3ec]'
                  }`}
                >
                  전체상태
                </button>
                <button
                  onClick={() => setStatusFilter('보유')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                    statusFilter === '보유' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-[#416a4b] hover:bg-[#ebf5ed]'
                  }`}
                >
                  🏕️ 보유
                </button>
                <button
                  onClick={() => setStatusFilter('매각')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                    statusFilter === '매각' 
                      ? 'bg-amber-500 text-white shadow-sm' 
                      : 'text-[#826135] hover:bg-[#fbf4eb]'
                  }`}
                >
                  🪙 매각
                </button>
                <button
                  onClick={() => setStatusFilter('폐기')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                    statusFilter === '폐기' 
                      ? 'bg-rose-500 text-white shadow-sm' 
                      : 'text-[#8a4245] hover:bg-[#fdf0f1]'
                  }`}
                >
                  🗑️ 폐기
                </button>
              </div>

              {/* Reset filter buttons if active */}
              {(categoryFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
                <button
                  onClick={() => {
                    setCategoryFilter('all');
                    setStatusFilter('all');
                    setSearchTerm('');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg text-stone-600 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  필터해제
                </button>
              )}
            </div>

            {/* ============================================================== */}
            {/* 3. MANAGEMENT BUTTONS (ROUNDED PASTEL DESIGN) */}
            {/* ============================================================== */}
            <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2 w-full lg:w-auto">
              {/* Let's Go */}
              <button
                onClick={handleLetsGoClick}
                className="group relative cursor-pointer flex items-center gap-1.5 px-4 py-1.5 bg-[#a78bfa] hover:bg-[#8b5cf6] border border-[#7c3aed] active:scale-95 transition-all text-white rounded-full shadow-sm mr-2"
                title="선택된 장비 패킹 리스트 보기"
              >
                <CarFront className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold font-sans tracking-tight">Let's Go!</span>
              </button>

              {/* 신규등록 */}
              <button
                onClick={handleAddNew}
                className="group relative cursor-pointer flex items-center gap-1.5 px-4 py-1.5 bg-[#5aa880] hover:bg-[#4d9670] border border-[#4a8f6a] active:scale-95 transition-all text-white rounded-full shadow-sm"
                title="새 장비 등록"
              >
                <Plus className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold font-sans tracking-tight">신규등록</span>
              </button>
            </div>
          </div>

          {/* ============================================================== */}
          {/* TOAST NOTIFICATIONS (IN-PAGE FIELD BANNER) */}
          {/* ============================================================== */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium shadow-md ${
                  toastMessage.type === 'success'
                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                    : toastMessage.type === 'warning'
                    ? 'bg-amber-950/80 border-amber-500/40 text-amber-200'
                    : 'bg-khaki-900/80 border-khaki-700 text-khaki-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                  <p>{toastMessage.text}</p>
                </div>
                <button onClick={() => setToastMessage(null)} className="p-0.5 hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ============================================================== */}
          {/* 2. FULL GEAR LIST (IVORY/WHITE CANVAS AND ROPE DIVIDERS) */}
          {/* ============================================================== */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden border border-[#cbd5c8] rounded-xl shadow-sm bg-white">
            
            {/* List Info Bar */}
            <div className="px-5 py-2 bg-[#f8faf7] border-b border-[#cbd5c8] text-xs flex justify-between items-center flex-wrap gap-2 text-stone-600 shrink-0">
              <div className="flex items-center gap-2 font-sans font-medium">
                <span className="w-2 h-2 rounded-full bg-[#5aa880]"></span>
                <span>
                  대장 분류 필터: <strong className="text-stone-900 font-extrabold">{categoryFilter === 'all' ? '전체' : summaries.find(x => x.id === categoryFilter)?.label}</strong>
                  {statusFilter !== 'all' && <> | 상태: <strong className="text-stone-900 font-extrabold">{statusFilter}</strong></>}
                  {searchTerm && <> | 검색어: "<strong className="text-stone-900 font-extrabold">{searchTerm}</strong>"</>}
                </span>
                <span className="text-stone-400 font-bold">
                  ({filteredGear.length}건 검색됨)
                </span>
              </div>
              
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span>총 중량: <strong className="text-emerald-700 font-bold">{stats.totalWeight} kg</strong></span>
                <span className="text-[#cbd5c8]">|</span>
                <span>총 금액: <strong className="text-stone-950 font-black">₩{stats.totalPrice}</strong></span>
              </div>
            </div>

            {/* Desktop Table Wrapper */}
            <div className="hidden md:block flex-1 overflow-y-auto overflow-x-auto min-h-0">
              <table className="w-full text-left border-collapse min-w-[800px]">
                
                {/* Table Header - Clean Sage Ivory look */}
                <thead>
                  <tr className="bg-[#eef3ec] text-[#4a6648] text-xs font-bold uppercase tracking-wider font-sans border-b border-[#cbd5c8] sticky top-0 z-10 shadow-sm">
                    <th className="py-2 px-3.5 w-12 text-center">
                      <button
                        onClick={toggleSelectAll}
                        className="p-1 rounded bg-white border border-[#cbd5c8] text-[#5aa880] hover:bg-[#e6ece4] transition-colors"
                        title="전체 선택/해제"
                      >
                        {selectedIds.length === filteredGear.length && filteredGear.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-[#5aa880]" />
                        ) : (
                          <Square className="w-4 h-4 text-stone-400" />
                        )}
                      </button>
                    </th>
                    <th className="py-2 px-3.5 w-36 text-center whitespace-nowrap">카테고리</th>
                    <th className="py-2 px-3.5 min-w-[280px]">물품명</th>
                    <th className="py-2 px-3.5 w-40">브랜드/제조사</th>
                    <th className="py-2 px-3.5 min-w-[200px]">규격/모델명</th>
                    <th className="py-2 px-3.5 w-20 text-center">수량</th>
                    <th className="py-2 px-3.5 w-24 text-center">중량(kg)</th>
                    <th className="py-2 px-3.5 w-36 text-right">구입금액(₩)</th>
                    <th className="py-2 px-3.5 w-32 text-center">상태</th>
                    <th className="py-2 px-3.5 w-20 text-center">관리</th>
                  </tr>
                </thead>

                {/* Table Body - Bright ivory-tinted bg */}
                <tbody className="bg-white text-stone-900 divide-y divide-stone-100">
                  {filteredGear.length > 0 ? (
                    filteredGear.map((item) => {
                      const isSelected = selectedIds.includes(item.id);

                      return (
                        <tr
                          key={item.id}
                          className={`group hover:bg-[#f4fcf8]/60 transition-colors duration-150 relative ${
                            isSelected ? 'bg-[#ebf5ed]/80' : 'even:bg-[#fafdfa]'
                          }`}
                        >
                          {/* Selection Checkbox */}
                          <td className="py-2 px-3.5 text-center">
                            <button
                              onClick={() => toggleSelect(item.id)}
                              className="p-1 rounded text-stone-500 hover:text-stone-800 transition-colors inline-block"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#5aa880]" />
                              ) : (
                                <Square className="w-4 h-4 text-stone-300" />
                              )}
                            </button>
                          </td>

                          {/* Category Badge */}
                          <td className="py-2 px-3.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border shadow-sm whitespace-nowrap ${getCategoryBadgeStyle(item.category)}`}>
                              {renderCategoryIcon(item.category, "w-3.5 h-3.5")}
                              {categoryLabels[item.category]}
                            </span>
                          </td>

                          {/* Item Name */}
                          <td className="py-2 px-3.5">
                            <span className="font-sans font-extrabold text-[13px] text-stone-900 whitespace-pre-wrap leading-tight block">
                              {item.name}
                            </span>
                          </td>

                          {/* Brand */}
                          <td className="py-2 px-3.5 font-sans text-xs font-semibold text-stone-600">
                            {item.brand}
                          </td>

                          {/* Specs */}
                          <td className="py-2 px-3.5 font-mono text-[11px] text-stone-500 whitespace-pre-wrap leading-tight">
                            {item.model}
                          </td>

                          {/* Quantity */}
                          <td className="py-2 px-3.5 text-center font-mono text-xs font-bold text-stone-900">
                            {item.quantity}
                          </td>

                          {/* Weight */}
                          <td className="py-2 px-3.5 text-center font-mono text-xs text-stone-500">
                            {item.weight > 0 ? `${item.weight.toFixed(1)}kg` : '0.0kg'}
                          </td>

                          {/* Price */}
                          <td className="py-2 px-3.5 text-right font-mono text-xs font-bold text-stone-900">
                            ₩{item.price.toLocaleString()}
                          </td>

                          {/* Status - Soft Pastel glowing pills */}
                          <td className="py-2 px-3.5 text-center">
                            <div className="flex items-center justify-center">
                              {renderStatusBadge(item.status)}
                            </div>
                          </td>

                          {/* Manage Column - Edit & Delete Buttons */}
                          <td className="py-2 px-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditItem(item);
                                  setIsFormOpen(true);
                                }}
                                title="수정"
                                className="p-1 rounded hover:bg-stone-100 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5 text-stone-400 hover:text-[#f3b05a] transition-colors" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteItem(item.id);
                                }}
                                title="삭제"
                                className="p-1 rounded hover:bg-stone-100 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-stone-400 hover:text-rose-500 transition-colors" />
                              </button>
                            </div>
                          </td>

                          {/* ROPE PATTERN LINE FOR EACH DIVIDER ROW (Custom style in index.css) */}
                          <td colSpan={10} className="absolute bottom-0 left-0 right-0 h-px p-0 pointer-events-none">
                            <div className="rope-line w-full" />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-12 text-center bg-white">
                        <div className="flex flex-col items-center justify-center p-4">
                          <Info className="w-10 h-10 text-stone-300 mb-2" />
                          <p className="font-hand text-lg text-stone-600 font-bold">
                            지정된 조건에 부합하는 장비가 없습니다.
                          </p>
                          <p className="text-xs text-stone-400 mt-1 font-sans">
                            검색어 또는 분류 필터를 변경하거나 새로운 장비를 등록해주세요.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List (테이블 대신 좁은 화면에서 가로 스크롤 없이 한 눈에 보이도록) */}
            <div className="md:hidden flex-1 overflow-y-auto min-h-0 divide-y divide-stone-100 bg-white">
              {filteredGear.length > 0 ? (
                filteredGear.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`p-4 flex flex-col gap-2 ${isSelected ? 'bg-[#ebf5ed]/80' : ''}`}
                    >
                      {/* Row 1: 체크박스 + 카테고리 배지 + 관리 버튼 */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            onClick={() => toggleSelect(item.id)}
                            className="p-1 rounded text-stone-500 hover:text-stone-800 transition-colors shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#5aa880]" />
                            ) : (
                              <Square className="w-4 h-4 text-stone-300" />
                            )}
                          </button>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border shadow-sm whitespace-nowrap shrink-0 ${getCategoryBadgeStyle(item.category)}`}>
                            {renderCategoryIcon(item.category, "w-3.5 h-3.5")}
                            {categoryLabels[item.category]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditItem(item);
                              setIsFormOpen(true);
                            }}
                            title="수정"
                            className="p-1.5 rounded hover:bg-stone-100 transition-colors"
                          >
                            <Pencil className="w-4 h-4 text-stone-400 hover:text-[#f3b05a] transition-colors" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(item.id);
                            }}
                            title="삭제"
                            className="p-1.5 rounded hover:bg-stone-100 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-stone-400 hover:text-rose-500 transition-colors" />
                          </button>
                        </div>
                      </div>

                      {/* Row 2: 물품명 */}
                      <span className="font-sans font-extrabold text-sm text-stone-900 leading-snug">
                        {item.name}
                      </span>

                      {/* Row 3: 브랜드 / 규격 */}
                      {(item.brand || item.model) && (
                        <div className="text-xs text-stone-500 font-sans flex flex-wrap gap-x-1.5">
                          {item.brand && <span className="font-semibold text-stone-600">{item.brand}</span>}
                          {item.brand && item.model && <span className="text-stone-300">·</span>}
                          {item.model && <span className="font-mono">{item.model}</span>}
                        </div>
                      )}

                      {/* Row 4: 수량/중량/금액 + 상태 */}
                      <div className="flex items-center justify-between gap-2 pt-2 mt-1 border-t border-dashed border-stone-200">
                        <div className="flex items-center gap-3 font-mono text-xs text-stone-600">
                          <span><strong className="text-stone-900">{item.quantity}</strong>개</span>
                          <span className="text-stone-300">|</span>
                          <span>{item.weight > 0 ? `${item.weight.toFixed(1)}kg` : '0.0kg'}</span>
                          <span className="text-stone-300">|</span>
                          <span className="font-bold text-stone-900">₩{item.price.toLocaleString()}</span>
                        </div>
                        {renderStatusBadge(item.status)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center bg-white">
                  <div className="flex flex-col items-center justify-center p-4">
                    <Info className="w-10 h-10 text-stone-300 mb-2" />
                    <p className="font-hand text-lg text-stone-600 font-bold">
                      지정된 조건에 부합하는 장비가 없습니다.
                    </p>
                    <p className="text-xs text-stone-400 mt-1 font-sans">
                      검색어 또는 분류 필터를 변경하거나 새로운 장비를 등록해주세요.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Retro Wood Table Shadow base */}
      <div className="w-full max-w-4xl h-8 bg-black/60 blur-xl rounded-full -mt-2 opacity-50 select-none pointer-events-none" />

      {/* Form Modal */}
      <GearFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditItem(null);
        }}
        onSave={handleSaveItem}
        editItem={editItem}
      />

      {/* Let's Go Modal */}
      <LetsGoModal
        isOpen={isLetsGoOpen}
        onClose={() => setIsLetsGoOpen(false)}
        selectedItems={gearList.filter(item => selectedIds.includes(item.id))}
      />
    </div>
  );
}
