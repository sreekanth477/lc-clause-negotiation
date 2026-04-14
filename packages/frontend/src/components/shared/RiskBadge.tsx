import React from 'react'
import { RiskLevel } from '@lc-copilot/shared'

interface RiskBadgeProps {
  riskLevel: RiskLevel
  size?: 'sm' | 'md' | 'lg'
}

const colorMap: Record<RiskLevel, string> = {
  [RiskLevel.HIGH]: 'bg-red-100 text-red-700 border border-red-300',
  [RiskLevel.MEDIUM]: 'bg-amber-100 text-amber-700 border border-amber-300',
  [RiskLevel.LOW]: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  [RiskLevel.COMPLIANT]: 'bg-green-100 text-green-700 border border-green-300',
}

const sizeMap = {
  sm: 'text-xs px-1.5 py-0.5 rounded',
  md: 'text-sm px-2 py-0.5 rounded-md',
  lg: 'text-base px-3 py-1 rounded-md',
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ riskLevel, size = 'md' }) => {
  return (
    <span className={`inline-flex items-center font-semibold uppercase tracking-wide ${colorMap[riskLevel]} ${sizeMap[size]}`}>
      {riskLevel}
    </span>
  )
}
