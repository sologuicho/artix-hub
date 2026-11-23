/**
 * AiSidebar — Asistente contextual para Artix Hub.
 *
 * Llama a /api/ai/assist en el backend de Artix Hub (SSE streaming).
 * El backend carga el contenido desde la BD y nunca expone la clave de ai-core
 * al navegador.
 *
 * Uso:
 *   <AiSidebar entity="article" id={article.id} title={article.title} />
 *
 * Requiere Tailwind CSS v3 y React 18+.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { BACKEND_URL } from '../config/client'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type EntityType = 'article' | 'blogPost' | 'research' | 'event'
type ChatAction = 'summarize' | 'explain' | 'qa'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AiSidebarProps {
  entity: EntityType
  id: string
  title?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCsrfToken(): string {
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'csrf') return decodeURIComponent(value ?? '')
  }
  return ''
}

async function* streamAssist(
  entity: EntityType,
  id: string,
  messages: ChatMessage[],
  signal: AbortSignal
): AsyncGenerator<string> {
  const res = await fetch(`${BACKEND_URL}/api/ai/assist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'x-csrf-token': getCsrfToken(),
    },
    credentials: 'include',
    body: JSON.stringify({ entity, id, messages }),
    signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Error ${res.status}: ${text}`)
  }

  if (!res.body) {
    throw new Error('El servidor no devolvió body en la respuesta.')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') return
        if (data.startsWith('{"error"')) {
          const parsed = JSON.parse(data) as { error: string }
          throw new Error(parsed.error)
        }
        if (data) yield data
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ---------------------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------------------

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2 text-sm text-white shadow-sm">
        {content}
      </div>
    </div>
  )
}

function AssistantBubble({
  content,
  isStreaming = false,
}: {
  content: string
  isStreaming?: boolean
}) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-2 text-sm text-gray-800 shadow-sm ring-1 ring-gray-200">
        {content}
        {isStreaming && (
          <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-indigo-500" />
        )}
      </div>
    </div>
  )
}

function ErrorBubble({ message }: { message: string }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-red-50 px-4 py-2 text-sm text-red-700 shadow-sm ring-1 ring-red-200">
        {message}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function AiSidebar({ entity, id, title }: AiSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const sendMessage = useCallback(
    async (userContent: string, _action?: ChatAction) => {
      if (!userContent.trim() || isStreaming) return

      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller

      setErrorMessage(null)

      const userMessage: ChatMessage = { role: 'user', content: userContent.trim() }
      const updatedMessages = [...messages, userMessage]
      setMessages(updatedMessages)
      setInput('')
      setStreamingContent('')
      setIsStreaming(true)

      let accumulated = ''

      try {
        for await (const token of streamAssist(entity, id, updatedMessages, controller.signal)) {
          accumulated += token
          setStreamingContent(accumulated)
        }

        setMessages(prev => [...prev, { role: 'assistant', content: accumulated }])
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        const message =
          err instanceof Error ? err.message : 'Error desconocido al contactar el asistente.'
        setErrorMessage(message)
      } finally {
        setStreamingContent('')
        setIsStreaming(false)
      }
    },
    [entity, id, isStreaming, messages]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const isEmpty = messages.length === 0 && !isStreaming && !errorMessage

  return (
    <aside className="flex h-full w-80 flex-col border-l border-gray-200 bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100">
          <svg
            className="h-4 w-4 text-indigo-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Asistente IA</p>
          {title && (
            <p className="max-w-[200px] truncate text-xs text-gray-500">{title}</p>
          )}
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="flex gap-2 border-b border-gray-200 bg-white px-4 py-2">
        <button
          onClick={() => sendMessage('Resume el contenido de forma concisa.', 'summarize')}
          disabled={isStreaming}
          className="flex-1 rounded-lg bg-gray-100 px-2 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Resumir
        </button>
        <button
          onClick={() => sendMessage('Explica los conceptos principales de forma sencilla.', 'explain')}
          disabled={isStreaming}
          className="flex-1 rounded-lg bg-gray-100 px-2 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Explicar
        </button>
      </div>

      {/* Lista de mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isEmpty && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-gray-400">
              Haz una pregunta sobre este contenido o usa los botones de arriba.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {messages.map((msg, i) =>
            msg.role === 'user' ? (
              <UserBubble key={i} content={msg.content} />
            ) : (
              <AssistantBubble key={i} content={msg.content} />
            )
          )}

          {isStreaming && streamingContent && (
            <AssistantBubble content={streamingContent} isStreaming />
          )}

          {isStreaming && !streamingContent && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
              </div>
            </div>
          )}

          {errorMessage && <ErrorBubble message={errorMessage} />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe una pregunta... (Enter para enviar)"
            rows={2}
            disabled={isStreaming}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Enviar mensaje"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </form>
      </div>
    </aside>
  )
}

export default AiSidebar
