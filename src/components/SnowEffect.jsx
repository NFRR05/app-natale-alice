import React from 'react'

export default function SnowEffect() {
  return (
    <div className="snow-container fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="snowflake"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${10 + Math.random() * 10}s`,
            fontSize: `${10 + Math.random() * 10}px`,
            opacity: 0.7 + Math.random() * 0.3,
          }}
        >
          ❄
        </div>
      ))}
    </div>
  )
}


