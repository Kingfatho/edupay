'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

type EleveTranche = {
  eleve_id: string
  nom: string
  prenom: string
  whatsapp_parent1: string
  classe_nom: string
  tranche_nom: string
  reste_a_payer: number
  statut: string
}

export default function Envoyer() {
  const router = useRouter()
  const [eleves, setEleves] = useState<Record<string, EleveTranche[]>>({})
  const [loading, setLoading] = useState(true)
  const [envoi, setEnvoi] = useState<string[]>([])

  useEffect(() => {
    async function init() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        router.push('/')
        return
      }
      chargerElevesEtTranches()
    }
    init()
  }, [])

  async function chargerElevesEtTranches() {
    const { data } = await supabase
      .from('vue_tranches_eleves')
      .select('*')
      .order('ordre')

    if (data) {
      // Regrouper par élève
      const groupes = data.reduce((acc: Record<string, EleveTranche[]>, item: any) => {
        if (!acc[item.eleve_id]) acc[item.eleve_id] = []
        acc[item.eleve_id].push(item)
        return acc
      }, {})
      setEleves(groupes)
    }
    setLoading(false)
  }

  function genererLien(eleveId: string) {
    const base = window.location.origin
    return `${base}/payer/${eleveId}`
  }

  function genererMessage(listeTranches: EleveTranche[]) {
    const eleve = listeTranches[0]
    const lien = genererLien(eleve.eleve_id)
    
    // Prochaine tranche non soldée
    const trancheEnAttente = listeTranches.find(t => t.statut !== 'paye')
    const resteTotal = listeTranches.reduce((sum, t) => sum + t.reste_a_payer, 0)

    if (!trancheEnAttente) {
      return `Bonjour,\n\nNous vous informons que la scolarité de *${eleve.prenom} ${eleve.nom}* (${eleve.classe_nom}) est entièrement réglée.\n\nMerci pour votre confiance ! 🙏\n\n_EduPay — Paiements scolaires sécurisés 🇧🇯_`
    }

    return `Bonjour,\n\nCeci est un rappel pour le règlement de la scolarité de *${eleve.prenom} ${eleve.nom}* (${eleve.classe_nom}).\n\n📌 *${trancheEnAttente.tranche_nom}* : ${trancheEnAttente.reste_a_payer.toLocaleString('fr-FR')} FCFA\n💰 *Reste total à payer* : ${resteTotal.toLocaleString('fr-FR')} FCFA\n\n👉 Cliquez sur ce lien pour effectuer votre versement en toute sécurité :\n${lien}\n\n_EduPay — Paiements scolaires sécurisés 🇧🇯_`
  }

  function envoyerWhatsApp(listeTranches: EleveTranche[]) {
    const eleve = listeTranches[0]
    const message = genererMessage(listeTranches)
    const numero = eleve.whatsapp_parent1.replace(/\s/g, '').replace('+', '')
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
    setEnvoi(prev => [...prev, eleve.eleve_id])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-gray-700">
            ← Retour
          </button>
          <div>
            <h1 className="font-bold text-gray-800">Envoyer les liens WhatsApp</h1>
            <p className="text-xs text-gray-500">{Object.keys(eleves).length} élève(s) répertorié(s)</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
          <p className="text-blue-700 text-sm font-medium">💡 Relances intelligentes par tranche</p>
          <p className="text-blue-600 text-sm mt-1">
            Le message est généré automatiquement en indiquant la tranche prioritaire en attente ainsi que le solde restant de l'élève.
          </p>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Chargement...</div>
        ) : Object.keys(eleves).length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📲</div>
            <p className="text-gray-500">Aucun élève à notifier</p>
            <p className="text-gray-400 text-sm mt-1">Assurez-vous d'avoir créé des classes, des tranches et des élèves.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(eleves).map(([eleveId, listeTranches]) => {
              const eleve = listeTranches[0]
              const trancheEnAttente = listeTranches.find(t => t.statut !== 'paye')
              const resteTotal = listeTranches.reduce((sum, t) => sum + t.reste_a_payer, 0)
              const dejaEnvoye = envoi.includes(eleveId)

              return (
                <div key={eleveId} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-800">{eleve.prenom} {eleve.nom}</p>
                    <p className="text-sm text-gray-500">{eleve.classe_nom}</p>
                    <p className="text-xs text-gray-400 mt-1">📱 {eleve.whatsapp_parent1}</p>
                    {trancheEnAttente ? (
                      <p className="text-sm font-semibold text-blue-600 mt-1">
                        {trancheEnAttente.tranche_nom} : {trancheEnAttente.reste_a_payer.toLocaleString('fr-FR')} FCFA
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-green-600 mt-1">✅ Scolarité entièrement réglée</p>
                    )}
                  </div>
                  <button
                    onClick={() => envoyerWhatsApp(listeTranches)}
                    className={`text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${
                      dejaEnvoye
                        ? 'bg-green-50 text-green-600 border border-green-200'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {dejaEnvoye ? '✅ Envoyé' : '📲 Envoyer'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}