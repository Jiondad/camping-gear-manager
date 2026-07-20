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
  CarFront
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
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.model.toLowerCase().includes(searchTerm.toLowerCase());
      
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
  const handleLetsGo = () => {
    if (selectedIds.length === 0) {
      triggerToast('패킹할 장비를 먼저 선택해 주세요.', 'warning');
      return;
    }
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

  // Reset gear to factory default
  const handleResetDefault = () => {
    if (window.confirm('장비 리스트를 초기 상태로 복구하시겠습니까? 추가한 모든 변경사항이 초기화됩니다.')) {
      setGearList(DEFAULT_GEAR);
      syncWithBackend(DEFAULT_GEAR);
      setSelectedIds([]);
      triggerToast('초기 대장 데이터로 복구되었습니다.', 'info');
    }
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

  // Total summary weight & price calculations
  const stats = useMemo(() => {
    const activeList = gearList.filter(item => item.status === '보유');
    const totalCount = activeList.reduce((acc, curr) => acc + curr.quantity, 0);
    const totalWeight = activeList.reduce((acc, curr) => acc + (curr.weight * curr.quantity), 0);
    const totalPrice = activeList.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    return {
      totalCount,
      totalWeight: totalWeight.toFixed(1),
      totalPrice: totalPrice.toLocaleString(),
    };
  }, [gearList]);

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
                대장 정보를 불러오는 중입니다...
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                구글 스프레드시트 백엔드와 안전하게 동기화 중입니다. 잠시만 기다려 주세요!
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

      {/* Right Decoration: Vintage Gasoline Lantern */}
      <div className="hidden 2xl:flex absolute right-2 xl:right-4 top-12 flex-col items-center gap-4 z-20">
        <motion.div
          whileHover={{ scale: 1.03 }}
          onClick={() => setLanternOn(p => !p)}
          className="cursor-pointer flex flex-col items-center group"
          title="작동하는 클래식 가솔린 랜턴 (클릭시 점등)"
        >
          {/* Metal Wire loop on top */}
          <div className="w-12 h-10 border-4 border-stone-400 border-b-0 rounded-t-full -mb-1 group-hover:border-emerald-400 transition-colors" />

          {/* Lantern Top Hood */}
          <div className="w-16 h-4 bg-gradient-to-r from-emerald-700 via-[#8ba682] to-emerald-800 rounded-t-md shadow-md border-b border-stone-300" />

          {/* Glass Chamber with Flame */}
          <div className="w-12 h-20 bg-amber-500/10 border-x-2 border-amber-800/80 relative flex items-center justify-center overflow-hidden">
            {/* Glass Highlights */}
            <div className="absolute inset-y-0 left-1 w-2 bg-white/20 blur-[1px] pointer-events-none" />
            <div className="absolute inset-y-0 right-1.5 w-1 bg-white/10 blur-[1px] pointer-events-none" />

            {/* Protective metal cage lines */}
            <div className="absolute inset-y-0 left-1/4 w-0.5 bg-amber-800/50" />
            <div className="absolute inset-y-0 right-1/4 w-0.5 bg-amber-800/50" />
            <div className="absolute inset-x-0 top-1/3 h-0.5 bg-amber-800/50" />
            <div className="absolute inset-x-0 bottom-1/3 h-0.5 bg-amber-800/50" />

            {/* Flame */}
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
                  className="w-5 h-8 bg-gradient-to-t from-red-500 via-amber-400 to-yellow-100 rounded-full blur-[2px] shadow-[0_0_20px_10px_rgba(251,191,36,0.6)] flex items-center justify-center relative"
                >
                  <div className="w-2.5 h-4 bg-white rounded-full blur-[1px] absolute bottom-1" />
                </motion.div>
              )}
            </AnimatePresence>
            {!lanternOn && (
              <div className="w-1.5 h-3 bg-neutral-700 rounded-full absolute bottom-4" />
            )}
          </div>

          {/* Brass fuel body */}
          <div className="w-20 h-14 bg-gradient-to-b from-emerald-600 via-[#8ba682] to-emerald-700 rounded-b-xl shadow-md flex flex-col items-center justify-start py-2 border-t border-emerald-800/20">
            {/* Control valve knob */}
            <div className="w-4 h-4 rounded-full bg-emerald-900 border border-emerald-400/50 cursor-pointer shadow-md -mt-1 group-hover:rotate-45 transition-transform duration-300" />
            <span className="font-mono text-[8px] text-emerald-100/60 mt-1 uppercase tracking-widest font-bold">Gasoline</span>
          </div>
          
          <span className="text-[10px] font-hand text-emerald-600 mt-2 font-bold select-none group-hover:text-emerald-500 transition-colors">
            {lanternOn ? '💡 click to turn OFF' : '🔥 click to turn ON'}
          </span>
        </motion.div>

        {/* Small tin mug decoration */}
        <div className="w-20 h-16 bg-gradient-to-r from-rose-200 to-rose-100 border border-rose-300 rounded-b-lg relative mt-8 shadow-md" title="달콤한 코코아가 들어있는 핑크 캠핑 머그">
          {/* Mug handle */}
          <div className="absolute right-0 top-3 -mr-3 w-4 h-9 border-4 border-l-0 border-rose-300 rounded-r-lg" />
          {/* Coffee line */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-[#5c3a21] rounded-t-sm" />
          <div className="absolute inset-0 flex flex-col items-center justify-end p-1 text-[8px] font-mono text-rose-500/80 font-bold">
            <span>DEER CAMP</span>
          </div>
          {/* Floating Steam lines */}
          <div className="absolute -top-6 left-6 w-8 h-6 flex gap-1 pointer-events-none overflow-hidden">
            <motion.div
              animate={{ y: [0, -10, 0], opacity: [0, 0.8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="w-0.5 h-4 bg-white/60 rounded-full"
            />
            <motion.div
              animate={{ y: [0, -12, 0], opacity: [0, 0.7, 0] }}
              transition={{ repeat: Infinity, duration: 2.3, delay: 0.4, ease: 'easeInOut' }}
              className="w-0.5 h-4 bg-white/60 rounded-full"
            />
            <motion.div
              animate={{ y: [0, -8, 0], opacity: [0, 0.6, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, delay: 0.8, ease: 'easeInOut' }}
              className="w-0.5 h-4 bg-white/60 rounded-full"
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
        <div className="p-2 md:p-6 bg-[#f4f7f3] w-full h-full flex flex-col flex-1 min-h-0 gap-3 md:gap-6 text-stone-800 border border-[#cbd5c8] overflow-hidden">
          
          {/* 1. APPLET TITLE BAR */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b-2 border-[#cbd5c8] shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#5aa880] text-white shadow-sm border border-[#488e6a]">
                <Tent className="w-7 h-7" />
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
            <div className="flex items-center gap-3 bg-white/90 px-4 py-2 rounded-xl border border-[#cbd5c8] text-xs text-stone-600 shadow-sm">
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
            <h2 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3 font-mono flex items-center gap-1.5">
              <span>카테고리 요약 정보</span>
              <span className="h-px bg-stone-200 flex-1"></span>
              <span className="text-[10px] text-emerald-700 font-bold lowercase"></span>
            </h2>

            <div className="flex overflow-x-auto pb-2 snap-x md:grid md:grid-cols-4 xl:grid-cols-7 gap-3">
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
                    <div className={`border border-dashed border-white m-[2px] rounded-lg p-3.5 flex flex-col justify-between h-24 bg-gradient-to-br ${theme.bg} ${theme.border} shadow-inner relative`}>
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
                      <div className="mt-2 text-left">
                        <p className="font-sans text-[10px] text-stone-500 font-bold tracking-tight leading-none mb-1">
                          {sum.label}
                        </p>
                        <p className={`font-hand text-xl font-black ${theme.countText} leading-none`}>
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
          </div>

          {/* ============================================================== */}
          {/* TOOLBAR: SEARCH & FILTERS AND MANAGEMENT BUTTONS */}
          {/* ============================================================== */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-3.5 bg-white/95 border border-[#cbd5c8] rounded-2xl shadow-sm shrink-0">
            
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
                onClick={handleLetsGo}
                className="group relative cursor-pointer flex items-center gap-1.5 px-4 py-2 bg-[#a78bfa] hover:bg-[#8b5cf6] border border-[#7c3aed] active:scale-95 transition-all text-white rounded-full shadow-sm mr-2"
                title="선택된 장비 패킹 리스트 보기"
              >
                <CarFront className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold font-sans tracking-tight">Let's Go!</span>
              </button>

              {/* 신규등록 */}
              <button
                onClick={handleAddNew}
                className="group relative cursor-pointer flex items-center gap-1.5 px-4 py-2 bg-[#5aa880] hover:bg-[#4d9670] border border-[#4a8f6a] active:scale-95 transition-all text-white rounded-full shadow-sm"
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
            <div className="px-5 py-3 bg-[#f8faf7] border-b border-[#cbd5c8] text-xs flex justify-between items-center flex-wrap gap-2 text-stone-600 shrink-0">
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
                <span>총 자산: <strong className="text-stone-950 font-black">₩{stats.totalPrice}</strong></span>
              </div>
            </div>

            {/* Desktop Table Wrapper */}
            <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
              <table className="w-full text-left border-collapse min-w-[800px]">
                
                {/* Table Header - Clean Sage Ivory look */}
                <thead>
                  <tr className="bg-[#eef3ec] text-[#4a6648] text-xs font-bold uppercase tracking-wider font-sans border-b border-[#cbd5c8] sticky top-0 z-10 shadow-sm">
                    <th className="py-3.5 px-4 w-12 text-center">
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
                    <th className="py-3.5 px-4 w-36 text-center whitespace-nowrap">카테고리</th>
                    <th className="py-3.5 px-4 min-w-[280px]">물품명</th>
                    <th className="py-3.5 px-4 w-40">브랜드/제조사</th>
                    <th className="py-3.5 px-4 min-w-[200px]">규격/모델명</th>
                    <th className="py-3.5 px-4 w-20 text-center">수량</th>
                    <th className="py-3.5 px-4 w-24 text-center">중량(kg)</th>
                    <th className="py-3.5 px-4 w-36 text-right">구입금액(₩)</th>
                    <th className="py-3.5 px-4 w-32 text-center">상태</th>
                    <th className="py-3.5 px-4 w-20 text-center">관리</th>
                  </tr>
                </thead>

                {/* Table Body - Bright ivory-tinted bg */}
                <tbody className="bg-white text-stone-900 divide-y divide-stone-100">
                  {filteredGear.length > 0 ? (
                    filteredGear.map((item) => {
                      const isSelected = selectedIds.includes(item.id);
                      
                      const getBadgeStyle = (cat: string) => {
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

                      return (
                        <tr
                          key={item.id}
                          className={`group hover:bg-[#f4fcf8]/60 transition-colors duration-150 relative ${
                            isSelected ? 'bg-[#ebf5ed]/80' : 'even:bg-[#fafdfa]'
                          }`}
                        >
                          {/* Selection Checkbox */}
                          <td className="py-3 px-4 text-center">
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
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border shadow-sm whitespace-nowrap ${getBadgeStyle(item.category)}`}>
                              {renderCategoryIcon(item.category, "w-3.5 h-3.5")}
                              {categoryLabels[item.category]}
                            </span>
                          </td>

                          {/* Item Name */}
                          <td className="py-3 px-4">
                            <span className="font-sans font-extrabold text-[13px] text-stone-900 whitespace-pre-wrap leading-tight block">
                              {item.name}
                            </span>
                          </td>

                          {/* Brand */}
                          <td className="py-3 px-4 font-sans text-xs font-semibold text-stone-600">
                            {item.brand}
                          </td>

                          {/* Specs */}
                          <td className="py-3 px-4 font-mono text-[11px] text-stone-500 whitespace-pre-wrap leading-tight">
                            {item.model}
                          </td>

                          {/* Quantity */}
                          <td className="py-3 px-4 text-center font-mono text-xs font-bold text-stone-900">
                            {item.quantity}
                          </td>

                          {/* Weight */}
                          <td className="py-3 px-4 text-center font-mono text-xs text-stone-500">
                            {item.weight > 0 ? `${item.weight.toFixed(1)}kg` : '0.0kg'}
                          </td>

                          {/* Price */}
                          <td className="py-3 px-4 text-right font-mono text-xs font-bold text-stone-900">
                            ₩{item.price.toLocaleString()}
                          </td>

                          {/* Status - Soft Pastel glowing pills */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center">
                              {item.status === '보유' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#ebf5ed] text-emerald-700 border border-emerald-300 shadow-sm relative">
                                  <Tent className="w-3.5 h-3.5 text-emerald-600" />
                                  보유
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5" />
                                </span>
                              )}
                              {item.status === '매각' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#fbf4eb] text-amber-700 border border-amber-300 shadow-sm">
                                  <Coins className="w-3 h-3 text-amber-600" />
                                  매각
                                </span>
                              )}
                              {item.status === '폐기' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#fdf0f1] text-rose-700 border border-rose-300 shadow-sm">
                                  <X className="w-3 h-3 text-rose-500" />
                                  폐기
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Manage Column - Edit & Delete Buttons */}
                          <td className="py-3 px-4 text-center">
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

            {/* List Footer / Table Controls */}
            <div className="p-3 bg-khaki-900 border-t border-khaki-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-khaki-400 shrink-0">
              <p className="font-sans">
                현재 대장에 등록된 품목수: <strong className="text-white">{filteredGear.length}</strong> / 전체 <strong className="text-white">{gearList.length}</strong>개
              </p>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetDefault}
                  className="px-2.5 py-1 bg-khaki-800 hover:bg-khaki-700 border border-khaki-700 text-khaki-300 hover:text-white rounded-lg transition-colors text-[11px]"
                  title="기본 장비 데이터로 초기화"
                >
                  기본값 복구
                </button>
                
                {selectedIds.length > 0 && (
                  <button
                    onClick={() => setSelectedIds([])}
                    className="px-2.5 py-1 bg-khaki-800 hover:bg-khaki-700 border border-khaki-700 text-tan-300 rounded-lg transition-colors text-[11px]"
                  >
                    선택 해제 ({selectedIds.length})
                  </button>
                )}
              </div>
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
