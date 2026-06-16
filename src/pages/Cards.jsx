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
  const [members, setMembers] = useState([])
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
        <h1 className="text-2xl font-semibold tracking-tight">Cartoes</h1>
        {isAdmin && (
          <Button size="sm" className="gap-1.5" onClick={openNew}>
            <Plus className="h-4 w-4" />Novo cartao
          </Button>
        )}
      </div>

      {isAdmin && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{editCard ? 'Editar Cartao' : 'Cadastrar Cartao'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome do cartao</Label>
                <Input
                  placeholder="Ex: Nubank Familia"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Ultimos 4 digitos</Label>
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
                    onChange={e => setForm(f => ({ ...f, network: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Limite total (R$)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="5000,00"
                  value={form.credit_limit}
                  onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value }))}
                  onKeyDown={e => ['e','E','+','-'].includes(e.key) && e.preventDefault()}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Vencimento (dia)</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="31"
                    placeholder="10"
                    value={form.due_day}
                    onChange={e => setForm(f => ({ ...f, due_day: e.target.value }))}
                    onKeyDown={e => ['e','E','+','-','.'].includes(e.key) && e.preventDefault()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Fechamento (dia)</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="31"
                    placeholder="3"
                    value={form.closing_day}
                    onChange={e => setForm(f => ({ ...f, closing_day: e.target.value }))}
                    onKeyDown={e => ['e','E','+','-','.'].includes(e.key) && e.preventDefault()}
                  />
                </div>
              </div>

              {members.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Disponivel para</Label>
                  <div className="rounded-md border divide-y">
                    {members.map(member => {
                      const selected = form.allowed_users.includes(member.id)
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => toggleUser(member.id)}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                        >
                          <div className="text-left">
                            <p className="font-medium leading-none">{member.full_name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{member.email}</p>
                          </div>
                          {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2">
                <DialogClose asChild>
                  <Button variant="outline" type="button">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : editCard ? 'Salvar alteracoes' : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {cards.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <CreditCard className="h-10 w-10 opacity-30" />
          <p className="text-sm">
            {isAdmin ? 'Nenhum cartao cadastrado.' : 'Nenhum cartao autorizado para voce.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map(card => (
            <Card key={card.id} className="overflow-hidden">
              <CardHeader className="pb-2 flex flex-row items-center gap-3 space-y-0">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{card.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{card.network} &bull;&bull;&bull;&bull; {card.last_four}</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(card)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      disabled={deleting === card.id}
                      onClick={() => handleDelete(card.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-0 space-y-1.5">
                {isAdmin ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Limite total</span>
                      <span className="font-medium">{formatCurrency(card.credit_limit)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fatura atual</span>
                      <Badge variant="secondary">{formatCurrency(card.current_balance ?? 0)}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Disponivel estimado</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency((card.credit_limit ?? 0) - (card.current_balance ?? 0))}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    {card.profiles?.full_name && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Titular</span>
                        <span className="font-medium">{card.profiles.full_name}</span>
                      </div>
                    )}
                  </>
                )}
                {(card.due_day || card.closing_day) && (
                  <div className="flex justify-between text-sm pt-0.5 border-t">
                    {card.closing_day && (
                      <span className="text-muted-foreground">Fecha dia <strong className="text-foreground">{card.closing_day}</strong></span>
                    )}
                    {card.due_day && (
                      <span className="text-muted-foreground">Vence dia <strong className="text-foreground">{card.due_day}</strong></span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
