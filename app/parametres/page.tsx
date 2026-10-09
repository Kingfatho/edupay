'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

type Ecole = {
  id: string
  nom: string
  numero_momo: string
  frais_cantine: number
  frais_bus: number
}

export default function Parametres() {
  const router = useRouter()
  const [ecoleId, setEcoleId] = useState<string | null>(null)
  const [nom, setNom] = useState('')
  const [numeroMomo, setNumeroMomo] = useState('')
  const [fraisCantine, setFraisCantine] = useState('')
  const [fraisBus, setFraisBus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [succes, setSucces] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        router.push('/')
        return
      }
      chargerEcole()
    }
    init()
  }, [])

  async function chargerEcole() {
    const { data } = await supabase.from('ecoles').select('*').limit(1).single()
    if (data) {
      setEcoleId(data.id)
      setNom(data.nom || '')
      setNumeroMomo(data.numero_momo || '')
      setFraisCantine(data.frais_cantine ? data.frais_cantine.toString() : '')
      setFraisBus(data.frais_bus ? data.frais_bus.toString() : '')
    }
    setLoading(false)
  }

  async function enregistrer() {
    if (!nom || !ecoleId) return
    setSaving(true)
    setSucces(false)

    await supabase
      .from('ecoles')
      .update({
        nom,
        numero_momo: numeroMomo,
        frais_cantine: parseFloat(fraisCantine) || 0,
        frais_bus: parseFloat(fraisBus) || 0,
      })
      .eq('id', ecoleId)

    setSaving(false)
    setSucces(true)
    setTimeout(() => setSucces(false), 3000)
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
            <h1 className="font-bold text-gray-800">Paramètres de l'école</h1>
            <p className="text-xs text-gray-500">Configuration générale et paiements</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto">
        {loading ? (
          <div className="text-center text-gray-400 py-12">Chargement...</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <h2 className="font-bold text-gray-800 text-lg border-b border-gray-100 pb-3">
              🏫 Informations de l'établissement
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'école *</label>
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: Collège Saint-Michel"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 font-medium"
              />
            </div>

            <div className="pt-2">
              <h2 className="font-bold text-gray-800 text-lg border-b border-gray-100 pb-3 mb-4">
                💳 Mobile Money de réception
              </h2>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro Mobile Money (MTN / Moov) *
              </label>
              <input
                value={numeroMomo}
                onChange={(e) => setNumeroMomo(e.target.value)}
                placeholder="Ex: +229 97 00 00 00"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 font-bold text-lg"
              />
              <p className="text-xs text-gray-400 mt-1">
                C'est le numéro que les parents verront dans les instructions USSD lors du paiement.
              </p>
            </div>

            <div className="pt-2">
              <h2 className="font-bold text-gray-800 text-lg border-b border-gray-100 pb-3 mb-4">
                🚌 Tarifs des services annexes
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frais de Cantine (FCFA)</label>
                  <input
                    type="number"
                    value={fraisCantine}
                    onChange={(e) => setFraisCantine(e.target.value)}
                    placeholder="Ex: 15000"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frais de Bus (FCFA)</label>
                  <input
                    type="number"
                    value={fraisBus}
                    onChange={(e) => setFraisBus(e.target.value)}
                    placeholder="Ex: 20000"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                  />
                </div>
              </div>
            </div>

            {succes && (
              <div className="bg-green-50 text-green-600 text-sm px-4 py-3 rounded-xl font-medium">
                ✅ Paramètres mis à jour avec succès !
              </div>
            )}

            <button
              onClick={enregistrer}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-colors disabled:opacity-50 text-lg"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}