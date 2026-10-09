'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

type Paiement = {
  id: string
  type_frais: string
  montant: number
  statut: string
  reference_paiement: string
  date_paiement: string
  whatsapp_parent: string
  created_at: string
  eleves: { nom: string; prenom: string }
}

export default function Paiements() {
  const router = useRouter()
  const [paiements, setPaiements] = useState<Paiement[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('tous')

  useEffect(() => {
    async function init() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        router.push('/')
        return
      }
      chargerPaiements()
    }
    init()
  }, [])

  async function chargerPaiements() {
    const { data } = await supabase
      .from('paiements')
      .select('*, eleves(nom, prenom)')
      .order('created_at', { ascending: false })
    setPaiements(data || [])
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

  function statutStyle(statut: string) {
    switch (statut) {
      case 'paye': return 'bg-green-50 text-green-600'
      case 'en_cours': return 'bg-blue-50 text-blue-600'
      default: return 'bg-orange-50 text-orange-500'
    }
  }

  function statutLabel(statut: string) {
    switch (statut) {
      case 'paye': return '✅ Payé'
      case 'en_cours': return '🔵 En cours'
      default: return '⏳ En attente'
    }
  }

  const paiementsFiltres = paiements.filter(p => {
    if (filtre === 'tous') return true
    return p.statut === filtre
  })

  const totalPaye = paiements
    .filter(p => p.statut === 'paye')
    .reduce((sum, p) => sum + p.montant, 0)

  const totalAttente = paiements
    .filter(p => p.statut === 'en_attente')
    .reduce((sum, p) => sum + p.montant, 0)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-gray-700">
            ← Retour
          </button>
          <div>
            <h1 className="font-bold text-gray-800">Paiements</h1>
            <p className="text-xs text-gray-500">Suivi en temps réel</p>
          </div>
        </div>
        <button
          onClick={chargerPaiements}
          className="text-blue-600 text-sm font-medium hover:text-blue-800"
        >
          🔄 Actualiser
        </button>
      </div>

      <div className="p-6">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm">Total encaissé</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{formaterFCFA(totalPaye)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm">En attente</p>
            <p className="text-2xl font-bold text-orange-500 mt-1">{formaterFCFA(totalAttente)}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mb-6">
          {['tous', 'en_attente', 'en_cours', 'paye'].map((f) => (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filtre === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
              }`}
            >
              {f === 'tous' ? 'Tous' : statutLabel(f)}
            </button>
          ))}
        </div>

        {/* Liste */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Chargement...</div>
        ) : paiementsFiltres.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">💰</div>
            <p className="text-gray-500">Aucun paiement pour le moment</p>
            <p className="text-gray-400 text-sm mt-1">Les paiements apparaîtront ici en temps réel</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paiementsFiltres.map((paiement) => (
              <div key={paiement.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-800">
                      {paiement.eleves?.prenom} {paiement.eleves?.nom}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">{paiement.type_frais}</p>
                    <p className="text-xs text-gray-400 mt-1">{paiement.whatsapp_parent}</p>
                    {paiement.reference_paiement && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Réf: {paiement.reference_paiement}
                      </p>
                    )}
                    <p className="text-xs text-gray-300 mt-1">{formaterDate(paiement.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800 text-lg">{formaterFCFA(paiement.montant)}</p>
                    <span className={`text-xs px-3 py-1 rounded-xl font-medium mt-2 inline-block ${statutStyle(paiement.statut)}`}>
                      {statutLabel(paiement.statut)}
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