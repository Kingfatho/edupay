'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  // Statistiques financières globales et détaillées
  const [totalAttenduScolarite, setTotalAttenduScolarite] = useState(0)
  const [totalEncaisseScolarite, setTotalEncaisseScolarite] = useState(0)

  const [totalAttenduCantine, setTotalAttenduCantine] = useState(0)
  const [totalEncaisseCantine, setTotalEncaisseCantine] = useState(0) // Simplifié ou lié si besoin

  const [totalAttenduBus, setTotalAttenduBus] = useState(0)
  const [totalEncaisseBus, setTotalEncaisseBus] = useState(0)

  const [totalGlobalEncaisse, setTotalGlobalEncaisse] = useState(0)

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.push('/')
      } else {
        await calculerFinances()
      }
    }
    init()
  }, [])

  async function calculerFinances() {
    // 1. Récupérer l'école (pour les tarifs cantine/bus)
    const { data: ecoleData } = await supabase.from('ecoles').select('frais_cantine, frais_bus').limit(1).single()
    const fraisCantine = ecoleData?.frais_cantine || 0
    const fraisBus = ecoleData?.frais_bus || 0

    // 2. Récupérer les élèves avec leurs classes et options
    const { data: elevesData } = await supabase
      .from('eleves')
      .select('*, classes(frais_scolarite, frais_inscription, frais_generaux)')

    let scolariteDue = 0
    let cantineDue = 0
    let busDue = 0

    if (elevesData) {
      elevesData.forEach((eleve: any) => {
        const c = eleve.classes
        if (c) {
          scolariteDue += (c.frais_scolarite || 0) + (c.frais_inscription || 0) + (c.frais_generaux || 0)
        }
        if (eleve.cantine) cantineDue += fraisCantine
        if (eleve.bus) busDue += fraisBus
      })
    }

    setTotalAttenduScolarite(scolariteDue)
    setTotalAttenduCantine(cantineDue)
    setTotalAttenduBus(busDue)

    // 3. Récupérer tous les encaissements réels (table versements + paiements)
    const { data: versements } = await supabase.from('versements').select('montant')
    const { data: paiements } = await supabase.from('paiements').select('montant')

    const totalV = (versements || []).reduce((sum, v) => sum + (Number(v.montant) || 0), 0)
    const totalP = (paiements || []).reduce((sum, p) => sum + (Number(p.montant) || 0), 0)
    
    // Le plus grand total entre les deux tables ou leur somme si tables distinctes
    const globalEncaisse = Math.max(totalV, totalP) > 0 ? Math.max(totalV, totalP) : (totalV + totalP)

    setTotalGlobalEncaisse(globalEncaisse)
    // Pour l'instant, on attribue l'encaissé prioritairement à la scolarité ou réparti
    setTotalEncaisseScolarite(globalEncaisse) 

    setLoading(false)
  }

  async function deconnecter() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function formaterFCFA(montant: number) {
    return montant.toLocaleString('fr-FR') + ' FCFA'
  }

  const scolariteReste = Math.max(0, totalAttenduScolarite - totalEncaisseScolarite)
  const cantineReste = Math.max(0, totalAttenduCantine - totalEncaisseCantine)
  const busReste = Math.max(0, totalAttenduBus - totalEncaisseBus)

  const totalAttenduGlobal = totalAttenduScolarite + totalAttenduCantine + totalAttenduBus
  const totalResteGlobal = Math.max(0, totalAttenduGlobal - totalGlobalEncaisse)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white font-bold w-10 h-10 rounded-xl flex items-center justify-center">
            E
          </div>
          <div>
            <h1 className="font-bold text-gray-800">EduPay — Tableau de Bord</h1>
            <p className="text-xs text-gray-500">Pilotage financier de l'établissement</p>
          </div>
        </div>
        <button
          onClick={deconnecter}
          className="text-sm text-red-500 hover:text-red-700 font-medium"
        >
          Déconnexion
        </button>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        {loading ? (
          <div className="text-center text-gray-400 py-12">Chargement des indicateurs financiers...</div>
        ) : (
          <>
            {/* Section Synthèse Financière Détaillée */}
            <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Suivi Financier par Poste</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              
              {/* Carte Scolarité / Contribution */}
              <div 
                onClick={() => router.push('/classes')}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:border-blue-400 transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-2xl">🎓</span>
                  <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg font-semibold">Scolarité</span>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Attendu :</span>
                    <span className="font-bold text-gray-800">{formaterFCFA(totalAttenduScolarite)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Encaissé :</span>
                    <span className="font-bold text-green-600">{formaterFCFA(totalEncaisseScolarite)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                    <span className="text-gray-500 font-medium">Reste :</span>
                    <span className="font-bold text-orange-500">{formaterFCFA(scolariteReste)}</span>
                  </div>
                </div>
              </div>

              {/* Carte Cantine */}
              <div 
                onClick={() => router.push('/eleves')}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:border-orange-400 transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-2xl">🍽️</span>
                  <span className="text-xs bg-orange-50 text-orange-600 px-2.5 py-1 rounded-lg font-semibold">Cantine</span>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Attendu :</span>
                    <span className="font-bold text-gray-800">{formaterFCFA(totalAttenduCantine)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Encaissé :</span>
                    <span className="font-bold text-green-600">{formaterFCFA(totalEncaisseCantine)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                    <span className="text-gray-500 font-medium">Reste :</span>
                    <span className="font-bold text-orange-500">{formaterFCFA(cantineReste)}</span>
                  </div>
                </div>
              </div>

              {/* Carte Bus */}
              <div 
                onClick={() => router.push('/eleves')}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:border-green-400 transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-2xl">🚌</span>
                  <span className="text-xs bg-green-50 text-green-600 px-2.5 py-1 rounded-lg font-semibold">Transport / Bus</span>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Attendu :</span>
                    <span className="font-bold text-gray-800">{formaterFCFA(totalAttenduBus)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Encaissé :</span>
                    <span className="font-bold text-green-600">{formaterFCFA(totalEncaisseBus)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                    <span className="text-gray-500 font-medium">Reste :</span>
                    <span className="font-bold text-orange-500">{formaterFCFA(busReste)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Résumé Global Global */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-lg mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <p className="text-blue-100 text-sm font-medium">Trésorerie Globale de l'Établissement</p>
                <p className="text-3xl font-extrabold mt-1">{formaterFCFA(totalGlobalEncaisse)}</p>
                <p className="text-xs text-blue-200 mt-1">Total global attendu : {formaterFCFA(totalAttenduGlobal)} (Reste : {formaterFCFA(totalResteGlobal)})</p>
              </div>
              <button
                onClick={() => router.push('/paiements')}
                className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm"
              >
                📜 Voir toutes les transactions
              </button>
            </div>

            {/* Menu principal de gestion */}
            <h2 className="text-xl font-bold text-gray-800 mb-4">⚙️ Modules de Gestion</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                onClick={() => router.push('/classes')}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:border-blue-300 transition-colors"
              >
                <div className="text-3xl mb-3">🏫</div>
                <h3 className="font-bold text-gray-800">Classes</h3>
                <p className="text-gray-500 text-sm mt-1">Gérer les classes et les frais</p>
              </div>

              <div
                onClick={() => router.push('/tranches')}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:border-blue-300 transition-colors"
              >
                <div className="text-3xl mb-3">📅</div>
                <h3 className="font-bold text-gray-800">Tranches</h3>
                <p className="text-gray-500 text-sm mt-1">Configurer les échéances par classe</p>
              </div>

              <div
                onClick={() => router.push('/eleves')}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:border-blue-300 transition-colors"
              >
                <div className="text-3xl mb-3">👦</div>
                <h3 className="font-bold text-gray-800">Élèves</h3>
                <p className="text-gray-500 text-sm mt-1">Inscriptions, cantine et bus</p>
              </div>

              <div
                onClick={() => router.push('/paiements')}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:border-blue-300 transition-colors"
              >
                <div className="text-3xl mb-3">💰</div>
                <h3 className="font-bold text-gray-800">Paiements</h3>
                <p className="text-gray-500 text-sm mt-1">Suivre les versements en temps réel</p>
              </div>

              <div
                onClick={() => router.push('/envoyer')}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:border-blue-300 transition-colors"
              >
                <div className="text-3xl mb-3">📲</div>
                <h3 className="font-bold text-gray-800">Envoyer les liens</h3>
                <p className="text-gray-500 text-sm mt-1">Relances WhatsApp automatisées</p>
              </div>

              <div
                onClick={() => router.push('/parametres')}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:border-blue-300 transition-colors"
              >
                <div className="text-3xl mb-3">⚙️</div>
                <h3 className="font-bold text-gray-800">Paramètres</h3>
                <p className="text-gray-500 text-sm mt-1">Configuration école et Mobile Money</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}