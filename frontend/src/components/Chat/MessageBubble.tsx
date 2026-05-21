import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { AgentAvatar } from '../UI/AgentAvatar'
import type { AgentMessage } from '../../types'

interface MessageBubbleProps {
  message: AgentMessage
  isNew?: boolean
}

const agentColors: Record<string, string> = {
  orchestrator: '#7C71F0',
  researcher: '#4FC3F7',
  coder: '#4ECCA3',
  writer: '#D97757',
  memory: '#FFB74D',
}

const agentLabels: Record<string, string> = {
  orchestrator: 'Orchestrator',
  researcher: 'Researcher',
  coder: 'Coder',
  writer: 'Writer',
  memory: 'Memory',
}

const COLLAPSE_THRESHOLD = 500

// Copy button for code blocks
const CopyButton: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors"
      style={{ background: 'rgba(255,255,255,0.08)', color: '#9096B8' }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isNew = false }) => {
  const [expanded, setExpanded] = useState(false)
  const color = agentColors[message.agent_type] ?? '#9096B8'
  const label = agentLabels[message.agent_type] ?? message.agent_type
  const isLong = message.content.length > COLLAPSE_THRESHOLD
  const shouldCollapse = isLong && !expanded

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })
    } catch {
      return ''
    }
  })()

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 12, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex gap-3 px-4 py-3 group"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 pt-0.5">
        <AgentAvatar type={message.agent_type} size="sm" showBadge={false} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold" style={{ color }}>
            {label}
          </span>
          <span className="text-xs text-text-muted">{timeAgo}</span>
        </div>

        {/* Message body */}
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            borderLeft: `2px solid ${color}40`,
            background: `${color}08`,
            padding: '12px 14px',
          }}
        >
          <div
            className={`prose prose-invert prose-sm max-w-none ${shouldCollapse ? 'max-h-48 overflow-hidden' : ''}`}
            style={{
              maskImage: shouldCollapse
                ? 'linear-gradient(to bottom, black 60%, transparent 100%)'
                : 'none',
              WebkitMaskImage: shouldCollapse
                ? 'linear-gradient(to bottom, black 60%, transparent 100%)'
                : 'none',
            }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                code({ className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className ?? '')
                  const codeStr = String(children).replace(/\n$/, '')
                  const isBlock = match || codeStr.includes('\n')

                  if (isBlock) {
                    return (
                      <div className="relative my-3 rounded-xl overflow-hidden">
                        <CopyButton code={codeStr} />
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match ? match[1] : 'text'}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            borderRadius: '12px',
                            fontSize: '12px',
                            background: '#0D0D1A',
                            padding: '16px 14px',
                            paddingRight: '60px',
                          }}
                          {...props}
                        >
                          {codeStr}
                        </SyntaxHighlighter>
                      </div>
                    )
                  }
                  return (
                    <code
                      className="px-1.5 py-0.5 rounded-md text-xs font-mono"
                      style={{ background: 'rgba(79,195,247,0.12)', color: '#4FC3F7' }}
                      {...props}
                    >
                      {children}
                    </code>
                  )
                },
                p: ({ children }) => (
                  <p className="text-text-primary text-sm leading-relaxed mb-2 last:mb-0">
                    {children}
                  </p>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline underline-offset-2"
                  >
                    {children}
                  </a>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 text-text-primary text-sm my-2">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 text-text-primary text-sm my-2">
                    {children}
                  </ol>
                ),
                h1: ({ children }) => (
                  <h1 className="text-lg font-bold text-text-primary mt-3 mb-1">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-bold text-text-primary mt-3 mb-1">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold text-text-primary mt-2 mb-1">{children}</h3>
                ),
                blockquote: ({ children }) => (
                  <blockquote
                    className="border-l-2 pl-3 my-2 italic text-text-secondary text-sm"
                    style={{ borderColor: color }}
                  >
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <table className="w-full text-xs">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="px-3 py-2 text-left font-semibold text-text-secondary border-b border-border">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-3 py-2 text-text-primary border-b border-border/30">{children}</td>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Expand/collapse button */}
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 flex items-center gap-1 text-xs font-medium transition-colors"
              style={{ color }}
            >
              {expanded ? (
                <>
                  <ChevronUp size={12} /> Show less
                </>
              ) : (
                <>
                  <ChevronDown size={12} /> Show more
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
