'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

type Eleve = {
  id: string
  nom: string
  prenom: string
  whatsapp_parent1: string
  cantine: boolean
  bus: boolean
  classes: {
    nom: string
  }
}

type Tranche = {
  id: string
  nom: string
  montant: number
}

export default function PageEnvoyerLiens() {
  const router = useRouter()
  const [eleves, setEleves] = useState<Eleve[]>([])
  const [tranches, setTranches] = useState<Tranche[]>([])
  const [loading, setLoading] = useState(true)

  const [typeRelance, setTypeRelance] = useState<string>('Scolarité')
  const [rubriqueCible, setRubriqueCible] = useState<string>('')
  const [fraisCantineMois, setFraisCantineMois] = useState<number>(0)
  const [fraisBusMois, setFraisBusMois] = useState<number>(0)

  const moisAnnee = [
    'Octobre', 'Novembre', 'Décembre', 'Janvier', 
    'Février', 'Mars', 'Avril', 'Mai', 'Juin'
  ]

  useEffect(() => {
    async function init() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        router.push('/')
        return
      }
      chargerDonnees()
    }
    init()
  }, [])

  async function chargerDonnees() {
    setLoading(true)

    const { data: ecole } = await supabase
      .from('ecoles')
      .select('frais_cantine, frais_bus')
      .limit(1)
      .maybeSingle()

    setFraisCantineMois(Math.round((ecole?.frais_cantine || 0) / 9))
    setFraisBusMois(Math.round((ecole?.frais_bus || 0) / 9))

    const { data: elevesData } = await supabase
      .from('eleves')
      .select('*, classes(nom)')
      .order('nom', { ascending: true })

    setEleves(elevesData || [])

    const { data: tranchesData } = await supabase
      .from('tranches')
      .select('*')

    setTranches(tranchesData || [])
    if (tranchesData && tranchesData.length > 0) {
      setRubriqueCible(tranchesData[0].nom)
    }

    setLoading(false)
  }

  function genererLienWhatsApp(eleve: Eleve) {
    const numero = eleve.whatsapp_parent1 || ''
    const baseUrl = window.location.origin
    const lienPaiement = `${baseUrl}/payer/${eleve.id}`

    let libelleFrais = rubriqueCible
    let montantEstime = 0

    if (typeRelance === 'Scolarité') {
      const t = tranches.find(tr => tr.nom === rubriqueCible)
      montantEstime = t?.montant || 0
      libelleFrais = `la tranche de scolarité : ${rubriqueCible}`
    } else if (typeRelance === 'Cantine') {
      montantEstime = fraisCantineMois
      libelleFrais = `la cantine du mois de ${rubriqueCible}`
    } else if (typeRelance === 'Bus') {
      montantEstime = fraisBusMois
      libelleFrais = `le transport (bus) du mois de ${rubriqueCible}`
    }

    const message = `Bonjour M./Mme, sauf erreur de notre part, le règlement pour ${libelleFrais} concernant ${eleve.prenom} ${eleve.nom} (${eleve.classes?.nom || ''}) n'a pas encore été enregistré.\n\nMontant : ${montantEstime.toLocaleString('fr-FR')} FCFA\n\nVous pouvez régler à tout moment et consulter votre reçu sécurisé en cliquant sur ce lien :\n${lienPaiement}`

    return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement...</div>
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
            <h1 className="font-bold text-gray-800">📲 Relances WhatsApp Intelligentes</h1>
            <p className="text-xs text-gray-500">Ciblez précisément la rubrique impayée à relancer ({eleves.length} élèves)</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        
        {/* Filtres de sélection */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de Frais à Relancer</label>
            <select 
              value={typeRelance}
              onChange={(e) => {
                setTypeRelance(e.target.value)
                if (e.target.value === 'Scolarité' && tranches.length > 0) setRubriqueCible(tranches[0].nom)
                if (e.target.value === 'Cantine' || e.target.value === 'Bus') setRubriqueCible(moisAnnee[0])
              }}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 bg-white"
            >
              <option value="Scolarité">🎓 Tranche de Scolarité</option>
              <option value="Cantine">🍽️ Cantine Mensuelle</option>
              <option value="Bus">🚌 Transport / Bus Mensuel</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rubrique / Échéance précise</label>
            <select 
              value={rubriqueCible}
              onChange={(e) => setRubriqueCible(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 bg-white"
            >
              {typeRelance === 'Scolarité' && tranches.map(t => (
                <option key={t.id} value={t.nom}>{t.nom} ({t.montant.toLocaleString('fr-FR')} FCFA)</option>
              ))}
              {(typeRelance === 'Cantine' || typeRelance === 'Bus') && moisAnnee.map(m => (
                <option key={m} value={m}>{m} ({ (typeRelance === 'Cantine' ? fraisCantineMois : fraisBusMois).toLocaleString('fr-FR') } FCFA)</option>
              ))}
            </select>
          </div>
        </div>

        {/* Liste des élèves */}
        {eleves.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">👦</div>
            <p className="text-gray-500">Aucun élève enregistré</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
            {eleves.map(eleve => {
              const lienWhatsapp = genererLienWhatsApp(eleve)
              return (
                <div key={eleve.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800 text-base">{eleve.prenom} {eleve.nom}</h3>
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-medium">
                        {eleve.classes?.nom || 'Sans classe'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">📱 WhatsApp : {eleve.whatsapp_parent1 || 'Non renseigné'}</p>
                  </div>

                  <div>
                    <a 
                      href={lienWhatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all ${
                        eleve.whatsapp_parent1 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none'
                      }`}
                    >
                      <span>💬</span> Envoyer Relance WhatsApp
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}