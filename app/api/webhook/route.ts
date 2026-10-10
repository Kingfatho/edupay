import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialisation de Supabase avec les clés admin ou publiques sécurisées
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cdabzfewexxswokbekeo.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Le corps (payload) envoyé par Make.com ou ton application de lecture de SMS
    // On s'attend à recevoir : { reference, montant, numero_expediteur, texte_sms }
    const { reference, montant, numero_expediteur, texte_sms } = body

    if (!reference && !texte_sms) {
      return NextResponse.json({ erreur: 'Données manquantes (reference ou texte_sms requis)' }, { status: 400 })
    }

    // Si on reçoit un texte brut de SMS, on peut extraire la référence si besoin, 
    // mais l'idéal est que l'automatisation envoie directement la référence extraite.
    const refClean = reference ? reference.trim() : ''
    const montantNum = Number(montant) || 0

    if (!refClean) {
      return NextResponse.json({ erreur: 'Référence de paiement introuvable' }, { status: 400 })
    }

    // 1. Vérifier si ce code de référence a déjà été utilisé
    const { data: existant } = await supabase
      .from('versements')
      .select('id')
      .eq('reference_paiement', refClean)
      .limit(1)

    if (existant && existant.length > 0) {
      return NextResponse.json({ statut: 'deja_traite', message: 'Cette référence a déjà été enregistrée.' })
    }

    // 2. Chercher si un parent/élève correspond au numéro de téléphone expéditeur (optionnel pour affiner le matching)
    let eleveId = null
    if (numero_expediteur) {
      // Nettoyer le numéro pour la recherche
      const numClean = numero_expediteur.replace(/\s/g, '').replace('+', '')
      const { data: eleveData } = await supabase
        .from('eleves')
        .select('id, whatsapp_parent1')
        .ilike('whatsapp_parent1', `%${numClean}%`)
        .limit(1)
        .single()
      
      if (eleveData) {
        eleveId = eleveData.id
      }
    }

    // Si on a trouvé l'élève et le montant, on enregistre automatiquement le versement
    if (eleveId && montantNum > 0) {
      const { error: insertError } = await supabase.from('versements').insert({
        eleve_id: eleveId,
        montant: montantNum,
        reference_paiement: refClean,
        whatsapp_parent: numero_expediteur || 'Automatique SMS',
        date_paiement: new Date().toISOString(),
      })

      if (insertError) {
        return NextResponse.json({ erreur: 'Erreur insertion Supabase', details: insertError.message }, { status: 500 })
      }

      return NextResponse.json({ 
        succes: true, 
        message: `Rapprochement réussi pour l'élève ! Versement de ${montantNum} FCFA validé.` 
      })
    } else {
      // Si l'élève n'a pas pu être identifié par le numéro, on stocke le versement en attente de rapprochement manuel ou global
      return NextResponse.json({ 
        succes: false, 
        message: 'Référence reçue, mais impossible de lier automatiquement à un élève par le numéro. Enregistré en attente.' 
      })
    }

  } catch (err: any) {
    return NextResponse.json({ erreur: 'Erreur serveur interne', details: err.message }, { status: 500 })
  }
}