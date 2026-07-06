'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuftraegeNeuRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/auftraege/erstellen') }, [router])
  return null
}
