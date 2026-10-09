'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

type Tranche = {
  id: string
  nom: string
  montant: number
  date_limite: string
  ordre: number
  classe_id: string
  classes: { nom: string }
}

type Classe = {
  id: string
  nom: string
}

export default function Tranches() {
  const router = useRouter()
  const [tranches, setTranches] = useState<Tranche[]>([])
  const [classes, setClasses] = useState<Classe[]>([])
  const [classeFiltre, setClasseFiltre] = useState<string>('toutes')
  const [loading, setLoading] = useState(true)
  const [afficherForm, setAfficherForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ecoleId, setEcoleId] = useState<string | null>(null)
  const [nom, setNom] = useState('')
  const [montant, setMontant] = useState('')
  const [dateLimite, setDateLimite] = useState('')
  const [ordre, setOrdre] = useState('')
  const [classeId, setClasseId] = useState('')
  const [succes, setSucces] = useState(false)

  useEffect(() => {
    init()
  }, [])

  async function init() {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) {
      router.push('/')
      return
    }

    const { data: ecole, error: errEcole } = await supabase
      .from('ecoles')
      .select('*')
      .limit(1)
      .single()

    console.log('ECOLE:', JSON.stringify(ecole))
    console.log('ERREUR ECOLE:', JSON.stringify(errEcole))

    if (ecole) {
      setEcoleId(ecole.id)

      const { data: classesData, error: errClasses } = await supabase
        .from('classes')
        .select('*')
        .eq('ecole_id', ecole.id)
        .order('nom')

      console.log('CLASSES:', JSON.stringify(classesData))
      console.log('ERREUR CLASSES:', JSON.stringify(errClasses))

      setClasses(classesData || [])
      chargerTranches(ecole.id)
    }
    setLoading(false)
  }

  async function chargerTranches(id: string) {
    const { data } = await supabase
      .from('tranches')
      .select('*, classes(nom)')
      .eq('ecole_id', id)
      .order('ordre')
    setTranches(data || [])
  }

  async function ajouterTranche() {
    if (!nom || !montant || !ecoleId || !classeId) return
    setSaving(true)
    await supabase.from('tranches').insert({
      ecole_id: ecoleId,
      classe_id: classeId,
      nom,
      montant: parseFloat(montant),
      date_limite: dateLimite || null,
      ordre: parseInt(ordre) || 1,
    })
    setNom('')
    setMontant('')
    setDateLimite('')
    setOrdre('')
    setClasseId('')
    setAfficherForm(false)
    setSaving(false)
    setSucces(true)
    setTimeout(() => setSucces(false), 3000)
    chargerTranches(ecoleId)
  }

  async function supprimerTranche(id: string) {
    await supabase.from('tranches').delete().eq('id', id)
    chargerTranches(ecoleId!)
  }

  function formaterFCFA(montant: number) {
    return montant.toLocaleString('fr-FR') + ' FCFA'
  }

  function formaterDate(date: string) {
    if (!date) return 'Pas de date limite'
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const tranchesFiltrees = classeFiltre === 'toutes'
    ? tranches
    : tranches.filter(t => t.classe_id === classeFiltre)

  const tranchesParClasse = tranchesFiltrees.reduce((acc, tranche) => {
    const nomClasse = tranche.classes?.nom || 'Sans classe'
    if (!acc[nomClasse]) acc[nomClasse] = []
    acc[nomClasse].push(tranche)
    return acc
  }, {} as Record<string, Tranche[]>)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-gray-700">
            ← Retour
          </button>
          <div>
            <h1 className="font-bold text-gray-800">Tranches de paiement</h1>
            <p className="text-xs text-gray-500">Par classe et par date limite</p>
          </div>
        </div>
        <button
          onClick={() => setAfficherForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          + Nouvelle tranche
        </button>
      </div>

      <div className="p-6">

        {/* Filtre par classe */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setClasseFiltre('toutes')}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              classeFiltre === 'toutes'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
            }`}
          >
            Toutes les classes
          </button>
          {classes.map((classe) => (
            <button
              key={classe.id}
              onClick={() => setClasseFiltre(classe.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                classeFiltre === classe.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
              }`}
            >
              {classe.nom}
            </button>
          ))}
        </div>

        {/* Formulaire */}
        {afficherForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="font-bold text-gray-800 mb-4">Nouvelle tranche</h2>
            <div className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la tranche *</label>
                <input
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex: Tranche 1 — Octobre"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FCFA) *</label>
                <input
                  type="number"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  placeholder="Ex: 50000"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date limite</label>
                <input
                  type="date"
                  value={dateLimite}
                  onChange={(e) => setDateLimite(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ordre *</label>
                <select
                  value={ordre}
                  onChange={(e) => setOrdre(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                >
                  <option value="">Sélectionner l'ordre</option>
                  <option value="1">Tranche 1</option>
                  <option value="2">Tranche 2</option>
                  <option value="3">Tranche 3</option>
                  <option value="4">Tranche 4</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={ajouterTranche}
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

        {succes && (
          <div className="bg-green-50 text-green-600 text-sm px-4 py-3 rounded-xl mb-4">
            ✅ Tranche ajoutée avec succès
          </div>
        )}

        {/* Liste par classe */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Chargement...</div>
        ) : Object.keys(tranchesParClasse).length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📅</div>
            <p className="text-gray-500">Aucune tranche configurée</p>
            <p className="text-gray-400 text-sm mt-1">Cliquez sur "Nouvelle tranche" pour commencer</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(tranchesParClasse).map(([nomClasse, tranchesClasse]) => (
              <div key={nomClasse}>
                <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-xl text-sm">🏫 {nomClasse}</span>
                  <span className="text-gray-400 text-sm font-normal">
                    Total : {formaterFCFA(tranchesClasse.reduce((sum, t) => sum + t.montant, 0))}
                  </span>
                </h2>
                <div className="space-y-3">
                  {tranchesClasse.map((tranche) => (
                    <div key={tranche.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                            {tranche.ordre}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{tranche.nom}</p>
                            <p className="text-sm text-gray-500 mt-0.5">
                              📅 {formaterDate(tranche.date_limite)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600 text-lg">{formaterFCFA(tranche.montant)}</p>
                          <button
                            onClick={() => supprimerTranche(tranche.id)}
                            className="text-red-400 hover:text-red-600 text-xs mt-1"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}