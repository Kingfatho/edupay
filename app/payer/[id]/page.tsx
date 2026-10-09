export const instant = false

import PagePaiementClient from './client'
import { Suspense } from 'react'

export default function PagePaiement() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    }>
      <PagePaiementClient />
    </Suspense>
  )
}