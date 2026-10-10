'use client'
import { useEffect, useState } from 'react'

// @ts-ignore
import { supabase } from '../../../../supabase'

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
  const [eleves, setEleves] = useState<Eleve[]>([])
  const [tranches, setTranches] = useState<Tranche[]>([])
  const [loading, setLoading] = useState(true)

  // Filtres de relance ciblée
  const [typeRelance, setTypeRelance] = useState<string>('Scolarité')
  const [rubriqueCible, setRubriqueCible] = useState<string>('')
  const [fraisCantineMois, setFraisCantineMois] = useState<number>(0)
  const [fraisBusMois, setFraisBusMois] = useState<number>(0)

  const moisAnnee = [
    'Octobre', 'Novembre', 'Décembre', 'Janvier', 
    'Février', 'Mars', 'Avril', 'Mai', 'Juin'
  ]

  useEffect(() => {
    chargerDonnees()
  }, [])

  async function chargerDonnees() {
    setLoading(true)

    // 1. Récupérer les tarifs globaux de l'école (Cantine & Bus)
    const { data: ecole } = await supabase
      .from('ecoles')
      .select('frais_cantine, frais_bus')
      .limit(1)
      .maybeSingle()

    setFraisCantineMois(Math.round((ecole?.frais_cantine || 0) / 9))
    setFraisBusMois(Math.round((ecole?.frais_bus || 0) / 9))

    // 2. Récupérer tous les élèves avec leur classe
    const { data: elevesData } = await supabase
      .from('eleves')
      .select('*, classes(nom)')
      .order('nom', { ascending: true })

    setEleves(elevesData || [])

    // 3. Récupérer les tranches existantes
    const { data: tranchesData } = await supabase
      .from('tranches')
      .select('*')

    setTranches(tranchesData || [])
    if (tranchesData && tranchesData.length > 0) {
      setRubriqueCible(tranchesData[0].nom)
    }

    setLoading(false)
  }

  // Générer le lien WhatsApp intelligent
  function genererLienWhatsApp(eleve: Eleve) {
    const numero = eleve.whatsapp_parent1 || ''
    const baseUrl = window.location.origin
    const lienPaiement = `${baseUrl}/pay/${eleve.id}`

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
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Chargement des données de relance...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* En-tête */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📲 Relances WhatsApp Intelligentes</h1>
            <p className="text-sm text-gray-500 mt-1">Ciblez précisément la rubrique impayée à rappeler aux parents.</p>
          </div>
          <a href="/dashboard" className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-semibold transition-colors">
            ← Retour au Tableau de bord
          </a>
        </div>

        {/* Barre de Filtrage / Ciblage */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Type de Frais à Relancer</label>
            <select 
              value={typeRelance}
              onChange={(e) => {
                setTypeRelance(e.target.value)
                if (e.target.value === 'Scolarité' && tranches.length > 0) setRubriqueCible(tranches[0].nom)
                if (e.target.value === 'Cantine' || e.target.value === 'Bus') setRubriqueCible(moisAnnee[0])
              }}
              className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
            >
              <option value="Scolarité">🎓 Tranche de Scolarité</option>
              <option value="Cantine">🍽️ Cantine Mensuelle</option>
              <option value="Bus">🚌 Transport / Bus Mensuel</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Rubrique / Échéance précise</label>
            <select 
              value={rubriqueCible}
              onChange={(e) => setRubriqueCible(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
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

        {/* Liste des Élèves */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">Liste des élèves ({eleves.length})</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {eleves.map(eleve => {
              const lienWhatsapp = genererLienWhatsApp(eleve)
              return (
                <div key={eleve.id} className="p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50/50 transition-colors">
                  <div>
                    <h3 className="font-bold text-gray-800">{eleve.prenom} {eleve.nom}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Classe : <span className="font-semibold text-blue-600">{eleve.classes?.nom || 'Non assignée'}</span> | 
                      WhatsApp : <span className="font-medium text-gray-700">{eleve.whatsapp_parent1 || 'Non renseigné'}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <a 
                      href={lienWhatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all ${
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
            {eleves.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">
                Aucun élève enregistré pour le moment.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}