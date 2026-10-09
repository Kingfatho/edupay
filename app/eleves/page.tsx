'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

type Classe = {
  id: string
  nom: string
}

type EleveStatut = {
  eleve_id: string
  nom: string
  prenom: string
  whatsapp_parent1: string
  cantine: boolean
  bus: boolean
  classe_id: string
  classe_nom: string
  reste_total: number
  statut_global: 'solde' | 'en_cours' | 'non_paye'
}

export default function Eleves() {
  const router = useRouter()
  const [eleves, setEleves] = useState<EleveStatut[]>([])
  const [classes, setClasses] = useState<Classe[]>([])
  const [loading, setLoading] = useState(true)
  const [afficherForm, setAfficherForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Formulaire
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [classeId, setClasseId] = useState('')
  const [cantine, setCantine] = useState(false)
  const [bus, setBus] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        router.push('/')
        return
      }
      chargerClasses()
      chargerEleves()
    }
    init()
  }, [])

  async function chargerClasses() {
    const { data } = await supabase.from('classes').select('id, nom').order('nom')
    setClasses(data || [])
  }

  async function chargerEleves() {
    const { data } = await supabase.from('vue_tranches_eleves').select('*')

    if (data) {
      // Regrouper par élève pour calculer son statut global
      const groupes: Record<string, any[]> = data.reduce((acc, item) => {
        if (!acc[item.eleve_id]) acc[item.eleve_id] = []
        acc[item.eleve_id].push(item)
        return acc
      }, {})

      const listeCalculee: EleveStatut[] = Object.values(groupes).map((tranches) => {
        const premier = tranches[0]
        const resteTotal = tranches.reduce((sum, t) => sum + t.reste_a_payer, 0)
        const toutPaye = tranches.every((t) => t.statut === 'paye')
        const auMoinsUnVersement = tranches.some((t) => t.statut === 'paye' || t.statut === 'partiel')

        let statutGlobal: 'solde' | 'en_cours' | 'non_paye' = 'non_paye'
        if (toutPaye) statutGlobal = 'solde'
        else if (auMoinsUnVersement) statutGlobal = 'en_cours'

        return {
          eleve_id: premier.eleve_id,
          nom: premier.nom,
          prenom: premier.prenom,
          whatsapp_parent1: premier.whatsapp_parent1,
          cantine: premier.cantine,
          bus: premier.bus,
          classe_id: premier.classe_id,
          classe_nom: premier.classe_nom,
          reste_total: resteTotal,
          statut_global: statutGlobal,
        }
      })

      setEleves(listeCalculee)
    }
    setLoading(false)
  }

  async function ajouterEleve() {
    if (!nom || !prenom || !whatsapp || !classeId) return
    setSaving(true)

    await supabase.from('eleves').insert({
      nom,
      prenom,
      whatsapp_parent1: whatsapp,
      classe_id: classeId,
      cantine,
      bus,
    })

    setNom('')
    setPrenom('')
    setWhatsapp('')
    setClasseId('')
    setCantine(false)
    setBus(false)
    setAfficherForm(false)
    setSaving(false)
    chargerEleves()
  }

  async function supprimerEleve(id: string) {
    await supabase.from('eleves').delete().eq('id', id)
    chargerEleves()
  }

  function formaterFCFA(montant: number) {
    return montant.toLocaleString('fr-FR') + ' FCFA'
  }

  function badgeStatut(statut: 'solde' | 'en_cours' | 'non_paye') {
    switch (statut) {
      case 'solde':
        return <span className="bg-green-50 text-green-600 border border-green-200 text-xs px-3 py-1 rounded-xl font-medium">✅ Soldé</span>
      case 'en_cours':
        return <span className="bg-yellow-50 text-yellow-600 border border-yellow-200 text-xs px-3 py-1 rounded-xl font-medium">🟡 En cours</span>
      default:
        return <span className="bg-red-50 text-red-500 border border-red-200 text-xs px-3 py-1 rounded-xl font-medium">⏳ Non payé</span>
    }
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
            <h1 className="font-bold text-gray-800">Gestion des Élèves</h1>
            <p className="text-xs text-gray-500">{eleves.length} élève(s) inscrit(s)</p>
          </div>
        </div>
        <button
          onClick={() => setAfficherForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          + Nouvel élève
        </button>
      </div>

      <div className="p-6">
        {/* Formulaire d'ajout */}
        {afficherForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="font-bold text-gray-800 mb-4">Inscrire un nouvel élève</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex: AGBEGNINOU"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                <input
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Ex: Ranyah"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Parent *</label>
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Ex: +22962797769"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Classe *</label>
                <select
                  value={classeId}
                  onChange={(e) => setClasseId(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                >
                  <option value="">Sélectionner une classe</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Services optionnels */}
            <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={cantine}
                  onChange={(e) => setCantine(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                🍽️ Cantine scolaire
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={bus}
                  onChange={(e) => setBus(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                🚌 Transport (Bus)
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={ajouterEleve}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button
                onClick={() => setAfficherForm(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Liste des élèves */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Chargement...</div>
        ) : eleves.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">👦</div>
            <p className="text-gray-500">Aucun élève enregistré</p>
            <p className="text-gray-400 text-sm mt-1">Cliquez sur "+ Nouvel élève" pour ajouter vos premiers élèves.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {eleves.map((eleve) => (
              <div key={eleve.eleve_id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800 text-lg">{eleve.prenom} {eleve.nom}</h3>
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-medium">
                        {eleve.classe_nom}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">📱 {eleve.whatsapp_parent1}</p>

                    <div className="flex gap-3 mt-3 text-xs text-gray-500">
                      {eleve.cantine && <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-md">🍽️ Cantine</span>}
                      {eleve.bus && <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded-md">🚌 Bus</span>}
                    </div>
                  </div>

                  <div className="text-right">
                    {badgeStatut(eleve.statut_global)}
                    <p className="text-sm font-bold text-gray-800 mt-2">
                      Reste : {formaterFCFA(eleve.reste_total)}
                    </p>
                    <button
                      onClick={() => supprimerEleve(eleve.eleve_id)}
                      className="text-red-400 hover:text-red-600 text-xs mt-2 block ml-auto"
                    >
                      Supprimer
                    </button>
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