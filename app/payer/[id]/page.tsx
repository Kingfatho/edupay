'use client'
import { useEffect, useState, use } from 'react'

// Import de supabase depuis la racine du projet (ignore l'avertissement de type pour .js)
// @ts-ignore
import { supabase } from '../../../../supabase'

type Props = {
  params: Promise<{ id: string }>
}

type Tranche = {
  id: string
  nom: string
  montant: number
  date_limite?: string
}

type Versement = {
  id: string
  montant: number
  reference_paiement?: string
  created_at?: string
}

export default function PagePaiementParent({ params }: Props) {
  const resolvedParams = use(params)
  const eleveId = resolvedParams.id

  const [eleve, setEleve] = useState<any>(null)
  const [tranches, setTranches] = useState<Tranche[]>([])
  const [versements, setVersements] = useState<Versement[]>([])
  const [fraisCantineMois, setFraisCantineMois] = useState<number>(0)
  const [fraisBusMois, setFraisBusMois] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  const [selections, setSelections] = useState<{ [key: string]: number }>({})
  const [referenceSMS, setReferenceSMS] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [succes, setSucces] = useState(false)

  const moisAnnee = [
    'Octobre', 'Novembre', 'Décembre', 'Janvier', 
    'Février', 'Mars', 'Avril', 'Mai', 'Juin'
  ]

  useEffect(() => {
    if (eleveId) {
      chargerDonneesPaiement()
    }
  }, [eleveId])

  async function chargerDonneesPaiement() {
    setLoading(true)

    try {
      const { data: ecole } = await supabase
        .from('ecoles')
        .select('frais_cantine, frais_bus')
        .limit(1)
        .maybeSingle()

      const cantineMensuelle = Math.round((ecole?.frais_cantine || 0) / 9)
      const busMensuel = Math.round((ecole?.frais_bus || 0) / 9)
      setFraisCantineMois(cantineMensuelle)
      setFraisBusMois(busMensuel)

      const { data: eleveData, error: eleveErr } = await supabase
        .from('eleves')
        .select('*, classes(nom, frais_scolarite, frais_inscription, frais_generaux)')
        .eq('id', eleveId)
        .single()

      if (eleveErr || !eleveData) {
        console.error('Erreur récupération élève:', eleveErr)
        setLoading(false)
        return
      }

      setEleve(eleveData)

      if (eleveData.classe_id) {
        const { data: tranchesData } = await supabase
          .from('tranches')
          .select('*')
          .eq('classe_id', eleveData.classe_id)
          .order('created_at', { ascending: true })

        setTranches(tranchesData || [])
      }

      const { data: versementsData } = await supabase
        .from('versements')
        .select('*')
        .eq('eleve_id', eleveId)

      setVersements(versementsData || [])
    } catch (err) {
      console.error('Erreur inattendue:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalDejaPaye = versements.reduce((sum, v) => sum + (Number(v.montant) || 0), 0)

  function toggleSelection(cle: string, montant: number) {
    setSelections(prev => {
      const copy = { ...prev }
      if (copy[cle]) {
        delete copy[cle]
      } else {
        copy[cle] = montant
      }
      return copy
    })
  }

  const totalAPayer = Object.values(selections).reduce((sum, val) => sum + val, 0)

  async function validerPaiement(e: React.FormEvent) {
    e.preventDefault()
    if (totalAPayer <= 0) {
      alert('Veuillez cocher au moins une rubrique à régler.')
      return
    }
    if (!referenceSMS.trim()) {
      alert('Veuillez saisir la référence du transfert Mobile Money.')
      return
    }

    setSubmitting(true)

    const detailRubriques = Object.keys(selections).join(', ')

    const { error } = await supabase.from('versements').insert({
      eleve_id: eleveId,
      montant: totalAPayer,
      reference_paiement: referenceSMS.trim(),
      type_frais: `Règlement : ${detailRubriques}`,
      whatsapp_parent: eleve?.whatsapp_parent1 || '',
      date_paiement: new Date().toISOString()
    })

    if (error) {
      alert('Erreur lors de l\'enregistrement : ' + error.message)
    } else {
      setSucces(true)
    }
    setSubmitting(false)
  }

  function formaterFCFA(m: number) {
    return (m || 0).toLocaleString('fr-FR') + ' FCFA'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">
        Chargement de l'espace de paiement...
      </div>
    )
  }

  if (!eleve) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-500 font-medium p-4 text-center">
        Impossible de charger les informations de cet élève.
      </div>
    )
  }

  const nomClasse = Array.isArray(eleve.classes) 
    ? eleve.classes[0]?.nom 
    : eleve.classes?.nom || 'Classe'

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-md overflow-hidden">
        
        {/* Entête Élève (Structure de balises parfaitement équilibrée) */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full text-blue-100">
              {nomClasse}
            </span>
            <p className="text-blue-100 text-sm">Paiement scolaire sécurisé</p>
          </div>

          <h1 className="text-2xl font-bold mt-3">{eleve.prenom} {eleve.nom}</h1>
          <p className="text-xs text-blue-100 mt-1">Espace de Règlement Scolaire & Services</p>
          
          <div className="mt-4 bg-white/10 backdrop-blur-md rounded-2xl p-3 flex justify-between items-center text-xs">
            <span>Total Déjà Encaissé :</span>
            <span className="font-bold text-sm text-green-300">{formaterFCFA(totalDejaPaye)}</span>
          </div>
        </div>

        {succes ? (
          <div className="p-8 text-center space-y-4">
            <div className="text-6xl">🎉</div>
            <h2 className="text-xl font-bold text-gray-800">Paiement Soumis !</h2>
            <p className="text-sm text-gray-600">
              Votre règlement de <span className="font-bold text-green-600">{formaterFCFA(totalAPayer)}</span> a été enregistré.
            </p>
            <p className="text-xs text-gray-400">Référence : {referenceSMS}</p>
            <button 
              onClick={() => { 
                setSucces(false)
                setSelections({})
                setReferenceSMS('')
                chargerDonneesPaiement()
              }}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold mt-4 hover:bg-blue-700 transition-colors"
            >
              Effectuer un autre règlement
            </button>
          </div>
        ) : (
          <form onSubmit={validerPaiement} className="p-6 space-y-6">
            
            {/* Tranches de Scolarité */}
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                <span>🎓</span> Tranches de Scolarité
              </h3>
              {tranches.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Aucune tranche configurée pour cette classe.</p>
              ) : (
                <div className="space-y-2">
                  {tranches.map((t) => {
                    const key = `Scolarité: ${t.nom}`
                    const isSelected = !!selections[key]
                    return (
                      <label 
                        key={t.id} 
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={isSelected} 
                            onChange={() => toggleSelection(key, t.montant)}
                            className="w-5 h-5 accent-blue-600 rounded"
                          />
                          <div>
                            <p className="font-semibold text-sm text-gray-800">{t.nom}</p>
                            {t.date_limite && (
                              <p className="text-xs text-gray-400">Échéance : {t.date_limite}</p>
                            )}
                          </div>
                        </div>
                        <span className="font-bold text-sm text-blue-600">{formaterFCFA(t.montant)}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Cantine */}
            {eleve.cantine && (
              <div>
                <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                  <span>🍽️</span> Cantine (Mensualités)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {moisAnnee.map((m) => {
                    const key = `Cantine: ${m}`
                    const isSelected = !!selections[key]
                    return (
                      <label 
                        key={m} 
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer ${
                          isSelected ? 'border-orange-500 bg-orange-50/50 font-semibold' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={isSelected} 
                            onChange={() => toggleSelection(key, fraisCantineMois)}
                            className="w-4 h-4 accent-orange-500 rounded"
                          />
                          <span>{m}</span>
                        </div>
                        <span className="text-gray-600 font-medium">{formaterFCFA(fraisCantineMois)}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Bus */}
            {eleve.bus && (
              <div>
                <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                  <span>🚌</span> Transport / Bus (Mensualités)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {moisAnnee.map((m) => {
                    const key = `Bus: ${m}`
                    const isSelected = !!selections[key]
                    return (
                      <label 
                        key={m} 
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer ${
                          isSelected ? 'border-green-500 bg-green-50/50 font-semibold' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={isSelected} 
                            onChange={() => toggleSelection(key, fraisBusMois)}
                            className="w-4 h-4 accent-green-500 rounded"
                          />
                          <span>{m}</span>
                        </div>
                        <span className="text-gray-600 font-medium">{formaterFCFA(fraisBusMois)}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Récapitulatif et Validation */}
            <div className="pt-4 border-t border-gray-100 space-y-4">
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                <span className="font-semibold text-gray-700 text-sm">Total à régler :</span>
                <span className="text-2xl font-extrabold text-blue-600">{formaterFCFA(totalAPayer)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Référence du Transfert Mobile Money (SMS)
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: CI241008.1234.A12345" 
                  value={referenceSMS}
                  onChange={(e) => setReferenceSMS(e.target.value)}
                  className="w-full p-3.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting || totalAPayer <= 0}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-2xl font-bold shadow-md transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? 'Validation en cours...' : 'Confirmer le Règlement'}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  )
}