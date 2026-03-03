// タスク作成フォーム
// title + description を入力してタスクを追加する

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCreateTask } from '@/hooks/use-tasks'
import { Plus } from 'lucide-react'

export function TaskForm() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const createTask = useCreateTask()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    createTask.mutate(
      { title: title.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          setTitle('')
          setDescription('')
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>タスク追加</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="タスクのタイトル"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Textarea
            placeholder="説明（任意）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <Button type="submit" className="w-full" disabled={createTask.isPending}>
            <Plus className="h-4 w-4" />
            {createTask.isPending ? '追加中...' : 'タスクを追加'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
