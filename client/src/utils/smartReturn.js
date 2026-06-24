/**
 * Get SmartReturn guidance status key and presentation details.
 * colorVar  — CSS variable reference e.g. var(--color-enter), for direct use in color/stroke/border
 * colorHex  — raw hex e.g. #3b82f6, for use when building rgba() or hex+opacity values
 */
export const getSmartReturnDetails = (tokensAhead, tokenStatus) => {
  if (tokenStatus === 'active') {
    return {
      statusKey: 'PLEASE_ENTER',
      colorVar: 'var(--color-enter)',
      colorHex: '#3b82f6',
      bgGlow: 'rgba(59, 130, 246, 0.15)',
      description: 'The doctor is ready to see you now. Please enter the consultation room.',
      icon: '🚪'
    };
  }

  if (tokenStatus === 'skipped') {
    return {
      statusKey: 'MISSED_TURN',
      colorVar: 'var(--color-skipped)',
      colorHex: '#8b5cf6',
      bgGlow: 'rgba(139, 92, 246, 0.15)',
      description: 'Your token was skipped because you were not available. Please contact reception immediately to rejoin.',
      icon: '⚠️'
    };
  }

  if (tokenStatus === 'completed') {
    return {
      statusKey: 'COMPLETED',
      colorVar: 'var(--color-safe)',
      colorHex: '#10b981',
      bgGlow: 'rgba(16, 185, 129, 0.15)',
      description: 'Your consultation is completed. Thank you for waiting!',
      icon: '✅'
    };
  }

  if (tokenStatus === 'cancelled') {
    return {
      statusKey: 'CANCELLED',
      colorVar: 'var(--color-cancelled)',
      colorHex: '#64748b',
      bgGlow: 'rgba(107, 114, 128, 0.15)',
      description: 'Your token has been cancelled. Please visit reception if this was a mistake.',
      icon: '❌'
    };
  }

  if (tokensAhead >= 5) {
    return {
      statusKey: 'SAFE_TO_LEAVE',
      colorVar: 'var(--color-safe)',
      colorHex: '#10b981',
      bgGlow: 'rgba(16, 185, 129, 0.12)',
      description: 'Safe to wait outside the clinic (e.g. nearby tea stall, pharmacy, or car). Just return when wait time is shorter.',
      icon: '☕'
    };
  }

  if (tokensAhead === 3 || tokensAhead === 4) {
    return {
      statusKey: 'STAY_NEARBY',
      colorVar: 'var(--color-nearby)',
      colorHex: '#eab308',
      bgGlow: 'rgba(234, 179, 8, 0.12)',
      description: 'Please stay nearby or wait in the waiting room. Your turn is approaching.',
      icon: '🪑'
    };
  }

  if (tokensAhead === 2) {
    return {
      statusKey: 'START_RETURNING',
      colorVar: 'var(--color-returning)',
      colorHex: '#f97316',
      bgGlow: 'rgba(249, 115, 22, 0.15)',
      description: 'Only 2 tokens ahead of you. If you stepped out, please start returning to the clinic immediately.',
      icon: '🏃'
    };
  }

  if (tokensAhead === 1) {
    return {
      statusKey: 'YOU_ARE_NEXT',
      colorVar: 'var(--color-next)',
      colorHex: '#ef4444',
      bgGlow: 'rgba(239, 68, 68, 0.15)',
      description: 'You are next in line. Please stand by the consultation door and be fully ready.',
      icon: '🔔'
    };
  }

  // tokensAhead === 0 and waiting, or unknown state
  return {
    statusKey: 'WAITING',
    colorVar: 'var(--text-secondary)',
    colorHex: '#8b9cc7',
    bgGlow: 'rgba(255, 255, 255, 0.03)',
    description: 'Waiting in queue. Keep tracking this live screen.',
    icon: '⏳'
  };
};
