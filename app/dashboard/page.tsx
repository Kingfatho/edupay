'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [totalPaye, setTotalPaye] = useState(0)
  const [totalAttente, setTotalAttente] = useState(0)
  const [totalAttendu, setTotalAttendu] = useState(0)

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.push('/')
      } else {
        setUser(data.session.user)
        chargerStats()
      }
    }
    init()
  }, [])

  async function chargerStats() {
    const { data: paiements } = await supabase
      .from('paiements')
      .select('montant, statut')

    if (paiements) {
      const paye = paiements
        .filter(p => p.statut === 'paye')
        .reduce((sum, p) => sum + p.montant, 0)
      const attente = paiements
        .filter(p => p.statut === 'en_attente')
        .reduce((sum, p) => sum + p.montant, 0)
      setTotalPaye(paye)
      setTotalAttente(attente)
      setTotalAttendu(paye + attente)
    }
  }

  async function deconnecter() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function formaterFCFA(montant: number) {
    return montant.toLocaleString('fr-FR') + ' FCFA'
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white font-bold w-10 h-10 rounded-xl flex items-center justify-center">
            E
          </div>
          <div>
            <h1 className="font-bold text-gray-800">EduPay</h1>
            <p className="text-xs text-gray-500">Tableau de bord</p>
          </div>
        </div>
        <button
          onClick={deconnecter}
          className="text-sm text-red-500 hover:text-red-700 font-medium"
        >
          Déconnexion
        </button>
      </div>

      {/* Stats */}
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Vue générale</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm">Total attendu</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{formaterFCFA(totalAttendu)}</p>
            <p className="text-blue-500 text-sm mt-2">Ce mois</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm">Total encaissé</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{formaterFCFA(totalPaye)}</p>
            <p className="text-green-500 text-sm mt-2">Paiements reçus</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm">En attente</p>
            <p className="text-3xl font-bold text-orange-500 mt-1">{formaterFCFA(totalAttente)}</p>
            <p className="text-orange-400 text-sm mt-2">Non payés</p>
          </div>
        </div>

        {/* Menu principal */}
        <h2 className="text-xl font-bold text-gray-800 mb-4">Gestion</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => router.push('/classes')}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:border-blue-300 transition-colors"
          >
            <div className="text-3xl mb-3">🏫</div>
            <h3 className="font-bold text-gray-800">Classes</h3>
            <p className="text-gray-500 text-sm mt-1">Gérer les classes et les frais</p>
          </div>
          <div
            onClick={() => router.push('/eleves')}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:border-blue-300 transition-colors"
          >
            <div className="text-3xl mb-3">👦</div>
            <h3 className="font-bold text-gray-800">Élèves</h3>
            <p className="text-gray-500 text-sm mt-1">Gérer les élèves et inscriptions</p>
          </div>
          <div
            onClick={() => router.push('/paiements')}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:border-blue-300 transition-colors"
          >
            <div className="text-3xl mb-3">💰</div>
            <h3 className="font-bold text-gray-800">Paiements</h3>
            <p className="text-gray-500 text-sm mt-1">Suivre les paiements en temps réel</p>
          </div>
          <div
            onClick={() => router.push('/envoyer')}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:border-blue-300 transition-colors"
          >
            <div className="text-3xl mb-3">📲</div>
            <h3 className="font-bold text-gray-800">Envoyer les liens</h3>
            <p className="text-gray-500 text-sm mt-1">Notifier les parents en un clic</p>
          </div>
          <div
            onClick={() => router.push('/parametres')}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:border-blue-300 transition-colors"
          >
            <div className="text-3xl mb-3">⚙️</div>
            <h3 className="font-bold text-gray-800">Paramètres</h3>
            <p className="text-gray-500 text-sm mt-1">Configurer l'école et le numéro momo</p>
          </div>
        </div>
      </div>
    </div>
  )
}