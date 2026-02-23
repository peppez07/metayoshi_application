import React from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { Button } from '../components/Button'

const TermsAndRules: React.FC = () => {
  const navigate = useNavigate()

  return (
    <PageTransition>
      <div className="flex flex-col h-full p-6 bg-dark-800 text-left overflow-y-auto hide-scrollbar">
        <div className="space-y-2 mb-5">
          <h1 className="text-xl font-black uppercase tracking-tight text-white">Terms And Rules</h1>
          <p className="text-xs text-gray-400">
            Effective date: February 23, 2026
          </p>
        </div>

        <div className="space-y-4 text-[12px] leading-relaxed text-gray-300">
          <section className="space-y-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">1. Non-Custodial Wallet</h2>
            <p>
              MetaYoshi is a non-custodial wallet. You control your private keys and recovery phrase at all times.
              We cannot access, recover, reset, or reverse your wallet data.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">2. Recovery Phrase Responsibility</h2>
            <p>
              You are solely responsible for safely storing your recovery phrase and private keys. If they are lost,
              forgotten, or exposed, your funds may become permanently inaccessible or compromised.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">3. No Liability For Losses</h2>
            <p>
              MetaYoshi is provided as-is. To the maximum extent allowed by law, MetaYoshi is not liable for any
              direct, indirect, incidental, or consequential damages, including loss of funds, data, business, or
              opportunities resulting from wallet usage, software defects, user mistakes, or third-party actions.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">4. Transaction Finality</h2>
            <p>
              Blockchain transactions are generally irreversible. You must verify recipient addresses, amounts, and
              network details before approving a transaction or signature.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">5. Security Of Your Device</h2>
            <p>
              You are responsible for device security, including malware protection, password strength, and physical
              access. Unauthorized access to your device may result in loss of assets.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">6. Legal And Compliance Duties</h2>
            <p>
              You confirm you are legally allowed to use this wallet in your jurisdiction and are responsible for all
              legal, tax, sanctions, and regulatory compliance obligations related to your activity.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">7. No Professional Advice</h2>
            <p>
              MetaYoshi does not provide financial, legal, tax, or investment advice. Any decision to use assets,
              protocols, or networks is entirely your own.
            </p>
          </section>
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
