'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'

type Tranche = {
  tranche_id: string
  tranche_nom: string
  tranche_montant: number
  date_limite: string
  ordre: number
  reste_a_payer: number
  statut: string
  total_verse: number
}

type Eleve = {
  eleve_id: string
  nom: string
  prenom: string
  whatsapp_parent1: string
  cantine: boolean
  bus: boolean
  classe_nom: string
}

type Ecole = {
  nom: string
  numero_momo: string
  frais_cantine: number
  frais_bus: number
}

export default function PagePaiement({ params }: { params: Promise<{ id: string }> }) {
  const [eleveId, setEleveId] = useState<string>('')
  const [eleve, setEleve] = useState<Eleve | null>(null)
  const [tranches, setTranches] = useState<Tranche[]>([])
  const [ecole, setEcole] = useState<Ecole | null>(null)
  const [etape, setEtape] = useState<'details' | 'ussd' | 'confirmation' | 'succes'>('details')
  const [reference, setReference] = useState('')
  const [montantChoisi, setMontantChoisi] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erreur, setErreur] = useState('')
  const [erreurChargement, setErreurChargement] = useState('')

  useEffect(() => {
    Promise.resolve(params).then((p) => setEleveId(p.id))
  }, [])

  useEffect(() => {
    if (eleveId) chargerDonnees()
  }, [eleveId])

  async function chargerDonnees() {
    console.log('Chargement pour eleveId:', eleveId)

    // Essai 1 : via la vue
    const { data: tranchesData, error: errVue } = await supabase
      .from('vue_tranches_eleves')
      .select('*')
      .eq('eleve_id', eleveId)
      .order('ordre')

    console.log('VUE DATA:', JSON.stringify(tranchesData))
    console.log('VUE ERROR:', JSON.stringify(errVue))

    if (tranchesData && tranchesData.length > 0) {
      setEleve({
        eleve_id: tranchesData[0].eleve_id,
        nom: tranchesData[0].nom,
        prenom: tranchesData[0].prenom,
        whatsapp_parent1: tranchesData[0].whatsapp_parent1,
        cantine: tranchesData[0].cantine,
        bus: tranchesData[0].bus,
        classe_nom: tranchesData[0].classe_nom,
      })
      setTranches(tranchesData)
      const prochaine = tranchesData.find((t: any) => t.statut !== 'paye')
      if (prochaine) setMontantChoisi(prochaine.reste_a_payer)
    } else {
      // Essai 2 : lecture directe sans vue
      const { data: eleveData, error: errEleve } = await supabase
        .from('eleves')
        .select(`
          id, nom, prenom, whatsapp_parent1, cantine, bus,
          classes(id, nom, frais_scolarite, frais_inscription, frais_generaux, ecole_id)
        `)
        .eq('id', eleveId)
        .single()

      console.log('ELEVE DIRECT:', JSON.stringify(eleveData))
      console.log('ELEVE ERROR:', JSON.stringify(errEleve))

      if (eleveData) {
        const c = eleveData.classes as any
        setEleve({
          eleve_id: eleveData.id,
          nom: eleveData.nom,
          prenom: eleveData.prenom,
          whatsapp_parent1: eleveData.whatsapp_parent1,
          cantine: eleveData.cantine,
          bus: eleveData.bus,
          classe_nom: c?.nom || '',
        })

        // Charger les tranches manuellement
        const { data: tranchesManual } = await supabase
          .from('tranches')
          .select('*')
          .eq('classe_id', c?.id)
          .order('ordre')

        console.log('TRANCHES MANUAL:', JSON.stringify(tranchesManual))

        // Charger les versements
        const { data: versements } = await supabase
          .from('versements')
          .select('montant')
          .eq('eleve_id', eleveId)

        const totalVerse = (versements || []).reduce((sum: number, v: any) => sum + v.montant, 0)
        console.log('TOTAL VERSE:', totalVerse)

        // Calculer le statut par tranche
        let cumul = totalVerse
        const tranchesCalculees = (tranchesManual || []).map((t: any) => {
          let statut = 'en_attente'
          let resteAPayer = t.montant

          if (cumul >= t.montant) {
            statut = 'paye'
            resteAPayer = 0
            cumul -= t.montant
          } else if (cumul > 0) {
            statut = 'partiel'
            resteAPayer = t.montant - cumul
            cumul = 0
          }

          return {
            tranche_id: t.id,
            tranche_nom: t.nom,
            tranche_montant: t.montant,
            date_limite: t.date_limite,
            ordre: t.ordre,
            reste_a_payer: resteAPayer,
            statut,
            total_verse: totalVerse,
          }
        })

        setTranches(tranchesCalculees)
        const prochaine = tranchesCalculees.find(t => t.statut !== 'paye')
        if (prochaine) setMontantChoisi(prochaine.reste_a_payer)
      } else {
        setErreurChargement('Élève introuvable')
      }
    }

    const { data: ecoleData } = await supabase
      .from('ecoles')
      .select('nom, numero_momo, frais_cantine, frais_bus')
      .limit(1)
      .single()
    if (ecoleData) setEcole(ecoleData)

    setLoading(false)
  }

  function formaterFCFA(montant: number) {
    return montant.toLocaleString('fr-FR') + ' FCFA'
  }

  function formaterDate(date: string) {
    if (!date) return ''
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    })
  }

  function statutStyle(statut: string) {
    switch (statut) {
      case 'paye': return 'bg-green-50 text-green-600 border-green-200'
      case 'partiel': return 'bg-yellow-50 text-yellow-600 border-yellow-200'
      default: return 'bg-gray-50 text-gray-500 border-gray-200'
    }
  }

  function statutLabel(statut: string) {
    switch (statut) {
      case 'paye': return '✅ Soldée'
      case 'partiel': return '🟡 Partielle'
      default: return '⏳ En attente'
    }
  }

  const toutSolde = tranches.length > 0 && tranches.every(t => t.statut === 'paye')
  const totalDu = tranches.reduce((sum, t) => sum + t.tranche_montant, 0)
  const totalVerse = tranches.length > 0 ? (tranches[0].total_verse || 0) : 0
  const resteTotal = tranches.reduce((sum, t) => sum + t.reste_a_payer, 0)

  async function confirmerPaiement() {
    if (!reference.trim()) {
      setErreur('Veuillez entrer votre code de confirmation')
      return
    }
    if (montantChoisi <= 0) {
      setErreur('Montant invalide')
      return
    }

    setSaving(true)
    setErreur('')

    const { data: existant } = await supabase
      .from('versements')
      .select('*')
      .eq('reference_paiement', reference.trim())
      .limit(1)

    if (existant && existant.length > 0) {
      setErreur('Ce code de confirmation a déjà été utilisé')
      setSaving(false)
      return
    }

    const { error } = await supabase.from('versements').insert({
      eleve_id: eleveId,
      montant: montantChoisi,
      reference_paiement: reference.trim(),
      whatsapp_parent: eleve?.whatsapp_parent1,
      date_paiement: new Date().toISOString(),
    })

    if (error) {
      setErreur('Une erreur est survenue. Veuillez réessayer.')
      setSaving(false)
      return
    }

    setEtape('succes')
    setSaving(false)
    await chargerDonnees()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!eleve || erreurChargement) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-700 font-bold">Lien invalide</p>
          <p className="text-gray-500 text-sm mt-2">Ce lien de paiement n'existe pas</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-blue-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-white text-blue-600 font-bold w-8 h-8 rounded-lg flex items-center justify-center text-sm">E</div>
            <span className="font-bold text-lg">{ecole?.nom || 'EduPay'}</span>
          </div>
          <p className="text-blue-100 text-sm">Paiement scolaire sécurisé 🇧🇯</p>
        </div>

        <div className="p-6">

          {/* Tout soldé */}
          {toutSolde && etape !== 'succes' && (
            <div className="text-center py-4">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-xl font-bold text-gray-800">Tout est soldé !</h2>
              <p className="text-gray-500 mt-2">
                <strong>{eleve.prenom} {eleve.nom}</strong> n'a plus aucun frais en attente.
              </p>
              <p className="text-gray-400 text-sm mt-2">Merci pour votre ponctualité 🙏</p>
            </div>
          )}

          {/* Détails */}
          {!toutSolde && etape === 'details' && (
            <div>
              <div className="mb-5">
                <h2 className="text-lg font-bold text-gray-800">{eleve.prenom} {eleve.nom}</h2>
                <p className="text-gray-500 text-sm">{eleve.classe_nom}</p>
              </div>

              {/* Résumé global */}
              <div className="bg-blue-50 rounded-xl p-4 mb-5">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Total scolarité</span>
                  <span className="font-medium text-gray-800">{formaterFCFA(totalDu)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Déjà versé</span>
                  <span className="font-medium text-green-600">{formaterFCFA(totalVerse)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-blue-200 pt-2 mt-2">
                  <span className="text-gray-800">Reste à payer</span>
                  <span className="text-blue-600 text-lg">{formaterFCFA(resteTotal)}</span>
                </div>
              </div>

              {/* Statut par tranche */}
              <div className="space-y-2 mb-5">
                {tranches.map((tranche) => (
                  <div key={tranche.tranche_id} className={`rounded-xl border p-3 ${statutStyle(tranche.statut)}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{tranche.tranche_nom}</p>
                        {tranche.date_limite && (
                          <p className="text-xs opacity-70">📅 {formaterDate(tranche.date_limite)}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium">{statutLabel(tranche.statut)}</p>
                        {tranche.statut !== 'paye' && (
                          <p className="text-sm font-bold">{formaterFCFA(tranche.reste_a_payer)}</p>
                        )}
                      </div>
                    </div>
                    {tranche.statut === 'partiel' && (
                      <div className="mt-2">
                        <div className="w-full bg-white rounded-full h-1.5">
                          <div
                            className="bg-yellow-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, ((tranche.tranche_montant - tranche.reste_a_payer) / tranche.tranche_montant) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs mt-1 opacity-70">
                          {formaterFCFA(tranche.tranche_montant - tranche.reste_a_payer)} versés sur {formaterFCFA(tranche.tranche_montant)}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Montant à payer */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant à verser maintenant
                </label>
                <input
                  type="number"
                  value={montantChoisi}
                  onChange={(e) => setMontantChoisi(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 text-lg font-bold"
                />
                <p className="text-gray-400 text-xs mt-1">
                  Le système répartira automatiquement selon les tranches prioritaires
                </p>
              </div>

              <button
                onClick={() => setEtape('ussd')}
                disabled={montantChoisi <= 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-colors text-lg disabled:opacity-50"
              >
                💳 Payer {formaterFCFA(montantChoisi)}
              </button>
            </div>
          )}

          {/* USSD */}
          {etape === 'ussd' && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">Comment payer</h2>
              <div className="space-y-4 mb-6">
                <div className="flex gap-3 items-start">
                  <div className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</div>
                  <div>
                    <p className="font-medium text-gray-800">Ouvrez votre menu Mobile Money</p>
                    <p className="text-gray-500 text-sm">MTN : <strong>*144#</strong> — Moov : <strong>*155#</strong></p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</div>
                  <div>
                    <p className="font-medium text-gray-800">Entrez le numéro de l'école</p>
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mt-1">
                      <p className="text-xs text-green-600 mb-1">Numéro Mobile Money</p>
                      <p className="font-bold text-green-700 text-xl">{ecole?.numero_momo}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</div>
                  <div>
                    <p className="font-medium text-gray-800">Entrez le montant exact</p>
                    <div className="bg-blue-50 rounded-xl px-4 py-2 mt-1 inline-block">
                      <p className="font-bold text-blue-600 text-xl">{formaterFCFA(montantChoisi)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0">4</div>
                  <div>
                    <p className="font-medium text-gray-800">Confirmez avec votre code PIN</p>
                    <p className="text-gray-500 text-sm">Vous recevrez un SMS de confirmation</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setEtape('confirmation')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-xl transition-colors"
              >
                ✅ J'ai effectué le paiement
              </button>
              <button onClick={() => setEtape('details')} className="w-full mt-3 text-gray-500 text-sm hover:text-gray-700">
                ← Retour
              </button>
            </div>
          )}

          {/* Confirmation */}
          {etape === 'confirmation' && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Code de confirmation</h2>
              <p className="text-gray-500 text-sm mb-5">Entrez le code reçu par SMS de MTN ou Moov</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Code de confirmation *</label>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex: CI241008.1234.A12345"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 text-lg"
                />
              </div>
              {erreur && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{erreur}</div>
              )}
              <button
                onClick={confirmerPaiement}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? 'Vérification...' : 'Valider le paiement'}
              </button>
              <button onClick={() => setEtape('ussd')} className="w-full mt-3 text-gray-500 text-sm hover:text-gray-700">
                ← Retour
              </button>
            </div>
          )}

          {/* Succès */}
          {etape === 'succes' && (
            <div className="text-center py-4">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-xl font-bold text-gray-800">Versement enregistré !</h2>
              <p className="text-gray-500 mt-2">
                <strong>{formaterFCFA(montantChoisi)}</strong> versés pour <strong>{eleve.prenom} {eleve.nom}</strong>
              </p>
              <div className="bg-green-50 rounded-xl p-4 mt-4 text-left space-y-2">
                {tranches.map((tranche) => (
                  <div key={tranche.tranche_id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{tranche.tranche_nom}</span>
                    <span className={`font-medium ${
                      tranche.statut === 'paye' ? 'text-green-600' :
                      tranche.statut === 'partiel' ? 'text-yellow-600' : 'text-gray-400'
                    }`}>
                      {statutLabel(tranche.statut)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-gray-400 text-sm mt-4">Merci pour votre paiement 🇧🇯</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}