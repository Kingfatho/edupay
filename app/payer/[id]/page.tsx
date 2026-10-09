'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'

type Eleve = {
  id: string
  nom: string
  prenom: string
  whatsapp_parent1: string
  cantine: boolean
  bus: boolean
  classes: {
    nom: string
    frais_scolarite: number
    frais_inscription: number
    frais_generaux: number
  }
}

export default function PagePaiement({ params }: { params: { id: string } }) {
  const eleveId = params.id

  const [eleve, setEleve] = useState<Eleve | null>(null)
  const [etape, setEtape] = useState<'details' | 'ussd' | 'confirmation' | 'succes' | 'deja_paye'>('details')
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    chargerEleve()
  }, [eleveId])

  async function chargerEleve() {
    const { data } = await supabase
      .from('eleves')
      .select('*, classes(nom, frais_scolarite, frais_inscription, frais_generaux)')
      .eq('id', eleveId)
      .single()

    if (data) {
      setEleve(data)
      verifierPaiement(data)
    }
    setLoading(false)
  }

  async function verifierPaiement(eleve: Eleve) {
    const { data } = await supabase
      .from('paiements')
      .select('*')
      .eq('eleve_id', eleve.id)
      .eq('statut', 'paye')
      .limit(1)

    if (data && data.length > 0) {
      setEtape('deja_paye')
    }
  }

  function calculerTotal(eleve: Eleve) {
    return (
      (eleve.classes?.frais_scolarite || 0) +
      (eleve.classes?.frais_inscription || 0) +
      (eleve.classes?.frais_generaux || 0)
    )
  }

  function formaterFCFA(montant: number) {
    return montant.toLocaleString('fr-FR') + ' FCFA'
  }

  async function confirmerPaiement() {
    if (!reference.trim()) {
      setErreur('Veuillez entrer votre code de confirmation')
      return
    }
    if (!eleve) return

    setSaving(true)
    setErreur('')

    const { data: existant } = await supabase
      .from('paiements')
      .select('*')
      .eq('reference_paiement', reference.trim())
      .limit(1)

    if (existant && existant.length > 0) {
      setErreur('Ce code de confirmation a déjà été utilisé')
      setSaving(false)
      return
    }

    const total = calculerTotal(eleve)

    const { error } = await supabase.from('paiements').insert({
      eleve_id: eleve.id,
      type_frais: 'Scolarité ' + eleve.classes?.nom,
      montant: total,
      statut: 'paye',
      reference_paiement: reference.trim(),
      whatsapp_parent: eleve.whatsapp_parent1,
      date_paiement: new Date().toISOString(),
    })

    if (error) {
      setErreur('Une erreur est survenue. Veuillez réessayer.')
      setSaving(false)
      return
    }

    setEtape('succes')
    setSaving(false)
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

  if (!eleve) {
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

  const total = calculerTotal(eleve)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        <div className="bg-blue-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-white text-blue-600 font-bold w-8 h-8 rounded-lg flex items-center justify-center text-sm">E</div>
            <span className="font-bold text-lg">EduPay</span>
          </div>
          <p className="text-blue-100 text-sm">Paiement scolaire sécurisé 🇧🇯</p>
        </div>

        <div className="p-6">

          {etape === 'deja_paye' && (
            <div className="text-center py-4">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-gray-800">Déjà réglé !</h2>
              <p className="text-gray-500 mt-2">Les frais de <strong>{eleve.prenom} {eleve.nom}</strong> ont déjà été payés.</p>
              <p className="text-gray-400 text-sm mt-2">Merci pour votre paiement.</p>
            </div>
          )}

          {etape === 'details' && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-1">Frais scolaires</h2>
              <p className="text-gray-500 text-sm mb-5">{eleve.prenom} {eleve.nom} — {eleve.classes?.nom}</p>
              <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Scolarité</span>
                  <span className="font-medium text-gray-800">{formaterFCFA(eleve.classes?.frais_scolarite || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Inscription</span>
                  <span className="font-medium text-gray-800">{formaterFCFA(eleve.classes?.frais_inscription || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Frais généraux</span>
                  <span className="font-medium text-gray-800">{formaterFCFA(eleve.classes?.frais_generaux || 0)}</span>
                </div>
                {eleve.cantine && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">🍽️ Cantine</span>
                    <span className="font-medium text-orange-500">Inclus</span>
                  </div>
                )}
                {eleve.bus && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">🚌 Bus</span>
                    <span className="font-medium text-green-500">Inclus</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="font-bold text-gray-800">Total à payer</span>
                  <span className="font-bold text-blue-600 text-lg">{formaterFCFA(total)}</span>
                </div>
              </div>
              <button
                onClick={() => setEtape('ussd')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-colors text-lg"
              >
                💳 Payer maintenant
              </button>
            </div>
          )}

          {etape === 'ussd' && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">Comment payer</h2>
              <div className="space-y-4 mb-6">
                <div className="flex gap-3 items-start">
                  <div className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</div>
                  <div>
                    <p className="font-medium text-gray-800">Ouvrez votre menu Mobile Money</p>
                    <p className="text-gray-500 text-sm">MTN : composez <strong>*144#</strong> — Moov : composez <strong>*155#</strong></p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</div>
                  <div>
                    <p className="font-medium text-gray-800">Faites un transfert d'argent</p>
                    <p className="text-gray-500 text-sm">Choisissez "Envoyer de l'argent" ou "Transfert"</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</div>
                  <div>
                    <p className="font-medium text-gray-800">Entrez le numéro de l'école</p>
                    <div className="bg-gray-100 rounded-xl px-4 py-2 mt-1 inline-block">
                      <p className="font-bold text-gray-800 text-lg">+229 XX XX XX XX</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0">4</div>
                  <div>
                    <p className="font-medium text-gray-800">Entrez le montant exact</p>
                    <div className="bg-blue-50 rounded-xl px-4 py-2 mt-1 inline-block">
                      <p className="font-bold text-blue-600 text-lg">{formaterFCFA(total)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0">5</div>
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
            </div>
          )}

          {etape === 'confirmation' && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Code de confirmation</h2>
              <p className="text-gray-500 text-sm mb-5">Entrez le code reçu par SMS de MTN ou Moov après votre paiement</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Code de confirmation *</label>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex: CI241008.1234.A12345"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 text-lg"
                />
                <p className="text-gray-400 text-xs mt-1">Ce code se trouve dans le SMS reçu après le paiement</p>
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
              <button
                onClick={() => setEtape('ussd')}
                className="w-full mt-3 text-gray-500 text-sm hover:text-gray-700"
              >
                ← Retour aux instructions
              </button>
            </div>
          )}

          {etape === 'succes' && (
            <div className="text-center py-4">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-xl font-bold text-gray-800">Paiement confirmé !</h2>
              <p className="text-gray-500 mt-2">Les frais de <strong>{eleve.prenom} {eleve.nom}</strong> ont été enregistrés avec succès.</p>
              <div className="bg-green-50 rounded-xl p-4 mt-4 text-left">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Élève</span>
                  <span className="font-medium text-gray-800">{eleve.prenom} {eleve.nom}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Classe</span>
                  <span className="font-medium text-gray-800">{eleve.classes?.nom}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Montant</span>
                  <span className="font-bold text-green-600">{formaterFCFA(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Référence</span>
                  <span className="font-medium text-gray-800">{reference}</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm mt-4">Merci pour votre paiement 🇧🇯</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}