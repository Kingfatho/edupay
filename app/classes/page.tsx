'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

type Classe = {
  id: string
  nom: string
  niveau: string
  frais_scolarite: number
  frais_inscription: number
  frais_generaux: number
}

export default function Classes() {
  const router = useRouter()
  const [classes, setClasses] = useState<Classe[]>([])
  const [loading, setLoading] = useState(true)
  const [afficherForm, setAfficherForm] = useState(false)
  const [nom, setNom] = useState('')
  const [niveau, setNiveau] = useState('')
  const [fraisScolarite, setFraisScolarite] = useState('')
  const [fraisInscription, setFraisInscription] = useState('')
  const [fraisGeneraux, setFraisGeneraux] = useState('')
  const [saving, setSaving] = useState(false)
  const [ecoleId, setEcoleId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        router.push('/')
        return
      }
      await chargerEcole()
    }
    init()
  }, [])

  async function chargerEcole() {
    const { data } = await supabase.from('ecoles').select('*').limit(1).single()
    if (data) {
      setEcoleId(data.id)
      chargerClasses(data.id)
    } else {
      const { data: nouvelle } = await supabase
        .from('ecoles')
        .insert({ nom: 'Mon École' })
        .select()
        .single()
      if (nouvelle) {
        setEcoleId(nouvelle.id)
        setLoading(false)
      }
    }
  }

  async function chargerClasses(id: string) {
    const { data } = await supabase
      .from('classes')
      .select('*')
      .eq('ecole_id', id)
      .order('nom')
    setClasses(data || [])
    setLoading(false)
  }

  async function ajouterClasse() {
    if (!nom || !ecoleId) return
    setSaving(true)
    await supabase.from('classes').insert({
      ecole_id: ecoleId,
      nom,
      niveau,
      frais_scolarite: parseFloat(fraisScolarite) || 0,
      frais_inscription: parseFloat(fraisInscription) || 0,
      frais_generaux: parseFloat(fraisGeneraux) || 0,
    })
    setNom('')
    setNiveau('')
    setFraisScolarite('')
    setFraisInscription('')
    setFraisGeneraux('')
    setAfficherForm(false)
    setSaving(false)
    chargerClasses(ecoleId)
  }

  async function supprimerClasse(id: string) {
    await supabase.from('classes').delete().eq('id', id)
    chargerClasses(ecoleId!)
  }

  function formaterFCFA(montant: number) {
    return montant.toLocaleString('fr-FR') + ' FCFA'
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-500 hover:text-gray-700"
          >
            ← Retour
          </button>
          <div>
            <h1 className="font-bold text-gray-800">Classes</h1>
            <p className="text-xs text-gray-500">Gestion des classes et frais</p>
          </div>
        </div>
        <button
          onClick={() => setAfficherForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          + Nouvelle classe
        </button>
      </div>

      <div className="p-6">

        {/* Formulaire */}
        {afficherForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="font-bold text-gray-800 mb-4">Nouvelle classe</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la classe *</label>
                <input
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex: CP1, 6ème A, Terminale D"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
                <input
                  value={niveau}
                  onChange={(e) => setNiveau(e.target.value)}
                  placeholder="Ex: Primaire, Collège, Lycée"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frais de scolarité (FCFA)</label>
                <input
                  type="number"
                  value={fraisScolarite}
                  onChange={(e) => setFraisScolarite(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frais d'inscription (FCFA)</label>
                <input
                  type="number"
                  value={fraisInscription}
                  onChange={(e) => setFraisInscription(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frais généraux (FCFA)</label>
                <input
                  type="number"
                  value={fraisGeneraux}
                  onChange={(e) => setFraisGeneraux(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={ajouterClasse}
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

        {/* Liste des classes */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Chargement...</div>
        ) : classes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🏫</div>
            <p className="text-gray-500">Aucune classe pour le moment</p>
            <p className="text-gray-400 text-sm mt-1">Cliquez sur "Nouvelle classe" pour commencer</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.map((classe) => (
              <div key={classe.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{classe.nom}</h3>
                    {classe.niveau && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">
                        {classe.niveau}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => supprimerClasse(classe.id)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    Supprimer
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Scolarité</span>
                    <span className="font-medium text-gray-800">{formaterFCFA(classe.frais_scolarite)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Inscription</span>
                    <span className="font-medium text-gray-800">{formaterFCFA(classe.frais_inscription)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Frais généraux</span>
                    <span className="font-medium text-gray-800">{formaterFCFA(classe.frais_generaux)}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-2 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Total</span>
                    <span className="font-bold text-blue-600">
                      {formaterFCFA(classe.frais_scolarite + classe.frais_inscription + classe.frais_generaux)}
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