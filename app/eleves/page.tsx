'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

type Classe = {
  id: string
  nom: string
}

type Eleve = {
  id: string
  nom: string
  prenom: string
  whatsapp_parent1: string
  whatsapp_parent2: string
  cantine: boolean
  bus: boolean
  classes: { nom: string }
}

export default function Eleves() {
  const router = useRouter()
  const [eleves, setEleves] = useState<Eleve[]>([])
  const [classes, setClasses] = useState<Classe[]>([])
  const [loading, setLoading] = useState(true)
  const [afficherForm, setAfficherForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ecoleId, setEcoleId] = useState<string | null>(null)
  const [recherche, setRecherche] = useState('')

  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [classeId, setClasseId] = useState('')
  const [whatsapp1, setWhatsapp1] = useState('')
  const [whatsapp2, setWhatsapp2] = useState('')
  const [cantine, setCantine] = useState(false)
  const [bus, setBus] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        router.push('/')
        return
      }
      const { data: ecole } = await supabase.from('ecoles').select('*').limit(1).single()
      if (ecole) {
        setEcoleId(ecole.id)
        chargerClasses(ecole.id)
        chargerEleves(ecole.id)
      }
    }
    init()
  }, [])

  async function chargerClasses(id: string) {
    const { data } = await supabase.from('classes').select('*').eq('ecole_id', id).order('nom')
    setClasses(data || [])
  }

  async function chargerEleves(id: string) {
    const { data } = await supabase
      .from('eleves')
      .select('*, classes(nom)')
      .eq('classes.ecole_id', id)
      .order('nom')
    setEleves(data || [])
    setLoading(false)
  }

  async function ajouterEleve() {
    if (!nom || !prenom || !classeId || !whatsapp1) return
    setSaving(true)
    await supabase.from('eleves').insert({
      nom,
      prenom,
      classe_id: classeId,
      whatsapp_parent1: whatsapp1,
      whatsapp_parent2: whatsapp2,
      cantine,
      bus,
    })
    setNom('')
    setPrenom('')
    setClasseId('')
    setWhatsapp1('')
    setWhatsapp2('')
    setCantine(false)
    setBus(false)
    setAfficherForm(false)
    setSaving(false)
    chargerEleves(ecoleId!)
  }

  async function supprimerEleve(id: string) {
    await supabase.from('eleves').delete().eq('id', id)
    chargerEleves(ecoleId!)
  }

  const elevesFiltres = eleves.filter(e =>
    `${e.nom} ${e.prenom}`.toLowerCase().includes(recherche.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-gray-700">
            ← Retour
          </button>
          <div>
            <h1 className="font-bold text-gray-800">Élèves</h1>
            <p className="text-xs text-gray-500">{eleves.length} élève(s) enregistré(s)</p>
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

        {/* Recherche */}
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un élève..."
          className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 mb-6 bg-white"
        />

        {/* Formulaire */}
        {afficherForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="font-bold text-gray-800 mb-4">Nouvel élève</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Nom de famille"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                <input
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Prénom"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Parent 1 *</label>
                <input
                  value={whatsapp1}
                  onChange={(e) => setWhatsapp1(e.target.value)}
                  placeholder="+229 XX XX XX XX"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Parent 2</label>
                <input
                  value={whatsapp2}
                  onChange={(e) => setWhatsapp2(e.target.value)}
                  placeholder="+229 XX XX XX XX"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>
              <div className="flex items-center gap-6 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cantine}
                    onChange={(e) => setCantine(e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">🍽️ Cantine</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bus}
                    onChange={(e) => setBus(e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">🚌 Bus</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
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
        ) : elevesFiltres.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">👦</div>
            <p className="text-gray-500">Aucun élève pour le moment</p>
            <p className="text-gray-400 text-sm mt-1">Cliquez sur "Nouvel élève" pour commencer</p>
          </div>
        ) : (
          <div className="space-y-3">
            {elevesFiltres.map((eleve) => (
              <div key={eleve.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-50 text-blue-600 font-bold w-12 h-12 rounded-xl flex items-center justify-center text-lg">
                    {eleve.prenom[0]}{eleve.nom[0]}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{eleve.prenom} {eleve.nom}</p>
                    <p className="text-sm text-gray-500">{eleve.classes?.nom}</p>
                    <p className="text-xs text-gray-400 mt-1">{eleve.whatsapp_parent1}</p>
                    <div className="flex gap-2 mt-1">
                      {eleve.cantine && <span className="text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-lg">🍽️ Cantine</span>}
                      {eleve.bus && <span className="text-xs bg-green-50 text-green-500 px-2 py-0.5 rounded-lg">🚌 Bus</span>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => supprimerEleve(eleve.id)}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}