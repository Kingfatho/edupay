'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

type Eleve = {
  id: string
  nom: string
  prenom: string
  whatsapp_parent1: string
  whatsapp_parent2: string
  cantine: boolean
  bus: boolean
  classes: {
    nom: string
    frais_scolarite: number
    frais_inscription: number
    frais_generaux: number
  }
}

export default function Envoyer() {
  const router = useRouter()
  const [eleves, setEleves] = useState<Eleve[]>([])
  const [loading, setLoading] = useState(true)
  const [envoi, setEnvoi] = useState<string[]>([])

  useEffect(() => {
    async function init() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        router.push('/')
        return
      }
      chargerEleves()
    }
    init()
  }, [])

  async function chargerEleves() {
    const { data } = await supabase
      .from('eleves')
      .select('*, classes(nom, frais_scolarite, frais_inscription, frais_generaux)')
      .order('nom')
    setEleves(data || [])
    setLoading(false)
  }

  function genererLien(eleve: Eleve) {
    const base = window.location.origin
    return `${base}/payer/${eleve.id}`
  }

  function genererMessage(eleve: Eleve) {
    const total =
      (eleve.classes?.frais_scolarite || 0) +
      (eleve.classes?.frais_inscription || 0) +
      (eleve.classes?.frais_generaux || 0)
    const lien = genererLien(eleve)
    return `Bonjour,\n\nVous êtes invité(e) à régler les frais scolaires de *${eleve.prenom} ${eleve.nom}* (${eleve.classes?.nom}).\n\n💰 Montant total : *${total.toLocaleString('fr-FR')} FCFA*\n\n👉 Cliquez ici pour payer en toute sécurité :\n${lien}\n\n_EduPay — Paiements scolaires sécurisés 🇧🇯_`
  }

  function envoyerWhatsApp(eleve: Eleve) {
    const message = genererMessage(eleve)
    const numero = eleve.whatsapp_parent1.replace(/\s/g, '').replace('+', '')
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
    setEnvoi(prev => [...prev, eleve.id])
  }

  async function envoyerTous() {
    for (const eleve of eleves) {
      envoyerWhatsApp(eleve)
      await new Promise(r => setTimeout(r, 1000))
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
            <h1 className="font-bold text-gray-800">Envoyer les liens</h1>
            <p className="text-xs text-gray-500">{eleves.length} parent(s) à notifier</p>
          </div>
        </div>
        <button
          onClick={envoyerTous}
          className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          📲 Envoyer à tous
        </button>
      </div>

      <div className="p-6">

        {/* Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
          <p className="text-blue-700 text-sm font-medium">💡 Comment ça marche</p>
          <p className="text-blue-600 text-sm mt-1">
            Cliquez sur "Envoyer" pour chaque parent ou "Envoyer à tous" pour notifier tout le monde en un clic. WhatsApp s'ouvrira avec le message pré-rempli.
          </p>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Chargement...</div>
        ) : eleves.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📲</div>
            <p className="text-gray-500">Aucun élève enregistré</p>
            <p className="text-gray-400 text-sm mt-1">Ajoutez des élèves d'abord</p>
          </div>
        ) : (
          <div className="space-y-3">
            {eleves.map((eleve) => {
              const total =
                (eleve.classes?.frais_scolarite || 0) +
                (eleve.classes?.frais_inscription || 0) +
                (eleve.classes?.frais_generaux || 0)
              const dejaEnvoye = envoi.includes(eleve.id)

              return (
                <div key={eleve.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-800">{eleve.prenom} {eleve.nom}</p>
                    <p className="text-sm text-gray-500">{eleve.classes?.nom}</p>
                    <p className="text-xs text-gray-400 mt-1">{eleve.whatsapp_parent1}</p>
                    <p className="text-sm font-medium text-blue-600 mt-1">
                      {total.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                  <button
                    onClick={() => envoyerWhatsApp(eleve)}
                    className={`text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${
                      dejaEnvoye
                        ? 'bg-green-50 text-green-600 border border-green-200'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {dejaEnvoye ? '✅ Envoyé' : '📲 Envoyer'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}