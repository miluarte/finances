import { useEffect, useState } from 'react'
import { Plus, CreditCard, Pencil, Trash2, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogClose
} from '@/components/ui/dialog'

const EMPTY_FORM = {
  name: '', last_four: '', credit_limit: '', network: 'Visa',
  due_day: '', closing_day: '', allowed_users: []
}

export default function Cards() {
  const { profile, isAdmin } = useAuth()
  const [cards, setCards] = useState([])
  const [members, setMembers] = useState([])           // all non-admin users
  const [open, setOpen] = useState(false)
  const [editCard, setEditCard] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    fetchCards()
    window.addEventListener('focus', fetchCards)
    return () => window.removeEventListener('focus', fetchCards)
  }, [profile])
  useEffect(() => { if (isAdmin) fetchMembers() }, [isAdmin])

  async function fetchCards() {
    if (!profile) return
    if (isAdmin) {
      const { data } = await supabase.from('credit_cards').select('*').eq('owner_id', profile.id)
      setCards(data ?? [])
    } else {
      const { data } = await supabase
        .from('card_permissions')
        .select('credit_cards(*, profiles(full_name))')
        .eq('user_id', profile.id)
      setCards((data ?? []).map(r => r.credit_cards).filter(Boolean))
    }
  }

  async function fetchMembers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'member')
    setMembers(data ?? [])
  }

  async function fetchCardPermissions(cardId) {
    const { data } = await supabase
      .from('card_permissions')
      .select('user_id')
      .eq('card_id', cardId)
    return (data ?? []).map(r => r.user_id)
  }

  function toggleUser(userId) {
    setForm(f => ({
      ...f,
      allowed_users: f.allowed_users.includes(userId)
        ? f.allowed_users.filter(id => id !== userId)
        : [...f.allowed_users, userId]
    }))
  }

  function openNew() {
    setEditCard(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  async function openEdit(card) {
    setEditCard(card)
    const allowed = await fetchCardPermissions(card.id)
    setForm({
      name: card.name ?? '',
      last_four: card.last_four ?? '',
      credit_limit: card.credit_limit ?? '',
      network: card.network ?? 'Visa',
      due_day: card.due_day ?? '',
      closing_day: card.closing_day ?? '',
      allowed_users: allowed,
    })
    setOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!isAdmin) return
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        last_four: form.last_four,
        credit_limit: parseFloat(form.credit_limit),
        network: form.network,
        due_day: form.due_day ? parseInt(form.due_day) : null,
        closing_day: form.closing_day ? parseInt(form.closing_day) : null,
      }

      let cardId
      if (editCard) {
        await supabase.from('credit_cards').update(payload).eq('id', editCard.id)
        cardId = editCard.id
      } else {
        const { data } = await supabase
          .from('credit_cards')
          .insert({ ...payload, owner_id: profile.id })
          .select('id')
          .single()
        cardId = data.id
      }

      // sync permissions: delete all, re-insert selected
      await supabase.from('card_permissions').delete().eq('card_id', cardId)
      if (form.allowed_users.length > 0) {
        await supabase.from('card_permissions').insert(
          form.allowed_users.map(uid => ({ card_id: cardId, user_id: uid }))
        )
      }

      setOpen(false)
      fetchCards()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!isAdmin) return
    setDeleting(id)
    try {
      await supabase.from('credit_cards').delete().eq('id', id)
      setCards(prev => prev.filter(c => c.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Cartões</h1>
        {isAdmin && (
          <Button size="sm" className="gap-1.5" onClick={openNew}>
            <Plus className="h-4 w-4" />Novo cartão
          </Button>
        )}
      </div>

      {/* Dialog: criar ou editar */}
      {isAdmin && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{editCard ? 'Editar Cartão' : 'Cadastrar Cartão'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome do cartão</Label>
                <Input
                  placeholder="Ex: Nubank Família"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Últimos 4 dígitos</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="1234"
                    maxLength={4}
                    value={form.last_four}
                    onChange={e => setForm(f => ({ ...f, last_four: e.target.value.replace(/\D/g, '') }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Bandeira</Label>
                  <Input
                    placeholder="Visa / Master / Elo"
                    value={form.network}
                    onChange={e => setForm(f => ({ 