import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Brain, Clock, ChevronDown, ChevronUp, Database, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { GlassCard } from '../components/UI/GlassCard'
import { searchMemory, getRecentMemories } from '../lib/api'
import type { Memory } from '../types'

interface MemoryItemProps {
  memory: Memory
  searchMode?: boolean
}

const MemoryItem: React.FC<MemoryItemProps> = ({ memory, searchMode = false }) => {
  const [expanded, setExpanded] = useState(false)
  const isLong = memory.content.length > 200

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(memory.timestamp), { addSuffix: true })
    } catch {
      return ''
    }
  })()

  const metaKeys = Object.keys(memory.metadata ?? {}).filter(
    (k) => !['embedding', 'vector'].includes(k)
  )

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <GlassCard
        glow={searchMode && memory.relevance_score && memory.relevance_score > 0.8 ? '#7C71F0' : undefined}
        padding={false}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(124,113,240,0.15)' }}
              >
                <Brain size={12} style={{ color: '#7C71F0' }} />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <Clock size={11} />
                <span>{timeAgo}</span>
              </div>
            </div>

            {searchMode && memory.relevance_score !== undefined && (
              <div
                className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                style={{
                  background: 'rgba(124,113,240,0.12)',
                  color: '#7C71F0',
                }}
              >
                {Math.round(memory.relevance_score * 100)}% match
              </div>
            )}
          </div>

          {/* Content */}
          <p
            className="text-sm text-text-secondary leading-relaxed"
            style={
              !expanded && isLong
                ? {
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical' as const,
                  }
                : {}
            }
          >
            {memory.content}
          </p>

          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs mt-2 font-medium"
              style={{ color: '#7C71F0' }}
            >
              {expanded ? (
                <><ChevronUp size={11} /> Show less</>
              ) : (
                <><ChevronDown size={11} /> Show more</>
              )}
            </button>
          )}

          {/* Metadata chips */}
          {metaKeys.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {metaKeys.slice(0, 4).map((key) => (
                <span
                  key={key}
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(42,45,74,0.6)', color: '#5A6080' }}
                >
                  {key}: {String(memory.metadata[key]).slice(0, 20)}
                </span>
              ))}
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  )
}

export const MemoryBrowser: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [searchResults, setSearchResults] = useState<Memory[]>([])
  const [isSearchLoading, setIsSearchLoading] = useState(false)

  const { data: recentMemories = [], isLoading: isLoadingRecent } = useQuery({
    queryKey: ['memories', 'recent'],
    queryFn: getRecentMemories,
    refetchInterval: 30000,
  })

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setIsSearchActive(false)
      setSearchResults([])
      return
    }
    setIsSearchLoading(true)
    setIsSearchActive(true)
    try {
      const results = await searchMemory(searchQuery)
      setSearchResults(results)
    } catch {
      setSearchResults([])
    } finally {
      setIsSearchLoading(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setIsSearchActive(false)
    setSearchResults([])
  }

  const displayMemories = isSearchActive ? searchResults : recentMemories

  return (
    <div className="flex flex-col gap-5 px-4 pt-4 pb-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <GlassCard glow="#7C71F0" padding={false}>
            <div className="p-4 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(124,113,240,0.15)' }}
              >
                <Brain size={18} style={{ color: '#7C71F0' }} />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">
                  {recentMemories.length}
                </p>
                <p className="text-xs text-text-muted">Memories</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard glow="#4FC3F7" padding={false}>
            <div className="p-4 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(79,195,247,0.15)' }}
              >
                <Database size={18} style={{ color: '#4FC3F7' }} />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">1</p>
                <p className="text-xs text-text-muted">Collection</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col gap-2"
      >
        <div
          className="flex items-center gap-2 rounded-xl px-3"
          style={{
            background: 'rgba(26,26,46,0.8)',
            border: '1px solid rgba(42,45,74,0.6)',
            height: '48px',
          }}
        >
          <Search size={15} className="text-text-muted flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch()
              if (e.key === 'Escape') clearSearch()
            }}
            placeholder="Search memories semantically..."
            className="flex-1 bg-transparent text-sm outline-none placeholder-muted"
            style={{ color: '#EEEEF0' }}
          />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={clearSearch}
                className="mr-1"
              >
                <X size={14} className="text-text-muted" />
              </motion.button>
            )}
          </AnimatePresence>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSearch}
            disabled={isSearchLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #7C71F0, #4FC3F7)',
              color: 'white',
            }}
          >
            {isSearchLoading ? '...' : 'Search'}
          </motion.button>
        </div>

        {isSearchActive && (
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-text-muted">
              {searchResults.length} results for &quot;{searchQuery}&quot;
            </p>
            <button onClick={clearSearch} className="text-xs text-primary">
              Clear
            </button>
          </div>
        )}
      </motion.div>

      {/* Section header */}
      <div className="flex items-center justify-between -mb-2">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">
          {isSearchActive ? 'Search Results' : 'Recent Memories'}
        </h2>
      </div>

      {/* Loading */}
      {isLoadingRecent && !isSearchActive && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl animate-pulse"
              style={{ background: 'rgba(26,26,46,0.6)' }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoadingRecent && displayMemories.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 gap-4"
        >
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{
              background: 'rgba(124,113,240,0.1)',
              border: '1px solid rgba(124,113,240,0.2)',
            }}
          >
            <Brain size={32} style={{ color: '#7C71F0', opacity: 0.6 }} />
          </div>
          <div className="text-center">
            <p className="text-text-primary font-medium mb-1">
              {isSearchActive ? 'No matching memories' : 'No memories yet'}
            </p>
            <p className="text-text-muted text-sm max-w-xs">
              {isSearchActive
                ? 'Try a different search query'
                : 'Memories are created as agents complete tasks'}
            </p>
          </div>
        </motion.div>
      )}

      {/* Memory list */}
      {displayMemories.length > 0 && (
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {displayMemories.map((memory) => (
              <MemoryItem
                key={memory.id}
                memory={memory}
                searchMode={isSearchActive}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
