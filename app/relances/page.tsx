'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

type Eleve = {
  id: string
  nom: string
  prenom: string
  whatsapp_parent1: string
  cantine: boolean
  bus: boolean
  classes: {
    id: string
    nom: string
  }
}

type Tranche = {
  id: string
  nom: string
  montant: number
  date_limite: string
  ordre: number
  classe_id: string
}

type Ecole = {
  id: string
  nom: string
  numero_momo: string
  frais_cantine: number
  frais_bus: number
}

export default function Relances() {
  const router = useRouter()
  const [eleves, setEleves] = useState<Eleve[]>([])
  const [tranches, setTranches] = useState<Tranche[]>([])
  const [ecole, setEcole] = useState<Ecole | null>(null)
  const [loading, setLoading] = useState(true)
  const [typeRelance, setTypeRelance] = useState<'tranche' | 'cantine' | 'bus'>('tranche')
  const [trancheSelectionnee, setTrancheSelectionnee] = useState<string>('')
  const [moisSelectionne, setMoisSelectionne] = useState<string>('')
  const [paiementsEffectues, setPaiementsEffectues] = useState<string[]>([])
  const [envois, setEnvois] = useState<string[]>([])

  const moisDisponibles = [
    { valeur: '2026-10', label: 'Octobre 2026' },
    { valeur: '2026-11', label: 'Novembre 2026' },
    { valeur: '2026-12', label: 'Décembre 2026' },
    { valeur: '2027-01', label: 'Janvier 2027' },
    { valeur: '2027-02', label: 'Février 2027' },
    { valeur: '2027-03', label: 'Mars 2027' },
    { valeur: '2027-04', label: 'Avril 2027' },
    { valeur: '2027-05', label: 'Mai 2027' },
    { valeur: '2027-06', label: 'Juin 2027' },
  ]

  useEffect(() => {
    init()
  }, [])

  async function init() {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) {
      router.push('/')
      return
    }

    const { data: ecoleData } = await supabase
      .from('ecoles')
      .select('*')
      .limit(1)
      .single()

    if (ecoleData) {
      setEcole(ecoleData)

      const { data: elevesData } = await supabase
        .from('eleves')
        .select('*, classes(id, nom)')
        .order('nom')
      setEleves(elevesData || [])

      const { data: tranchesData } = await supabase
        .from('tranches')
        .select('*')
        .eq('ecole_id', ecoleData.id)
        .order('ordre')
      setTranches(tranchesData || [])

      const { data: paiements } = await supabase
        .from('paiements')
        .select('eleve_id, statut')
        .eq('statut', 'paye')
      setPaiementsEffectues(
      (paiements || []).map(p => p.eleve_id)
     )
    }
    setLoading(false)
  }

   function aDejaPayeTranche(eleveId: string, trancheId: string) {
    return paiementsEffectues.includes(eleveId)
  }

  function genererLienPaiement(eleveId: string, type: string, referenceId: string) {
    const base = window.location.origin
    return `${base}/payer/${eleveId}?type=${type}&ref=${referenceId}`
  }

  function genererMessageTranche(eleve: Eleve, tranche: Tranche) {
    const lien = genererLienPaiement(eleve.id, 'tranche', tranche.id)
    const dateLimit = tranche.date_limite
      ? new Date(tranche.date_limite).toLocaleDateString('fr-FR')
      : 'dès que possible'
    return `Bonjour,\n\nCeci est un rappel concernant les frais scolaires de *${eleve.prenom} ${eleve.nom}* (${eleve.classes?.nom}).\n\n📌 *${tranche.nom}*\n💰 Montant : *${tranche.montant.toLocaleString('fr-FR')} FCFA*\n📅 Date limite : *${dateLimit}*\n\n👉 Cliquez ici pour régler maintenant :\n${lien}\n\n_${ecole?.nom} — EduPay 🇧🇯_`
  }

  function genererMessageService(eleve: Eleve, type: 'cantine' | 'bus', mois: string) {
    const montant = type === 'cantine' ? ecole?.frais_cantine : ecole?.frais_bus
    const emoji = type === 'cantine' ? '🍽️' : '🚌'
    const nomService = type === 'cantine' ? 'Cantine' : 'Bus scolaire'
    const moisLabel = moisDisponibles.find(m => m.valeur === mois)?.label || mois
    const lien = genererLienPaiement(eleve.id, type, mois)
    return `Bonjour,\n\nRappel de paiement pour *${eleve.prenom} ${eleve.nom}*.\n\n${emoji} *${nomService} — ${moisLabel}*\n💰 Montant : *${montant?.toLocaleString('fr-FR')} FCFA*\n\n👉 Cliquez ici pour régler :\n${lien}\n\n_${ecole?.nom} — EduPay 🇧🇯_`
  }

  function envoyerWhatsApp(eleve: Eleve, message: string) {
    const numero = eleve.whatsapp_parent1.replace(/\s/g, '').replace('+', '')
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
    setEnvois(prev => [...prev, eleve.id])
  }

  async function envoyerTous() {
    const elevesACibler = elevesEligibles()
    for (const eleve of elevesACibler) {
      let message = ''
      if (typeRelance === 'tranche' && trancheSelectionnee) {
        const tranche = tranches.find(t => t.id === trancheSelectionnee)
        if (tranche) message = genererMessageTranche(eleve, tranche)
      } else if (typeRelance === 'cantine' && moisSelectionne) {
        message = genererMessageService(eleve, 'cantine', moisSelectionne)
      } else if (typeRelance === 'bus' && moisSelectionne) {
        message = genererMessageService(eleve, 'bus', moisSelectionne)
      }
      if (message) {
        envoyerWhatsApp(eleve, message)
        await new Promise(r => setTimeout(r, 1000))
      }
    }
  }

  function elevesEligibles(): Eleve[] {
    if (typeRelance === 'tranche' && trancheSelectionnee) {
      const tranche = tranches.find(t => t.id === trancheSelectionnee)
      if (!tranche) return []
      return eleves.filter(e =>
        (e.classes as any)?.id === tranche.classe_id &&
        !aDejaPayeTranche(e.id, trancheSelectionnee)
      )
    }
    if (typeRelance === 'cantine') {
      return eleves.filter(e => e.cantine)
    }
    if (typeRelance === 'bus') {
      return eleves.filter(e => e.bus)
    }
    return []
  }

  const eligibles = elevesEligibles()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    )
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
            <h1 className="font-bold text-gray-800">Relances</h1>
            <p className="text-xs text-gray-500">Notifier les parents en retard</p>
          </div>
        </div>
        {eligibles.length > 0 && (
          <button
            onClick={envoyerTous}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            📲 Relancer tous ({eligibles.length})
          </button>
        )}
      </div>

      <div className="p-6">

        {/* Choix du type de relance */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-bold text-gray-800 mb-4">Type de relance</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <button
              onClick={() => setTypeRelance('tranche')}
              className={`p-4 rounded-xl border-2 text-center transition-colors ${
                typeRelance === 'tranche'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="text-2xl mb-1">📚</div>
              <p className="text-sm font-medium text-gray-800">Tranche</p>
            </button>
            <button
              onClick={() => setTypeRelance('cantine')}
              className={`p-4 rounded-xl border-2 text-center transition-colors ${
                typeRelance === 'cantine'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-orange-300'
              }`}
            >
              <div className="text-2xl mb-1">🍽️</div>
              <p className="text-sm font-medium text-gray-800">Cantine</p>
            </button>
            <button
              onClick={() => setTypeRelance('bus')}
              className={`p-4 rounded-xl border-2 text-center transition-colors ${
                typeRelance === 'bus'
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <div className="text-2xl mb-1">🚌</div>
              <p className="text-sm font-medium text-gray-800">Bus</p>
            </button>
          </div>

          {/* Sélection tranche */}
          {typeRelance === 'tranche' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sélectionner la tranche à relancer
              </label>
              <select
                value={trancheSelectionnee}
                onChange={(e) => setTrancheSelectionnee(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              >
                <option value="">Choisir une tranche</option>
                {tranches.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nom} — {t.montant.toLocaleString('fr-FR')} FCFA
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sélection mois pour cantine/bus */}
          {(typeRelance === 'cantine' || typeRelance === 'bus') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sélectionner le mois à relancer
              </label>
              <select
                value={moisSelectionne}
                onChange={(e) => setMoisSelectionne(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              >
                <option value="">Choisir un mois</option>
                {moisDisponibles.map((m) => (
                  <option key={m.valeur} value={m.valeur}>{m.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Liste des élèves éligibles */}
        {eligibles.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">
              {typeRelance === 'tranche' && !trancheSelectionnee ? '👆' : '✅'}
            </div>
            <p className="text-gray-500">
              {typeRelance === 'tranche' && !trancheSelectionnee
                ? 'Sélectionnez une tranche pour voir les parents à relancer'
                : (typeRelance === 'cantine' || typeRelance === 'bus') && !moisSelectionne
                ? 'Sélectionnez un mois pour voir les parents à relancer'
                : 'Tous les parents sont à jour pour cette sélection'
              }
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">
                {eligibles.length} parent(s) à relancer
              </h2>
            </div>
            <div className="space-y-3">
              {eligibles.map((eleve) => {
                let message = ''
                if (typeRelance === 'tranche' && trancheSelectionnee) {
                  const tranche = tranches.find(t => t.id === trancheSelectionnee)
                  if (tranche) message = genererMessageTranche(eleve, tranche)
                } else if (typeRelance === 'cantine' && moisSelectionne) {
                  message = genererMessageService(eleve, 'cantine', moisSelectionne)
                } else if (typeRelance === 'bus' && moisSelectionne) {
                  message = genererMessageService(eleve, 'bus', moisSelectionne)
                }

                const dejaEnvoye = envois.includes(eleve.id)

                return (
                  <div key={eleve.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-800">{eleve.prenom} {eleve.nom}</p>
                      <p className="text-sm text-gray-500">{(eleve.classes as any)?.nom}</p>
                      <p className="text-xs text-gray-400 mt-1">{eleve.whatsapp_parent1}</p>
                    </div>
                    <button
                      onClick={() => envoyerWhatsApp(eleve, message)}
                      disabled={!message}
                      className={`text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${
                        dejaEnvoye
                          ? 'bg-green-50 text-green-600 border border-green-200'
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                      }`}
                    >
                      {dejaEnvoye ? '✅ Envoyé' : '📲 Relancer'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}