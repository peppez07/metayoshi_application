import React from 'react'
import { clsx } from 'clsx'

interface Tab {
  id: string
  label: string
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (id: string) => void
  className?: string
}

/** Segmented control. */
export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => (
  <div role="tablist" className={clsx('flex gap-1 p-1 mx-4 rounded-2xl bg-dark-750 border border-white/[0.05] shrink-0', className)}>
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        role="tab"
        aria-selected={activeTab === tab.id}
        className={clsx('tab-item', activeTab === tab.id ? 'tab-active' : 'tab-inactive')}
        onClick={() => onChange(tab.id)}
      >
        {tab.label}
      </button>
    ))}
  </div>
)
