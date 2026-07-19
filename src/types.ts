/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GearCategory = 'tent' | 'bedding' | 'furniture' | 'lighting' | 'cooking' | 'seasonal' | 'etc';

export interface GearItem {
  id: string;
  name: string;          // 물품명
  brand: string;         // 브랜드/제조사
  model: string;         // 규격/모델명
  quantity: number;      // 수량
  weight: number;        // 중량(kg)
  price: number;         // 구입금액(₩)
  status: '보유' | '폐기' | '매각'; // 상태
  category: GearCategory; // 카테고리
}

export interface CategorySummary {
  id: GearCategory;
  name: string;
  label: string;
  iconName: 'tent' | 'bedding' | 'furniture' | 'lighting' | 'cooking' | 'seasonal' | 'etc';
  countText: string;
  totalQuantity: number;
}
