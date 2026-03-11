import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { Button } from '../components/Button'
import { useWalletStore } from '../store/walletStore'
import {
  METAYOSHI_PRIVACY_URL,
  METAYOSHI_SUPPORT_EMAIL,
  WALLET_TERMS_LAST_UPDATED_LABEL,
  WALLET_TERMS_VERSION
} from '../lib/legalMetadata'

type TermSection = {
  id: string
  title: string
  body: React.ReactNode
}

const SECTIONS: TermSection[] = [
  {
    id: 'scope',
    title: '1. Scope of Services',
    body: (
      <p>
        These terms cover the MetaYoshi wallet extension, wallet downloads, the MetaYoshi website, and related
        bridge-backed or API-backed wallet services made available under the MetaYoshi product.
      </p>
    ),
  },
  {
    id: 'services',
    title: '2. Wallet and Network Services',
    body: (
      <p>
        MetaYoshi provides wallet software and supporting infrastructure that helps you interact with multiple
        blockchain networks. Network access can rely on third-party nodes, RPC providers, explorers, bridge services,
        or relays.
      </p>
    ),
  },
  {
    id: 'custody',
    title: '3. Keys and Custody Model',
    body: (
      <div className="space-y-2">
        <p>You are responsible for your private keys, seed phrase, password, and signing environment.</p>
        <p>
          MetaYoshi is designed around user-controlled signing, but some network or asset workflows can rely on
          server-assisted, bridge-assisted, or relay infrastructure. You must review the active network and transaction
          path before using it.
        </p>
        <p>MetaYoshi cannot recover a wallet if your recovery data is lost.</p>
      </div>
    ),
  },
  {
    id: 'responsibility',
    title: '4. Your Responsibilities',
    body: (
      <div className="space-y-2">
        <p>
          You are responsible for verifying addresses, amounts, network selection, fees, prompts, and transaction or
          signature details before approving.
        </p>
        <p>
          Blockchain transactions are often irreversible. Mistakes, phishing, malware, or compromised devices can lead
          to permanent loss of assets or data.
        </p>
      </div>
    ),
  },
  {
    id: 'security',
    title: '5. Device and Account Security',
    body: (
      <p>
        You are responsible for device security, browser profile security, password strength, software updates, and
        controlling physical access to the device you use with MetaYoshi.
      </p>
    ),
  },
  {
    id: 'compliance',
    title: '6. Eligibility and Compliance',
    body: (
      <p>
        You are responsible for ensuring your use is lawful in your jurisdiction, including sanctions, tax, reporting,
        consumer, and local regulatory obligations.
      </p>
    ),
  },
  {
    id: 'acceptable-use',
    title: '7. Acceptable Use',
    body: (
      <div className="space-y-2">
        <p>You agree not to misuse MetaYoshi or related services, including by:</p>
        <ul className="list-disc pl-5 space-y-1 text-gray-300">
          <li>attempting to bypass security, rate limits, or access controls</li>
          <li>probing, scanning, or exploiting systems, dependencies, or infrastructure</li>
          <li>using the services for fraud, theft, malware, or other unlawful activity</li>
          <li>overloading endpoints with excessive automated requests</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'third-parties',
    title: '8. Third-Party Services',
    body: (
      <p>
        MetaYoshi can interact with third-party blockchain networks, validators, RPC providers, nodes, explorers, and
        protocols. Those third parties are not controlled by MetaYoshi and can have their own terms, privacy policies,
        fees, and availability limits.
      </p>
    ),
  },
  {
    id: 'no-advice',
    title: '9. No Professional Advice',
    body: (
      <p>
        MetaYoshi does not provide financial, legal, tax, investment, or accounting advice. Decisions to use digital
        assets, protocols, or networks remain your own.
      </p>
    ),
  },
  {
    id: 'availability',
    title: '10. Availability and Changes',
    body: (
      <p>
        MetaYoshi can change, suspend, or discontinue features, networks, endpoints, or integrations. No chain,
        feature, bridge route, or service endpoint is guaranteed to remain available indefinitely.
      </p>
    ),
  },
  {
    id: 'disclaimers',
    title: '11. Disclaimers',
    body: (
      <p>
        MetaYoshi is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind.
        Blockchain software and related infrastructure involve risk, including risk of loss due to user error, software
        defects, bridge failures, network conditions, or third-party actions.
      </p>
    ),
  },
  {
    id: 'liability',
    title: '12. Limitation of Liability',
    body: (
      <p>
        To the maximum extent permitted by law, MetaYoshi is not liable for indirect, incidental, special,
        consequential, or punitive damages, or for loss of profits, data, or digital assets arising out of or related
        to your use of MetaYoshi.
      </p>
    ),
  },
  {
    id: 'privacy',
    title: '13. Privacy and Data Handling',
    body: (
      <p>
        Privacy details for the MetaYoshi website, wallet extension, and related bridge/API services are published at{' '}
        <code>{METAYOSHI_PRIVACY_URL}</code>.
      </p>
    ),
  },
  {
    id: 'contact',
    title: '14. Contact',
    body: (
      <p>
        Questions about these terms can be sent to <code>{METAYOSHI_SUPPORT_EMAIL}</code>.
      </p>
    ),
  },
]

type TermsRouteState = {
  returnTo?: string
} | null

const TermsAndRules: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { acceptedTermsVersion, acceptTerms, isInitialized, hasVault, isLocked } = useWalletStore()
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null)

  const routeState = (location.state as TermsRouteState) || null
  const returnTo = typeof routeState?.returnTo === 'string' && routeState.returnTo.startsWith('/')
    ? routeState.returnTo
    : null
  const needsAcceptance = isInitialized && hasVault && !isLocked && acceptedTermsVersion !== WALLET_TERMS_VERSION
  const currentVersionLabel = useMemo(
    () => `Version ${WALLET_TERMS_VERSION}`,
    []
  )

  const toggleSection = (sectionId: string) => {
    setExpandedSectionId((current) => (current === sectionId ? null : sectionId))
  }

  const handleAcceptAndContinue = () => {
    acceptTerms(WALLET_TERMS_VERSION)
    navigate(returnTo || '/welcome', { replace: true })
  }

  const handleBack = () => {
    if (returnTo) {
      navigate(returnTo, { replace: true })
      return
    }
    navigate(-1)
  }

  return (
    <PageTransition>
      <div className="flex flex-col h-full p-6 bg-dark-800 text-left overflow-y-auto hide-scrollbar">
        <div className="space-y-2 mb-5">
          <h1 className="text-xl font-black uppercase tracking-tight text-white">MetaYoshi Wallet Terms</h1>
          <p className="text-xs text-gray-400">
            Last updated: {WALLET_TERMS_LAST_UPDATED_LABEL}
          </p>
          <p className="text-[11px] text-gray-500">{currentVersionLabel}</p>
          <p className="text-xs leading-relaxed text-gray-400">
            These terms cover the wallet extension, downloads, MetaYoshi web properties, and related bridge or API
            services used by the wallet.
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
                    <div className="space-y-2">{section.body}</div>
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <div className="mt-6 space-y-2">
          {needsAcceptance ? (
            <Button className="w-full btn-primary" onClick={handleAcceptAndContinue}>
              Accept And Continue
            </Button>
          ) : null}
          <Button variant="outline" className="w-full" onClick={handleBack}>
            {needsAcceptance ? 'Review Later' : 'Back'}
          </Button>
        </div>
      </div>
    </PageTransition>
  )
}

export default TermsAndRules
