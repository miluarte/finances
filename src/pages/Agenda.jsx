import { useEffect, useState } from 'react'
import { Plus, CalendarDays, Bell } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Drawer, DrawerTrigger, DrawerContent, DrawerHeader,
  DrawerTitle, DrawerFooter, DrawerClose
} from '@/components/ui/drawer'

export default function Agenda() {
  const { profile } = useAuth()
  const [reminders, setReminders] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', due_date: '', note: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchReminders() }, [profile])

  async function fetchReminders() {
    if (!profile) return
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', profile.id)
      .gte('due_date', new Date().toISOString().split('T')[0])
      .order('due_date', { ascending: true })
    setReminders(data ?? [])
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await supabase.from('reminders').insert({
        user_id: profile.id,
        title: form.title,
        due_date: form.due_date,
        note: form.note || null,
      })
      setOpen(false)
      setForm({ title: '', due_date: '', note: '' })
      fetchReminders()
    } finally {
      setSaving(false)
    }
  }

  async function dismissReminder(id) {
    await supabase.from('reminders').delete().eq('id', id)
    fetchReminders()
  }

  // Agrupa por semana
  const today = new Date()
  const upcoming = reminders.filter(r => {
    const d = new Date(r.due_date + 'T00:00:00')
    const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24))
    return diff <= 7
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">Lembretes de acertos e vencimentos.</p>
        </div>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Lembrete</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader><DrawerTitle>Novo Lembrete</DrawerTitle></DrawerHeader>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input placeholder="Ex: Acerto com João" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Observação (opcional)</Label>
                <Input placeholder="Detalhes adicionais…" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>
              <DrawerFooter>
                <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
                <DrawerClose asChild><Button variant="outline">Cancelar</Button></DrawerClose>
              </DrawerFooter>
            </form>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Próximos 7 dias */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Próximos 7 dias</h2>
          {upcoming.map(r => (
            <Card key={r.id} className="border-yellow-400/50 bg-yellow-50">
              <CardContent className="pt-3 pb-3 flex items-center gap-3">
                <Bell className="h-4 w-4 text-yellow-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{r.title}</p>
                  {r.note && <p className="text-xs text-muted-foreground">{r.note}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="warning" className="text-xs">{formatDate(r.due_date)}</Badge>
                  <button onClick={() => dismissReminder(r.id)} className="text-xs text-muted-foreground hover:text-destructive">✕</button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Todos os lembretes */}
      <div className="space-y-2">
        {upcoming.length > 0 && <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Todos os próximos</h2>}
        {reminders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <CalendarDays className="h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhum lembrete agendado.</p>
          </div>
        ) : (
          reminders.map(r => (
            <Card key={r.id}>
              <CardContent className="pt-3 pb-3 flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{r.title}</p>
                  {r.note && <p className="text-xs text-muted-foreground">{r.note}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">{formatDate(r.due_date)}</Badge>
                  <button onClick={() => dismissReminder(r.id)} className="text-xs text-muted-foreground hover:text-destructive">✕</button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
