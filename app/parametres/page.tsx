'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

export default function Parametres() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ecoleId, setEcoleId] = useState<string | null>(null)
  const [nom, setNom] = useState('')
  const [nomComplet, setNomComplet] = useState('')
  const [numeroMomo, setNumeroMomo] = useState('')
  const [succes, setSucces] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        router.push('/')
        return
      }
      const { data } = await supabase.from('ecoles').select('*').limit(1).single()
      if (data) {
        setEcoleId(data.id)
        setNom(data.nom || '')
        setNomComplet(data.nom_complet || '')
        setNumeroMomo(data.numero_momo || '')
      }
      setLoading(false)
    }
    init()
  }, [])

  async function sauvegarder() {
    if (!ecoleId) return
    setSaving(true)
    setSucces(false)
    await supabase.from('ecoles').update({
      nom,
      nom_complet: nomComplet,
      numero_momo: numeroMomo,
    }).eq('id', ecoleId)
    setSaving(false)
    setSucces(true)
    setTimeout(() => setSucces(false), 3000)
  }

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
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-gray-700">
          ← Retour
        </button>
        <div>
          <h1 className="font-bold text-gray-800">Paramètres</h1>
          <p className="text-xs text-gray-500">Configuration de l'école</p>
        </div>
      </div>

      <div className="p-6 max-w-xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-800 mb-6">Informations de l'école</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom court de l'école *
              </label>
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: Collège Saint-Michel"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom complet officiel
              </label>
              <input
                value={nomComplet}
                onChange={(e) => setNomComplet(e.target.value)}
                placeholder="Ex: Collège Privé Saint-Michel de Cotonou"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro Mobile Money de l'école *
              </label>
              <input
                value={numeroMomo}
                onChange={(e) => setNumeroMomo(e.target.value)}
                placeholder="+229 XX XX XX XX"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              />
              <p className="text-gray-400 text-xs mt-1">
                C'est le numéro sur lequel les parents vont envoyer l'argent
              </p>
            </div>
          </div>

          {succes && (
            <div className="bg-green-50 text-green-600 text-sm px-4 py-3 rounded-xl mt-4">
              ✅ Paramètres sauvegardés avec succès
            </div>
          )}

          <button
            onClick={sauvegarder}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 mt-6"
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}