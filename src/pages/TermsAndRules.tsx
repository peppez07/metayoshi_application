import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { Button } from '../components/Button'

type RuleSection = {
  id: string
  title: string
  body: string
}

const SECTIONS: RuleSection[] = [
  {
    id: 'non-custodial',
    title: '1. Non-Custodial Wallet',
    body: 'MetaYoshi is a non-custodial wallet. You control your private keys and recovery phrase at all times. We cannot access, recover, reset, or reverse your wallet data.',
  },
  {
    id: 'recovery-phrase',
    title: '2. Recovery Phrase Responsibility',
    body: 'You are solely responsible for safely storing your recovery phrase and private keys. If they are lost, forgotten, or exposed, your funds may become permanently inaccessible or compromised.',
  },
  {
    id: 'liability',
    title: '3. No Liability For Losses',
    body: 'MetaYoshi is provided as-is. To the maximum extent allowed by law, MetaYoshi is not liable for any direct, indirect, incidental, or consequential damages, including loss of funds, data, business, or opportunities resulting from wallet usage, software defects, user mistakes, or third-party actions.',
  },
  {
    id: 'finality',
    title: '4. Transaction Finality',
    body: 'Blockchain transactions are generally irreversible. You must verify recipient addresses, amounts, and network details before approving a transaction or signature.',
  },
  {
    id: 'device-security',
    title: '5. Security Of Your Device',
    body: 'You are responsible for device security, including malware protection, password strength, and physical access. Unauthorized access to your device may result in loss of assets.',
  },
  {
    id: 'legal-compliance',
    title: '6. Legal And Compliance Duties',
    body: 'You confirm you are legally allowed to use this wallet in your jurisdiction and are responsible for all legal, tax, sanctions, and regulatory compliance obligations related to your activity.',
  },
  {
    id: 'advice',
    title: '7. No Professional Advice',
    body: 'MetaYoshi does not provide financial, legal, tax, or investment advice. Any decision to use assets, protocols, or networks is entirely your own.',
  },
]

const TermsAndRules: React.FC = () => {
  const navigate = useNavigate()
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null)

  const toggleSection = (sectionId: string) => {
    setExpandedSectionId((current) => (current === sectionId ? null : sectionId))
  }

  return (
    <PageTransition>
      <div className="flex flex-col h-full p-6 bg-dark-800 text-left overflow-y-auto hide-scrollbar">
        <div className="space-y-2 mb-5">
          <h1 className="text-xl font-black uppercase tracking-tight text-white">Terms And Rules</h1>
          <p className="text-xs text-gray-400">
            Effective date: February 23, 2026
          </p>
        </div>

        <div className="space-y-2 text-[12px] leading-relaxed">
          {SECTIONS.map((section) => {
            const isExpanded = expandedSectionId === section.id
            return (
              <section key={section.id} className="rounded-lg border border-dark-600 bg-dark-700/40">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left flex items-center justify-between gap-3"
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`section-content-${section.id}`}
                >
                  <h2 className="text-xs font-bold uppercase tracking-widest text-gray-300">{section.title}</h2>
                  <span className="text-[11px] text-gray-400">{isExpanded ? '-' : '+'}</span>
                </button>
                {isExpanded && (
                  <div id={`section-content-${section.id}`} className="px-3 pb-3 text-gray-300">
                    <p>{section.body}</p>
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <div className="mt-6">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
        </div>
      </div>
    </PageTransition>
  )
}

export default TermsAndRules
