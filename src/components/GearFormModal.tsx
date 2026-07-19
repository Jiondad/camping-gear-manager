/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Tent, Bed, Flame, Lightbulb, Package, Save, RotateCcw } from 'lucide-react';
import { GearItem, GearCategory } from '../types';

interface GearFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<GearItem, 'id'> & { id?: string }) => void;
  editItem?: GearItem | null;
}

export default function GearFormModal({ isOpen, onClose, onSave, editItem }: GearFormModalProps) {
  const [category, setCategory] = useState<GearCategory>('tent');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [weight, setWeight] = useState<number>(0);
  const [price, setPrice] = useState<number>(0);
  const [status, setStatus] = useState<'보유' | '폐기' | '매각'>('보유');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editItem) {
      setCategory(editItem.category);
      setName(editItem.name);
      setBrand(editItem.brand);
      setModel(editItem.model);
      setQuantity(editItem.quantity);
      setWeight(editItem.weight);
      setPrice(editItem.price);
      setStatus(editItem.status);
    } else {
      // Reset form
      setCategory('tent');
      setName('');
      setBrand('');
      setModel('');
      setQuantity(0);
      setWeight(0);
      setPrice(0);
      setStatus('보유');
    }
    setError('');
  }, [editItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('물품명을 입력해주세요.');
      return;
    }
    if (!brand.trim()) {
      setError('브랜드/제조사를 입력해주세요.');
      return;
    }
    if (quantity < 0) {
      setError('수량은 0개 이상이어야 합니다.');
      return;
    }
    if (weight < 0) {
      setError('중량은 0kg 이상이어야 합니다.');
      return;
    }
    if (price < 0) {
      setError('구입금액은 0원 이상이어야 합니다.');
      return;
    }

    onSave({
      id: editItem?.id,
      name: name.trim(),
      brand: brand.trim(),
      model: model.trim() || 'N/A',
      quantity,
      weight,
      price,
      status,
      category,
    });
    onClose();
  };

  const categoryOptions: { value: GearCategory; label: string; icon: React.ReactNode }[] = [
    { value: 'tent', label: '텐트/타프', icon: <Tent className="w-4 h-4" /> },
    { value: 'bedding', label: '침구류', icon: <Bed className="w-4 h-4" /> },
    { value: 'cooking', label: '취사도구', icon: <Flame className="w-4 h-4" /> },
    { value: 'lighting', label: '랜턴/조명', icon: <Lightbulb className="w-4 h-4" /> },
    { value: 'etc', label: '소품/기타', icon: <Package className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-lg overflow-hidden border-2 border-[#cbd5c8] rounded-2xl bg-[#f4f7f3] shadow-2xl text-stone-800"
      >
        {/* Header - Sage Ivory look */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#eef3ec] border-b border-[#cbd5c8] text-[#4a6648]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#5aa880] animate-pulse"></span>
            <h3 className="font-sans font-black text-lg tracking-tight">
              {editItem ? '🏕️ 캠핑장비 정보 수정' : '🏕️ 신규 캠핑장비 등록'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white border border-[#cbd5c8] text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-950 bg-red-50 rounded-lg border border-red-200 font-bold">
              ⚠️ {error}
            </div>
          )}

          {/* Category Select */}
          <div>
            <label className="block text-xs font-black text-[#4a6648] uppercase tracking-wider mb-2 font-mono">
              Category / 장비 카테고리
            </label>
            <div className="grid grid-cols-5 gap-1">
              {categoryOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategory(opt.value)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                    category === opt.value
                      ? 'bg-[#5aa880] text-white border-[#4a8f6a] shadow-sm font-bold'
                      : 'bg-white text-stone-600 border-[#cbd5c8] hover:bg-[#eef3ec]'
                  }`}
                >
                  {opt.icon}
                  <span className="text-[10px] mt-1 font-sans">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Name & Brand */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-[#4a6648] uppercase tracking-wider mb-1 font-mono">
                Brand / 브랜드·제조사
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="예: 코베아, 콜맨, 스노우피크"
                className="w-full px-3 py-2 bg-white border border-[#cbd5c8] rounded-lg focus:outline-none focus:border-[#5aa880] focus:ring-2 focus:ring-[#5aa880]/20 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-[#4a6648] uppercase tracking-wider mb-1 font-mono">
                Gear Name / 물품명
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 고스트 플러스 거실형 텐트"
                className="w-full px-3 py-2 bg-white border border-[#cbd5c8] rounded-lg focus:outline-none focus:border-[#5aa880] focus:ring-2 focus:ring-[#5aa880]/20 text-sm"
              />
            </div>
          </div>

          {/* Specs / Model */}
          <div>
            <label className="block text-xs font-black text-[#4a6648] uppercase tracking-wider mb-1 font-mono">
              Model & Specs / 규격·모델명
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="예: 630x315x205cm, 800g"
              className="w-full px-3 py-2 bg-white border border-[#cbd5c8] rounded-lg focus:outline-none focus:border-[#5aa880] focus:ring-2 focus:ring-[#5aa880]/20 text-sm"
            />
          </div>

          {/* Quantity, Weight, Price */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-black text-[#4a6648] uppercase tracking-tight mb-1 font-mono whitespace-nowrap">
                Quantity / 수량
              </label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-white border border-[#cbd5c8] rounded-lg focus:outline-none focus:border-[#5aa880] focus:ring-2 focus:ring-[#5aa880]/20 text-sm font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-[#4a6648] uppercase tracking-tight mb-1 font-mono whitespace-nowrap">
                Weight / 중량 (kg)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={weight}
                onChange={(e) => setWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-white border border-[#cbd5c8] rounded-lg focus:outline-none focus:border-[#5aa880] focus:ring-2 focus:ring-[#5aa880]/20 text-sm font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-[#4a6648] uppercase tracking-tight mb-1 font-mono whitespace-nowrap">
                Price / 구입금액(₩)
              </label>
              <input
                type="number"
                step="100"
                min="0"
                value={price}
                onChange={(e) => setPrice(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-white border border-[#cbd5c8] rounded-lg focus:outline-none focus:border-[#5aa880] focus:ring-2 focus:ring-[#5aa880]/20 text-sm font-mono text-right"
              />
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-black text-[#4a6648] uppercase tracking-wider mb-2 font-mono">
              Status / 상태
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['보유', '매각', '폐기'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`py-2 px-3 rounded-lg border text-sm font-bold text-center transition-all ${
                    status === s
                      ? s === '보유'
                        ? 'bg-[#5aa880] text-white border-[#4a8f6a] shadow-sm'
                        : s === '매각'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-rose-500 text-white border-rose-600 shadow-sm'
                      : 'bg-white text-stone-600 border-[#cbd5c8] hover:bg-stone-50'
                  }`}
                >
                  {s === '보유' && '🏕️ 보유'}
                  {s === '매각' && '🪙 매각'}
                  {s === '폐기' && '🗑️ 폐기'}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-stone-700 bg-white border border-[#cbd5c8] rounded-lg hover:bg-stone-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex items-center gap-1 px-5 py-2 text-sm font-bold text-white bg-[#5aa880] hover:bg-[#4d9670] rounded-lg shadow-sm transition-colors border border-[#4a8f6a]"
            >
              <Save className="w-4 h-4" />
              저장하기
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
