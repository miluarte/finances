import { useEffect, useState } from 'react'
import { Plus, CreditCard } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Drawer, DrawerTrigger, DrawerContent, DrawerHeader,
  DrawerTitle, DrawerFooter, DrawerClose
} from '@/components/ui/drawer'

export default function Cards() {
  const { profile, isAdmin } = useAuth()
  const [cards, setCards] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', last_four: '', credit_limit: '', network: 'Visa' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchCards() }, [profile])

  async function fetchCards() {
    if (!profile) return
    if (isAdmin) {
      const { data } = await supabase.from('credit_cards').select('*').eq('owner_id', profile.id)
      setCards(data ?? [])
    } else {
      const { data } = await supabase
        .from('card_permissions')
        .select('credit_cards(*)')
        .eq('user_id', profile.id)
      setCards((data ?? []).map(r => r.credit_cards).filter(Boolean))
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!isAdmin) return
    setSaving(true)
    try {
      await supabase.from('credit_cards').insert({
        owner_id: profile.id,
        name: form.name,
        last_four: form.last_four,
        credit_limit: parseFloat(form.credit_limit),
        network: form.network,
      })
      setOpen(false)
      setForm({ name: '', last_four: '', credit_limit: '', network: 'Visa' })
      fetchCards()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Cartões</h1>
        {isAdmin && (
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Novo cartão</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Cadastrar Cartão</DrawerTitle>
              </DrawerHeader>
              <form onSubmit={handleSave} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Nome do cartão</Label>
                  <Input placeholder="Ex: Nubank Família" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Últimos 4 dígitos</Label>
                    <Input placeholder="1234" maxLength={4} value={form.last_four} onChange={e => setForm(f => ({ ...f, last_four: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Bandeira</Label>
                    <Input placeholder="Visa / Master" value={form.network} onChange={e => setForm(f => ({ ...f, network: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Limite total (R$)</Label>
                  <Input type="number" step="0.01" min="0" placeholder="5000,00" value={form.credit_limit} onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value }))} required />
                </div>
                <DrawerFooter>
                  <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
                  <DrawerClose asChild><Button variant="outline">Cancelar</Button></DrawerClose>
                </DrawerFooter>
              </form>
            </DrawerContent>
          </Drawer>
        )}
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <CreditCard className="h-10 w-10 opacity-30" />
          <p className="text-sm">{isAdmin ? 'Nenhum cartão cadastrado.' : 'Nenhum cartão autorizado para você.'}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map(card => (
            <Card key={card.id} className="overflow-hidden">
              <CardHeader className="pb-2 flex flex-row items-center gap-3 space-y-0">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{card.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{card.network} •••• {card.last_four}</p>
                </div>
              </CardHeader>
              {isAdmin && (
                <CardContent className="pt-0 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Limite total</span>
                    <span className="font-medium">{formatCurrency(card.credit_limit)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fatura atual</span>
                    <Badge variant="secondary">{formatCurrency(card.current_balance ?? 0)}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Disponível estimado</span>
                    <span className="font-medium text-green-600">{formatCurrency((card.credit_limit ?? 0) - (card.current_balance ?? 0))}</span>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
