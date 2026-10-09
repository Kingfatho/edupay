'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

type Versement = {
  id: string
  montant: number
  reference_paiement: string
  date_paiement: string
  whatsapp_parent: string
  created_at: string
  eleves: { nom: string; prenom: string }
}

export default function Paiements() {
  const router = useRouter()
  const [versements, setVersements] = useState<Versement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        router.push('/')
        return
      }
      chargerVersements()
    }
    init()
  }, [])

  async function chargerVersements() {
    const { data } = await supabase
      .from('versements')
      .select('*, eleves(nom, prenom)')
      .order('created_at', { ascending: false })
    setVersements(data || [])
    setLoading(false)
  }

  function formaterFCFA(montant: number) {
    return montant.toLocaleString('fr-FR') + ' FCFA'
  }

  function formaterDate(date: string) {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const totalEncaisse = versements.reduce((sum, v) => sum + v.montant, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-gray-700">
            ← Retour
          </button>
          <div>
            <h1 className="font-bold text-gray-800">Suivi des paiements</h1>
            <p className="text-xs text-gray-500">Versements en temps réel</p>
          </div>
        </div>
        <button
          onClick={chargerVersements}
          className="text-blue-600 text-sm font-medium hover:text-blue-800"
        >
          🔄 Actualiser
        </button>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
          <p className="text-gray-500 text-sm">Total global encaissé</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{formaterFCFA(totalEncaisse)}</p>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Chargement...</div>
        ) : versements.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">💰</div>
            <p className="text-gray-500">Aucun versement pour le moment</p>
            <p className="text-gray-400 text-sm mt-1">Les paiements des parents apparaîtront ici instantanément</p>
          </div>
        ) : (
          <div className="space-y-3">
            {versements.map((versement) => (
              <div key={versement.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-800">
                      {versement.eleves?.prenom} {versement.eleves?.nom}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">WhatsApp : {versement.whatsapp_parent}</p>
                    {versement.reference_paiement && (
                      <p className="text-xs text-blue-600 mt-1 font-medium">
                        Réf SMS : {versement.reference_paiement}
                      </p>
                    )}
                    <p className="text-xs text-gray-300 mt-1">{formaterDate(versement.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 text-lg">+{formaterFCFA(versement.montant)}</p>
                    <span className="text-xs px-3 py-1 rounded-xl font-medium mt-2 inline-block bg-green-50 text-green-600">
                      ✅ Validé
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}