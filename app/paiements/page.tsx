'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

type PaiementItem = {
  id: string
  montant: number
  reference_paiement?: string
  date_paiement?: string
  created_at?: string
  type_frais?: string
  whatsapp_parent?: string
  eleve_nom?: string
  eleve_prenom?: string
  source: 'paiements' | 'versements'
}

export default function Paiements() {
  const router = useRouter()
  const [liste, setListe] = useState<PaiementItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        router.push('/')
        return
      }
      chargerTousPaiements()
    }
    init()
  }, [])

  async function chargerTousPaiements() {
    setLoading(true)

    // 1. Lire table paiements
    const { data: pData } = await supabase
      .from('paiements')
      .select('*, eleves(nom, prenom)')
      .order('created_at', { ascending: false })

    // 2. Lire table versements
    const { data: vData } = await supabase
      .from('versements')
      .select('*, eleves(nom, prenom)')
      .order('created_at', { ascending: false })

    const listP: PaiementItem[] = (pData || []).map((p: any) => ({
      id: 'p_' + p.id,
      montant: Number(p.montant) || 0,
      reference_paiement: p.reference_paiement || '',
      date_paiement: p.date_paiement || p.created_at,
      created_at: p.created_at || p.date_paiement,
      type_frais: p.type_frais || 'Paiement Scolarité',
      whatsapp_parent: p.whatsapp_parent || '',
      eleve_nom: p.eleves?.nom || 'Inconnu',
      eleve_prenom: p.eleves?.prenom || '',
      source: 'paiements',
    }))

    const listV: PaiementItem[] = (vData || []).map((v: any) => ({
      id: 'v_' + v.id,
      montant: Number(v.montant) || 0,
      reference_paiement: v.reference_paiement || '',
      date_paiement: v.date_paiement || v.created_at,
      created_at: v.created_at || v.date_paiement,
      type_frais: 'Versement par Tranche',
      whatsapp_parent: v.whatsapp_parent || '',
      eleve_nom: v.eleves?.nom || 'Inconnu',
      eleve_prenom: v.eleves?.prenom || '',
      source: 'versements',
    }))

    // Combiner et trier par date décroissante
    const combine = [...listP, ...listV].sort((a, b) => {
      const tA = new Date(a.created_at || a.date_paiement || 0).getTime()
      const tB = new Date(b.created_at || b.date_paiement || 0).getTime()
      return tB - tA
    })

    setListe(combine)
    setLoading(false)
  }

  function formaterFCFA(montant: number) {
    return montant.toLocaleString('fr-FR') + ' FCFA'
  }

  function formaterDate(date?: string) {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const totalEncaisse = liste.reduce((sum, item) => sum + item.montant, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-gray-700">
            ← Retour
          </button>
          <div>
            <h1 className="font-bold text-gray-800">Historique des Paiements</h1>
            <p className="text-xs text-gray-500">Tous les flux encaissés</p>
          </div>
        </div>
        <button
          onClick={chargerTousPaiements}
          className="text-blue-600 text-sm font-medium hover:text-blue-800"
        >
          🔄 Actualiser
        </button>
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        {/* Total encaissé */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 flex justify-between items-center">
          <div>
            <p className="text-gray-500 text-sm">Total global encaissé</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{formaterFCFA(totalEncaisse)}</p>
          </div>
          <span className="text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded-xl font-semibold">
            {liste.length} transaction(s)
          </span>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Chargement des paiements...</div>
        ) : liste.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <div className="text-5xl mb-4">💰</div>
            <p className="text-gray-500">Aucun paiement trouvé</p>
            <p className="text-gray-400 text-sm mt-1">Les règlements validés s'afficheront ici</p>
          </div>
        ) : (
          <div className="space-y-3">
            {liste.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-800">{item.eleve_prenom} {item.eleve_nom}</p>
                  <p className="text-xs text-blue-600 font-medium mt-0.5">{item.type_frais}</p>
                  {item.whatsapp_parent && (
                    <p className="text-xs text-gray-400 mt-1">📱 {item.whatsapp_parent}</p>
                  )}
                  {item.reference_paiement && (
                    <p className="text-xs text-gray-500 font-mono mt-0.5">Réf: {item.reference_paiement}</p>
                  )}
                  <p className="text-xs text-gray-300 mt-1">{formaterDate(item.created_at || item.date_paiement)}</p>
                </div>

                <div className="text-right">
                  <p className="font-bold text-green-600 text-xl">+{formaterFCFA(item.montant)}</p>
                  <span className="text-xs bg-green-50 text-green-600 px-3 py-1 rounded-xl font-medium inline-block mt-2">
                    ✅ Payé
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}