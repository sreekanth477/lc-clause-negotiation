import React from 'react'
import { SessionStatus } from '@lc-copilot/shared'

interface StatusIndicatorProps {
  status: SessionStatus
}

const config: Record<SessionStatus, { label: string; classes: string }> = {
  [SessionStatus.PARSING]: {
    label: 'Parsing',
    classes: 'bg-blue-100 text-blue-700 border border-blue-300',
  },
  [SessionStatus.IN_REVIEW]: {
    label: 'In Review',
    classes: 'bg-indigo-100 text-indigo-700 border border-indigo-300',
  },
  [SessionStatus.ESCALATED]: {
    label: 'Escalated',
    classes: 'bg-orange-100 text-orange-700 border border-orange-300',
  },
  [SessionStatus.COMPLETED]: {
    label: 'Completed',
    classes: 'bg-green-100 text-green-700 border border-green-300',
  },
  [SessionStatus.CANCELLED]: {
    label: 'Cancelled',
    classes: 'bg-gray-100 text-gray-500 border border-gray-300',
  },
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const { label, classes } = config[status] ?? {
    label: status,
    classes: 'bg-gray-100 text-gray-600 border border-gray-300',
  }
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${classes}`}>
      {label}
    </span>
  )
}
